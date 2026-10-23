"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function ReachChart({ data }: { data: { date: string; views: number }[] }) {
  return (
    <div className="h-64 w-full" role="img" aria-label="입력한 일자별 조회수 추이">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tickFormatter={(value: string) => value.slice(5)} tickLine={false} axisLine={false} fontSize={11} />
          <YAxis tickLine={false} axisLine={false} fontSize={11} width={52} tickFormatter={(value: number) => value.toLocaleString()} />
          <Tooltip formatter={(value) => `${Number(value).toLocaleString()}회`} />
          <Line type="monotone" dataKey="views" name="조회수" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
