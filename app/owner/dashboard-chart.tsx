"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type PlayerSales = { name: string; sales: number; back: number };

export function DashboardChart({ data }: { data: PlayerSales[] }) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">データがありません</p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
        <YAxis
          tickFormatter={(v: number) => `¥${(v / 1000).toFixed(0)}k`}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <Tooltip
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: "0.5rem",
            color: "var(--popover-foreground)",
          }}
          formatter={(value, name) => [
            `¥${Number(value).toLocaleString()}`,
            name === "sales" ? "売上" : "バック",
          ]}
        />
        <Bar dataKey="sales" name="sales" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
        <Bar dataKey="back" name="back" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
