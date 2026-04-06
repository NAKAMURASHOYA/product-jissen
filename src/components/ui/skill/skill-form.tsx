"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { skillTagSchema, skillCategoryEnum, type SkillTagInput } from "@/lib/schema"
import { upsertSkillAction } from "@/actions/skill"
import { toast } from "sonner"
import { Plus, Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Skill = {
  id: string
  name: string
  category: string
  score: number
  display_order: number
}

const categoryLabels: Record<string, string> = {
  frontend: 'フロントエンド',
  backend: 'バックエンド',
  design: 'デザイン',
  sales: '営業',
  marketing: 'マーケティング',
  'office work': 'オフィス業務',
  other: 'その他',
}

type Props = {
  orgSlug: string
  skill?: Skill
  trigger?: React.ReactNode
}

export function SkillForm({ orgSlug, skill, trigger }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const isEdit = !!skill

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<SkillTagInput>({
    resolver: zodResolver(skillTagSchema),
    defaultValues: skill
      ? { id: skill.id, name: skill.name, category: skill.category as SkillTagInput['category'], score: skill.score }
      : { score: 1 },
  })

  const scoreValue = watch("score") ?? 1

  const onSubmit = (data: SkillTagInput) => {
    startTransition(async () => {
      try {
        const res = await upsertSkillAction(data, orgSlug)
        if (res.success) {
          toast.success(res.message)
          setOpen(false)
          if (!isEdit) reset()
        } else {
          toast.error(res.message)
        }
      } catch {
        toast.error("予期せぬエラーが発生しました")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            スキルを追加
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "スキルを編集" : "スキルを追加"}</DialogTitle>
          <DialogDescription>
            あなたのスキルポートフォリオに登録します。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          {isEdit && <input type="hidden" {...register("id")} />}

          {/* スキル名 */}
          <div className="grid gap-2">
            <Label htmlFor="name">スキル名</Label>
            <Input
              id="name"
              placeholder="例: React, TypeScript, プレゼン"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* カテゴリ */}
          <div className="grid gap-2">
            <Label htmlFor="category">カテゴリ</Label>
            <Select
              defaultValue={skill?.category}
              onValueChange={(val) => setValue("category", val as SkillTagInput['category'])}
            >
              <SelectTrigger>
                <SelectValue placeholder="カテゴリを選択" />
              </SelectTrigger>
              <SelectContent>
                {skillCategoryEnum.options.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {categoryLabels[cat] ?? cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-destructive">{errors.category.message}</p>
            )}
          </div>

          {/* スコア */}
          <div className="grid gap-2">
            <Label htmlFor="score">レベル (1〜5): {scoreValue}</Label>
            <input
              id="score"
              type="range"
              min={1}
              max={5}
              step={1}
              className="w-full"
              {...register("score", { valueAsNumber: true })}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>初心者</span>
              <span>エキスパート</span>
            </div>
            {errors.score && (
              <p className="text-sm text-destructive">{errors.score.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "保存中..." : isEdit ? "更新する" : "追加する"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
