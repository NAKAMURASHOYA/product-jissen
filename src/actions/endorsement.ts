'use server'

import { createClient } from "@/lib/supabase/server"
import { endorsementSchema, type EndorsementInput } from "@/lib/schema"
import { revalidatePath } from "next/cache"

type ActionResponse = {
  success: boolean
  message: string
  errors?: Record<string, string[]>
}

export async function endorseUserAction(
  data: EndorsementInput,
  organizationId: string,
  orgSlug: string
): Promise<ActionResponse> {
  const supabase = createClient()
  
  // 1. ログインチェック
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: "ログインが必要です" }
  }

  // 2. バリデーション
  const parsed = endorsementSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      message: "入力内容に誤りがあります",
      errors: parsed.error.flatten().fieldErrors
    }
  }

  const { receiverId, skillName, message } = parsed.data

  // 3. 自分自身への送信チェック
  if (receiverId === user.id) {
    return { success: false, message: "自分自身に感謝を送ることはできません" }
  }

  // 4. RPC呼び出し: endorse_user
  // DB関数定義: p_receiver_id, p_skill_name, p_message, p_organization_id, p_sender_id
  // @ts-expect-error - Supabase RPC型定義が正しく推論されない場合の暫定対応
  const { error } = await supabase.rpc('endorse_user', {
    p_receiver_id: receiverId,
    p_skill_name: skillName,
    p_message: message || "",
    p_organization_id: organizationId,
    p_sender_id: user.id
  })

  if (error) {
    console.error("Endorse Error:", error)
    return { success: false, message: "感謝の送信に失敗しました" }
  }

  // 5. キャッシュ更新（タイムライン表示などを最新にするため）
  revalidatePath(`/${orgSlug}`)

  return { success: true, message: "感謝を送りました！" }
}