import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProfileForm } from "./profile-form"
import { OrganizationSettings } from "./organization-settings"
import { redirect } from "next/navigation"
import { getInvitationCodeAction } from "@/actions/invitation"
import type { Tables } from "@/types/database.types"

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
          {isAdminOrOwner && (
            <TabsTrigger value="organization">組織設定</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>基本情報</CardTitle>
              <CardDescription>
                組織メンバーに表示されるプロフィール情報を設定してください。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileForm defaultValues={defaultValues} />
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
