"use client";

import * as React from "react";
import Link from "next/link";
import { CheckIcon, SearchIcon, UsersIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CreatorAvatar, PlatformDot } from "@/components/campaign/creator-avatar";
import { matchCreators } from "@/lib/agents";
import { newCreator, type Campaign, type CampaignBrief } from "@/lib/campaign-store";
import { formatKRW } from "@/lib/format";
import type { Influencer } from "@/lib/influencer-data";
import { useVideoRefs, videoRefUrl } from "@/lib/video-ref-store";

type Props = {
  campaign: Campaign;
  influencers: Influencer[];
  onUpdate: (fn: (campaign: Campaign) => Campaign) => void;
  onConfirmed: () => void;
};

export function SelectionTab({ campaign, influencers, onUpdate, onConfirmed }: Props) {
  const { items: videoRefs } = useVideoRefs();
  const [query, setQuery] = React.useState("");
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState<CampaignBrief>(campaign.brief ?? { product: "", goal: "", audience: "", message: "" });
  const pool = influencers.filter((creator) => !creator.optOut);
  const brief = campaign.brief;
  const briefText = [brief?.product, brief?.audience, brief?.message].filter(Boolean).join(" ");
  const matches = matchCreators(briefText, pool, pool.length);
  const matchById = new Map(matches.map((match) => [match.creator.id, match]));
  const ranked = [...pool].sort((a, b) => {
    const score = (matchById.get(b.id)?.score ?? 0) - (matchById.get(a.id)?.score ?? 0);
    return score || b.engagementRate - a.engagementRate;
  });
  const filtered = ranked.filter((creator) =>
    `${creator.handle} ${creator.category.join(" ")} ${creator.bio}`.toLowerCase().includes(query.trim().toLowerCase())
  );
  const selectedIds = new Set(campaign.creators.map((creator) => creator.influencerId));
  const selected = campaign.creators.map((item) => pool.find((creator) => creator.id === item.influencerId)).filter((creator): creator is Influencer => Boolean(creator));
  const totalViews = selected.reduce((sum, creator) => sum + (creator.avgViews ?? 0), 0);
  const totalFee = campaign.creators.reduce((sum, creator) => sum + creator.fee, 0);
  const linkedRefs = videoRefs.filter((item) => item.campaignIds?.includes(campaign.id));

  const toggle = (id: string) => {
    const entry = campaign.creators.find((creator) => creator.influencerId === id);
    if (
      entry &&
      (entry.script !== "writing" || entry.video !== "writing" || entry.upload !== "pending" || entry.fee > 0 || entry.scriptFeedback || entry.videoFeedback || entry.scriptUrl || entry.videoUrl || entry.uploadUrl || entry.paCode || entry.views > 0 || entry.likes > 0 || entry.comments > 0 || (entry.saves ?? 0) > 0 || (entry.shares ?? 0) > 0 || (entry.dailyReach?.length ?? 0) > 0) &&
      !window.confirm("이 크리에이터의 진행 기록과 입력한 단가가 함께 삭제됩니다. 리스트에서 제외할까요?")
    ) return;
    onUpdate((current) => ({
      ...current,
      creators: current.creators.some((item) => item.influencerId === id)
        ? current.creators.filter((item) => item.influencerId !== id)
        : [...current.creators, newCreator(id)],
      selectionConfirmed: false,
    }));
  };

  return (
    <div className="space-y-4">
      <Card className="shadow-xs">
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">브리프에 맞는 크리에이터 찾기</p>
              <p className="mt-1 text-xs text-muted-foreground">
                카테고리와 소개글의 키워드로 정렬한 후보입니다. 기본 프로필은 데모 데이터이며 실제 섭외나 비용 확정은 담당자가 확인해야 합니다.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{campaign.packageType === "lite" ? "알뜰 패키지" : "올인원 풀패키지"}</Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setDraft(campaign.brief ?? { product: "", goal: "", audience: "", message: "" });
                  setEditing((value) => !value);
                }}
              >
                브리프 수정
              </Button>
            </div>
          </div>
          <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <p><span className="font-medium text-foreground">제품</span> · {brief?.product || "미입력"}</p>
            <p><span className="font-medium text-foreground">목표</span> · {brief?.goal || "미입력"}</p>
            <p><span className="font-medium text-foreground">타깃</span> · {brief?.audience || "미입력"}</p>
            <p><span className="font-medium text-foreground">메시지</span> · {brief?.message || "미입력"}</p>
          </div>
          <div className="border-t pt-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium">브리프 레퍼런스 · {linkedRefs.length}개</p><Button asChild size="sm" variant="outline"><Link href="/video-references">영상 레퍼런스에서 저장</Link></Button></div>
            {linkedRefs.length > 0 ? <div className="mt-2 grid gap-2 sm:grid-cols-2">{linkedRefs.map((item) => <a key={item.id} href={videoRefUrl(item)} target="_blank" rel="noopener noreferrer" className="rounded-lg border p-3 text-sm hover:bg-muted/50"><span className="font-medium">{item.title}</span><span className="mt-1 block text-xs text-muted-foreground">{[item.hook && `훅 ${item.hook}`, item.appeal && `소구 ${item.appeal}`].filter(Boolean).join(" · ") || item.category || "영상 레퍼런스"}</span></a>)}</div> : <p className="mt-2 text-xs text-muted-foreground">저장한 영상이 없습니다. 영상 레퍼런스에서 캠페인에 연결하세요.</p>}
          </div>
          {editing && (
            <div className="space-y-2 border-t pt-3">
              <Input aria-label="광고 제품 수정" value={draft.product} onChange={(event) => setDraft((value) => ({ ...value, product: event.target.value }))} placeholder="광고 제품" />
              <Input aria-label="캠페인 목표 수정" value={draft.goal} onChange={(event) => setDraft((value) => ({ ...value, goal: event.target.value }))} placeholder="캠페인 목표" />
              <Input aria-label="타깃 고객 수정" value={draft.audience} onChange={(event) => setDraft((value) => ({ ...value, audience: event.target.value }))} placeholder="타깃 고객" />
              <Textarea aria-label="전달할 메시지 수정" value={draft.message} onChange={(event) => setDraft((value) => ({ ...value, message: event.target.value }))} placeholder="전달할 메시지" />
              <Button
                size="sm"
                disabled={!draft.product.trim() || !draft.goal.trim()}
                onClick={() => {
                  onUpdate((current) => ({ ...current, brief: {
                    product: draft.product.trim(),
                    goal: draft.goal.trim(),
                    audience: draft.audience.trim(),
                    message: draft.message.trim(),
                  } }));
                  setEditing(false);
                }}
              >
                브리프 저장
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="핸들·카테고리 검색" className="pl-9" />
        </div>
        <span className="text-xs text-muted-foreground">후보 {filtered.length}명</span>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {filtered.map((creator) => {
          const picked = selectedIds.has(creator.id);
          const selectedEntry = campaign.creators.find((item) => item.influencerId === creator.id);
          const reasons = matchById.get(creator.id)?.reasons ?? [];
          return (
            <Card key={creator.id} className={picked ? "border-primary shadow-xs" : "shadow-xs"}>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <CreatorAvatar creator={creator} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">@{creator.handle}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <PlatformDot platform={creator.platform} /> {creator.category.join(" · ") || "카테고리 미입력"}
                    </p>
                  </div>
                  <Button size="sm" variant={picked ? "secondary" : "default"} onClick={() => toggle(creator.id)}>
                    {picked ? <><CheckIcon className="size-3.5" /> 선택됨</> : "리스트에 담기"}
                  </Button>
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground">{creator.bio}</p>
                <div className="grid grid-cols-3 gap-2 border-t pt-3 text-xs">
                  <div><p className="text-muted-foreground">팔로워</p><p className="mt-1 font-medium tabular-nums">{creator.followers.toLocaleString()}</p></div>
                  <div><p className="text-muted-foreground">평균 조회</p><p className="mt-1 font-medium tabular-nums">{creator.avgViews?.toLocaleString() ?? "-"}</p></div>
                  <div><p className="text-muted-foreground">참여율</p><p className="mt-1 font-medium tabular-nums">{creator.engagementRate}%</p></div>
                </div>
                <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  {reasons.length ? `추천 근거: ${reasons.slice(0, 2).join(" · ")}` : "직접 검토 후보 · 카테고리와 최근 콘텐츠를 확인하세요"}
                </p>
                {picked && (
                  <div className="flex items-center gap-2 border-t pt-3">
                    <label htmlFor={`creator-fee-${creator.id}`} className="shrink-0 text-xs text-muted-foreground">협의 단가</label>
                    <Input
                      id={`creator-fee-${creator.id}`}
                      inputMode="numeric"
                      value={selectedEntry?.fee ? selectedEntry.fee.toLocaleString() : ""}
                      onChange={(event) => {
                        const fee = Math.max(0, Math.floor(Number(event.target.value.replace(/[^\d]/g, "")) || 0));
                        onUpdate((current) => ({
                          ...current,
                          creators: current.creators.map((item) => item.influencerId === creator.id ? { ...item, fee } : item),
                        }));
                      }}
                      placeholder="원 단위 직접 입력"
                      className="h-8 max-w-40"
                    />
                    <span className="text-xs text-muted-foreground">원</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && <p className="rounded-xl border p-8 text-center text-sm text-muted-foreground">검색 결과가 없습니다.</p>}

      <Card className="sticky bottom-3 z-10 border-primary/30 bg-background/95 shadow-lg backdrop-blur">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="text-sm">
            <p className="flex items-center gap-2 font-medium"><UsersIcon className="size-4" /> 선택한 크리에이터 {selected.length}명</p>
            <p className="text-xs text-muted-foreground">최근 평균 조회 합계 {totalViews.toLocaleString()} · 보장 조회수가 아닙니다</p>
            <p className="text-xs text-muted-foreground">입력한 협의 단가 합계 {formatKRW(totalFee)}</p>
          </div>
          <Button
            disabled={selected.length === 0}
            onClick={() => {
              onUpdate((current) => ({ ...current, selectionConfirmed: true }));
              onConfirmed();
            }}
          >
            인플루언서 선정 완료
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
