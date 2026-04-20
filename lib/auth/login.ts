"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type UserRole = "super_admin" | "owner" | "player";

export type LoginResult =
  | { success: true; role: UserRole }
  | { success: false; error: string };

const loginSchema = z.object({
  storeCode: z.string().trim().max(50),
  loginId: z.string().trim().min(1).max(50),
  password: z.string().min(1).max(100),
});

const GENERIC_ERROR =
  "店舗コード・ログインID・パスワードのいずれかが正しくありません";

export async function login(input: {
  storeCode: string;
  loginId: string;
  password: string;
}): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: GENERIC_ERROR };
  }
  const { storeCode, loginId, password } = parsed.data;

  const admin = createAdminClient();
  const isSuperAdmin = storeCode === "";

  let storeId: string | null = null;
  if (!isSuperAdmin) {
    const { data: store } = await admin
      .from("stores")
      .select("id")
      .eq("store_code", storeCode)
      .maybeSingle();
    if (!store) return { success: false, error: GENERIC_ERROR };
    storeId = store.id;
  }

  const base = admin
    .from("users")
    .select("id, role, password_hash")
    .eq("login_id", loginId);
  const { data: user } = await (isSuperAdmin
    ? base.is("store_id", null)
    : base.eq("store_id", storeId!)
  ).maybeSingle();

  if (!user) return { success: false, error: GENERIC_ERROR };

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return { success: false, error: GENERIC_ERROR };

  const prefix = isSuperAdmin ? "super" : storeCode;
  const virtualEmail = `${prefix}_${loginId}@app.internal`;

  const supabase = await createClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: virtualEmail,
    password,
  });
  if (signInErr) {
    return { success: false, error: "ログインに失敗しました" };
  }

  return { success: true, role: user.role as UserRole };
}
