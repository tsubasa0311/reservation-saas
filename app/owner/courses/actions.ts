"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

async function getOwnerStore() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: me } = await supabase
    .from("users")
    .select("store_id, role")
    .eq("id", user.id)
    .maybeSingle();
  if (!me?.store_id || (me.role !== "owner" && me.role !== "super_admin")) return null;

  return { supabase, storeId: me.store_id };
}

const courseSchema = z.object({
  name: z.string().trim().min(1).max(100),
  duration_min: z.coerce.number().int().min(1).max(999),
  default_price: z.coerce.number().int().min(0).max(9_999_999),
  default_back_rate: z.coerce.number().int().min(0).max(100),
  valid_from: z.string().nullable().transform((v) => v || null),
  valid_to: z.string().nullable().transform((v) => v || null),
  is_active: z.boolean().default(true),
});

export type CourseInput = z.input<typeof courseSchema>;

export async function createCourse(input: CourseInput): Promise<{ error?: string }> {
  const ctx = await getOwnerStore();
  if (!ctx) return { error: "権限がありません" };

  const parsed = courseSchema.safeParse(input);
  if (!parsed.success) return { error: "入力値が不正です" };

  const { error } = await ctx.supabase.from("courses").insert({
    store_id: ctx.storeId,
    ...parsed.data,
  });

  if (error) return { error: `追加に失敗しました: ${error.message}` };
  revalidatePath("/owner/courses");
  return {};
}

export async function updateCourse(id: string, input: CourseInput): Promise<{ error?: string }> {
  const ctx = await getOwnerStore();
  if (!ctx) return { error: "権限がありません" };

  const parsed = courseSchema.safeParse(input);
  if (!parsed.success) return { error: "入力値が不正です" };

  const { error } = await ctx.supabase
    .from("courses")
    .update(parsed.data)
    .eq("id", id)
    .eq("store_id", ctx.storeId);

  if (error) return { error: `更新に失敗しました: ${error.message}` };
  revalidatePath("/owner/courses");
  return {};
}

export async function deleteCourse(id: string): Promise<{ error?: string }> {
  const ctx = await getOwnerStore();
  if (!ctx) return { error: "権限がありません" };

  const { error } = await ctx.supabase
    .from("courses")
    .delete()
    .eq("id", id)
    .eq("store_id", ctx.storeId);

  if (error) return { error: `削除に失敗しました: ${error.message}` };
  revalidatePath("/owner/courses");
  return {};
}
