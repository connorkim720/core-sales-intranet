"use client";

import * as React from "react";

import {
  EMPTY_SHARED,
  MAX_MESSAGES,
  MAX_TEXT,
  runRoomTurn,
  type AgentId,
  type GenerateArgs,
  type GenerateResult,
  type RoomContext,
  type RoomMessage,
  type Shared,
} from "@/lib/agent-room";
import type { AgentDef } from "@/lib/agent-roster-core";

const STORAGE_KEY = "core-sales-agent-room-v1";

type Saved = { messages: RoomMessage[]; shared: Shared };

function load(): Saved {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { messages: [], shared: EMPTY_SHARED };
    const parsed = JSON.parse(raw);
    return {
      messages: Array.isArray(parsed?.messages) ? parsed.messages : [],
      shared: { ...EMPTY_SHARED, ...(parsed?.shared ?? {}) },
    };
  } catch {
    return { messages: [], shared: EMPTY_SHARED };
  }
}

export type RoomOptions = {
  mode: "demo" | "ai";
  passcode: string;
  reactions: boolean;
  roster: AgentDef[];
};

const ERROR_TEXT: Record<string, string> = {
  unauthorized: "회의실 비밀번호가 맞지 않습니다.",
  too_many_attempts: "비밀번호를 여러 번 틀려 잠시 막혔습니다. 잠시 뒤에 다시 시도하세요.",
  not_configured: "서버에 AI 설정(ANTHROPIC_API_KEY, ROOM_PASSCODE)이 없습니다.",
  rate_limited: "호출 한도에 도달했습니다. 잠시 뒤에 다시 시도하세요.",
  ai_rate_limited: "AI 서비스의 요청 한도에 걸렸습니다. 잠시 뒤에 다시 시도하세요.",
  ai_auth: "AI 서비스 인증에 실패했습니다. 서버의 API 키 설정을 확인하세요.",
  ai_unreachable: "AI 서비스에 연결하지 못했습니다.",
  ai_bad_request: "AI 서비스가 요청을 받아들이지 않았습니다.",
  too_large: "요청이 너무 큽니다.",
  network: "서버에 연결하지 못했습니다.",
};
// 이 오류들은 같은 턴에서 다시 불러도 소용이 없으니 남은 AI 호출을 멈춘다.
const FATAL = new Set(["unauthorized", "too_many_attempts", "not_configured", "rate_limited", "ai_auth", "ai_rate_limited", "network"]);

export function useAgentRoom(ctx: RoomContext, options: RoomOptions) {
  const [messages, setMessages] = React.useState<RoomMessage[]>([]);
  const [shared, setShared] = React.useState<Shared>(EMPTY_SHARED);
  const [speaking, setSpeaking] = React.useState<AgentId | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);

  // 진행 중 턴이 있는 동안 중복 전송을 막는 즉시 잠금(state는 다음 렌더에야 바뀐다).
  const lock = React.useRef(false);
  // 턴이 도는 동안 최신 공유 메모를 읽기 위한 참조.
  const sharedRef = React.useRef<Shared>(EMPTY_SHARED);
  const messagesRef = React.useRef<RoomMessage[]>([]);
  const optionsRef = React.useRef(options);
  // 렌더 중에 ref를 바꾸지 않고, 렌더가 끝난 뒤 최신 옵션을 담는다.
  React.useEffect(() => {
    optionsRef.current = options;
  });

  React.useEffect(() => {
    const saved = load();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessages(saved.messages);
    messagesRef.current = saved.messages;
    setShared(saved.shared);
    sharedRef.current = saved.shared;
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ messages: messages.slice(-MAX_MESSAGES), shared })
      );
    } catch {
      // 저장 실패는 무시 — 데모 편의 기능
    }
  }, [messages, shared, hydrated]);

  const push = React.useCallback((m: RoomMessage) => {
    messagesRef.current = [...messagesRef.current, m].slice(-MAX_MESSAGES);
    setMessages((prev) => [...prev, m].slice(-MAX_MESSAGES));
  }, []);

  const generate = React.useCallback(async (a: GenerateArgs): Promise<GenerateResult> => {
    const o = optionsRef.current;
    try {
      const res = await fetch("/api/agent-room", {
        method: "POST",
        headers: { "content-type": "application/json", "x-room-passcode": o.passcode },
        body: JSON.stringify({
          kind: a.kind,
          agent: o.roster.find((r) => r.id === a.agent),
          roster: o.roster.map((r) => ({ name: r.name, role: r.role, team: r.team })),
          userText: a.userText,
          facts: a.facts,
          transcript: a.transcript,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        text?: string;
        refused?: boolean;
        category?: string | null;
        error?: string;
      };
      if (!res.ok) {
        const key = data.error ?? "unknown";
        return { error: key, fatal: FATAL.has(key) };
      }
      if (data.refused) return { refused: true, category: data.category ?? null };
      return data.text ? { text: data.text } : { error: "empty" };
    } catch {
      return { error: "network", fatal: true };
    }
  }, []);

  const send = React.useCallback(
    async (raw: string) => {
      const text = raw.trim().slice(0, MAX_TEXT);
      if (!text || lock.current) return false;
      lock.current = true;
      setBusy(true);
      push({ id: `u${Date.now()}`, who: "user", text, ts: Date.now() });
      try {
        const o = optionsRef.current;
        const ai = o.mode === "ai" && o.passcode.length > 0;
        const next = await runRoomTurn(text, sharedRef.current, ctx, {
          onMessage: push,
          onSpeaking: setSpeaking,
          ...(ai
            ? {
                generate,
                reactions: o.reactions,
                errorText: (k: string) => ERROR_TEXT[k] ?? "AI 호출에 실패했습니다.",
                // 모델에게는 최근 회의 내용을 이름과 함께 넘긴다(시스템 메시지는 제외).
                getTranscript: () =>
                  messagesRef.current
                    .flatMap((m) =>
                      m.who === "system"
                        ? []
                        : [
                            {
                              who: m.who === "user" ? "나" : (optionsRef.current.roster.find((r) => r.id === m.who)?.name ?? m.who),
                              text: m.text,
                            },
                          ]
                    )
                    .slice(-12),
              }
            : {}),
        });
        sharedRef.current = next;
        setShared(next);
      } catch (e) {
        push({
          id: `s${Date.now()}`,
          who: "system",
          text: `오류가 났습니다: ${e instanceof Error ? e.message : "알 수 없는 오류"}`,
          ts: Date.now(),
        });
      } finally {
        setSpeaking(null);
        setBusy(false);
        lock.current = false;
      }
      return true;
    },
    [ctx, push, generate]
  );

  const clear = React.useCallback(() => {
    if (lock.current) return;
    setMessages([]);
    messagesRef.current = [];
    setShared(EMPTY_SHARED);
    sharedRef.current = EMPTY_SHARED;
  }, []);

  return { messages, shared, speaking, busy, hydrated, send, clear };
}
