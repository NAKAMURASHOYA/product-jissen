import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ProfileForm } from "./profile-form"
import { redirect } from "next/navigation"
import type { Tables } from "@/types/database.types"

type UserRow = Tables<"users">

export default async function SettingsPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("users")
    .select("display_id, display_name, tagline, bio, avatar_url")
    .eq("id", user.id)
    .single<Pick<UserRow, "display_id" | "display_name" | "tagline" | "bio" | "avatar_url">>()

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
        <h1 className="text-2xl font-bold tracking-tight">プロフィール設定</h1>
        <p className="text-muted-foreground">
          あなたのプロフィール情報を編集できます。
        </p>
      </div>

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
    </div>
  )
}
