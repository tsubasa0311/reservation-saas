"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlayerMaster } from "@/lib/pricing/get-player-master";

const inputSchema = z.object({
  reservationId: z.string().uuid(),
  customer_type: z.enum(["new", "member"]),
  customer_name: z.string().trim().min(1).max(100),
  reservation_channel: z.enum(["line", "mail", "dm", "phone"]),
  meeting_method: z.enum(["meetup", "hotel", "home", "dm"]),
  start_at: z.string().refine((v) => !isNaN(Date.parse(v)), "不正な日時"),
  nomination_type: z.enum(["first", "repeat"]),
  course_id: z.string().uuid(),
  extension_id: z.string().uuid().nullable(),
  transport_fee: z.coerce.number().int().min(0).max(1_000_000),
  payment_method: z.enum(["cash", "card"]),
  options: z.array(
    z.object({
      option_id: z.string().uuid(),
      quantity: z.number().int().min(1).max(99),
    }),
  ),
});

export type OwnerUpdateReservationInput = z.input<typeof inputSchema>;
export type OwnerUpdateReservationResult =
  | { success: true }
  | { success: false; error: string };

export async function ownerUpdateReservation(
  input: OwnerUpdateReservationInput,
): Promise<OwnerUpdateReservationResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "入力値が不正です" };
  const data = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "権限がありません" };

  const { data: me } = await supabase
    .from("users")
    .select("id, store_id, role")
    .eq("id", user.id)
    .maybeSingle();
  if (!me || !me.store_id || (me.role !== "owner" && me.role !== "super_admin")) {
    return { success: false, error: "権限がありません" };
  }

  const { data: r } = await supabase
    .from("reservations")
    .select("id, status, store_id, player_id, transport_back_rate")
    .eq("id", data.reservationId)
    .maybeSingle();
  if (!r || r.store_id !== me.store_id) return { success: false, error: "予約が見つかりません" };
  if (r.status === "cancelled") return { success: false, error: "キャンセル済みの予約は編集できません" };

  // 管理クライアントでプレイヤーマスタを解決（RLSをバイパス）
  const admin = createAdminClient();
  const master = await getPlayerMaster(admin, r.player_id, me.store_id);

  const course = master.courses.find((c) => c.id === data.course_id);
  if (!course) return { success: false, error: "コースが見つかりません" };

  const nomination = master.nominationFees.find((n) => n.type === data.nomination_type);
  if (!nomination) return { success: false, error: "指名料が設定されていません" };

  let extension: (typeof master.extensions)[number] | null = null;
  if (data.extension_id) {
    extension = master.extensions.find((e) => e.id === data.extension_id) ?? null;
    if (!extension) return { success: false, error: "延長が見つかりません" };
  }

  const optionsResolved: Array<{ opt: (typeof master.options)[number]; quantity: number }> = [];
  for (const o of data.options) {
    const opt = master.options.find((m) => m.id === o.option_id);
    if (!opt) return { success: false, error: "オプションが見つかりません" };
    optionsResolved.push({ opt, quantity: o.quantity });
  }

  const startAt = new Date(data.start_at);
  const totalDurationMin = course.duration_min + (extension?.duration_min ?? 0);
  const endAt = new Date(startAt.getTime() + totalDurationMin * 60 * 1000);

  const courseSnapshot = {
    name: course.name,
    duration_min: course.duration_min,
    price: course.price,
    back_rate: course.back_rate,
  };
  const nominationSnapshot = {
    type: nomination.type,
    price: nomination.price,
    back_rate: nomination.back_rate,
  };
  const extensionSnapshot = extension
    ? {
        name: extension.name,
        duration_min: extension.duration_min,
        price: extension.price,
        back_rate: extension.back_rate,
      }
    : null;

  const baseUpdate = {
    customer_type: data.customer_type,
    customer_name: data.customer_name,
    reservation_channel: data.reservation_channel,
    meeting_method: data.meeting_method,
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
    nomination_type: data.nomination_type,
    payment_method: data.payment_method,
    course_id: course.id,
    course_snapshot: courseSnapshot,
    nomination_snapshot: nominationSnapshot,
    extension_id: extension?.id ?? null,
    extension_snapshot: extensionSnapshot,
    transport_fee: data.transport_fee,
  };

  let updateErr;
  // 確定済みの場合は合計・バックを再計算して更新
  if (r.status === "confirmed") {
    const transportBackRate = r.transport_back_rate ?? 0;
    const courseBack = Math.floor((course.price * course.back_rate) / 100);
    const nomBack = Math.floor((nomination.price * nomination.back_rate) / 100);
    const extBack = extension ? Math.floor((extension.price * extension.back_rate) / 100) : 0;
    const optSubtotal = optionsResolved.reduce((s, { opt, quantity }) => s + opt.price * quantity, 0);
    const optBack = optionsResolved.reduce(
      (s, { opt, quantity }) => s + Math.floor((opt.price * quantity * opt.back_rate) / 100),
      0,
    );
    const transportBack = Math.floor((data.transport_fee * transportBackRate) / 100);
    const totalAmount = course.price + nomination.price + (extension?.price ?? 0) + optSubtotal + data.transport_fee;
    const playerBackAmount = courseBack + nomBack + extBack + optBack + transportBack;
    ({ error: updateErr } = await supabase
      .from("reservations")
      .update({ ...baseUpdate, total_amount: totalAmount, player_back_amount: playerBackAmount, store_amount: totalAmount - playerBackAmount })
      .eq("id", data.reservationId));
  } else {
    ({ error: updateErr } = await supabase
      .from("reservations")
      .update(baseUpdate)
      .eq("id", data.reservationId));
  }

  if (updateErr) return { success: false, error: `更新に失敗しました: ${updateErr.message}` };

  await supabase
    .from("reservation_options")
    .delete()
    .eq("reservation_id", data.reservationId);

  if (optionsResolved.length > 0) {
    const { error: optErr } = await supabase.from("reservation_options").insert(
      optionsResolved.map(({ opt, quantity }) => ({
        reservation_id: data.reservationId,
        option_id: opt.id,
        option_snapshot: { name: opt.name, price: opt.price, back_rate: opt.back_rate },
        quantity,
      })),
    );
    if (optErr) return { success: false, error: `オプション保存に失敗しました: ${optErr.message}` };
  }

  revalidatePath("/owner/reservations");
  revalidatePath(`/owner/reservations/${data.reservationId}`);
  redirect(`/owner/reservations/${data.reservationId}`);
}
