"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createStore } from "./actions";

export default function NewStorePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [values, setValues] = useState({
    store_name: "",
    store_code: "",
    owner_name: "",
    owner_login_id: "",
    owner_password: "",
    initial_master: "empty" as "empty" | "sample",
  });

  const set = (k: keyof typeof values, v: string) =>
    setValues((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createStore(values);
      if (result?.error) {
        setError(result.error);
      }
    });
  };

  return (
    <main className="mx-auto max-w-lg px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin/stores" className="text-sm text-muted-foreground hover:underline">
          ← 店舗一覧
        </Link>
        <h1 className="text-lg font-semibold">新規店舗追加</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 店舗情報 */}
        <div className="rounded-lg border border-border p-4 space-y-4">
          <p className="text-sm font-medium">店舗情報</p>

          <div className="space-y-1.5">
            <Label htmlFor="store_name">店舗名</Label>
            <Input
              id="store_name"
              value={values.store_name}
              onChange={(e) => set("store_name", e.target.value)}
              placeholder="例：〇〇デリヘル"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="store_code">店舗コード</Label>
            <Input
              id="store_code"
              value={values.store_code}
              onChange={(e) => set("store_code", e.target.value.toLowerCase())}
              placeholder="例：store001（半角英数字）"
              required
            />
            <p className="text-xs text-muted-foreground">ログインIDの一部として使用されます</p>
          </div>
        </div>

        {/* オーナー情報 */}
        <div className="rounded-lg border border-border p-4 space-y-4">
          <p className="text-sm font-medium">オーナーアカウント</p>

          <div className="space-y-1.5">
            <Label htmlFor="owner_name">オーナー名</Label>
            <Input
              id="owner_name"
              value={values.owner_name}
              onChange={(e) => set("owner_name", e.target.value)}
              placeholder="例：山田太郎"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="owner_login_id">ログインID</Label>
            <Input
              id="owner_login_id"
              value={values.owner_login_id}
              onChange={(e) => set("owner_login_id", e.target.value)}
              placeholder="例：owner001"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="owner_password">初期パスワード</Label>
            <Input
              id="owner_password"
              type="password"
              value={values.owner_password}
              onChange={(e) => set("owner_password", e.target.value)}
              placeholder="6文字以上"
              required
            />
          </div>
        </div>

        {/* 初期マスタ */}
        <div className="rounded-lg border border-border p-4 space-y-3">
          <p className="text-sm font-medium">初期マスタ</p>
          {(
            [
              { value: "empty", label: "空（マスタなし）" },
              { value: "sample", label: "サンプルデータを投入" },
            ] as const
          ).map((opt) => (
            <label key={opt.value} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="initial_master"
                value={opt.value}
                checked={values.initial_master === opt.value}
                onChange={() => set("initial_master", opt.value)}
                className="accent-primary"
              />
              {opt.label}
            </label>
          ))}
        </div>

        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "作成中..." : "店舗を作成"}
        </Button>
      </form>
    </main>
  );
}
