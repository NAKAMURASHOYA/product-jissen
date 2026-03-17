"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { endorsementSchema, type EndorsementInput } from "@/lib/schema"
import { endorseUserAction } from "@/actions/endorsement"
import { toast } from "sonner"
import { Plus } from "lucide-react"

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
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

type User = {
  id: string
  display_name: string | null
  email: string
}

type Props = {
  organizationId: string
  orgSlug: string
  members: User[]
  currentUserId: string
  suggestedSkills?: string[]
}

export function SendEndorsementDialog({
  organizationId,
  orgSlug,
  members,
  currentUserId,
  suggestedSkills = [],
}: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  // 自分以外のメンバーのみ表示
  const targetMembers = members.filter((m) => m.id !== currentUserId)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<EndorsementInput>({
    resolver: zodResolver(endorsementSchema),
  })

  const skillNameValue = watch("skillName") ?? ""

  // 入力値に基づいてサジェストをフィルタリング
  const filteredSuggestions = skillNameValue.trim().length === 0
    ? suggestedSkills.slice(0, 6)
    : suggestedSkills
        .filter(
          (s) =>
            s.toLowerCase().includes(skillNameValue.toLowerCase()) &&
            s.toLowerCase() !== skillNameValue.toLowerCase()
        )
        .slice(0, 6)

  const onSubmit = (data: EndorsementInput) => {
    startTransition(async () => {
      try {
        const res = await endorseUserAction(data, organizationId, orgSlug)
        if (res.success) {
          toast.success(res.message)
          setOpen(false)
          reset()
        } else {
          toast.error(res.message)
        }
      } catch (e) {
        toast.error("予期せぬエラーが発生しました")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          感謝を送る
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>感謝とスキルを送る</DialogTitle>
          <DialogDescription>
            チームメンバーの貢献を称えましょう。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          {/* 宛先選択 */}
          <div className="grid gap-2">
            <Label htmlFor="receiver">宛先</Label>
            <Select onValueChange={(val: string) => setValue("receiverId", val)}>
              <SelectTrigger>
                <SelectValue placeholder="メンバーを選択" />
              </SelectTrigger>
              <SelectContent>
                {targetMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.display_name || member.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.receiverId && (
              <p className="text-sm text-destructive">{errors.receiverId.message}</p>
            )}
          </div>

          {/* スキル名 */}
          <div className="grid gap-2">
            <Label htmlFor="skill">素晴らしいと思ったスキル</Label>
            <Input
              id="skill"
              placeholder="例: React, メンタリング, 資料作成"
              {...register("skillName")}
            />
            {/* スキルサジェスト */}
            {filteredSuggestions.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">
                  {skillNameValue.trim() ? "候補:" : "よく使われるスキル:"}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {filteredSuggestions.map((skill) => (
                    <Badge
                      key={skill}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10 hover:border-primary/40 text-xs"
                      onClick={() => setValue("skillName", skill, { shouldValidate: true })}
                    >
                      # {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {errors.skillName && (
              <p className="text-sm text-destructive">{errors.skillName.message}</p>
            )}
          </div>

          {/* メッセージ */}
          <div className="grid gap-2">
            <Label htmlFor="message">メッセージ (任意)</Label>
            <Textarea
              id="message"
              placeholder="助けてくれてありがとう！"
              {...register("message")}
            />
            {errors.message && (
              <p className="text-sm text-destructive">{errors.message.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "送信中..." : "送信する"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
