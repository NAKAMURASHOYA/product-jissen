'use client'

import { useTransition, useRef, useState, useCallback, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { profileSchema, type ProfileInput } from "@/lib/schema"
import { updateProfileAction, uploadAvatarAction } from "@/actions/profile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Upload } from "lucide-react"

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_SIZE = 2 * 1024 * 1024

type Props = {
  defaultValues: Partial<ProfileInput>
}

export const ProfileForm = ({ defaultValues }: Props) => {
  const [isPending, startTransition] = useTransition()
  const [isUploading, setIsUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(defaultValues.avatar_url ?? "")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Hydrationエラー防止用のマウント状態管理
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    // defaultValuesを安定させる
    defaultValues: {
      display_id: defaultValues.display_id ?? "",
      display_name: defaultValues.display_name ?? "",
      tagline: defaultValues.tagline ?? "",
      bio: defaultValues.bio ?? "",
      avatar_url: defaultValues.avatar_url ?? "",
    },
  })

  // サーバーサイドとクライアントサイドで値を一致させるための安全な取得
  const watchedDisplayName = watch("display_name")
  const displayNameForAvatar = mounted ? (watchedDisplayName || "?") : (defaultValues.display_name || "?")

  const processFile = useCallback(async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("JPEG・PNG・WebP 形式のみアップロードできます")
      return
    }
    if (file.size > MAX_SIZE) {
      toast.error("ファイルサイズは2MB以下にしてください")
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setAvatarUrl(objectUrl)
    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await uploadAvatarAction(formData)

      if (res.success && res.data) {
        setAvatarUrl(res.data.publicUrl)
        setValue("avatar_url", res.data.publicUrl)
        toast.success(res.message)
      } else {
        toast.error(res.message)
        setAvatarUrl(defaultValues.avatar_url ?? "")
      }
    } finally {
      setIsUploading(false)
      URL.revokeObjectURL(objectUrl)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }, [defaultValues.avatar_url, setValue])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  const onSubmit = (data: ProfileInput) => {
    startTransition(async () => {
      const result = await updateProfileAction(data)

      if (result.success) {
        toast.success(result.message)
        return
      }

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

  // マウント前は最小限の構造、あるいは null を返すことで不一致を防ぐ方法もありますが、
  // ここではコンテンツを維持しつつ動的な値を安全に扱います。
  if (!mounted) return null

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* アバター */}
      <div className="space-y-2">
        <Label htmlFor="avatar-dropzone">プロフィール画像</Label>
        <div className="flex items-center gap-6">
          <div className="relative shrink-0">
            <Avatar className="h-20 w-20 border-2 border-border">
              <AvatarImage src={avatarUrl} alt={displayNameForAvatar} />
              <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                {displayNameForAvatar.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>
            )}
          </div>

          <button
            id="avatar-dropzone"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            disabled={isUploading}
            className={`flex flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${isDragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
              }`}
          >
            <Upload className={`h-6 w-6 ${isDragOver ? "text-primary" : "text-muted-foreground"}`} />
            <div>
              <p className="text-sm font-medium">
                {isUploading ? "アップロード中..." : "クリックまたはドラッグ&ドロップ"}
              </p>
              <p className="text-xs text-muted-foreground">JPEG・PNG・WebP、2MB以下</p>
            </div>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
          <input type="hidden" {...register("avatar_url")} />
        </div>
      </div>

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
        <Label htmlFor="display_name">
          表示名 <span className="text-destructive">*</span>
        </Label>
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

      <Button type="submit" disabled={isPending || isUploading} className="w-full sm:w-auto">
        {isPending ? "保存中..." : "変更を保存"}
      </Button>
    </form>
  )
}