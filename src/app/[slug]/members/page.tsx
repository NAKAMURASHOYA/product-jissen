import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Mail, Shield } from "lucide-react"
import { notFound } from "next/navigation"
import type { QueryData } from "@supabase/supabase-js"
import { MemberFilters } from "./member-filters"

export default async function MembersPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { q?: string; dept?: string }
}) {
  const supabase = createClient()
  const keyword = searchParams.q?.trim() ?? ""
  const deptId = searchParams.dept ?? ""

  // 1. 組織情報取得
  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("slug", params.slug)
    .single()

  if (!organization) {
    return notFound()
  }

  // 2. 組織内の部署一覧取得
  const { data: departments } = await supabase
    .from("departments")
    .select("id, name")
    .eq("organization_id", organization.id)
    .order("name")

  // 3. メンバー一覧クエリ (QueryData で型推論)
  const membersQuery = supabase
    .from("organization_members")
    .select(`
      role,
      department_id,
      users (
        id,
        display_name,
        avatar_url,
        email,
        user_skills (
          endorsement_count,
          skills (
            id,
            name
          )
        )
      )
    `)
    .eq("organization_id", organization.id)

  type MembersQueryResult = QueryData<typeof membersQuery>

  // 4. キーワード検索 (display_name or email)
  const filteredQuery = keyword
    ? membersQuery.or(
        `users.display_name.ilike.%${keyword}%,users.email.ilike.%${keyword}%`,
        { foreignTable: "users" }
      )
    : membersQuery

  // 5. 部署フィルター
  const finalQuery = deptId
    ? filteredQuery.eq("department_id", deptId)
    : filteredQuery

  const { data: membersData } = await finalQuery

  const members: MembersQueryResult = membersData ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">メンバー一覧</h1>
        <div className="text-sm text-muted-foreground">
          {members.length} 名
        </div>
      </div>

      {/* 検索・フィルターエリア */}
      <MemberFilters
        departments={departments ?? []}
        defaultQuery={keyword}
        defaultDept={deptId}
      />

      {/* 検索結果ゼロ時のフォールバック */}
      {members.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <p className="text-base font-medium">メンバーが見つかりませんでした</p>
          <p className="text-sm mt-1">検索条件を変えてお試しください。</p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => {
          if (!member.users) return null
          const user = member.users

          const topSkills = (user.user_skills ?? [])
            .filter((us) => us.skills !== null)
            .sort((a, b) => b.endorsement_count - a.endorsement_count)
            .slice(0, 5)

          return (
            <Card key={user.id} className="overflow-hidden">
              <CardHeader className="flex flex-row items-center gap-4 bg-muted/20 pb-4">
                <Avatar className="h-12 w-12 border">
                  <AvatarImage
                    src={user.avatar_url || ""}
                    alt={user.display_name || "avatar"}
                  />
                  <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">
                    {user.display_name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <CardTitle className="text-base truncate">
                    {user.display_name || "名無し"}
                  </CardTitle>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        member.role === "owner"
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500"
                          : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {member.role === "owner" && (
                        <Shield className="mr-1 h-3 w-3" />
                      )}
                      {member.role}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </div>

                {/* スキルバッジ */}
                <div className="pt-2 border-t">
                  {topSkills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {topSkills.map((us) => (
                        <Badge
                          key={us.skills!.id}
                          variant="secondary"
                          className="text-xs bg-primary/10 text-primary hover:bg-primary/20 border-primary/20"
                        >
                          # {us.skills!.name}
                          <span className="ml-1 text-primary/60">
                            ×{us.endorsement_count}
                          </span>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-1">
                      まだスキルがありません
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
