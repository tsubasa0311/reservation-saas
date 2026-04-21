"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type {
  PlayerMaster,
  ResolvedCourse,
  ResolvedNominationFee,
  ResolvedExtension,
  ResolvedOption,
} from "@/lib/pricing/get-player-master";
import { createReservation } from "./actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ----------------------------------------------------------------
// Schema
// ----------------------------------------------------------------

// Radix Select は value="" を許さないため「なし」用の sentinel
const EXT_NONE = "__none__";

const formSchema = z.object({
  customer_type: z.enum(["new", "member"]),
  customer_name: z.string().trim().min(1, "顧客名を入力してください"),
  reservation_channel: z.enum(["line", "mail", "dm", "phone"]),
  meeting_method: z.enum(["meetup", "hotel", "home", "dm"]),
  start_at: z
    .string()
    .min(1, "開始日時を入力してください")
    .refine((v) => {
      const d = new Date(v);
      return !isNaN(d.getTime()) && d.getTime() >= Date.now() - 60 * 1000;
    }, "過去の日時は選択できません"),
  nomination_type: z.enum(["first", "repeat"]),
  course_id: z.string().min(1, "コースを選択してください"),
  extension_id: z.string(), // "" = なし
  transport_fee: z
    .string()
    .min(1, "交通費を入力してください（0円の場合は0と入力）")
    .pipe(z.coerce.number().int().min(0).max(1_000_000)),
  payment_method: z.enum(["cash", "card"]),
});

type FormValues = z.input<typeof formSchema>;

// ----------------------------------------------------------------
// Price calculation (Step 4-3)
// ----------------------------------------------------------------

function calcTotals({
  course,
  nominationFee,
  extension,
  options,
  transportFee,
  transportBackRate,
}: {
  course: ResolvedCourse | null;
  nominationFee: ResolvedNominationFee | null;
  extension: ResolvedExtension | null;
  options: Array<{ option: ResolvedOption; quantity: number }>;
  transportFee: number;
  transportBackRate: number;
}) {
  const courseFee = course?.price ?? 0;
  const courseBack = course ? Math.floor((courseFee * course.back_rate) / 100) : 0;

  const nomFee = nominationFee?.price ?? 0;
  const nomBack = nominationFee ? Math.floor((nomFee * nominationFee.back_rate) / 100) : 0;

  const extFee = extension?.price ?? 0;
  const extBack = extension ? Math.floor((extFee * extension.back_rate) / 100) : 0;

  const optTotal = options.reduce((s, { option, quantity }) => s + option.price * quantity, 0);
  const optBack = options.reduce(
    (s, { option, quantity }) => s + Math.floor((option.price * quantity * option.back_rate) / 100),
    0,
  );

  const transportBack = Math.floor((transportFee * transportBackRate) / 100);

  const total = courseFee + nomFee + extFee + optTotal + transportFee;
  const playerBack = courseBack + nomBack + extBack + optBack + transportBack;

  return { total, playerBack };
}

// ----------------------------------------------------------------
// Sub-components
// ----------------------------------------------------------------

type RadioOption = { value: string; label: string };

