import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function OwnerDashboardPage() {
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
  if (!me || !me.store_id || (me.role !== "owner" && me.role !== "super_admin")) {
    redirect("/login");
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [{ data: confirmed }, { data: tentativeRows }] = await Promise.all([
    supabase
      .from("reservations")
      .select("total_amount, store_amount")
      .eq("store_id", me.store_id)
      .eq("status", "confirmed")
      .gte("start_at", monthStart.toISOString()),
    supabase
      .from("reservations")
      .select("id")
      .eq("store_id", me.store_id)
      .eq("status", "tentative"),
  ]);

  const monthSales = (confirmed ?? []).reduce((s, r) => s + r.total_amount, 0);
  const monthStoreAmount = (confirmed ?? []).reduce((s, r) => s + r.store_amount, 0);
  const monthCount = (confirmed ?? []).length;
  const tentativeCount = (tentativeRows ?? []).length;

  return (
    <main className="mx-auto max-w-lg px-4 py-8 space-y-6">
      <h1 className="text-xl font-semibold">ダッシュボード</h1>

      {/* 仮予約の未確定 */}
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

      {/* 今月サマリ */}
      <div className="rounded-lg border border-border p-4 space-y-3">
        <p className="text-sm font-medium text-muted-foreground">今月（確定済）</p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">売上</p>
            <p className="text-lg font-semibold">¥{monthSales.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">店舗取り分</p>
            <p className="text-lg font-semibold">¥{monthStoreAmount.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">件数</p>
            <p className="text-lg font-semibold">{monthCount} 件</p>
          </div>
        </div>
      </div>

      {/* ナビ */}
      <nav className="space-y-2">
        {[
          { href: "/owner/reservations", label: "予約一覧" },
          { href: "/owner/courses", label: "コース管理" },
          { href: "/owner/nomination", label: "指名料設定" },
          { href: "/owner/extensions", label: "延長料金管理" },
          { href: "/owner/options", label: "オプション管理" },
        ].map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm hover:bg-muted/40"
          >
            <span>{label}</span>
            <span className="text-muted-foreground">→</span>
          </Link>
        ))}
      </nav>
    </main>
  );
}
