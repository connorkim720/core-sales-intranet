"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function RevenueTrendChart({
  data,
}: {
  data: { month: string; mrr: number; newDeals: number }[];
}) {
  return (
    <div className="h-[260px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="mrrFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="month"
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
            formatter={(value) => [
              `${Number(value).toLocaleString()}원`,
              "MRR",
            ]}
          />
          <Area
            type="monotone"
            dataKey="mrr"
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill="url(#mrrFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
