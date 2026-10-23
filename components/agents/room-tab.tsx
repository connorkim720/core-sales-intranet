"use client";

import * as React from "react";
import Link from "next/link";
import { CheckIcon, CopyIcon, CornerDownRightIcon, InfoIcon, SendIcon, SparklesIcon, Trash2Icon } from "lucide-react";

import { AgentAvatar } from "@/components/agents/agent-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MAX_CHAIN, MAX_REACTIONS, MAX_TARGETS, type RoomMessage } from "@/lib/agent-room";
import { useAgentRoom } from "@/lib/agent-room-store";
import { useRoster, type AgentDef } from "@/lib/agent-roster";
import { useCampaigns } from "@/lib/campaign-store";
import { useCustomerStore } from "@/lib/customer-store";
import { useInfluencerStore } from "@/lib/influencer-store";

const PASS_KEY = "core-sales-room-passcode";

// `코드` 표기를 작은 코드 조각으로 보여 준다.
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`)/).map((part, i) =>
        part.startsWith("`") && part.endsWith("`") && part.length > 2 ? (
          <code key={i} className="rounded-md bg-foreground/10 px-1 py-0.5 text-[0.85em]">
            {part.slice(1, -1)}
          </code>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
}

function CopyLink({ text, label = "복사", className = "text-[11px]" }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // 클립보드 권한이 없으면 무시
        }
      }}
      className={`inline-flex items-center gap-1 text-muted-foreground hover:text-foreground ${className}`}
    >
      {copied ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
      {copied ? "복사됨" : label}
    </button>
  );
}

function Bubble({ m, byId }: { m: RoomMessage; byId: Map<string, AgentDef> }) {
  if (m.who === "system") {
    return (
      <div className="flex justify-center">
        <p className="max-w-[90%] rounded-2xl bg-muted/60 px-3 py-1.5 text-center text-xs text-muted-foreground">
          <RichText text={m.text} />
        </p>
      </div>
    );
  }
  if (m.who === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl bg-primary px-4 py-2.5 text-sm whitespace-pre-wrap text-primary-foreground">{m.text}</p>
      </div>
    );
  }
  const agent = byId.get(m.who);
  const from = m.after ? byId.get(m.after) : undefined;
  return (
    <div className="flex gap-3">
      <AgentAvatar agent={agent} size={32} />
      <div className="min-w-0 max-w-[85%] space-y-1">
        <p className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-medium">{agent?.name ?? "(삭제된 에이전트)"}</span>
          <span className="text-muted-foreground">{agent?.role}</span>
          {m.ai && (
            <Badge variant="outline" className="h-4 px-1.5 text-[10px] font-normal">
              <SparklesIcon className="size-2.5" /> AI
            </Badge>
          )}
          {m.reaction && <span className="text-muted-foreground">덧붙임</span>}
          {from && (
            <span className="inline-flex items-center gap-0.5 text-muted-foreground">
              <CornerDownRightIcon className="size-3" /> {from.name}의 답을 이어받음
            </span>
          )}
        </p>
        <div className="rounded-2xl rounded-tl-md bg-muted/60 px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
          <RichText text={m.text} />
        </div>
        <CopyLink text={m.text} />
      </div>
    </div>
  );
}

export function RoomTab() {
  const { influencers } = useInfluencerStore();
  const { customers } = useCustomerStore();
  const { campaigns } = useCampaigns();
  const { roster, hydrated: rosterReady } = useRoster();
  const ctx = React.useMemo(() => ({ influencers, customers, campaigns, roster }), [influencers, customers, campaigns, roster]);
  const byId = React.useMemo(() => new Map(roster.map((a) => [a.id, a])), [roster]);

  const [mode, setMode] = React.useState<"demo" | "ai">("demo");
  const [passcode, setPasscode] = React.useState("");
  const [reactions, setReactions] = React.useState(false);
  const [aiReady, setAiReady] = React.useState<boolean | null>(null); // 서버에 키·비밀번호가 설정됐는지

  const { messages, speaking, busy, hydrated, send, clear } = useAgentRoom(ctx, { mode, passcode, reactions, roster });

  const [input, setInput] = React.useState("");
  const endRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  // 서버의 AI 설정 여부와 이 탭에서 입력해 둔 비밀번호를 불러온다.
  React.useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPasscode(window.sessionStorage.getItem(PASS_KEY) ?? "");
    } catch {
      // 세션 저장소를 못 쓰면 빈 값으로 시작
    }
    fetch("/api/agent-room")
      .then((r) => r.json())
      .then((d: { configured?: boolean }) => setAiReady(Boolean(d.configured)))
      .catch(() => setAiReady(false));
  }, []);

  const updatePasscode = (v: string) => {
    setPasscode(v);
    try {
      window.sessionStorage.setItem(PASS_KEY, v);
    } catch {
      // 무시
    }
  };

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, speaking]);

  const aiOn = mode === "ai";
  const aiUsable = aiOn && aiReady === true && passcode.length > 0;

  const submit = async () => {
    const text = input;
    if (!text.trim() || busy) return;
    setInput("");
    await send(text);
  };

  // 멘션을 넣은 뒤 입력창으로 포커스를 옮긴다(렌더 중 ref 접근을 피하려고 효과에서 처리).
  const [focusTick, setFocusTick] = React.useState(0);
  React.useEffect(() => {
    if (focusTick > 0) inputRef.current?.focus();
  }, [focusTick]);
  const insertMention = (name: string) => {
    setInput((v) => `${v}${v && !v.endsWith(" ") ? " " : ""}@${name} `);
    setFocusTick((t) => t + 1);
  };

  const transcript = messages
    .map((m) => `[${m.who === "user" ? "나" : m.who === "system" ? "시스템" : (byId.get(m.who)?.name ?? m.who)}] ${m.text}`)
    .join("\n\n");

  // 팀별로 묶은 참여자 (순서는 로스터 순서)
  const teams = React.useMemo(() => {
    const map = new Map<string, AgentDef[]>();
    for (const a of roster) map.set(a.team || "소속 없음", [...(map.get(a.team || "소속 없음") ?? []), a]);
    return [...map.entries()];
  }, [roster]);

  // 예시 문구는 지금 로스터의 이름으로 만든다.
  const examples = React.useMemo(() => {
    const matcher = roster.find((a) => a.builtin === "matcher");
    const sender = roster.find((a) => a.builtin === "outreach");
    const weekly = roster.find((a) => a.builtin === "weekly");
    const planner = roster.find((a) => a.data.includes("campaigns") && !a.builtin);
    const list: string[] = [];
    if (matcher) list.push(`@${matcher.name} 클린뷰티 스킨케어 솔직한 리뷰`);
    if (matcher && sender) {
      list.push(`@${matcher.name} > @${sender.name} 클린뷰티 스킨케어 리뷰 / 브랜드: 소보로랩 / 제품: 비건 수분 크림 / 조건: 제품 무상 제공, 릴스 1건`);
    }
    if (weekly) list.push(`@${weekly.name} 이번 주 보고 초안`);
    if (planner) list.push(`@${planner.name} 진행 중인 캠페인 지연 점검`);
    if (teams[0]) list.push(`@${teams[0][0]} 이번 주 현황 공유`);
    return list.slice(0, 5);
  }, [roster, teams]);

  return (
    <div className="space-y-4">
      <Card className="shadow-xs">
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-2xl bg-muted p-1 text-sm">
                {(["demo", "ai"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    disabled={m === "ai" && aiReady !== true}
                    onClick={() => setMode(m)}
                    aria-pressed={mode === m}
                    title={m === "ai" && aiReady !== true ? "서버에 ANTHROPIC_API_KEY, ROOM_PASSCODE 설정이 필요합니다" : undefined}
                    className={`h-7 rounded-xl px-3 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      mode === m ? "bg-background font-medium shadow-xs" : "text-muted-foreground"
                    }`}
                  >
                    {m === "demo" ? "시연 모드" : "AI 모드"}
                  </button>
                ))}
              </div>
              {aiReady === false && <span className="text-xs text-muted-foreground">AI 모드는 서버 설정 후 사용할 수 있습니다</span>}
            </div>
            <Link href="/agents/roster" className="text-xs text-primary hover:underline">
              에이전트 관리
            </Link>
          </div>

          {aiOn ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  type="password"
                  value={passcode}
                  onChange={(e) => updatePasscode(e.target.value)}
                  placeholder="회의실 비밀번호"
                  autoComplete="off"
                  aria-label="회의실 비밀번호"
                  className="h-9 w-56"
                />
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={reactions} onChange={(e) => setReactions(e.target.checked)} className="size-4 accent-primary" />
                  반응 라운드 <span className="text-xs text-muted-foreground">(부르지 않은 에이전트가 덧붙임, 최대 {MAX_REACTIONS}명)</span>
                </label>
              </div>
              <p className="flex gap-2 text-xs text-muted-foreground">
                <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  각 에이전트가 자기 페르소나로 Claude(Opus 5.5)를 호출합니다. <b className="font-medium text-foreground">호출마다 API 비용이 발생합니다.</b>{" "}
                  한 번 보낼 때 최대 {MAX_TARGETS}번(반응 라운드를 켜면 +{MAX_REACTIONS}번) 호출됩니다. 비밀번호는 이 탭을 닫으면 사라집니다.
                  {aiOn && passcode.length === 0 && " 비밀번호를 입력하지 않으면 시연 모드로 답합니다."}
                </span>
              </p>
            </div>
          ) : (
            <p className="flex gap-3 text-sm text-muted-foreground">
              <InfoIcon className="mt-0.5 size-4 shrink-0" />
              <span>
                <b className="font-medium text-foreground">시연 모드</b> · AI를 쓰지 않고 에이전트가 이 앱의 데이터를 규칙으로 가공해 답합니다. 규칙 기능이 없는 에이전트는 읽는 데이터만 보여 줍니다.{" "}
                <code className="rounded-md bg-foreground/10 px-1 py-0.5">@이름 &gt; @이름</code>처럼 연쇄로 부르면 앞 결과를 뒤 에이전트가 이어받고, <code className="rounded-md bg-foreground/10 px-1 py-0.5">@팀이름</code>은 그 팀 전체를 부릅니다. 연쇄는 최대 {MAX_CHAIN}명, 한 번에 최대 {MAX_TARGETS}명까지 부를 수 있습니다.
              </span>
            </p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-2">
        {rosterReady &&
          teams.map(([team, members]) => (
            <div key={team} className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => insertMention(team)}
                className="w-16 text-left text-xs text-muted-foreground hover:text-foreground"
                title={`@${team} — 팀 전체 호출`}
              >
                {team}
              </button>
              {members.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => insertMention(a.name)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-2xl bg-card pr-3 pl-1 text-xs shadow-xs ring-1 ring-foreground/5 transition-colors hover:bg-muted"
                  title={`@${a.name} · ${a.role}`}
                >
                  <AgentAvatar agent={a} size={24} />
                  {a.name}
                  <span className="text-muted-foreground">{a.role}</span>
                  <span className={`size-1.5 rounded-full ${speaking === a.id ? "animate-pulse bg-orange-500" : "bg-emerald-500"}`} />
                </button>
              ))}
            </div>
          ))}
        <div className="flex items-center justify-end gap-3">
          {messages.length > 0 && <CopyLink text={transcript} label="회의록 복사" className="text-xs" />}
          <button
            type="button"
            disabled={busy || messages.length === 0}
            onClick={() => {
              if (window.confirm("회의 내용을 모두 비울까요?")) clear();
            }}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <Trash2Icon className="size-3.5" /> 대화 비우기
          </button>
        </div>
      </div>

      <Card className="shadow-xs">
        <CardContent className="space-y-3">
          <div className="h-[calc(100svh-33rem)] min-h-[280px] space-y-4 overflow-y-auto pr-1" aria-live="polite">
            {hydrated && messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <p className="text-sm text-muted-foreground">@이름으로 에이전트를 불러 업무를 맡겨 보세요.</p>
                <div className="flex max-w-2xl flex-wrap justify-center gap-2">
                  {examples.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => {
                        setInput(ex);
                        inputRef.current?.focus();
                      }}
                      className="rounded-2xl bg-muted/60 px-3 py-1.5 text-left text-xs transition-colors hover:bg-muted"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m) => (
              <Bubble key={m.id} m={m} byId={byId} />
            ))}
            {speaking && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="size-1.5 animate-pulse rounded-full bg-orange-500" />
                {byId.get(speaking)?.name ?? "에이전트"} 작성 중…
              </p>
            )}
            <div ref={endRef} />
          </div>

          <div className="flex items-end gap-2 border-t pt-3">
            <Textarea
              ref={inputRef}
              rows={2}
              value={input}
              disabled={busy}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                // 한글 조합 중 Enter는 글자 확정이라 전송하지 않는다.
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="@이름 또는 @팀이름으로 불러 보세요 (Enter 전송, Shift+Enter 줄바꿈)"
              className="min-h-0 flex-1"
              aria-label="회의실 메시지"
            />
            <Button disabled={busy || !input.trim()} onClick={submit} className="h-10">
              <SendIcon className="size-3.5" /> {aiUsable ? "AI에게 보내기" : "보내기"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
