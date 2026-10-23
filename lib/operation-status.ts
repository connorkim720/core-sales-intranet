import type { OperationStatus } from "@/lib/types";

export const OPERATION_STATUS_ORDER: OperationStatus[] = [
  "not_started",
  "selecting",
  "in_progress",
  "completed",
];

export const OPERATION_STATUS_LABEL: Record<OperationStatus, string> = {
  not_started: "시작 전",
  selecting: "인플루언서 선정 중",
  in_progress: "캠페인 진행중",
  completed: "캠페인 종료",
};

// 계약(딜) 배지와 구분되는 두 번째 축이라 톤을 다르게 준다.
// in_progress만 펄스 애니메이션을 붙여 "지금 실제로 돌아가고 있다"를 강조.
export const OPERATION_STATUS_CLASS: Record<OperationStatus, string> = {
  not_started: "border-border bg-muted text-muted-foreground",
  selecting: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  in_progress:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  completed: "border-border bg-muted/50 text-muted-foreground/70",
};

export const OPERATION_STATUS_DOT: Record<OperationStatus, string> = {
  not_started: "bg-muted-foreground/40",
  selecting: "bg-blue-500",
  in_progress: "bg-emerald-500",
  completed: "bg-muted-foreground/40",
};
