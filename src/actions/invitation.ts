'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

type ActionResponse<T = undefined> = {
  success: boolean
  message: string
  data?: T
}

function generateInviteCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const random = Array.from({ length: 8 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('')
  return `inv_${random}`
}

/**
 * 組織の現在有効な招待コードを取得する。
 * 有効なコードがない場合は新規作成して返す。
 * 実行者が owner または admin であることをサーバー側で検証する。
 */
export async function getInvitationCodeAction(
  organizationId: string
): Promise<ActionResponse<string>> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: "ログインが必要です" }
  }

  // 権限チェック: owner または admin のみ許可
  const { data: member } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .single()

  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    return { success: false, message: "この操作を行う権限がありません" }
  }

  // 有効な招待コードを取得
  const { data: invitation } = await supabase
    .from("invitations")
    .select("code")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (invitation) {
    return { success: true, message: "招待コードを取得しました", data: invitation.code }
  }

  // 有効なコードが存在しない場合は新規作成
  const code = generateInviteCode()
  const { data: newInvitation, error } = await supabase
    .from("invitations")
    .insert({ organization_id: organizationId, code })
    .select("code")
    .single()

  if (error || !newInvitation) {
    console.error("Create invitation error:", error)
    return { success: false, message: "招待コードの生成に失敗しました" }
  }

  return { success: true, message: "招待コードを生成しました", data: newInvitation.code }
}

/**
 * 組織の招待コードを再発行する。
 * 既存の有効なコードを全て無効化し、新しいコードを生成する。
 * 実行者が owner または admin であることをサーバー側で検証する。
 */
export async function regenerateInvitationCodeAction(
  organizationId: string,
  orgSlug: string
): Promise<ActionResponse<string>> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: "ログインが必要です" }
  }

  // 権限チェック: owner または admin のみ許可
  const { data: member } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .single()

  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    return { success: false, message: "この操作を行う権限がありません" }
  }

  // 既存の有効コードを全て無効化
  const { error: updateError } = await supabase
    .from("invitations")
    .update({ is_active: false })
    .eq("organization_id", organizationId)
    .eq("is_active", true)

  if (updateError) {
    console.error("Deactivate invitations error:", updateError)
    return { success: false, message: "招待コードの無効化に失敗しました" }
  }

  // 新しいコードを生成・保存
  const code = generateInviteCode()
  const { data: newInvitation, error: insertError } = await supabase
    .from("invitations")
    .insert({ organization_id: organizationId, code })
    .select("code")
    .single()

  if (insertError || !newInvitation) {
    console.error("Create invitation error:", insertError)
    return { success: false, message: "招待コードの生成に失敗しました" }
  }

  revalidatePath(`/${orgSlug}/settings`)

  return { success: true, message: "招待コードを再発行しました", data: newInvitation.code }
}
