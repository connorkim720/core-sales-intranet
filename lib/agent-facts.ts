import dayjs from "dayjs";

import { buildCreativeInsight, buildWeeklyDraft } from "@/lib/agents";
import { progressPercent, stepStates, type Campaign } from "@/lib/campaign-store";
import { STAGE_LABEL } from "@/lib/mock-data";
import { DEMO_TODAY, formatKRW } from "@/lib/format";
import type { DataSource } from "@/lib/agent-roster-core";
import type { Influencer } from "@/lib/influencer-data";
import type { Customer } from "@/lib/types";

export type FactsContext = {
  influencers: Influencer[];
  customers: Customer[];
  campaigns: Campaign[];
};

const MAX_FACTS_CHARS = 6000;

function creatorsFacts({ influencers }: FactsContext) {
  const pool = influencers.filter((c) => !c.optOut);
  const top = [...pool].sort((a, b) => b.engagementRate - a.engagementRate).slice(0, 10);
  return [
    `[크리에이터] 등록 ${pool.length}명 (참여율 상위 ${top.length}명)`,
    ...top.map(
      (c) =>
        `- @${c.handle} · ${c.platform === "instagram" ? "Instagram" : "TikTok"} · 팔로워 ${c.followers.toLocaleString()} · 참여율 ${c.engagementRate}% · ${c.category.join("/") || "카테고리 없음"}`
    ),
  ].join("\n");
}

function dealsFacts({ customers }: FactsContext) {
  const counts = Object.entries(STAGE_LABEL).map(([k, label]) => `${label} ${customers.filter((c) => c.stage === k).length}건`);
  const open = customers
    .filter((c) => c.nextStepDue)
    .sort((a, b) => (a.nextStepDue! < b.nextStepDue! ? -1 : 1))
    .slice(0, 8);
  return [
    `[고객사·딜] 총 ${customers.length}곳 (${counts.join(", ")}) · 기준일 ${DEMO_TODAY.format("YYYY.MM.DD")}`,
    ...open.map(
      (c) =>
        `- ${c.company} · ${STAGE_LABEL[c.stage]} · 예상 MRR ${formatKRW(c.dealValueMonthly)} · 다음 액션 "${c.nextStep ?? "-"}" (${dayjs(c.nextStepDue).format("MM.DD")})`
    ),
  ].join("\n");
}

function campaignsFacts({ campaigns, influencers }: FactsContext) {
  if (!campaigns.length) return "[캠페인] 등록된 캠페인이 없습니다";
  const name = (id: string) => influencers.find((i) => i.id === id)?.handle ?? id;
  return [
    `[캠페인] ${campaigns.length}건`,
    ...campaigns.slice(0, 6).flatMap((c) => {
      const total = c.creators.reduce((s, x) => s + x.fee, 0);
      const paid = c.creators.filter((x) => x.paid).reduce((s, x) => s + x.fee, 0);
      const steps = stepStates(c)
        .map((s) => `${s.label} ${s.note}`)
        .join(" / ");
      const late = c.creators.map((x) => `@${name(x.influencerId)}: 대본 ${x.script}, 영상 ${x.video}, 업로드 ${x.upload}`).join("; ");
      return [
        `- ${c.name} (${c.brand}) · 진행률 ${progressPercent(c)}% · 크리에이터 ${c.creators.length}명`,
        `  단계: ${steps}`,
        `  기한: 대본 ${dayjs(c.deadlines.script).format("MM.DD")}, 영상 ${dayjs(c.deadlines.video).format("MM.DD")}, 업로드 ${dayjs(c.deadlines.uploadFrom).format("MM.DD")}~${dayjs(c.deadlines.uploadTo).format("MM.DD")}`,
        `  크리에이터별: ${late}`,
        `  정산: 지급 예정 ${total.toLocaleString()}원 / 지급 완료 ${paid.toLocaleString()}원 / 대기 ${(total - paid).toLocaleString()}원`,
      ];
    }),
  ].join("\n");
}

function weeklyFacts(ctx: FactsContext) {
  const d = buildWeeklyDraft(ctx.customers, DEMO_TODAY);
  return `[최근 7일 활동] 기준일 ${DEMO_TODAY.format("YYYY.MM.DD")}\n한 일:\n${d.done}\n이슈:\n${d.issues}\n다음 주 계획:\n${d.plan}`;
}

// 에이전트가 읽도록 설정된 데이터 묶음을 하나의 참고 데이터 문자열로 만든다. 서버로 보내는 크기를 제한한다.
export function buildFacts(sources: DataSource[], ctx: FactsContext): string {
  const parts = sources.map((s) =>
    s === "creators" ? creatorsFacts(ctx) : s === "deals" ? dealsFacts(ctx) : s === "campaigns" ? campaignsFacts(ctx) : s === "ads" ? buildCreativeInsight() : weeklyFacts(ctx)
  );
  const text = parts.join("\n\n");
  return text.length > MAX_FACTS_CHARS ? `${text.slice(0, MAX_FACTS_CHARS)}\n…(길어서 잘림)` : text;
}
