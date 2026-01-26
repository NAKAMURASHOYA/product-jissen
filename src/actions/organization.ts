'use server'

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

type ActionResponse = {
  success: boolean
  message: string
  organizationId?: string
}

// 組織を新規作成するアクション
// createOrgAction -> createOrganizationAction に変更
export async function createOrganizationAction(formData: FormData): Promise<ActionResponse> {
  const supabase = createClient()
  
  // ユーザーIDの取得
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: "ログインが必要です" }
  }

  const name = formData.get("name") as string
  const slug = formData.get("slug") as string

  if (!name || !slug) {
    return { success: false, message: "組織名とIDは必須です" }
  }

  // RPC: create_new_organization を呼び出し
  // Note: p_org_name, p_org_slug はDB側の関数定義に合わせる必要があるため、略語(org)のままとしています
  // @ts-expect-error - Supabase RPC型定義が正しく推論されない場合の暫定対応
  const { data: organizationId, error } = await supabase.rpc('create_new_organization', {
    p_org_name: name,
    p_org_slug: slug,
    p_user_id: user.id
  })

  if (error) {
    console.error("Create Organization Error:", error)
    // エラーメッセージの分岐（slug重複など）
    if (error.message.includes("unique constraint")) {
      return { success: false, message: "この組織IDは既に使用されています" }
    }
    return { success: false, message: "組織の作成に失敗しました" }
  }

  // 作成成功後のリダイレクト（作成した組織のホームへ）
  redirect(`/${slug}`)
}

// 招待コードで組織に参加するアクション
// joinOrgAction -> joinOrganizationAction に変更
export async function joinOrganizationAction(formData: FormData): Promise<ActionResponse> {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: "ログインが必要です" }
  }

  const code = formData.get("code") as string

  if (!code) {
    return { success: false, message: "招待コードを入力してください" }
  }

  // RPC: join_organization_by_code を呼び出し
  // Note: p_invite_code, p_user_id はDB側の関数定義に合わせる必要があります
  // @ts-expect-error - Supabase RPC型定義が正しく推論されない場合の暫定対応
  const { data: organizationId, error } = await supabase.rpc('join_organization_by_code', {
    p_invite_code: code,
    p_user_id: user.id
  })

  if (error) {
    console.error("Join Organization Error:", error)
    return { success: false, message: error.message || "組織への参加に失敗しました" }
  }

  // 参加した組織のSlugを取得してリダイレクト
  const { data: organization } = await supabase
    .from('organizations')
    .select('slug')
    .eq('id', organizationId)
    .single()

  if (organization) {
    const slug = (organization as { slug: string }).slug
    redirect(`/${slug}`)
  } else {
    // 万が一組織が見つからない場合でも、エラーにはせず完了とする（またはエラー画面へ）
    return { success: true, message: "参加しました" }
  }
}