import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SendEndorsementDialog } from "@/components/ui/endorsement/send-dialog";
import { TimelineItem, type Endorsement as TimelineEndorsement } from "@/components/ui/timeline/timeline-item";
import { Trophy, TrendingUp, Users } from "lucide-react";
import { notFound } from "next/navigation";
import type { Tables } from "@/types/database.types";

type Organization = Tables<"organizations">;

type MemberUser = {
  id: string;
  display_name: string | null;
  email: string;
};

type MemberRow = {
  users: MemberUser | null;
};

type EndorsementRow = {
  id: string;
  message: string | null;
  created_at: string;
  sender: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  receiver: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  skill: {
    id: string;
    name: string;
  };
};

type SkillEndorsementRow = {
  skill_id: string;
  skills: { id: string; name: string } | null;
};

type SkillCount = { name: string; count: number };

export default async function OrganizationHomePage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = createClient();

  // 1. ユーザー情報取得
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // 2. 組織情報取得
  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("slug", params.slug)
    .single<Pick<Organization, "id" | "name">>();

  if (orgError || !organization) {
    return notFound();
  }

  // 3. メンバー一覧取得
  const { data: membersData } = await supabase
    .from("organization_members")
    .select(`
      users (
        id,
        display_name,
        email
      )
    `)
    .eq("organization_id", organization.id);

  const members: MemberUser[] =
    ((membersData ?? []) as MemberRow[]).flatMap((m) =>
      m.users ? [m.users] : []
    );

  // 4. タイムラインデータの取得 (最新20件)
  const { data: endorsementsData } = await supabase
    .from("endorsements")
    .select(`
      id,
      message,
      created_at,
      sender:sender_id(id, display_name, avatar_url),
      receiver:receiver_id(id, display_name, avatar_url),
      skill:skills(id, name)
    `)
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const endorsements: TimelineEndorsement[] =
    ((endorsementsData ?? []) as unknown as EndorsementRow[]).map((e) => ({
      id: e.id,
      message: e.message,
      created_at: e.created_at,
      sender: {
        id: e.sender.id,
        display_name: e.sender.display_name,
        avatar_url: e.sender.avatar_url,
      },
      receiver: {
        id: e.receiver.id,
        display_name: e.receiver.display_name,
        avatar_url: e.receiver.avatar_url,
      },
      skill: {
        id: e.skill.id,
        name: e.skill.name,
      },
    }));

  // 5. 今月の感謝数
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count: monthlyCount } = await supabase
    .from("endorsements")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organization.id)
    .gte("created_at", startOfMonth.toISOString());

  // 6. 組織内の人気スキルランキング
  const { data: skillEndorsementsData } = await supabase
    .from("endorsements")
    .select("skill_id, skills(id, name)")
    .eq("organization_id", organization.id);

  const skillCountMap = new Map<string, SkillCount>();
  for (const e of (skillEndorsementsData ?? []) as SkillEndorsementRow[]) {
    if (!e.skills) continue;
    const existing = skillCountMap.get(e.skill_id);
    if (existing) {
      existing.count++;
    } else {
      skillCountMap.set(e.skill_id, { name: e.skills.name, count: 1 });
    }
  }
  const topSkills = Array.from(skillCountMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const suggestedSkillNames = topSkills.map((s) => s.name);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ダッシュボード</h1>
          <p className="text-muted-foreground">
            {organization.name} の活動状況と称賛の記録
          </p>
        </div>
        <SendEndorsementDialog
          organizationId={organization.id}
          orgSlug={params.slug}
          members={members}
          currentUserId={user.id}
          suggestedSkills={suggestedSkillNames}
        />
      </div>

      {/* KPIカード */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今月の感謝数</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlyCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              素晴らしい貢献が集まっています
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">メンバー数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
            <p className="text-xs text-muted-foreground">
              共に働く仲間たち
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活発なスキル</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {topSkills[0] ? (
              <>
                <div className="text-2xl font-bold truncate">{topSkills[0].name}</div>
                <p className="text-xs text-muted-foreground">
                  {topSkills[0].count} 件の感謝
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">-</div>
                <p className="text-xs text-muted-foreground">まだデータがありません</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        {/* タイムラインエリア */}
        <div className="md:col-span-4 lg:col-span-5 space-y-4">
          <h2 className="text-lg font-semibold">最近のタイムライン</h2>
          {endorsements.length > 0 ? (
            endorsements.map((item) => (
              <TimelineItem key={item.id} item={item} />
            ))
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                <p>まだ感謝メッセージはありません。</p>
                <p className="text-sm mt-2">
                  右上のボタンから、最初の感謝を同僚に送ってみましょう！
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* サイドコンテンツ（ランキング） */}
        <div className="md:col-span-3 lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold">人気のスキル</h2>
          <Card>
            <CardContent className="p-4">
              {topSkills.length > 0 ? (
                <ol className="space-y-3">
                  {topSkills.map((skill, index) => (
                    <li key={skill.name} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-sm font-bold w-5 shrink-0 ${
                          index === 0 ? "text-yellow-500" :
                          index === 1 ? "text-slate-400" :
                          index === 2 ? "text-amber-600" :
                          "text-muted-foreground"
                        }`}>
                          {index + 1}
                        </span>
                        <Badge
                          variant="secondary"
                          className="truncate bg-primary/10 text-primary hover:bg-primary/20 border-primary/20"
                        >
                          # {skill.name}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {skill.count}件
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-8">
                  まだデータがありません
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
