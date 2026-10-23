"use client";

import * as React from "react";
import dayjs, { type Dayjs } from "dayjs";

const STORAGE_KEY = "core-sales-weekly-v1";

// 저장 시점의 자동 집계 스냅샷 — 나중에 고객 데이터가 바뀌어도
// 그 주에 보고한 숫자가 그대로 남도록 함께 저장한다.
export type WeeklyStats = {
  newLeads: number;
  won: number;
  wonMrr: number;
  stageMoves: number;
  activityCount: number;
};

export type WeeklyEntry = {
  done: string;
  issues: string;
  plan: string;
  requests: string;
  updatedAt?: string;
  stats?: WeeklyStats;
};

export const EMPTY_ENTRY: WeeklyEntry = {
  done: "",
  issues: "",
  plan: "",
  requests: "",
};

// 주 키는 그 주 월요일의 YYYY-MM-DD. 일요일(day()=0)은 직전 월요일로 본다.
export function weekStartOf(d: Dayjs) {
  return d.subtract((d.day() + 6) % 7, "day").startOf("day");
}

export function weekKey(start: Dayjs) {
  return start.format("YYYY-MM-DD");
}

export function weekPeriod(key: string) {
  const s = dayjs(key);
  return `${s.format("YYYY.MM.DD")} ~ ${s.add(6, "day").format("MM.DD")}`;
}

function load(): Record<string, WeeklyEntry> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function useWeeklyStore() {
  const [entries, setEntries] = React.useState<Record<string, WeeklyEntry>>({});
  const [hydrated, setHydrated] = React.useState(false);

  // 서버 렌더와 다른 값이라 마운트 후에 복원한다(hydration mismatch 방지).
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEntries(load());
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // 저장 실패(용량 초과 등)는 무시 — 데모 편의 기능
    }
  }, [entries, hydrated]);

  const save = React.useCallback((key: string, entry: WeeklyEntry) => {
    setEntries((prev) => ({
      ...prev,
      [key]: { ...entry, updatedAt: dayjs().toISOString() },
    }));
  }, []);

  return { entries, save, hydrated };
}
