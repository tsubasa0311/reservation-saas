import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { OptionManager } from "./option-manager";

export default async function OwnerOptionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("users").select("store_id, role").eq("id", user.id).maybeSingle();
  if (!me?.store_id || (me.role !== "owner" && me.role !== "super_admin")) redirect("/login");

  const { data: options } = await supabase
    .from("options")
    .select("id, name, default_price, default_back_rate, is_active")
    .eq("store_id", me.store_id)
    .order("sort_order")
    .order("created_at");

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">オプション管理</h1>
        <Link href="/owner" className="text-sm text-muted-foreground hover:underline">← ダッシュボード</Link>
      </div>
      <OptionManager options={options ?? []} />
    </main>
  );
}
