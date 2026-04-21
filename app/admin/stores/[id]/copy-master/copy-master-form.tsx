"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { copyMasterFromStore } from "./actions";

type Store = { id: string; name: string; store_code: string };

export function CopyMasterForm({
  targetStoreId,
  stores,
}: {
  targetStoreId: string;
  stores: Store[];
}) {
  const [isPending, startTransition] = useTransition();
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const otherStores = stores.filter((s) => s.id !== targetStoreId);

  const handleCopy = () => {
    if (!selectedSourceId) return;
    if (!confirm(`「${stores.find((s) => s.id === selectedSourceId)?.name}」のマスタをコピーしますか？\n既存のマスタに追加されます。`)) return;
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await copyMasterFromStore(targetStoreId, selectedSourceId);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setSelectedSourceId("");
      }
    });
  };

  if (otherStores.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">コピー元となる他店舗がありません</p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <select
          value={selectedSourceId}
          onChange={(e) => setSelectedSourceId(e.target.value)}
          className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
        >
          <option value="">コピー元を選択</option>
          {otherStores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}（{s.store_code}）
            </option>
          ))}
        </select>
        <Button
          onClick={handleCopy}
          disabled={isPending || !selectedSourceId}
          variant="outline"
        >
          コピー
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {success && <p className="text-xs text-green-600">マスタをコピーしました</p>}
    </div>
  );
}
