"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  toggleStoreActive,
  updateStoreInfo,
  resetOwnerPassword,
  deleteStore,
} from "./actions";

export function StoreEditor({
  storeId,
  storeName,
  isActive,
}: {
  storeId: string;
  storeName: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(storeName);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const handleUpdateName = () => {
    setNameError(null);
    setNameSuccess(false);
    startTransition(async () => {
      const result = await updateStoreInfo(storeId, { name });
      if (result.error) {
        setNameError(result.error);
      } else {
        setNameSuccess(true);
        router.refresh();
      }
    });
  };

  const handleToggleActive = () => {
    startTransition(async () => {
      await toggleStoreActive(storeId, !isActive);
      router.refresh();
    });
  };

  const handleResetPassword = () => {
    setPasswordError(null);
    setPasswordSuccess(false);
    startTransition(async () => {
      const result = await resetOwnerPassword(storeId, { newPassword });
      if (result.error) {
        setPasswordError(result.error);
      } else {
        setPasswordSuccess(true);
        setNewPassword("");
      }
    });
  };

  const handleDelete = () => {
    if (!confirm("この店舗を完全に削除しますか？\n関連するすべての予約・ユーザーも削除されます。")) return;
    if (!confirm("本当に削除しますか？この操作は取り消せません。")) return;
    startTransition(async () => {
      await deleteStore(storeId);
    });
  };

  return (
    <div className="space-y-6">
      {/* 店舗名編集 */}
      <div className="rounded-lg border border-border p-4 space-y-3">
        <p className="text-sm font-medium">店舗情報</p>
        <div className="space-y-1.5">
          <Label htmlFor="store_name">店舗名</Label>
          <div className="flex gap-2">
            <Input
              id="store_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button onClick={handleUpdateName} disabled={isPending} variant="outline">
              保存
            </Button>
          </div>
          {nameError && <p className="text-xs text-destructive">{nameError}</p>}
          {nameSuccess && <p className="text-xs text-green-600">更新しました</p>}
        </div>
      </div>

      {/* オーナーPW再発行 */}
      <div className="rounded-lg border border-border p-4 space-y-3">
        <p className="text-sm font-medium">オーナーパスワード再発行</p>
        <div className="space-y-1.5">
          <Label htmlFor="new_password">新しいパスワード</Label>
          <div className="flex gap-2">
            <Input
              id="new_password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="6文字以上"
            />
            <Button
              onClick={handleResetPassword}
              disabled={isPending || newPassword.length < 6}
              variant="outline"
            >
              再発行
            </Button>
          </div>
          {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
          {passwordSuccess && <p className="text-xs text-green-600">パスワードを変更しました</p>}
        </div>
      </div>

      {/* 凍結・削除 */}
      <div className="rounded-lg border border-border p-4 space-y-3">
        <p className="text-sm font-medium">店舗操作</p>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleToggleActive}
            disabled={isPending}
            variant="outline"
            className={isActive ? "border-yellow-400 text-yellow-700 hover:bg-yellow-50" : "border-green-400 text-green-700 hover:bg-green-50"}
          >
            {isActive ? "凍結する" : "凍結を解除する"}
          </Button>
          <Button
            onClick={handleDelete}
            disabled={isPending}
            variant="outline"
            className="border-destructive text-destructive hover:bg-destructive/10"
          >
            店舗を削除
          </Button>
        </div>
      </div>
    </div>
  );
}
