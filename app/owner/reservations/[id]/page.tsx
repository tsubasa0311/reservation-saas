import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ActionButtons } from "./action-buttons";

// ----------------------------------------------------------------
// Types & helpers
// ----------------------------------------------------------------

type Status = "tentative" | "confirmed" | "cancelled";

const STATUS_BADGE: Record<Status, { label: string; className: string }> = {
  tentative: { label: "仮予約", className: "bg-yellow-100 text-yellow-800" },
  confirmed: { label: "確定", className: "bg-green-100 text-green-800" },
  cancelled: { label: "キャンセル", className: "bg-gray-100 text-gray-500" },
};

const LABEL: Record<string, Record<string, string>> = {
  customer_type: { new: "新規", member: "会員" },
  reservation_channel: { line: "LINE", mail: "メール", dm: "DM", phone: "電話" },
  meeting_method: { meetup: "待ち合わせ", hotel: "ホテル先入り", home: "自宅", dm: "DMにて" },
  nomination_type: { first: "初指名", repeat: "本指名" },
  payment_method: { cash: "現金", card: "クレジットカード" },
};

function l(group: string, val: string) {
  return LABEL[group]?.[val] ?? val;
}

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
    <div className="flex justify-between gap-4 border-b border-border py-2 text-sm last:border-0">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

// ----------------------------------------------------------------
// Page
// ----------------------------------------------------------------

