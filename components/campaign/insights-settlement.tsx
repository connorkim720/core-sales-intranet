"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatGrid, type Stat } from "@/components/stat-card";
import { CreatorAvatar } from "@/components/campaign/creator-avatar";
import { ReachChart } from "@/components/campaign/reach-chart";
import type { Campaign, CampaignCreator } from "@/lib/campaign-store";
import { formatKRW } from "@/lib/format";
import type { Influencer } from "@/lib/influencer-data";

type Props = {
  campaign: Campaign;
  influencerById: Map<string, Influencer>;
  onUpdateCreator: (influencerId: string, patch: Partial<CampaignCreator>) => void;
};

const num = (v: string) => Math.max(0, Math.floor(Number(v.replace(/[^\d]/g, "")) || 0));
const pct = (likes: number, comments: number, views: number) =>
  views > 0 ? `${(((likes + comments) / views) * 100).toFixed(2)}%` : "-";

const UPLOAD_LABEL = { pending: "업로드 전", uploaded: "확인 대기", done: "확인 완료" } as const;

function CreatorCell({ creator }: { creator?: Influencer }) {
  if (!creator) return <span className="text-muted-foreground">알 수 없음</span>;
  return (
    <div className="flex items-center gap-2.5">
      <CreatorAvatar creator={creator} size={28} />
      <span className="font-medium">{creator.handle}</span>
    </div>
  );
}

