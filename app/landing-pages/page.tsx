"use client";

import { ChartNoAxesCombinedIcon, ConstructionIcon, ExternalLinkIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CORERANK_REFERENCES_URL } from "@/lib/corerank-references";

const VARIANTS = ["A", "B", "C"] as const;

// GA4 연결 전 레이아웃을 검토하기 위한 고정 예시 데이터입니다.
const SAMPLE_METRICS = [
  { label: "방문 세션", value: "3,120", change: "+12.4%" },
  { label: "활성 사용자", value: "2,480", change: "+8.2%" },
  { label: "페이지 조회", value: "4,860", change: "+15.7%" },
  { label: "문의 버튼 클릭", value: "124", change: "+5.1%" },
] as const;

const SAMPLE_DAILY_SESSIONS = [
  { day: "월", count: 350 },
  { day: "화", count: 420 },
  { day: "수", count: 385 },
  { day: "목", count: 510 },
  { day: "금", count: 475 },
  { day: "토", count: 390 },
  { day: "일", count: 590 },
] as const;

const SAMPLE_SOURCES = [
  { name: "직접 유입", sessions: 1120, share: 36 },
  { name: "검색", sessions: 905, share: 29 },
  { name: "소셜", sessions: 687, share: 22 },
  { name: "기타", sessions: 408, share: 13 },
] as const;

function AnalyticsMockup() {
  const maxSessions = Math.max(...SAMPLE_DAILY_SESSIONS.map(({ count }) => count));

  return (
    <section aria-labelledby="ga4-mockup-title" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ChartNoAxesCombinedIcon className="size-4 text-primary" />
            <h2 id="ga4-mockup-title" className="text-base font-semibold">GA4 방문 현황</h2>
            <Badge variant="secondary">목업 · 예시 데이터</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            최근 7일 화면 예시입니다. 표시된 수치는 실제 방문 기록이 아닙니다.
          </p>
        </div>
        <span className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground">
          최근 7일 · 예시
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {SAMPLE_METRICS.map((metric) => (
          <Card key={metric.label} size="sm">
            <CardContent>
              <p className="text-xs text-muted-foreground">{metric.label}</p>
              <div className="mt-2 flex items-end justify-between gap-2">
                <strong className="text-2xl font-semibold tabular-nums">{metric.value}</strong>
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  {metric.change}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">이전 7일 대비 · 예시</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>일별 방문 세션</CardTitle>
            <p className="text-xs text-muted-foreground">랜딩페이지 A 유입 추이 · 예시</p>
          </CardHeader>
          <CardContent>
            <div className="flex h-44 items-end gap-2 border-b border-border pb-2 sm:gap-4" role="img" aria-label="예시 일별 세션: 월 350, 화 420, 수 385, 목 510, 금 475, 토 390, 일 590">
              {SAMPLE_DAILY_SESSIONS.map(({ day, count }) => (
                <div key={day} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <span className="text-[11px] tabular-nums text-muted-foreground">{count}</span>
                  <div className="flex min-h-0 w-full flex-1 items-end justify-center">
                    <div
                      className="w-full max-w-14 rounded-t-md bg-primary/75"
                      style={{ height: `${Math.round((count / maxSessions) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2 sm:gap-4">
              {SAMPLE_DAILY_SESSIONS.map(({ day }) => (
                <span key={day} className="flex-1 text-center text-xs text-muted-foreground">{day}</span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>유입 경로</CardTitle>
            <p className="text-xs text-muted-foreground">세션 기준 · 예시</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {SAMPLE_SOURCES.map((source) => (
              <div key={source.name}>
                <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                  <span>{source.name}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {source.sessions.toLocaleString("ko-KR")} · {source.share}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary/70" style={{ width: `${source.share}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        실제 지표를 보려면 코어랭크 레퍼런스에 GA4 태그를 설치하고 인트라넷에 GA4 조회 권한을 연결해야 합니다.
      </p>
    </section>
  );
}

export default function LandingPagesPage() {
  return (
    <div className="space-y-4">
      <p className="mt-1 text-sm text-muted-foreground">
        프론트에서 쓰는 랜딩페이지를 A/B/C로 나눠 관리합니다.
      </p>

      <Tabs defaultValue="A">
        <TabsList>
          {VARIANTS.map((variant) => (
            <TabsTrigger key={variant} value={variant}>{variant}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="A" className="mt-4 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold">랜딩페이지 A · 코어랭크 레퍼런스</h1>
                <Badge variant="outline">연결됨</Badge>
              </div>
              <p className="mt-1 break-all text-xs text-muted-foreground">
                {CORERANK_REFERENCES_URL}
              </p>
            </div>
            <Button asChild variant="outline" size="lg">
              <a href={CORERANK_REFERENCES_URL} target="_blank" rel="noopener noreferrer">
                <ExternalLinkIcon className="size-4" /> 랜딩페이지 열기
              </a>
            </Button>
          </div>

          <AnalyticsMockup />

          <section aria-label="랜딩페이지 A 미리보기" className="space-y-2">
            <h2 className="text-sm font-medium">랜딩페이지 미리보기</h2>
            <div className="h-[600px] overflow-hidden rounded-[min(var(--radius-4xl),24px)] bg-card shadow-xs ring-1 ring-foreground/5 dark:ring-foreground/10">
              <iframe
                src={CORERANK_REFERENCES_URL}
                title="랜딩페이지 A · 코어랭크 레퍼런스 미리보기"
                loading="lazy"
                className="h-full w-full border-0"
              />
            </div>
          </section>
        </TabsContent>

        {VARIANTS.filter((variant) => variant !== "A").map((variant) => (
          <TabsContent key={variant} value={variant} className="mt-4">
            <Card className="shadow-xs">
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <ConstructionIcon className="size-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  랜딩페이지 {variant} · 준비중입니다
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
