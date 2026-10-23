"use client";

import * as React from "react";
import { ImageIcon, SearchIcon, XIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdCreativeCard, OrganicPostCard } from "@/components/ad-monitor/cards";
import {
  AnalysisView,
  CompareView,
  TrendsView,
} from "@/components/ad-monitor/insight-views";
import { listAds, listPosts } from "@/lib/ad-monitor/data";

const TABS = [
  { value: "ads", label: "광고 소재" },
  { value: "analysis", label: "소재 분석" },
  { value: "compare", label: "경쟁사 비교" },
  { value: "organic", label: "오가닉" },
  { value: "trends", label: "트렌드" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

const DAYS = [
  { value: "all", label: "전체 기간" },
  { value: "7", label: "최근 7일" },
  { value: "30", label: "최근 30일" },
];

const PLATFORMS = [
  { value: "ALL", label: "광고 유형 전체" },
  { value: "META_ADS", label: "Meta" },
  { value: "TIKTOK_ADS", label: "TikTok" },
  { value: "INSTAGRAM", label: "Instagram" },
];

export default function AdCreativesPage() {
  const [tab, setTab] = React.useState<TabValue>("ads");
  const [query, setQuery] = React.useState("");
  const [days, setDays] = React.useState("all");
  const [platform, setPlatform] = React.useState("ALL");

  const filtered = tab === "ads" || tab === "organic";

  const filter = React.useMemo(
    () => ({
      platform,
      days: days === "all" ? undefined : Number(days),
      search: query.trim() || undefined,
    }),
    [platform, days, query]
  );
  const ads = React.useMemo(() => (tab === "ads" ? listAds(filter) : []), [tab, filter]);
  const posts = React.useMemo(
    () => (tab === "organic" ? listPosts(filter) : []),
    [tab, filter]
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="mt-1 text-sm text-muted-foreground">
          경쟁사 광고·오가닉 콘텐츠 모니터링 · 훅 유형과 소구 포인트로 소재를 분석합니다.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {filtered && (
          <>
            <div className="relative mx-2 hidden min-w-0 flex-1 sm:block">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="브랜드명 또는 카피 검색"
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
            <div className="flex items-center gap-2">
              <Select value={days} onValueChange={setDays}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </div>

      {tab === "ads" &&
        (ads.length === 0 ? (
          <EmptyState text="조건에 맞는 광고 소재가 없습니다" />
        ) : (
          <>
            <p className="text-xs text-muted-foreground tabular-nums">{ads.length}건</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {ads.map((ad) => (
                <AdCreativeCard key={ad.id} ad={ad} />
              ))}
            </div>
          </>
        ))}

      {tab === "organic" &&
        (posts.length === 0 ? (
          <EmptyState text="조건에 맞는 콘텐츠가 없습니다" />
        ) : (
          <>
            <p className="text-xs text-muted-foreground tabular-nums">{posts.length}건</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {posts.map((post) => (
                <OrganicPostCard key={post.id} post={post} />
              ))}
            </div>
          </>
        ))}

      {tab === "analysis" && <AnalysisView />}
      {tab === "compare" && <CompareView />}
      {tab === "trends" && <TrendsView />}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card className="shadow-xs">
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <ImageIcon className="size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  );
}
