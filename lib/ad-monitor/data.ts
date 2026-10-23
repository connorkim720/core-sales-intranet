import raw from "./data.json";

// ad-monitor-clone(Prisma/SQLite)의 시드 DB를 data.json으로 한 번 내보낸 스냅샷.
// Vercel 배포본에는 SQLite를 둘 수 없어서 정적 데이터로 읽는다. 조회·집계 로직은
// ad-monitor-clone/site/lib/reporting.ts를 메모리 배열 기준으로 옮긴 것.
// IngestRun.status=DONE인 (경쟁사, 플랫폼)만 내보냈으므로 가시성 필터는 이미 적용됨.

export type CtaType =
  | "SHOP_NOW"
  | "LEARN_MORE"
  | "SIGN_UP"
  | "DOWNLOAD"
  | "CONTACT_US"
  | "GET_OFFER";

export const CTA_LABELS: Record<CtaType, string> = {
  SHOP_NOW: "Shop now",
  LEARN_MORE: "Learn more",
  SIGN_UP: "Sign up",
  DOWNLOAD: "Download",
  CONTACT_US: "Contact us",
  GET_OFFER: "Get offer",
};

export const PLATFORM_LABELS: Record<string, string> = {
  META_ADS: "Meta",
  TIKTOK_ADS: "TikTok",
  INSTAGRAM: "Instagram",
};

export type CreativeTag = {
  hookType: string;
  appealPoint: string;
  format: string;
} | null;

export type Competitor = { id: string; brandName: string; category: string };

export type AdCreative = {
  id: string;
  competitorId: string;
  brandName: string;
  platform: string;
  mediaType: string;
  thumbnailUrl: string;
  copyText: string;
  ctaType: CtaType;
  startDate: string;
  isActive: boolean;
  landingDomain: string;
  analysis: CreativeTag;
};

export type OrganicPost = {
  id: string;
  competitorId: string;
  brandName: string;
  platform: string;
  mediaType: string;
  caption: string;
  hashtags: string[];
  likeCount: number;
  commentCount: number;
  viewCount: number;
  videoDurationSec: number | null;
  postedAt: string;
  analysis: CreativeTag;
};

export type Filter = {
  platform?: string; // "ALL" | Platform
  days?: number;
  search?: string;
};

const competitors: Competitor[] = raw.competitors;
const brandOf = new Map(competitors.map((c) => [c.id, c.brandName]));

const ads: AdCreative[] = raw.ads.map((a) => ({
  ...(a as Omit<AdCreative, "brandName">),
  brandName: brandOf.get(a.competitorId) ?? "",
}));

const posts: OrganicPost[] = raw.posts.map((p) => ({
  ...(p as Omit<OrganicPost, "brandName">),
  brandName: brandOf.get(p.competitorId) ?? "",
}));

function since(days?: number) {
  if (!days) return undefined;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.getTime();
}

export function listAds(f: Filter = {}): AdCreative[] {
  const from = since(f.days);
  return ads
    .filter((a) => !f.platform || f.platform === "ALL" || a.platform === f.platform)
    .filter((a) => from === undefined || new Date(a.startDate).getTime() >= from)
    .filter(
      (a) => !f.search || a.brandName.includes(f.search) || a.copyText.includes(f.search)
    );
}

export function listPosts(f: Filter = {}): OrganicPost[] {
  const from = since(f.days);
  return posts
    .filter((p) => !f.platform || f.platform === "ALL" || p.platform === f.platform)
    .filter((p) => from === undefined || new Date(p.postedAt).getTime() >= from)
    .filter(
      (p) => !f.search || p.brandName.includes(f.search) || p.caption.includes(f.search)
    );
}

function countBy<T>(items: T[], key: (t: T) => string) {
  const m = new Map<string, number>();
  for (const i of items) m.set(key(i), (m.get(key(i)) ?? 0) + 1);
  return [...m.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

export function getAnalysisStats() {
  const tags = [
    ...ads.flatMap((a) => (a.analysis ? [a.analysis] : [])),
    ...posts.flatMap((p) => (p.analysis ? [p.analysis] : [])),
  ];
  const durations = posts
    .map((p) => p.videoDurationSec)
    .filter((d): d is number => d != null);
  const formats = countBy(tags, (t) => t.format);
  const appeals = countBy(tags, (t) => t.appealPoint);

  return {
    totalCount: ads.length + posts.length,
    avgVideoDurationSec: durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0,
    topAppealPoint: appeals[0]?.label ?? "-",
    topFormat: {
      format: formats[0]?.label ?? "-",
      ratio: formats[0] ? Math.round((formats[0].count / (tags.length || 1)) * 100) : 0,
    },
    hookTypeCounts: countBy(tags, (t) => t.hookType),
    appealPointCounts: appeals,
    matrix: competitors.map((c) => {
      const counts: Record<string, number> = { META_ADS: 0, TIKTOK_ADS: 0, INSTAGRAM: 0 };
      for (const a of ads) if (a.competitorId === c.id) counts[a.platform] = (counts[a.platform] ?? 0) + 1;
      for (const p of posts) if (p.competitorId === c.id) counts[p.platform] = (counts[p.platform] ?? 0) + 1;
      return { brandName: c.brandName, counts };
    }),
  };
}

export function getComparison() {
  const cutoff = since(30) ?? 0;
  return competitors.map((c) => {
    const cAds = ads.filter((a) => a.competitorId === c.id);
    const cPosts = posts.filter((p) => p.competitorId === c.id);
    const topCta = countBy(cAds, (a) => a.ctaType)[0];
    return {
      competitorId: c.id,
      brandName: c.brandName,
      totalAds: cAds.length,
      newLast30Days: cAds.filter((a) => new Date(a.startDate).getTime() >= cutoff).length,
      activeAds: cAds.filter((a) => a.isActive).length,
      topCta: topCta ? CTA_LABELS[topCta.label as CtaType] : "-",
      totalLikes: cPosts.reduce((s, p) => s + p.likeCount, 0),
      totalComments: cPosts.reduce((s, p) => s + p.commentCount, 0),
      totalViews: cPosts.reduce((s, p) => s + p.viewCount, 0),
    };
  });
}

export function getTrend() {
  const catOf = new Map(competitors.map((c) => [c.id, c.category]));
  const categoryRanking = countBy(
    [...ads, ...posts],
    (x) => catOf.get(x.competitorId) ?? "기타"
  );
  const topHashtags = countBy(
    posts.flatMap((p) => p.hashtags),
    (t) => t
  ).slice(0, 15);

  const video = ads.filter((a) => a.mediaType === "VIDEO").length;
  const shortForm = posts.filter((p) => p.mediaType === "VIDEO").length;
  const text = ads.length - video + (posts.length - shortForm);

  return {
    categoryRanking,
    topHashtags,
    contentTypeRatio: [
      { label: "숏폼", count: shortForm },
      { label: "비디오", count: video },
      { label: "텍스트", count: text },
    ],
    topViewedPosts: [...posts].sort((a, b) => b.viewCount - a.viewCount).slice(0, 12),
  };
}

export function formatCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
