"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatGrid, type Stat } from "@/components/stat-card";
import {
  monthlyRevenue,
  repPerformance,
  sourceBreakdown,
} from "@/lib/mock-data";
import { useCustomerStore } from "@/lib/customer-store";
import { formatKRW } from "@/lib/format";
import { RevenueTrendChart } from "@/components/charts/revenue-trend-chart";
import { SourcePieChart } from "@/components/charts/source-pie-chart";
import { RepPerformanceChart } from "@/components/charts/rep-performance-chart";

export default function ReportsPage() {
  const { customers } = useCustomerStore();
  const wonCount = customers.filter((c) => c.stage === "won").length;
  const totalQuota = repPerformance.reduce((s, r) => s + r.quota, 0);
  const totalMrr = repPerformance.reduce((s, r) => s + r.mrr, 0);
  const quotaAttainment = Math.round((totalMrr / totalQuota) * 100);
  const avgCycleDays = 21;

  const stats: Stat[] = [
    {
      label: "이번 분기 신규 계약",
      value: `${wonCount}건`,
      footerTitle: "결과기반 과금 온보딩 포함",
    },
    {
      label: "팀 쿼터 달성률",
      value: `${quotaAttainment}%`,
      badge: {
        text: quotaAttainment >= 80 ? "목표 근접" : "추격 필요",
        tone: quotaAttainment >= 80 ? "success" : "warning",
      },
      footerTitle: `${formatKRW(totalMrr)} / ${formatKRW(totalQuota)}`,
    },
    {
      label: "평균 세일즈 사이클",
      value: `${avgCycleDays}일`,
      footerTitle: "리드 생성 → 계약 체결",
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <p className="mt-1 text-sm text-muted-foreground">
          영업 성과 · 유입경로 · 담당자별 파이프라인 리포트
        </p>
      </div>

      <StatGrid stats={stats} className="grid-cols-1 @xl/main:grid-cols-3" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="text-sm font-medium">유입경로 분포</CardTitle>
          </CardHeader>
          <CardContent>
            <SourcePieChart data={sourceBreakdown} />
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              담당자별 MRR vs 쿼터
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RepPerformanceChart data={repPerformance} />
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle className="text-sm font-medium">MRR 추이</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueTrendChart data={monthlyRevenue} />
        </CardContent>
      </Card>

      <Card className="shadow-xs py-0">
        <CardHeader className="pt-5 pb-2">
          <CardTitle className="text-sm font-medium">담당자별 성과</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="[&_:is(th,td)]:px-4">
            <TableHeader>
              <TableRow>
                <TableHead>담당자</TableHead>
                <TableHead className="text-right">계약</TableHead>
                <TableHead className="text-right">진행 중</TableHead>
                <TableHead className="text-right">MRR</TableHead>
                <TableHead className="text-right">쿼터</TableHead>
                <TableHead className="text-right">달성률</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {repPerformance.map((r) => (
                <TableRow key={r.rep}>
                  <TableCell className="font-medium">{r.rep}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.won}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.pipeline}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatKRW(r.mrr)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatKRW(r.quota)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {Math.round((r.mrr / r.quota) * 100)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
