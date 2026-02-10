import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, Users, Settings, LogOut, PlusCircle } from "lucide-react";
import { signOutAction } from "@/actions/auth";

export default async function OrganizationLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  const supabase = createClient();

  // 1. ログインチェック
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 2. 組織情報の取得
  const { data: organization, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("slug", params.slug)
    .single();

  if (error || !organization) {
    notFound(); // 404ページへ
  }

  // 型アサーションで組織情報を取得
  const org = organization as { id: string; name: string; slug: string };

  // 3. メンバーシップチェック（この組織に所属しているか）
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", org.id)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    // 所属していない場合はオンボーディングまたはエラーへ
    // ここでは簡易的にオンボーディングへ戻す
    redirect("/onboarding");
  }

  // 4. ユーザーが所属する全組織の取得（サイドバーの切替用）
  const { data: myOrgs } = await supabase
    .from("organization_members")
    .select("organization_id, organizations(name, slug)")
    .eq("user_id", user.id);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-muted/20">
      {/* サイドバー */}
      <aside className="hidden w-64 flex-col border-r bg-background md:flex">
        <div className="flex h-14 items-center border-b px-4 font-semibold">
          <Link href={`/${params.slug}`} className="flex items-center gap-2">
            <span className="truncate">{org.name}</span>
          </Link>
        </div>
        
        <div className="flex-1 overflow-auto py-4">
          <nav className="grid gap-1 px-2">
            <Button
              asChild
              variant="ghost"
              className="justify-start gap-2"
            >
              <Link href={`/${params.slug}`}>
                <Home className="h-4 w-4" />
                ホーム
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              className="justify-start gap-2"
            >
              <Link href={`/${params.slug}/members`}>
                <Users className="h-4 w-4" />
                メンバー
              </Link>
            </Button>
            {/* Owner/Adminのみ表示などの制御は今後実装 */}
            <Button
              asChild
              variant="ghost"
              className="justify-start gap-2"
            >
              <Link href={`/${params.slug}/settings`}>
                <Settings className="h-4 w-4" />
                設定
              </Link>
            </Button>
          </nav>

          <div className="mt-8 px-4">
            <h3 className="mb-2 text-xs font-semibold text-muted-foreground">所属組織</h3>
            <div className="space-y-1">
              {myOrgs?.map((item: any) => (
                <Link
                  key={item.organization_id}
                  href={`/${item.organizations.slug}`}
                  className={`block truncate rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent ${
                    item.organizations.slug === params.slug
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  {item.organizations.name}
                </Link>
              ))}
              <Link
                href="/onboarding"
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <PlusCircle className="h-3 w-3" />
                組織を追加・参加
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t p-4">
          <form action={signOutAction}>
            <Button variant="outline" className="w-full justify-start gap-2">
              <LogOut className="h-4 w-4" />
              ログアウト
            </Button>
          </form>
        </div>
      </aside>

      {/* メインコンテンツエリア */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center gap-4 border-b bg-background px-6 lg:hidden">
          <span className="font-semibold">{org.name}</span>
          {/* モバイル用メニューなどは必要に応じて追加 */}
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}