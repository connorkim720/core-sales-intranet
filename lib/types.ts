export type DealStage = "lead" | "discovery" | "proposal" | "won";

export type DealSource = "inbound" | "outbound" | "referral" | "partner";

// 딜 단계(영업 퍼널)와는 별개 축 — 계약(won) 이후 실제 캠페인 운영이
// 어디까지 왔는지. stage는 세일즈 관점, operationStatus는 운영 관점.
export type OperationStatus =
  | "not_started"
  | "selecting"
  | "in_progress"
  | "completed";

export type ActivityType =
  | "call"
  | "email"
  | "meeting"
  | "note"
  | "quote"
  | "system";

export type Activity = {
  id: string;
  type: ActivityType;
  summary: string;
  detail?: string;
  at: string; // ISO
  author: string;
};

export type Contact = {
  id: string;
  name: string;
  title: string;
  email: string;
  phone?: string;
  primary?: boolean;
};

export type Customer = {
  id: string;
  company: string;
  category: string;
  website: string;
  stage: DealStage;
  dealValueMonthly: number; // 예상 MRR (KRW)
  source: DealSource;
  owner: string;
  manager: string;
  email: string;
  phone: string;
  createdAt: string;
  lastActivityAt: string;
  nextStep?: string;
  nextStepDue?: string;
  contacts: Contact[];
  activities: Activity[];
  tags: string[];
  operationStatus: OperationStatus;
};
