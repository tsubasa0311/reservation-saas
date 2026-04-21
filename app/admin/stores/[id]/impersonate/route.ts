import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: storeId } = await params;

  // スーパー管理者チェック
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const { data: me } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!me || me.role !== "super_admin") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const admin = createAdminClient();

  // オーナーの Auth ユーザーメールを取得
  const { data: ownerUser } = await admin
    .from("users")
    .select("id")
    .eq("store_id", storeId)
    .eq("role", "owner")
    .maybeSingle();

  if (!ownerUser) {
    return NextResponse.redirect(new URL(`/admin/stores/${storeId}`, request.url));
  }

  const { data: authUser } = await admin.auth.admin.getUserById(ownerUser.id);
  if (!authUser.user?.email) {
    return NextResponse.redirect(new URL(`/admin/stores/${storeId}`, request.url));
  }

  // オーナーのマジックリンクを生成（/owner へリダイレクト）
  const origin = request.nextUrl.origin;
  const { data: linkData, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: authUser.user.email,
    options: {
      redirectTo: `${origin}/owner`,
    },
  });

  if (error || !linkData.properties.action_link) {
    return NextResponse.redirect(new URL(`/admin/stores/${storeId}`, request.url));
  }

  // マジックリンクへリダイレクト → Supabase がオーナーのセッションを作成
  return NextResponse.redirect(linkData.properties.action_link);
}
