"use client";

import { useState, useTransition } from "react";
import { createExtension, updateExtension, deleteExtension, type ExtensionInput } from "./actions";

type Extension = { id: string; name: string; duration_min: number; default_price: number; default_back_rate: number; is_active: boolean };

const EMPTY: ExtensionInput = { name: "", duration_min: 30, default_price: 0, default_back_rate: 50, is_active: true };

function ExtensionForm({ initial, onSubmit, onCancel, submitLabel }: {
  initial: ExtensionInput;
  onSubmit: (v: ExtensionInput) => Promise<{ error?: string }>;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [values, setValues] = useState<ExtensionInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const set = (k: keyof ExtensionInput, v: string | number | boolean) =>
    setValues((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await onSubmit(values);
      if (result.error) { setError(result.error); return; }
      onCancel();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-border p-4 space-y-3 bg-muted/30">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="col-span-2 space-y-1">
          <label className="text-xs text-muted-foreground">延長名 *</label>
          <input type="text" required value={values.name} onChange={(e) => set("name", e.target.value)}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">時間（分）*</label>
          <input type="number" required min={1} value={values.duration_min as number} onChange={(e) => set("duration_min", e.target.value)}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">料金（円）*</label>
          <input type="number" required min={0} value={values.default_price as number} onChange={(e) => set("default_price", e.target.value)}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">バック率（%）*</label>
          <input type="number" required min={0} max={100} value={values.default_back_rate as number} onChange={(e) => set("default_back_rate", e.target.value)}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
        </div>
        <div className="flex items-end gap-2 pb-1">
          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input type="checkbox" checked={values.is_active} onChange={(e) => set("is_active", e.target.checked)} className="accent-primary" />
            有効
          </label>
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={isPending} className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-80 disabled:opacity-50">
          {isPending ? "保存中..." : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="rounded-md border border-border px-4 py-1.5 text-sm hover:bg-muted/40">キャンセル</button>
      </div>
    </form>
  );
}

export function ExtensionManager({ extensions }: { extensions: Extension[] }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return;
    setDeleteError(null);
    startTransition(async () => {
      const result = await deleteExtension(id);
      if (result.error) setDeleteError(result.error);
    });
  };

  return (
    <div className="space-y-4">
      {showAdd ? (
        <ExtensionForm initial={EMPTY} onSubmit={(v) => createExtension(v)} onCancel={() => setShowAdd(false)} submitLabel="追加" />
      ) : (
        <button type="button" onClick={() => setShowAdd(true)} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-80">
          ＋ 延長を追加
        </button>
      )}
      {deleteError && <p className="text-xs text-destructive">{deleteError}</p>}
      {extensions.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">延長料金がありません</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
          {extensions.map((e) => (
            <li key={e.id}>
              {editingId === e.id ? (
                <div className="p-3">
                  <ExtensionForm
                    initial={{ name: e.name, duration_min: e.duration_min, default_price: e.default_price, default_back_rate: e.default_back_rate, is_active: e.is_active }}
                    onSubmit={(v) => updateExtension(e.id, v)}
                    onCancel={() => setEditingId(null)}
                    submitLabel="更新"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{e.name}</span>
                      {!e.is_active && <span className="rounded px-1.5 py-0.5 text-xs bg-gray-100 text-gray-500">無効</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {e.duration_min}分 ／ ¥{e.default_price.toLocaleString()} ／ バック{e.default_back_rate}%
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button type="button" onClick={() => setEditingId(e.id)} className="text-xs text-primary hover:underline">編集</button>
                    <button type="button" disabled={isPending} onClick={() => handleDelete(e.id, e.name)} className="text-xs text-destructive hover:underline disabled:opacity-50">削除</button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
