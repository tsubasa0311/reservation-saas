import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NominationEditor } from "./nomination-editor";

export default async function OwnerNominationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("users").select("store_id, role").eq("id", user.id).maybeSingle();
  if (!me?.store_id || (me.role !== "owner" && me.role !== "super_admin")) redirect("/login");

  const { data: fees } = await supabase
    .from("nomination_fees")
    .select("id, type, default_price, default_back_rate")
    .eq("store_id", me.store_id)
    .order("type"); // first → repeat

  return (
    <main className="mx-auto max-w-lg px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">指名料設定</h1>
        <Link href="/owner" className="text-sm text-muted-foreground hover:underline">← ダッシュボード</Link>
      </div>
      <NominationEditor fees={fees ?? []} />
    </main>
  );
}
