import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProfileForm } from "./profile-form"
import { OrganizationSettings } from "./organization-settings"
import { SkillForm } from "@/components/ui/skill/skill-form"
import { SkillList } from "@/components/ui/skill/skill-list"
import { redirect } from "next/navigation"
import { getInvitationCodeAction } from "@/actions/invitation"
import type { Tables } from "@/types/database.types"
import Link from "next/link"
import { ExternalLink } from "lucide-react"

type UserRow = Tables<"users">

export default async function SettingsPage({ params }: { params: { slug: string } }) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  // プロフィール情報の取得
  const { data: profile } = await supabase
    .from("users")
    .select("display_id, display_name, tagline, bio, avatar_url")
    .eq("id", user.id)
    .single<Pick<UserRow, "display_id" | "display_name" | "tagline" | "bio" | "avatar_url">>()

  // 組織情報の取得
  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", params.slug)
    .single()

  // 現在ユーザーの組織ロールを取得
  const { data: membership } = organization
    ? await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", organization.id)
        .eq("user_id", user.id)
        .single()
    : { data: null }

  const isAdminOrOwner =
    membership?.role === "owner" || membership?.role === "admin"

  // owner/admin の場合のみ招待コードを取得（必要に応じて新規作成）
  let invitationCode: string | null = null
  if (isAdminOrOwner && organization) {
    const result = await getInvitationCodeAction(organization.id)
    if (result.success && result.data) {
      invitationCode = result.data
    }
  }

  // スキル一覧取得
  const { data: skills } = await supabase
    .from('skills')
    .select('id, name, category, score, display_order')
    .eq('user_id', user.id)
    .order('display_order', { ascending: true })

  const defaultValues = {
    display_id: profile?.display_id ?? "",
    display_name: profile?.display_name ?? "",
    tagline: profile?.tagline ?? "",
    bio: profile?.bio ?? "",
    avatar_url: profile?.avatar_url ?? "",
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">設定</h1>
        <p className="text-muted-foreground">
          プロフィールと組織の設定を管理できます。
        </p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">プロフィール</TabsTrigger>
          <TabsTrigger value="skills">スキル</TabsTrigger>
          {isAdminOrOwner && (
            <TabsTrigger value="organization">組織設定</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>基本情報</CardTitle>
                  <CardDescription>
                    組織メンバーに表示されるプロフィール情報を設定してください。
                  </CardDescription>
                </div>
                {profile?.display_id && (
                  <Link
                    href={`/u/${profile.display_id}`}
                    target="_blank"
                    className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-3 w-3" />
                    公開ページを見る
                  </Link>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ProfileForm defaultValues={defaultValues} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>スキルポートフォリオ</CardTitle>
                <CardDescription>
                  あなたのスキルを登録・管理します。ドラッグで並び替えできます。
                </CardDescription>
              </div>
              <SkillForm orgSlug={params.slug} />
            </CardHeader>
            <CardContent>
              <SkillList
                initialSkills={(skills ?? []).map(s => ({
                  id: s.id,
                  name: s.name,
                  category: s.category,
                  score: s.score,
                  display_order: s.display_order,
                }))}
                orgSlug={params.slug}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {isAdminOrOwner && organization && (
          <TabsContent value="organization" className="mt-6">
            <OrganizationSettings
              organizationId={organization.id}
              organizationName={organization.name}
              orgSlug={organization.slug}
              initialInvitationCode={invitationCode}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
