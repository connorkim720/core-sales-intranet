"use client";

import * as React from "react";
import Link from "next/link";
import {
  BotIcon,
  CheckIcon,
  CopyIcon,
  FileTextIcon,
  MegaphoneIcon,
  MessageSquareTextIcon,
  PlayIcon,
  UserSearchIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  buildCreativeInsight,
  buildOutreach,
  buildWeeklyDraft,
  matchCreators,
  type CreatorMatch,
  type WeeklyDraft,
} from "@/lib/agents";
import { IRM_LIMIT, useCreatorIrm } from "@/lib/creator-irm-store";
import { useCustomerStore } from "@/lib/customer-store";
import { DEMO_TODAY } from "@/lib/format";
import { useInfluencerStore } from "@/lib/influencer-store";

type AgentId = "matcher" | "outreach" | "weekly" | "creative";

const AGENTS: {
  id: AgentId;
  name: string;
  role: string;
  desc: string;
  icon: React.ReactElement;
}[] = [
  {
    id: "matcher",
    name: "매칭 에이전트",
    role: "크리에이터 추천",
    desc: "브리프를 읽고 어울리는 크리에이터를 골라 이유와 함께 추천합니다.",
    icon: <UserSearchIcon />,
  },
  {
    id: "outreach",
    name: "컨택 에이전트",
    role: "제안 메시지 작성",
    desc: "크리에이터와 조건을 넣으면 DM 제안 메시지 초안을 만듭니다.",
    icon: <MessageSquareTextIcon />,
  },
  {
    id: "weekly",
    name: "보고 에이전트",
    role: "주간 보고 초안",
    desc: "최근 7일 활동과 다음 액션으로 주간 보고 초안을 만듭니다.",
    icon: <FileTextIcon />,
  },
  {
    id: "creative",
    name: "소재 에이전트",
    role: "소재 방향 제안",
    desc: "수집된 광고 소재 통계에서 테스트할 훅과 소구를 제안합니다.",
    icon: <MegaphoneIcon />,
  },
];

function useCopy() {
  const [copied, setCopied] = React.useState(false);
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 권한이 없으면 무시
    }
  };
  return { copied, copy };
}

function Output({ text }: { text: string }) {
  const { copied, copy } = useCopy();
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>결과</Label>
        <Button variant="outline" size="sm" onClick={() => copy(text)}>
          {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
          {copied ? "복사됨" : "복사"}
        </Button>
      </div>
      <pre className="max-h-96 overflow-auto rounded-2xl bg-muted/50 p-4 font-sans text-sm leading-relaxed whitespace-pre-wrap">
        {text}
      </pre>
    </div>
  );
}

