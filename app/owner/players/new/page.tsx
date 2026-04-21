"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createPlayer, type CreatePlayerInput } from "./actions";

export default function NewPlayerPage() {
  const router = useRouter();
  const [values, setValues] = useState<CreatePlayerInput>({
    name: "", login_id: "", password: "", back_rate_transport: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const set = (k: keyof CreatePlayerInput, v: string | number) =>
    setValues((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createPlayer(values);
      if (result?.error) { setError(result.error); return; }
      router.push("/owner/players");
    });
  };

  return (
    <main className="mx-auto max-w-md px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">プレイヤー追加</h1>
        <Link href="/owner/players" className="text-sm text-muted-foreground hover:underline">← 一覧</Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">名前 *</label>
          <input type="text" required value={values.name} onChange={(e) => set("name", e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">ログインID *</label>
          <p className="text-xs text-muted-foreground">半角英数字とアンダースコアのみ</p>
          <input type="text" required value={values.login_id} onChange={(e) => set("login_id", e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">パスワード *（6文字以上）</label>
          <input type="password" required minLength={6} value={values.password} onChange={(e) => set("password", e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">交通費バック率（%）</label>
          <input type="number" min={0} max={100} value={values.back_rate_transport as number}
            onChange={(e) => set("back_rate_transport", e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button type="submit" disabled={isPending}
          className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-80 disabled:opacity-50">
          {isPending ? "作成中..." : "プレイヤーを作成"}
        </button>
      </form>
    </main>
  );
}
