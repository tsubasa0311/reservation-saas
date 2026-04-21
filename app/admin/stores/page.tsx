import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
}

export default async function AdminStoresPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!me || me.role !== "super_admin") redirect("/login");

  const admin = createAdminClient();

  const [{ data: stores }, { data: owners }] = await Promise.all([
    admin.from("stores").select("id, name, store_code, is_active, created_at").order("created_at"),
    admin.from("users").select("store_id, name").eq("role", "owner"),
  ]);

  const ownerMap = Object.fromEntries(
    (owners ?? []).map((o) => [o.store_id, o.name]),
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-sm text-muted-foreground hover:underline">
            ← ダッシュボード
          </Link>
          <h1 className="text-xl font-semibold">店舗管理</h1>
        </div>
        <Link
          href="/admin/stores/new"
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-80"
        >
          ＋ 新規店舗
        </Link>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        {(stores ?? []).length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">店舗がありません</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left font-medium">店舗名</th>
                <th className="px-4 py-2 text-left font-medium">オーナー</th>
                <th className="px-4 py-2 text-center font-medium">状態</th>
                <th className="px-4 py-2 text-right font-medium">登録日</th>
                <th className="px-4 py-2 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(stores ?? []).map((s) => (
                <tr key={s.id} className="hover:bg-muted/20">
                  <td className="px-4 py-2">
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.store_code}</p>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {ownerMap[s.id] ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                        s.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {s.is_active ? "稼働中" : "凍結"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right text-muted-foreground">
                    {fmtDate(s.created_at)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/admin/stores/${s.id}`}
                      className="text-xs text-primary hover:underline"
                    >
                      詳細 →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </main>
  );
}
