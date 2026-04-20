import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

type Status = "tentative" | "confirmed" | "cancelled";

type ReservationRow = {
  id: string;
  status: Status;
  start_at: string;
  customer_name: string;
  payment_method: string;
  transport_fee: number;
  total_amount: number;
  course_snapshot: { name: string; price: number };
  nomination_snapshot: { price: number };
  extension_snapshot: { price: number } | null;
  reservation_options: Array<{
    option_snapshot: { price: number };
    quantity: number;
  }>;
  player: { name: string } | null;
};

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

const STATUS_BADGE: Record<Status, { label: string; className: string }> = {
  tentative: { label: "仮予約", className: "bg-yellow-100 text-yellow-800" },
  confirmed: { label: "確定", className: "bg-green-100 text-green-800" },
  cancelled: { label: "キャンセル", className: "bg-gray-100 text-gray-500" },
};

function calcDisplayTotal(r: ReservationRow): number {
  if (r.status !== "tentative") return r.total_amount;
  return (
    r.course_snapshot.price +
    r.nomination_snapshot.price +
    (r.extension_snapshot?.price ?? 0) +
    r.reservation_options.reduce(
      (s, o) => s + o.option_snapshot.price * o.quantity,
      0,
    ) +
    r.transport_fee
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ----------------------------------------------------------------
// Page
// ----------------------------------------------------------------

export default async function OwnerReservationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const filterStatus = sp.status ?? "all";
  const filterFrom = sp.from ?? "";
  const filterTo = sp.to ?? "";
  const filterPlayer = sp.player ?? "";
  const filterPayment = sp.payment ?? "";

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

  // プレイヤー一覧（フィルタ用）
  const { data: players } = await supabase
    .from("users")
    .select("id, name")
    .eq("store_id", me.store_id)
    .eq("role", "player")
    .eq("is_active", true)
    .order("name");

  // 予約一覧クエリ
  let query = supabase
    .from("reservations")
    .select(
      "id, status, start_at, customer_name, payment_method, transport_fee, total_amount, course_snapshot, nomination_snapshot, extension_snapshot, reservation_options(option_snapshot, quantity), player:users!player_id(name)",
    )
    .eq("store_id", me.store_id)
    .order("start_at", { ascending: false });

  if (filterStatus !== "all") {
    query = query.eq("status", filterStatus);
  }
  if (filterFrom) {
    query = query.gte("start_at", new Date(filterFrom).toISOString());
  }
  if (filterTo) {
    const to = new Date(filterTo);
    to.setHours(23, 59, 59, 999);
    query = query.lte("start_at", to.toISOString());
  }
  if (filterPlayer) {
    query = query.eq("player_id", filterPlayer);
  }
  if (filterPayment) {
    query = query.eq("payment_method", filterPayment);
  }

  const { data: rows } = await query;

  const reservations: ReservationRow[] = (rows ?? []).map((r) => ({
    id: r.id,
    status: r.status as Status,
    start_at: r.start_at,
    customer_name: r.customer_name,
    payment_method: r.payment_method,
    transport_fee: r.transport_fee,
    total_amount: r.total_amount,
    course_snapshot: r.course_snapshot as ReservationRow["course_snapshot"],
    nomination_snapshot: r.nomination_snapshot as ReservationRow["nomination_snapshot"],
    extension_snapshot: r.extension_snapshot as ReservationRow["extension_snapshot"],
    reservation_options: (r.reservation_options ?? []) as ReservationRow["reservation_options"],
    player: Array.isArray(r.player) ? (r.player[0] ?? null) : (r.player as { name: string } | null),
  }));

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <h1 className="text-xl font-semibold">予約一覧</h1>

      {/* フィルタ */}
      <form method="GET" className="rounded-lg border border-border p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* ステータス */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">ステータス</label>
            <select
              name="status"
              defaultValue={filterStatus}
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            >
              <option value="all">全て</option>
              <option value="tentative">仮予約</option>
              <option value="confirmed">確定済</option>
              <option value="cancelled">キャンセル</option>
            </select>
          </div>

          {/* プレイヤー */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">プレイヤー</label>
            <select
              name="player"
              defaultValue={filterPlayer}
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            >
              <option value="">全員</option>
              {(players ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* 支払い方法 */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">支払い</label>
            <select
              name="payment"
              defaultValue={filterPayment}
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            >
              <option value="">全て</option>
              <option value="cash">現金</option>
              <option value="card">カード</option>
            </select>
          </div>

          {/* 検索ボタン */}
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-80"
            >
              絞り込み
            </button>
          </div>
        </div>

        {/* 期間 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">開始日（から）</label>
            <input
              type="date"
              name="from"
              defaultValue={filterFrom}
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">開始日（まで）</label>
            <input
              type="date"
              name="to"
              defaultValue={filterTo}
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            />
          </div>
        </div>
      </form>

      {/* 一覧 */}
      {reservations.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">該当する予約はありません</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
          {reservations.map((r) => {
            const badge = STATUS_BADGE[r.status];
            const total = calcDisplayTotal(r);
            return (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{r.customer_name}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-medium ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {fmtDate(r.start_at)}
                    {r.player?.name ?? "—"}
                    {r.course_snapshot.name}
                  </p>
                </div>
                <div className="shrink-0 text-right space-y-1">
                  <p className="text-sm font-medium">¥{total.toLocaleString()}</p>
                  <Link
                    href={`/owner/reservations/${r.id}`}
                    className="block text-xs text-primary hover:underline"
                  >
                    詳細 →
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
