"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { GripVerticalIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatGrid, type Stat } from "@/components/stat-card";
import { AddCustomerDialog } from "@/components/customers/add-customer-dialog";
import { OperationStatusBadge } from "@/components/customers/operation-status-badge";
import { STAGE_LABEL, STAGE_ORDER } from "@/lib/mock-data";
import { useCustomerStore } from "@/lib/customer-store";
import { formatKRW } from "@/lib/format";
import type { Customer, DealStage } from "@/lib/types";

const STAGE_DOT: Record<DealStage, string> = {
  lead: "bg-muted-foreground",
  discovery: "bg-blue-500",
  proposal: "bg-amber-500",
  won: "bg-emerald-500",
};

function DealCard({
  c,
  onDragStart,
  onDragEnd,
}: {
  c: Customer;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}) {
  const router = useRouter();

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", c.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart(c.id);
      }}
      onDragEnd={onDragEnd}
      onClick={() => router.push(`/customers?id=${c.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(`/customers?id=${c.id}`);
      }}
      className={cn(
        "group cursor-grab rounded-lg border-l-2 bg-card p-3 transition-colors active:cursor-grabbing",
        c.stage === "won"
          ? "border border-l-lime-400 bg-lime-300/20 hover:bg-lime-300/30 dark:bg-lime-400/10 dark:hover:bg-lime-400/15"
          : "border border-l-transparent hover:bg-accent/40"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">{c.company}</p>
        <div className="flex shrink-0 items-center gap-1">
          <Badge variant="outline" className="text-[10px]">
            {c.category.split("·")[0]}
          </Badge>
          <GripVerticalIcon className="size-3.5 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">{c.manager}</p>
      {c.stage === "won" && (
        <OperationStatusBadge status={c.operationStatus} className="mt-1.5 text-[10px]" />
      )}
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold tabular-nums">
          {formatKRW(c.dealValueMonthly)}
          <span className="ml-0.5 text-xs font-normal text-muted-foreground">
            /월
          </span>
        </span>
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
          {c.owner.slice(0, 2)}
        </span>
      </div>
      {c.nextStep && (
        <p className="mt-2 truncate text-xs text-muted-foreground">
          → {c.nextStep}
        </p>
      )}
    </div>
  );
}

function Column({
  stage,
  items,
  draggingId,
  onDragStart,
  onDragEnd,
  onDropCustomer,
}: {
  stage: DealStage;
  items: Customer[];
  draggingId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDropCustomer: (id: string, stage: DealStage) => void;
}) {
  const [isOver, setIsOver] = React.useState(false);
  const total = items.reduce((s, c) => s + c.dealValueMonthly, 0);
  const draggingIntoOtherStage =
    draggingId != null && !items.some((i) => i.id === draggingId);

  return (
    <Card
      className={cn(
        "shadow-xs transition-colors",
        isOver && draggingIntoOtherStage && "ring-2 ring-primary/50"
      )}
      onDragOver={(e) => {
        if (!draggingId) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);
        const id = e.dataTransfer.getData("text/plain");
        if (id) onDropCustomer(id, stage);
      }}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <span className={`size-2 rounded-full ${STAGE_DOT[stage]}`} />
          {STAGE_LABEL[stage]}
        </CardTitle>
        <CardAction className="flex items-center gap-1.5">
          <Badge variant="secondary" className="font-normal">
            {items.length}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="mb-2 text-xs text-muted-foreground">
          합계 {formatKRW(total)}/월
        </p>
        <div className="min-h-16 space-y-2">
          {items.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              {isOver && draggingIntoOtherStage ? "여기로 이동" : "없음"}
            </p>
          ) : (
            items.map((c) => (
              <DealCard
                key={c.id}
                c={c}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function PipelinePage() {
  const { customers, moveStage } = useCustomerStore();
  const [draggingId, setDraggingId] = React.useState<string | null>(null);

  const byStage = STAGE_ORDER.map((stage) => ({
    stage,
    items: customers.filter((c) => c.stage === stage),
  }));

  const openDeals = customers.filter((c) => c.stage !== "won");
  const pipelineValue = openDeals.reduce((s, c) => s + c.dealValueMonthly, 0);
  const proposalValue = customers
    .filter((c) => c.stage === "proposal")
    .reduce((s, c) => s + c.dealValueMonthly, 0);
  const avgDealSize = Math.round(
    customers.reduce((s, c) => s + c.dealValueMonthly, 0) / customers.length
  );

  const stats: Stat[] = [
    {
      label: "전체 파이프라인",
      value: formatKRW(pipelineValue),
      footerTitle: `${openDeals.length}개 진행 중`,
    },
    {
      label: "제안 단계 금액",
      value: formatKRW(proposalValue),
      badge: { text: "클로징 임박", tone: "warning" },
    },
    {
      label: "평균 딜 사이즈",
      value: formatKRW(avgDealSize),
      footerTitle: "월 반복 매출 기준",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="mt-1 text-sm text-muted-foreground">
          리드 → 상담 → 제안 → 계약 단계별 딜 현황 · 카드를 드래그해서 단계를
          옮길 수 있습니다
        </p>
        <AddCustomerDialog />
      </div>

      <StatGrid stats={stats} className="grid-cols-1 @xl/main:grid-cols-3" />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {byStage.map(({ stage, items }) => (
          <Column
            key={stage}
            stage={stage}
            items={items}
            draggingId={draggingId}
            onDragStart={setDraggingId}
            onDragEnd={() => setDraggingId(null)}
            onDropCustomer={(id, targetStage) => {
              moveStage(id, targetStage);
              setDraggingId(null);
            }}
          />
        ))}
      </div>
    </div>
  );
}
