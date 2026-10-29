"use client";

import * as React from "react";

import { ERROR_TEXT } from "@/lib/agent-room-store";
import type { AgentDef } from "@/lib/agent-roster-core";

// 에이전트별 1:1 대화의 "기억" — 대화를 요약해 저장해 두고, 다음 대화 때 최근 요약을 모델에게 함께 보낸다.
// 저장 위치는 이 브라우저의 localStorage다(기기를 바꾸면 보이지 않는다).

export type MemoryItem = {
  id: string;
  ts: number;
  summary: string;
  ai: boolean; // AI가 요약했는지, 시연 모드의 단순 발췌인지
  count: number; // 요약에 쓰인 메시지 수
};

type Saved = { items: MemoryItem[]; upto: number };

const MAX_ITEMS = 30; // 저장 상한(오래된 것부터 밀려남)
const BRIEF_ITEMS = 5; // 다음 대화에 실어 보낼 최근 요약 수
const BRIEF_CHARS = 1500;
const LINE_CHARS = 1200; // 요약 입력 한 줄 상한
const MAX_LINES = 30;

const keyOf = (agentId: string) => `core-sales-agent-memory-v1-${agentId}`;

function load(agentId: string): Saved {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(keyOf(agentId)) ?? "null");
    const items: MemoryItem[] = Array.isArray(parsed?.items)
      ? parsed.items.filter((i: MemoryItem) => i && typeof i.summary === "string" && typeof i.ts === "number")
      : [];
    return { items, upto: typeof parsed?.upto === "number" ? parsed.upto : 0 };
  } catch {
    return { items: [], upto: 0 };
  }
}

export function useAgentMemory(agentId: string) {
  const [saved, setSaved] = React.useState<Saved>({ items: [], upto: 0 });
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaved(load(agentId));
    setHydrated(true);
  }, [agentId]);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(keyOf(agentId), JSON.stringify(saved));
    } catch {
      // 저장 실패는 무시
    }
  }, [saved, hydrated, agentId]);

  const add = React.useCallback((item: Omit<MemoryItem, "id">, upto: number) => {
    setSaved((s) => ({
      items: [...s.items, { ...item, id: `m${item.ts}` }].slice(-MAX_ITEMS),
      upto: Math.max(s.upto, upto),
    }));
  }, []);
  const remove = React.useCallback((id: string) => {
    setSaved((s) => ({ ...s, items: s.items.filter((i) => i.id !== id) }));
  }, []);

  return { items: saved.items, upto: saved.upto, add, remove };
}

// 다음 대화에 실어 보낼 기억 문구. 최근 요약 몇 건만, 길이 상한을 두고 만든다.
export function memoryBrief(items: MemoryItem[]) {
  const lines: string[] = [];
  let total = 0;
  for (const it of [...items].reverse().slice(0, BRIEF_ITEMS)) {
    const line = `(${new Date(it.ts).toISOString().slice(0, 10)}) ${it.summary.replace(/\s+/g, " ").trim()}`;
    if (total + line.length > BRIEF_CHARS) break;
    lines.unshift(`- ${line}`);
    total += line.length;
  }
  return lines.join("\n");
}

type Line = { who: string; text: string };

// 시연 모드의 요약: AI 없이 사용자 요청과 답변 첫 줄을 발췌한다.
export function demoSummary(lines: Line[], agentName: string) {
  const picks: string[] = [];
  for (let i = 0; i < lines.length && picks.length < 4; i++) {
    if (lines[i].who !== "나") continue;
    const ask = lines[i].text.replace(/\s+/g, " ").slice(0, 80);
    const reply = lines.slice(i + 1).find((l) => l.who !== "나");
    const head = reply ? reply.text.split("\n").find((s) => s.trim())?.slice(0, 80) : "";
    picks.push(`- 요청: ${ask}${head ? ` → ${agentName}: ${head}` : ""}`);
  }
  return [`(발췌 요약) ${lines.length}개 메시지`, ...picks].join("\n");
}

// AI 요약: 서버 라우트에 kind:"summary"로 요청한다.
export async function aiSummary(agent: AgentDef, lines: Line[]): Promise<{ text?: string; error?: string }> {
  try {
    const res = await fetch("/api/agent-room", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "summary",
        agent,
        roster: [],
        userText: "",
        facts: "",
        transcript: lines.slice(-MAX_LINES).map((l) => ({ who: l.who, text: l.text.slice(0, LINE_CHARS) })),
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { text?: string; refused?: boolean; error?: string };
    if (!res.ok) return { error: ERROR_TEXT[data.error ?? ""] ?? "AI 요약에 실패했습니다." };
    if (data.refused) return { error: "AI가 이 내용의 요약을 거절했습니다." };
    return data.text ? { text: data.text.trim() } : { error: "요약 결과가 비어 있습니다." };
  } catch {
    return { error: ERROR_TEXT.network };
  }
}
