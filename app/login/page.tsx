"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { login } from "@/lib/auth/login";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const formSchema = z.object({
  storeCode: z.string().trim().max(50),
  loginId: z.string().trim().min(1, "ログインIDを入力してください").max(50),
  password: z.string().min(1, "パスワードを入力してください").max(100),
});

type FormValues = z.infer<typeof formSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { storeCode: "", loginId: "", password: "" },
  });

  const onSubmit = (values: FormValues) => {
    setServerError(null);
    startTransition(async () => {
      const result = await login(values);
      if (!result.success) {
        setServerError(result.error);
        return;
      }
      if (result.role === "player") {
        router.push("/player");
      } else if (result.role === "super_admin") {
        router.push("/admin");
      } else {
        router.push("/owner");
      }
      router.refresh();
    });
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-border/60 bg-card/80 p-8 shadow-xl shadow-primary/5 backdrop-blur">
        <header className="space-y-2 text-center">
          <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">ログイン</h1>
          <p className="text-sm text-muted-foreground">
            店舗コード・ログインID・パスワードを入力してください
          </p>
        </header>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-1.5">
            <Label htmlFor="storeCode">店舗コード</Label>
            <Input
              id="storeCode"
              type="text"
              autoComplete="organization"
              placeholder="例: TEST001（管理者は空欄）"
              aria-invalid={errors.storeCode ? true : undefined}
              {...register("storeCode")}
            />
            {errors.storeCode && (
              <p className="text-xs text-destructive">
                {errors.storeCode.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="loginId">ログインID</Label>
            <Input
              id="loginId"
              type="text"
              autoComplete="username"
              aria-invalid={errors.loginId ? true : undefined}
              {...register("loginId")}
            />
            {errors.loginId && (
              <p className="text-xs text-destructive">
                {errors.loginId.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">パスワード</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={errors.password ? true : undefined}
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          {serverError && (
            <p
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {serverError}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "ログイン中..." : "ログイン"}
          </Button>
        </form>
      </div>
    </main>
  );
}
