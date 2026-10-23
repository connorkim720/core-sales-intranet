"use client";

import * as React from "react";

import { DEFAULT_ROSTER, MAX_AGENTS, sanitizeAgent, type AgentDef } from "@/lib/agent-roster-core";

export * from "@/lib/agent-roster-core";

const STORAGE_KEY = "core-sales-agent-roster-v1";

const RESERVED = new Set(["전체", "all"]);

// 호출 이름이 서로 겹치거나 팀 이름·예약어와 부딪치면 @멘션이 모호해진다.
export function validateAgent(a: AgentDef, roster: AgentDef[]): string | null {
  if (!a.name) return "이름을 입력하세요";
  if (!a.role.trim()) return "역할을 입력하세요";
  if (RESERVED.has(a.name.toLowerCase())) return `"${a.name}"은(는) 예약된 이름입니다`;
  const others = roster.filter((r) => r.id !== a.id);
  if (others.some((r) => r.name.toLowerCase() === a.name.toLowerCase())) return `"${a.name}" 이름을 쓰는 에이전트가 이미 있습니다`;
  if (others.some((r) => r.team && r.team.toLowerCase() === a.name.toLowerCase())) return `"${a.name}"은(는) 팀 이름과 같아서 쓸 수 없습니다`;
  if (a.team && others.some((r) => r.name.toLowerCase() === a.team.toLowerCase())) return `팀 이름이 다른 에이전트 이름("${a.team}")과 같습니다`;
  return null;
}

function load(): AgentDef[] | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const list = parsed.slice(0, MAX_AGENTS).map((x) => sanitizeAgent(x)).filter((a) => a.name && a.role);
    return list.length ? list : null;
  } catch {
    return null;
  }
}

export function useRoster() {
  const [roster, setRoster] = React.useState<AgentDef[]>(DEFAULT_ROSTER);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    const saved = load();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) setRoster(saved);
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(roster));
    } catch {
      // 저장 실패는 무시 — 데모 편의 기능
    }
  }, [roster, hydrated]);

  // 있으면 수정, 없으면 끝에 추가한다. 검증 오류가 있으면 저장하지 않고 문구를 돌려준다.
  const save = React.useCallback(
    (agent: AgentDef): string | null => {
      const clean = sanitizeAgent(agent, undefined);
      const err = validateAgent(clean, roster);
      if (err) return err;
      if (!roster.some((r) => r.id === clean.id) && roster.length >= MAX_AGENTS) return `에이전트는 최대 ${MAX_AGENTS}명까지 만들 수 있습니다`;
      setRoster((prev) => (prev.some((r) => r.id === clean.id) ? prev.map((r) => (r.id === clean.id ? clean : r)) : [...prev, clean]));
      return null;
    },
    [roster]
  );

  const remove = React.useCallback((id: string) => {
    setRoster((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)));
  }, []);

  const resetAll = React.useCallback(() => setRoster(DEFAULT_ROSTER), []);

  return { roster, save, remove, resetAll, hydrated };
}
