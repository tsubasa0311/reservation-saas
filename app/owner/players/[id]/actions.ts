"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getOwnerStore() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: me } = await supabase
    .from("users").select("store_id, role").eq("id", user.id).maybeSingle();
  if (!me?.store_id || (me.role !== "owner" && me.role !== "super_admin")) return null;
  return { supabase, storeId: me.store_id };
}

// 10-3: 基本情報更新
export async function updatePlayerBasic(
  playerId: string,
  input: { name: string; back_rate_transport: number; is_active: boolean },
): Promise<{ error?: string }> {
  const ctx = await getOwnerStore();
  if (!ctx) return { error: "権限がありません" };

  const parsed = z.object({
    name: z.string().trim().min(1).max(100),
    back_rate_transport: z.coerce.number().int().min(0).max(100),
    is_active: z.boolean(),
  }).safeParse(input);
  if (!parsed.success) return { error: "入力値が不正です" };

  const { error } = await ctx.supabase
    .from("users")
    .update(parsed.data)
    .eq("id", playerId)
    .eq("store_id", ctx.storeId)
    .eq("role", "player");

  if (error) return { error: `更新に失敗しました: ${error.message}` };
  revalidatePath(`/owner/players/${playerId}`);
  revalidatePath("/owner/players");
  return {};
}

// 10-5: パスワードリセット
export async function resetPlayerPassword(
  playerId: string,
  newPassword: string,
): Promise<{ error?: string }> {
  const ctx = await getOwnerStore();
  if (!ctx) return { error: "権限がありません" };

  if (newPassword.length < 6) return { error: "パスワードは6文字以上にしてください" };

  const { data: player } = await ctx.supabase
    .from("users").select("id, store_id").eq("id", playerId).eq("store_id", ctx.storeId).maybeSingle();
  if (!player) return { error: "プレイヤーが見つかりません" };

  const admin = createAdminClient();
  const password_hash = await bcrypt.hash(newPassword, 10);

  const [{ error: authErr }, { error: dbErr }] = await Promise.all([
    admin.auth.admin.updateUserById(playerId, { password: newPassword }),
    ctx.supabase.from("users").update({ password_hash }).eq("id", playerId),
  ]);

  if (authErr) return { error: `パスワードリセットに失敗しました: ${authErr.message}` };
  if (dbErr) return { error: `ハッシュ更新に失敗しました: ${dbErr.message}` };
  return {};
}

// 10-4: コース上書き保存（null = デフォルト削除）
export async function saveCourseOverride(
  playerId: string,
  courseId: string,
  override: { price: number; back_rate: number } | null,
): Promise<{ error?: string }> {
  const ctx = await getOwnerStore();
  if (!ctx) return { error: "権限がありません" };

  if (override === null) {
    await ctx.supabase.from("player_course_overrides")
      .delete().eq("player_id", playerId).eq("course_id", courseId);
  } else {
    const { error } = await ctx.supabase.from("player_course_overrides").upsert(
      { player_id: playerId, store_id: ctx.storeId, course_id: courseId, ...override },
      { onConflict: "player_id,course_id" },
    );
    if (error) return { error: `保存に失敗しました: ${error.message}` };
  }
  revalidatePath(`/owner/players/${playerId}`);
  return {};
}

export async function saveNominationOverride(
  playerId: string,
  type: string,
  override: { price: number; back_rate: number } | null,
): Promise<{ error?: string }> {
  const ctx = await getOwnerStore();
  if (!ctx) return { error: "権限がありません" };

  if (override === null) {
    await ctx.supabase.from("player_nomination_overrides")
      .delete().eq("player_id", playerId).eq("type", type);
  } else {
    const { error } = await ctx.supabase.from("player_nomination_overrides").upsert(
      { player_id: playerId, store_id: ctx.storeId, type, ...override },
      { onConflict: "player_id,type" },
    );
    if (error) return { error: `保存に失敗しました: ${error.message}` };
  }
  revalidatePath(`/owner/players/${playerId}`);
  return {};
}

export async function saveExtensionOverride(
  playerId: string,
  extensionId: string,
  override: { price: number; back_rate: number } | null,
): Promise<{ error?: string }> {
  const ctx = await getOwnerStore();
  if (!ctx) return { error: "権限がありません" };

  if (override === null) {
    await ctx.supabase.from("player_extension_overrides")
      .delete().eq("player_id", playerId).eq("extension_id", extensionId);
  } else {
    const { error } = await ctx.supabase.from("player_extension_overrides").upsert(
      { player_id: playerId, store_id: ctx.storeId, extension_id: extensionId, ...override },
      { onConflict: "player_id,extension_id" },
    );
    if (error) return { error: `保存に失敗しました: ${error.message}` };
  }
  revalidatePath(`/owner/players/${playerId}`);
  return {};
}

export async function saveOptionOverride(
  playerId: string,
  optionId: string,
  override: { price: number; back_rate: number } | null,
): Promise<{ error?: string }> {
  const ctx = await getOwnerStore();
  if (!ctx) return { error: "権限がありません" };

  if (override === null) {
    await ctx.supabase.from("player_option_overrides")
      .delete().eq("player_id", playerId).eq("option_id", optionId);
  } else {
    const { error } = await ctx.supabase.from("player_option_overrides").upsert(
      { player_id: playerId, store_id: ctx.storeId, option_id: optionId, ...override },
      { onConflict: "player_id,option_id" },
    );
    if (error) return { error: `保存に失敗しました: ${error.message}` };
  }
  revalidatePath(`/owner/players/${playerId}`);
  return {};
}
