"use server";

import { createClient } from "@/lib/supabase/server";

export async function cancelReservation(reservationId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const { data: me } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();
  if (!me || me.role !== "player") return { error: "権限がありません" };

  // 自分の仮予約であることを確認
  const { data: reservation } = await supabase
    .from("reservations")
    .select("id, status, player_id")
    .eq("id", reservationId)
    .maybeSingle();

  if (!reservation) return { error: "予約が見つかりません" };
  if (reservation.player_id !== me.id) return { error: "権限がありません" };
  if (reservation.status !== "tentative") return { error: "仮予約のみ取り消しできます" };

  const { error } = await supabase
    .from("reservations")
    .update({ status: "cancelled" })
    .eq("id", reservationId);

  if (error) return { error: `取り消しに失敗しました: ${error.message}` };

  return {};
}
