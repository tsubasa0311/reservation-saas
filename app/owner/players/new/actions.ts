"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  login_id: z.string().trim().min(1).max(50).regex(/^[a-zA-Z0-9_]+$/, "半角英数字とアンダースコアのみ"),
  password: z.string().min(6).max(100),
  back_rate_transport: z.coerce.number().int().min(0).max(100).default(0),
});

export type CreatePlayerInput = z.input<typeof schema>;

export async function createPlayer(input: CreatePlayerInput): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "権限がありません" };

  const { data: me } = await supabase
    .from("users").select("store_id, role").eq("id", user.id).maybeSingle();
  if (!me?.store_id || (me.role !== "owner" && me.role !== "super_admin")) return { error: "権限がありません" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "入力値が不正です" };
  const { name, login_id, password, back_rate_transport } = parsed.data;

  const admin = createAdminClient();

  // 店舗コードを取得して仮想メール生成
  const { data: store } = await admin.from("stores").select("store_code").eq("id", me.store_id).maybeSingle();
  if (!store) return { error: "店舗情報が取得できません" };

  const virtualEmail = `${store.store_code}_${login_id}@app.internal`;

  // login_id 重複チェック
  const { data: existing } = await supabase
    .from("users").select("id").eq("store_id", me.store_id).eq("login_id", login_id).maybeSingle();
  if (existing) return { error: "このログインIDは既に使われています" };

  // Supabase Auth ユーザー作成
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: virtualEmail,
    password,
    email_confirm: true,
  });
  if (authErr || !authData.user) return { error: `認証ユーザーの作成に失敗しました: ${authErr?.message}` };

  // bcrypt ハッシュ
  const password_hash = await bcrypt.hash(password, 10);

  // public.users 挿入
  const { error: insertErr } = await supabase.from("users").insert({
    id: authData.user.id,
    store_id: me.store_id,
    role: "player",
    login_id,
    password_hash,
    name,
    back_rate_transport,
    is_active: true,
  });

  if (insertErr) {
    // ロールバック：Auth ユーザーを削除
    await admin.auth.admin.deleteUser(authData.user.id);
    return { error: `ユーザー作成に失敗しました: ${insertErr.message}` };
  }

  redirect("/owner/players");
}
