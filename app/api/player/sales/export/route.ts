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

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { data: me } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();
  if (!me || me.role !== "player") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const filterFrom = sp.get("from") ?? "";
  const filterTo = sp.get("to") ?? "";

  let query = supabase
    .from("reservations")
    .select(
      "id, start_at, customer_name, nomination_type, course_snapshot, nomination_snapshot, extension_snapshot, transport_fee, transport_back_rate, total_amount, player_back_amount, reservation_options(option_snapshot, quantity)",
    )
    .eq("player_id", me.id)
    .eq("status", "confirmed")
    .order("start_at", { ascending: false });

  if (filterFrom) query = query.gte("start_at", new Date(filterFrom).toISOString());
  if (filterTo) {
    const to = new Date(filterTo);
    to.setHours(23, 59, 59, 999);
    query = query.lte("start_at", to.toISOString());
  }

  const { data: rows } = await query;

  const header = row([
    "日時",
    "顧客名",
    "コース",
    "指名種別",
    "延長",
    "オプション",
    "交通費",
    "合計金額",
    "バック額",
  ]);

  const dataRows = (rows ?? []).map((r) => {
    type CourseSnap = { name?: string };
    type ExtSnap = { name?: string };
    const course = r.course_snapshot as CourseSnap;
    const ext = r.extension_snapshot as ExtSnap | null;
    const opts = (r.reservation_options ?? []) as Array<{
      option_snapshot: { name: string; price: number };
      quantity: number;
    }>;
    const optStr = opts.map((o) => `${o.option_snapshot.name}×${o.quantity}`).join(" / ");
    const nomLabel = r.nomination_type === "first" ? "初指名" : "本指名";

    return row([
      fmtDate(r.start_at),
      r.customer_name,
      String(course.name ?? ""),
      nomLabel,
      ext ? String((ext as { name?: string }).name ?? "") : "",
      optStr,
      r.transport_fee,
      r.total_amount,
      r.player_back_amount,
    ]);
  });

  const csv = "\uFEFF" + [header, ...dataRows].join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sales_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