export default async function OwnerReservationDetailPage({
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
  if (!me || !me.store_id || (me.role !== "owner" && me.role !== "super_admin")) {
    redirect("/login");
  }

  const { data: r } = await supabase
    .from("reservations")
    .select(
      "id, status, customer_type, customer_name, reservation_channel, meeting_method, start_at, end_at, nomination_type, payment_method, course_snapshot, nomination_snapshot, extension_snapshot, transport_fee, transport_back_rate, total_amount, player_back_amount, store_amount, created_at, updated_at, reservation_options(option_snapshot, quantity), player:users!player_id(name)",
    )
    .eq("id", id)
    .eq("store_id", me.store_id)
    .maybeSingle();

  if (!r) notFound();

  type Snap = Record<string, unknown>;
  const course = r.course_snapshot as Snap & { name: string; price: number; back_rate: number; duration_min: number };
  const nomination = r.nomination_snapshot as Snap & { type: string; price: number; back_rate: number };
  const extension = r.extension_snapshot as (Snap & { name: string; price: number; back_rate: number; duration_min: number }) | null;
  const options = (r.reservation_options ?? []) as Array<{
    option_snapshot: { name: string; price: number; back_rate: number };
    quantity: number;
  }>;
  const playerName = Array.isArray(r.player)
    ? (r.player[0] as { name: string } | undefined)?.name ?? "—"
    : (r.player as { name: string } | null)?.name ?? "—";

  const status = r.status as Status;
  const isTentative = status === "tentative";

  // 金額計算（仮予約は推計、確定後は DB の値を使用）
  const courseBack = Math.floor((course.price * course.back_rate) / 100);
  const nomBack = Math.floor((nomination.price * nomination.back_rate) / 100);
  const extBack = extension ? Math.floor((extension.price * extension.back_rate) / 100) : 0;
  const optSubtotal = options.reduce((s, o) => s + o.option_snapshot.price * o.quantity, 0);
  const optBack = options.reduce(
    (s, o) => s + Math.floor((o.option_snapshot.price * o.quantity * o.option_snapshot.back_rate) / 100),
    0,
  );
  const transportBack = Math.floor((r.transport_fee * r.transport_back_rate) / 100);

  const estTotal = course.price + nomination.price + (extension?.price ?? 0) + optSubtotal + r.transport_fee;
  const estPlayerBack = courseBack + nomBack + extBack + optBack + transportBack;
  const estStoreAmount = estTotal - estPlayerBack;

  const displayTotal = isTentative ? estTotal : r.total_amount;
  const displayPlayerBack = isTentative ? estPlayerBack : r.player_back_amount;
  const displayStoreAmount = isTentative ? estStoreAmount : r.store_amount;

  const badge = STATUS_BADGE[status];

  return (
    <main className="mx-auto max-w-lg px-4 py-8 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <Link href="/owner/reservations" className="text-sm text-muted-foreground hover:underline">
          ← 一覧へ
        </Link>
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      {/* 基本情報 */}
      <div className="rounded-lg border border-border p-4 space-y-0">
        <Row label="プレイヤー" value={playerName} />
        <Row label="顧客区分" value={l("customer_type", r.customer_type)} />
        <Row label="顧客名" value={r.customer_name} />
        <Row label="予約方法" value={l("reservation_channel", r.reservation_channel)} />
        <Row label="合流方法" value={l("meeting_method", r.meeting_method)} />
        <Row label="開始日時" value={fmtDate(r.start_at)} />
        <Row label="終了日時" value={fmtDate(r.end_at)} />
        <Row label="指名種別" value={l("nomination_type", r.nomination_type)} />
        <Row label="支払い方法" value={l("payment_method", r.payment_method)} />
      </div>

      {/* 料金内訳 */}
      <div className="rounded-lg border border-border p-4 space-y-0">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          料金内訳{isTentative ? "（推計）" : ""}
        </p>

        {/* コース */}
        <div className="flex justify-between border-b border-border py-2 text-sm">
          <span className="text-muted-foreground">
            コース：{course.name}（{course.duration_min}分）
          </span>
          <div className="text-right">
            <p>¥{course.price.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">
              バック ¥{courseBack.toLocaleString()}（{course.back_rate}%）
            </p>
          </div>
        </div>

        {/* 指名料 */}
        <div className="flex justify-between border-b border-border py-2 text-sm">
          <span className="text-muted-foreground">
            指名料：{l("nomination_type", nomination.type)}
          </span>
          <div className="text-right">
            <p>¥{nomination.price.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">
              バック ¥{nomBack.toLocaleString()}（{nomination.back_rate}%）
            </p>
          </div>
        </div>

        {/* 延長 */}
        {extension && (
          <div className="flex justify-between border-b border-border py-2 text-sm">
            <span className="text-muted-foreground">
              延長：{extension.name}（{extension.duration_min}分）
            </span>
            <div className="text-right">
              <p>¥{extension.price.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">
                バック ¥{extBack.toLocaleString()}（{extension.back_rate}%）
              </p>
            </div>
          </div>
        )}

        {/* オプション */}
        {options.map((o, i) => {
          const oBack = Math.floor(
            (o.option_snapshot.price * o.quantity * o.option_snapshot.back_rate) / 100,
          );
          return (
            <div key={i} className="flex justify-between border-b border-border py-2 text-sm">
              <span className="text-muted-foreground">
                {o.option_snapshot.name} × {o.quantity}
              </span>
              <div className="text-right">
                <p>¥{(o.option_snapshot.price * o.quantity).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">
                  バック ¥{oBack.toLocaleString()}（{o.option_snapshot.back_rate}%）
                </p>
              </div>
            </div>
          );
        })}

        {/* 交通費 */}
        {r.transport_fee > 0 && (
          <div className="flex justify-between border-b border-border py-2 text-sm">
            <span className="text-muted-foreground">交通費</span>
            <div className="text-right">
              <p>¥{r.transport_fee.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">
                バック ¥{transportBack.toLocaleString()}（{r.transport_back_rate}%）
              </p>
            </div>
          </div>
        )}

        {/* 合計 */}
        <div className="pt-2 space-y-1">
          <div className="flex justify-between text-sm font-semibold">
            <span>合計</span>
            <span>¥{displayTotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>プレイヤーバック</span>
            <span>¥{displayPlayerBack.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>店舗取り分</span>
            <span>¥{displayStoreAmount.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* アクション */}
      {status !== "cancelled" && (
        <Link
          href={`/owner/reservations/${r.id}/edit`}
          className="flex w-full items-center justify-center rounded-lg border border-border py-2 text-sm font-medium hover:bg-muted/40 transition-colors"
        >
          編集
        </Link>
      )}
      <ActionButtons reservationId={r.id} status={status} />

      {/* 変更履歴（簡易） */}
      <div className="rounded-lg border border-border p-4 space-y-1 text-xs text-muted-foreground">
        <p className="font-medium text-foreground text-sm mb-1">変更履歴</p>
        <p>作成日時：{fmtDate(r.created_at)}</p>
        <p>更新日時：{fmtDate(r.updated_at)}</p>
      </div>
    </main>
  );
}
