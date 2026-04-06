'use server'

import { createClient } from "@/lib/supabase/server"
import { skillTagSchema, reorderSkillsSchema, type SkillTagInput, type ReorderSkillsInput } from "@/lib/schema"
import { revalidatePath } from "next/cache"

type ActionResponse = {
  success: boolean
  message: string
  errors?: Record<string, string[]>
}

export async function upsertSkillAction(
  data: SkillTagInput,
  orgSlug: string
): Promise<ActionResponse> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: "ログインが必要です" }
  }

  const parsed = skillTagSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      message: "入力内容に誤りがあります",
      errors: parsed.error.flatten().fieldErrors
    }
  }

  const { id, name, category, score } = parsed.data

  if (id) {
    // UPDATE
    const { error } = await supabase
      .from('skills')
      .update({ name, category, score })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error("Skill update error:", error)
      return { success: false, message: "スキルの更新に失敗しました" }
    }
  } else {
    // INSERT: 50件上限チェック
    const { count } = await supabase
      .from('skills')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if ((count ?? 0) >= 50) {
      return { success: false, message: "スキルは最大50件まで登録できます" }
    }

    const { error } = await supabase
      .from('skills')
      .insert({ name, category, score, user_id: user.id })

    if (error) {
      console.error("Skill insert error:", error)
      if (error.code === '23505') {
        return { success: false, message: "同じ名前のスキルがすでに存在します" }
      }
      return { success: false, message: "スキルの追加に失敗しました" }
    }
  }

  revalidatePath(`/${orgSlug}/settings`)

  return { success: true, message: id ? "スキルを更新しました" : "スキルを追加しました" }
}

export async function deleteSkillAction(
  skillId: string,
  orgSlug: string
): Promise<ActionResponse> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: "ログインが必要です" }
  }

  const { error } = await supabase
    .from('skills')
    .delete()
    .eq('id', skillId)
    .eq('user_id', user.id)

  if (error) {
    console.error("Skill delete error:", error)
    return { success: false, message: "スキルの削除に失敗しました" }
  }

  revalidatePath(`/${orgSlug}/settings`)

  return { success: true, message: "スキルを削除しました" }
}

export async function updateSkillOrderAction(
  items: ReorderSkillsInput,
  orgSlug: string
): Promise<ActionResponse> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: "ログインが必要です" }
  }

  const parsed = reorderSkillsSchema.safeParse(items)
  if (!parsed.success) {
    return { success: false, message: "並び替えデータが不正です" }
  }

  const results = await Promise.all(
    parsed.data.map(({ id, display_order }) =>
      supabase
        .from('skills')
        .update({ display_order })
        .eq('id', id)
        .eq('user_id', user.id)
    )
  )

  const hasError = results.some(r => r.error)
  if (hasError) {
    console.error("Skill reorder error")
    return { success: false, message: "並び替えの保存に失敗しました" }
  }

  revalidatePath(`/${orgSlug}/settings`)

  return { success: true, message: "並び替えを保存しました" }
}
