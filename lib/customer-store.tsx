"use client";

import * as React from "react";

import { customers as initialCustomers, STAGE_LABEL } from "@/lib/mock-data";
import { OPERATION_STATUS_LABEL } from "@/lib/operation-status";
import type {
  ActivityType,
  Customer,
  DealSource,
  DealStage,
  OperationStatus,
} from "@/lib/types";

const CURRENT_USER = "김세일";

const STORAGE_KEY = "core-sales-customers-v1";

export type NewCustomerInput = {
  company: string;
  category: string;
  manager: string;
  email: string;
  source: DealSource;
  owner: string;
  stage?: DealStage;
  dealValueMonthly?: number;
};

export type NewActivityInput = {
  type: Exclude<ActivityType, "system">;
  summary: string;
  detail?: string;
  nextStep?: string;
  nextStepDue?: string;
};

export type UpdateCustomerInput = {
  company: string;
  category: string;
  manager: string;
  email: string;
  source: DealSource;
  owner: string;
  stage: DealStage;
  dealValueMonthly: number;
};

type CustomerStoreContextValue = {
  customers: Customer[];
  addCustomer: (input: NewCustomerInput) => Customer;
  updateCustomer: (id: string, input: UpdateCustomerInput) => void;
  removeCustomer: (id: string) => void;
  moveStage: (id: string, stage: DealStage) => void;
  setOperationStatus: (id: string, status: OperationStatus) => void;
  addActivity: (id: string, input: NewActivityInput) => void;
};

const CustomerStoreContext =
  React.createContext<CustomerStoreContextValue | null>(null);

function loadFromStorage(): Customer[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    // 스키마 마이그레이션 — operationStatus 필드 추가 전에 저장된
    // localStorage 데이터에는 이 필드가 없다. 없으면 기본값을 채운다.
    return (parsed as Customer[]).map((c) => ({
      ...c,
      operationStatus: c.operationStatus ?? "not_started",
    }));
  } catch {
    return null;
  }
}

