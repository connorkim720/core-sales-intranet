"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrainIcon, LockOpenIcon, PaperclipIcon, SendIcon, SparklesIcon, Trash2Icon } from "lucide-react";

import { AgentAvatar } from "@/components/agents/agent-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { aiSummary, demoSummary, memoryBrief, useAgentMemory } from "@/lib/agent-memory";
import { useAgentRoom } from "@/lib/agent-room-store";
import { useRoster, type AgentDef } from "@/lib/agent-roster";
import { useCampaigns } from "@/lib/campaign-store";
import { useCustomerStore } from "@/lib/customer-store";
import { useInfluencerStore } from "@/lib/influencer-store";
import { pageTitle } from "@/lib/page-meta";

// 로스터의 에이전트 1명(페퍼)만 1:1 대화방으로 연결한 파일럿. 오른쪽 패널과 전체 화면 페이지가 같은 대화를 공유한다.
export const PILOT_ID = "pepper";

// 대화 상태와 전송 로직. 패널·페이지 어느 쪽에서든 같은 저장소(에이전트별 DM 키)를 읽는다.
export function useAgentChat(pilot: AgentDef, roster: AgentDef[], scrollKey: string) {
  const pathname = usePathname();
  const { influencers } = useInfluencerStore();
  const { customers } = useCustomerStore();
  const { campaigns } = useCampaigns();
  const ctx = React.useMemo(() => ({ influencers, customers, campaigns, roster }), [influencers, customers, campaigns, roster]);

  const [mode, setMode] = React.useState<"demo" | "ai">("demo");
  const [unlocked, setUnlocked] = React.useState(false);
  const [unlockError, setUnlockError] = React.useState("");
  const [aiReady, setAiReady] = React.useState<boolean | null>(null);
  const [attach, setAttach] = React.useState(true);
  const [input, setInput] = React.useState("");

  const mem = useAgentMemory(pilot.id);
  const brief = React.useMemo(() => memoryBrief(mem.items), [mem.items]);

  const { messages, speaking, busy, send } = useAgentRoom(ctx, {
    mode,
    passcode: "",
    unlocked,
    memory: brief,
    reactions: false,
    roster,
    storageKey: `core-sales-agent-dm-v1-${pilot.id}`,
    forceAgent: pilot.id,
  });

  const endRef = React.useRef<HTMLDivElement>(null);

  // 서버에 AI 설정이 있는지, 이 브라우저가 잠금을 이미 풀었는지(쿠키)를 확인한다.
  const refresh = React.useCallback(() => {
    fetch("/api/agent-room")
      .then((r) => r.json())
      .then((d: { configured?: boolean; unlocked?: boolean }) => {
        setAiReady(Boolean(d.configured));
        setUnlocked(Boolean(d.unlocked));
      })
      .catch(() => setAiReady(false));
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const unlock = async (passcode: string) => {
    setUnlockError("");
    try {
      const res = await fetch("/api/agent-room/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      if (res.ok) {
        setUnlocked(true);
        return;
      }
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      setUnlockError(
        d.error === "too_many_attempts" ? "여러 번 틀려 잠시 막혔습니다. 잠시 뒤에 다시 시도하세요." : "비밀번호가 맞지 않습니다."
      );
    } catch {
      setUnlockError("서버에 연결하지 못했습니다.");
    }
  };

  const lock = async () => {
    await fetch("/api/agent-room/unlock", { method: "DELETE" }).catch(() => undefined);
    setUnlocked(false);
  };

  const pickMode = (m: "demo" | "ai") => {
    setMode(m);
    if (m === "ai") refresh(); // 쿠키가 만료됐을 수 있어 다시 확인
  };

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, speaking, scrollKey]);

  const last = [...messages].reverse().find((m) => m.who !== "system");
  const aiUsable = mode === "ai" && aiReady === true && unlocked;

  const submit = async () => {
    const text = input;
    if (!text.trim() || busy) return;
    setInput("");
    await send(text, attach ? `현재 페이지: ${pageTitle(pathname)} (${pathname})` : undefined);
  };

  // 기억: 마지막으로 요약한 이후의 대화를 요약해 저장한다. AI 모드가 켜져 있으면 AI가, 아니면 단순 발췌로 만든다.
  const [summarizing, setSummarizing] = React.useState(false);
  const [memoryError, setMemoryError] = React.useState("");
  const pending = React.useMemo(() => messages.filter((m) => m.who !== "system" && m.ts > mem.upto), [messages, mem.upto]);
  const canMemorize = !busy && !summarizing && pending.some((m) => m.who === "user") && pending.some((m) => m.who !== "user");

  const memorize = async () => {
    if (!canMemorize) return;
    setSummarizing(true);
    setMemoryError("");
    const lines = pending.map((m) => ({ who: m.who === "user" ? "나" : pilot.name, text: m.text }));
    const ai = aiUsable;
    const r = ai ? await aiSummary(pilot, lines) : { text: demoSummary(lines, pilot.name), error: undefined };
    if (r.text) mem.add({ ts: Date.now(), summary: r.text, ai, count: pending.length }, pending[pending.length - 1].ts);
    else setMemoryError(r.error ?? "요약에 실패했습니다.");
    setSummarizing(false);
  };

  return {
    messages, speaking, busy, mode, pickMode, aiReady, unlocked, unlockError, unlock, lock,
    attach, setAttach, input, setInput, endRef, last, aiUsable, submit,
    memoryItems: mem.items, removeMemory: mem.remove, pendingCount: pending.length, canMemorize, summarizing, memoryError, memorize,
  };
}

