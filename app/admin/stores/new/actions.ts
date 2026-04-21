"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  store_name: z.string().trim().min(1).max(100),
  store_code: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/, "半角英数字とアンダースコアのみ"),
  owner_name: z.string().trim().min(1).max(100),
  owner_login_id: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .regex(/^[a-zA-Z0-9_]+$/, "半角英数字とアンダースコアのみ"),
  owner_password: z.string().min(6).max(100),
  initial_master: z.enum(["empty", "sample"]),
});

export type CreateStoreInput = z.input<typeof schema>;

export async function createStore(
  input: CreateStoreInput,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "権限がありません" };

  const { data: me } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!me || me.role !== "super_admin") return { error: "権限がありません" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "入力値が不正です" };
  const d = parsed.data;

  const admin = createAdminClient();

  // store_code 重複チェック
  const { data: existingStore } = await admin
    .from("stores")
    .select("id")
    .eq("store_code", d.store_code)
    .maybeSingle();
  if (existingStore) return { error: "この店舗コードは既に使われています" };

  // 店舗作成
  const { data: store, error: storeErr } = await admin
    .from("stores")
    .insert({ name: d.store_name, store_code: d.store_code, is_active: true })
    .select("id")
    .single();
  if (storeErr || !store) return { error: `店舗作成に失敗しました: ${storeErr?.message}` };

  const storeId = store.id;

  // オーナーの仮想メール
  const virtualEmail = `${d.store_code}_${d.owner_login_id}@app.internal`;

  // Auth ユーザー作成
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: virtualEmail,
    password: d.owner_password,
    email_confirm: true,
  });
  if (authErr || !authData.user) {
    await admin.from("stores").delete().eq("id", storeId);
    return { error: `オーナーアカウントの作成に失敗しました: ${authErr?.message}` };
  }

  const password_hash = await bcrypt.hash(d.owner_password, 10);

  // public.users 挿入
  const { error: userErr } = await admin.from("users").insert({
    id: authData.user.id,
    store_id: storeId,
    role: "owner",
    login_id: d.owner_login_id,
    password_hash,
    name: d.owner_name,
    is_active: true,
  });
  if (userErr) {
    await admin.auth.admin.deleteUser(authData.user.id);
    await admin.from("stores").delete().eq("id", storeId);
    return { error: `ユーザー作成に失敗しました: ${userErr.message}` };
  }

  // transport_settings 初期化
  await admin.from("transport_settings").insert({
    store_id: storeId,
    input_mode: "manual",
  });

  // サンプルマスタ投入
  if (d.initial_master === "sample") {
    await insertSampleMaster(admin, storeId);
  }

  redirect(`/admin/stores/${storeId}`);
}

async function insertSampleMaster(
  admin: ReturnType<typeof createAdminClient>,
  storeId: string,
) {
  await Promise.all([
    admin.from("courses").insert([
      {
        store_id: storeId,
        name: "60分コース",
        duration_min: 60,
        default_price: 20000,
        default_back_rate: 40,
        sort_order: 1,
        is_active: true,
      },
      {
        store_id: storeId,
        name: "90分コース",
        duration_min: 90,
        default_price: 28000,
        default_back_rate: 40,
        sort_order: 2,
        is_active: true,
      },
    ]),
    admin.from("nomination_fees").insert([
      {
        store_id: storeId,
        type: "first",
        default_price: 3000,
        default_back_rate: 50,
        is_active: true,
      },
      {
        store_id: storeId,
        type: "repeat",
        default_price: 5000,
        default_back_rate: 50,
        is_active: true,
      },
    ]),
    admin.from("extensions").insert([
      {
        store_id: storeId,
        name: "30分延長",
        duration_min: 30,
        default_price: 10000,
        default_back_rate: 40,
        sort_order: 1,
        is_active: true,
      },
    ]),
  ]);
}
