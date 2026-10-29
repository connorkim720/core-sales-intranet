"use client";

import * as React from "react";
import Link from "next/link";
import dayjs from "dayjs";
import { ArrowLeftIcon, Maximize2Icon, MessagesSquareIcon, PinIcon, XIcon } from "lucide-react";

import { AgentAvatar } from "@/components/agents/agent-avatar";
import { AgentChatThread, PILOT_ID, useAgentChat } from "@/components/agents/agent-chat";
import { Button } from "@/components/ui/button";
import { useRoster, type AgentDef } from "@/lib/agent-roster";

// 어느 페이지에서든 오른쪽에 열리는 에이전트 채팅 패널(빠른 질문용).
// 전체 화면 대화는 사이드바의 에이전트 → 페퍼 페이지(/agents/pepper)에서 하고, 같은 대화를 공유한다.

type DockCtx = { open: boolean; setOpen: (v: boolean) => void };
const DockContext = React.createContext<DockCtx | null>(null);

export function AgentDockProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const value = React.useMemo(() => ({ open, setOpen }), [open]);
  return <DockContext.Provider value={value}>{children}</DockContext.Provider>;
}

function useDock() {
  const ctx = React.useContext(DockContext);
  if (!ctx) throw new Error("AgentDockProvider 안에서만 쓸 수 있습니다");
  return ctx;
}

export function AgentDockToggle() {
  const { open, setOpen } = useDock();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="에이전트 채팅"
      aria-pressed={open}
      onClick={() => setOpen(!open)}
      className={open ? "bg-muted" : ""}
    >
      <MessagesSquareIcon className="size-4" />
    </Button>
  );
}

export function AgentDockPanel() {
  const { open } = useDock();
  // 열려 있는 동안에만 훅(저장소 읽기)을 돌린다.
  return open ? <DockLoader /> : null;
}

function DockLoader() {
  const { roster, hydrated } = useRoster();
  const pilot = roster.find((a) => a.id === PILOT_ID) ?? roster[0];
  if (!hydrated || !pilot) return null;
  // 에이전트가 바뀌면 스레드 훅을 새로 만들어 저장소가 섞이지 않게 한다.
  return <DockShell key={pilot.id} pilot={pilot} roster={roster} />;
}

function timeLabel(ts: number) {
  const d = dayjs(ts);
  return d.isSame(dayjs(), "day") ? d.format("HH:mm") : d.format("MM.DD");
}

function DockShell({ pilot, roster }: { pilot: AgentDef; roster: AgentDef[] }) {
  const { setOpen } = useDock();
  const [tab, setTab] = React.useState<"agents" | "group">("agents");
  const [view, setView] = React.useState<"list" | "thread">("list");
  const chat = useAgentChat(pilot, roster, view);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  const { last, aiUsable } = chat;

  return (
    <aside
      aria-label="에이전트 채팅"
      className="fixed top-0 right-0 z-40 flex h-svh w-full max-w-[400px] flex-col border-l bg-background shadow-xl"
    >
      {/* 상단: 탭 + 닫기 */}
      <div className="flex items-center gap-2 border-b p-3">
        {view === "thread" && tab === "agents" ? (
          <>
            <Button variant="ghost" size="icon-sm" aria-label="목록으로" onClick={() => setView("list")}>
              <ArrowLeftIcon />
            </Button>
            <AgentAvatar agent={pilot} size={28} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-tight">{pilot.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {pilot.role} · {aiUsable ? "Claude Opus 5.5" : "시연 모드"}
              </p>
            </div>
            <Button asChild variant="ghost" size="icon-sm" onClick={() => setOpen(false)}>
              <Link href="/agents/pepper" aria-label="전체 화면으로 열기" title="전체 화면으로 열기">
                <Maximize2Icon />
              </Link>
            </Button>
          </>
        ) : (
          <div className="inline-flex flex-1 rounded-2xl bg-muted p-1 text-sm">
            {(["agents", "group"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTab(t);
                  setView("list");
                }}
                aria-pressed={tab === t}
                className={`h-7 flex-1 rounded-xl transition-colors ${tab === t ? "bg-background font-medium shadow-xs" : "text-muted-foreground"}`}
              >
                {t === "agents" ? "에이전트" : "그룹"}
              </button>
            ))}
          </div>
        )}
        <Button variant="ghost" size="icon-sm" aria-label="닫기" onClick={() => setOpen(false)}>
          <XIcon />
        </Button>
      </div>

      {tab === "group" && (
        <div className="space-y-3 p-4 text-sm">
          <p className="text-muted-foreground">
            여러 에이전트가 한 방에서 서로의 답을 읽고 이어받는 그룹 대화는 회의실에서 합니다.
          </p>
          <Button asChild className="w-full" onClick={() => setOpen(false)}>
            <Link href="/agents/room">회의실 열기</Link>
          </Button>
        </div>
      )}

      {tab === "agents" && view === "list" && (
        <div className="flex-1 overflow-y-auto p-2">
          <button
            type="button"
            onClick={() => setView("thread")}
            className="flex w-full items-start gap-3 rounded-2xl bg-muted/60 p-3 text-left transition-colors hover:bg-muted"
          >
            <span className="relative">
              <AgentAvatar agent={pilot} size={40} />
              <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-background bg-emerald-500" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1 text-sm font-medium">
                  <PinIcon className="size-3 fill-current" /> {pilot.name}
                </span>
                <span className="text-[11px] text-muted-foreground tabular-nums">{last ? timeLabel(last.ts) : ""}</span>
              </span>
              <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                {last ? last.text.replace(/\s+/g, " ") : `${pilot.character || pilot.role} — 눌러서 대화를 시작하세요`}
              </span>
            </span>
          </button>
          <p className="mt-4 px-3 text-[11px] leading-relaxed text-muted-foreground">
            지금은 {pilot.name} 1명만 1:1 대화방이 연결돼 있습니다. 다른 에이전트는{" "}
            <Link href="/agents/room" onClick={() => setOpen(false)} className="text-primary hover:underline">
              회의실
            </Link>
            에서 @이름으로 부르세요.
          </p>
        </div>
      )}

      {tab === "agents" && view === "thread" && <AgentChatThread chat={chat} pilot={pilot} />}
    </aside>
  );
}
