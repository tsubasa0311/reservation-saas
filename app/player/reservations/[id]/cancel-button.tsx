"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { cancelReservation } from "./actions";

export function CancelButton({ reservationId }: { reservationId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleCancel = () => {
    if (!confirm("この予約を取り消しますか？")) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelReservation(reservationId);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.push("/player");
    });
  };

  return (
    <div className="flex-1 space-y-1">
      <button
        type="button"
        onClick={handleCancel}
        disabled={isPending}
        className="w-full rounded-lg border border-destructive/50 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
      >
        {isPending ? "処理中..." : "取り消し"}
      </button>
      {error && <p className="text-xs text-destructive text-center">{error}</p>}
    </div>
  );
}
