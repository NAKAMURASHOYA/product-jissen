import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";

// データ型の定義
type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

type Skill = {
  id: string;
  name: string;
};

export type Endorsement = {
  id: string;
  message: string | null;
  created_at: string;
  sender: Profile;
  receiver: Profile;
  skill: Skill;
};

export function TimelineItem({ item }: { item: Endorsement }) {
  // 日付のフォーマット（例：5分前、3日前）
  const timeAgo = formatDistanceToNow(new Date(item.created_at), {
    addSuffix: true,
    locale: ja,
  });

  return (
    <Card className="mb-4">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          {/* 送信者アバター */}
          <Avatar className="h-10 w-10 border">
            <AvatarImage src={item.sender.avatar_url || ""} />
            <AvatarFallback>
              {item.sender.display_name?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-3">
            {/* ヘッダー部分: AさんがBさんにスキルを送りました */}
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold text-foreground">
                {item.sender.display_name || "不明なユーザー"}
              </span>
              <span className="text-muted-foreground text-xs">から</span>
              
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6 border">
                  <AvatarImage src={item.receiver.avatar_url || ""} />
                  <AvatarFallback className="text-[10px]">
                    {item.receiver.display_name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="font-semibold text-foreground">
                  {item.receiver.display_name || "不明なユーザー"}
                </span>
              </div>
              
              <span className="text-muted-foreground text-xs">へ</span>
              <span className="text-muted-foreground text-xs ml-auto">
                {timeAgo}
              </span>
            </div>

            {/* スキルバッジ */}
            <div>
              <Badge variant="secondary" className="text-sm py-1 px-3 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
                # {item.skill.name}
              </Badge>
            </div>

            {/* メッセージ（あれば） */}
            {item.message && (
              <div className="relative bg-muted/30 p-3 rounded-md text-sm text-muted-foreground">
                <MessageSquare className="absolute top-3 left-2 h-3 w-3 opacity-30" />
                <p className="pl-4">{item.message}</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}