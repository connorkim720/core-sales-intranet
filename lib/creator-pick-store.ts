"use client";

import * as React from "react";

const STORAGE_KEY = "core-sales-creator-pick-v1";

export type Pick = "selected" | "rejected";

function load(): Record<string, Pick> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

// 크리에이터 탐색의 "선택됨 / 제외됨" 분류. 크리에이터 id → 상태.
export function useCreatorPicks() {
  const [picks, setPicks] = React.useState<Record<string, Pick>>({});
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPicks(load());
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(picks));
    } catch {
      // 저장 실패는 무시 — 데모 편의 기능
    }
  }, [picks, hydrated]);

  const setPick = React.useCallback((id: string, pick: Pick | null) => {
    setPicks((prev) => {
      const next = { ...prev };
      if (pick) next[id] = pick;
      else delete next[id];
      return next;
    });
  }, []);

  return { picks, setPick };
}