export default function AgentsPage() {
  const [active, setActive] = React.useState<AgentId>("matcher");
  const agent = AGENTS.find((a) => a.id === active)!;

  return (
    <div className="space-y-4">
      <div>
        <p className="mt-1 text-sm text-muted-foreground">
          반복 업무를 맡기는 AI 팀원입니다. 지금은 규칙 기반으로 이 앱의 데이터를 가공하며,
          LLM 연동 시 같은 화면에서 확장됩니다. 여러 에이전트를 함께 부르려면{" "}
          <Link href="/agents/room" className="text-primary hover:underline">
            회의실
          </Link>
          을 이용하세요.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {AGENTS.map((a) => {
          const on = a.id === active;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setActive(a.id)}
              aria-pressed={on}
              className="rounded-[min(var(--radius-4xl),24px)] text-left focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
            >
              <Card
                className={`h-full shadow-xs transition-shadow hover:shadow-sm ${
                  on ? "ring-2 ring-primary" : ""
                }`}
              >
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex size-9 items-center justify-center rounded-2xl bg-primary/10 text-primary [&_svg]:size-4">
                      {a.icon}
                    </span>
                    <Badge variant="outline" className="font-normal">
                      <span className="size-1.5 rounded-full bg-emerald-500" /> 대기중
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.role}</p>
                  </div>
                  <p className="text-xs leading-snug text-muted-foreground">{a.desc}</p>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      <Card className="shadow-xs">
        <CardContent className="space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <BotIcon className="size-4 text-muted-foreground" /> {agent.name} · {agent.role}
          </h2>
          {active === "matcher" && <MatcherPanel />}
          {active === "outreach" && <OutreachPanel />}
          {active === "weekly" && <WeeklyPanel />}
          {active === "creative" && <CreativePanel />}
        </CardContent>
      </Card>
    </div>
  );
}

function MatcherPanel() {
  const { influencers } = useInfluencerStore();
  const irm = useCreatorIrm();
  const [brief, setBrief] = React.useState("");
  const [results, setResults] = React.useState<CreatorMatch[] | null>(null);

  const run = () => setResults(matchCreators(brief, influencers));
  const full = Object.keys(irm.entries).length >= IRM_LIMIT;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="brief">브리프</Label>
        <Textarea
          id="brief"
          rows={3}
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="예: 20~30대 여성 타깃 클린뷰티 스킨케어 신제품, 솔직한 리뷰 콘텐츠"
        />
      </div>
      <Button onClick={run} disabled={!brief.trim()}>
        <PlayIcon className="size-3.5" /> 실행
      </Button>

      {results && (
        <div className="space-y-2">
          <Label>추천 결과 {results.length}명</Label>
          {results.length === 0 ? (
            <p className="rounded-2xl bg-muted/50 p-4 text-sm text-muted-foreground">
              브리프와 일치하는 크리에이터가 없습니다. 카테고리 단어(뷰티, 리뷰 등)를 넣어 보세요.
            </p>
          ) : (
            <ul className="divide-y rounded-2xl ring-1 ring-foreground/5">
              {results.map(({ creator, reasons }) => {
                const added = Boolean(irm.entries[creator.id]);
                return (
                  <li key={creator.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">@{creator.handle}</p>
                      <p className="text-xs text-muted-foreground">
                        {creator.platform === "instagram" ? "Instagram" : "TikTok"} ·{" "}
                        {creator.followers.toLocaleString()}명 · 참여율 {creator.engagementRate}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        근거: {reasons.length ? reasons.join(", ") : "참여율 기준"}
                      </p>
                    </div>
                    {added ? (
                      <Button asChild variant="outline" size="sm">
                        <Link href="/creator-irm">
                          <CheckIcon className="size-3.5" /> 커뮤니티에 있음
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={full}
                        onClick={() => irm.add(creator.id)}
                      >
                        커뮤니티에 추가
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function OutreachPanel() {
  const { influencers } = useInfluencerStore();
  const [creatorId, setCreatorId] = React.useState("");
  const [brand, setBrand] = React.useState("");
  const [product, setProduct] = React.useState("");
  const [sender, setSender] = React.useState("김세일");
  const [offer, setOffer] = React.useState("");
  const [text, setText] = React.useState("");

  const creator = influencers.find((c) => c.id === (creatorId || influencers[0]?.id));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>크리에이터</Label>
          <Select value={creator?.id ?? ""} onValueChange={setCreatorId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="크리에이터 선택" />
            </SelectTrigger>
            <SelectContent>
              {influencers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  @{c.handle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sender">보내는 사람</Label>
          <Input id="sender" value={sender} onChange={(e) => setSender(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="brand">브랜드</Label>
          <Input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="예: 소보로랩" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="product">제품</Label>
          <Input id="product" value={product} onChange={(e) => setProduct(e.target.value)} placeholder="예: 비건 수분 크림" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="offer">제안 조건 (줄바꿈으로 구분)</Label>
        <Textarea
          id="offer"
          rows={3}
          value={offer}
          onChange={(e) => setOffer(e.target.value)}
          placeholder={"제품 무상 제공\n릴스 1건, 스토리 3건\n원고료 협의"}
        />
      </div>
      <Button disabled={!creator} onClick={() => creator && setText(buildOutreach({ creator, brand, product, offer, sender }))}>
        <PlayIcon className="size-3.5" /> 실행
      </Button>
      {text && <Output text={text} />}
    </div>
  );
}

function WeeklyPanel() {
  const { customers } = useCustomerStore();
  const [draft, setDraft] = React.useState<WeeklyDraft | null>(null);

  const text = draft
    ? [
        `[주간 보고 초안] 기준일 ${DEMO_TODAY.format("YYYY.MM.DD")} (최근 7일)`,
        "",
        "■ 이번 주 한 일",
        draft.done,
        "",
        "■ 이슈 · 블로커",
        draft.issues,
        "",
        "■ 다음 주 계획",
        draft.plan,
        "",
        "■ 요청 · 공유",
        draft.requests,
      ].join("\n")
    : "";

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        고객사 데이터의 최근 7일 활동과 다음 액션으로 초안을 만듭니다. 기준일은 데모 데이터의
        기준일({DEMO_TODAY.format("YYYY.MM.DD")})입니다.
      </p>
      <Button onClick={() => setDraft(buildWeeklyDraft(customers, DEMO_TODAY))}>
        <PlayIcon className="size-3.5" /> 실행
      </Button>
      {draft && <Output text={text} />}
    </div>
  );
}

function CreativePanel() {
  const [text, setText] = React.useState("");
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        광고소재 메뉴에 수집된 경쟁사 소재 통계를 읽어 테스트할 방향을 정리합니다.
      </p>
      <Button onClick={() => setText(buildCreativeInsight())}>
        <PlayIcon className="size-3.5" /> 실행
      </Button>
      {text && <Output text={text} />}
    </div>
  );
}
