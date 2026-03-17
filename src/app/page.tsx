import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// 1. 期待するデータの型を定義する
// なぜ：Supabaseの自動型定義では、結合先の構造（オブジェクトか配列か）を特定しきれない場合があるため
interface MembershipWithOrg {
  organization_id: string;
  organizations: {
    slug: string;
  } | { slug: string }[] | null;
}

export default async function Home() {
  const supabase = createClient();

  // 2. ユーザーのセッションを確認
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  // 3. 組織情報を取得
  // 型アサーションを使って、取得データが MembershipWithOrg 型であることをTypeScriptに伝える
  const { data } = await supabase
    .from("organization_members")
    .select(`
      organization_id,
      organizations (
        slug
      )
    `)
    .eq("user_id", user.id)
    .maybeSingle();

  const membership = data as unknown as MembershipWithOrg;

  // 4. データの存在チェック
  if (!membership || !membership.organizations) {
    return redirect("/onboarding");
  }

  // 5. 配列かオブジェクトかを判定して slug を取り出す
  const orgs = membership.organizations;
  const slug = Array.isArray(orgs) ? orgs[0]?.slug : orgs?.slug;

  if (slug) {
    return redirect(`/${slug}`);
  }

  return redirect("/onboarding");
}