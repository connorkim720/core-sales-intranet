"use client";

import * as React from "react";

const STORAGE_KEY = "core-sales-creator-irm-v1";

export const IRM_LIMIT = 100;

export type IrmStatus = "lead" | "contacted" | "negotiating" | "signed";

export const IRM_STATUS_LABEL: Record<IrmStatus, string> = {
  lead: "리드",
  contacted: "컨택함",
  negotiating: "협의중",
  signed: "계약",
};

export const IRM_STATUS_DOT: Record<IrmStatus, string> = {
  lead: "bg-pink-500",
  contacted: "bg-amber-500",
  negotiating: "bg-blue-500",
  signed: "bg-emerald-500",
};

export const IRM_TAGS = ["뷰티", "우선 컨택", "단가 높음", "재컨택", "협의 필요"];

export const IRM_OWNERS = ["김세일", "박영업", "이성장", "최상담"];

// 커뮤니티(IRM)에 담긴 크리에이터 한 명의 관계 관리 정보. id는 인플루언서 id.
export type IrmEntry = {
  id: string;
  status: IrmStatus;
  owner: string;
  tags: string[];
  lastContactAt: string | null;
  addedAt: string;
};

function load(): Record<string, IrmEntry> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function useCreatorIrm() {
  const [entries, setEntries] = React.useState<Record<string, IrmEntry>>({});
  const [hydrated, setHydrated] = React.useState(false);

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
      // 저장 실패는 무시 — 데모 편의 기능
    }
  }, [entries, hydrated]);

  // 컨택 버튼: 커뮤니티에 리드로 추가. 한도(IRM_LIMIT)를 넘으면 추가하지 않는다.
  // (한도 안내는 호출하는 쪽이 entries 개수로 미리 확인한다 — updater는 지연 실행됨)
  const add = React.useCallback((id: string, owner = IRM_OWNERS[0]) => {
    setEntries((prev) => {
      if (prev[id] || Object.keys(prev).length >= IRM_LIMIT) return prev;
      return {
        ...prev,
        [id]: {
          id,
          status: "lead",
          owner,
          tags: [],
          lastContactAt: null,
          addedAt: new Date().toISOString(),
        },
      };
    });
  }, []);

  const update = React.useCallback((id: string, patch: Partial<IrmEntry>) => {
    setEntries((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      const next = { ...cur, ...patch };
      // 리드가 아닌 상태로 처음 바뀌면 마지막 컨택일을 오늘로 남긴다.
      if (patch.status && patch.status !== "lead" && !cur.lastContactAt && !patch.lastContactAt) {
        next.lastContactAt = new Date().toISOString();
      }
      return { ...prev, [id]: next };
    });
  }, []);

  const markContacted = React.useCallback((ids: string[]) => {
    const now = new Date().toISOString();
    setEntries((prev) => {
      const next = { ...prev };
      for (const id of ids) {
        if (next[id]) {
          next[id] = {
            ...next[id],
            status: next[id].status === "lead" ? "contacted" : next[id].status,
            lastContactAt: now,
          };
        }
      }
      return next;
    });
  }, []);

  const remove = React.useCallback((id: string) => {
    setEntries((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  return { entries, add, update, markContacted, remove, hydrated };
}
