'use server'

import { createClient } from "@/lib/supabase/server"
import { authSchema, signUpSchema, type AuthInput, type SignUpInput } from "@/lib/schema"
import { redirect } from "next/navigation"

// レスポンス型定義
type ActionResponse = {
  success: boolean
  message: string
  errors?: Record<string, string[]>
}

export async function signUpAction(data: SignUpInput): Promise<ActionResponse> {
  // 1. バリデーション
  const parsed = signUpSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      message: "入力内容に誤りがあります",
      errors: parsed.error.flatten().fieldErrors
    }
  }

  const supabase = createClient()
  const { email, password, display_name } = parsed.data

  // 2. Supabase Auth サインアップ
  // display_name をメタデータとして渡すことで、DBトリガーが public.users に保存してくれます
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: display_name,
      },
    },
  })

  if (error) {
    console.error("SignUp Error:", error)
    return {
      success: false,
      message: "登録に失敗しました。既に登録されている可能性があります。",
    }
  }

  // 3. 成功時は確認メール送信画面などへ (今回は一旦ルートへリダイレクトとします)
  // ※ メール確認が不要な設定の場合はそのままログイン状態になります
  return {
    success: true,
    message: "確認メールを送信しました。メール内のリンクをクリックしてください。",
  }
}

export async function signInAction(data: AuthInput): Promise<ActionResponse> {
  const parsed = authSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      message: "入力内容に誤りがあります",
      errors: parsed.error.flatten().fieldErrors
    }
  }

  const supabase = createClient()
  const { email, password } = parsed.data

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return {
      success: false,
      message: "メールアドレスまたはパスワードが間違っています。",
    }
  }

  // ログイン成功時はリダイレクト
  redirect("/")
}

export async function signOutAction() {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect("/login")
}