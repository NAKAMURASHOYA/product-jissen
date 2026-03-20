'use client'

import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { profileSchema, type ProfileInput } from "@/lib/schema"
import { updateProfileAction } from "@/actions/profile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type Props = {
  defaultValues: Partial<ProfileInput>
}

export const ProfileForm = ({ defaultValues }: Props) => {
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues,
  })

  const onSubmit = (data: ProfileInput) => {
    startTransition(async () => {
      const result = await updateProfileAction(data)

      if (result.success) {
        toast.success(result.message)
        return
      }

      // サーバー側のフィールドエラーをフォームに反映
      if (result.errors) {
        for (const [field, messages] of Object.entries(result.errors)) {
          setError(field as keyof ProfileInput, {
            type: "server",
            message: messages[0],
          })
        }
      }

      toast.error(result.message)
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* 表示ID */}
      <div className="space-y-2">
        <Label htmlFor="display_id">表示ID</Label>
        <Input
          id="display_id"
          placeholder="例: yamada_taro"
          {...register("display_id")}
        />
        <p className="text-xs text-muted-foreground">
          半角英数字とアンダースコアのみ使用可能（3〜20文字）
        </p>
        {errors.display_id && (
          <p className="text-sm text-destructive">{errors.display_id.message}</p>
        )}
      </div>

      {/* 表示名 */}
      <div className="space-y-2">
        <Label htmlFor="display_name">表示名 <span className="text-destructive">*</span></Label>
        <Input
          id="display_name"
          placeholder="例: 山田 太郎"
          {...register("display_name")}
        />
        {errors.display_name && (
          <p className="text-sm text-destructive">{errors.display_name.message}</p>
        )}
      </div>

      {/* 肩書き */}
      <div className="space-y-2">
        <Label htmlFor="tagline">肩書き</Label>
        <Input
          id="tagline"
          placeholder="例: フロントエンドエンジニア"
          {...register("tagline")}
        />
        {errors.tagline && (
          <p className="text-sm text-destructive">{errors.tagline.message}</p>
        )}
      </div>

      {/* 自己紹介 */}
      <div className="space-y-2">
        <Label htmlFor="bio">自己紹介</Label>
        <Textarea
          id="bio"
          placeholder="あなたのことを紹介してください..."
          rows={4}
          {...register("bio")}
        />
        {errors.bio && (
          <p className="text-sm text-destructive">{errors.bio.message}</p>
        )}
      </div>

      {/* アバターURL */}
      <div className="space-y-2">
        <Label htmlFor="avatar_url">アバター画像URL</Label>
        <Input
          id="avatar_url"
          type="url"
          placeholder="https://example.com/avatar.png"
          {...register("avatar_url")}
        />
        {errors.avatar_url && (
          <p className="text-sm text-destructive">{errors.avatar_url.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
        {isPending ? "保存中..." : "変更を保存"}
      </Button>
    </form>
  )
}
