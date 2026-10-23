import type { AgentDef } from "@/lib/agent-roster-core";

function hueOf(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

// 이름 첫 글자를 색 원 위에 그린다(Lean-AX의 에이전트 아바타처럼). 이미지 데이터는 없다.
export function AgentAvatar({ agent, size = 32 }: { agent?: Pick<AgentDef, "id" | "name">; size?: number }) {
  const hue = agent ? hueOf(agent.id) : 0;
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: agent ? `hsl(${hue} 62% 52%)` : "hsl(0 0% 65%)",
      }}
      aria-hidden
    >
      {agent?.name.slice(0, 1) ?? "?"}
    </span>
  );
}
