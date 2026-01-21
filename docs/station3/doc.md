# 設計1

ここにマークダウン形式のテキストやリンクを記載する。
※リンクの場合は、リンクを知っている全員が閲覧できるように権限設定してください。

0. 設計方針 (Design Strategy)
「個人を主体とし、組織をまたぐボトムアップ型SaaS」
ユーザー（個人）のアカウントをベースとし、複数の組織（ワークスペース）を行き来できるマルチテナント・アーキテクチャを採用します。
フロントエンドは薄く保ち、複雑な「組織ごとのデータ分離」や「整合性担保」は Supabase (RLS, Triggers, RPC) に委譲することで、堅牢かつスピーディな開発を実現します。

1. 技術スタックと選定理由
| **カテゴリ** | **技術・サービス** | **選定理由・特記事項** |
| :---: | :---: | :---: |
| **Language** | TypeScript | 型安全性による開発効率と保守性の向上。 |
| **Frontend** | Next.js (App Router) | Server Actionsを使用し、APIルートを記述せずにDB操作を行う。 |
| **Styling** | Tailwind CSS / shadcn/ui | モダンで高速なUI構築。レスポンシブ対応。 |
| **Backend / DB** | Supabase | AuthとDBの同期にTriggerを使用。複雑な書き込みにRPCを使用。 |
| **Infra** | Vercel | 設定ゼロでデプロイ。Next.jsとの親和性。 |
| **Avatar** | UI Avatars (API) | MVPでは画像アップロードを実装せず、イニシャル画像生成で代用（工数短縮）。 |

2. データベース設計 (Schema & Logic)
Supabase (PostgreSQL) 上での実装詳細です。
2.1 ER図 (Entity Relationship Diagram)

