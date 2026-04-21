"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getSuperAdminCtx() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: me } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!me || me.role !== "super_admin") return null;
  return createAdminClient();
}

export async function toggleStoreActive(
  storeId: string,
  isActive: boolean,
): Promise<{ error?: string }> {
  const admin = await getSuperAdminCtx();
  if (!admin) return { error: "権限がありません" };

  const { error } = await admin
    .from("stores")
    .update({ is_active: isActive })
    .eq("id", storeId);
  if (error) return { error: `更新に失敗しました: ${error.message}` };

  revalidatePath("/admin/stores");
  revalidatePath(`/admin/stores/${storeId}`);
  return {};
}

export async function updateStoreInfo(
  storeId: string,
  input: { name: string },
): Promise<{ error?: string }> {
  const admin = await getSuperAdminCtx();
  if (!admin) return { error: "権限がありません" };

  const name = input.name.trim();
  if (!name) return { error: "店舗名を入力してください" };

  const { error } = await admin
    .from("stores")
    .update({ name })
    .eq("id", storeId);
  if (error) return { error: `更新に失敗しました: ${error.message}` };

  revalidatePath(`/admin/stores/${storeId}`);
  return {};
}

const resetSchema = z.object({
  newPassword: z.string().min(6).max(100),
});

export async function resetOwnerPassword(
  storeId: string,
  input: { newPassword: string },
): Promise<{ error?: string }> {
  const admin = await getSuperAdminCtx();
  if (!admin) return { error: "権限がありません" };

  const parsed = resetSchema.safeParse(input);
  if (!parsed.success) return { error: "パスワードは6文字以上にしてください" };

  const { data: owner } = await admin
    .from("users")
    .select("id")
    .eq("store_id", storeId)
    .eq("role", "owner")
    .maybeSingle();
  if (!owner) return { error: "オーナーが見つかりません" };

  const password_hash = await bcrypt.hash(parsed.data.newPassword, 10);

  const [{ error: authErr }, { error: dbErr }] = await Promise.all([
    admin.auth.admin.updateUserById(owner.id, { password: parsed.data.newPassword }),
    admin.from("users").update({ password_hash }).eq("id", owner.id),
  ]);

  if (authErr) return { error: `パスワードリセットに失敗しました: ${authErr.message}` };
  if (dbErr) return { error: `DB更新に失敗しました: ${dbErr.message}` };

  return {};
}

export async function deleteStore(storeId: string): Promise<{ error?: string }> {
  const admin = await getSuperAdminCtx();
  if (!admin) return { error: "権限がありません" };

  // Auth ユーザーを先に削除（users は cascade で消えるため）
  const { data: storeUsers } = await admin
    .from("users")
    .select("id")
    .eq("store_id", storeId);

  for (const u of storeUsers ?? []) {
    await admin.auth.admin.deleteUser(u.id);
  }

  const { error } = await admin.from("stores").delete().eq("id", storeId);
  if (error) return { error: `削除に失敗しました: ${error.message}` };

  redirect("/admin/stores");
}
