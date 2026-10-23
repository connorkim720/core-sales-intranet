import dayjs from "dayjs";
import { HeartIcon, MessageCircleIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CTA_LABELS,
  PLATFORM_LABELS,
  formatCompact,
  type AdCreative,
  type OrganicPost,
} from "@/lib/ad-monitor/data";

export function AdCreativeCard({ ad }: { ad: AdCreative }) {
  return (
    <Card className="gap-0 overflow-hidden py-0 shadow-xs">
      <div className="relative aspect-[4/5] bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ad.thumbnailUrl} alt="" className="h-full w-full object-cover" />
        <div className="absolute top-2 left-2">
          <Badge>{ad.brandName}</Badge>
        </div>
        <div className="absolute top-2 right-2">
          <Badge variant="secondary">{PLATFORM_LABELS[ad.platform] ?? ad.platform}</Badge>
        </div>
        {!ad.isActive && (
          <div className="absolute bottom-2 left-2">
            <Badge variant="secondary">종료됨</Badge>
          </div>
        )}
      </div>
      <CardContent className="flex flex-1 flex-col gap-2 py-3">
        <p className="line-clamp-2 text-[13px] leading-snug">{ad.copyText}</p>
        <div className="mt-auto flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {dayjs(ad.startDate).format("MM.DD")}
          </span>
          <Badge variant="outline" className="font-normal">
            {CTA_LABELS[ad.ctaType] ?? ad.ctaType}
          </Badge>
        </div>
        {ad.analysis && (
          <p className="text-[11px] text-muted-foreground">
            {ad.analysis.hookType} · {ad.analysis.appealPoint}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function OrganicPostCard({ post }: { post: OrganicPost }) {
  return (
    <Card className="gap-0 overflow-hidden py-0 shadow-xs">
      <div className="relative aspect-square bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://picsum.photos/seed/${post.id}/500/500`}
          alt=""
          className="h-full w-full object-cover"
        />
        <div className="absolute top-2 left-2">
          <Badge>{post.brandName}</Badge>
        </div>
        {post.mediaType === "VIDEO" && post.videoDurationSec ? (
          <div className="absolute right-2 bottom-2">
            <Badge variant="secondary">{post.videoDurationSec}초</Badge>
          </div>
        ) : null}
      </div>
      <CardContent className="flex flex-1 flex-col gap-2 py-3">
        <p className="line-clamp-2 text-[13px] leading-snug">{post.caption}</p>
        <div className="flex flex-wrap gap-x-1.5 gap-y-0.5">
          {post.hashtags.slice(0, 4).map((tag) => (
            <span key={tag} className="text-[11px] text-primary">
              #{tag}
            </span>
          ))}
        </div>
        <div className="mt-auto flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
          <span>{dayjs(post.postedAt).format("MM.DD")}</span>
          <span className="flex items-center gap-2">
            <span className="flex items-center gap-0.5">
              <HeartIcon className="size-3" /> {formatCompact(post.likeCount)}
            </span>
            <span className="flex items-center gap-0.5">
              <MessageCircleIcon className="size-3" /> {formatCompact(post.commentCount)}
            </span>
            {post.viewCount > 0 && <span>조회 {formatCompact(post.viewCount)}</span>}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function BarList({
  title,
  items,
}: {
  title: string;
  items: { label: string; count: number }[];
}) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">데이터 없음</p>
        ) : (
          <div className="space-y-2.5">
            {items.map((i) => (
              <div key={i.label}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="truncate">{i.label}</span>
                  <span className="text-muted-foreground tabular-nums">{i.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(i.count / max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
