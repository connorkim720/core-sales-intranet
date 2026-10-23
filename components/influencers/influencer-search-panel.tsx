"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Search, Star, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  INFLUENCER_CATEGORIES,
  PLATFORM_LABEL,
  type Influencer,
  type InfluencerPlatform,
} from "@/lib/influencer-data";
import { useInfluencerStore } from "@/lib/influencer-store";
import { useInfluencerGroupStore } from "@/lib/influencer-group-store";
import { AddInfluencerDialog } from "@/components/influencers/add-influencer-dialog";
import { InfluencerDetailDialog } from "@/components/influencers/influencer-detail-dialog";
import { BulkAddToGroupDialog } from "@/components/influencers/bulk-add-to-group-dialog";

const ALL = "all";

const SORT_OPTIONS = [
  { value: "followers", label: "팔로워순" },
  { value: "engagementRate", label: "참여율순" },
  { value: "avgViews", label: "평균 조회수순" },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]["value"];

export function InfluencerSearchPanel() {
  const { influencers, togglePinned } = useInfluencerStore();
  const { groups, addMember } = useInfluencerGroupStore();
  const searchParams = useSearchParams();
  const targetGroupId = searchParams.get("group");
  const targetGroup = groups.find((g) => g.id === targetGroupId) ?? null;

  const [query, setQuery] = React.useState("");
  const [platform, setPlatform] = React.useState<InfluencerPlatform | typeof ALL>(
    ALL
  );
  const [category, setCategory] = React.useState<string>(ALL);
  const [sortBy, setSortBy] = React.useState<SortKey>("followers");
  const [onlyPinned, setOnlyPinned] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [checkedIds, setCheckedIds] = React.useState<Set<string>>(new Set());
  // id로 조회해서 매번 다시 찾는다 — 그래야 상세 다이얼로그가 열려 있는
  // 동안 수정한 값이 바로 반영된다(객체 스냅샷을 들고 있으면 갱신 안 됨).
  const selected = influencers.find((c) => c.id === selectedId) ?? null;

  const visible = influencers.filter((c) => !c.optOut);

  const filtered = visible
    .filter((c) => {
      if (onlyPinned && !c.pinned) return false;
      if (platform !== ALL && c.platform !== platform) return false;
      if (category !== ALL && !c.category.includes(category)) return false;
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        c.handle.toLowerCase().includes(q) ||
        c.bio.toLowerCase().includes(q) ||
        c.category.some((cat) => cat.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (sortBy === "avgViews") {
        return (b.avgViews ?? -1) - (a.avgViews ?? -1);
      }
      return b[sortBy] - a[sortBy];
    });

  function openDetail(c: Influencer) {
    setSelectedId(c.id);
    setDetailOpen(true);
  }

  const allFilteredChecked =
    filtered.length > 0 && filtered.every((c) => checkedIds.has(c.id));

  function toggleOne(id: string, checked: boolean) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAllFiltered(checked: boolean) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      filtered.forEach((c) => (checked ? next.add(c.id) : next.delete(c.id)));
      return next;
    });
  }

  function addCheckedToTargetGroup() {
    if (!targetGroup) return;
    checkedIds.forEach((id) => addMember(targetGroup.id, id));
    setCheckedIds(new Set());
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="mt-1 text-sm text-muted-foreground">
          카테고리·플랫폼·참여율로 협업 후보 크리에이터를 찾습니다 · 총{" "}
          {visible.length}명
        </p>
        <AddInfluencerDialog />
      </div>

      {targetGroupId && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
          <div className="flex items-center gap-2 text-primary">
            <Link
              href="/influencers/groups"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:underline"
            >
              <ArrowLeft className="size-3" /> 그룹으로
            </Link>
            <span>
              {targetGroup
                ? `"${targetGroup.name}" 그룹에 담는 중`
                : "그룹을 찾을 수 없습니다"}
            </span>
          </div>
          {targetGroup && (
            <Button
              size="sm"
              className="h-8"
              disabled={checkedIds.size === 0}
              onClick={addCheckedToTargetGroup}
            >
              선택한 {checkedIds.size}명 이 그룹에 담기
            </Button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="핸들·소개·카테고리 검색"
            className="h-9 pl-8"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="검색 지우기"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <Select
          value={platform}
          onValueChange={(v) => setPlatform(v as InfluencerPlatform | typeof ALL)}
        >
          <SelectTrigger className="h-9 w-36">
            <SelectValue placeholder="전체 플랫폼" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>전체 플랫폼</SelectItem>
            {(Object.keys(PLATFORM_LABEL) as InfluencerPlatform[]).map((p) => (
              <SelectItem key={p} value={p}>
                {PLATFORM_LABEL[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-9 w-36">
            <SelectValue placeholder="전체 카테고리" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>전체 카테고리</SelectItem>
            {INFLUENCER_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
          <SelectTrigger className="h-9 w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant={onlyPinned ? "default" : "outline"}
          size="sm"
          className="h-9"
          onClick={() => setOnlyPinned((v) => !v)}
        >
          <Star
            className={`size-3.5 ${onlyPinned ? "fill-current" : ""}`}
          />
          관심만
        </Button>

        <p className="ml-auto shrink-0 text-xs text-muted-foreground">
          {filtered.length}명 검색됨
        </p>
      </div>

      {checkedIds.size > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-md border bg-muted px-3 py-2 text-sm">
          <span className="text-muted-foreground">
            {checkedIds.size}명 선택됨
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => setCheckedIds(new Set())}
            >
              선택 해제
            </Button>
            <BulkAddToGroupDialog
              influencerIds={Array.from(checkedIds)}
              onDone={() => setCheckedIds(new Set())}
            />
          </div>
        </div>
      )}

      <Card className="shadow-xs py-0">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                조건에 맞는 크리에이터가 없습니다
              </p>
            </div>
          ) : (
            <Table className="[&_:is(th,td)]:px-4">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allFilteredChecked}
                      onCheckedChange={(v) => toggleAllFiltered(!!v)}
                      aria-label="전체 선택"
                    />
                  </TableHead>
                  <TableHead className="w-8" />
                  <TableHead>핸들</TableHead>
                  <TableHead className="text-center">플랫폼</TableHead>
                  <TableHead className="text-right">팔로워</TableHead>
                  <TableHead className="text-right">참여율</TableHead>
                  <TableHead className="text-right">평균 조회수</TableHead>
                  <TableHead>카테고리</TableHead>
                  <TableHead>소개</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => openDetail(c)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={checkedIds.has(c.id)}
                        onCheckedChange={(v) => toggleOne(c.id, !!v)}
                        aria-label={`${c.handle} 선택`}
                      />
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <span
                        role="button"
                        tabIndex={-1}
                        onClick={() => togglePinned(c.id)}
                        className="text-muted-foreground/40 transition-colors hover:text-amber-400"
                        aria-label={c.pinned ? "관심 해제" : "관심 등록"}
                      >
                        <Star
                          className={`size-3.5 ${
                            c.pinned ? "fill-amber-400 text-amber-400" : ""
                          }`}
                        />
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">@{c.handle}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{PLATFORM_LABEL[c.platform]}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {c.followers.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {c.engagementRate.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {c.avgViews ? c.avgViews.toLocaleString() : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {c.category.map((cat) => (
                          <Badge
                            key={cat}
                            variant="secondary"
                            className="font-normal"
                          >
                            {cat}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-56 truncate text-muted-foreground">
                      {c.bio}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <InfluencerDetailDialog
        influencer={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
