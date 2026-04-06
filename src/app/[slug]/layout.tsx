import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, Users, Settings, LogOut, PlusCircle } from "lucide-react";
import { signOutAction } from "@/actions/auth";
import { MobileNav } from "@/components/ui/mobile-nav";

export default async function OrganizationLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: organization, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("slug", params.slug)
    .single();

  if (error || !organization) {
    notFound();
  }

  const org = organization as { id: string; name: string; slug: string };

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", org.id)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    redirect("/onboarding");
  }

  const { data: myOrgs } = await supabase
    .from("organization_members")
    .select("organization_id, organizations(name, slug)")
    .eq("user_id", user.id);

  const navItems = [
    { href: `/${params.slug}`, label: "ホーム", icon: Home },
    { href: `/${params.slug}/members`, label: "メンバー", icon: Users },
    { href: `/${params.slug}/settings`, label: "設定", icon: Settings },
  ];

  const orgsForNav = (myOrgs ?? []).map((item: any) => ({
    organization_id: item.organization_id,
    organizations: {
      name: item.organizations.name,
      slug: item.organizations.slug,
    },
  }));

  return (
    <div className="flex h-screen w-full overflow-hidden bg-muted/20">
      {/* デスクトップ サイドバー */}
      <aside className="hidden w-64 flex-col border-r bg-background md:flex">
        <div className="flex h-14 items-center border-b px-4 font-semibold">
          <Link href={`/${params.slug}`} className="truncate">
            {org.name}
          </Link>
        </div>

        <div className="flex-1 overflow-auto py-4">
          <nav className="grid gap-1 px-2">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Button key={href} asChild variant="ghost" className="justify-start gap-2">
                <Link href={href}>
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              </Button>
            ))}
          </nav>

          <div className="mt-8 px-4">
            <h3 className="mb-2 text-xs font-semibold text-muted-foreground">所属組織</h3>
            <div className="space-y-1">
              {orgsForNav.map((item) => (
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
        {/* モバイルヘッダー */}
        <header className="flex h-14 items-center justify-between border-b bg-background px-4 md:hidden">
          <span className="font-semibold truncate">{org.name}</span>
          <MobileNav orgName={org.name} slug={params.slug} myOrgs={orgsForNav} />
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
