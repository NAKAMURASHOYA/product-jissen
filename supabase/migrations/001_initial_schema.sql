-- ============================================
-- 初期スキーマ作成マイグレーション
-- Supabase SQL Editorで実行してください
-- ============================================

-- ============================================
-- 1. 拡張機能の有効化
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 2. テーブル作成
-- ============================================

-- 2.1 public.users (個人アカウント)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2.2 public.organizations (組織/テナント)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2.3 public.departments (部署マスタ)
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2.4 public.organization_members (所属関係)
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, organization_id)
);

-- 2.5 public.invitations (招待コード)
CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    code VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ
);

-- 2.6 public.skills (スキルマスタ)
CREATE TABLE IF NOT EXISTS public.skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2.7 public.user_skills (個人の獲得スキル)
CREATE TABLE IF NOT EXISTS public.user_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
    endorsement_count INT DEFAULT 0 NOT NULL CHECK (endorsement_count >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, skill_id)
);

-- 2.8 public.endorsements (感謝トランザクション)
CREATE TABLE IF NOT EXISTS public.endorsements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CHECK (sender_id != receiver_id)
);

-- ============================================
-- 3. インデックス作成
-- ============================================

-- 検索パフォーマンス向上のためのインデックス
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON public.organizations(created_by);
CREATE INDEX IF NOT EXISTS idx_departments_organization_id ON public.departments(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_organization_id ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_department_id ON public.organization_members(department_id);
CREATE INDEX IF NOT EXISTS idx_invitations_code ON public.invitations(code);
CREATE INDEX IF NOT EXISTS idx_invitations_organization_id ON public.invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_is_active ON public.invitations(is_active);
CREATE INDEX IF NOT EXISTS idx_skills_name ON public.skills(name);
CREATE INDEX IF NOT EXISTS idx_user_skills_user_id ON public.user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_skill_id ON public.user_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_endorsements_sender_id ON public.endorsements(sender_id);
CREATE INDEX IF NOT EXISTS idx_endorsements_receiver_id ON public.endorsements(receiver_id);
CREATE INDEX IF NOT EXISTS idx_endorsements_organization_id ON public.endorsements(organization_id);
CREATE INDEX IF NOT EXISTS idx_endorsements_skill_id ON public.endorsements(skill_id);
CREATE INDEX IF NOT EXISTS idx_endorsements_created_at ON public.endorsements(created_at DESC);

-- ============================================
-- 4. トリガー関数とトリガー
-- ============================================

-- 4.1 updated_at自動更新関数
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at自動更新トリガーを各テーブルに設定
CREATE TRIGGER set_updated_at_users
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_organizations
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_departments
    BEFORE UPDATE ON public.departments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_user_skills
    BEFORE UPDATE ON public.user_skills
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 4.2 auth.users作成時にpublic.usersを自動生成するトリガー
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, display_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 5. RPC関数 (Stored Procedures)
-- ============================================

-- 5.1 組織作成関数
CREATE OR REPLACE FUNCTION public.create_new_organization(
    p_org_name VARCHAR(255),
    p_org_slug VARCHAR(255),
    p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
BEGIN
    -- 組織作成
    INSERT INTO public.organizations (name, slug, created_by)
    VALUES (p_org_name, p_org_slug, p_user_id)
    RETURNING id INTO v_org_id;

    -- 作成者をownerとして追加
    INSERT INTO public.organization_members (user_id, organization_id, role)
    VALUES (p_user_id, v_org_id, 'owner');

    RETURN v_org_id;
END;
$$;

-- 5.2 招待コードで組織に参加する関数
CREATE OR REPLACE FUNCTION public.join_organization_by_code(
    p_invite_code VARCHAR(255),
    p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
    v_invitation RECORD;
BEGIN
    -- 招待コードの検証
    SELECT organization_id, is_active, expires_at
    INTO v_invitation
    FROM public.invitations
    WHERE code = p_invite_code;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid invitation code';
    END IF;

    IF NOT v_invitation.is_active THEN
        RAISE EXCEPTION 'Invitation code is not active';
    END IF;

    IF v_invitation.expires_at IS NOT NULL AND v_invitation.expires_at < NOW() THEN
        RAISE EXCEPTION 'Invitation code has expired';
    END IF;

    v_org_id := v_invitation.organization_id;

    -- 既にメンバーかチェック
    IF EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE user_id = p_user_id AND organization_id = v_org_id
    ) THEN
        RAISE EXCEPTION 'User is already a member of this organization';
    END IF;

    -- メンバーとして追加
    INSERT INTO public.organization_members (user_id, organization_id, role)
    VALUES (p_user_id, v_org_id, 'member');

    RETURN v_org_id;
END;
$$;

-- 5.3 感謝送信関数（スキル登録・更新・感謝履歴作成）
CREATE OR REPLACE FUNCTION public.endorse_user(
    p_receiver_id UUID,
    p_skill_name VARCHAR(255),
    p_message TEXT,
    p_organization_id UUID,
    p_sender_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_skill_id UUID;
    v_endorsement_id UUID;
BEGIN
    -- 1. スキル存在確認、なければ作成
    INSERT INTO public.skills (name)
    VALUES (p_skill_name)
    ON CONFLICT (name) DO NOTHING
    RETURNING id INTO v_skill_id;

    -- スキルIDを取得（既存の場合）
    IF v_skill_id IS NULL THEN
        SELECT id INTO v_skill_id
        FROM public.skills
        WHERE name = p_skill_name;
    END IF;

    -- 2. user_skillsに加算（INSERT ON CONFLICT UPDATE）
    INSERT INTO public.user_skills (user_id, skill_id, endorsement_count)
    VALUES (p_receiver_id, v_skill_id, 1)
    ON CONFLICT (user_id, skill_id)
    DO UPDATE SET
        endorsement_count = user_skills.endorsement_count + 1,
        updated_at = NOW();

    -- 3. 感謝履歴を作成
    INSERT INTO public.endorsements (
        sender_id,
        receiver_id,
        organization_id,
        skill_id,
        message
    )
    VALUES (
        p_sender_id,
        p_receiver_id,
        p_organization_id,
        v_skill_id,
        p_message
    )
    RETURNING id INTO v_endorsement_id;

    RETURN v_endorsement_id;
END;
$$;

-- ============================================
-- 6. Row Level Security (RLS) ポリシー
-- ============================================

-- 6.1 public.users のRLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 全ユーザーが全ユーザー情報を閲覧可能（公開プロフィール）
CREATE POLICY "Users are viewable by everyone"
    ON public.users FOR SELECT
    USING (true);

-- ユーザーは自分の情報のみ更新可能
CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

-- 6.2 public.organizations のRLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- メンバーは所属組織を閲覧可能
CREATE POLICY "Organizations are viewable by members"
    ON public.organizations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = organizations.id
            AND user_id = auth.uid()
        )
    );

-- owner/adminは組織情報を更新可能
CREATE POLICY "Owners and admins can update organizations"
    ON public.organizations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = organizations.id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

-- 6.3 public.departments のRLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- メンバーは所属組織の部署を閲覧可能
CREATE POLICY "Departments are viewable by organization members"
    ON public.departments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = departments.organization_id
            AND user_id = auth.uid()
        )
    );