export type AgentChat = ReturnType<typeof useAgentChat>;

// 메시지 목록 + 입력창. 부모는 높이가 정해진 flex-col이어야 한다.
export function AgentChatThread({ chat, pilot, gutter = "px-4" }: { chat: AgentChat; pilot: AgentDef; gutter?: string }) {
  const { messages, speaking, busy, mode, pickMode, aiReady, unlocked, unlockError, unlock, lock, attach, setAttach, input, setInput, endRef, submit } = chat;
  const [typed, setTyped] = React.useState("");
  return (
    <>
      <div className={`flex-1 space-y-4 overflow-y-auto py-4 ${gutter}`} aria-live="polite">
        {messages.length === 0 && (
          <p className="py-10 text-center text-xs text-muted-foreground">
            {pilot.name}에게 무엇이든 물어보세요. 예: &quot;이번 주 보고 초안 줘&quot;
          </p>
        )}
        {messages.map((m) =>
          m.who === "system" ? (
            <p key={m.id} className="rounded-2xl bg-muted/60 px-3 py-1.5 text-center text-[11px] text-muted-foreground">
              {m.text}
            </p>
          ) : m.who === "user" ? (
            <div key={m.id} className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl bg-primary px-3.5 py-2 text-sm whitespace-pre-wrap text-primary-foreground">{m.text}</p>
            </div>
          ) : (
            <div key={m.id} className="space-y-1">
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                {pilot.name}
                {m.ai && (
                  <Badge variant="outline" className="h-4 px-1.5 text-[10px] font-normal">
                    <SparklesIcon className="size-2.5" /> AI
                  </Badge>
                )}
              </p>
              <div className="max-w-[92%] rounded-2xl rounded-tl-md bg-muted/60 px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap">{m.text}</div>
            </div>
          )
        )}
        {speaking && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-1.5 animate-pulse rounded-full bg-orange-500" /> {pilot.name} 작성 중…
          </p>
        )}
        <div ref={endRef} />
      </div>

      <div className={`space-y-2 border-t py-3 ${gutter}`}>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAttach((v) => !v)}
            aria-pressed={attach}
            className={`inline-flex h-7 items-center gap-1 rounded-2xl px-2.5 text-[11px] ring-1 ring-foreground/10 transition-colors ${
              attach ? "bg-primary/10 text-primary" : "text-muted-foreground"
            }`}
          >
            <PaperclipIcon className="size-3" /> 현재 페이지 첨부 {attach ? "켜짐" : "꺼짐"}
          </button>
          <div className="ml-auto inline-flex rounded-xl bg-muted p-0.5 text-[11px]">
            {(["demo", "ai"] as const).map((m) => (
              <button
                key={m}
                type="button"
                disabled={m === "ai" && aiReady !== true}
                onClick={() => pickMode(m)}
                aria-pressed={mode === m}
                title={m === "ai" && aiReady !== true ? "서버에 ANTHROPIC_API_KEY, ROOM_PASSCODE 설정이 필요합니다" : undefined}
                className={`h-6 rounded-lg px-2.5 disabled:cursor-not-allowed disabled:opacity-50 ${
                  mode === m ? "bg-background font-medium shadow-xs" : "text-muted-foreground"
                }`}
              >
                {m === "demo" ? "시연" : "AI"}
              </button>
            ))}
          </div>
        </div>
        {mode === "ai" &&
          (unlocked ? (
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <LockOpenIcon className="size-3" /> 이 브라우저는 AI 잠금이 풀려 있습니다(30일).
              <button type="button" onClick={lock} className="underline hover:text-foreground">
                잠그기
              </button>
            </p>
          ) : (
            <form
              className="space-y-1"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!typed) return;
                await unlock(typed);
                setTyped("");
              }}
            >
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder="AI 비밀번호 (한 번만 입력)"
                  autoComplete="off"
                  aria-label="회의실 비밀번호"
                  className="h-8"
                />
                <Button type="submit" size="sm" disabled={!typed} className="h-8">
                  잠금 해제
                </Button>
              </div>
              {unlockError && <p className="text-[11px] text-destructive">{unlockError}</p>}
            </form>
          ))}
        <div className="flex items-end gap-2">
          <Textarea
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
            placeholder="메시지 입력… (Enter 전송, Shift+Enter 줄바꿈)"
            aria-label="에이전트 채팅 메시지"
            className="min-h-0 flex-1"
          />
          <Button size="icon" disabled={busy || !input.trim()} onClick={submit} aria-label="보내기" className="size-10">
            <SendIcon className="size-4" />
          </Button>
        </div>
      </div>
    </>
  );
}

