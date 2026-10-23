"use client";

import * as React from "react";
import {
  BookmarkPlusIcon,
  ExternalLinkIcon,
  FilmIcon,
  InfoIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  contentUrlKey,
  driveEmbedUrl,
  driveThumbUrl,
  parseDriveId,
  safeWebUrl,
  useVideoRefs,
  videoPlatform,
  videoRefUrl,
  type VideoRef,
  type VideoRefInput,
} from "@/lib/video-ref-store";
import { useCampaigns } from "@/lib/campaign-store";
import { useCreatorSettlements } from "@/lib/creator-settlement-store";
import { useInfluencerStore } from "@/lib/influencer-store";
import { engagementRate, type ContentMetrics } from "@/lib/pms-metrics";

const ALL = "__all__";
type Performance = { metrics: ContentMetrics; campaignName: string; creatorName: string; campaignId?: string; url: string };

function erLabel(metrics: ContentMetrics): string {
  const er = engagementRate(metrics);
  return er === null ? "—" : `${er.toFixed(2)}%`;
}

export default function VideoReferencesPage() {
  const { items, hydrated, add, update, patch, remove } = useVideoRefs();
  const { campaigns } = useCampaigns();
  const { records } = useCreatorSettlements();
  const { influencers } = useInfluencerStore();
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState(ALL);
  const [hookFilter, setHookFilter] = React.useState(ALL);
  const [appealFilter, setAppealFilter] = React.useState(ALL);
  const [sort, setSort] = React.useState("recent");
  const [editing, setEditing] = React.useState<VideoRef | "new" | null>(null);
  const [playing, setPlaying] = React.useState<VideoRef | null>(null);
  const [linking, setLinking] = React.useState<VideoRef | null>(null);
  const [showPms, setShowPms] = React.useState(false);

  const categories = React.useMemo(
    () => [...new Set(items.map((i) => i.category).filter(Boolean))].sort(),
    [items]
  );
  const hooks = [...new Set(items.map((item) => item.hook).filter((value): value is string => Boolean(value)))].sort();
  const appeals = [...new Set(items.map((item) => item.appeal).filter((value): value is string => Boolean(value)))].sort();

  const handles = new Map(influencers.map((creator) => [creator.id, creator.handle]));
  const performanceRows: Performance[] = [
    ...campaigns.flatMap((campaign) => campaign.creators.map((creator) => ({
      metrics: { views: creator.views, likes: creator.likes, comments: creator.comments, saves: creator.saves ?? 0, shares: creator.shares ?? 0 },
      campaignName: campaign.name,
      creatorName: handles.get(creator.influencerId) ?? creator.influencerId,
      campaignId: campaign.id,
      url: creator.uploadUrl,
    }))),
    ...records.map((record) => ({
      metrics: { views: 0, likes: 0, comments: 0, saves: 0, shares: 0, ...record.metrics },
      campaignName: record.campaignName,
      creatorName: record.creatorName,
      url: record.resultUrl,
    })),
  ];
  const performanceByUrl = new Map<string, Performance>();
  for (const row of performanceRows) {
    const key = contentUrlKey(row.url);
    if (key && (row.metrics.views > (performanceByUrl.get(key)?.metrics.views ?? -1))) performanceByUrl.set(key, row);
  }
  const importable = [...performanceByUrl.entries()].filter(([key]) => !items.some((item) => contentUrlKey(videoRefUrl(item)) === key));

  const filtered = items.filter((i) => {
    if (category !== ALL && i.category !== category) return false;
    if (hookFilter !== ALL && i.hook !== hookFilter) return false;
    if (appealFilter !== ALL && i.appeal !== appealFilter) return false;
    const q = query.trim().toLowerCase();
    return !q || `${i.title} ${i.brand} ${i.category} ${i.note} ${i.hook ?? ""} ${i.appeal ?? ""} ${(i.tags ?? []).join(" ")} ${videoPlatform(i)}`.toLowerCase().includes(q);
  }).sort((a, b) => {
    if (sort === "views") return (performanceByUrl.get(contentUrlKey(videoRefUrl(b)) ?? "")?.metrics.views ?? 0) - (performanceByUrl.get(contentUrlKey(videoRefUrl(a)) ?? "")?.metrics.views ?? 0);
    if (sort === "er") return (engagementRate(performanceByUrl.get(contentUrlKey(videoRefUrl(b)) ?? "")?.metrics ?? { views: 0, likes: 0, comments: 0, saves: 0, shares: 0 }) ?? -1) - (engagementRate(performanceByUrl.get(contentUrlKey(videoRefUrl(a)) ?? "")?.metrics ?? { views: 0, likes: 0, comments: 0, saves: 0, shares: 0 }) ?? -1);
    return b.createdAt.localeCompare(a.createdAt);
  });

  function importPerformance(row: Performance) {
    const parsed = parseDriveId(row.url);
    const driveId = "id" in parsed ? parsed.id : "";
    add({
      title: `${row.campaignName} · ${row.creatorName}`,
      brand: row.campaignName,
      category: "업로드 콘텐츠",
      note: "PMS 결과 URL에서 가져옴",
      driveId,
      sourceUrl: driveId ? "" : row.url,
      hook: "",
      appeal: "",
      tags: [],
      campaignIds: row.campaignId ? [row.campaignId] : [],
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="mt-1 text-sm text-muted-foreground">
          릴스·쇼츠·드라이브 영상을 훅과 소구로 정리하고 캠페인에 연결합니다.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" className="h-9 py-2" onClick={() => setShowPms(true)}>PMS 콘텐츠 가져오기</Button>
          <Button className="h-9 py-2" onClick={() => setEditing("new")}>
            <PlusIcon className="size-3.5" /> 영상 추가
          </Button>
        </div>
      </div>

      <Card className="shadow-xs">
        <CardContent className="flex gap-3 text-sm text-muted-foreground">
          <InfoIcon className="mt-0.5 size-4 shrink-0" />
          <p>
            드라이브 영상은 공유 설정에 따라 미리보기가 제한될 수 있습니다. 외부 영상은 원본 사이트에서 엽니다.
            PMS의 ER은 같은 결과 URL과 조회수 데이터가 있을 때만 표시됩니다. 저장한 레퍼런스와 캠페인 연결은 현재 브라우저에 보관됩니다.
          </p>
        </CardContent>
      </Card>

      {items.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="제목, 브랜드, 훅, 소구, 태그 검색"
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
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-9 w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>카테고리 전체</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={hookFilter} onValueChange={setHookFilter}>
            <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value={ALL}>훅 전체</SelectItem>{hooks.map((hook) => <SelectItem key={hook} value={hook}>{hook}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={appealFilter} onValueChange={setAppealFilter}>
            <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value={ALL}>소구 전체</SelectItem>{appeals.map((appeal) => <SelectItem key={appeal} value={appeal}>{appeal}</SelectItem>)}</SelectContent>
          </Select>
          <select aria-label="정렬" value={sort} onChange={(event) => setSort(event.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm"><option value="recent">최근 등록순</option><option value="views">조회수순</option><option value="er">ER순</option></select>
          <span className="text-xs text-muted-foreground tabular-nums">{filtered.length}개</span>
        </div>
      )}

      {hydrated && items.length === 0 ? (
        <Card className="shadow-xs">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <FilmIcon className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">등록된 레퍼런스 영상이 없습니다</p>
            <Button variant="outline" className="h-9 py-2" onClick={() => setEditing("new")}>
              첫 영상 추가하기
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 && items.length > 0 ? (
        <Card className="shadow-xs">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            조건에 맞는 영상이 없습니다
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((v) => (
            <VideoCard
              key={v.id}
              video={v}
              performance={performanceByUrl.get(contentUrlKey(videoRefUrl(v)) ?? "")}
              onPlay={() => setPlaying(v)}
              onEdit={() => setEditing(v)}
              onLink={() => setLinking(v)}
              onDelete={() => {
                if (window.confirm(`"${v.title}" 영상을 목록에서 삭제할까요? (드라이브 파일은 지워지지 않습니다)`)) remove(v.id);
              }}
            />
          ))}
        </div>
      )}

      <PlayerDialog video={playing} onClose={() => setPlaying(null)} />
      <Dialog open={showPms} onOpenChange={setShowPms}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader><DialogTitle>PMS 콘텐츠 가져오기</DialogTitle><DialogDescription>결과 URL이 등록된 콘텐츠를 레퍼런스로 저장합니다. 같은 URL은 다시 표시하지 않습니다.</DialogDescription></DialogHeader>
          {importable.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">가져올 콘텐츠가 없습니다.</p> : <div className="space-y-2">{importable.map(([key, row]) => <div key={key} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{row.campaignName} · {row.creatorName}</p><p className="truncate text-xs text-muted-foreground">조회 {row.metrics.views.toLocaleString("ko-KR")} · ER {erLabel(row.metrics)}</p></div><Button size="sm" onClick={() => importPerformance(row)}>가져오기</Button></div>)}</div>}
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(linking)} onOpenChange={(open) => !open && setLinking(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>캠페인에 저장</DialogTitle><DialogDescription>{linking?.title}</DialogDescription></DialogHeader>
          {campaigns.length === 0 ? <p className="text-sm text-muted-foreground">등록된 캠페인이 없습니다.</p> : <div className="max-h-72 space-y-2 overflow-y-auto">{campaigns.map((campaign) => {
            const linked = Boolean(linking?.campaignIds?.includes(campaign.id));
            return <label key={campaign.id} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm"><input type="checkbox" checked={linked} onChange={() => { if (!linking) return; const next = linked ? (linking.campaignIds ?? []).filter((id) => id !== campaign.id) : [...(linking.campaignIds ?? []), campaign.id]; patch(linking.id, { campaignIds: next }); setLinking({ ...linking, campaignIds: next }); }} /><span className="truncate">{campaign.name}</span></label>;
          })}</div>}
        </DialogContent>
      </Dialog>
      <EditDialog
        target={editing}
        categories={categories}
        hooks={hooks}
        appeals={appeals}
        onClose={() => setEditing(null)}
        onSave={(input) => {
          if (editing && editing !== "new") update(editing.id, input);
          else add(input);
          setEditing(null);
        }}
      />
    </div>
  );
}

function Thumb({ video }: { video: VideoRef }) {
  const [failed, setFailed] = React.useState(false);
  const thumbnail = video.thumbnailUrl || (video.driveId ? driveThumbUrl(video.driveId) : "");
  return (
    <div className="relative aspect-video overflow-hidden bg-muted">
      {thumbnail && !failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnail}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      )}
      {(!thumbnail || failed) && (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/20">
          <FilmIcon className="size-7 text-muted-foreground" />
        </div>
      )}
      <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
        <span className="flex size-10 items-center justify-center rounded-full bg-background/90 opacity-0 shadow-md transition-opacity group-hover:opacity-100">
          <PlayIcon className="size-4" />
        </span>
      </span>
    </div>
  );
}

function VideoCard({
  video,
  performance,
  onPlay,
  onEdit,
  onLink,
  onDelete,
}: {
  video: VideoRef;
  performance?: Performance;
  onPlay: () => void;
  onEdit: () => void;
  onLink: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="group gap-0 overflow-hidden py-0 shadow-xs">
      <button type="button" onClick={onPlay} className="block w-full text-left" aria-label={`${video.title} 재생`}>
        <Thumb video={video} />
      </button>
      <CardContent className="space-y-2 py-3">
        <p className="line-clamp-2 text-sm font-medium leading-snug">{video.title}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {video.brand && (
            <Badge variant="secondary" className="font-normal">
              {video.brand}
            </Badge>
          )}
          {video.category && (
            <Badge variant="outline" className="font-normal">
              {video.category}
            </Badge>
          )}
          <Badge variant="outline" className="font-normal">{videoPlatform(video)}</Badge>
        </div>
        {(video.hook || video.appeal) && <p className="text-xs text-muted-foreground">{[video.hook && `훅 · ${video.hook}`, video.appeal && `소구 · ${video.appeal}`].filter(Boolean).join("  /  ")}</p>}
        {(video.tags ?? []).length > 0 && <div className="flex flex-wrap gap-1">{video.tags?.slice(0, 4).map((tag) => <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">#{tag}</span>)}</div>}
        {performance && performance.metrics.views > 0 && <p className="text-xs font-medium tabular-nums">조회 {performance.metrics.views.toLocaleString("ko-KR")} · ER {erLabel(performance.metrics)}</p>}
        {video.note && <p className="line-clamp-2 text-xs text-muted-foreground">{video.note}</p>}
        <div className="flex items-center justify-between gap-1">
          <Button variant="outline" size="sm" onClick={onLink}><BookmarkPlusIcon className="size-3.5" /> 캠페인 {video.campaignIds?.length ? video.campaignIds.length : "저장"}</Button>
          <div className="flex gap-1">
          <Button variant="ghost" size="icon-sm" aria-label="수정" onClick={onEdit}>
            <PencilIcon className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="삭제" onClick={onDelete}>
            <Trash2Icon className="size-3.5 text-muted-foreground" />
          </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PlayerDialog({ video, onClose }: { video: VideoRef | null; onClose: () => void }) {
  return (
    <Dialog open={!!video} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
        {video && (
          <>
            <DialogHeader>
              <DialogTitle>{video.title}</DialogTitle>
              <DialogDescription>
                {[video.brand, video.category, videoPlatform(video)].filter(Boolean).join(" · ") || "레퍼런스 영상"}
              </DialogDescription>
            </DialogHeader>
            {video.driveId ? <div className="aspect-video overflow-hidden rounded-2xl bg-black"><iframe src={driveEmbedUrl(video.driveId)} title={video.title} allow="autoplay; fullscreen" allowFullScreen className="h-full w-full border-0" /></div> : <div className="flex aspect-video flex-col items-center justify-center gap-2 rounded-2xl bg-muted text-center"><FilmIcon className="size-9 text-muted-foreground" /><p className="text-sm text-muted-foreground">외부 영상은 원본 사이트에서 확인하세요.</p></div>}
            {video.note && <p className="text-sm whitespace-pre-line text-muted-foreground">{video.note}</p>}
            <DialogFooter className="items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                {video.driveId ? "재생되지 않으면 드라이브 공유 설정을 확인하세요." : "새 탭에서 원본 영상을 엽니다."}
              </p>
              <Button asChild variant="outline" size="sm">
                <a href={videoRefUrl(video)} target="_blank" rel="noopener noreferrer">
                  <ExternalLinkIcon className="size-3.5" /> 원본 열기
                </a>
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({
  target,
  categories,
  hooks,
  appeals,
  onClose,
  onSave,
}: {
  target: VideoRef | "new" | null;
  categories: string[];
  hooks: string[];
  appeals: string[];
  onClose: () => void;
  onSave: (input: VideoRefInput) => void;
}) {
  const existing = target && target !== "new" ? target : null;
  const [link, setLink] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [brand, setBrand] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [note, setNote] = React.useState("");
  const [hook, setHook] = React.useState("");
  const [appeal, setAppeal] = React.useState("");
  const [tags, setTags] = React.useState("");
  const [thumbnailUrl, setThumbnailUrl] = React.useState("");
  const [error, setError] = React.useState("");
  const [syncedKey, setSyncedKey] = React.useState<string | null>(null);

  // 열릴 때마다 대상의 저장값으로 폼을 맞춘다.
  const key = target === null ? null : target === "new" ? "new" : target.id;
  if (key !== syncedKey) {
    setSyncedKey(key);
    setLink(existing ? videoRefUrl(existing) : "");
    setTitle(existing?.title ?? "");
    setBrand(existing?.brand ?? "");
    setCategory(existing?.category ?? "");
    setNote(existing?.note ?? "");
    setHook(existing?.hook ?? "");
    setAppeal(existing?.appeal ?? "");
    setTags((existing?.tags ?? []).join(", "));
    setThumbnailUrl(existing?.thumbnailUrl ?? "");
    setError("");
  }

  const submit = () => {
    let driveId = "";
    let sourceUrl = "";
    const webUrl = safeWebUrl(link);
    const isDrive = !webUrl || /(^|\.)(drive|docs)\.google\.com$/.test(new URL(webUrl).hostname);
    if (isDrive) {
      const parsed = parseDriveId(link);
      if ("error" in parsed) { setError(parsed.error); return; }
      driveId = parsed.id;
    } else {
      sourceUrl = webUrl;
    }
    if (!title.trim()) {
      setError("제목을 입력하세요");
      return;
    }
    if (thumbnailUrl.trim() && !safeWebUrl(thumbnailUrl)) {
      setError("썸네일은 http 또는 https 이미지 URL을 입력하세요");
      return;
    }
    onSave({
      driveId,
      sourceUrl,
      title: title.trim(),
      brand: brand.trim(),
      category: category.trim(),
      note: note.trim(),
      hook: hook.trim(),
      appeal: appeal.trim(),
      thumbnailUrl: thumbnailUrl.trim(),
      tags: [...new Set(tags.split(",").map((tag) => tag.trim().replace(/^#/, "")).filter(Boolean))],
    });
  };

  return (
    <Dialog open={target !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? "영상 수정" : "영상 추가"}</DialogTitle>
          <DialogDescription>인스타그램·틱톡·유튜브·드라이브 영상 링크를 등록하세요.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="vref-link">영상 URL</Label>
            <Input
              id="vref-link"
              value={link}
              onChange={(e) => {
                setLink(e.target.value);
                setError("");
              }}
              placeholder="https://www.instagram.com/reel/…"
            />
          </div>
          <div className="space-y-1.5"><Label htmlFor="vref-thumbnail">썸네일 URL (선택)</Label><Input id="vref-thumbnail" value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="이미지 URL을 입력하면 카드에 표시됩니다" /></div>
          <div className="space-y-1.5">
            <Label htmlFor="vref-title">제목</Label>
            <Input id="vref-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 클린뷰티 릴스 후킹 레퍼런스" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="vref-hook">훅</Label><Input id="vref-hook" list="vref-hooks" value={hook} onChange={(e) => setHook(e.target.value)} placeholder="예: 질문형, 전후 비교" /><datalist id="vref-hooks">{hooks.map((value) => <option key={value} value={value} />)}</datalist></div>
            <div className="space-y-1.5"><Label htmlFor="vref-appeal">소구</Label><Input id="vref-appeal" list="vref-appeals" value={appeal} onChange={(e) => setAppeal(e.target.value)} placeholder="예: 성분, 가격, 후기" /><datalist id="vref-appeals">{appeals.map((value) => <option key={value} value={value} />)}</datalist></div>
          </div>
          <div className="space-y-1.5"><Label htmlFor="vref-tags">태그</Label><Input id="vref-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="예: 릴스, 뷰티, 3초훅 (쉼표로 구분)" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="vref-brand">브랜드</Label>
              <Input id="vref-brand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="선택 입력" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vref-category">카테고리</Label>
              <Input
                id="vref-category"
                list="vref-categories"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="예: 뷰티, 푸드"
              />
              <datalist id="vref-categories">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vref-note">메모</Label>
            <Textarea id="vref-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="이 영상을 레퍼런스로 쓰는 이유" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={submit}>{existing ? "저장" : "추가"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
