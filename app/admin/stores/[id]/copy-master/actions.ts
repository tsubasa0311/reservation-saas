"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function copyMasterFromStore(
  targetStoreId: string,
  sourceStoreId: string,
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

  if (targetStoreId === sourceStoreId) return { error: "コピー元とコピー先が同じです" };

  const admin = createAdminClient();

  const [
    { data: courses },
    { data: nominations },
    { data: extensions },
    { data: options },
  ] = await Promise.all([
    admin
      .from("courses")
      .select("name, duration_min, default_price, default_back_rate, sort_order, is_active")
      .eq("store_id", sourceStoreId),
    admin
      .from("nomination_fees")
      .select("type, default_price, default_back_rate, is_active")
      .eq("store_id", sourceStoreId),
    admin
      .from("extensions")
      .select("name, duration_min, default_price, default_back_rate, sort_order, is_active")
      .eq("store_id", sourceStoreId),
    admin
      .from("options")
      .select("name, default_price, default_back_rate, sort_order, is_active")
      .eq("store_id", sourceStoreId),
  ]);

  const hasData =
    (courses ?? []).length > 0 ||
    (nominations ?? []).length > 0 ||
    (extensions ?? []).length > 0 ||
    (options ?? []).length > 0;

  if (!hasData) return { error: "コピー元にマスタデータがありません" };

  await Promise.all([
    (courses ?? []).length > 0
      ? admin.from("courses").insert(
          (courses ?? []).map((c) => ({ ...c, store_id: targetStoreId })),
        )
      : Promise.resolve(),
    (nominations ?? []).length > 0
      ? admin.from("nomination_fees").insert(
          (nominations ?? []).map((n) => ({ ...n, store_id: targetStoreId })),
        )
      : Promise.resolve(),
    (extensions ?? []).length > 0
      ? admin.from("extensions").insert(
          (extensions ?? []).map((e) => ({ ...e, store_id: targetStoreId })),
        )
      : Promise.resolve(),
    (options ?? []).length > 0
      ? admin.from("options").insert(
          (options ?? []).map((o) => ({ ...o, store_id: targetStoreId })),
        )
      : Promise.resolve(),
  ]);

  revalidatePath(`/admin/stores/${targetStoreId}`);
  return {};
}
