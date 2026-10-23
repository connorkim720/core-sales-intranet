import dayjs, { type Dayjs } from "dayjs";

import type { Customer } from "@/lib/types";
import type { Influencer } from "@/lib/influencer-data";
import { getAnalysisStats, getComparison } from "@/lib/ad-monitor/data";
import { formatKRW } from "@/lib/format";

// 에이전트 허브의 "에이전트"는 LLM 호출 없이 로컬 데이터를 규칙으로 가공한다.
// 입력 → 결과 계약(함수 시그니처)만 고정해 두면 나중에 같은 화면에서
// 실제 LLM 호출로 바꿔 끼울 수 있다.

// ───────── 1. 크리에이터 매칭 ─────────

const STOP_WORDS = new Set([
  "그리고", "또는", "위한", "대한", "에서", "으로", "하는", "있는", "입니다", "합니다",
  "브랜드", "제품", "크리에이터", "인플루언서", "찾고", "싶어요", "원해요", "추천",
]);

export type CreatorMatch = {
  creator: Influencer;
  score: number;
  reasons: string[];
};

export function extractKeywords(brief: string) {
  return [
    ...new Set(
      brief
        .toLowerCase()
        .replace(/[#@]/g, " ")
        .split(/[\s,./·|()[\]]+/)
        .map((t) => t.replace(/(을|를|이|가|은|는|의|에|도|로|과|와)$/u, ""))
        .filter((t) => t.length >= 2 && !STOP_WORDS.has(t))
    ),
  ];
}

export function matchCreators(brief: string, pool: Influencer[], limit = 5): CreatorMatch[] {
  const keywords = extractKeywords(brief);
  return pool
    .filter((c) => !c.optOut)
    .map((c) => {
      const reasons: string[] = [];
      let score = 0;
      for (const k of keywords) {
        if (c.category.some((cat) => cat.toLowerCase().includes(k))) {
          score += 3;
          reasons.push(`카테고리 "${k}"`);
        } else if (c.bio.toLowerCase().includes(k)) {
          score += 2;
          reasons.push(`소개글 "${k}"`);
        } else if (c.handle.toLowerCase().includes(k)) {
          score += 1;
          reasons.push(`핸들 "${k}"`);
        }
      }
      // 참여율이 높을수록 동점 구간에서 앞선다.
      score += c.engagementRate / 10;
      return { creator: c, score, reasons };
    })
    .filter((m) => keywords.length === 0 || m.reasons.length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ───────── 2. 컨택 메시지 ─────────

export type OutreachInput = {
  creator: Influencer;
  brand: string;
  product: string;
  offer: string;
  sender: string;
};

export function buildOutreach({ creator, brand, product, offer, sender }: OutreachInput) {
  const channel = creator.platform === "instagram" ? "인스타그램 DM" : "TikTok DM";
  const category = creator.category[0] ?? "콘텐츠";
  const lines = [
    `[${channel}]`,
    "",
    `안녕하세요, @${creator.handle}님!`,
    `${brand || "저희 브랜드"}의 ${sender || "담당자"}입니다.`,
    "",
    `${category} 콘텐츠를 꾸준히 올리시는 모습을 보고 연락드렸어요.`,
    `${product ? `이번에 ${product}을(를)` : "이번 제품을"} 소개해 주실 크리에이터를 찾고 있는데, 작업 스타일이 잘 맞을 것 같아서요.`,
  ];
  if (offer.trim()) {
    lines.push("", "제안 드리는 조건은 아래와 같습니다.", ...offer.trim().split("\n").map((l) => (l.startsWith("-") ? l : `- ${l}`)));
  }
  lines.push(
    "",
    "관심 있으시면 편하게 답장 주세요. 일정과 단가를 맞춰 보겠습니다.",
    "감사합니다."
  );
  return lines.join("\n");
}

// ───────── 3. 주간 보고 초안 ─────────

export type WeeklyDraft = { done: string; issues: string; plan: string; requests: string };

export function buildWeeklyDraft(customers: Customer[], today: Dayjs): WeeklyDraft {
  const from = today.subtract(7, "day");
  const to = today.add(7, "day");
  const inLast7 = (iso: string) => dayjs(iso).isAfter(from) && !dayjs(iso).isAfter(today);

  const newLeads = customers.filter((c) => inLast7(c.createdAt));
  const logs = customers.flatMap((c) =>
    c.activities
      .filter((a) => a.type !== "system" && inLast7(a.at))
      .map((a) => ({ company: c.company, a }))
  );
  const moves = customers.flatMap((c) =>
    c.activities
      .filter(
        (a) =>
          (a.summary.startsWith("단계 이동:") || a.summary.includes("단계 변경(")) && inLast7(a.at)
      )
      .map((a) => `${c.company} · ${a.summary.replace(/^정보 수정 · /, "")}`)
  );

  const done = [
    ...newLeads.map((c) => `- 신규 리드 등록: ${c.company}`),
    ...moves.map((m) => `- ${m}`),
    ...logs.slice(0, 8).map(({ company, a }) => `- ${company}: ${a.summary}`),
  ];

  const overdue = customers.filter((c) => c.nextStepDue && dayjs(c.nextStepDue).isBefore(today, "day"));
  const issues = overdue.map(
    (c) => `- ${c.company}: "${c.nextStep}" 기한 ${dayjs(c.nextStepDue).format("MM.DD")} 경과`
  );

  const upcoming = customers
    .filter(
      (c) =>
        c.nextStepDue &&
        !dayjs(c.nextStepDue).isBefore(today, "day") &&
        !dayjs(c.nextStepDue).isAfter(to, "day")
    )
    .sort((a, b) => (a.nextStepDue! < b.nextStepDue! ? -1 : 1));
  const plan = upcoming.map(
    (c) => `- ${dayjs(c.nextStepDue).format("MM.DD")} ${c.company}: ${c.nextStep}`
  );

  const proposals = customers.filter((c) => c.stage === "proposal");
  const requests = proposals.map(
    (c) => `- ${c.company} 제안 단계(예상 MRR ${formatKRW(c.dealValueMonthly)}): 조건 확정 필요`
  );

  return {
    done: done.join("\n") || "- (기록된 활동 없음)",
    issues: issues.join("\n") || "- 기한이 지난 액션 없음",
    plan: plan.join("\n") || "- 예정된 액션 없음",
    requests: requests.join("\n") || "- 없음",
  };
}

// ───────── 4. 소재 인사이트 ─────────

export function buildCreativeInsight() {
  const s = getAnalysisStats();
  const rows = getComparison();
  const mostActive = [...rows].sort((a, b) => b.newLast30Days - a.newLast30Days)[0];
  const top = (arr: { label: string; count: number }[], n = 3) =>
    arr.slice(0, n).map((x) => `${x.label}(${x.count})`).join(", ") || "-";

  return [
    "[소재 방향 제안]",
    "",
    `■ 수집 현황: 총 ${s.totalCount}건, 오가닉 영상 평균 ${s.avgVideoDurationSec}초`,
    `■ 많이 쓰이는 훅: ${top(s.hookTypeCounts)}`,
    `■ 많이 쓰이는 소구: ${top(s.appealPointCounts)}`,
    `■ 주력 포맷: ${s.topFormat.format} (전체의 ${s.topFormat.ratio}%)`,
    ...(mostActive
      ? [`■ 최근 30일 신규 소재가 가장 많은 경쟁사: ${mostActive.brandName} (${mostActive.newLast30Days}건)`]
      : []),
    "",
    "■ 제안",
    `- 1순위 테스트: "${s.hookTypeCounts[0]?.label ?? "-"}" 훅 + "${s.topAppealPoint}" 소구, ${s.topFormat.format} 포맷`,
    `- 차별화 테스트: 가장 적게 쓰인 훅(${s.hookTypeCounts.at(-1)?.label ?? "-"})으로 같은 소구를 시도`,
    "- 영상 길이는 평균 부근으로 맞추고, 앞 3초에 훅을 배치",
    "",
    "※ 시드 데이터(더미) 기준 분석입니다. 실제 수집 데이터 연동 후 판단하세요.",
  ].join("\n");
}
