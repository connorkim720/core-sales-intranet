"use client";

import * as React from "react";
import dayjs from "dayjs";
import {
  CheckIcon,
  ChevronDownIcon,
  ClipboardListIcon,
  DownloadIcon,
  ExternalLinkIcon,
  MessageSquareTextIcon,
  PackageIcon,
  PlayIcon,
  UploadIcon,
} from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { CreatorAvatar, PlatformDot } from "@/components/campaign/creator-avatar";
import {
  stageOf,
  stepStates,
  type Campaign,
  type CampaignCreator,
  type StepKey,
} from "@/lib/campaign-store";
import type { Influencer } from "@/lib/influencer-data";

type Props = {
  campaign: Campaign;
  influencerById: Map<string, Influencer>;
  onUpdate: (fn: (c: Campaign) => Campaign) => void;
  onUpdateCreator: (influencerId: string, patch: Partial<CampaignCreator>) => void;
};

type Review = { kind: "script" | "video" | "upload"; influencerId: string } | null;

function isWebUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

const yymmdd = (iso: string) => dayjs(iso).format("YY/MM/DD");

const STATE_TEXT_CLASS = {
  done: "text-emerald-600",
  active: "text-orange-500",
  todo: "text-muted-foreground",
} as const;

export function ProgressTab({ campaign, influencerById, onUpdate, onUpdateCreator }: Props) {
  const states = stepStates(campaign);
  const firstActive = states.find((s) => s.state === "active")?.key ?? "script";
  const [openKey, setOpenKey] = React.useState<StepKey>(firstActive);
  const [guidelineOpen, setGuidelineOpen] = React.useState(false);
  const [review, setReview] = React.useState<Review>(null);

  const stateOf = (k: StepKey) => states.find((s) => s.key === k)!;

  const downloadAddressSheet = () => {
    // 주소 데이터는 이 앱에 없어서 크리에이터 목록과 빈 입력 칸만 있는 양식을 내려받는다.
    const rows = [
      ["핸들", "플랫폼", "수령인", "연락처", "주소"],
      ...campaign.creators.map((c) => {
        const inf = influencerById.get(c.influencerId);
        return [inf ? `@${inf.handle}` : c.influencerId, inf?.platform ?? "", "", "", ""];
      }),
    ];
    const csv = "﻿" + rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${campaign.name}-배송지양식.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      {/* 전체 프로세스 */}
      <Card className="h-fit shadow-xs">
        <CardContent className="space-y-4">
          <p className="text-sm font-semibold">
            전체 프로세스 <span className="font-normal text-muted-foreground">{campaign.creators.length}명</span>
          </p>
          <ol className="relative space-y-5">
            {states.map((s, i) => (
              <li key={s.key}>
                <button
                  type="button"
                  onClick={() => setOpenKey(s.key)}
                  className="relative flex w-full items-start gap-3 text-left"
                >
                  {i < states.length - 1 && (
                    <span className="absolute top-6 left-[11px] h-[calc(100%-4px)] w-px bg-border" aria-hidden />
                  )}
                  <span
                    className={`relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full text-white ${
                      s.state === "done"
                        ? "bg-emerald-500"
                        : s.state === "active"
                          ? "bg-orange-500"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {s.state === "done" ? (
                      <CheckIcon className="size-3.5" />
                    ) : (
                      <span className="size-2 rounded-full bg-current" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`block text-sm leading-tight ${
                        s.state === "todo" ? "text-muted-foreground" : "font-medium"
                      }`}
                    >
                      {s.label}
                    </span>
                    <span className={`text-xs ${STATE_TEXT_CLASS[s.state]}`}>{s.note}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {/* 1. 콘텐츠 가이드라인 */}
        <Card className="shadow-xs">
          <CardContent className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ClipboardListIcon className="size-4 text-muted-foreground" /> 콘텐츠 가이드라인
              <span className={`text-xs font-normal ${STATE_TEXT_CLASS[stateOf("guideline").state]}`}>
                {stateOf("guideline").note}
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={() => setGuidelineOpen(true)}>
              {campaign.guidelineText.trim() ? "작성한 가이드라인 보기" : "가이드라인 작성"}
            </Button>
          </CardContent>
        </Card>

        {/* 2. 제품 배송 */}
        <Card className="shadow-xs">
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <PackageIcon className="size-4 text-muted-foreground" /> 제품 배송
              <span className={`text-xs font-normal ${STATE_TEXT_CLASS[stateOf("shipping").state]}`}>
                {stateOf("shipping").note}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={downloadAddressSheet}>
                <DownloadIcon className="size-3.5" /> 배송지 양식 다운로드
              </Button>
              <Button
                size="sm"
                variant={campaign.shippingDone ? "secondary" : "default"}
                onClick={() => onUpdate((c) => ({ ...c, shippingDone: !c.shippingDone }))}
              >
                {campaign.shippingDone ? "배송 완료 취소" : "배송 완료 처리"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 3~5. 크리에이터별 단계 */}
        <StepSection
          stepKey="script"
          title="대본 피드백"
          icon={<MessageSquareTextIcon className="size-4 text-muted-foreground" />}
          deadline={`${yymmdd(campaign.deadlines.script)} 까지`}
          state={stateOf("script")}
          open={openKey === "script"}
          onToggle={() => setOpenKey(openKey === "script" ? "guideline" : "script")}
        >
          {campaign.creators.map((c) => (
            <CreatorRow key={c.influencerId} creator={influencerById.get(c.influencerId)}>
              {c.script === "writing" && (
                <StatusAction
                  text="대본 작성 중"
                  sub={`${dayjs(campaign.deadlines.script).format("MM/DD")} 까지`}
                  button="제출 확인"
                  onClick={() => onUpdateCreator(c.influencerId, { script: "review" })}
                />
              )}
              {c.script === "review" && (
                <Button size="sm" onClick={() => setReview({ kind: "script", influencerId: c.influencerId })}>
                  대본 피드백하기
                </Button>
              )}
              {c.script === "done" && (
                <DoneAction text="대본 피드백 완료" onUndo={() => onUpdateCreator(c.influencerId, { script: "review" })} />
              )}
            </CreatorRow>
          ))}
        </StepSection>

        <StepSection
          stepKey="video"
          title="영상 피드백"
          icon={<PlayIcon className="size-4 text-muted-foreground" />}
          deadline={`${yymmdd(campaign.deadlines.video)} 까지`}
          state={stateOf("video")}
          open={openKey === "video"}
          onToggle={() => setOpenKey(openKey === "video" ? "guideline" : "video")}
        >
          {campaign.creators.map((c) => (
            <CreatorRow key={c.influencerId} creator={influencerById.get(c.influencerId)}>
              {c.script !== "done" ? (
                <span className="text-sm text-muted-foreground">대본 피드백 대기</span>
              ) : c.video === "writing" ? (
                <StatusAction
                  text="영상 제작 중"
                  sub={`${dayjs(campaign.deadlines.video).format("MM/DD")} 까지`}
                  button="제출 확인"
                  onClick={() => onUpdateCreator(c.influencerId, { video: "review" })}
                />
              ) : c.video === "review" ? (
                <Button size="sm" onClick={() => setReview({ kind: "video", influencerId: c.influencerId })}>
                  영상 피드백하기
                </Button>
              ) : (
                <DoneAction text="영상 피드백 완료" onUndo={() => onUpdateCreator(c.influencerId, { video: "review" })} />
              )}
            </CreatorRow>
          ))}
        </StepSection>

        <StepSection
          stepKey="upload"
          title="업로드 확인"
          icon={<UploadIcon className="size-4 text-muted-foreground" />}
          deadline={`${yymmdd(campaign.deadlines.uploadFrom)} ~ ${yymmdd(campaign.deadlines.uploadTo)}`}
          state={stateOf("upload")}
          open={openKey === "upload"}
          onToggle={() => setOpenKey(openKey === "upload" ? "guideline" : "upload")}
        >
          {campaign.creators.map((c) => (
            <CreatorRow key={c.influencerId} creator={influencerById.get(c.influencerId)}>
              {stageOf(c) === "script" || stageOf(c) === "video" ? (
                <span className="text-sm text-muted-foreground">영상 피드백 대기</span>
              ) : c.upload === "pending" ? (
                <StatusAction
                  text="업로드 전"
                  sub={`${dayjs(campaign.deadlines.uploadTo).format("MM/DD")} 까지`}
                  button="업로드 등록"
                  onClick={() => setReview({ kind: "upload", influencerId: c.influencerId })}
                />
              ) : c.upload === "uploaded" ? (
                <Button size="sm" onClick={() => setReview({ kind: "upload", influencerId: c.influencerId })}>
                  업로드 확인
                </Button>
              ) : (
                <>
                  {c.paCode && <span className="max-w-32 truncate text-xs text-muted-foreground" title={c.paCode}>PA {c.paCode}</span>}
                  <Button variant="outline" size="sm" onClick={() => setReview({ kind: "upload", influencerId: c.influencerId })}>
                    게시물·코드 보기
                  </Button>
                  <DoneAction text="업로드 확인 완료" onUndo={() => onUpdateCreator(c.influencerId, { upload: "uploaded" })} />
                </>
              )}
            </CreatorRow>
          ))}
        </StepSection>
      </div>

      <GuidelineDialog
        open={guidelineOpen}
        onOpenChange={setGuidelineOpen}
        campaign={campaign}
        onSave={(text, done) => onUpdate((c) => ({ ...c, guidelineText: text, guidelineDone: done }))}
      />
      <ReviewDialog
        review={review}
        onClose={() => setReview(null)}
        campaign={campaign}
        influencerById={influencerById}
        onUpdateCreator={onUpdateCreator}
      />
    </div>
  );
}

function StepSection({
  title,
  icon,
  deadline,
  state,
  open,
  onToggle,
  children,
}: {
  stepKey: StepKey;
  title: string;
  icon: React.ReactNode;
  deadline: string;
  state: { state: "done" | "active" | "todo"; note: string };
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="shadow-xs">
      <CardContent className="space-y-3">
        <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-3 text-left">
          <span className="flex items-center gap-2 text-sm font-medium">
            {icon} {title}
            <span className={`text-xs font-normal ${STATE_TEXT_CLASS[state.state]}`}>{state.note}</span>
          </span>
          <span className="flex items-center gap-2">
            <span
              className={`text-xs tabular-nums ${state.state === "active" ? "font-medium text-orange-500" : "text-muted-foreground"}`}
            >
              {deadline}
            </span>
            <ChevronDownIcon className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
          </span>
        </button>
        {open && <div className="space-y-2 border-t pt-3">{children}</div>}
      </CardContent>
    </Card>
  );
}

function CreatorRow({ creator, children }: { creator?: Influencer; children: React.ReactNode }) {
  if (!creator) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-muted/40 px-4 py-3">
      <div className="flex items-center gap-3">
        <CreatorAvatar creator={creator} />
        <div>
          <p className="flex items-center gap-1.5 text-sm font-medium">
            {creator.handle} <PlatformDot platform={creator.platform} />
          </p>
          <p className="text-xs text-muted-foreground">
            {creator.platform === "instagram" ? "Instagram" : "TikTok"} · {creator.followers.toLocaleString()}명
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">{children}</div>
    </div>
  );
}

function StatusAction({
  text,
  sub,
  button,
  onClick,
}: {
  text: string;
  sub: string;
  button: string;
  onClick: () => void;
}) {
  return (
    <>
      <div className="text-right">
        <p className="text-sm font-medium">{text}</p>
        <p className="text-xs text-muted-foreground tabular-nums">{sub}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onClick}>
        {button}
      </Button>
    </>
  );
}

function DoneAction({ text, onUndo }: { text: string; onUndo: () => void }) {
  return (
    <>
      <span className="flex items-center gap-1 text-sm font-medium text-emerald-600">
        <CheckIcon className="size-4" /> {text}
      </span>
      <Button variant="ghost" size="sm" onClick={onUndo}>
        되돌리기
      </Button>
    </>
  );
}

function GuidelineDialog({
  open,
  onOpenChange,
  campaign,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  campaign: Campaign;
  onSave: (text: string, done: boolean) => void;
}) {
  const [text, setText] = React.useState(campaign.guidelineText);
  const [syncedOpen, setSyncedOpen] = React.useState(open);
  // 열릴 때마다 저장된 값으로 되돌려서 편집 중이던 내용이 남지 않게 한다.
  if (open !== syncedOpen) {
    setSyncedOpen(open);
    if (open) setText(campaign.guidelineText);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>콘텐츠 가이드라인</DialogTitle>
          <DialogDescription>크리에이터에게 전달할 제작 기준입니다.</DialogDescription>
        </DialogHeader>
        <Textarea
          rows={9}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"- 핵심 메시지\n- 영상 길이\n- 필수 해시태그\n- 금지 사항"}
        />
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onSave(text, false);
              onOpenChange(false);
            }}
          >
            저장
          </Button>
          <Button
            disabled={!text.trim()}
            onClick={() => {
              onSave(text, true);
              onOpenChange(false);
            }}
          >
            저장하고 작성 완료
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReviewDialog({
  review,
  onClose,
  campaign,
  influencerById,
  onUpdateCreator,
}: {
  review: Review;
  onClose: () => void;
  campaign: Campaign;
  influencerById: Map<string, Influencer>;
  onUpdateCreator: (id: string, patch: Partial<CampaignCreator>) => void;
}) {
  const target = review ? campaign.creators.find((c) => c.influencerId === review.influencerId) : undefined;
  const inf = review ? influencerById.get(review.influencerId) : undefined;
  const [text, setText] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [paCode, setPaCode] = React.useState("");
  const [key, setKey] = React.useState<string | null>(null);

  // 다른 대상을 열 때 입력값을 저장된 값으로 맞춘다.
  const openKey = review ? `${review.kind}:${review.influencerId}` : null;
  if (openKey !== key) {
    setKey(openKey);
    if (review && target) {
      setText(review.kind === "script" ? target.scriptFeedback : review.kind === "video" ? target.videoFeedback : "");
      setUrl(review.kind === "script" ? target.scriptUrl ?? "" : review.kind === "video" ? target.videoUrl ?? "" : target.uploadUrl);
      setPaCode(target.paCode ?? "");
    }
  }

  if (!review || !target || !inf) {
    return (
      <Dialog open={false} onOpenChange={onClose}>
        <DialogContent />
      </Dialog>
    );
  }

  const id = review.influencerId;
  const title = review.kind === "script" ? "대본 피드백" : review.kind === "video" ? "영상 피드백" : "업로드 확인";
  const enteredUrl = url.trim();
  const validUrl = !enteredUrl || isWebUrl(enteredUrl);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {title} · @{inf.handle}
          </DialogTitle>
          <DialogDescription>
            {review.kind === "upload"
              ? "업로드된 게시물 주소를 등록하고 가이드라인대로 올라갔는지 확인합니다."
              : "피드백을 남기고 수정 요청 또는 완료 처리합니다."}
          </DialogDescription>
        </DialogHeader>

        {review.kind === "upload" ? (
          <div className="space-y-3">
            <Input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.instagram.com/p/…" />
            <div className="space-y-1">
              <p className="text-sm font-medium">PA 광고 코드 <span className="font-normal text-muted-foreground">(선택·수동 입력)</span></p>
              <Input value={paCode} onChange={(e) => setPaCode(e.target.value)} placeholder="크리에이터에게 받은 코드" aria-label="PA 광고 코드" />
              <p className="text-xs text-muted-foreground">코드 발급이나 유효성 확인은 이 앱에서 처리하지 않습니다.</p>
            </div>
            {target.upload !== "pending" && isWebUrl(target.uploadUrl) && (
              <a
                href={target.uploadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLinkIcon className="size-3" /> 등록된 게시물 열기
              </a>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <p className="text-sm font-medium">{review.kind === "script" ? "대본 원본 링크" : "영상 초안 링크"}</p>
              <Input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
                aria-label={review.kind === "script" ? "대본 원본 링크" : "영상 초안 링크"}
              />
              <p className="text-xs text-muted-foreground">공유 가능한 원본 주소를 등록하면 피드백할 때 다시 열 수 있습니다.</p>
            </div>
            {enteredUrl && validUrl && (
              <a href={enteredUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                <ExternalLinkIcon className="size-3" /> 원본 새 창에서 보기
              </a>
            )}
            <Textarea
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={review.kind === "script" ? "대본에 대한 피드백을 입력하세요" : "영상에 대한 피드백을 입력하세요"}
            />
          </div>
        )}

        {!validUrl && <p className="text-xs text-destructive">http:// 또는 https:// 주소를 입력하세요.</p>}

        <DialogFooter>
          {review.kind === "script" && (
            <>
              <Button
                variant="outline"
                disabled={!validUrl}
                onClick={() => {
                  onUpdateCreator(id, { script: "writing", scriptFeedback: text, scriptUrl: enteredUrl });
                  onClose();
                }}
              >
                수정 요청
              </Button>
              <Button
                disabled={!validUrl}
                onClick={() => {
                  onUpdateCreator(id, { script: "done", scriptFeedback: text, scriptUrl: enteredUrl });
                  onClose();
                }}
              >
                피드백 완료
              </Button>
            </>
          )}
          {review.kind === "video" && (
            <>
              <Button
                variant="outline"
                disabled={!validUrl}
                onClick={() => {
                  onUpdateCreator(id, { video: "writing", videoFeedback: text, videoUrl: enteredUrl });
                  onClose();
                }}
              >
                수정 요청
              </Button>
              <Button
                disabled={!validUrl}
                onClick={() => {
                  onUpdateCreator(id, { video: "done", videoFeedback: text, videoUrl: enteredUrl });
                  onClose();
                }}
              >
                피드백 완료
              </Button>
            </>
          )}
          {review.kind === "upload" && (
            <>
              {target.upload !== "pending" ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      onUpdateCreator(id, { upload: "pending" });
                      onClose();
                    }}
                  >
                    재업로드 요청
                  </Button>
                  <Button
                    disabled={!validUrl || !enteredUrl}
                    onClick={() => {
                      onUpdateCreator(id, { upload: "done", uploadUrl: enteredUrl, paCode: paCode.trim() });
                      onClose();
                    }}
                  >
                    확인 완료
                  </Button>
                </>
              ) : (
                <Button
                  disabled={!enteredUrl || !validUrl}
                  onClick={() => {
                    onUpdateCreator(id, { upload: "uploaded", uploadUrl: enteredUrl, paCode: paCode.trim() });
                    onClose();
                  }}
                >
                  업로드 등록
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