-- owner/adminは部署を作成・更新・削除可能
CREATE POLICY "Owners and admins can manage departments"
    ON public.departments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = departments.organization_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

-- 6.4 public.organization_members のRLS
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- メンバーは所属組織のメンバー一覧を閲覧可能
CREATE POLICY "Members are viewable by organization members"
    ON public.organization_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = organization_members.organization_id
            AND om.user_id = auth.uid()
        )
    );

-- ユーザーは自分の所属情報を更新可能（部署変更など）
CREATE POLICY "Users can update own membership"
    ON public.organization_members FOR UPDATE
    USING (user_id = auth.uid());

-- owner/adminはメンバーを追加・削除可能
CREATE POLICY "Owners and admins can manage members"
    ON public.organization_members FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = organization_members.organization_id
            AND om.user_id = auth.uid()
            AND om.role IN ('owner', 'admin')
        )
    );

-- 6.5 public.invitations のRLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- メンバーは所属組織の招待コードを閲覧可能
CREATE POLICY "Invitations are viewable by organization members"
    ON public.invitations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = invitations.organization_id
            AND user_id = auth.uid()
        )
    );

-- owner/adminは招待コードを作成・更新・削除可能
CREATE POLICY "Owners and admins can manage invitations"
    ON public.invitations FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = invitations.organization_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

-- 6.6 public.skills のRLS
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

-- 全ユーザーがスキルマスタを閲覧可能
CREATE POLICY "Skills are viewable by everyone"
    ON public.skills FOR SELECT
    USING (true);

-- 6.7 public.user_skills のRLS
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;

-- 全ユーザーが全ユーザーのスキルを閲覧可能
CREATE POLICY "User skills are viewable by everyone"
    ON public.user_skills FOR SELECT
    USING (true);

-- ユーザーは自分のスキルを更新可能
CREATE POLICY "Users can update own skills"
    ON public.user_skills FOR UPDATE
    USING (user_id = auth.uid());

-- 6.8 public.endorsements のRLS
ALTER TABLE public.endorsements ENABLE ROW LEVEL SECURITY;

-- メンバーは所属組織の感謝履歴を閲覧可能
CREATE POLICY "Endorsements are viewable by organization members"
    ON public.endorsements FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = endorsements.organization_id
            AND user_id = auth.uid()
        )
    );

-- メンバーは所属組織内で感謝を送信可能
CREATE POLICY "Members can create endorsements in their organization"
    ON public.endorsements FOR INSERT
    WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = endorsements.organization_id
            AND user_id = auth.uid()
        )
    );

-- ============================================
-- 7. コメント追加（ドキュメント化）
-- ============================================

COMMENT ON TABLE public.users IS '個人アカウント情報。auth.usersと同期';
COMMENT ON TABLE public.organizations IS '組織/テナント情報';
COMMENT ON TABLE public.departments IS '部署マスタ。組織ごとに管理';
COMMENT ON TABLE public.organization_members IS 'ユーザーと組織の所属関係';
COMMENT ON TABLE public.invitations IS '組織への招待コード';
COMMENT ON TABLE public.skills IS 'スキルマスタ。全組織共通';
COMMENT ON TABLE public.user_skills IS 'ユーザーが獲得したスキルとその獲得数';
COMMENT ON TABLE public.endorsements IS '感謝送信の履歴';

COMMENT ON FUNCTION public.create_new_organization IS '組織を新規作成し、作成者をownerとして追加';
COMMENT ON FUNCTION public.join_organization_by_code IS '招待コードを使用して組織に参加';
COMMENT ON FUNCTION public.endorse_user IS '感謝を送信し、スキルを登録/更新、履歴を作成';
