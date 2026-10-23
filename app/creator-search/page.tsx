"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRightIcon,
  CheckIcon,
  ChevronDownIcon,
  ChartBarIcon,
  CompassIcon,
  GlobeIcon,
  ImageIcon,
  InfoIcon,
  LockIcon,
  MailIcon,
  MoreHorizontalIcon,
  PlusIcon,
  RotateCcwIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  TrophyIcon,
  UserCheckIcon,
  UserXIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IRM_LIMIT, useCreatorIrm } from "@/lib/creator-irm-store";
import { useCreatorPicks, type Pick } from "@/lib/creator-pick-store";
import { useInfluencerGroupStore } from "@/lib/influencer-group-store";
import { useInfluencerStore } from "@/lib/influencer-store";
import type { Influencer } from "@/lib/influencer-data";

type TabValue = "find" | "selected" | "rejected" | "lookalikes";
type ResultMode = "all" | "smart";

type Filters = {
  platform: string; // all | instagram | tiktok
  followers: string; // all | <10k | 10-50k | 50-100k | 100-500k | 500k+
  engagement: string; // all | 3 | 5 | 7
  gender: string; // all | male | female
};

const NO_FILTER: Filters = { platform: "all", followers: "all", engagement: "all", gender: "all" };

const PLATFORM_OPTIONS = [
  { value: "all", label: "플랫폼 전체" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
];

const FOLLOWER_OPTIONS = [
  { value: "all", label: "팔로워 전체" },
  { value: "<10k", label: "1만 미만" },
  { value: "10-50k", label: "1만 ~ 5만" },
  { value: "50-100k", label: "5만 ~ 10만" },
  { value: "100-500k", label: "10만 ~ 50만" },
  { value: "500k+", label: "50만 이상" },
];

const ENGAGEMENT_OPTIONS = [
  { value: "all", label: "참여율 전체" },
  { value: "3", label: "3% 이상" },
  { value: "5", label: "5% 이상" },
  { value: "7", label: "7% 이상" },
];

const GENDER_OPTIONS = [
  { value: "all", label: "성별 전체" },
  { value: "female", label: "여성" },
  { value: "male", label: "남성" },
];

const FILTER_LABEL: Record<keyof Filters, string> = {
  platform: "플랫폼",
  followers: "팔로워",
  engagement: "참여율",
  gender: "성별",
};

const FILTER_OPTIONS: Record<keyof Filters, { value: string; label: string }[]> = {
  platform: PLATFORM_OPTIONS,
  followers: FOLLOWER_OPTIONS,
  engagement: ENGAGEMENT_OPTIONS,
  gender: GENDER_OPTIONS,
};

const FOLLOWER_RANGE: Record<string, [number, number]> = {
  "<10k": [0, 10_000],
  "10-50k": [10_000, 50_000],
  "50-100k": [50_000, 100_000],
  "100-500k": [100_000, 500_000],
  "500k+": [500_000, Infinity],
};

const PRESETS: { title: string; query: string; filters: Partial<Filters>; icon: string }[] = [
  {
    title: "Instagram 팔로워 10만 미만 라이징 스타",
    query: "",
    filters: { platform: "instagram", followers: "50-100k" },
    icon: "IG",
  },
  {
    title: "참여율 높은 TikTok 크리에이터",
    query: "",
    filters: { platform: "tiktok", engagement: "5" },
    icon: "TT",
  },
  {
    title: "뷰티 카테고리 참여율 5% 이상",
    query: "#뷰티",
    filters: { engagement: "5" },
    icon: "뷰티",
  },
];

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(n >= 100_000 ? 0 : 1)}K`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// 검색어 문법: @유저네임 / #해시태그(카테고리) / 그 외는 키워드. 토큰은 AND.
function matchesQuery(c: Influencer, query: string) {
  const tokens = query.trim().split(/\s+/).filter(Boolean);
  const handle = c.handle.toLowerCase();
  const haystack = `${c.handle} ${c.bio} ${c.category.join(" ")}`.toLowerCase();
  return tokens.every((t) => {
    const lower = t.toLowerCase();
    if (lower.startsWith("@")) return handle.includes(lower.slice(1));
    if (lower.startsWith("#")) {
      const tag = lower.slice(1);
      return c.category.some((k) => k.toLowerCase().includes(tag)) || c.bio.toLowerCase().includes(tag);
    }
    return haystack.includes(lower);
  });
}

function matchesFilters(c: Influencer, f: Filters) {
  if (f.platform !== "all" && c.platform !== f.platform) return false;
  if (f.gender !== "all" && c.gender !== f.gender) return false;
  if (f.engagement !== "all" && c.engagementRate < Number(f.engagement)) return false;
  if (f.followers !== "all") {
    const [min, max] = FOLLOWER_RANGE[f.followers];
    if (c.followers < min || c.followers >= max) return false;
  }
  return true;
}

export default function CreatorSearchPage() {
  return (
    <React.Suspense fallback={null}>
      <CreatorSearchContent />
    </React.Suspense>
  );
}

function CreatorSearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { influencers } = useInfluencerStore();
  const { picks, setPick } = useCreatorPicks();
  const irm = useCreatorIrm();

  const [tab, setTab] = React.useState<TabValue>("find");
  const [query, setQuery] = React.useState("");
  const [filters, setFilters] = React.useState<Filters>(NO_FILTER);
  const [showMore, setShowMore] = React.useState(false);
  const [mode, setMode] = React.useState<ResultMode>("all");

  const pool = React.useMemo(() => influencers.filter((c) => !c.optOut), [influencers]);
  const requestedId = searchParams.get("id");
  React.useEffect(() => {
    if (requestedId) {
      // A new deep link can arrive while this page still has local search state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTab("find");
      setQuery("");
      setFilters(NO_FILTER);
    }
  }, [requestedId]);
  const focusedCreator = query ? undefined : pool.find((c) => c.id === requestedId);
  const clearFocusedCreator = () => {
    if (requestedId) router.replace("/creator-search", { scroll: false });
  };
  const selectedCount = pool.filter((c) => picks[c.id] === "selected").length;
  const rejectedCount = pool.filter((c) => picks[c.id] === "rejected").length;

  const activeFilters = (Object.keys(filters) as (keyof Filters)[]).filter(
    (k) => filters[k] !== "all"
  );
  const hasSearch = Boolean(focusedCreator) || query.trim() !== "" || activeFilters.length > 0;

  const results = React.useMemo(() => {
    if (focusedCreator) return [focusedCreator];
    const list = pool
      .filter((c) => picks[c.id] !== "rejected")
      .filter((c) => matchesFilters(c, filters) && matchesQuery(c, query));
    // 스마트 결과: 참여율 높은 순. 전체 결과: 팔로워 많은 순.
    return list.sort((a, b) =>
      mode === "smart" ? b.engagementRate - a.engagementRate : b.followers - a.followers
    );
  }, [pool, picks, filters, query, mode, focusedCreator]);

  const listFor = (kind: Pick) => pool.filter((c) => picks[c.id] === kind);

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    clearFocusedCreator();
    setQuery(p.query);
    setFilters({ ...NO_FILTER, ...p.filters });
  };

  const reset = () => {
    clearFocusedCreator();
    setQuery("");
    setFilters(NO_FILTER);
  };

  const setFilter = (key: keyof Filters) => (value: string) => {
    clearFocusedCreator();
    setFilters((f) => ({ ...f, [key]: value }));
  };

  const rowProps = { picks, onPick: setPick, irm };

  return (
    <div className="space-y-4">
      <div>
        <p className="mt-1 text-sm text-muted-foreground">
          키워드, 해시태그, 유저네임으로 크리에이터를 찾고 선택·제외·컨택으로 관리합니다.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList>
          <TabsTrigger value="find">
            <CompassIcon className="size-3.5" /> 크리에이터 찾기
          </TabsTrigger>
          <TabsTrigger value="selected">
            <UserCheckIcon className="size-3.5" /> 선택됨
            <CountBadge n={selectedCount} tone="success" />
          </TabsTrigger>
          <TabsTrigger value="rejected">
            <UserXIcon className="size-3.5" /> 제외됨
            <CountBadge n={rejectedCount} tone="muted" />
          </TabsTrigger>
          <TabsTrigger value="lookalikes">
            <SparklesIcon className="size-3.5" /> 유사 탐색
            <LockIcon className="size-3" />
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "find" && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-9 min-w-12 items-center justify-center rounded-2xl bg-primary px-2.5 text-xs font-semibold text-primary-foreground tabular-nums">
              {pool.length}명
            </div>
            <div className="relative min-w-[260px] flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => {
                  clearFocusedCreator();
                  setQuery(e.target.value);
                }}
                placeholder="키워드, #해시태그, @유저네임으로 크리에이터 찾기"
                className="h-9 pl-8"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="검색 지우기"
                >
                  <XIcon className="size-3.5" />
                </button>
              )}
            </div>
            <Select value={filters.platform} onValueChange={setFilter("platform")}>
              <SelectTrigger className="h-9 w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATFORM_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="h-9 py-2"
              aria-expanded={showMore}
              onClick={() => setShowMore((v) => !v)}
            >
              <SlidersHorizontalIcon className="size-3.5" /> 더 많은 필터
              <ChevronDownIcon className="size-3.5" />
            </Button>
          </div>

          {showMore && (
            <Card className="shadow-xs">
              <CardContent className="flex flex-wrap items-center gap-3">
                {(["followers", "engagement", "gender"] as const).map((key) => (
                  <Select key={key} value={filters[key]} onValueChange={setFilter(key)}>
                    <SelectTrigger className="h-9 w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FILTER_OPTIONS[key].map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ))}
              </CardContent>
            </Card>
          )}

          {hasSearch && (
            <div className="flex flex-wrap items-center gap-2">
              {focusedCreator && (
                <FilterChip label={focusedCreator.handle} onRemove={clearFocusedCreator} />
              )}
              {query.trim() && (
                <FilterChip label={`검색: ${query.trim()}`} onRemove={() => setQuery("")} />
              )}
              {activeFilters.map((k) => (
                <FilterChip
                  key={k}
                  label={`${FILTER_LABEL[k]}: ${
                    FILTER_OPTIONS[k].find((o) => o.value === filters[k])?.label
                  }`}
                  onRemove={() => setFilter(k)("all")}
                />
              ))}
              <span className="mx-1 h-4 w-px bg-border" />
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <RotateCcwIcon className="size-3" /> 필터 초기화
              </button>
            </div>
          )}

          {hasSearch ? (
            <>
              <div className="flex items-center gap-1">
                <ModeButton active={mode === "all"} onClick={() => setMode("all")}>
                  전체 결과
                </ModeButton>
                <ModeButton active={mode === "smart"} onClick={() => setMode("smart")} dot>
                  스마트 결과
                </ModeButton>
                <InfoIcon
                  className="ml-1 size-3.5 text-muted-foreground"
                  aria-label="스마트 결과는 참여율이 높은 순으로 정렬합니다"
                />
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                  {results.length}명
                </span>
              </div>
              {results.length === 0 ? (
                <EmptyCard icon={<SearchIcon className="size-6 text-muted-foreground" />}>
                  조건에 맞는 크리에이터가 없습니다
                </EmptyCard>
              ) : (
                <CreatorList list={results} {...rowProps} />
              )}
            </>
          ) : (
            <DiscoveryHome onPreset={applyPreset} />
          )}
        </>
      )}

      {tab === "selected" &&
        (listFor("selected").length === 0 ? (
          <EmptyCard icon={<UserCheckIcon className="size-6 text-muted-foreground" />}>
            선택한 크리에이터가 없습니다
          </EmptyCard>
        ) : (
          <CreatorList list={listFor("selected")} {...rowProps} />
        ))}

      {tab === "rejected" &&
        (listFor("rejected").length === 0 ? (
          <EmptyCard icon={<UserXIcon className="size-6 text-muted-foreground" />}>
            제외한 크리에이터가 없습니다
          </EmptyCard>
        ) : (
          <CreatorList list={listFor("rejected")} {...rowProps} />
        ))}

      {tab === "lookalikes" && (
        <EmptyCard icon={<LockIcon className="size-6 text-muted-foreground" />}>
          유사 탐색은 준비중입니다. 선택한 크리에이터와 비슷한 크리에이터를 찾아주는 기능입니다.
        </EmptyCard>
      )}
    </div>
  );
}

function CountBadge({ n, tone }: { n: number; tone: "success" | "muted" }) {
  return (
    <span
      className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] tabular-nums ${
        tone === "success" ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
      }`}
    >
      {n}
    </span>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-2xl bg-card px-2.5 text-xs font-medium shadow-xs ring-1 ring-foreground/5">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="text-muted-foreground hover:text-foreground"
        aria-label={`${label} 해제`}
      >
        <XIcon className="size-3" />
      </button>
    </span>
  );
}

