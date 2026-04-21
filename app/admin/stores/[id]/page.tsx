import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { StoreEditor } from "./store-editor";
import { CopyMasterForm } from "./copy-master/copy-master-form";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
}

export default async function AdminStoreDetailPage({
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
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!me || me.role !== "super_admin") redirect("/login");

  const admin = createAdminClient();

  const [{ data: store }, { data: owner }, { data: reservationStats }, { data: allStores }] =
    await Promise.all([
      admin.from("stores").select("*").eq("id", id).maybeSingle(),
      admin
        .from("users")
        .select("id, name, login_id, created_at")
        .eq("store_id", id)
        .eq("role", "owner")
        .maybeSingle(),
      admin
        .from("reservations")
        .select("id, status")
        .eq("store_id", id),
      admin.from("stores").select("id, name, store_code").order("name"),
    ]);

  if (!store) notFound();

  const total = (reservationStats ?? []).length;
  const confirmed = (reservationStats ?? []).filter((r) => r.status === "confirmed").length;
  const tentative = (reservationStats ?? []).filter((r) => r.status === "tentative").length;

  return (
    <main className="mx-auto max-w-lg px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin/stores" className="text-sm text-muted-foreground hover:underline">
          ← 店舗一覧
        </Link>
        <span
          className={`rounded px-2 py-0.5 text-xs font-medium ${
            store.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"
          }`}
        >
          {store.is_active ? "稼働中" : "凍結"}
        </span>
      </div>

      {/* 店舗サマリ */}
      <div className="rounded-lg border border-border p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">店舗コード</span>
          <span className="font-mono">{store.store_code}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">登録日</span>
          <span>{fmtDate(store.created_at)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">オーナー</span>
          <span>{owner?.name ?? "—"}</span>
        </div>
        {owner && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">オーナーID</span>
            <span className="font-mono text-xs">{owner.login_id}</span>
          </div>
        )}
      </div>

      {/* 予約統計 */}
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { label: "総予約数", value: total },
          { label: "確定済", value: confirmed },
          { label: "仮予約", value: tentative },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-border p-3 space-y-1">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-semibold">{value}</p>
          </div>
        ))}
      </div>

      {/* なりすましログイン */}
      {owner && (
        <div className="rounded-lg border border-border p-4 space-y-2">
          <p className="text-sm font-medium">なりすましログイン</p>
          <p className="text-xs text-muted-foreground">
            このオーナーとしてログインし、オーナー画面を操作できます。
            終了するにはログアウトしてください。
          </p>
          <a
            href={`/admin/stores/${id}/impersonate`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted/40 transition-colors"
          >
            オーナー画面を開く（別タブ）→
          </a>
        </div>
      )}

      {/* マスタコピー */}
      <div className="rounded-lg border border-border p-4 space-y-3">
        <p className="text-sm font-medium">他店舗からマスタをコピー</p>
        <p className="text-xs text-muted-foreground">
          コース・指名料・延長・オプションを他店舗から複製します（既存データに追加）
        </p>
        <CopyMasterForm
          targetStoreId={store.id}
          stores={allStores ?? []}
        />
      </div>

      {/* 編集フォーム */}
      <StoreEditor
        storeId={store.id}
        storeName={store.name}
        isActive={store.is_active}
      />
    </main>
  );
}
