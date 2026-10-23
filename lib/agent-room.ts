import { buildOutreach, buildWeeklyDraft, extractKeywords, matchCreators, buildCreativeInsight } from "@/lib/agents";
import { buildFacts, type FactsContext } from "@/lib/agent-facts";
import type { AgentDef, Builtin } from "@/lib/agent-roster-core";
import type { AgentId } from "@/lib/agent-room-types";
import { DEMO_TODAY } from "@/lib/format";

export type { AgentId };

// 에이전트 회의실 — 한 방에서 사용자가 에이전트를 @이름으로 호출하고,
// `@A > @B`로 앞 에이전트의 결과를 뒤 에이전트가 이어받는다. `@팀이름`은 그 팀 전원을 부른다.
// 시연 모드는 AI를 쓰지 않고 규칙 함수로 답한다. AI 모드는 같은 규칙 결과를 "참고 데이터"로 넘겨
// 모델이 에이전트의 페르소나로 답을 쓰게 한다(runRoomTurn의 generate 훅).

// 폭주 방어 상한 — 연쇄는 최대 2단(에이전트 3명), 한 번에 부를 수 있는 에이전트는 4명.
export const MAX_CHAIN = 3;
export const MAX_TARGETS = 4;
export const MAX_CC = 4;
export const MAX_TEXT = 1000;
export const MAX_MESSAGES = 200;
export const MAX_REACTIONS = 2;

export type RoomMessage = {
  id: string;
  who: "user" | "system" | AgentId;
  text: string;
  ts: number;
  after?: AgentId; // 이 에이전트의 직전 답을 이어받아 답했다
  reaction?: boolean; // 호출되지 않았지만 앞선 발언을 보고 덧붙인 반응(AI 모드)
  ai?: boolean; // AI 모델이 쓴 답 (아니면 규칙 기반)
  cc?: AgentId[];
};

// 회의 중 에이전트들이 같이 보는 메모. 턴이 끝나도 다음 턴으로 이어진다.
export type Shared = {
  lastBrief: string;
  lastPicks: string[]; // 크리에이터 매칭이 마지막으로 추천한 크리에이터 id(순위순)
  cc: Record<string, string>; // 참조로 받았지만 아직 말하지 않은 안건 (에이전트 id → 안건)
};

export const EMPTY_SHARED: Shared = { lastBrief: "", lastPicks: [], cc: {} };

export type RoomContext = FactsContext & { roster: AgentDef[] };

// 규칙 기능이 연결된 기본 에이전트가 예전부터 받던 짧은 호출 이름(@매칭 등)
const LEGACY_ALIAS: Record<Builtin, string[]> = {
  matcher: ["매칭", "matcher"],
  outreach: ["컨택", "outreach"],
  weekly: ["보고", "weekly", "report"],
  creative: ["소재", "creative"],
};

type Directives = {
  plan: { agent: AgentId; after?: AgentId }[];
  cc: AgentId[];
  creators: string[]; // @핸들로 지정된 크리에이터 handle
  unknown: string[];
  body: string; // 멘션·화살표를 걷어낸 본문
  truncated: boolean;
};

const ARROW = /^(?:>|→|->|=>)$/;
const trimTail = (s: string) => s.replace(/[.,!?)\]]+$/, "");

type Resolved = { kind: "agents"; ids: AgentId[] } | { kind: "creator"; handle: string } | { kind: "unknown"; name: string };

// @토큰을 에이전트(이름·옛 호출 이름), 팀, 전체, 크리에이터 핸들, 알 수 없음 중 하나로 가른다.
// 알 수 없는 멘션을 조용히 넘기면 사용자는 지시가 먹은 줄 알기 때문에 따로 돌려준다.
function resolve(raw: string, roster: AgentDef[], handles: Set<string>): Resolved {
  for (const cand of [raw, trimTail(raw)]) {
    const t = cand.toLowerCase();
    if (!t) continue;
    if (t === "전체" || t === "all") return { kind: "agents", ids: roster.map((a) => a.id) };
    const byName = roster.find((a) => a.name.toLowerCase() === t);
    if (byName) return { kind: "agents", ids: [byName.id] };
    const byAlias = roster.find((a) => a.builtin && LEGACY_ALIAS[a.builtin].includes(t));
    if (byAlias) return { kind: "agents", ids: [byAlias.id] };
    const team = roster.filter((a) => a.team && a.team.toLowerCase() === t);
    if (team.length) return { kind: "agents", ids: team.map((a) => a.id) };
    if (handles.has(t)) return { kind: "creator", handle: t };
  }
  return { kind: "unknown", name: trimTail(raw) };
}

