"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function RepPerformanceChart({
  data,
}: {
  data: { rep: string; mrr: number; quota: number }[];
}) {
  return (
    <div className="h-[260px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="rep"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={48}
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
            tickFormatter={(v) => `${Math.round(v / 1_000_000)}백만`}
          />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              fontSize: 12,
            }}
            formatter={(value) => `${Number(value).toLocaleString()}원`}
          />
          <Bar dataKey="quota" fill="var(--muted)" radius={[6, 6, 0, 0]} />
          <Bar dataKey="mrr" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
