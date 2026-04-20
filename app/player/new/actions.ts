"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getPlayerMaster } from "@/lib/pricing/get-player-master";

export type CreateReservationInput = {
  customer_type: "new" | "member";
  customer_name: string;
  reservation_channel: "line" | "mail" | "dm" | "phone";
  meeting_method: "meetup" | "hotel" | "home" | "dm";
  start_at: string; // ISO 8601（クライアント側で変換済み）
  nomination_type: "first" | "repeat";
  course_id: string;
  extension_id: string | null;
  transport_fee: number;
  payment_method: "cash" | "card";
  options: Array<{ option_id: string; quantity: number }>;
  playerId: string;
};

export type CreateReservationResult =
  | { success: true; reservationId: string }
  | { success: false; error: string };

const inputSchema = z.object({
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
  playerId: z.string().uuid(),
});

export async function createReservation(
  input: CreateReservationInput,
): Promise<CreateReservationResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "入力値が不正です" };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "認証が必要です" };

  const { data: me } = await supabase
    .from("users")
    .select("id, store_id, role, back_rate_transport")
    .eq("id", user.id)
    .maybeSingle();
  if (!me || me.role !== "player" || !me.store_id) {
    return { success: false, error: "権限がありません" };
  }
  if (me.id !== data.playerId) {
    return { success: false, error: "権限がありません" };
  }

  // サーバー側で料金を再解決（クライアントからの改ざん防止）
  const master = await getPlayerMaster(supabase, me.id, me.store_id);

  const course = master.courses.find((c) => c.id === data.course_id);
  if (!course) return { success: false, error: "コースが見つかりません" };

  const nomination = master.nominationFees.find(
    (n) => n.type === data.nomination_type,
  );
  if (!nomination) return { success: false, error: "指名料が設定されていません" };

  let extension: (typeof master.extensions)[number] | null = null;
  if (data.extension_id) {
    extension = master.extensions.find((e) => e.id === data.extension_id) ?? null;
    if (!extension) return { success: false, error: "延長が見つかりません" };
  }

  const optionsResolved: Array<{
    opt: (typeof master.options)[number];
    quantity: number;
  }> = [];
  for (const o of data.options) {
    const opt = master.options.find((m) => m.id === o.option_id);
    if (!opt) return { success: false, error: "オプションが見つかりません" };
    optionsResolved.push({ opt, quantity: o.quantity });
  }

  // Step 4-5: 終了時刻自動算出
  const startAt = new Date(data.start_at);
  const totalDurationMin = course.duration_min + (extension?.duration_min ?? 0);
  const endAt = new Date(startAt.getTime() + totalDurationMin * 60 * 1000);

  // スナップショット
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

  // 予約INSERT
  const { data: reservation, error: insertErr } = await supabase
    .from("reservations")
    .insert({
      store_id: me.store_id,
      player_id: me.id,
      status: "tentative",
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
      transport_back_rate: me.back_rate_transport ?? 0,
    })
    .select("id")
    .single();

  if (insertErr || !reservation) {
    return {
      success: false,
      error: `予約作成に失敗しました${insertErr ? `: ${insertErr.message}` : ""}`,
    };
  }

  // オプションINSERT（補償トランザクション方式）
  if (optionsResolved.length > 0) {
    const { error: optErr } = await supabase.from("reservation_options").insert(
      optionsResolved.map(({ opt, quantity }) => ({
        reservation_id: reservation.id,
        option_id: opt.id,
        option_snapshot: {
          name: opt.name,
          price: opt.price,
          back_rate: opt.back_rate,
        },
        quantity,
      })),
    );
    if (optErr) {
      // 予約本体を削除して整合性を保つ
      await supabase.from("reservations").delete().eq("id", reservation.id);
      return {
        success: false,
        error: `オプション保存に失敗しました: ${optErr.message}`,
      };
    }
  }

  return { success: true, reservationId: reservation.id };
}
