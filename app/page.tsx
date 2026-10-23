"use client";

import Link from "next/link";
import dayjs from "dayjs";
import { ArrowRightIcon, ChevronRightIcon, CircleIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RevenueTrendChart } from "@/components/charts/revenue-trend-chart";
import { calendarEvents, monthlyRevenue, STAGE_LABEL, STAGE_ORDER } from "@/lib/mock-data";
import { IRM_LIMIT, useCreatorIrm } from "@/lib/creator-irm-store";
import { useCustomerStore } from "@/lib/customer-store";
import { DEMO_TODAY, formatKRW, timeAgo } from "@/lib/format";

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-sm font-medium">
        <span className="size-2 rounded-full bg-primary" />
        {children}
      </h2>
      {action}
    </div>
  );
}

function SeeAll({ href, label = "전체 보기" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
    >
      {label} <ChevronRightIcon className="size-3" />
    </Link>
  );
}

export default function Dashboard() {
  const { customers } = useCustomerStore();
  const irm = useCreatorIrm();

  const today = DEMO_TODAY;
  const todayStr = today.format("YYYY-MM-DD");
  const tomorrowStr = today.add(1, "day").format("YYYY-MM-DD");

  const openDeals = customers.filter((c) => c.stage !== "won");
  const wonDeals = customers.filter((c) => c.stage === "won");
  const pipelineValue = openDeals.reduce((s, c) => s + c.dealValueMonthly, 0);
  const wonMrr = wonDeals.reduce((s, c) => s + c.dealValueMonthly, 0);
  const conversionRate = Math.round((wonDeals.length / (customers.length || 1)) * 100);

  // 오늘·내일까지 처리해야 하는 다음 액션(지난 것 포함)
  const dueSoon = customers
    .filter((c) => c.nextStepDue && c.nextStepDue <= tomorrowStr)
    .sort((a, b) => (a.nextStepDue! < b.nextStepDue! ? -1 : 1));
  const overdue = dueSoon.filter((c) => c.nextStepDue! < todayStr).length;

  const withDue = customers.filter((c) => c.nextStepDue);
  const dueWithin3Days = withDue.filter(
    (c) => c.nextStepDue! >= todayStr && c.nextStepDue! <= today.add(3, "day").format("YYYY-MM-DD")
  );

  const upcoming = calendarEvents
    .filter((e) => dayjs(e.at).isAfter(today))
    .sort((a, b) => (a.at < b.at ? -1 : 1))
    .slice(0, 6);

  const activity = customers
    .flatMap((c) => c.activities.map((a) => ({ ...a, company: c.company, customerId: c.id })))
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 5);

  const stageCounts = STAGE_ORDER.map((s) => ({
    stage: s,
    count: customers.filter((c) => c.stage === s).length,
  }));
  const maxStage = Math.max(1, ...stageCounts.map((s) => s.count));

  const irmCount = Object.keys(irm.entries).length;
  const dueRatio = withDue.length ? Math.round((dueWithin3Days.length / withDue.length) * 100) : 0;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xl text-muted-foreground">
            {today.format("M월 D일")} {WEEKDAY[today.day()]}요일
          </p>
          <h2 className="text-3xl font-semibold tracking-tight">오늘의 업무</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-2xl bg-muted px-3 py-1.5 text-xs tabular-nums text-muted-foreground">
            {today.format("MM.DD")} – {today.add(7, "day").format("MM.DD")}
          </span>
          <Button asChild className="h-9 py-2">
            <Link href="/calendar">
              캘린더 열기 <ArrowRightIcon className="size-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr_1fr]">
        {/* 영업 현황 */}
        <Card className="shadow-xs">
          <CardContent className="flex h-full flex-col gap-5">
            <SectionTitle>영업 현황</SectionTitle>
            <div>
              <p className="text-xs text-muted-foreground">계약 MRR</p>
              <p className="text-3xl font-semibold tabular-nums">{formatKRW(wonMrr)}</p>
              <p className="text-xs text-muted-foreground">{wonDeals.length}개 브랜드 계약 중</p>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-muted/60 px-3 py-2 text-sm">
              <span className="text-muted-foreground">파이프라인</span>
              <span className="font-medium tabular-nums">
                {openDeals.length}건 · {formatKRW(pipelineValue)}
              </span>
            </div>
            <div className="mt-auto grid grid-cols-2 gap-4 border-t pt-4">
              <div>
                <p className="text-2xl font-semibold tabular-nums">{customers.length}</p>
                <p className="text-xs text-muted-foreground">전체 고객사</p>
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums">{conversionRate}%</p>
                <p className="text-xs text-muted-foreground">리드→계약 전환율</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 단계별 분포 */}
        <Card className="shadow-xs">
          <CardContent className="flex h-full flex-col gap-4">
            <SectionTitle action={<SeeAll href="/pipeline" />}>파이프라인 분석</SectionTitle>
            <div className="flex gap-8">
              <div>
                <p className="text-xs text-muted-foreground">진행 중 딜</p>
                <p className="text-3xl font-semibold tabular-nums">{openDeals.length}건</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">계약 완료</p>
                <p className="text-3xl font-semibold tabular-nums">{wonDeals.length}건</p>
              </div>
            </div>
            <div className="mt-2 flex flex-1 items-end gap-5 pb-1">
              {stageCounts.map(({ stage, count }) => (
                <div key={stage} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="text-xs font-medium tabular-nums">{count}</span>
                  <div
                    className={`w-full max-w-14 rounded-2xl ${
                      stage === "won" ? "bg-primary" : "bg-primary/25"
                    }`}
                    style={{ height: `${Math.max(12, (count / maxStage) * 120)}px` }}
                  />
                  <span className="text-xs text-muted-foreground">{STAGE_LABEL[stage]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 오늘 */}
        <Card className="shadow-xs">
          <CardContent className="flex h-full flex-col gap-3">
            <div className="flex items-center justify-between">
              <SectionTitle>오늘·내일 액션</SectionTitle>
              <span className="text-2xl font-semibold tabular-nums">{dueSoon.length}</span>
            </div>
            {overdue > 0 && (
              <p className="text-xs text-destructive">기한이 지난 액션 {overdue}건</p>
            )}
            {dueSoon.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">처리할 액션이 없습니다</p>
            ) : (
              <ul className="space-y-2.5">
                {dueSoon.slice(0, 5).map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/customers?id=${c.id}`}
                      className="flex items-center gap-2.5 text-sm hover:underline"
                    >
                      <CircleIcon className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">
                        {c.company} · {c.nextStep}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {dayjs(c.nextStepDue).format("MM.DD")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1.3fr_1fr]">
        {/* 다가오는 일정 */}
        <Card className="shadow-xs">
          <CardContent className="flex flex-col gap-3">
            <SectionTitle action={<SeeAll href="/calendar" label="캘린더" />}>다가오는 일정</SectionTitle>
            {upcoming.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">예정된 일정이 없습니다</p>
            ) : (
              <ul className="divide-y">
                {upcoming.map((e) => (
                  <li key={e.id} className="flex items-center gap-4 py-2.5 first:pt-0">
                    <div className="w-12 shrink-0 text-xs tabular-nums text-muted-foreground">
                      <p>{dayjs(e.at).format("MM.DD")}</p>
                      <p>{dayjs(e.at).format("HH:mm")}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{e.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {e.company} · {e.owner}
                      </p>
                    </div>
                    <Badge variant="outline" className="font-normal">
                      {e.type === "call" ? "콜" : "미팅"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* 최근 활동 */}
        <Card className="shadow-xs">
          <CardContent className="flex flex-col gap-3">
            <SectionTitle action={<SeeAll href="/customers" />}>최근 활동</SectionTitle>
            <ul className="divide-y">
              {activity.map((a) => (
                <li key={`${a.customerId}-${a.id}`} className="py-2.5 first:pt-0">
                  <Link href={`/customers?id=${a.customerId}`} className="block hover:underline">
                    <p className="truncate text-sm">
                      <span className="font-medium">{a.company}</span> · {a.summary}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{timeAgo(a.at)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {/* 마감 임박 */}
          <Card className="shadow-xs">
            <CardContent className="space-y-2">
              <SectionTitle action={<SeeAll href="/pipeline" label="" />}>마감 임박</SectionTitle>
              <p className="text-3xl font-semibold tabular-nums text-destructive">
                {dueWithin3Days.length}
                <span className="ml-1 text-base text-muted-foreground">건</span>
              </p>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-destructive" style={{ width: `${dueRatio}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">
                3일 내 마감 {dueWithin3Days.length}건 / 전체 액션 {withDue.length}건 · {dueRatio}%
              </p>
            </CardContent>
          </Card>

          {/* 크리에이터 커뮤니티 */}
          <Card className="shadow-xs">
            <CardContent className="space-y-2">
              <SectionTitle action={<SeeAll href="/creator-irm" label="" />}>크리에이터 커뮤니티</SectionTitle>
              <p className="text-3xl font-semibold tabular-nums">
                {irmCount}
                <span className="ml-1 text-base text-muted-foreground">명</span>
              </p>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.min(100, (irmCount / IRM_LIMIT) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                컨택 중 {irmCount} / {IRM_LIMIT}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="shadow-xs">
        <CardContent className="space-y-3">
          <SectionTitle>MRR 추이 (최근 6개월)</SectionTitle>
          <RevenueTrendChart data={monthlyRevenue} />
        </CardContent>
      </Card>
    </>
  );
}
