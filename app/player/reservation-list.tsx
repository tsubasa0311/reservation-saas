"use client";

import { useState } from "react";
import Link from "next/link";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export type ReservationRow = {
  id: string;
  status: "tentative" | "confirmed" | "cancelled";
  customer_name: string;
  start_at: string;
  course_snapshot: { name: string; price: number; back_rate: number; duration_min: number };
  nomination_snapshot: { type: string; price: number; back_rate: number };
  extension_snapshot: { name: string; price: number; back_rate: number; duration_min: number } | null;
  transport_fee: number;
  total_amount: number;
  player_back_amount: number;
  reservation_options: Array<{
    option_snapshot: { name: string; price: number; back_rate: number };
    quantity: number;
  }>;
};

type Tab = "tentative" | "confirmed" | "cancelled" | "all";

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

const TABS: { value: Tab; label: string }[] = [
  { value: "tentative", label: "仮予約" },
  { value: "confirmed", label: "確定済" },
  { value: "cancelled", label: "キャンセル" },
  { value: "all", label: "全て" },
];

const STATUS_BADGE: Record<
  string,
  { label: string; className: string }
> = {
  tentative: { label: "仮予約", className: "bg-yellow-100 text-yellow-800" },
  confirmed: { label: "確定", className: "bg-green-100 text-green-800" },
  cancelled: { label: "キャンセル", className: "bg-gray-100 text-gray-500" },
};

function calcDisplayTotal(r: ReservationRow): number {
  // confirmed/cancelled は total_amount が確定値
  if (r.status !== "tentative") return r.total_amount;
  // tentative はスナップショットから推計
  const course = r.course_snapshot.price;
  const nom = r.nomination_snapshot.price;
  const ext = r.extension_snapshot?.price ?? 0;
  const opts = r.reservation_options.reduce(
    (s, o) => s + o.option_snapshot.price * o.quantity,
    0,
  );
  return course + nom + ext + opts + r.transport_fee;
}

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------

export function ReservationList({
  playerName,
  monthSales,
  monthBack,
  reservations,
}: {
  playerName: string;
  monthSales: number;
  monthBack: number;
  reservations: ReservationRow[];
}) {
  const [tab, setTab] = useState<Tab>("tentative");

  const filtered =
    tab === "all" ? reservations : reservations.filter((r) => r.status === tab);

  return (
    <main className="min-h-screen pb-24">
      {/* 月次サマリ */}
      <div className="border-b border-border bg-muted/50 px-4 py-4 space-y-1">
        <p className="text-sm font-medium">{playerName}</p>
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-muted-foreground">今月売上</span>
            <span className="ml-2 font-semibold">
              ¥{monthSales.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">バック</span>
            <span className="ml-2 font-semibold">
              ¥{monthBack.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* タブ */}
      <div className="flex border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tab === t.value
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* リスト */}
      {filtered.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          予約はありません
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {filtered.map((r) => (
            <li key={r.id}>
              <Link
                href={`/player/reservations/${r.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {r.customer_name}
                    </span>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_BADGE[r.status].className}`}
                    >
                      {STATUS_BADGE[r.status].label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.start_at).toLocaleString("ja-JP", {
                      month: "numeric",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    　{r.course_snapshot.name}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-medium">
                  ¥{calcDisplayTotal(r).toLocaleString()}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* FAB */}
      <Link
        href="/player/new"
        aria-label="新規予約を作成"
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg text-2xl hover:opacity-90 transition-opacity"
      >
        ＋
      </Link>
    </main>
  );
}
