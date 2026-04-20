"use client";

import { useTransition, useState } from "react";
import { confirmReservation, cancelReservation, restoreReservation, deleteReservation } from "./actions";

type Status = "tentative" | "confirmed" | "cancelled";

export function ActionButtons({
  reservationId,
  status,
}: {
  reservationId: string;
  status: Status;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {status === "tentative" && (
          <>
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(() => confirmReservation(reservationId))}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-80 disabled:opacity-50"
            >
              確定する
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                if (!confirm("この予約をキャンセルしますか？")) return;
                run(() => cancelReservation(reservationId));
              }}
              className="rounded-lg border border-destructive/50 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
            >
              キャンセル
            </button>
          </>
        )}
        {status === "confirmed" && (
          <>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                if (!confirm("この予約をキャンセルしますか？")) return;
                run(() => cancelReservation(reservationId));
              }}
              className="rounded-lg border border-destructive/50 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
            >
              キャンセル
            </button>
          </>
        )}
        {status === "cancelled" && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(() => restoreReservation(reservationId))}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted/40 disabled:opacity-50"
          >
            復元（仮予約に戻す）
          </button>
        )}
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            if (!confirm("この予約を削除しますか？この操作は取り消せません。")) return;
            run(() => deleteReservation(reservationId));
          }}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/40 disabled:opacity-50"
        >
          削除
        </button>
      </div>
      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