export function CustomerStoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [customers, setCustomers] = React.useState<Customer[]>(initialCustomers);
  // ref가 아니라 state로 둔다 — 같은 effect 플러시 안에서 ref만 동기화하면
  // "복원 완료" 신호가 persist effect에 즉시 보이는데 customers는 아직
  // 이전 렌더의 초기값이라, 방금 복원한 값을 초기값으로 덮어써 버리는
  // 경쟁 상태가 생긴다(React DevTools Strict Mode 이중 실행에서 특히
  // 치명적으로 드러남). state로 두면 setCustomers와 같은 배치로 묶여
  // persist effect가 항상 "복원된 customers + hydrated"를 함께 본다.
  const [hydrated, setHydrated] = React.useState(false);

  // 마운트 시 1회, localStorage에 저장된 값이 있으면 그걸로 복원한다.
  // 서버 렌더와 다른 값이라 useEffect에서 처리(hydration mismatch 방지).
  React.useEffect(() => {
    const stored = loadFromStorage();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setCustomers(stored);
    setHydrated(true);
  }, []);

  // customers가 바뀔 때마다 저장한다. 단, 복원 전(hydrated=false) 저장은
  // 건너뛴다 — 안 그러면 초기 목업값으로 저장된 값을 덮어써 버린다.
  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
    } catch {
      // 저장 실패(용량 초과 등)는 무시 — 데모 편의 기능이라 치명적이지 않음
    }
  }, [customers, hydrated]);

  const addCustomer = React.useCallback((input: NewCustomerInput) => {
    const now = new Date().toISOString();
    // Date.now()만 쓰면 같은 밀리초 안에 연속 호출될 때(예: 메타 시트에서
    // 리드 여러 건을 한 번에 가져올 때) id가 충돌한다. 랜덤 접미사를 더한다.
    const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const newCustomer: Customer = {
      id,
      company: input.company,
      category: input.category || "미분류",
      website: "-",
      stage: input.stage ?? "lead",
      dealValueMonthly: input.dealValueMonthly ?? 0,
      source: input.source,
      owner: input.owner,
      manager: input.manager || "담당자 미정",
      email: input.email,
      phone: "",
      createdAt: now,
      lastActivityAt: now,
      nextStep: "첫 컨택 필요",
      tags: ["신규 입력"],
      operationStatus: "not_started",
      contacts: input.manager
        ? [
            {
              id: `${id}-ct`,
              name: input.manager,
              title: "담당자",
              email: input.email,
              primary: true,
            },
          ]
        : [],
      activities: [
        {
          id: `${id}-a`,
          type: "system",
          summary: "수동 입력으로 브랜드 등록",
          at: now,
          author: input.owner,
        },
      ],
    };
    setCustomers((prev) => [newCustomer, ...prev]);
    return newCustomer;
  }, []);

  const updateCustomer = React.useCallback(
    (id: string, input: UpdateCustomerInput) => {
      const now = new Date().toISOString();
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c;
          const stageChanged = c.stage !== input.stage;
          return {
            ...c,
            company: input.company,
            category: input.category || "미분류",
            manager: input.manager || "담당자 미정",
            email: input.email,
            source: input.source,
            owner: input.owner,
            stage: input.stage,
            dealValueMonthly: input.dealValueMonthly,
            lastActivityAt: now,
            activities: stageChanged
              ? [
                  {
                    id: `${id}-a-${Date.now()}`,
                    type: "system",
                    summary: `정보 수정 · 단계 변경(${STAGE_LABEL[c.stage]} → ${STAGE_LABEL[input.stage]})`,
                    at: now,
                    author: input.owner,
                  },
                  ...c.activities,
                ]
              : c.activities,
          };
        })
      );
    },
    []
  );

  const removeCustomer = React.useCallback((id: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const moveStage = React.useCallback((id: string, stage: DealStage) => {
    const now = new Date().toISOString();
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id !== id || c.stage === stage) return c;
        return {
          ...c,
          stage,
          lastActivityAt: now,
          activities: [
            {
              id: `${id}-a-${Date.now()}`,
              type: "system" as const,
              summary: `단계 이동: ${STAGE_LABEL[c.stage]} → ${STAGE_LABEL[stage]}`,
              at: now,
              author: c.owner,
            },
            ...c.activities,
          ],
        };
      })
    );
  }, []);

  // 딜 단계(stage)와는 별개 축 — 계약 이후 캠페인이 실제로 어디까지
  // 왔는지. "인플루언서 선정하기"를 처음 누르면 자동으로 selecting으로
  // 올라가고, 그 이후(진행중/종료)는 담당자가 수동으로 올린다.
  const setOperationStatus = React.useCallback(
    (id: string, status: OperationStatus) => {
      const now = new Date().toISOString();
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id !== id || c.operationStatus === status) return c;
          return {
            ...c,
            operationStatus: status,
            lastActivityAt: now,
            activities: [
              {
                id: `${id}-a-${Date.now()}`,
                type: "system" as const,
                summary: `운영 상태 변경: ${OPERATION_STATUS_LABEL[c.operationStatus]} → ${OPERATION_STATUS_LABEL[status]}`,
                at: now,
                author: c.owner,
              },
              ...c.activities,
            ],
          };
        })
      );
    },
    []
  );

  // 담당자가 직접 남기는 컨택 기록 — 지금까지는 단계/운영 상태 변경 시
  // 시스템이 자동으로 남기는 활동만 있었다. nextStep을 같이 넘기면
  // "다음 액션" 배너도 함께 갱신한다.
  const addActivity = React.useCallback(
    (id: string, input: NewActivityInput) => {
      const now = new Date().toISOString();
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c;
          return {
            ...c,
            lastActivityAt: now,
            nextStep: input.nextStep !== undefined ? input.nextStep : c.nextStep,
            nextStepDue:
              input.nextStep !== undefined ? input.nextStepDue : c.nextStepDue,
            activities: [
              {
                id: `${id}-a-${Date.now()}`,
                type: input.type,
                summary: input.summary,
                detail: input.detail,
                at: now,
                author: CURRENT_USER,
              },
              ...c.activities,
            ],
          };
        })
      );
    },
    []
  );

  const value = React.useMemo(
    () => ({
      customers,
      addCustomer,
      updateCustomer,
      removeCustomer,
      moveStage,
      setOperationStatus,
      addActivity,
    }),
    [
      customers,
      addCustomer,
      updateCustomer,
      removeCustomer,
      moveStage,
      setOperationStatus,
      addActivity,
    ]
  );

  return (
    <CustomerStoreContext.Provider value={value}>
      {children}
    </CustomerStoreContext.Provider>
  );
}

export function useCustomerStore() {
  const ctx = React.useContext(CustomerStoreContext);
  if (!ctx) {
    throw new Error(
      "useCustomerStore must be used within a CustomerStoreProvider"
    );
  }
  return ctx;
}
