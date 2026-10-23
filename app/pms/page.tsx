"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRightIcon, ExternalLinkIcon, Link2Icon, PencilIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatGrid, type Stat } from "@/components/stat-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCampaigns } from "@/lib/campaign-store";
import { useCreatorSettlements, type SettlementStatus } from "@/lib/creator-settlement-store";
import { useInfluencerStore } from "@/lib/influencer-store";
import { engagementRate, interactions, type ContentMetrics } from "@/lib/pms-metrics";

type PmsRow = {
  id: string;
  source: "manual" | "campaign";
  campaignId?: string;
  creatorId?: string;
  creatorName: string;
  campaignName: string;
  resultUrl: string;
  amount: number;
  settlementStatus: SettlementStatus;
  metrics: ContentMetrics;
};

type ContentFilter = "all" | "uploaded" | "needs-url" | "needs-metrics";

const EMPTY_METRICS: ContentMetrics = { views: 0, likes: 0, comments: 0, saves: 0, shares: 0 };
const METRIC_FIELDS: { key: keyof ContentMetrics; label: string }[] = [
  { key: "views", label: "조회수" },
  { key: "likes", label: "좋아요" },
  { key: "comments", label: "댓글" },
  { key: "saves", label: "저장" },
  { key: "shares", label: "공유" },
];

function webUrl(value: string) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

const count = (value: number) => value.toLocaleString("ko-KR");
const won = (value: number) => `${count(value)}원`;
const erText = (metrics: ContentMetrics) => {
  const value = engagementRate(metrics);
  return value === null ? "—" : `${value.toFixed(2)}%`;
};

