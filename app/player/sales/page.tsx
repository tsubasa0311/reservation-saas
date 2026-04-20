import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function PlayerSalesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();
  if (!me || me.role !== "player") redirect("/login");

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { data: confirmed } = await supabase
    .from("reservations")
    .select("total_amount, player_back_amount")
    .eq("player_id", me.id)
    .eq("status", "confirmed")
    .gte("start_at", monthStart.toISOString());

  const rows = confirmed ?? [];
  const monthSales = rows.reduce((s, r) => s + r.total_amount, 0);
  const monthBack = rows.reduce((s, r) => s + r.player_back_amount, 0);
  const monthCount = rows.length;

  return (
    <main className="mx-auto max-w-lg px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">売上</h1>
        <Link href="/player" className="text-sm text-muted-foreground hover:underline">
          ← 予約一覧
        </Link>
      </div>

      {/* 今月サマリ */}
      <div className="rounded-lg border border-border p-4 space-y-3">
        <p className="text-sm font-medium text-muted-foreground">今月（確定済）</p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">売上</p>
            <p className="text-lg font-semibold">¥{monthSales.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">バック</p>
            <p className="text-lg font-semibold">¥{monthBack.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">件数</p>
            <p className="text-lg font-semibold">{monthCount} 件</p>
          </div>
        </div>
      </div>
    </main>
  );
}
