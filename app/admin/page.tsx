import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function SuperAdminDashboardPage() {
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
  if (!me || me.role !== "super_admin") redirect("/login");

  const admin = createAdminClient();

  const [
    { data: stores },
    { data: activePlayers },
    { data: thisMonthReservations },
  ] = await Promise.all([
    admin.from("stores").select("id, name, store_code, is_active, created_at"),
    admin.from("users").select("id, store_id").eq("role", "player").eq("is_active", true),
    admin
      .from("reservations")
      .select("store_id, total_amount, status")
      .eq("status", "confirmed")
      .gte(
        "start_at",
        new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
      ),
  ]);

  const storeCount = (stores ?? []).length;
  const activePlayerCount = (activePlayers ?? []).length;
  const thisMonthCount = (thisMonthReservations ?? []).length;
  const thisMonthSales = (thisMonthReservations ?? []).reduce(
    (s, r) => s + r.total_amount,
    0,
  );

  // 店舗別集計
  const storeList = stores ?? [];
  const storeStats = storeList.map((store) => {
    const storeReservations = (thisMonthReservations ?? []).filter(
      (r) => r.store_id === store.id,
    );
    const storePlayers = (activePlayers ?? []).filter(
      (p) => p.store_id === store.id,
    );
    return {
      ...store,
      monthCount: storeReservations.length,
      monthSales: storeReservations.reduce((s, r) => s + r.total_amount, 0),
      playerCount: storePlayers.length,
    };
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">スーパー管理者ダッシュボード</h1>
        <Link
          href="/admin/stores"
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-80"
        >
          店舗管理
        </Link>
      </div>

      {/* サマリ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "登録店舗数", value: `${storeCount} 店舗` },
          { label: "アクティブプレイヤー", value: `${activePlayerCount} 名` },
          { label: "今月予約数（確定）", value: `${thisMonthCount} 件` },
          { label: "今月売上合計", value: `¥${thisMonthSales.toLocaleString()}` },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-lg border border-border p-4 space-y-1 text-center"
          >
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-semibold">{value}</p>
          </div>
        ))}
      </div>

      {/* 店舗別サマリ */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="bg-muted/50 px-4 py-2 text-sm font-medium">店舗別サマリ（今月確定済）</div>
        {storeStats.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">店舗がありません</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-4 py-2 text-left font-medium">店舗名</th>
                <th className="px-4 py-2 text-center font-medium">状態</th>
                <th className="px-4 py-2 text-right font-medium">PL数</th>
                <th className="px-4 py-2 text-right font-medium">予約数</th>
                <th className="px-4 py-2 text-right font-medium">売上</th>
                <th className="px-4 py-2 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {storeStats.map((s) => (
                <tr key={s.id} className="hover:bg-muted/20">
                  <td className="px-4 py-2">
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.store_code}</p>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                        s.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {s.is_active ? "稼働中" : "凍結"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">{s.playerCount}</td>
                  <td className="px-4 py-2 text-right">{s.monthCount}</td>
                  <td className="px-4 py-2 text-right">¥{s.monthSales.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/admin/stores/${s.id}`}
                      className="text-xs text-primary hover:underline"
                    >
                      詳細 →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </main>
  );
}
