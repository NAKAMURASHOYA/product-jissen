import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Shield } from "lucide-react";
import Image from "next/image";

export default async function MembersPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = createClient();

  // 1. 組織IDの取得
  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("slug", params.slug)
    .single();

  if (!organization) {
    return <div>組織が見つかりません</div>;
  }

  // 型アサーションで組織情報を取得
  const org = organization as { id: string; name: string };

  // 2. メンバー一覧の取得
  // organization_members テーブルと users テーブルを結合して取得
  const { data: members } = await supabase
    .from("organization_members")
    .select(`
      role,
      users (
        id,
        display_name,
        avatar_url,
        email
      )
    `)
    .eq("organization_id", org.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">メンバー一覧</h1>
        <div className="text-sm text-muted-foreground">
          {members?.length || 0} 名
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {members?.map((member: any) => (
          <Card key={member.users.id} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center gap-4 bg-muted/20 pb-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden border border-border relative">
                {member.users.avatar_url ? (
                  <Image 
                    src={member.users.avatar_url} 
                    alt={member.users.display_name || "avatar"} 
                    fill
                    className="object-cover" 
                  />
                ) : (
                  <span className="text-lg">
                    {member.users.display_name?.charAt(0) || "?"}
                  </span>
                )}
              </div>
              <div className="flex flex-col">
                <CardTitle className="text-base">
                  {member.users.display_name || "名無し"}
                </CardTitle>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    member.role === 'owner' 
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500' 
                      : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                  }`}>
                    {member.role === 'owner' && <Shield className="mr-1 h-3 w-3" />}
                    {member.role}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span className="truncate">{member.users.email}</span>
              </div>
              
              {/* 将来的にここにスキルタグや直近の獲得スキルを表示 */}
              <div className="mt-4 pt-4 border-t text-xs text-muted-foreground text-center">
                獲得スキル: まだありません
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}