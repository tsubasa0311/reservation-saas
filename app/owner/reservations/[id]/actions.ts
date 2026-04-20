"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function getOwnerContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: me } = await supabase
    .from("users")
    .select("id, store_id, role")
    .eq("id", user.id)
    .maybeSingle();
  if (!me || !me.store_id || (me.role !== "owner" && me.role !== "super_admin")) return null;

  return { supabase, storeId: me.store_id };
}

// スナップショット形状（createReservation で保存したものと一致）
type CourseSnap = { name: string; price: number; back_rate: number; duration_min: number };
type NominationSnap = { type: string; price: number; back_rate: number };
type ExtensionSnap = { name: string; price: number; back_rate: number; duration_min: number };
type OptionSnap = { name: string; price: number; back_rate: number };

export async function confirmReservation(
  reservationId: string,
): Promise<{ error?: string }> {
  const ctx = await getOwnerContext();
  if (!ctx) return { error: "権限がありません" };

  const { supabase, storeId } = ctx;

  const { data: r, error: fetchErr } = await supabase
    .from("reservations")
    .select(
      "id, status, store_id, course_snapshot, nomination_snapshot, extension_snapshot, transport_fee, transport_back_rate, reservation_options(option_snapshot, quantity)",
    )
    .eq("id", reservationId)
    .maybeSingle();

  if (fetchErr || !r) return { error: "予約が見つかりません" };
  if (r.store_id !== storeId) return { error: "権限がありません" };
  if (r.status !== "tentative") return { error: "仮予約のみ確定できます" };

  const course = r.course_snapshot as CourseSnap;
  const nomination = r.nomination_snapshot as NominationSnap;
  const extension = r.extension_snapshot as ExtensionSnap | null;
  const options = (r.reservation_options ?? []) as Array<{
    option_snapshot: OptionSnap;
    quantity: number;
  }>;

  // 合計・バック計算（display と同じく per-item Math.floor）
  const courseBack = Math.floor((course.price * course.back_rate) / 100);
  const nomBack = Math.floor((nomination.price * nomination.back_rate) / 100);
  const extFee = extension?.price ?? 0;
  const extBack = extension ? Math.floor((extension.price * extension.back_rate) / 100) : 0;
  const optSubtotal = options.reduce((s, o) => s + o.option_snapshot.price * o.quantity, 0);
  const optBack = options.reduce(
    (s, o) =>
      s + Math.floor((o.option_snapshot.price * o.quantity * o.option_snapshot.back_rate) / 100),
    0,
  );
  const transportBack = Math.floor((r.transport_fee * r.transport_back_rate) / 100);

  const totalAmount = course.price + nomination.price + extFee + optSubtotal + r.transport_fee;
  const playerBackAmount = courseBack + nomBack + extBack + optBack + transportBack;
  const storeAmount = totalAmount - playerBackAmount;

  const { error: updateErr } = await supabase
    .from("reservations")
    .update({
      status: "confirmed",
      total_amount: totalAmount,
      player_back_amount: playerBackAmount,
      store_amount: storeAmount,
    })
    .eq("id", reservationId)
    .eq("status", "tentative"); // 二重確定防止の楽観的チェック

  if (updateErr) return { error: `確定処理に失敗しました: ${updateErr.message}` };

  revalidatePath("/owner/reservations");
  revalidatePath(`/owner/reservations/${reservationId}`);
  redirect(`/owner/reservations/${reservationId}`);
}

export async function cancelReservation(
  reservationId: string,
): Promise<{ error?: string }> {
  const ctx = await getOwnerContext();
  if (!ctx) return { error: "権限がありません" };

  const { supabase, storeId } = ctx;

  const { data: r } = await supabase
    .from("reservations")
    .select("id, status, store_id")
    .eq("id", reservationId)
    .maybeSingle();

  if (!r || r.store_id !== storeId) return { error: "予約が見つかりません" };
  if (r.status === "cancelled") return { error: "すでにキャンセル済みです" };

  const { error } = await supabase
    .from("reservations")
    .update({ status: "cancelled" })
    .eq("id", reservationId);

  if (error) return { error: `キャンセルに失敗しました: ${error.message}` };

  revalidatePath("/owner/reservations");
  revalidatePath(`/owner/reservations/${reservationId}`);
  redirect(`/owner/reservations/${reservationId}`);
}

// 取り消し → 仮予約に戻す（復元）
export async function restoreReservation(
  reservationId: string,
): Promise<{ error?: string }> {
  const ctx = await getOwnerContext();
  if (!ctx) return { error: "権限がありません" };

  const { supabase, storeId } = ctx;

  const { data: r } = await supabase
    .from("reservations")
    .select("id, status, store_id")
    .eq("id", reservationId)
    .maybeSingle();

  if (!r || r.store_id !== storeId) return { error: "予約が見つかりません" };
  if (r.status !== "cancelled") return { error: "キャンセル済みの予約のみ復元できます" };

  const { error } = await supabase
    .from("reservations")
    .update({ status: "tentative" })
    .eq("id", reservationId);

  if (error) return { error: `復元に失敗しました: ${error.message}` };
  redirect(`/owner/reservations/${reservationId}`);
}

export async function deleteReservation(
  reservationId: string,
): Promise<{ error?: string }> {
  const ctx = await getOwnerContext();
  if (!ctx) return { error: "権限がありません" };

  const { supabase, storeId } = ctx;

  const { data: r } = await supabase
    .from("reservations")
    .select("id, store_id")
    .eq("id", reservationId)
    .maybeSingle();

  if (!r || r.store_id !== storeId) return { error: "予約が見つかりません" };

  const { error } = await supabase
    .from("reservations")
    .delete()
    .eq("id", reservationId);

  if (error) return { error: `削除に失敗しました: ${error.message}` };
  redirect("/owner/reservations");
}
