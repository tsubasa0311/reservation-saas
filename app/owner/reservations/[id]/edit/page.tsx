import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlayerMaster } from "@/lib/pricing/get-player-master";
import { OwnerEditReservationForm } from "./edit-form";

export default async function OwnerEditReservationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("users")
    .select("id, store_id, role")
    .eq("id", user.id)
    .maybeSingle();
  if (!me || !me.store_id || (me.role !== "owner" && me.role !== "super_admin")) redirect("/login");

  const { data: r } = await supabase
    .from("reservations")
    .select(
      "id, status, store_id, player_id, customer_type, customer_name, reservation_channel, meeting_method, start_at, nomination_type, course_id, extension_id, transport_fee, payment_method, reservation_options(option_id, quantity)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!r) notFound();
  if (r.store_id !== me.store_id) notFound();
  if (r.status === "cancelled") redirect(`/owner/reservations/${id}`);

  const admin = createAdminClient();
  const [master, { data: playerUser }] = await Promise.all([
    getPlayerMaster(admin, r.player_id, me.store_id),
    admin.from("users").select("name").eq("id", r.player_id).maybeSingle(),
  ]);

  const initialOptions = new Map(
    (r.reservation_options ?? []).map((o) => [o.option_id, o.quantity] as [string, number]),
  );

  return (
    <main className="mx-auto max-w-lg px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href={`/owner/reservations/${id}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← 詳細へ
        </Link>
        <h1 className="text-lg font-semibold">予約の編集</h1>
      </div>
      <OwnerEditReservationForm
        master={master}
        reservationId={id}
        playerName={playerUser?.name ?? "—"}
        initialValues={{
          customer_type: r.customer_type as "new" | "member",
          customer_name: r.customer_name,
          reservation_channel: r.reservation_channel as "line" | "mail" | "dm" | "phone",
          meeting_method: r.meeting_method as "meetup" | "hotel" | "home" | "dm",
          start_at: r.start_at,
          nomination_type: r.nomination_type as "first" | "repeat",
          course_id: r.course_id ?? "",
          extension_id: r.extension_id ?? "",
          transport_fee: r.transport_fee,
          payment_method: r.payment_method as "cash" | "card",
        }}
        initialOptions={initialOptions}
      />
    </main>
  );
}
