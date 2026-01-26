"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
// 関数名変更に伴うインポート修正
import { createOrganizationAction, joinOrganizationAction } from "@/actions/organization";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTransition } from "react";

// オンボーディング画面用の簡易スキーマ
const createOrgSchema = z.object({
  name: z.string().min(1, "組織名は必須です"),
  slug: z.string().min(3, "IDは3文字以上で入力してください").regex(/^[a-z0-9-]+$/, "半角英数字とハイフンのみ使用可能です"),
});

const joinOrgSchema = z.object({
  code: z.string().min(1, "招待コードを入力してください"),
});

type CreateOrgInput = z.infer<typeof createOrgSchema>;
type JoinOrgInput = z.infer<typeof joinOrgSchema>;

import { useState } from "react";

export default function OnboardingPage() {
  const [mode, setMode] = useState<"create" | "join">("join");
  const [isPending, startTransition] = useTransition();

  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    formState: { errors: errorsCreate },
  } = useForm<CreateOrgInput>({
    resolver: zodResolver(createOrgSchema),
  });

  const {
    register: registerJoin,
    handleSubmit: handleSubmitJoin,
    formState: { errors: errorsJoin },
  } = useForm<JoinOrgInput>({
    resolver: zodResolver(joinOrgSchema),
  });

  const onCreate = (data: CreateOrgInput) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("slug", data.slug);

      try {
        // 関数名変更
        const res = await createOrganizationAction(formData);
        if (!res.success) {
          toast.error(res.message);
        }
      } catch (e) {
        toast.error("予期せぬエラーが発生しました");
      }
    });
  };

  const onJoin = (data: JoinOrgInput) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("code", data.code);

      try {
        // 関数名変更
        const res = await joinOrganizationAction(formData);
        if (!res.success) {
          toast.error(res.message);
        }
      } catch (e) {
        toast.error("予期せぬエラーが発生しました");
      }
    });
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">ようこそ Skilltag へ</CardTitle>
          <CardDescription>
            まずは所属する組織を選択してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex w-full rounded-lg bg-muted p-1 mb-6">
            <button
              onClick={() => setMode("join")}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
                mode === "join"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background/50"
              }`}
            >
              招待コードで参加
            </button>
            <button
              onClick={() => setMode("create")}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
                mode === "create"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background/50"
              }`}
            >
              新しい組織を作成
            </button>
          </div>

          {mode === "join" ? (
            <form onSubmit={handleSubmitJoin(onJoin)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">招待コード</Label>
                <Input
                  id="code"
                  placeholder="例: invite_xyz123"
                  {...registerJoin("code")}
                />
                {errorsJoin.code && (
                  <p className="text-sm text-destructive">{errorsJoin.code.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "参加中..." : "組織に参加する"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmitCreate(onCreate)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">組織名</Label>
                <Input
                  id="name"
                  placeholder="株式会社Example"
                  {...registerCreate("name")}
                />
                {errorsCreate.name && (
                  <p className="text-sm text-destructive">{errorsCreate.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">組織ID (URLの一部になります)</Label>
                <div className="flex items-center">
                  <span className="bg-muted px-3 py-2 border border-r-0 rounded-l-md text-muted-foreground text-sm">
                    /
                  </span>
                  <Input
                    id="slug"
                    className="rounded-l-none"
                    placeholder="my-team"
                    {...registerCreate("slug")}
                  />
                </div>
                {errorsCreate.slug && (
                  <p className="text-sm text-destructive">{errorsCreate.slug.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  半角英数字とハイフンが使用できます。
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "作成中..." : "組織を作成する"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}