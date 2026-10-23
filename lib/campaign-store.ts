"use client";

import * as React from "react";
import dayjs from "dayjs";

import { customers as seedCustomers } from "@/lib/mock-data";
import { influencers as seedInfluencers } from "@/lib/influencer-data";
import { DEMO_TODAY } from "@/lib/format";

const STORAGE_KEY = "core-sales-campaigns-v1";

// 캠페인 운영(뮤즈바이 참고) — 진행 5단계:
// 콘텐츠 가이드라인 작성 → 제품 배송 → 대본 피드백 → 영상 피드백 → 업로드 확인
// 가이드라인·배송은 캠페인 단위, 대본·영상·업로드는 크리에이터별로 진행한다.

export type StepKey = "guideline" | "shipping" | "script" | "video" | "upload";

export const STEPS: { key: StepKey; label: string }[] = [
  { key: "guideline", label: "콘텐츠 가이드라인 작성" },
  { key: "shipping", label: "제품 배송" },
  { key: "script", label: "대본 피드백" },
  { key: "video", label: "영상 피드백" },
  { key: "upload", label: "업로드 확인" },
];

export type ScriptStatus = "writing" | "review" | "done";
export type VideoStatus = "writing" | "review" | "done";
export type UploadStatus = "pending" | "uploaded" | "done";
export type CampaignPackage = "managed" | "lite";
export type CampaignBrief = {
  product: string;
  goal: string;
  audience: string;
  message: string;
};
export type DailyReach = { date: string; views: number };

export type CampaignTaskStatus = "todo" | "doing" | "done";
export type CampaignTaskPhase = "brief" | "selection" | "production" | "review" | "upload" | "metrics" | "settlement";
export type CampaignTask = {
  id: string;
  title: string;
  status: CampaignTaskStatus;
  phase?: CampaignTaskPhase;
  dueDate: string;
  assignee: string;
  description: string;
  createdAt: string;
};

export type CampaignNote = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type CampaignCreator = {
  influencerId: string;
  script: ScriptStatus;
  video: VideoStatus;
  upload: UploadStatus;
  scriptFeedback: string;
  videoFeedback: string;
  uploadUrl: string;
  fee: number; // 크리에이터 지급 단가(KRW)
  paid: boolean;
  settlementStatus?: "pending" | "processing" | "completed";
  views: number;
  likes: number;
  comments: number;
  scriptUrl?: string;
  videoUrl?: string;
  saves?: number;
  shares?: number;
  dailyReach?: DailyReach[];
  paCode?: string;
};

export type Campaign = {
  id: string;
  name: string;
  brand: string;
  createdAt: string;
  guidelineText: string;
  guidelineDone: boolean;
  shippingDone: boolean;
  deadlines: { script: string; video: string; uploadFrom: string; uploadTo: string };
  creators: CampaignCreator[];
  packageType?: CampaignPackage;
  brief?: CampaignBrief;
  selectionConfirmed?: boolean;
  tasks?: CampaignTask[];
  notes?: CampaignNote[];
};

export function newCreator(influencerId: string): CampaignCreator {
  return {
    influencerId,
    script: "writing",
    video: "writing",
    upload: "pending",
    scriptFeedback: "",
    videoFeedback: "",
    uploadUrl: "",
    fee: 0,
    paid: false,
    settlementStatus: "pending",
    views: 0,
    likes: 0,
    comments: 0,
    scriptUrl: "",
    videoUrl: "",
    saves: 0,
    shares: 0,
    dailyReach: [],
    paCode: "",
  };
}

// 크리에이터가 지금 있는 단계. 대본 → 영상 → 업로드 순서로 첫 미완료 단계.
export function stageOf(c: CampaignCreator): "script" | "video" | "upload" | "complete" {
  if (c.script !== "done") return "script";
  if (c.video !== "done") return "video";
  if (c.upload !== "done") return "upload";
  return "complete";
}

export type StepState = {
  key: StepKey;
  label: string;
  state: "done" | "active" | "todo";
  note: string; // 완료 / 진행중 N명 / 진행 전
};

