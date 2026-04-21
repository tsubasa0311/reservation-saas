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
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(v: number) => `¥${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
        <Tooltip
          formatter={(value, name) => [
            `¥${Number(value).toLocaleString()}`,
            name === "sales" ? "売上" : "バック",
          ]}
        />
        <Bar dataKey="sales" name="sales" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
        <Bar dataKey="back" name="back" fill="hsl(var(--muted-foreground))" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
