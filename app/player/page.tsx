import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReservationList, type ReservationRow } from "./reservation-list";

export default async function PlayerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("users")
    .select("id, name, store_id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!me || me.role !== "player" || !me.store_id) redirect("/login");

  const { data: rows } = await supabase
    .from("reservations")
    .select(
      "id, status, customer_name, start_at, course_snapshot, nomination_snapshot, extension_snapshot, transport_fee, total_amount, player_back_amount, reservation_options(option_snapshot, quantity)",
    )
    .eq("player_id", me.id)
    .order("start_at", { ascending: false });

  const reservations: ReservationRow[] = (rows ?? []).map((r) => ({
    id: r.id,
    status: r.status as ReservationRow["status"],
    customer_name: r.customer_name,
    start_at: r.start_at,
    course_snapshot: r.course_snapshot as ReservationRow["course_snapshot"],
    nomination_snapshot: r.nomination_snapshot as ReservationRow["nomination_snapshot"],
    extension_snapshot: r.extension_snapshot as ReservationRow["extension_snapshot"],
    transport_fee: r.transport_fee,
    total_amount: r.total_amount,
    player_back_amount: r.player_back_amount,
    reservation_options: (r.reservation_options as ReservationRow["reservation_options"]) ?? [],
  }));

  // 今月確定予約の集計
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const thisMonthConfirmed = reservations.filter(
    (r) => r.status === "confirmed" && new Date(r.start_at) >= monthStart,
  );
  const monthSales = thisMonthConfirmed.reduce((s, r) => s + r.total_amount, 0);
  const monthBack = thisMonthConfirmed.reduce((s, r) => s + r.player_back_amount, 0);

  return (
    <ReservationList
      playerName={me.name}
      monthSales={monthSales}
      monthBack={monthBack}
      reservations={reservations}
    />
  );
}
