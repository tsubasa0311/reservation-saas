import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPlayerMaster } from "@/lib/pricing/get-player-master";
import { NewReservationForm } from "./new-reservation-form";

export default async function NewReservationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("users")
    .select("id, store_id, role, name, back_rate_transport")
    .eq("id", user.id)
    .maybeSingle();

  if (!me || me.role !== "player" || !me.store_id) redirect("/login");

  const master = await getPlayerMaster(supabase, me.id, me.store_id);

  return (
    <main className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-lg">
        <header className="mb-6">
          <h1 className="text-xl font-semibold">新規予約入力</h1>
          <p className="text-sm text-muted-foreground">{me.name}</p>
        </header>
        <NewReservationForm
          master={master}
          playerId={me.id}
          backRateTransport={me.back_rate_transport ?? 0}
        />
      </div>
    </main>
  );
}
