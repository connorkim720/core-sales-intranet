import { HeartIcon, MessageCircleIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatGrid, type Stat } from "@/components/stat-card";
import { BarList } from "@/components/ad-monitor/cards";
import {
  PLATFORM_LABELS,
  formatCompact,
  getAnalysisStats,
  getComparison,
  getTrend,
} from "@/lib/ad-monitor/data";

const MATRIX_PLATFORMS = ["META_ADS", "TIKTOK_ADS", "INSTAGRAM"] as const;

export function AnalysisView() {
  const s = getAnalysisStats();
  const stats: Stat[] = [
    { label: "총 소재 수", value: `${s.totalCount}건` },
    { label: "평균 영상 길이", value: `${s.avgVideoDurationSec}초`, footerTitle: "오가닉 영상 기준" },
    { label: "소구 포인트 TOP", value: s.topAppealPoint },
    {
      label: "포맷 분포",
      value: s.topFormat.format,
      footerTitle: `전체의 ${s.topFormat.ratio}%`,
    },
  ];

  return (
    <div className="space-y-4">
      <StatGrid stats={stats} />

      <div className="grid gap-4 lg:grid-cols-2">
        <BarList title="훅 유형 분석" items={s.hookTypeCounts} />
        <BarList title="소구 포인트 TOP" items={s.appealPointCounts} />
      </div>

      <Card className="py-0 shadow-xs">
        <CardHeader className="pt-5 pb-2">
          <CardTitle className="text-sm font-medium">경쟁사 × 광고유형 매트릭스</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="[&_:is(th,td)]:px-4">
            <TableHeader>
              <TableRow>
                <TableHead>브랜드</TableHead>
                {MATRIX_PLATFORMS.map((p) => (
                  <TableHead key={p} className="text-right">
                    {PLATFORM_LABELS[p]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.matrix.map((row) => (
                <TableRow key={row.brandName}>
                  <TableCell className="font-medium">{row.brandName}</TableCell>
                  {MATRIX_PLATFORMS.map((p) => (
                    <TableCell key={p} className="text-right tabular-nums">
                      {row.counts[p] ?? 0}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export function CompareView() {
  const rows = getComparison();
  const maxEngagement = Math.max(
    1,
    ...rows.map((r) => r.totalLikes + r.totalComments + r.totalViews)
  );

  return (
    <div className="space-y-4">
      <Card className="py-0 shadow-xs">
        <CardContent className="p-0">
          <Table className="[&_:is(th,td)]:px-4">
            <TableHeader>
              <TableRow>
                <TableHead>경쟁사</TableHead>
                <TableHead className="text-right">총 광고 수</TableHead>
                <TableHead className="text-right">30일 신규</TableHead>
                <TableHead className="text-right">활성 광고</TableHead>
                <TableHead>주요 CTA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.competitorId}>
                  <TableCell className="font-medium">{r.brandName}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.totalAds}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.newLast30Days}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.activeAds}</TableCell>
                  <TableCell className="text-muted-foreground">{r.topCta}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle className="text-sm font-medium">참여도 비교 (좋아요+댓글+조회)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.map((r) => {
            const engagement = r.totalLikes + r.totalComments + r.totalViews;
            return (
              <div key={r.competitorId}>
                <div className="mb-1 flex justify-between text-xs">
                  <span>{r.brandName}</span>
                  <span className="flex items-center gap-2 text-muted-foreground tabular-nums">
                    <span className="flex items-center gap-0.5">
                      <HeartIcon className="size-3" /> {formatCompact(r.totalLikes)}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <MessageCircleIcon className="size-3" /> {formatCompact(r.totalComments)}
                    </span>
                    <span>조회 {formatCompact(r.totalViews)}</span>
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(engagement / maxEngagement) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

export function TrendsView() {
  const { categoryRanking, topHashtags, contentTypeRatio, topViewedPosts } = getTrend();
  const total = contentTypeRatio.reduce((s, x) => s + x.count, 0) || 1;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <BarList title="카테고리별 수집랭킹" items={categoryRanking} />
        <BarList
          title="같이 묶는 해시태그 TOP 15"
          items={topHashtags.map((h) => ({ label: `#${h.label}`, count: h.count }))}
        />
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="text-sm font-medium">컨텐츠 유형 비율</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {contentTypeRatio.map((c) => {
              const pct = Math.round((c.count / total) * 100);
              return (
                <div key={c.label}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>{c.label}</span>
                    <span className="text-muted-foreground tabular-nums">{pct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle className="text-sm font-medium">조회수 상위 12</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {topViewedPosts.map((post) => (
              <div
                key={post.id}
                className="relative aspect-square overflow-hidden rounded-2xl bg-muted"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://picsum.photos/seed/${post.id}/300/300`}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <div className="absolute top-1.5 left-1.5">
                  <Badge>{post.brandName}</Badge>
                </div>
                <div className="absolute right-1.5 bottom-1.5">
                  <Badge variant="secondary">{formatCompact(post.viewCount)}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
