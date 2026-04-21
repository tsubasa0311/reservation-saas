"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

async function getOwnerStore() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: me } = await supabase
    .from("users").select("store_id, role").eq("id", user.id).maybeSingle();
  if (!me?.store_id || (me.role !== "owner" && me.role !== "super_admin")) return null;
  return { supabase, storeId: me.store_id };
}

const schema = z.object({
  default_price: z.coerce.number().int().min(0).max(9_999_999),
  default_back_rate: z.coerce.number().int().min(0).max(100),
});

export async function updateNominationFee(
  id: string,
  input: z.input<typeof schema>,
): Promise<{ error?: string }> {
  const ctx = await getOwnerStore();
  if (!ctx) return { error: "権限がありません" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "入力値が不正です" };

  const { error } = await ctx.supabase
    .from("nomination_fees")
    .update(parsed.data)
    .eq("id", id)
    .eq("store_id", ctx.storeId);

  if (error) return { error: `更新に失敗しました: ${error.message}` };
  revalidatePath("/owner/nomination");
  return {};
}
