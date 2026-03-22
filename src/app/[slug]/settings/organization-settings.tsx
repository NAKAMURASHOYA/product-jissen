'use client'

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { regenerateInvitationCodeAction } from "@/actions/invitation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Copy, RefreshCw } from "lucide-react"

type Props = {
  organizationId: string
  organizationName: string
  orgSlug: string
  initialInvitationCode: string | null
}

export const OrganizationSettings = ({
  organizationId,
  organizationName,
  orgSlug,
  initialInvitationCode,
}: Props) => {
  const [invitationCode, setInvitationCode] = useState(initialInvitationCode)
  const [isPending, startTransition] = useTransition()

  const handleCopy = () => {
    if (!invitationCode) return
    navigator.clipboard.writeText(invitationCode)
    toast.success("招待コードをクリップボードにコピーしました")
  }

  const handleRegenerate = () => {
    startTransition(async () => {
      const result = await regenerateInvitationCodeAction(organizationId, orgSlug)
      if (result.success && result.data) {
        setInvitationCode(result.data)
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{organizationName}</h2>
        <p className="text-sm text-muted-foreground">組織の設定と管理</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>招待コード管理</CardTitle>
          <CardDescription>
            このコードをメンバーに共有することで、組織への参加を招待できます。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md bg-muted px-3 py-2 font-mono text-sm">
              {invitationCode ?? "コードを読み込み中..."}
            </code>
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopy}
              disabled={!invitationCode || isPending}
              title="クリップボードにコピー"
            >
              <Copy className="h-4 w-4" />
              <span className="sr-only">コピー</span>
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={handleRegenerate}
            disabled={isPending}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
            招待コードを再発行する
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