export function parseDirectives(input: string, roster: AgentDef[], handles: Set<string>): Directives {
  const text = input.slice(0, MAX_TEXT);
  const unknown: string[] = [];
  const creators: string[] = [];
  const cc: AgentId[] = [];

  // cc @이름 — 방에서 말하지 않고 참조만 받는다.
  let rest = text.replace(/(?:^|\s)cc\s+@(\S+)/gi, (_m, tok: string) => {
    const r = resolve(tok, roster, handles);
    if (r.kind === "agents") cc.push(...r.ids);
    else if (r.kind === "unknown") unknown.push(r.name);
    return " ";
  });

  const tokens = rest.split(/(\s+)/);
  const plan: Directives["plan"] = [];
  const bodyParts: string[] = [];
  let prevAgent: AgentId | null = null; // 직전 토큰이 연쇄 화살표로 이어진 에이전트
  let arrowPending = false;
  let chainLen = 0;
  let truncated = false;

  const pushAgent = (id: AgentId, chained: boolean) => {
    if (plan.some((p) => p.agent === id)) return; // 같은 에이전트는 한 번만
    if (plan.length >= MAX_TARGETS || (chained && chainLen >= MAX_CHAIN)) {
      truncated = true;
      return;
    }
    plan.push(chained && prevAgent ? { agent: id, after: prevAgent } : { agent: id });
    chainLen = chained ? chainLen + 1 : 1;
    prevAgent = id;
  };

  for (const tok of tokens) {
    if (!tok.trim()) {
      bodyParts.push(tok);
      continue;
    }
    if (ARROW.test(tok)) {
      arrowPending = prevAgent !== null;
      continue;
    }
    // 화살표가 토큰에 붙은 경우: "@A>@B"
    const glued = tok.includes(">") || tok.includes("→") ? tok.split(/>|→|->/).filter(Boolean) : [tok];
    const gluedChain = glued.length > 1;
    glued.forEach((piece, idx) => {
      if (!piece.startsWith("@")) {
        bodyParts.push(piece);
        arrowPending = false;
        prevAgent = null;
        return;
      }
      const r = resolve(piece.slice(1), roster, handles);
      const chained = arrowPending || (gluedChain && idx > 0);
      if (r.kind === "agents") {
        // 팀·전체 호출은 연쇄가 아니라 나란히 부르는 것으로 본다.
        if (r.ids.length > 1) r.ids.forEach((id) => pushAgent(id, false));
        else pushAgent(r.ids[0], chained);
      } else if (r.kind === "creator") {
        creators.push(r.handle);
        prevAgent = null;
      } else {
        unknown.push(r.name);
        prevAgent = null;
      }
      arrowPending = false;
    });
  }

  rest = bodyParts.join("").replace(/\s+/g, " ").trim();
  return { plan, cc, creators, unknown, body: rest, truncated };
}

// 본문을 "/"·줄바꿈으로 나눠 `브랜드:` `제품:` `조건:` `보내는사람:` 라벨 칸을 꺼낸다. 나머지는 브리프.
function splitFields(body: string) {
  const fields: Record<string, string> = {};
  const free: string[] = [];
  for (const seg of body.split(/\s*[/\n]\s*/)) {
    const m = seg.match(/^(브랜드|제품|조건|보내는\s*사람)\s*[:：]\s*(.+)$/);
    if (m) fields[m[1].replace(/\s/g, "")] = m[2].trim();
    else if (seg.trim()) free.push(seg.trim());
  }
  return { fields, brief: free.join(" ") };
}

