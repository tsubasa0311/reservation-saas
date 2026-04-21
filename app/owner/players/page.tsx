import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function OwnerPlayersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("users").select("store_id, role").eq("id", user.id).maybeSingle();
  if (!me?.store_id || (me.role !== "owner" && me.role !== "super_admin")) redirect("/login");

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [{ data: players }, { data: sales }] = await Promise.all([
    supabase
      .from("users")
      .select("id, name, login_id, is_active")
      .eq("store_id", me.store_id)
      .eq("role", "player")
      .order("name"),
    supabase
      .from("reservations")
      .select("player_id, total_amount")
      .eq("store_id", me.store_id)
      .eq("status", "confirmed")
      .gte("start_at", monthStart.toISOString()),
  ]);

  const salesByPlayer = (sales ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.player_id] = (acc[r.player_id] ?? 0) + r.total_amount;
    return acc;
  }, {});

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">プレイヤー管理</h1>
        <Link href="/owner" className="text-sm text-muted-foreground hover:underline">← ダッシュボード</Link>
      </div>

      <Link
        href="/owner/players/new"
        className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-80"
      >
        ＋ プレイヤーを追加
      </Link>

      {(players ?? []).length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">プレイヤーがいません</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
          {(players ?? []).map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{p.name}</span>
                  {!p.is_active && (
                    <span className="rounded px-1.5 py-0.5 text-xs bg-gray-100 text-gray-500">無効</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  ID: {p.login_id}　今月売上: ¥{(salesByPlayer[p.id] ?? 0).toLocaleString()}
                </p>
              </div>
              <Link
                href={`/owner/players/${p.id}`}
                className="shrink-0 text-xs text-primary hover:underline"
              >
                編集
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