function RadioGroup({
  label,
  name,
  options,
  value,
  onChange,
  error,
}: {
  label: string;
  name: string;
  options: RadioOption[];
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-3">
        {options.map((opt) => (
          <label key={opt.value} className="flex cursor-pointer items-center gap-1.5 text-sm">
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="accent-primary"
            />
            {opt.label}
          </label>
        ))}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ----------------------------------------------------------------
// Main form
// ----------------------------------------------------------------

export function NewReservationForm({
  master,
  playerId,
  backRateTransport,
}: {
  master: PlayerMaster;
  playerId: string;
  backRateTransport: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [minDateTime, setMinDateTime] = useState<string>("");

  // datetime-local の min 属性は SSR と CSR で値が分かれないようマウント後に設定
  useEffect(() => {
    const update = () => {
      const now = new Date();
      now.setSeconds(0, 0);
      const tzOffsetMs = now.getTimezoneOffset() * 60 * 1000;
      const local = new Date(now.getTime() - tzOffsetMs);
      setMinDateTime(local.toISOString().slice(0, 16));
    };
    update();
    const id = setInterval(update, 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Options state outside RHF (checkbox + quantity)
  const [selectedOptions, setSelectedOptions] = useState<Map<string, number>>(
    new Map(),
  );

  const {
    register,
    control,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema) as unknown as Resolver<FormValues>,
    defaultValues: {
      customer_type: "new",
      customer_name: "",
      reservation_channel: "line",
      meeting_method: "meetup",
      start_at: "",
      nomination_type: "first",
      course_id: "",
      extension_id: "",
      transport_fee: "",
      payment_method: "cash",
    },
  });

  const watchedValues = watch();

  // Resolve current selections for calc
  const selectedCourse = useMemo(
    () => master.courses.find((c) => c.id === watchedValues.course_id) ?? null,
    [master.courses, watchedValues.course_id],
  );
  const selectedNomination = useMemo(
    () =>
      master.nominationFees.find((n) => n.type === watchedValues.nomination_type) ?? null,
    [master.nominationFees, watchedValues.nomination_type],
  );
  const selectedExtension = useMemo(
    () =>
      watchedValues.extension_id
        ? (master.extensions.find((e) => e.id === watchedValues.extension_id) ?? null)
        : null,
    [master.extensions, watchedValues.extension_id],
  );
  const selectedOptionsList = useMemo(
    () =>
      Array.from(selectedOptions.entries())
        .map(([id, quantity]) => {
          const opt = master.options.find((o) => o.id === id);
          return opt ? { option: opt, quantity } : null;
        })
        .filter((x): x is { option: ResolvedOption; quantity: number } => x !== null),
    [master.options, selectedOptions],
  );

  const { total, playerBack } = useMemo(
    () =>
      calcTotals({
        course: selectedCourse,
        nominationFee: selectedNomination,
        extension: selectedExtension,
        options: selectedOptionsList,
        transportFee: Number(watchedValues.transport_fee) || 0,
        transportBackRate: backRateTransport,
      }),
    [selectedCourse, selectedNomination, selectedExtension, selectedOptionsList, watchedValues.transport_fee, backRateTransport],
  );

  const endTime = useMemo(() => {
    if (!watchedValues.start_at || !selectedCourse) return null;
    const start = new Date(watchedValues.start_at);
    if (isNaN(start.getTime())) return null;
    const totalMin = selectedCourse.duration_min + (selectedExtension?.duration_min ?? 0);
    return new Date(start.getTime() + totalMin * 60 * 1000);
  }, [watchedValues.start_at, selectedCourse, selectedExtension]);

  const onSubmit = (values: FormValues) => {
    setServerError(null);
    const optionsPayload = Array.from(selectedOptions.entries()).map(
      ([option_id, quantity]) => ({ option_id, quantity }),
    );
    const startAtIso = new Date(values.start_at).toISOString();
    startTransition(async () => {
      const result = await createReservation({
        customer_type: values.customer_type,
        customer_name: values.customer_name,
        reservation_channel: values.reservation_channel,
        meeting_method: values.meeting_method,
        start_at: startAtIso,
        nomination_type: values.nomination_type,
        course_id: values.course_id,
        extension_id: values.extension_id || null,
        transport_fee: Number(values.transport_fee) || 0,
        payment_method: values.payment_method,
        options: optionsPayload,
        playerId,
      });
      if (!result.success) {
        setServerError(result.error);
        return;
      }
      router.push(`/player/reservations/${result.reservationId}`);
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {/* 1. 顧客区分 */}
      <Controller
        name="customer_type"
        control={control}
        render={({ field }) => (
          <RadioGroup
            label="顧客区分"
            name="customer_type"
            options={[
              { value: "new", label: "新規" },
              { value: "member", label: "会員" },
            ]}
            value={field.value}
            onChange={field.onChange}
            error={errors.customer_type?.message}
          />
        )}
      />

      {/* 2. 顧客名 */}
      <div className="space-y-1.5">
        <Label htmlFor="customer_name">顧客名</Label>
        <Input
          id="customer_name"
          type="text"
          aria-invalid={errors.customer_name ? true : undefined}
          {...register("customer_name")}
        />
        {errors.customer_name && (
          <p className="text-xs text-destructive">{errors.customer_name.message}</p>
        )}
      </div>

      {/* 3. 予約方法 */}
      <Controller
        name="reservation_channel"
        control={control}
        render={({ field }) => (
          <RadioGroup
            label="予約方法"
            name="reservation_channel"
            options={[
              { value: "line", label: "LINE" },
              { value: "mail", label: "メール" },
              { value: "dm", label: "DM" },
              { value: "phone", label: "電話" },
            ]}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />

      {/* 4. 合流方法 */}
      <Controller
        name="meeting_method"
        control={control}
        render={({ field }) => (
          <RadioGroup
            label="合流方法"
            name="meeting_method"
            options={[
              { value: "meetup", label: "待ち合わせ" },
              { value: "hotel", label: "ホテル先入り" },
              { value: "home", label: "自宅" },
              { value: "dm", label: "DMにて" },
            ]}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />

      {/* 5. 開始日時 */}
      <div className="space-y-1.5">
        <Label htmlFor="start_at">開始日時 <span className="text-destructive">*</span></Label>
        <Input
          id="start_at"
          type="datetime-local"
          min={minDateTime || undefined}
          aria-invalid={errors.start_at ? true : undefined}
          {...register("start_at")}
        />
        {endTime && (
          <p className="text-xs text-muted-foreground">
            終了予定：
            {endTime.toLocaleString("ja-JP", {
              month: "numeric",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
        {errors.start_at && (
          <p className="text-xs text-destructive">{errors.start_at.message ?? "開始日時を入力してください"}</p>
        )}
      </div>

      {/* 6. 指名種別 */}
      <Controller
        name="nomination_type"
        control={control}
        render={({ field }) => (
          <RadioGroup
            label="指名種別"
            name="nomination_type"
            options={[
              {
                value: "first",
                label: `初指名（¥${(master.nominationFees.find((n) => n.type === "first")?.price ?? 0).toLocaleString()}）`,
              },
              {
                value: "repeat",
                label: `本指名（¥${(master.nominationFees.find((n) => n.type === "repeat")?.price ?? 0).toLocaleString()}）`,
              },
            ]}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />

      {/* 7. コース */}
      <div className="space-y-1.5">
        <Label>コース <span className="text-destructive">*</span></Label>
        <Controller
          name="course_id"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full" aria-invalid={errors.course_id ? true : undefined}>
                <SelectValue placeholder="コースを選択">
                  {selectedCourse
                    ? `${selectedCourse.name} ／ ¥${selectedCourse.price.toLocaleString()}`
                    : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {master.courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}（{c.duration_min}分）／¥{c.price.toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.course_id && (
          <p className="text-xs text-destructive">{errors.course_id.message}</p>
        )}
      </div>

      {/* 8. 延長 */}
      <div className="space-y-1.5">
        <Label>延長</Label>
        <Controller
          name="extension_id"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value === "" ? EXT_NONE : field.value}
              onValueChange={(v) => field.onChange(v === EXT_NONE ? "" : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="なし">
                  {selectedExtension
                    ? `${selectedExtension.name} ／ ¥${selectedExtension.price.toLocaleString()}`
                    : "なし"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EXT_NONE}>なし</SelectItem>
                {master.extensions.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}（{e.duration_min}分）／¥{e.price.toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* 9. オプション */}
      {master.options.length > 0 && (
        <div className="space-y-1.5">
          <Label>オプション</Label>
          <div className="space-y-2 rounded-lg border border-border p-3">
            {master.options.map((opt) => {
              const qty = selectedOptions.get(opt.id);
              const checked = qty !== undefined;
              return (
                <div key={opt.id} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id={`opt-${opt.id}`}
                    checked={checked}
                    onChange={(e) => {
                      const next = new Map(selectedOptions);
                      if (e.target.checked) {
                        next.set(opt.id, 1);
                      } else {
                        next.delete(opt.id);
                      }
                      setSelectedOptions(next);
                    }}
                    className="accent-primary"
                  />
                  <label htmlFor={`opt-${opt.id}`} className="flex-1 text-sm">
                    {opt.name} – ¥{opt.price.toLocaleString()}
                  </label>
                  {checked && (
                    <Input
                      type="number"
                      min={1}
                      max={99}
                      value={qty}
                      onChange={(e) => {
                        const next = new Map(selectedOptions);
                        next.set(opt.id, Math.max(1, Number(e.target.value)));
                        setSelectedOptions(next);
                      }}
                      className="w-16"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 10. 交通費 */}
      <div className="space-y-1.5">
        <Label htmlFor="transport_fee">交通費（円）</Label>
        <Input
          id="transport_fee"
          type="number"
          min={0}
          {...register("transport_fee")}
        />
      </div>

      {/* 11. 支払い方法 */}
      <Controller
        name="payment_method"
        control={control}
        render={({ field }) => (
          <RadioGroup
            label="支払い方法"
            name="payment_method"
            options={[
              { value: "cash", label: "現金" },
              { value: "card", label: "クレジットカード" },
            ]}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />

      {/* 金額プレビュー */}
      <div className="rounded-lg bg-muted p-4 space-y-1.5 text-sm">
        <div className="flex justify-between font-medium">
          <span>合計金額</span>
          <span>¥{total.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>バック額（目安）</span>
          <span>¥{playerBack.toLocaleString()}</span>
        </div>
      </div>

      {serverError && (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "送信中..." : "仮予約として保存"}
      </Button>
    </form>
  );
}