const clip = (s: string, n = 140) => (s.length > n ? `${s.slice(0, n)}…` : s);
const fmtFollowers = (n: number) => (n >= 10_000 ? `${(n / 1_000).toFixed(n >= 100_000 ? 0 : 1)}K` : String(n));

// 에이전트 한 명의 응답을 규칙으로 만든다.
//  text  — 시연 모드에서 그대로 보여 줄 답
//  facts — AI 모드에서 모델에게 넘길 참고 데이터(규칙 결과 + 에이전트에 설정된 데이터)
function respond(
  agent: AgentDef,
  d: Directives,
  shared: Shared,
  ctx: RoomContext,
  after: AgentId | undefined
): { text: string; facts: string; shared: Shared } {
  const { fields, brief } = splitFields(d.body);
  const next: Shared = { ...shared, cc: { ...shared.cc } };
  const parts: string[] = [];
  const extra = agent.data.length ? buildFacts(agent.data, ctx) : "";
  const done = (text: string, facts = text) => ({
    text: parts.concat(text).join("\n\n"),
    facts: extra ? `${facts}\n\n${extra}` : facts,
    shared: next,
  });

  const ccNote = shared.cc[agent.id];
  if (ccNote) {
    parts.push(`(참조로 받은 안건: "${clip(ccNote, 80)}")`);
    delete next.cc[agent.id];
  }

  if (agent.builtin === "matcher") {
    if (!brief) return done("브리프를 알려주세요. 예: `@" + agent.name + " 클린뷰티 스킨케어 솔직한 리뷰`");
    const matches = matchCreators(brief, ctx.influencers, 5);
    next.lastBrief = brief;
    next.lastPicks = matches.map((m) => m.creator.id);
    const kw = extractKeywords(brief);
    if (matches.length === 0) {
      return done(`키워드(${kw.join(", ") || "-"})와 일치하는 크리에이터가 없습니다. 카테고리 단어(뷰티, 리뷰 등)를 넣어 보세요.`);
    }
    const sender = ctx.roster.find((a) => a.builtin === "outreach");
    return done(
      [
        `키워드: ${kw.join(", ") || "-"}`,
        `추천 ${matches.length}명`,
        ...matches.map(
          (m, i) =>
            `${i + 1}. @${m.creator.handle} · ${m.creator.platform === "instagram" ? "Instagram" : "TikTok"} · ${fmtFollowers(m.creator.followers)} · 참여율 ${m.creator.engagementRate}%\n   근거: ${m.reasons.join(", ") || "참여율 기준"}`
        ),
        ...(sender
          ? ["", `→ 이어서 \`@${sender.name}\`을 부르면 1순위에게 보낼 메시지를 씁니다. (\`@${agent.name} > @${sender.name}\`으로 한 번에도 가능)`]
          : []),
      ].join("\n")
    );
  }

  if (agent.builtin === "outreach") {
    const byHandle = d.creators[0] ? ctx.influencers.find((c) => c.handle.toLowerCase() === d.creators[0]) : undefined;
    const byPick = shared.lastPicks[0] ? ctx.influencers.find((c) => c.id === shared.lastPicks[0]) : undefined;
    const creator = byHandle ?? byPick;
    const matcher = ctx.roster.find((a) => a.builtin === "matcher");
    if (!creator) {
      return done(
        `메시지를 받을 크리에이터가 없습니다. ${matcher ? `\`@${matcher.name}\`으로 먼저 추천받거나 ` : ""}\`@${agent.name} @핸들\`처럼 지정해 주세요.`
      );
    }
    const source = byHandle
      ? "지정한 크리에이터"
      : after && ctx.roster.find((a) => a.id === after)?.builtin === "matcher"
        ? "방금 추천된 1순위"
        : "직전에 추천된 1순위";
    const draft = buildOutreach({
      creator,
      brand: fields["브랜드"] ?? "",
      product: fields["제품"] ?? "",
      offer: fields["조건"] ?? "",
      sender: fields["보내는사람"] ?? "김세일",
    });
    const hint = !fields["브랜드"] || !fields["제품"] ? "\n\n※ `브랜드:`, `제품:`, `조건:`을 `/`로 구분해 같이 보내면 메시지에 반영됩니다." : "";
    return done(
      `${source}: @${creator.handle}\n\n${draft}${hint}`,
      `받는 크리에이터: @${creator.handle} (${creator.platform}, 팔로워 ${creator.followers}, 참여율 ${creator.engagementRate}%, ${creator.category.join("/")})\n브랜드: ${fields["브랜드"] ?? "(미정)"}\n제품: ${fields["제품"] ?? "(미정)"}\n조건: ${fields["조건"] ?? "(미정)"}\n\n규칙 기반 초안:\n${draft}`
    );
  }

  if (agent.builtin === "weekly") {
    const draft = buildWeeklyDraft(ctx.customers, DEMO_TODAY);
    return done(
      [
        `[주간 보고 초안] 기준일 ${DEMO_TODAY.format("YYYY.MM.DD")} (최근 7일)`,
        "",
        "■ 이번 주 한 일",
        draft.done,
        "",
        "■ 이슈 · 블로커",
        draft.issues,
        "",
        "■ 다음 주 계획",
        draft.plan,
        "",
        "■ 요청 · 공유",
        draft.requests,
      ].join("\n")
    );
  }

  if (agent.builtin === "creative") return done(buildCreativeInsight());

  // 규칙 기능이 없는 에이전트: 시연 모드에서는 읽도록 설정된 데이터를 그대로 보여 준다.
  if (!agent.data.length) {
    return {
      text: parts.concat("이 에이전트는 AI 모드에서 답합니다. 시연 모드에는 규칙 기능이 연결돼 있지 않습니다.").join("\n\n"),
      facts: "",
      shared: next,
    };
  }
  return {
    text: parts
      .concat(`시연 모드에서는 ${agent.name}이(가) 읽는 데이터만 보여 드립니다. AI 모드에서는 이 데이터를 바탕으로 ${agent.role} 답을 씁니다.\n\n${extra}`)
      .join("\n\n"),
    facts: extra,
    shared: next,
  };
}

