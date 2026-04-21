import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PlayerEditor } from "./player-editor";
import type { PricingData } from "./pricing-overrides";

const NOMINATION_LABEL: Record<string, string> = { first: "初指名", repeat: "本指名" };

export default async function PlayerEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("users").select("store_id, role").eq("id", user.id).maybeSingle();
  if (!me?.store_id || (me.role !== "owner" && me.role !== "super_admin")) redirect("/login");

  const { data: player } = await supabase
    .from("users")
    .select("id, name, login_id, back_rate_transport, is_active")
    .eq("id", id)
    .eq("store_id", me.store_id)
    .eq("role", "player")
    .maybeSingle();
  if (!player) notFound();

  // マスタ + 上書き設定を並行取得
  const [
    { data: courses },
    { data: nominations },
    { data: extensions },
    { data: options },
    { data: courseOverrides },
    { data: nominationOverrides },
    { data: extensionOverrides },
    { data: optionOverrides },
  ] = await Promise.all([
    supabase.from("courses").select("id, name, duration_min, default_price, default_back_rate")
      .eq("store_id", me.store_id).eq("is_active", true).order("sort_order").order("created_at"),
    supabase.from("nomination_fees").select("type, default_price, default_back_rate")
      .eq("store_id", me.store_id),
    supabase.from("extensions").select("id, name, duration_min, default_price, default_back_rate")
      .eq("store_id", me.store_id).eq("is_active", true).order("sort_order").order("created_at"),
    supabase.from("options").select("id, name, default_price, default_back_rate")
      .eq("store_id", me.store_id).eq("is_active", true).order("sort_order").order("created_at"),
    supabase.from("player_course_overrides").select("course_id, price, back_rate").eq("player_id", id),
    supabase.from("player_nomination_overrides").select("type, price, back_rate").eq("player_id", id),
    supabase.from("player_extension_overrides").select("extension_id, price, back_rate").eq("player_id", id),
    supabase.from("player_option_overrides").select("option_id, price, back_rate").eq("player_id", id),
  ]);

  const courseOverMap = Object.fromEntries(
    (courseOverrides ?? []).map((o) => [o.course_id, { price: o.price!, back_rate: o.back_rate! }])
  );
  const nomOverMap = Object.fromEntries(
    (nominationOverrides ?? []).map((o) => [o.type, { price: o.price!, back_rate: o.back_rate! }])
  );
  const extOverMap = Object.fromEntries(
    (extensionOverrides ?? []).map((o) => [o.extension_id, { price: o.price!, back_rate: o.back_rate! }])
  );
  const optOverMap = Object.fromEntries(
    (optionOverrides ?? []).map((o) => [o.option_id, { price: o.price!, back_rate: o.back_rate! }])
  );

  const pricing: PricingData = {
    courses: (courses ?? []).map((c) => ({ ...c, override: courseOverMap[c.id] ?? null })),
    nominations: (nominations ?? []).map((n) => ({
      ...n, label: NOMINATION_LABEL[n.type] ?? n.type, override: nomOverMap[n.type] ?? null,
    })),
    extensions: (extensions ?? []).map((e) => ({ ...e, override: extOverMap[e.id] ?? null })),
    options: (options ?? []).map((o) => ({ ...o, override: optOverMap[o.id] ?? null })),
  };

  const playerData = {
    ...player,
    back_rate_transport: player.back_rate_transport ?? 0,
  };

  return (
    <main className="mx-auto max-w-lg px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{player.name}</h1>
        <Link href="/owner/players" className="text-sm text-muted-foreground hover:underline">← 一覧</Link>
      </div>
      <PlayerEditor player={playerData} pricing={pricing} />
    </main>
  );
}