erDiagram
    %% ユーザーと認証
    users ||--o{ organization_members : "所属 (1:N)"
    users ||--o{ user_skills : "獲得スキル (1:N)"
    users ||--o{ endorsements_sent : "送信 (1:N)"
    users ||--o{ endorsements_received : "受信 (1:N)"
    users ||--o{ invitations : "作成 (1:N)"

    %% 組織構造
    organizations ||--o{ organization_members : "メンバー (1:N)"
    organizations ||--o{ departments : "部署 (1:N)"
    organizations ||--o{ invitations : "招待コード (1:N)"

    %% スキル管理
    skills ||--o{ user_skills : "紐付け (1:N)"
    skills ||--o{ endorsements : "参照 (1:N)"

    %% 中間テーブル・トランザクション
    organization_members {
        uuid id PK
        uuid user_id FK
        uuid organization_id FK
        uuid department_id FK
        string role
    }

    users {
        uuid id PK "auth.users.id"
        string email
        string display_name
        text avatar_url
    }

    organizations {
        uuid id PK
        string name
        string slug
    }

    departments {
        uuid id PK
        uuid organization_id FK
        string name
    }

    invitations {
        uuid id PK
        uuid organization_id FK
        string code "UNIQUE"
        bool is_active
    }

    skills {
        uuid id PK
        string name "UNIQUE"
    }

    user_skills {
        uuid id PK
        uuid user_id FK
        uuid skill_id FK
        int endorsement_count
    }

    endorsements {
        uuid id PK
        uuid sender_id FK
        uuid receiver_id FK
        uuid organization_id FK
        uuid skill_id FK
        text message
    }



2.2 テーブル定義 (Tables)
共通仕様: 全テーブル id (UUID, Default v4), created_at (TIMESTAMPTZ) を持つ。
1. public.users (個人アカウント)
| フィールド名 | データ型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| id | UUID | PK, FK | auth.users.id と同期 |
| email | VARCHAR | Unique, Not Null | メールアドレス |
| display\_name | VARCHAR | | 表示名 |
| avatar\_url | TEXT | | アバター画像URL |


2. public.organizations (組織/テナント)
| フィールド名 | データ型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| id | UUID | PK | |
| name | VARCHAR | Not Null | 組織名 |
| slug | VARCHAR | Unique, Not Null | URL識別子 (例: acme-corp) |
| created\_by | UUID | FK | 作成者ユーザーID |

3. public.departments (部署マスタ)
| フィールド名 | データ型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| id | UUID | PK | |
| organization\_id | UUID | FK, Not Null | 所属組織 |
| name | VARCHAR | Not Null | 部署名 |

4. public.organization_members (所属関係)
| フィールド名 | データ型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| id | UUID | PK | |
| user\_id | UUID | FK, Not Null | ユーザー |
| organization\_id | UUID | FK, Not Null | 組織 |
| department\_id | UUID | FK, Nullable | 所属部署 (v3.0追加) |
| role | VARCHAR | Not Null | 'owner', 'admin', 'member' |
| joined\_at | TIMESTAMPTZ | | 参加日時 |
| Unique Key | | | (user\_id, organization\_id) |


5. public.invitations (招待コード)
| フィールド名 | データ型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| id | UUID | PK | |
| organization\_id | UUID | FK, Not Null | 招待先組織 |
| code | VARCHAR | Unique, Not Null | 招待コード文字列 |
| is\_active | BOOL | Default True | 有効フラグ |

6. public.skills (スキルマスタ)
| フィールド名 | データ型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| id | UUID | PK | |
| name | VARCHAR | Unique, Not Null | スキル名 (例: Python) |

7. public.user_skills (個人の獲得スキル)
| フィールド名 | データ型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| id | UUID | PK | |
| user\_id | UUID | FK, Not Null | ユーザー |
| skill\_id | UUID | FK, Not Null | スキル |
| endorsement\_count | INT | Default 0 | 獲得総数 |
| Unique Key | | | (user\_id, skill\_id) |

8. public.endorsements (感謝トランザクション)
| フィールド名 | データ型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| id | UUID | PK | |
| sender\_id | UUID | FK, Not Null | 送信者 |
| receiver\_id | UUID | FK, Not Null | 受信者 |
| organization\_id | UUID | FK, Not Null | 送信時の組織コンテキスト |
| skill\_id | UUID | FK, Not Null | スキル |
| message | TEXT | | 感謝メッセージ |
2.3 自動化ロジック (Triggers & Functions)
主要な処理フロー: 感謝送信 (Endorse)
ユーザーが新しいスキルタグで感謝を送る際、バックエンドでは以下の判定と処理をRPCで行います。
sequenceDiagram
    autonumber
    actor User as ユーザー
    participant API as Server Action
    participant DB as Supabase RPC

    User->>API: スキル登録リクエスト (例: "Python")

    API->>DB: RPC: endorse_user() 呼び出し

    Note right of DB: 1. スキル存在確認
    alt スキルが既に存在する場合 (Existing)
        DB->>DB: IDを取得 (例: 101)
    else スキルが存在しない場合 (New)
        DB->>DB: 新規スキル作成 (INSERT INTO skills)
        DB->>DB: 新しい IDを取得 (例: 205)
    end

    Note right of DB: 2. ユーザー資産更新
    DB->>DB: user_skills に加算 (INSERT ON CONFLICT UPDATE)

    Note right of DB: 3. 履歴保存
    DB->>DB: endorsements に履歴作成

    DB-->>API: 成功
    API-->>User: 完了レスポンス (Optimistic UI更新)

その他のロジック:
User作成同期 (Trigger): auth.users 作成時に public.users を自動生成。
組織作成 (RPC): create_new_organization で組織作成と同時にOwnerとしてメンバー追加。

2.4 インターフェース設計 (API / Server Actions)
Next.js Server Actions を使用します。

|  |  |  |
| :-: | :-: | :-: |
| **アクション名** | **入力パラメータ** | **処理概要・使用RPC** |
| **signUpAction** | email, password, displayName | Auth登録 & TriggerによるUser作成。 |
| **createOrgAction** | orgName, orgSlug | **RPC:** create_new_organization |
| **joinOrgAction** | inviteCode | **RPC:** join_organization_by_code |
| **endorseUserAction** | receiverId, skillName, message, orgId | **RPC:** endorse_user |
| **updateDepartmentAction** | departmentId | **Update:** organization_members を直接更新。 |


3. 機能要件 (Functional Requirements)
3.1 ユーザーフロー (User Flow)

sequenceDiagram
    autonumber
    actor User
    participant FE as Next.js (Client)
    participant DB as Supabase

    %% Flow 1: アカウント作成
    rect rgb(249, 249, 249)
    Note over User, DB: Flow 1: アカウント作成
    User->>FE: Email, PW, 名前入力
    FE->>DB: signUp()
    DB-->>FE: 登録完了 & 自動ログイン
    FE->>User: オンボーディング画面へ
    end

    %% Flow 2: 組織への所属
    rect rgb(255, 248, 225)
    Note over User, DB: Flow 2: 組織への所属 (分岐)
    
    alt 招待コードあり
        User->>FE: 招待コード入力
        FE->>DB: RPC: join_organization_by_code()
    else 組織を新規作成
        User->>FE: 組織名, ID(Slug)入力
        FE->>DB: RPC: create_new_organization()
    end
    
    DB-->>FE: 成功 (OrgID返却)
    FE->>User: 組織ホーム画面へ遷移
    end



3.2 開発スコープ
認証: Login, Signup, Logout
組織: 作成, 参加, 切替
感謝: 送信, タイムライン表示
メンバー: 一覧, 検索, 部署フィルタ(New)
設定: プロフィール編集, 所属部署変更(New)

4. UI/画面遷移 (UI & Screen Transition)
4.1 画面遷移図 (Screen Transition Diagram)

graph TD
    %% ノード定義
    subgraph Public ["Public Area"]
        Top("/")
        Login("/login")
        Signup("/signup")
    end

    subgraph Private ["Private Area (App)"]
        Onboarding("/onboarding")
        
        subgraph OrgContext ["組織コンテキスト (/[slug])"]
            Home("/home")
            Members("/members")
            UserProfile("/users/[id]")
        end
        
        subgraph Personal ["個人設定"]
            ProfileEdit("/settings/profile")
        end
    end

    %% 遷移ロジック
    Top --> Login & Signup
    Login & Signup --> |"認証成功"| Onboarding
    
    Onboarding --> |"組織選択/作成"| Home
    
    Home -- "組織切替" --> Home
    Home --> Members
    Members --> UserProfile
    
    Home --> ProfileEdit




4.2 画面構成図 (Screen Layout)

classDiagram
    direction TB
    
    class AppLayout {
        +OrgSwitcher (組織切替)
        +UserMenu (個人設定)
        +NavLinks (Home, Members)
        +MainContent
    }

    class OnboardingScreen {
        +WelcomeMessage
        +JoinByCodeForm (招待コード入力)
        +CreateOrgForm (新規組織作成)
    }

    class OrgHomeScreen {
        +Timeline (組織内の最近の感謝)
        +Ranking (スキルランキング)
    }

    class MemberListScreen {
        +SearchFilter
        +DepartmentFilter
        +UserGrid
    }

    class UserCard {
        +Avatar
        +DisplayName
        +SkillTags
        +SendThanksButton
    }

    AppLayout *-- OrgHomeScreen
    AppLayout *-- MemberListScreen
    AppLayout ..> OnboardingScreen : 初回のみ
    MemberListScreen *-- UserCard

4.3 画面リスト
Public: Top, Login, Signup
App:
Onboarding (組織参加/作成)
Home (ダッシュボード)
Members (メンバー一覧)
UserProfile (詳細)
Settings (プロフィール編集)
5. 開発フェーズ (Phases)
Phase 1: Setup & Auth (DB構築, 認証)
Phase 2: Onboarding (組織作成RPC, 招待参加RPC)
Phase 3: Core (感謝送信, タイムライン)
Phase 4: Enhancement (部署機能, フィルタリング)
