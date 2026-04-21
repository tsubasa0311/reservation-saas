"use client";

import { useState, useTransition } from "react";
import { updatePlayerBasic, resetPlayerPassword } from "./actions";
import { PricingOverrides, type PricingData } from "./pricing-overrides";

type BasicInfo = {
  id: string;
  name: string;
  login_id: string;
  back_rate_transport: number;
  is_active: boolean;
};

type Tab = "basic" | "pricing";

export function PlayerEditor({
  player,
  pricing,
}: {
  player: BasicInfo;
  pricing: PricingData;
}) {
  const [tab, setTab] = useState<Tab>("basic");

  return (
    <div className="space-y-4">
      {/* タブ */}
      <div className="flex border-b border-border">
        {(["basic", "pricing"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t ? "border-b-2 border-primary text-primary" : "text-muted-foreground"
            }`}
          >
            {t === "basic" ? "基本情報" : "料金設定"}
          </button>
        ))}
      </div>

      {tab === "basic" ? (
        <BasicTab player={player} />
      ) : (
        <PricingOverrides playerId={player.id} data={pricing} />
      )}
    </div>
  );
}

function BasicTab({ player }: { player: BasicInfo }) {
  const [name, setName] = useState(player.name);
  const [backRate, setBackRate] = useState(player.back_rate_transport);
  const [isActive, setIsActive] = useState(player.is_active);
  const [newPassword, setNewPassword] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [isSaving, startSave] = useTransition();
  const [isResetting, startReset] = useTransition();

  const handleSave = () => {
    setSaveError(null);
    startSave(async () => {
      const result = await updatePlayerBasic(player.id, {
        name, back_rate_transport: backRate, is_active: isActive,
      });
      if (result.error) setSaveError(result.error);
    });
  };

  const handlePasswordReset = () => {
    setPwError(null);
    setPwSuccess(false);
    startReset(async () => {
      const result = await resetPlayerPassword(player.id, newPassword);
      if (result.error) { setPwError(result.error); return; }
      setPwSuccess(true);
      setNewPassword("");
    });
  };

  return (
    <div className="space-y-6">
      {/* 基本情報フォーム */}
      <div className="rounded-lg border border-border p-4 space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">名前</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">ログインID</label>
          <p className="rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
            {player.login_id}
          </p>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">交通費バック率（%）</label>
          <input type="number" min={0} max={100} value={backRate}
            onChange={(e) => setBackRate(Number(e.target.value))}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)}
            className="accent-primary" />
          有効
        </label>
        {saveError && <p className="text-xs text-destructive">{saveError}</p>}
        <button type="button" disabled={isSaving} onClick={handleSave}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-80 disabled:opacity-50">
          {isSaving ? "保存中..." : "保存"}
        </button>
      </div>

      {/* パスワードリセット */}
      <div className="rounded-lg border border-border p-4 space-y-3">
        <p className="text-sm font-medium">パスワードリセット</p>
        <input type="password" placeholder="新しいパスワード（6文字以上）" value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        {pwError && <p className="text-xs text-destructive">{pwError}</p>}
        {pwSuccess && <p className="text-xs text-green-600">パスワードを変更しました</p>}
        <button type="button" disabled={isResetting || newPassword.length < 6} onClick={handlePasswordReset}
          className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted/40 disabled:opacity-50">
          {isResetting ? "変更中..." : "パスワードを変更"}
        </button>
      </div>
    </div>
  );
}
