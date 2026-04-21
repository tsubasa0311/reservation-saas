"use client";

import { useState, useTransition } from "react";
import { createCourse, updateCourse, deleteCourse, type CourseInput } from "./actions";

type Course = {
  id: string;
  name: string;
  duration_min: number;
  default_price: number;
  default_back_rate: number;
  valid_from: string | null;
  valid_to: string | null;
  is_active: boolean;
};

const EMPTY: CourseInput = {
  name: "",
  duration_min: 60,
  default_price: 0,
  default_back_rate: 50,
  valid_from: null,
  valid_to: null,
  is_active: true,
};

function CourseForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  initial: CourseInput;
  onSubmit: (v: CourseInput) => Promise<{ error?: string }>;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [values, setValues] = useState<CourseInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const set = (k: keyof CourseInput, v: string | number | boolean | null) =>
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
          <label className="text-xs text-muted-foreground">コース名 *</label>
          <input
            type="text"
            required
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">時間（分）*</label>
          <input
            type="number"
            required
            min={1}
            value={values.duration_min as number}
            onChange={(e) => set("duration_min", e.target.value)}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">料金（円）*</label>
          <input
            type="number"
            required
            min={0}
            value={values.default_price as number}
            onChange={(e) => set("default_price", e.target.value)}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">バック率（%）*</label>
          <input
            type="number"
            required
            min={0}
            max={100}
            value={values.default_back_rate as number}
            onChange={(e) => set("default_back_rate", e.target.value)}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">有効開始日</label>
          <input
            type="date"
            value={values.valid_from ?? ""}
            onChange={(e) => set("valid_from", e.target.value || null)}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">有効終了日</label>
          <input
            type="date"
            value={values.valid_to ?? ""}
            onChange={(e) => set("valid_to", e.target.value || null)}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex items-end gap-2 pb-1">
          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={values.is_active}
              onChange={(e) => set("is_active", e.target.checked)}
              className="accent-primary"
            />
            有効
          </label>
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-80 disabled:opacity-50"
        >
          {isPending ? "保存中..." : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-border px-4 py-1.5 text-sm hover:bg-muted/40"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}

export function CourseManager({ courses }: { courses: Course[] }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return;
    setDeleteError(null);
    startTransition(async () => {
      const result = await deleteCourse(id);
      if (result.error) setDeleteError(result.error);
    });
  };

  return (
    <div className="space-y-4">
      {/* 追加フォーム */}
      {showAdd ? (
        <CourseForm
          initial={EMPTY}
          onSubmit={(v) => createCourse(v)}
          onCancel={() => setShowAdd(false)}
          submitLabel="追加"
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-80"
        >
          ＋ コースを追加
        </button>
      )}

      {deleteError && <p className="text-xs text-destructive">{deleteError}</p>}

      {/* 一覧 */}
      {courses.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">コースがありません</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
          {courses.map((c) => (
            <li key={c.id}>
              {editingId === c.id ? (
                <div className="p-3">
                  <CourseForm
                    initial={{
                      name: c.name,
                      duration_min: c.duration_min,
                      default_price: c.default_price,
                      default_back_rate: c.default_back_rate,
                      valid_from: c.valid_from,
                      valid_to: c.valid_to,
                      is_active: c.is_active,
                    }}
                    onSubmit={(v) => updateCourse(c.id, v)}
                    onCancel={() => setEditingId(null)}
                    submitLabel="更新"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{c.name}</span>
                      {!c.is_active && (
                        <span className="rounded px-1.5 py-0.5 text-xs bg-gray-100 text-gray-500">無効</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {c.duration_min}分 ／ ¥{c.default_price.toLocaleString()} ／ バック{c.default_back_rate}%
                      {c.valid_from && ` ／ ${c.valid_from}〜${c.valid_to ?? ""}`}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingId(c.id)}
                      className="text-xs text-primary hover:underline"
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDelete(c.id, c.name)}
                      className="text-xs text-destructive hover:underline disabled:opacity-50"
                    >
                      削除
                    </button>
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
