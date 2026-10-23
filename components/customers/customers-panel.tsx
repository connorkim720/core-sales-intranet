"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Phone, Search, Users2Icon, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { AddActivityDialog } from "@/components/customers/add-activity-dialog";
import { AddCustomerDialog } from "@/components/customers/add-customer-dialog";
import { EditCustomerDialog } from "@/components/customers/edit-customer-dialog";
import { DeleteCustomerDialog } from "@/components/customers/delete-customer-dialog";
import { OperationStatusBadge } from "@/components/customers/operation-status-badge";
import { SOURCE_LABEL, STAGE_LABEL, STAGE_ORDER } from "@/lib/mock-data";
import { useCustomerStore } from "@/lib/customer-store";
import { useInfluencerGroupStore } from "@/lib/influencer-group-store";
import { formatDate, formatDateTime, formatKRW } from "@/lib/format";
import {
  OPERATION_STATUS_LABEL,
  OPERATION_STATUS_ORDER,
} from "@/lib/operation-status";
import type { Customer, DealStage, OperationStatus } from "@/lib/types";

const FULL_H = "h-[calc(100svh-13rem)]";

const STAGE_BADGE_CLASS: Record<DealStage, string> = {
  lead: "border-border bg-muted text-muted-foreground",
  discovery: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  proposal:
    "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-500",
  won: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

const ACTIVITY_LABEL: Record<Customer["activities"][number]["type"], string> = {
  call: "통화",
  email: "이메일",
  meeting: "미팅",
  note: "메모",
  quote: "견적서",
  system: "시스템",
};

export function CustomersPanel() {
  const { customers, setOperationStatus } = useCustomerStore();
  const { getOrCreateForCustomer } = useInfluencerGroupStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialId = searchParams.get("id");

  const [query, setQuery] = React.useState("");
  const [selId, setSelId] = React.useState<string | null>(
    initialId ?? customers[0]?.id ?? null
  );

  function handleSelectInfluencers(customer: Customer) {
    if (customer.operationStatus === "not_started") {
      setOperationStatus(customer.id, "selecting");
    }
    const group = getOrCreateForCustomer(customer.id, customer.company);
    router.push(`/influencers?group=${group.id}`);
  }

  const filtered = customers
    .filter((c) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        c.company.toLowerCase().includes(q) ||
        c.manager.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
      );
    })
    // 계약 → 제안 → 상담 → 리드 순으로 정렬 — 딜이 무르익은 순서대로
    // 위에서부터 챙길 수 있도록. STAGE_ORDER는 리드→계약 순이라 뒤집어서 쓴다.
    .sort(
      (a, b) => STAGE_ORDER.indexOf(b.stage) - STAGE_ORDER.indexOf(a.stage)
    );

  const selected = customers.find((c) => c.id === selId) ?? null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="회사명·담당자·카테고리 검색"
            className="h-9 pl-8"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="검색 지우기"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <p className="shrink-0 text-xs text-muted-foreground">
          총 {filtered.length}개 고객사
        </p>
        <AddCustomerDialog />
      </div>

      <div className={`flex gap-4 ${FULL_H}`}>
        {/* 좌측 목록 */}
        <div className="flex h-full w-2/5 min-w-[280px] max-w-md shrink-0 flex-col">
          <div className="h-full overflow-y-auto rounded-md border">
            {filtered.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                검색 결과 없음
              </p>
            ) : (
              <div className="divide-y">
                {filtered.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelId(c.id)}
                    className={`relative flex w-full flex-col gap-1 border-l-2 px-3 py-2.5 text-left transition-colors ${
                      c.stage === "won"
                        ? "border-l-lime-400 bg-lime-300/20 hover:bg-lime-300/30 dark:bg-lime-400/10 dark:hover:bg-lime-400/15"
                        : "border-l-transparent hover:bg-accent"
                    } ${selId === c.id ? "!bg-accent" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {c.company}
                      </span>
                      <div className="flex shrink-0 items-center gap-1">
                        {c.stage === "won" && (
                          <OperationStatusBadge
                            status={c.operationStatus}
                            className="text-[10px]"
                          />
                        )}
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${STAGE_BADGE_CLASS[c.stage]}`}
                        >
                          {STAGE_LABEL[c.stage]}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-muted-foreground">
                        {c.category} · {c.manager}
                      </span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {formatKRW(c.dealValueMonthly)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 우측 상세 */}
        <div className="h-full min-w-0 flex-1">
          {!selected ? (
            <div className="flex h-full items-center justify-center rounded-md border text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Search className="size-4" /> 왼쪽에서 고객사를 선택하세요
              </span>
            </div>
          ) : (
            <div className="flex h-full flex-col rounded-md border">
              <div className="space-y-3 border-b p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-base font-medium leading-none">
                      {selected.company}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selected.category} · {selected.website}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge
                      variant="outline"
                      className={STAGE_BADGE_CLASS[selected.stage]}
                    >
                      {STAGE_LABEL[selected.stage]}
                    </Badge>
                    {selected.stage === "won" && (
                      <Select
                        value={selected.operationStatus}
                        onValueChange={(v) =>
                          setOperationStatus(selected.id, v as OperationStatus)
                        }
                      >
                        <SelectTrigger className="h-8 w-fit border-transparent bg-transparent p-0 shadow-none hover:bg-transparent">
                          <OperationStatusBadge status={selected.operationStatus} />
                        </SelectTrigger>
                        <SelectContent align="end">
                          {OPERATION_STATUS_ORDER.map((s) => (
                            <SelectItem key={s} value={s}>
                              {OPERATION_STATUS_LABEL[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Button
                      size="sm"
                      className="h-8"
                      disabled={selected.stage !== "won"}
                      onClick={() => handleSelectInfluencers(selected)}
                      title={
                        selected.stage !== "won"
                          ? "계약 체결(운영 단계 진입) 후 활성화됩니다"
                          : "이 고객사 캠페인의 인플루언서 후보 그룹으로 이동"
                      }
                    >
                      <Users2Icon className="size-3.5" /> 인플루언서 선정하기
                    </Button>
                    <EditCustomerDialog customer={selected} />
                    <DeleteCustomerDialog
                      customer={selected}
                      onDeleted={() => setSelId(null)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted-foreground">예상 MRR</p>
                    <p className="text-sm font-semibold tabular-nums">
                      {formatKRW(selected.dealValueMonthly)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">유입경로</p>
                    <p className="text-sm font-medium">
                      {SOURCE_LABEL[selected.source]}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">담당 영업</p>
                    <p className="text-sm font-medium">{selected.owner}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">생성일</p>
                    <p className="text-sm font-medium">
                      {formatDate(selected.createdAt, "YYYY.MM.DD")}
                    </p>
                  </div>
                </div>

                {selected.nextStep && (
                  <div className="flex items-center justify-between gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                    <span className="truncate">→ {selected.nextStep}</span>
                    {selected.nextStepDue && (
                      <span className="shrink-0 text-xs">
                        마감 {selected.nextStepDue}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="min-h-0 flex-1 overflow-auto p-4">
                <section>
                  <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    담당자
                  </h3>
                  <div className="divide-y rounded-md border">
                    {selected.contacts.map((ct) => (
                      <div key={ct.id} className="flex items-center gap-2.5 px-3 py-2.5">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
                          {ct.name.slice(0, 2)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {ct.name}{" "}
                            <span className="font-normal text-muted-foreground">
                              · {ct.title}
                            </span>
                          </p>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Mail className="size-3" /> {ct.email}
                            </span>
                            {ct.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="size-3" /> {ct.phone}
                              </span>
                            )}
                          </div>
                        </div>
                        {ct.primary && (
                          <Badge variant="secondary" className="shrink-0 font-normal">
                            주 담당
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="mt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      활동 타임라인
                    </h3>
                    <AddActivityDialog customer={selected} />
                  </div>
                  <div className="space-y-1">
                    {[...selected.activities]
                      .sort((a, b) => (a.at < b.at ? 1 : -1))
                      .map((a) => (
                        <div key={a.id} className="flex gap-3 py-2 first:pt-0">
                          <div className="flex w-16 shrink-0 flex-col items-start pt-0.5">
                            <Badge variant="outline" className="text-[10px] font-normal">
                              {ACTIVITY_LABEL[a.type]}
                            </Badge>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] leading-snug">{a.summary}</p>
                            {a.detail && (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {a.detail}
                              </p>
                            )}
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {formatDateTime(a.at)} · {a.author}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
