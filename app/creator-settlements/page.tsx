"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRightIcon, ExternalLinkIcon, PlusIcon, SearchIcon, WalletIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { engagementRate, type ContentMetrics } from "@/lib/pms-metrics";

type StatusFilter = "all" | SettlementStatus;
type SettlementRow = {
  id: string;
  source: "campaign" | "manual";
  campaignId?: string;
  creatorId?: string;
  creatorName: string;
  campaignName: string;
  resultUrl: string;
  amount: number;
  metrics: ContentMetrics;
  status: SettlementStatus;
};

const STATUS_OPTIONS: { value: SettlementStatus; label: string }[] = [
  { value: "pending", label: "대기" },
  { value: "processing", label: "정산 중" },
  { value: "completed", label: "완료로 기록" },
];

const won = (amount: number) => `${amount.toLocaleString("ko-KR")}원`;

function safeResultUrl(value: string) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export default function CreatorSettlementsPage() {
  const { campaigns, hydrated: campaignsReady, updateCreator } = useCampaigns();
  const { records, hydrated: recordsReady, update } = useCreatorSettlements();
  const { influencers } = useInfluencerStore();
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("all");
  const ready = campaignsReady && recordsReady;

  const handles = new Map(influencers.map((creator) => [creator.id, creator.handle]));
  const campaignRows: SettlementRow[] = campaigns.flatMap((campaign) =>
    campaign.creators.map((creator) => ({
      id: `campaign:${campaign.id}:${creator.influencerId}`,
      source: "campaign" as const,
      campaignId: campaign.id,
      creatorId: creator.influencerId,
      creatorName: handles.get(creator.influencerId) ?? creator.influencerId,
      campaignName: campaign.name,
      resultUrl: creator.uploadUrl,
      amount: creator.fee,
      metrics: {
        views: creator.views,
        likes: creator.likes,
        comments: creator.comments,
        saves: creator.saves ?? 0,
        shares: creator.shares ?? 0,
      },
      status: creator.paid ? "completed" as const : creator.settlementStatus === "processing" ? "processing" as const : "pending" as const,
    }))
  );
  const manualRows: SettlementRow[] = records.map((record) => ({
    id: record.id,
    source: "manual",
    creatorName: record.creatorName,
    campaignName: record.campaignName,
    resultUrl: record.resultUrl,
    amount: record.amount,
    metrics: { views: 0, likes: 0, comments: 0, saves: 0, shares: 0, ...record.metrics },
    status: record.status,
  }));
  const rows = [...manualRows, ...campaignRows];

  const payable = rows.reduce((sum, row) => sum + row.amount, 0);
  const completedRows = rows.filter((row) => row.status === "completed");
  const completed = completedRows.reduce((sum, row) => sum + row.amount, 0);
  const stats: Stat[] = [
    { label: "지급 예정 총액", value: won(payable), footerTitle: `${rows.length}건` },
    { label: "완료로 기록", value: won(completed), footerTitle: `${completedRows.length}건 · 은행 대조 전` },
    { label: "미완료", value: won(payable - completed), footerTitle: `${rows.length - completedRows.length}건` },
  ];

  const needle = query.trim().toLocaleLowerCase();
  const visible = rows.filter((row) => {
    if (status !== "all" && row.status !== status) return false;
    return !needle || [row.creatorName, row.campaignName].some((value) => value.toLocaleLowerCase().includes(needle));
  });

  const changeStatus = (row: SettlementRow, next: SettlementStatus) => {
    if (row.source === "campaign" && row.campaignId && row.creatorId) {
      updateCreator(row.campaignId, row.creatorId, {
        paid: next === "completed",
        settlementStatus: next,
      });
    } else if (row.source === "manual") {
      update(row.id, { status: next });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">크리에이터 정산</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            캠페인 정산과 직접 등록한 정산 건을 한곳에서 관리합니다.
          </p>
        </div>
        <Button asChild>
          <Link href="/creator-settlements/new"><PlusIcon className="size-4" /> 정산 건 등록</Link>
        </Button>
      </div>

      <Card className="border-amber-500/20 bg-amber-500/5 shadow-xs">
        <CardContent className="space-y-1">
          <p className="text-sm font-medium">거래내역 미연결</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            정산 상태는 수동 기록입니다. ‘완료로 기록’을 선택해도 은행 송금이나 실제 이체 확인은 실행되지 않습니다.
            현재 데이터는 이 브라우저에 저장되며 최초 방문 시 예시 캠페인이 표시될 수 있습니다.
          </p>
        </CardContent>
      </Card>

      {ready && <StatGrid stats={stats} className="grid-cols-1 @xl/main:grid-cols-3" />}

      <Card className="py-0 shadow-xs">
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
            <div>
              <p className="text-sm font-semibold">정산 목록</p>
              <p className="text-xs text-muted-foreground">표시 {visible.length}건 · 전체 {rows.length}건</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="크리에이터·캠페인 검색"
                  aria-label="크리에이터 또는 캠페인 검색"
                  className="w-56 pl-8"
                />
              </div>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as StatusFilter)}
                aria-label="정산 상태 필터"
                className="h-8 rounded-lg border border-border bg-background px-2 text-xs"
              >
                <option value="all">전체 상태</option>
                <option value="pending">정산 대기</option>
                <option value="processing">정산 중</option>
                <option value="completed">완료로 기록</option>
              </select>
            </div>
          </div>

          {!ready ? (
            <p className="px-5 py-12 text-center text-sm text-muted-foreground">정산 내역을 불러오는 중입니다.</p>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
              <WalletIcon className="size-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {rows.length === 0 ? "등록된 정산 내역이 없습니다." : "조건에 맞는 정산 내역이 없습니다."}
              </p>
              {rows.length === 0 && <Link href="/creator-settlements/new" className="text-xs text-primary hover:underline">첫 정산 건 등록하기</Link>}
            </div>
          ) : (
            <Table className="[&_:is(th,td)]:px-5">
              <TableHeader>
                <TableRow>
                  <TableHead>크리에이터</TableHead>
                  <TableHead>캠페인</TableHead>
                  <TableHead>결과 URL</TableHead>
                  <TableHead className="text-right">ER</TableHead>
                  <TableHead className="text-right">지급 예정액</TableHead>
                  <TableHead>정산 상태</TableHead>
                  <TableHead className="text-right">상세</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((row) => {
                  const resultUrl = safeResultUrl(row.resultUrl);
                  const er = resultUrl ? engagementRate(row.metrics) : null;
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <p className="font-medium">{row.creatorName.startsWith("@") ? row.creatorName : `@${row.creatorName}`}</p>
                        <Badge variant="outline" className="mt-1 text-[10px] font-normal">
                          {row.source === "manual" ? "직접 등록" : "캠페인 연동"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-56 truncate text-sm">
                        {row.campaignName || <span className="text-muted-foreground">미입력</span>}
                      </TableCell>
                      <TableCell>
                        {resultUrl ? (
                          <a href={resultUrl} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-44 items-center gap-1 text-xs text-primary hover:underline">
                            <span className="truncate">결과 보기</span><ExternalLinkIcon className="size-3 shrink-0" />
                          </a>
                        ) : <span className="text-xs text-muted-foreground">미등록</span>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {er === null ? "—" : `${er.toFixed(2)}%`}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{won(row.amount)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1" role="group" aria-label={`${row.creatorName} 정산 상태`}>
                          {STATUS_OPTIONS.map((option) => (
                            <Button
                              key={option.value}
                              type="button"
                              size="xs"
                              variant={row.status === option.value ? "default" : "outline"}
                              aria-pressed={row.status === option.value}
                              onClick={() => changeStatus(row, option.value)}
                            >
                              {option.label}
                            </Button>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={row.source === "manual" ? `/creator-settlements/${row.id}/edit` : `/campaigns/${row.campaignId}`}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          {row.source === "manual" ? "수정" : "캠페인 열기"}
                          <ArrowUpRightIcon className="size-3" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