function ModeButton({
  active,
  dot,
  onClick,
  children,
}: {
  active: boolean;
  dot?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative h-8 rounded-2xl px-3 text-sm transition-colors ${
        active
          ? "bg-primary/10 font-medium text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {children}
      {dot && <span className="absolute top-1 right-1 size-1.5 rounded-full bg-primary" />}
    </button>
  );
}

function EmptyCard({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="shadow-xs">
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        {icon}
        <p className="text-sm text-muted-foreground">{children}</p>
      </CardContent>
    </Card>
  );
}

function DiscoveryHome({ onPreset }: { onPreset: (p: (typeof PRESETS)[number]) => void }) {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          브랜드 맞춤 검색
          <Badge variant="outline" className="font-normal text-primary">
            <SparklesIcon /> AI 추천
          </Badge>
        </h2>
        <Card className="shadow-xs">
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">브랜드를 등록하면 어울리는 크리에이터를 추천합니다</p>
              <p className="text-sm text-muted-foreground">
                브랜드의 스타일과 타깃 정보를 입력하면 맞는 크리에이터 목록을 만들어 드립니다.
              </p>
            </div>
            <Button disabled>
              <PlusIcon /> 브랜드 만들기 · 준비중
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">인기 검색</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {PRESETS.map((p) => (
            <Card key={p.title} className="shadow-xs">
              <CardContent className="flex h-full flex-col justify-between gap-6">
                <div className="space-y-3">
                  <Badge variant="outline" className="font-normal text-primary">
                    <CompassIcon /> 탐색
                  </Badge>
                  <p className="text-sm font-medium leading-snug">{p.title}</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{p.icon}</span>
                  <Button variant="outline" size="sm" onClick={() => onPreset(p)}>
                    <ArrowRightIcon className="size-3.5" /> 탐색하기
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">외부에서 크리에이터 가져오기</h2>
        <Card className="max-w-xl shadow-xs">
          <CardContent className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-2xl bg-muted">
                <GlobeIcon className="size-4" />
              </div>
              <div>
                <p className="text-sm font-medium">크롬 확장 프로그램</p>
                <p className="text-xs text-muted-foreground">
                  소셜 프로필 페이지에서 크리에이터를 바로 추가합니다
                </p>
              </div>
            </div>
            <Button variant="outline" disabled>
              준비중
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

// 이름에서 색을 뽑아 프로필·썸네일 자리표시자를 만든다(실제 이미지 데이터가 없음).
function hueOf(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

function PlatformDot({ platform }: { platform: Influencer["platform"] }) {
  return platform === "instagram" ? (
    <span className="flex size-5 items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 text-[8px] font-bold text-white">
      IG
    </span>
  ) : (
    <span className="flex size-5 items-center justify-center rounded-full bg-foreground text-[8px] font-bold text-background">
      TT
    </span>
  );
}

type IrmApi = ReturnType<typeof useCreatorIrm>;

function CreatorList({
  list,
  picks,
  onPick,
  irm,
}: {
  list: Influencer[];
  picks: Record<string, Pick>;
  onPick: (id: string, pick: Pick | null) => void;
  irm: IrmApi;
}) {
  const { groups, addMember, removeMember } = useInfluencerGroupStore();

  // 같은 버튼을 다시 누르면 해제, 다른 버튼을 누르면 상태가 바뀐다.
  const toggle = (id: string, next: Pick) => onPick(id, picks[id] === next ? null : next);

  return (
    <div className="space-y-3">
      {list.map((c) => {
        const pick = picks[c.id];
        const hue = hueOf(c.id);
        const inIrm = Boolean(irm.entries[c.id]);
        const memberOf = groups.filter((g) => g.memberIds.includes(c.id));

        return (
          <Card key={c.id} className="py-0 shadow-xs">
            <CardContent className="flex flex-wrap items-center gap-x-5 gap-y-4 py-3.5">
              {/* 프로필 + 제외/선택 */}
              <div
                className="relative flex size-[140px] shrink-0 items-center justify-center rounded-2xl text-3xl font-semibold text-white"
                style={{
                  background: `linear-gradient(135deg, hsl(${hue} 70% 62%), hsl(${(hue + 50) % 360} 70% 48%))`,
                }}
              >
                {c.handle.slice(0, 2).toUpperCase()}
                <div className="absolute inset-x-5 -bottom-3 flex h-8 overflow-hidden rounded-2xl bg-background shadow-md ring-1 ring-foreground/5">
                  <button
                    type="button"
                    aria-label="제외"
                    aria-pressed={pick === "rejected"}
                    onClick={() => toggle(c.id, "rejected")}
                    className={`flex flex-1 items-center justify-center transition-colors ${
                      pick === "rejected"
                        ? "bg-destructive/15 text-destructive"
                        : "text-destructive/70 hover:bg-muted hover:text-destructive"
                    }`}
                  >
                    <XIcon className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="선택"
                    aria-pressed={pick === "selected"}
                    onClick={() => toggle(c.id, "selected")}
                    className={`flex flex-1 items-center justify-center transition-colors ${
                      pick === "selected"
                        ? "bg-emerald-500 text-white"
                        : "text-emerald-600/70 hover:bg-muted hover:text-emerald-600"
                    }`}
                  >
                    <CheckIcon className="size-4" />
                  </button>
                </div>
              </div>

              {/* 이름 · 메뉴 · 소개 */}
              <div className="min-w-[240px] flex-1 space-y-2 self-start pt-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-base font-semibold">{c.handle}</p>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1" aria-label="그룹">
                          <UsersIcon className="size-3.5" />
                          {memberOf.length > 0 && (
                            <span className="text-xs tabular-nums">{memberOf.length}</span>
                          )}
                          <ChevronDownIcon className="size-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-48">
                        <DropdownMenuLabel>그룹에 추가</DropdownMenuLabel>
                        {groups.length === 0 ? (
                          <p className="px-2 py-2 text-xs text-muted-foreground">
                            그룹이 없습니다. 인플루언서 그룹에서 먼저 만드세요.
                          </p>
                        ) : (
                          groups.map((g) => {
                            const isMember = g.memberIds.includes(c.id);
                            return (
                              <DropdownMenuItem
                                key={g.id}
                                onSelect={() =>
                                  isMember ? removeMember(g.id, c.id) : addMember(g.id, c.id)
                                }
                              >
                                <span className="flex-1 truncate">{g.name}</span>
                                {isMember && <CheckIcon className="size-3.5" />}
                              </DropdownMenuItem>
                            );
                          })
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon-sm" aria-label="더보기">
                          <MoreHorizontalIcon />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-40">
                        <DropdownMenuItem onSelect={() => toggle(c.id, "selected")}>
                          {pick === "selected" ? "선택 해제" : "선택"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => toggle(c.id, "rejected")}>
                          {pick === "rejected" ? "제외 취소" : "제외"}
                        </DropdownMenuItem>
                        {inIrm && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() => irm.remove(c.id)}
                            >
                              커뮤니티에서 제거
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {c.platform === "instagram" ? "Instagram" : "TikTok"} ·{" "}
                  {c.gender === "female" ? "여성" : "남성"}
                </p>
                <p className="line-clamp-2 text-sm text-muted-foreground">{c.bio}</p>
              </div>

              <span className="hidden h-24 w-px bg-border @7xl/main:block" />

              {/* 최근 게시물 자리표시자 */}
              <div className="hidden shrink-0 gap-2 @7xl/main:flex" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="relative flex h-24 w-[86px] items-center justify-center rounded-xl"
                    style={{
                      background: `linear-gradient(160deg, hsl(${(hue + i * 40) % 360} 45% 85%), hsl(${
                        (hue + i * 40 + 30) % 360
                      } 45% 72%))`,
                    }}
                  >
                    <ImageIcon className="size-5 text-white/80" />
                    <span className="absolute top-1 right-1">
                      <PlatformDot platform={c.platform} />
                    </span>
                  </div>
                ))}
              </div>

              {/* 지표 */}
              <div className="w-36 shrink-0 space-y-2 text-sm tabular-nums">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    <PlatformDot platform={c.platform} /> {formatCount(c.followers)}
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <ChartBarIcon className="size-3.5" /> {c.engagementRate}%
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 text-muted-foreground">
                  <span className="text-xs">평균 조회</span>
                  <span>{c.avgViews ? formatCount(c.avgViews) : "-"}</span>
                </div>
              </div>

              {/* 카테고리 */}
              <div className="w-36 shrink-0">
                {c.category.length === 0 ? (
                  <span className="text-xs text-muted-foreground">카테고리 없음</span>
                ) : (
                  <div className="flex flex-col items-start gap-1.5">
                    {c.category.slice(0, 2).map((k, i) => (
                      <Badge key={k} variant="secondary" className="font-normal">
                        <TrophyIcon className={i === 0 ? "text-amber-500" : "text-muted-foreground"} />
                        {k}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* 컨택 */}
              <Button
                className="ml-auto w-36 shrink-0"
                variant={inIrm ? "outline" : "default"}
                onClick={() => {
                  if (inIrm) return;
                  if (Object.keys(irm.entries).length >= IRM_LIMIT) {
                    window.alert(`커뮤니티는 최대 ${IRM_LIMIT}명까지 담을 수 있습니다.`);
                    return;
                  }
                  irm.add(c.id);
                }}
                asChild={inIrm}
              >
                {inIrm ? (
                  <Link href="/creator-irm">
                    <CheckIcon /> 커뮤니티에 있음
                  </Link>
                ) : (
                  <>
                    <MailIcon /> 컨택
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
