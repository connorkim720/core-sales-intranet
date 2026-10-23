"use client";

import * as React from "react";

const STORAGE_KEY = "core-sales-influencer-groups-v1";

export type InfluencerGroup = {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
  createdAt: string;
  linkedCustomerId?: string;
};

const initialGroups: InfluencerGroup[] = [];

type InfluencerGroupStoreContextValue = {
  groups: InfluencerGroup[];
  createGroup: (
    name: string,
    description?: string,
    linkedCustomerId?: string
  ) => InfluencerGroup;
  deleteGroup: (id: string) => void;
  addMember: (groupId: string, influencerId: string) => void;
  removeMember: (groupId: string, influencerId: string) => void;
  getOrCreateForCustomer: (
    customerId: string,
    customerName: string
  ) => InfluencerGroup;
};

const InfluencerGroupStoreContext =
  React.createContext<InfluencerGroupStoreContextValue | null>(null);

function loadFromStorage(): InfluencerGroup[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed as InfluencerGroup[];
  } catch {
    return null;
  }
}

export function InfluencerGroupStoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [groups, setGroups] = React.useState<InfluencerGroup[]>(initialGroups);
  // customer-store.tsx / influencer-store.tsx 와 동일한 이유로 ref가 아니라
  // state — 복원 신호와 복원값이 같은 배치로 묶여야 한다.
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    const stored = loadFromStorage();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setGroups(stored);
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
    } catch {
      // 저장 실패는 무시 — 데모 편의 기능
    }
  }, [groups, hydrated]);

  const createGroup = React.useCallback(
    (name: string, description = "", linkedCustomerId?: string) => {
      const group: InfluencerGroup = {
        id: `group-${Date.now()}`,
        name,
        description,
        memberIds: [],
        createdAt: new Date().toISOString(),
        linkedCustomerId,
      };
      setGroups((prev) => [group, ...prev]);
      return group;
    },
    []
  );

  const deleteGroup = React.useCallback((id: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const addMember = React.useCallback((groupId: string, influencerId: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId && !g.memberIds.includes(influencerId)
          ? { ...g, memberIds: [...g.memberIds, influencerId] }
          : g
      )
    );
  }, []);

  const removeMember = React.useCallback(
    (groupId: string, influencerId: string) => {
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? { ...g, memberIds: g.memberIds.filter((id) => id !== influencerId) }
            : g
        )
      );
    },
    []
  );

  // 딜이 계약(won) 단계에 들어서면 고객사별 인플루언서 후보 그룹을 하나만
  // 유지한다 — 버튼을 여러 번 눌러도 그룹이 중복 생성되지 않도록 기존 걸
  // 먼저 찾는다.
  const getOrCreateForCustomer = React.useCallback(
    (customerId: string, customerName: string) => {
      const existing = groups.find((g) => g.linkedCustomerId === customerId);
      if (existing) return existing;
      return createGroup(
        `${customerName} 크리에이터 후보`,
        "계약 체결 후 운영 단계에서 자동 생성됨",
        customerId
      );
    },
    [groups, createGroup]
  );

  const value = React.useMemo(
    () => ({
      groups,
      createGroup,
      deleteGroup,
      addMember,
      removeMember,
      getOrCreateForCustomer,
    }),
    [
      groups,
      createGroup,
      deleteGroup,
      addMember,
      removeMember,
      getOrCreateForCustomer,
    ]
  );

  return (
    <InfluencerGroupStoreContext.Provider value={value}>
      {children}
    </InfluencerGroupStoreContext.Provider>
  );
}

export function useInfluencerGroupStore() {
  const ctx = React.useContext(InfluencerGroupStoreContext);
  if (!ctx) {
    throw new Error(
      "useInfluencerGroupStore must be used within an InfluencerGroupStoreProvider"
    );
  }
  return ctx;
}