export function stepStates(c: Campaign): StepState[] {
  const gateOpen = c.guidelineDone && c.shippingDone;
  const perCreatorDone = (key: "script" | "video" | "upload") =>
    c.creators.length > 0 && c.creators.every((x) => x[key] === "done");

  return STEPS.map(({ key, label }): StepState => {
    if (key === "guideline") {
      return c.guidelineDone
        ? { key, label, state: "done", note: "완료" }
        : { key, label, state: "active", note: "진행중" };
    }
    if (key === "shipping") {
      if (c.shippingDone) return { key, label, state: "done", note: "완료" };
      return c.guidelineDone
        ? { key, label, state: "active", note: "진행중" }
        : { key, label, state: "todo", note: "진행 전" };
    }
    if (perCreatorDone(key)) return { key, label, state: "done", note: "완료" };
    const n = c.creators.filter((x) => stageOf(x) === key).length;
    return gateOpen && n > 0
      ? { key, label, state: "active", note: `진행중 ${n}명` }
      : { key, label, state: "todo", note: "진행 전" };
  });
}

export function progressPercent(c: Campaign) {
  const done = stepStates(c).filter((s) => s.state === "done").length;
  return Math.round((done / STEPS.length) * 100);
}

function seedCampaign(): Campaign {
  const brand = seedCustomers.find((c) => c.stage === "won")?.company ?? "데모 브랜드";
  const d = (n: number) => DEMO_TODAY.add(n, "day").format("YYYY-MM-DD");
  const creators = seedInfluencers.filter((i) => !i.optOut).slice(0, 3).map((i) => newCreator(i.id));
  // 스크린샷과 같은 상태: 첫 번째는 대본 제출(피드백 대기), 나머지는 작성 중
  if (creators[0]) creators[0].script = "review";
  creators.forEach((c, i) => {
    c.fee = [800_000, 600_000, 500_000][i] ?? 0;
  });
  return {
    id: "camp-demo",
    name: `${brand} 신제품 시딩 캠페인`,
    brand,
    createdAt: DEMO_TODAY.toISOString(),
    guidelineText:
      "- 제품의 핵심 메시지: 순한 성분, 매일 쓰는 루틴\n- 영상 길이 30~45초, 앞 3초 안에 훅\n- 필수 해시태그: #광고 #협찬\n- 금지: 타사 제품 비교, 과장된 효능 표현",
    guidelineDone: true,
    shippingDone: true,
    deadlines: { script: d(5), video: d(12), uploadFrom: d(14), uploadTo: d(19) },
    creators,
    packageType: "managed",
    brief: {
      product: "신제품",
      goal: "브랜드 인지도와 제품 리뷰 확보",
      audience: "뷰티 콘텐츠에 관심 있는 고객",
      message: "순한 성분과 매일 쓰는 루틴",
    },
    selectionConfirmed: true,
    tasks: [],
    notes: [],
  };
}

function load(): Campaign[] | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Campaign[]) : null;
  } catch {
    return null;
  }
}

export function useCampaigns() {
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    // 저장된 값이 없으면(최초 방문) 예시 캠페인 1개로 시작한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCampaigns(load() ?? [seedCampaign()]);
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(campaigns));
    } catch {
      // 저장 실패는 무시 — 데모 편의 기능
    }
  }, [campaigns, hydrated]);

  const create = React.useCallback(
    (input: { name: string; brand: string; packageType: CampaignPackage; brief: CampaignBrief }) => {
      const t = dayjs();
      const d = (n: number) => t.add(n, "day").format("YYYY-MM-DD");
      const campaign: Campaign = {
        id: `camp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: input.name,
        brand: input.brand,
        createdAt: t.toISOString(),
        guidelineText: "",
        guidelineDone: false,
        shippingDone: false,
        deadlines: { script: d(7), video: d(14), uploadFrom: d(16), uploadTo: d(21) },
        creators: [],
        packageType: input.packageType,
        brief: input.brief,
        selectionConfirmed: false,
        tasks: [],
        notes: [],
      };
      const next = [campaign, ...campaigns];
      // 상세 페이지로 즉시 이동해도 새 캠페인이 사라지지 않게 먼저 저장한다.
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // 저장 공간을 사용할 수 없어도 현재 탭에서는 계속 편집할 수 있다.
      }
      setCampaigns(next);
      return campaign;
    },
    [campaigns]
  );

  const update = React.useCallback((id: string, fn: (c: Campaign) => Campaign) => {
    setCampaigns((prev) => prev.map((c) => (c.id === id ? fn(c) : c)));
  }, []);

  const updateCreator = React.useCallback(
    (id: string, influencerId: string, patch: Partial<CampaignCreator>) => {
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                creators: c.creators.map((x) =>
                  x.influencerId === influencerId ? { ...x, ...patch } : x
                ),
              }
            : c
        )
      );
    },
    []
  );

  const remove = React.useCallback((id: string) => {
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return { campaigns, hydrated, create, update, updateCreator, remove };
}
