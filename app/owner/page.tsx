import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardChart } from "./dashboard-chart";
import { logout } from "@/lib/auth/logout";

// ----------------------------------------------------------------
// 期間計算
// ----------------------------------------------------------------

type Period = "today" | "week" | "month" | "last_month" | "custom";

function calcRange(
  period: Period,
  customFrom: string,
  customTo: string,
): { from: Date; to: Date } {
  const now = new Date();

  if (period === "today") {
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    const to = new Date(now);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }

  if (period === "week") {
    const from = new Date(now);
    const day = from.getDay();
    const diff = day === 0 ? -6 : 1 - day; // 月曜始まり
    from.setDate(from.getDate() + diff);
    from.setHours(0, 0, 0, 0);
    const to = new Date(now);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }

  if (period === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }

  if (period === "last_month") {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }

  // custom
  const from = customFrom ? new Date(customFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
  const to = customTo ? new Date(customTo) : new Date(now);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

const PERIOD_LABELS: Record<Period, string> = {
  today: "今日",
  week: "今週",
  month: "今月",
  last_month: "先月",
  custom: "カスタム",
};

// ----------------------------------------------------------------
// Page
// ----------------------------------------------------------------

export default async function OwnerDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const period = (sp.period ?? "month") as Period;
  const customFrom = sp.from ?? "";
  const customTo = sp.to ?? "";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("users").select("id, store_id, role").eq("id", user.id).maybeSingle();
  if (!me || !me.store_id || (me.role !== "owner" && me.role !== "super_admin")) redirect("/login");

  const { from, to } = calcRange(period, customFrom, customTo);

  const [{ data: confirmed }, { data: tentativeRows }, { data: players }] = await Promise.all([
    supabase
      .from("reservations")
      .select("player_id, total_amount, player_back_amount, store_amount")
      .eq("store_id", me.store_id)
      .eq("status", "confirmed")
      .gte("start_at", from.toISOString())
      .lte("start_at", to.toISOString()),
    supabase
      .from("reservations").select("id").eq("store_id", me.store_id).eq("status", "tentative"),
    supabase
      .from("users").select("id, name").eq("store_id", me.store_id).eq("role", "player").eq("is_active", true),
  ]);

  const rows = confirmed ?? [];
  const totalSales = rows.reduce((s, r) => s + r.total_amount, 0);
  const totalBack = rows.reduce((s, r) => s + r.player_back_amount, 0);
  const totalStore = rows.reduce((s, r) => s + r.store_amount, 0);
  const totalCount = rows.length;
  const tentativeCount = (tentativeRows ?? []).length;

  // プレイヤー別集計
  const playerMap = Object.fromEntries((players ?? []).map((p) => [p.id, p.name]));
  const playerSalesMap: Record<string, { sales: number; back: number }> = {};
  for (const r of rows) {
    if (!playerSalesMap[r.player_id]) playerSalesMap[r.player_id] = { sales: 0, back: 0 };
    playerSalesMap[r.player_id].sales += r.total_amount;
    playerSalesMap[r.player_id].back += r.player_back_amount;
  }
  const chartData = Object.entries(playerSalesMap)
    .map(([pid, v]) => ({ name: playerMap[pid] ?? "—", ...v }))
    .sort((a, b) => b.sales - a.sales);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">ダッシュボード</h1>
        <form action={logout}>
          <button type="submit" className="text-sm text-muted-foreground hover:underline">
            ログアウト
          </button>
        </form>
      </div>

      {/* 未確定バナー */}
      {tentativeCount > 0 && (
        <Link
          href="/owner/reservations?status=tentative"
          className="flex items-center justify-between rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 hover:opacity-80"
        >
          <span className="text-sm font-medium text-yellow-800">
            未確定の仮予約が {tentativeCount} 件あります
          </span>
          <span className="text-xs text-yellow-700">確認する →</span>
        </Link>
      )}

      {/* 期間セレクタ */}
      <form method="GET" className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              type="submit"
              name="period"
              value={p}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                period === p
                  ? "bg-primary text-primary-foreground"
                  : "border border-border hover:bg-muted/40"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        {period === "custom" && (
          <div className="flex flex-wrap gap-2 items-center">
            <input type="hidden" name="period" value="custom" />
            <input type="date" name="from" defaultValue={customFrom}
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
            <span className="text-sm text-muted-foreground">〜</span>
            <input type="date" name="to" defaultValue={customTo}
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
            <button type="submit"
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-80">
              適用
            </button>
          </div>
        )}
      </form>

      {/* サマリ */}
      <div className="rounded-lg border border-border p-4 space-y-3">
        <p className="text-sm font-medium text-muted-foreground">
          {PERIOD_LABELS[period]}の集計（確定済）
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-center">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">売上</p>
            <p className="text-lg font-semibold">¥{totalSales.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">バック総額</p>
            <p className="text-lg font-semibold">¥{totalBack.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">店舗取り分</p>
            <p className="text-lg font-semibold">¥{totalStore.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">件数</p>
            <p className="text-lg font-semibold">{totalCount} 件</p>
          </div>
        </div>
      </div>

      {/* プレイヤー別グラフ */}
      {chartData.length > 0 && (
        <div className="rounded-lg border border-border p-4 space-y-3">
          <p className="text-sm font-medium">プレイヤー別売上</p>
          <DashboardChart data={chartData} />
        </div>
      )}

      {/* 売上明細CSV */}
      <div className="flex justify-end">
        <a
          href={`/api/owner/sales/export?from=${from.toISOString().slice(0, 10)}&to=${to.toISOString().slice(0, 10)}`}
          className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted/40 transition-colors"
        >
          売上明細CSV出力
        </a>
      </div>

      {/* プレイヤー別テーブル */}
      {chartData.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left font-medium">プレイヤー</th>
                <th className="px-4 py-2 text-right font-medium">売上</th>
                <th className="px-4 py-2 text-right font-medium">バック</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {chartData.map((d) => (
                <tr key={d.name}>
                  <td className="px-4 py-2">{d.name}</td>
                  <td className="px-4 py-2 text-right">¥{d.sales.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right text-muted-foreground">¥{d.back.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ナビ */}
      <nav className="space-y-2">
        {[
          { href: "/owner/reservations", label: "予約一覧" },
          { href: "/owner/courses", label: "コース管理" },
          { href: "/owner/nomination", label: "指名料設定" },
          { href: "/owner/extensions", label: "延長料金管理" },
          { href: "/owner/options", label: "オプション管理" },
          { href: "/owner/players", label: "プレイヤー管理" },
        ].map(({ href, label }) => (
          <Link key={href} href={href}
            className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm hover:bg-muted/40">
            <span>{label}</span>
            <span className="text-muted-foreground">→</span>
          </Link>
        ))}
      </nav>
    </main>
  );
}