// 사이드바 메뉴로 여는 전체 화면 대화방.
export function AgentChatPage() {
  const { roster, hydrated } = useRoster();
  const pilot = roster.find((a) => a.id === PILOT_ID) ?? roster[0];
  if (!hydrated || !pilot) {
    return <p className="py-10 text-center text-sm text-muted-foreground">불러오는 중…</p>;
  }
  return <PageShell key={pilot.id} pilot={pilot} roster={roster} />;
}

function PageShell({ pilot, roster }: { pilot: AgentDef; roster: AgentDef[] }) {
  const chat = useAgentChat(pilot, roster, "page");
  const [showMemory, setShowMemory] = React.useState(false);
  return (
    <div className="flex h-[calc(100svh-var(--header-height)-3rem)] min-h-[420px] flex-col overflow-hidden rounded-2xl border bg-background ring-1 ring-foreground/5">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <AgentAvatar agent={pilot} size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-tight">{pilot.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {pilot.role} · {chat.aiUsable ? "Claude Opus 5.5" : "시연 모드"}
          </p>
        </div>
        <Button variant="outline" size="sm" aria-pressed={showMemory} onClick={() => setShowMemory((v) => !v)}>
          <BrainIcon /> 기억 {chat.memoryItems.length}건
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/agents/room">그룹 대화(회의실)</Link>
        </Button>
      </div>
      {showMemory && (
        <div className="max-h-72 space-y-3 overflow-y-auto border-b bg-muted/30 px-4 py-3 text-sm" aria-label="기억">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" disabled={!chat.canMemorize} onClick={chat.memorize}>
              <BrainIcon /> {chat.summarizing ? "요약하는 중…" : "지금까지 대화 요약해 기억하기"}
            </Button>
            <span className="text-xs text-muted-foreground">
              {chat.pendingCount > 0 ? `아직 기억하지 않은 메시지 ${chat.pendingCount}개` : "새로 기억할 대화가 없습니다"}
              {" · "}
              {chat.aiUsable ? "AI가 요약합니다(호출 1회)" : "AI가 꺼져 있어 단순 발췌로 저장합니다"}
            </span>
          </div>
          {chat.memoryError && <p className="text-xs text-destructive">{chat.memoryError}</p>}
          <p className="text-xs leading-relaxed text-muted-foreground">
            기억은 이 브라우저에만 저장됩니다. AI 모드에서는 다음 대화 때 최근 5건이 {pilot.name}에게 함께 전달됩니다.
          </p>
          {chat.memoryItems.length === 0 ? (
            <p className="py-2 text-xs text-muted-foreground">저장된 기억이 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {[...chat.memoryItems].reverse().map((it) => (
                <li key={it.id} className="rounded-2xl bg-background p-3 ring-1 ring-foreground/5">
                  <div className="mb-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="tabular-nums">{new Date(it.ts).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" })}</span>
                    <span>· 메시지 {it.count}개</span>
                    {it.ai && (
                      <Badge variant="outline" className="h-4 px-1.5 text-[10px] font-normal">
                        <SparklesIcon className="size-2.5" /> AI 요약
                      </Badge>
                    )}
                    <button
                      type="button"
                      onClick={() => chat.removeMemory(it.id)}
                      aria-label="기억 삭제"
                      className="ml-auto inline-flex items-center gap-1 hover:text-destructive"
                    >
                      <Trash2Icon className="size-3" /> 삭제
                    </button>
                  </div>
                  <p className="text-xs leading-relaxed whitespace-pre-wrap">{it.summary}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <AgentChatThread chat={chat} pilot={pilot} gutter="px-[max(1rem,calc((100%-48rem)/2))]" />
    </div>
  );
}
