'use server'

import { createClient } from "@/lib/supabase/server"
import { profileSchema, type ProfileInput } from "@/lib/schema"
import { revalidatePath } from "next/cache"

type ActionResponse = {
  success: boolean
  message: string
  errors?: Record<string, string[]>
}

export async function updateProfileAction(data: ProfileInput): Promise<ActionResponse> {
  // 1. バリデーション
  const parsed = profileSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      message: "入力内容に誤りがあります",
      errors: parsed.error.flatten().fieldErrors,
    }
  }

  const supabase = createClient()

  // 2. ログインユーザーの取得
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return {
      success: false,
      message: "認証が必要です。再度ログインしてください。",
    }
  }

  const { display_id, display_name, tagline, bio, avatar_url } = parsed.data

  // 3. usersテーブルの更新
  const { error } = await supabase
    .from("users")
    .update({
      display_id: display_id ?? null,
      display_name: display_name,
      tagline: tagline ?? null,
      bio: bio ?? null,
      avatar_url: avatar_url || null,
    })
    .eq("id", user.id)

  if (error) {
    // display_id の一意制約違反をハンドリング
    // Supabaseは PostgreSQL の error code 23505 (unique_violation) を返す
    if (error.code === "23505" && error.message.includes("display_id")) {
      return {
        success: false,
        message: "入力内容に誤りがあります",
        errors: {
          display_id: ["このIDは既に使用されています。別のIDを入力してください。"],
        },
      }
    }

    console.error("Profile update error:", error)
    return {
      success: false,
      message: "プロフィールの更新に失敗しました。しばらく経ってから再試行してください。",
    }
  }

  // 4. キャッシュのパージ
  revalidatePath("/", "layout")

  return {
    success: true,
    message: "プロフィールを更新しました。",
  }
}