export type GenerateArgs = {
  agent: AgentId;
  kind: "reply" | "reaction";
  userText: string;
  facts: string; // 앱이 계산한 참고 데이터
  transcript: { who: string; text: string }[];
};

// 실패하면 error에 분류 키가 들어온다. fatal이면 이번 턴의 남은 AI 호출을 멈춘다.
export type GenerateResult = { text?: string; refused?: boolean; category?: string | null; error?: string; fatal?: boolean };

export type TurnHooks = {
  onMessage: (m: RoomMessage) => void;
  onSpeaking: (agent: AgentId | null) => void;
  delayMs?: number;
  // 있으면 AI 모드: 규칙 결과를 참고 데이터로 넘기고 모델이 페르소나로 답을 쓴다.
  generate?: (args: GenerateArgs) => Promise<GenerateResult>;
  getTranscript?: () => { who: string; text: string }[];
  reactions?: boolean; // 호출되지 않은 에이전트에게 덧붙일 기회를 한 번 준다(AI 모드, 최대 MAX_REACTIONS명)
  errorText?: (key: string) => string;
};

let seq = 0;
const mid = () => `m${Date.now()}-${++seq}`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// 한 번의 사용자 발언을 처리한다. 사용자 메시지는 호출하는 쪽이 이미 방에 넣었다고 본다.
// 반환값은 갱신된 공유 메모.
export async function runRoomTurn(input: string, shared: Shared, ctx: RoomContext, hooks: TurnHooks): Promise<Shared> {
  const handles = new Set(ctx.influencers.map((c) => c.handle.toLowerCase()));
  const d = parseDirectives(input, ctx.roster, handles);
  const byId = new Map(ctx.roster.map((a) => [a.id, a]));
  const system = (text: string) => hooks.onMessage({ id: mid(), who: "system", text, ts: Date.now() });
  let state = shared;

  if (d.unknown.length) {
    const names = ctx.roster.map((a) => `@${a.name}`).join(", ");
    const teams = [...new Set(ctx.roster.map((a) => a.team).filter(Boolean))].map((t) => `@${t}`).join(", ");
    system(
      `알 수 없는 멘션: ${[...new Set(d.unknown)].map((u) => `@${u}`).join(", ")} — 에이전트는 ${names}, 팀은 ${teams || "(없음)"}, 전체는 @전체 입니다.`
    );
  }
  if (d.truncated) {
    system(`호출 상한을 넘은 에이전트는 제외했습니다. (연쇄 최대 ${MAX_CHAIN}명, 한 번에 최대 ${MAX_TARGETS}명)`);
  }
  if (d.cc.length) {
    const ccs = [...new Set(d.cc)].slice(0, MAX_CC);
    for (const a of ccs) state = { ...state, cc: { ...state.cc, [a]: d.body || input } };
    system(`참조로 전달: ${ccs.map((a) => `@${byId.get(a)?.name ?? a}`).join(", ")} (다음에 부를 때 안건을 읽습니다)`);
  }
  if (d.plan.length === 0) {
    if (!d.cc.length && !d.unknown.length) {
      const names = ctx.roster
        .slice(0, 4)
        .map((a) => `@${a.name}`)
        .join(" ");
      system(`호출할 에이전트가 없습니다. \`${names}\` 처럼 @이름으로 불러 주세요.`);
    }
    return state;
  }

  const delay = hooks.delayMs ?? 350;
  let aiOk = Boolean(hooks.generate);
  const noteFailure = (key: string) => {
    const msg = hooks.errorText?.(key) ?? "AI 호출에 실패했습니다.";
    system(`${msg} 이번 답은 규칙 기반 결과로 대신합니다.`);
  };

  for (const step of d.plan) {
    const agent = byId.get(step.agent);
    if (!agent) continue;
    hooks.onSpeaking(agent.id);
    if (!hooks.generate) await sleep(delay);
    const r = respond(agent, d, state, ctx, step.after);
    state = r.shared;
    let text = r.text;
    let ai = false;

    if (hooks.generate && aiOk) {
      const g = await hooks.generate({
        agent: agent.id,
        kind: "reply",
        userText: d.body,
        facts: r.facts,
        transcript: hooks.getTranscript?.() ?? [],
      });
      if (g.text) {
        text = g.text;
        ai = true;
      } else if (g.refused) {
        system(`안전 정책으로 AI가 답하지 못했습니다${g.category ? ` (${g.category})` : ""}. 규칙 기반 결과로 대신합니다.`);
      } else {
        noteFailure(g.error ?? "unknown");
        if (g.fatal) aiOk = false;
      }
    }
    hooks.onMessage({
      id: mid(),
      who: agent.id,
      text,
      ts: Date.now(),
      ...(step.after ? { after: step.after } : {}),
      ...(ai ? { ai: true } : {}),
    });
  }

  // 반응 라운드 — 부르지 않은 에이전트가 앞선 발언을 보고, 덧붙일 말이 있을 때만 말한다.
  if (hooks.generate && aiOk && hooks.reactions) {
    const called = new Set(d.plan.map((p) => p.agent));
    const others = ctx.roster.filter((a) => !called.has(a.id)).slice(0, MAX_REACTIONS);
    for (const agent of others) {
      hooks.onSpeaking(agent.id);
      const g = await hooks.generate({
        agent: agent.id,
        kind: "reaction",
        userText: d.body,
        facts: agent.data.length ? buildFacts(agent.data, ctx) : "",
        transcript: hooks.getTranscript?.() ?? [],
      });
      if (g.fatal) break;
      const t = (g.text ?? "").trim();
      if (!t || /^PASS\b/i.test(t)) continue;
      hooks.onMessage({ id: mid(), who: agent.id, text: t, ts: Date.now(), reaction: true, ai: true });
    }
  }
  hooks.onSpeaking(null);
  return state;
}
