"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatGrid, type Stat } from "@/components/stat-card";
import { repPerformance, STAGE_LABEL } from "@/lib/mock-data";
import { useCustomerStore } from "@/lib/customer-store";
import { formatKRW } from "@/lib/format";

export default function TeamPage() {
  const { customers } = useCustomerStore();
  const totalMrr = repPerformance.reduce((s, r) => s + r.mrr, 0);
  const totalQuota = repPerformance.reduce((s, r) => s + r.quota, 0);
  const totalWon = repPerformance.reduce((s, r) => s + r.won, 0);
  const totalPipeline = repPerformance.reduce((s, r) => s + r.pipeline, 0);

  const stats: Stat[] = [
    {
      label: "팀 전체 MRR",
      value: formatKRW(totalMrr),
      footerTitle: `쿼터 대비 ${Math.round((totalMrr / totalQuota) * 100)}%`,
    },
    {
      label: "이번 분기 계약",
      value: `${totalWon}건`,
      footerTitle: `${repPerformance.length}명 팀원`,
    },
    {
      label: "진행 중인 딜",
      value: `${totalPipeline}건`,
      footerTitle: "리드~제안 단계 합계",
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <p className="mt-1 text-sm text-muted-foreground">
          세일즈팀 담당자별 쿼터 달성 현황 · 총 {repPerformance.length}명
        </p>
      </div>

      <StatGrid stats={stats} className="grid-cols-1 @xl/main:grid-cols-3" />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {repPerformance.map((r) => {
          const pct = Math.min(100, Math.round((r.mrr / r.quota) * 100));
          return (
            <Card key={r.rep} className="shadow-xs">
              <CardHeader>
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                    {r.rep.slice(0, 2)}
                  </span>
                  <div className="min-w-0">
                    <CardTitle className="truncate text-sm font-medium">
                      {r.rep}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">세일즈 담당</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>쿼터 달성률</span>
                    <span className="font-medium text-foreground">{pct}%</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatKRW(r.mrr)} / {formatKRW(r.quota)}
                  </p>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">계약 완료</span>
                  <span className="font-medium tabular-nums">{r.won}건</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">진행 중인 딜</span>
                  <span className="font-medium tabular-nums">{r.pipeline}건</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="shadow-xs py-0">
        <CardHeader className="pt-5 pb-2">
          <CardTitle className="text-sm font-medium">담당 딜 전체 목록</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="[&_:is(th,td)]:px-4">
            <TableHeader>
              <TableRow>
                <TableHead>브랜드</TableHead>
                <TableHead className="text-center">단계</TableHead>
                <TableHead>담당 영업</TableHead>
                <TableHead className="text-right">예상 MRR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/customers?id=${c.id}`}
                      className="hover:underline"
                    >
                      {c.company}
                    </Link>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{STAGE_LABEL[c.stage]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.owner}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatKRW(c.dealValueMonthly)}
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
