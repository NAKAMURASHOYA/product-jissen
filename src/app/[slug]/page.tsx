import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function OrganizationHomePage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = createClient();
  
  // 組織情報の取得（レイアウトでも取得しているが、ページ内でも必要な場合があるため）
  const { data: organization } = await supabase
    .from("organizations")
    .select("name")
    .eq("slug", params.slug)
    .single();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">ダッシュボード</h1>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          感謝を送る
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今月の感謝数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              まだデータがありません
            </p>
          </CardContent>
        </Card>
        {/* 他のKPIカード */}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>最近のタイムライン</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
              <p>まだ感謝メッセージはありません。</p>
              <p className="text-sm">最初の感謝を同僚に送ってみましょう！</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>人気のスキル</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground text-center py-10">
              データ収集中...
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}