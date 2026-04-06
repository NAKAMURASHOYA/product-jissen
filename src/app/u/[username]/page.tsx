import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Metadata } from "next"

type Props = { params: { username: string } }

const categoryLabels: Record<string, string> = {
  frontend: 'フロントエンド',
  backend: 'バックエンド',
  design: 'デザイン',
  sales: '営業',
  marketing: 'マーケティング',
  'office work': 'オフィス業務',
  other: 'その他',
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createClient()
  const { data: user } = await supabase
    .from("users")
    .select("display_name, tagline, avatar_url")
    .eq("display_id", params.username)
    .single()

  if (!user) return { title: "ユーザーが見つかりません" }

  const title = `${user.display_name} - Skilltag`
  const description = user.tagline ?? `${user.display_name} のスキルポートフォリオ`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: user.avatar_url ? [{ url: user.avatar_url }] : [],
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  }
}

export default async function PublicProfilePage({ params }: Props) {
  const supabase = createClient()

  // ユーザー情報
  const { data: profile } = await supabase
    .from("users")
    .select("id, display_id, display_name, tagline, bio, avatar_url")
    .eq("display_id", params.username)
    .single()

  if (!profile) notFound()

  // endorsementで獲得したスキル（user_skills）
  const { data: endorsedSkills } = await supabase
    .from("user_skills")
    .select("endorsement_count, skills(id, name)")
    .eq("user_id", profile.id)
    .order("endorsement_count", { ascending: false })

  // 自己登録スキル（skills テーブル）
  const { data: ownSkills } = await supabase
    .from("skills")
    .select("id, name, category, score")
    .eq("user_id", profile.id)
    .order("display_order", { ascending: true })

  const topEndorsed = (endorsedSkills ?? []).filter((s) => s.skills).slice(0, 10)

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="mx-auto max-w-2xl px-4 py-12 space-y-8">
        {/* プロフィールヘッダー */}
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <Avatar className="h-20 w-20 border-2 border-border">
            <AvatarImage src={profile.avatar_url ?? ""} alt={profile.display_name ?? ""} />
            <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
              {profile.display_name?.charAt(0) ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">{profile.display_name ?? "名無し"}</h1>
            {profile.tagline && (
              <p className="text-muted-foreground">{profile.tagline}</p>
            )}
            <p className="text-xs text-muted-foreground">@{profile.display_id}</p>
          </div>
        </div>

        {profile.bio && (
          <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {profile.bio}
          </p>
        )}

        {/* ピア承認スキル */}
        {topEndorsed.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">チームから認められたスキル</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {topEndorsed.map((us) => (
                  <div key={us.skills!.id} className="flex items-center gap-1">
                    <Badge
                      variant="secondary"
                      className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                    >
                      # {us.skills!.name}
                    </Badge>
                    <span className="text-xs text-muted-foreground">×{us.endorsement_count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 自己登録スキルポートフォリオ */}
        {(ownSkills ?? []).length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">スキルポートフォリオ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(
                  (ownSkills ?? []).reduce<Record<string, typeof ownSkills>>((acc, skill) => {
                    const cat = skill!.category ?? "other"
                    if (!acc[cat]) acc[cat] = []
                    acc[cat]!.push(skill)
                    return acc
                  }, {})
                ).map(([category, skills]) => (
                  <div key={category}>
                    <p className="mb-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {categoryLabels[category] ?? category}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {skills!.map((skill) => (
                        <div key={skill!.id} className="flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1">
                          <span className="text-sm font-medium">{skill!.name}</span>
                          <div className="flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <div
                                key={i}
                                className={`h-1.5 w-1.5 rounded-full ${i < skill!.score ? "bg-primary" : "bg-muted"}`}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {topEndorsed.length === 0 && (ownSkills ?? []).length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            <p>まだスキルが登録されていません。</p>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Powered by{" "}
          <a href="/" className="underline hover:text-foreground">
            Skilltag
          </a>
        </p>
      </div>
    </div>
  )
}
