"use client";

import { useState, useTransition } from "react";
import { updateNominationFee } from "./actions";

type Fee = { id: string; type: string; default_price: number; default_back_rate: number };

const TYPE_LABEL: Record<string, string> = { first: "初指名", repeat: "本指名" };

function FeeRow({ fee }: { fee: Fee }) {
  const [price, setPrice] = useState(fee.default_price);
  const [backRate, setBackRate] = useState(fee.default_back_rate);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateNominationFee(fee.id, {
        default_price: price,
        default_back_rate: backRate,
      });
      if (result.error) { setError(result.error); return; }
      setEditing(false);
    });
  };

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <p className="text-sm font-medium">{TYPE_LABEL[fee.type] ?? fee.type}</p>
      {editing ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">料金（円）</label>
              <input
                type="number" min={0} value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">バック率（%）</label>
              <input
                type="number" min={0} max={100} value={backRate}
                onChange={(e) => setBackRate(Number(e.target.value))}
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
              />
            </div>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button" disabled={isPending} onClick={handleSave}
              className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-80 disabled:opacity-50"
            >
              {isPending ? "保存中..." : "保存"}
            </button>
            <button
              type="button" onClick={() => { setEditing(false); setPrice(fee.default_price); setBackRate(fee.default_back_rate); }}
              className="rounded-md border border-border px-4 py-1.5 text-sm hover:bg-muted/40"
            >
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            ¥{price.toLocaleString()} ／ バック {backRate}%
          </p>
          <button type="button" onClick={() => setEditing(true)} className="text-xs text-primary hover:underline">
            編集
          </button>
        </div>
      )}
    </div>
  );
}

export function NominationEditor({ fees }: { fees: Fee[] }) {
  if (fees.length === 0) return <p className="text-sm text-muted-foreground">データがありません</p>;
  return (
    <div className="space-y-3">
      {fees.map((f) => <FeeRow key={f.id} fee={f} />)}
    </div>
  );
}
