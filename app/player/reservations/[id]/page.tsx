import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CancelButton } from "./cancel-button";

type Snapshot = Record<string, unknown>;

type OptionRow = {
  option_snapshot: { name: string; price: number; back_rate: number };
  quantity: number;
};

const CUSTOMER_TYPE_LABEL: Record<string, string> = {
  new: "新規",
  member: "会員",
};
const CHANNEL_LABEL: Record<string, string> = {
  line: "LINE",
  mail: "メール",
  dm: "DM",
  phone: "電話",
};
const MEETING_LABEL: Record<string, string> = {
  meetup: "待ち合わせ",
  hotel: "ホテル先入り",
  home: "自宅",
  dm: "DMにて",
};
const NOMINATION_LABEL: Record<string, string> = {
  first: "初指名",
  repeat: "本指名",
};
const PAYMENT_LABEL: Record<string, string> = {
  cash: "現金",
  card: "クレジットカード",
};
const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  tentative: { label: "仮予約", className: "bg-yellow-100 text-yellow-800" },
  confirmed: { label: "確定", className: "bg-green-100 text-green-800" },
  cancelled: { label: "キャンセル", className: "bg-gray-100 text-gray-500" },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm border-b border-border last:border-0">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

export default async function ReservationDetailPage({
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
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();
  if (!me || me.role !== "player") redirect("/login");

  const { data: r } = await supabase
    .from("reservations")
    .select(
      "id, status, customer_type, customer_name, reservation_channel, meeting_method, start_at, end_at, nomination_type, payment_method, course_snapshot, nomination_snapshot, extension_snapshot, transport_fee, total_amount, player_back_amount, created_at, reservation_options(option_snapshot, quantity)",
    )
    .eq("id", id)
    .eq("player_id", me.id)
    .maybeSingle();

  if (!r) notFound();

  const course = r.course_snapshot as Snapshot & { name: string; price: number; duration_min: number };
  const nomination = r.nomination_snapshot as Snapshot & { price: number };
  const extension = r.extension_snapshot as (Snapshot & { name: string; price: number; duration_min: number }) | null;
  const options = (r.reservation_options ?? []) as OptionRow[];

  const isTentative = r.status === "tentative";

  // 仮予約の合計は推計、確定後は total_amount
  const displayTotal = isTentative
    ? course.price +
      nomination.price +
      (extension?.price ?? 0) +
      options.reduce((s, o) => s + o.option_snapshot.price * o.quantity, 0) +
      r.transport_fee
    : r.total_amount;
  const displayBack = isTentative ? null : r.player_back_amount;

  const badge = STATUS_BADGE[r.status];

  return (
    <main className="mx-auto max-w-lg px-4 py-8 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <Link href="/player" className="text-sm text-muted-foreground hover:underline">
          ← 一覧へ
        </Link>
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      {/* 基本情報 */}
      <div className="rounded-lg border border-border p-4 space-y-0">
        <Row label="顧客区分" value={CUSTOMER_TYPE_LABEL[r.customer_type] ?? r.customer_type} />
        <Row label="顧客名" value={r.customer_name} />
        <Row label="予約方法" value={CHANNEL_LABEL[r.reservation_channel] ?? r.reservation_channel} />
        <Row label="合流方法" value={MEETING_LABEL[r.meeting_method] ?? r.meeting_method} />
        <Row label="開始日時" value={fmtDate(r.start_at)} />
        <Row label="終了日時" value={fmtDate(r.end_at)} />
        <Row label="指名種別" value={NOMINATION_LABEL[r.nomination_type] ?? r.nomination_type} />
        <Row label="支払い方法" value={PAYMENT_LABEL[r.payment_method] ?? r.payment_method} />
      </div>

      {/* 料金内訳 */}
      <div className="rounded-lg border border-border p-4 space-y-0">
        <Row
          label={`コース：${course.name}（${course.duration_min}分）`}
          value={`¥${course.price.toLocaleString()}`}
        />
        <Row
          label={`指名料：${NOMINATION_LABEL[r.nomination_type] ?? r.nomination_type}`}
          value={`¥${nomination.price.toLocaleString()}`}
        />
        {extension && (
          <Row
            label={`延長：${extension.name}（${extension.duration_min}分）`}
            value={`¥${extension.price.toLocaleString()}`}
          />
        )}
        {options.map((o, i) => (
          <Row
            key={i}
            label={`${o.option_snapshot.name} × ${o.quantity}`}
            value={`¥${(o.option_snapshot.price * o.quantity).toLocaleString()}`}
          />
        ))}
        {r.transport_fee > 0 && (
          <Row label="交通費" value={`¥${r.transport_fee.toLocaleString()}`} />
        )}
        <div className="flex justify-between py-2 text-sm font-semibold">
          <span>合計{isTentative ? "（推計）" : ""}</span>
          <span>¥{displayTotal.toLocaleString()}</span>
        </div>
        {displayBack !== null && (
          <Row label="バック額" value={`¥${displayBack.toLocaleString()}`} />
        )}
      </div>

      {/* アクション（仮予約のみ） */}
      {isTentative && (
        <div className="flex gap-3">
          <Link
            href={`/player/reservations/${r.id}/edit`}
            className="flex-1 rounded-lg border border-border py-2 text-center text-sm font-medium hover:bg-muted/40 transition-colors"
          >
            編集
          </Link>
          <CancelButton reservationId={r.id} />
        </div>
      )}
    </main>
  );
}
