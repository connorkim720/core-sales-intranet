"use client";

import * as React from "react";

import { influencers as initialInfluencers } from "@/lib/influencer-data";
import type { Influencer, InfluencerPlatform } from "@/lib/influencer-data";

const STORAGE_KEY = "core-sales-influencers-v1";

export type InfluencerInput = {
  handle: string;
  platform: InfluencerPlatform;
  followers: number;
  engagementRate: number;
  avgViews: number | null;
  gender: "male" | "female";
  category: string[];
  bio: string;
  source: string;
  pinned: boolean;
  optOut: boolean;
};

type InfluencerStoreContextValue = {
  influencers: Influencer[];
  addInfluencer: (input: InfluencerInput) => Influencer;
  updateInfluencer: (id: string, input: InfluencerInput) => void;
  removeInfluencer: (id: string) => void;
  togglePinned: (id: string) => void;
};

const InfluencerStoreContext =
  React.createContext<InfluencerStoreContextValue | null>(null);

function loadFromStorage(): Influencer[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed as Influencer[];
  } catch {
    return null;
  }
}

export function InfluencerStoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [influencers, setInfluencers] =
    React.useState<Influencer[]>(initialInfluencers);
  // customer-store.tsx 와 동일한 이유로 ref가 아니라 state — setInfluencers와
  // 같은 배치로 묶여야 persist effect가 복원 전 초기값을 덮어쓰지 않는다.
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    const stored = loadFromStorage();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setInfluencers(stored);
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(influencers));
    } catch {
      // 저장 실패(용량 초과 등)는 무시 — 데모 편의 기능이라 치명적이지 않음
    }
  }, [influencers, hydrated]);

  const addInfluencer = React.useCallback((input: InfluencerInput) => {
    const id = `local-${Date.now()}`;
    const created: Influencer = { id, ...input };
    setInfluencers((prev) => [created, ...prev]);
    return created;
  }, []);

  const updateInfluencer = React.useCallback(
    (id: string, input: InfluencerInput) => {
      setInfluencers((prev) =>
        prev.map((c) => (c.id === id ? { id, ...input } : c))
      );
    },
    []
  );

  const removeInfluencer = React.useCallback((id: string) => {
    setInfluencers((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const togglePinned = React.useCallback((id: string) => {
    setInfluencers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c))
    );
  }, []);

  const value = React.useMemo(
    () => ({
      influencers,
      addInfluencer,
      updateInfluencer,
      removeInfluencer,
      togglePinned,
    }),
    [influencers, addInfluencer, updateInfluencer, removeInfluencer, togglePinned]
  );

  return (
    <InfluencerStoreContext.Provider value={value}>
      {children}
    </InfluencerStoreContext.Provider>
  );
}

export function useInfluencerStore() {
  const ctx = React.useContext(InfluencerStoreContext);
  if (!ctx) {
    throw new Error(
      "useInfluencerStore must be used within an InfluencerStoreProvider"
    );
  }
  return ctx;
}