export function InsightsTab({ campaign, influencerById, onUpdateCreator }: Props) {
  const rows = campaign.creators;
  const views = rows.reduce((s, r) => s + r.views, 0);
  const likes = rows.reduce((s, r) => s + r.likes, 0);
  const comments = rows.reduce((s, r) => s + r.comments, 0);
  const saves = rows.reduce((s, r) => s + (r.saves ?? 0), 0);
  const shares = rows.reduce((s, r) => s + (r.shares ?? 0), 0);
  const totalFee = rows.reduce((s, r) => s + r.fee, 0);
  const [creatorId, setCreatorId] = React.useState(rows[0]?.influencerId ?? "");
  const [date, setDate] = React.useState("");
  const [dailyViews, setDailyViews] = React.useState("");
  const reachByDate = new Map<string, number>();
  for (const row of rows) {
    for (const point of row.dailyReach ?? []) {
      reachByDate.set(point.date, (reachByDate.get(point.date) ?? 0) + point.views);
    }
  }
  const reach = [...reachByDate].sort(([a], [b]) => a.localeCompare(b)).map(([day, count]) => ({ date: day, views: count }));

  const saveReach = () => {
    const creator = rows.find((row) => row.influencerId === creatorId);
    if (!creator || !date || !dailyViews.trim()) return;
    const value = num(dailyViews);
    const next = [...(creator.dailyReach ?? []).filter((point) => point.date !== date), { date, views: value }]
      .sort((a, b) => a.date.localeCompare(b.date));
    onUpdateCreator(creatorId, { dailyReach: next });
    setDailyViews("");
  };

  const exportCsv = () => {
    const cells = (values: (string | number)[]) => values.map((value) => {
      const text = String(value);
      const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
      return `"${safe.replace(/"/g, '""')}"`;
    }).join(",");
    const lines = [
      cells(["캠페인", campaign.name]),
      cells(["브랜드", campaign.brand]),
      cells(["총 조회", views]),
      cells(["총 비용", totalFee]),
      "",
      cells(["크리에이터", "조회", "좋아요", "댓글", "저장", "공유", "지급 단가", "게시물 URL", "PA 코드"]),
      ...rows.map((row) => cells([influencerById.get(row.influencerId)?.handle ?? row.influencerId, row.views, row.likes, row.comments, row.saves ?? 0, row.shares ?? 0, row.fee, row.uploadUrl, row.paCode ?? ""])),
      "",
      cells(["날짜", "일별 조회수"]),
      ...reach.map((point) => cells([point.date, point.views])),
    ];
    const url = URL.createObjectURL(new Blob(["\uFEFF", lines.join("\n")], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${campaign.name}-성과리포트.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const stats: Stat[] = [
    { label: "총 조회", value: views.toLocaleString() },
    { label: "총 좋아요", value: likes.toLocaleString() },
    { label: "총 댓글", value: comments.toLocaleString() },
    { label: "평균 참여율", value: pct(likes, comments, views), footerTitle: "(좋아요+댓글) / 조회" },
    { label: "총 저장·공유", value: (saves + shares).toLocaleString() },
    { label: "전체 CPV", value: views > 0 ? `${Math.round(totalFee / views).toLocaleString()}원` : "-", footerTitle: "지급 예정액 / 조회" },
  ];

  return (
    <div className="campaign-print-report space-y-4">
      <div className="hidden print:block">
        <h1 className="text-xl font-semibold">{campaign.name} · 성과 리포트</h1>
        <p className="text-sm text-muted-foreground">{campaign.brand} · 수동 입력 데이터 기준</p>
      </div>
      <div className="campaign-print-hide flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">입력된 수치로 계산한 캠페인 리포트입니다.</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}>CSV 다운로드</Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>인쇄 · PDF 저장</Button>
        </div>
      </div>
      <StatGrid stats={stats} />
      <Card className="py-0 shadow-xs">
        <CardContent className="p-0">
          <Table className="[&_:is(th,td)]:px-4">
            <TableHeader>
              <TableRow>
                <TableHead>크리에이터</TableHead>
                <TableHead>업로드</TableHead>
                <TableHead className="text-right">조회</TableHead>
                <TableHead className="text-right">좋아요</TableHead>
                <TableHead className="text-right">댓글</TableHead>
                <TableHead className="text-right">저장</TableHead>
                <TableHead className="text-right">공유</TableHead>
                <TableHead className="text-right">참여율</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.influencerId}>
                  <TableCell>
                    <CreatorCell creator={influencerById.get(r.influencerId)} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">
                      {UPLOAD_LABEL[r.upload]}
                    </Badge>
                  </TableCell>
                  {(["views", "likes", "comments", "saves", "shares"] as const).map((k) => (
                    <TableCell key={k} className="text-right">
                      <Input
                        inputMode="numeric"
                        value={r[k] ? r[k].toLocaleString() : ""}
                        placeholder="0"
                        onChange={(e) => onUpdateCreator(r.influencerId, { [k]: num(e.target.value) })}
                        className="ml-auto h-8 w-28 text-right tabular-nums"
                        aria-label={`${influencerById.get(r.influencerId)?.handle ?? ""} ${k}`}
                      />
                    </TableCell>
                  ))}
                  <TableCell className="text-right tabular-nums">{pct(r.likes, r.comments, r.views)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card className="shadow-xs">
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-semibold">일자별 조회 추이</p>
            <p className="mt-1 text-xs text-muted-foreground">크리에이터별 일일 조회수를 입력하면 합산 추이를 보여줍니다.</p>
          </div>
          <div className="campaign-print-hide flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <label htmlFor="reach-creator" className="text-xs text-muted-foreground">크리에이터</label>
              <select id="reach-creator" value={creatorId} onChange={(event) => setCreatorId(event.target.value)} className="flex h-9 rounded-md border bg-background px-3 text-sm">
                {rows.map((row) => <option key={row.influencerId} value={row.influencerId}>@{influencerById.get(row.influencerId)?.handle ?? row.influencerId}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="reach-date" className="text-xs text-muted-foreground">날짜</label>
              <Input id="reach-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <label htmlFor="reach-views" className="text-xs text-muted-foreground">일일 조회</label>
              <Input id="reach-views" inputMode="numeric" value={dailyViews} onChange={(event) => setDailyViews(event.target.value)} placeholder="조회수" className="w-32" />
            </div>
            <Button size="sm" disabled={!creatorId || !date || !dailyViews.trim()} onClick={saveReach}>추이 입력</Button>
          </div>
          {reach.length ? <ReachChart data={reach} /> : <p className="rounded-xl bg-muted/40 py-12 text-center text-sm text-muted-foreground">입력된 일별 데이터가 없습니다.</p>}
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        게시물에서 확인한 수치를 직접 입력합니다. SNS 지표 자동 수집은 연결돼 있지 않으며, CPV는 지급 예정액 기준입니다.
      </p>
    </div>
  );
}

export function SettlementTab({ campaign, influencerById, onUpdateCreator }: Props) {
  const rows = campaign.creators;
  const total = rows.reduce((s, r) => s + r.fee, 0);
  const paid = rows.filter((r) => r.paid).reduce((s, r) => s + r.fee, 0);

  const stats: Stat[] = [
    { label: "총 지급 예정", value: formatKRW(total) },
    { label: "지급 완료", value: formatKRW(paid), footerTitle: `${rows.filter((r) => r.paid).length}명` },
    { label: "지급 대기", value: formatKRW(total - paid), footerTitle: `${rows.filter((r) => !r.paid).length}명` },
  ];

  return (
    <div className="space-y-4">
      <StatGrid stats={stats} className="grid-cols-1 @xl/main:grid-cols-3" />
      <Card className="py-0 shadow-xs">
        <CardContent className="p-0">
          <Table className="[&_:is(th,td)]:px-4">
            <TableHeader>
              <TableRow>
                <TableHead>크리에이터</TableHead>
                <TableHead>업로드 확인</TableHead>
                <TableHead className="text-right">지급 단가(원)</TableHead>
                <TableHead>지급 상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.influencerId}>
                  <TableCell>
                    <CreatorCell creator={influencerById.get(r.influencerId)} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{UPLOAD_LABEL[r.upload]}</TableCell>
                  <TableCell className="text-right">
                    <Input
                      inputMode="numeric"
                      value={r.fee ? r.fee.toLocaleString() : ""}
                      placeholder="0"
                      onChange={(e) => onUpdateCreator(r.influencerId, { fee: num(e.target.value) })}
                      className="ml-auto h-8 w-36 text-right tabular-nums"
                      aria-label={`${influencerById.get(r.influencerId)?.handle ?? ""} 지급 단가`}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={r.paid ? "paid" : r.settlementStatus === "processing" ? "processing" : "wait"}
                      onValueChange={(v) => onUpdateCreator(r.influencerId, {
                        paid: v === "paid",
                        settlementStatus: v === "paid" ? "completed" : v === "processing" ? "processing" : "pending",
                      })}
                    >
                      <SelectTrigger className="h-8 w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="wait">지급 대기</SelectItem>
                        <SelectItem value="processing">정산 중</SelectItem>
                        <SelectItem value="paid">지급 완료</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2} className="font-medium">
                  합계
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">{total.toLocaleString()}원</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        지급 단가와 상태를 기록하는 용도입니다. 실제 송금과 세금계산서 발행은 이 앱에서 처리되지 않습니다.
      </p>
    </div>
  );
}
