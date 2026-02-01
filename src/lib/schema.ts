import { z } from 'zod'

// 共通定義
export const userIdSchema = z.string().uuid({ message: "無効なユーザーID形式です" })

// 認証用スキーマ (新規追加)
export const authSchema = z.object({
  email: z
    .string()
    .email({ message: "有効なメールアドレスを入力してください" }),
  password: z
    .string()
    .min(6, { message: "パスワードは6文字以上で入力してください" }),
})

export const signUpSchema = authSchema.extend({
  display_name: z
    .string()
    .min(1, { message: "表示名は必須です" })
    .max(50, { message: "表示名は50文字以内で入力してください" }),
})

export type AuthInput = z.infer<typeof authSchema>
export type SignUpInput = z.infer<typeof signUpSchema>

// プロフィール (Profiles) - 設計書より
export const profileSchema = z.object({
  display_id: z
    .string()
    .min(3, { message: "IDは3文字以上で入力してください" })
    .max(20, { message: "IDは20文字以内で入力してください" })
    .regex(/^[a-zA-Z0-9_]+$/, { message: "半角英数字とアンダースコアのみ使用可能です" }),
    
  display_name: z
    .string()
    .min(1, { message: "表示名は必須です" })
    .max(50, { message: "表示名は50文字以内で入力してください" }),
  
  tagline: z
    .string()
    .max(100, { message: "肩書きは100文字以内で入力してください" })
    .optional(),
  
  bio: z
    .string()
    .max(1000, { message: "自己紹介は1000文字以内で入力してください" })
    .optional(),
  
  avatar_url: z
    .string()
    .url({ message: "有効なURL形式ではありません" })
    .optional()
    .or(z.literal("")), // 空文字による削除を許容
})

export type ProfileInput = z.infer<typeof profileSchema>

// スキルタグ (Skills) - 設計書より
export const skillCategoryEnum = z.enum([
  'frontend',
  'backend',
  'design',
  'sales',
  'marketing',
  'office work',
  'other',
])

export const skillTagSchema = z.object({
  id: z.string().uuid().optional(),
  name: z
    .string()
    .min(1, { message: "スキル名は必須です" })
    .max(30, { message: "スキル名は30文字以内で入力してください" }),
  category: skillCategoryEnum,
  score: z.number().int().min(1).max(5).default(1),
})

// 感謝送信 (Endorsement)
export const endorsementSchema = z.object({
  receiverId: z.string().uuid({ message: "宛先を選択してください" }),
  skillName: z
    .string()
    .min(1, { message: "スキル名を入力してください" })
    .max(50, { message: "スキル名は50文字以内で入力してください" }),
  message: z
    .string()
    .max(200, { message: "メッセージは200文字以内で入力してください" })
    .optional(),
})

export type SkillTagInput = z.infer<typeof skillTagSchema>
export type EndorsementInput = z.infer<typeof endorsementSchema>