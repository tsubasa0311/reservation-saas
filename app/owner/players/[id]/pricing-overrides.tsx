"use client";

import { useState, useTransition } from "react";
import {
  saveCourseOverride,
  saveNominationOverride,
  saveExtensionOverride,
  saveOptionOverride,
} from "./actions";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

type Override = { price: number; back_rate: number } | null;

export type PricingData = {
  courses: Array<{ id: string; name: string; duration_min: number; default_price: number; default_back_rate: number; override: Override }>;
  nominations: Array<{ type: string; label: string; default_price: number; default_back_rate: number; override: Override }>;
  extensions: Array<{ id: string; name: string; duration_min: number; default_price: number; default_back_rate: number; override: Override }>;
  options: Array<{ id: string; name: string; default_price: number; default_back_rate: number; override: Override }>;
};

// ----------------------------------------------------------------
// Override row component
// ----------------------------------------------------------------

function OverrideRow({
  label,
  defaultPrice,
  defaultBackRate,
  initialOverride,
  onSave,
}: {
  label: string;
  defaultPrice: number;
  defaultBackRate: number;
  initialOverride: Override;
  onSave: (override: Override) => Promise<{ error?: string }>;
}) {
  const [isCustom, setIsCustom] = useState(initialOverride !== null);
  const [price, setPrice] = useState(initialOverride?.price ?? defaultPrice);
  const [backRate, setBackRate] = useState(initialOverride?.back_rate ?? defaultBackRate);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleToggle = (custom: boolean) => {
    setIsCustom(custom);
    if (!custom) {
      setError(null);
      startTransition(async () => {
        const result = await onSave(null);
        if (result.error) { setError(result.error); setIsCustom(true); }
      });
    }
  };

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await onSave({ price, back_rate: backRate });
      if (result.error) setError(result.error);
    });
  };

  return (
    <div className="border-b border-border last:border-0 py-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{label}</p>
          {isCustom ? (
            <div className="mt-2 flex flex-wrap gap-2 items-end">
              <div className="space-y-0.5">
                <label className="text-xs text-muted-foreground">料金</label>
                <input type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-28 rounded-md border border-input bg-background px-2 py-1 text-sm" />
              </div>
              <div className="space-y-0.5">
                <label className="text-xs text-muted-foreground">バック率%</label>
                <input type="number" min={0} max={100} value={backRate} onChange={(e) => setBackRate(Number(e.target.value))}
                  className="w-20 rounded-md border border-input bg-background px-2 py-1 text-sm" />
              </div>
              <button type="button" disabled={isPending} onClick={handleSave}
                className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-80 disabled:opacity-50">
                {isPending ? "保存中" : "保存"}
              </button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">
              ¥{defaultPrice.toLocaleString()} ／ バック{defaultBackRate}%
            </p>
          )}
          {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        </div>
        <div className="shrink-0 flex items-center gap-1 mt-0.5">
          <button
            type="button"
            onClick={() => handleToggle(false)}
            className={`rounded-l-md border px-2 py-0.5 text-xs transition-colors ${
              !isCustom ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted/40"
            }`}
          >
            デフォルト
          </button>
          <button
            type="button"
            onClick={() => handleToggle(true)}
            className={`rounded-r-md border px-2 py-0.5 text-xs transition-colors ${
              isCustom ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted/40"
            }`}
          >
            カスタム
          </button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// Main component
// ----------------------------------------------------------------

export function PricingOverrides({ playerId, data }: { playerId: string; data: PricingData }) {
  return (
    <div className="space-y-6">
      {/* コース */}
      {data.courses.length > 0 && (
        <section className="rounded-lg border border-border p-4">
          <p className="text-sm font-semibold mb-2">コース</p>
          {data.courses.map((c) => (
            <OverrideRow
              key={c.id}
              label={`${c.name}（${c.duration_min}分）`}
              defaultPrice={c.default_price}
              defaultBackRate={c.default_back_rate}
              initialOverride={c.override}
              onSave={(o) => saveCourseOverride(playerId, c.id, o)}
            />
          ))}
        </section>
      )}

      {/* 指名料 */}
      {data.nominations.length > 0 && (
        <section className="rounded-lg border border-border p-4">
          <p className="text-sm font-semibold mb-2">指名料</p>
          {data.nominations.map((n) => (
            <OverrideRow
              key={n.type}
              label={n.label}
              defaultPrice={n.default_price}
              defaultBackRate={n.default_back_rate}
              initialOverride={n.override}
              onSave={(o) => saveNominationOverride(playerId, n.type, o)}
            />
          ))}
        </section>
      )}

      {/* 延長 */}
      {data.extensions.length > 0 && (
        <section className="rounded-lg border border-border p-4">
          <p className="text-sm font-semibold mb-2">延長料金</p>
          {data.extensions.map((e) => (
            <OverrideRow
              key={e.id}
              label={`${e.name}（${e.duration_min}分）`}
              defaultPrice={e.default_price}
              defaultBackRate={e.default_back_rate}
              initialOverride={e.override}
              onSave={(o) => saveExtensionOverride(playerId, e.id, o)}
            />
          ))}
        </section>
      )}

      {/* オプション */}
      {data.options.length > 0 && (
        <section className="rounded-lg border border-border p-4">
          <p className="text-sm font-semibold mb-2">オプション</p>
          {data.options.map((o) => (
            <OverrideRow
              key={o.id}
              label={o.name}
              defaultPrice={o.default_price}
              defaultBackRate={o.default_back_rate}
              initialOverride={o.override}
              onSave={(ov) => saveOptionOverride(playerId, o.id, ov)}
            />
          ))}
        </section>
      )}
    </div>
  );
}
