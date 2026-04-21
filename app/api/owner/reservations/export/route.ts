import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function escCsv(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function row(cells: (string | number | null | undefined)[]): string {
  return cells.map(escCsv).join(",");
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_LABEL: Record<string, string> = {
  tentative: "仮予約",
  confirmed: "確定",
  cancelled: "キャンセル",
};
const PAYMENT_LABEL: Record<string, string> = { cash: "現金", card: "カード" };
const NOMINATION_LABEL: Record<string, string> = {
  first: "初指名",
  repeat: "本指名",
};

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { data: me } = await supabase
    .from("users")
    .select("id, store_id, role")
    .eq("id", user.id)
    .maybeSingle();
  if (!me || !me.store_id || (me.role !== "owner" && me.role !== "super_admin")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const filterStatus = sp.get("status") ?? "all";
  const filterFrom = sp.get("from") ?? "";
  const filterTo = sp.get("to") ?? "";
  const filterPlayer = sp.get("player") ?? "";
  const filterPayment = sp.get("payment") ?? "";

  let query = supabase
    .from("reservations")
    .select(
      "id, status, start_at, end_at, customer_type, customer_name, reservation_channel, meeting_method, nomination_type, payment_method, transport_fee, total_amount, player_back_amount, store_amount, course_snapshot, nomination_snapshot, extension_snapshot, reservation_options(option_snapshot, quantity), player:users!player_id(name)",
    )
    .eq("store_id", me.store_id)
    .order("start_at", { ascending: false });

  if (filterStatus !== "all") query = query.eq("status", filterStatus);
  if (filterFrom) query = query.gte("start_at", new Date(filterFrom).toISOString());
  if (filterTo) {
    const to = new Date(filterTo);
    to.setHours(23, 59, 59, 999);
    query = query.lte("start_at", to.toISOString());
  }
  if (filterPlayer) query = query.eq("player_id", filterPlayer);
  if (filterPayment) query = query.eq("payment_method", filterPayment);

  const { data: rows } = await query;

  const header = row([
    "予約ID",
    "ステータス",
    "開始日時",
    "終了日時",
    "プレイヤー",
    "顧客名",
    "顧客区分",
    "予約方法",
    "合流方法",
    "指名種別",
    "コース",
    "延長",
    "オプション",
    "交通費",
    "支払い方法",
    "合計金額",
    "バック額",
    "店舗取り分",
  ]);

  const dataRows = (rows ?? []).map((r) => {
    type Snap = Record<string, unknown> & { name?: string };
    const course = r.course_snapshot as Snap;
    const ext = r.extension_snapshot as Snap | null;
    const opts = (r.reservation_options ?? []) as Array<{
      option_snapshot: { name: string; price: number };
      quantity: number;
    }>;
    const playerName = Array.isArray(r.player)
      ? (r.player[0] as { name: string } | undefined)?.name ?? ""
      : (r.player as { name: string } | null)?.name ?? "";
    const optStr = opts
      .map((o) => `${o.option_snapshot.name}×${o.quantity}`)
      .join(" / ");

    const isTentative = r.status === "tentative";
    type CourseSnap = { name?: string; price?: number };
    type NomSnap = { price?: number };
    type ExtSnap = { name?: string; price?: number };
    const courseSnap = course as CourseSnap;
    const nomSnap = r.nomination_snapshot as NomSnap;
    const extSnap = ext as ExtSnap | null;
    const optTotal = opts.reduce((s, o) => s + o.option_snapshot.price * o.quantity, 0);
    const estTotal =
      (courseSnap.price ?? 0) +
      (nomSnap.price ?? 0) +
      (extSnap?.price ?? 0) +
      optTotal +
      r.transport_fee;

    return row([
      r.id,
      STATUS_LABEL[r.status] ?? r.status,
      fmtDate(r.start_at),
      fmtDate(r.end_at),
      playerName,
      r.customer_name,
      r.customer_type === "new" ? "新規" : "会員",
      r.reservation_channel,
      r.meeting_method,
      NOMINATION_LABEL[r.nomination_type] ?? r.nomination_type,
      String(courseSnap.name ?? ""),
      ext ? String(extSnap?.name ?? "") : "",
      optStr,
      r.transport_fee,
      PAYMENT_LABEL[r.payment_method] ?? r.payment_method,
      isTentative ? estTotal : (r.total_amount ?? 0),
      isTentative ? "" : (r.player_back_amount ?? 0),
      isTentative ? "" : (r.store_amount ?? 0),
    ]);
  });

  const csv = "\uFEFF" + [header, ...dataRows].join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reservations_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
