"use client";

import * as React from "react";

import type { ContentMetrics } from "@/lib/pms-metrics";

const STORAGE_KEY = "core-sales-creator-settlements-v1";

export type SettlementStatus = "pending" | "processing" | "completed";

export type CreatorSettlement = {
  id: string;
  creatorName: string;
  campaignName: string;
  resultUrl: string;
  amount: number;
  note: string;
  metrics?: ContentMetrics;
  status: SettlementStatus;
  createdAt: string;
  updatedAt: string;
};

export type SettlementInput = Pick<CreatorSettlement, "creatorName" | "campaignName" | "resultUrl" | "amount" | "note">;

export const SETTLEMENT_STATUS_LABEL: Record<SettlementStatus, string> = {
  pending: "정산 대기",
  processing: "정산 중",
  completed: "정산 완료로 기록",
};

function load(): CreatorSettlement[] {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) return [];
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as CreatorSettlement[]) : [];
  } catch {
    return [];
  }
}

function persist(records: CreatorSettlement[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // 저장 공간을 사용할 수 없어도 현재 화면에서는 편집할 수 있습니다.
  }
}

export function useCreatorSettlements() {
  const [records, setRecords] = React.useState<CreatorSettlement[]>([]);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecords(load());
    setHydrated(true);
  }, []);

  const create = (input: SettlementInput) => {
    const now = new Date().toISOString();
    const record: CreatorSettlement = {
      ...input,
      id: crypto.randomUUID(),
      metrics: { views: 0, likes: 0, comments: 0, saves: 0, shares: 0 },
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };
    const next = [record, ...records];
    persist(next);
    setRecords(next);
    return record;
  };

  const update = (id: string, patch: Partial<SettlementInput> & { status?: SettlementStatus; metrics?: ContentMetrics }) => {
    const next = records.map((record) =>
      record.id === id ? { ...record, ...patch, updatedAt: new Date().toISOString() } : record
    );
    persist(next);
    setRecords(next);
  };

  return { records, hydrated, create, update };
}