export default function PmsPage() {
  const { campaigns, hydrated: campaignsReady, updateCreator } = useCampaigns();
  const { records, hydrated: recordsReady, update } = useCreatorSettlements();
  const { influencers } = useInfluencerStore();
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<ContentFilter>("all");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const ready = campaignsReady && recordsReady;

  const handles = new Map(influencers.map((creator) => [creator.id, creator.handle]));
  const campaignRows: PmsRow[] = campaigns.flatMap((campaign) =>
    campaign.creators.map((creator) => ({
      id: `campaign:${campaign.id}:${creator.influencerId}`,
      source: "campaign" as const,
      campaignId: campaign.id,
      creatorId: creator.influencerId,
      creatorName: handles.get(creator.influencerId) ?? creator.influencerId,
      campaignName: campaign.name,
      resultUrl: creator.uploadUrl,
      amount: creator.fee,
      settlementStatus: creator.paid ? "completed" as const : creator.settlementStatus === "processing" ? "processing" as const : "pending" as const,
      metrics: {
        views: creator.views,
        likes: creator.likes,
        comments: creator.comments,
        saves: creator.saves ?? 0,
        shares: creator.shares ?? 0,
      },
    }))
  );
  const manualRows: PmsRow[] = records.map((record) => ({
    id: record.id,
    source: "manual",
    creatorName: record.creatorName,
    campaignName: record.campaignName,
    resultUrl: record.resultUrl,
    amount: record.amount,
    settlementStatus: record.status,
    metrics: { ...EMPTY_METRICS, ...record.metrics },
  }));
  const rows = [...manualRows, ...campaignRows];
  const uploaded = rows.filter((row) => webUrl(row.resultUrl));
  const totalMetrics = uploaded.reduce<ContentMetrics>((sum, row) => ({
    views: sum.views + row.metrics.views,
    likes: sum.likes + row.metrics.likes,
    comments: sum.comments + row.metrics.comments,
    saves: sum.saves + row.metrics.saves,
    shares: sum.shares + row.metrics.shares,
  }), { ...EMPTY_METRICS });
  const unsettledMetrics = uploaded.filter((row) => row.metrics.views === 0).length;
  const totalAmount = uploaded.reduce((sum, row) => sum + row.amount, 0);
  const stats: Stat[] = [
    { label: "업로드 콘텐츠", value: `${uploaded.length}건`, footerTitle: `성과 입력 필요 ${unsettledMetrics}건` },
    { label: "총 조회수", value: count(totalMetrics.views), footerTitle: `상호작용 ${count(interactions(totalMetrics))}건` },
    { label: "전체 ER · 조회 기준", value: erText(totalMetrics), footerTitle: "(좋아요+댓글+저장+공유) ÷ 조회수" },
    { label: "연결된 지급 예정액", value: won(totalAmount), footerTitle: `완료로 기록 ${uploaded.filter((row) => row.settlementStatus === "completed").length}건` },
  ];

  const needle = query.trim().toLocaleLowerCase();
  const visible = rows.filter((row) => {
    const hasUrl = Boolean(webUrl(row.resultUrl));
    if (filter === "uploaded" && !hasUrl) return false;
    if (filter === "needs-url" && hasUrl) return false;
    if (filter === "needs-metrics" && (!hasUrl || row.metrics.views > 0)) return false;
    return !needle || [row.creatorName, row.campaignName].some((value) => value.toLocaleLowerCase().includes(needle));
  });
  const topContent = uploaded.filter((row) => row.metrics.views > 0)
    .sort((a, b) => b.metrics.views - a.metrics.views)
    .slice(0, 5);
  const maxViews = topContent[0]?.metrics.views ?? 1;
  const editing = rows.find((row) => row.id === editingId);

  const saveMetrics = (row: PmsRow, resultUrl: string, metrics: ContentMetrics) => {
    if (row.source === "campaign" && row.campaignId && row.creatorId) {
      updateCreator(row.campaignId, row.creatorId, { uploadUrl: resultUrl, ...metrics });
    } else if (row.source === "manual") {
      update(row.id, { resultUrl, metrics });
    }
    setEditingId(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">PMS · 콘텐츠 성과</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            정산 목록의 크리에이터와 결과 URL을 가져와 업로드 콘텐츠의 ER을 관리합니다.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/creator-settlements"><Link2Icon className="size-4" /> 정산 목록 열기</Link>
        </Button>
      </div>

      <Card className="border-primary/15 bg-primary/5 shadow-xs">
        <CardContent className="space-y-1">
          <p className="text-sm font-medium">인트라넷 정산 기록 연결됨</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            캠페인에 등록한 크리에이터와 직접 등록한 정산 건을 함께 표시합니다. ER은 조회수 기준
            (좋아요 + 댓글 + 저장 + 공유) ÷ 조회수 × 100으로 계산하며, 수치는 직접 입력합니다.
            현재 기록은 이 브라우저에 저장됩니다.
          </p>
        </CardContent>
      </Card>

      {ready && <StatGrid stats={stats} />}

      <Card>
        <CardHeader>
          <CardTitle>조회수 상위 콘텐츠</CardTitle>
          <p className="text-xs text-muted-foreground">결과 URL과 조회수가 등록된 콘텐츠 기준</p>
        </CardHeader>
        <CardContent>
          {!ready ? (
            <p className="py-6 text-center text-sm text-muted-foreground">콘텐츠를 불러오는 중입니다.</p>
          ) : topContent.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">결과 URL과 조회수를 입력하면 성과가 표시됩니다.</p>
          ) : (
            <div className="space-y-4">
              {topContent.map((row) => (
                <div key={row.id} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-xs sm:grid-cols-[minmax(0,14rem)_1fr_auto]">
                  <span className="truncate font-medium">@{row.creatorName.replace(/^@/, "")}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary/80" style={{ width: `${Math.max(2, (row.metrics.views / maxViews) * 100)}%` }} />
                  </div>
                  <span className="min-w-22 text-right tabular-nums">{count(row.metrics.views)} · ER {erText(row.metrics)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="py-0 shadow-xs">
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
            <div>
              <p className="text-sm font-semibold">콘텐츠 목록</p>
              <p className="text-xs text-muted-foreground">표시 {visible.length}건 · 정산 건 {rows.length}건</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="크리에이터·캠페인 검색"
                aria-label="크리에이터 또는 캠페인 검색"
                className="w-52"
              />
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value as ContentFilter)}
                aria-label="콘텐츠 상태 필터"
                className="h-8 rounded-lg border border-border bg-background px-2 text-xs"
              >
                <option value="all">전체</option>
                <option value="uploaded">URL 등록됨</option>
                <option value="needs-url">URL 필요</option>
                <option value="needs-metrics">성과 입력 필요</option>
              </select>
            </div>
          </div>

          {!ready ? (
            <p className="px-5 py-12 text-center text-sm text-muted-foreground">콘텐츠를 불러오는 중입니다.</p>
          ) : visible.length === 0 ? (
            <div className="space-y-2 px-5 py-12 text-center text-sm text-muted-foreground">
              <p>{rows.length === 0 ? "정산 건을 등록하면 이곳에 나타납니다." : "조건에 맞는 콘텐츠가 없습니다."}</p>
              {rows.length === 0 && <Link href="/creator-settlements/new" className="text-primary hover:underline">정산 건 등록하기</Link>}
            </div>
          ) : (
            <Table className="[&_:is(th,td)]:px-4">
              <TableHeader>
                <TableRow>
                  <TableHead>크리에이터 / 캠페인</TableHead>
                  <TableHead>결과</TableHead>
                  <TableHead className="text-right">조회</TableHead>
                  <TableHead className="text-right">상호작용</TableHead>
                  <TableHead className="text-right">ER</TableHead>
                  <TableHead className="text-right">지급 예정</TableHead>
                  <TableHead>정산 상태</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((row) => {
                  const url = webUrl(row.resultUrl);
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <p className="font-medium">@{row.creatorName.replace(/^@/, "")}</p>
                        <p className="max-w-44 truncate text-xs text-muted-foreground">{row.campaignName || "캠페인 미입력"}</p>
                      </TableCell>
                      <TableCell>
                        {url ? (
                          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                            콘텐츠 열기 <ExternalLinkIcon className="size-3" />
                          </a>
                        ) : <Badge variant="outline">URL 필요</Badge>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{row.metrics.views > 0 ? count(row.metrics.views) : "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.metrics.views > 0 ? count(interactions(row.metrics)) : "—"}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{url ? erText(row.metrics) : "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{won(row.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={row.settlementStatus === "completed" ? "secondary" : "outline"}>
                          {row.settlementStatus === "completed" ? "완료로 기록" : row.settlementStatus === "processing" ? "정산 중" : "대기"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="xs" variant="outline" onClick={() => setEditingId(row.id)}>
                          <PencilIcon className="size-3" /> 성과 입력
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        ER은 콘텐츠 조회 기준 수동 입력 지표이며 SNS에서 자동 수집하지 않습니다. 지급 상태는 정산 목록에서 변경합니다.
        <Link href="/creator-settlements" className="ml-1 inline-flex items-center gap-0.5 text-primary hover:underline">
          정산 목록 <ArrowUpRightIcon className="size-3" />
        </Link>
      </p>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
          {editing && (
            <MetricsForm key={editing.id} row={editing} onSave={(url, metrics) => saveMetrics(editing, url, metrics)} onCancel={() => setEditingId(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricsForm({
  row,
  onSave,
  onCancel,
}: {
  row: PmsRow;
  onSave: (url: string, metrics: ContentMetrics) => void;
  onCancel: () => void;
}) {
  const [resultUrl, setResultUrl] = React.useState(row.resultUrl);
  const [values, setValues] = React.useState<Record<keyof ContentMetrics, string>>({
    views: String(row.metrics.views),
    likes: String(row.metrics.likes),
    comments: String(row.metrics.comments),
    saves: String(row.metrics.saves),
    shares: String(row.metrics.shares),
  });
  const [error, setError] = React.useState("");

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const url = resultUrl.trim();
    if (url && !webUrl(url)) {
      setError("결과 URL은 http 또는 https 주소로 입력해 주세요.");
      return;
    }
    const metrics = Object.fromEntries(METRIC_FIELDS.map(({ key }) => [key, Number(values[key])])) as ContentMetrics;
    if (METRIC_FIELDS.some(({ key }) => !Number.isSafeInteger(metrics[key]) || metrics[key] < 0)) {
      setError("성과 수치는 0 이상의 정수로 입력해 주세요.");
      return;
    }
    onSave(url, metrics);
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <DialogHeader>
        <DialogTitle>성과 입력 · @{row.creatorName.replace(/^@/, "")}</DialogTitle>
        <DialogDescription>결과 URL과 콘텐츠에서 확인한 수치를 입력합니다.</DialogDescription>
      </DialogHeader>

      <div className="space-y-2">
        <Label htmlFor="pms-result-url">결과 URL</Label>
        <Input
          id="pms-result-url"
          type="url"
          value={resultUrl}
          onChange={(event) => setResultUrl(event.target.value)}
          placeholder="https://..."
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {METRIC_FIELDS.map(({ key, label }) => (
          <div key={key} className="space-y-2">
            <Label htmlFor={`pms-${key}`}>{label}</Label>
            <Input
              id={`pms-${key}`}
              type="number"
              min="0"
              step="1"
              value={values[key]}
              onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))}
              required
            />
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">ER = (좋아요 + 댓글 + 저장 + 공유) ÷ 조회수 × 100</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>취소</Button>
        <Button type="submit">성과 저장</Button>
      </DialogFooter>
    </form>
  );
}
