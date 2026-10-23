"use client";

import * as React from "react";
import Link from "next/link";
import { CheckIcon, ChevronDownIcon, PlusIcon, RotateCcwIcon, Trash2Icon } from "lucide-react";

import { AgentAvatar } from "@/components/agents/agent-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DATA_SOURCE_LABEL,
  DEFAULT_ROSTER,
  EFFORT_LABEL,
  LIMITS,
  MAX_AGENTS,
  buildSystemPrompt,
  cleanName,
  defaultAgent,
  useRoster,
  type AgentDef,
  type DataSource,
  type Effort,
} from "@/lib/agent-roster";

const BUILTIN_NOTE: Record<NonNullable<AgentDef["builtin"]>, string> = {
  matcher: "크리에이터 매칭 규칙(시연 모드)이 연결돼 있고, 매칭 결과를 다음 에이전트에게 넘깁니다",
  outreach: "제안 메시지 규칙(시연 모드)이 연결돼 있고, 직전에 추천된 크리에이터에게 씁니다",
  weekly: "주간 보고 초안 규칙(시연 모드)이 연결돼 있습니다",
  creative: "광고 소재 분석 규칙(시연 모드)이 연결돼 있습니다",
};

export default function RosterPage() {
  const { roster, save, remove, resetAll, hydrated } = useRoster();
  const [selected, setSelected] = React.useState<string | null>(null);

  const teams = React.useMemo(() => {
    const map = new Map<string, AgentDef[]>();
    for (const a of roster) map.set(a.team || "소속 없음", [...(map.get(a.team || "소속 없음") ?? []), a]);
    return [...map.entries()];
  }, [roster]);

  const current = selected === "new" ? undefined : roster.find((a) => a.id === selected);
  const [newDraft, setNewDraft] = React.useState<AgentDef>(() => defaultAgent());

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="mt-1 text-sm text-muted-foreground">
          회의실에 참여하는 에이전트를 만들고 이름, 팀, 역할, 말투, 읽을 데이터를 정합니다.{" "}
          <Link href="/agents/room" className="text-primary hover:underline">
            회의실
          </Link>
          의 AI 모드에서 이 내용이 에이전트의 시스템 프롬프트가 됩니다.
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-9 py-2"
            onClick={() => {
              if (window.confirm("에이전트 목록을 기본 구성으로 되돌릴까요? 직접 만든 에이전트와 수정 내용이 사라집니다.")) {
                resetAll();
                setSelected(null);
              }
            }}
          >
            <RotateCcwIcon className="size-3.5" /> 기본 구성
          </Button>
          <Button
            className="h-9 py-2"
            disabled={roster.length >= MAX_AGENTS}
            onClick={() => {
              setNewDraft(defaultAgent());
              setSelected("new");
            }}
          >
            <PlusIcon className="size-3.5" /> 에이전트 추가
          </Button>
        </div>
      </div>

      {hydrated && (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="space-y-4">
            {teams.map(([team, members]) => (
              <div key={team} className="space-y-2">
                <p className="px-1 text-xs font-medium text-muted-foreground">
                  {team} <span className="font-normal">· {members.length}명</span>
                </p>
                {members.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setSelected(a.id)}
                    aria-pressed={selected === a.id}
                    className="block w-full rounded-[min(var(--radius-4xl),24px)] text-left focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
                  >
                    <Card className={`shadow-xs transition-shadow hover:shadow-sm ${selected === a.id ? "ring-2 ring-primary" : ""}`}>
                      <CardContent className="flex items-start gap-3 py-0">
                        <AgentAvatar agent={a} size={36} />
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="text-sm font-medium">
                            {a.name} <span className="font-normal text-muted-foreground">· {a.role}</span>
                          </p>
                          <p className="line-clamp-2 text-xs text-muted-foreground">{a.character || "한 줄 소개 없음"}</p>
                          <div className="flex flex-wrap gap-1">
                            {a.data.map((d) => (
                              <Badge key={d} variant="secondary" className="h-4 px-1.5 text-[10px] font-normal">
                                {DATA_SOURCE_LABEL[d]}
                              </Badge>
                            ))}
                            {a.builtin && (
                              <Badge variant="outline" className="h-4 px-1.5 text-[10px] font-normal">
                                규칙 기능
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </button>
                ))}
              </div>
            ))}
          </div>

          <div>
            {selected === null ? (
              <Card className="shadow-xs">
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  왼쪽에서 에이전트를 고르거나 &quot;에이전트 추가&quot;를 눌러 새로 만드세요.
                </CardContent>
              </Card>
            ) : (
              <AgentEditor
                key={selected}
                initial={current ?? newDraft}
                isNew={selected === "new"}
                roster={roster}
                onSave={(a) => {
                  const err = save(a);
                  if (!err) setSelected(a.id);
                  return err;
                }}
                onDelete={(id) => {
                  remove(id);
                  setSelected(null);
                }}
                onReset={DEFAULT_ROSTER.find((d) => d.id === (current?.id ?? ""))}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AgentEditor({
  initial,
  isNew,
  roster,
  onSave,
  onDelete,
  onReset,
}: {
  initial: AgentDef;
  isNew: boolean;
  roster: AgentDef[];
  onSave: (a: AgentDef) => string | null;
  onDelete: (id: string) => void;
  onReset?: AgentDef;
}) {
  const [draft, setDraft] = React.useState<AgentDef>(initial);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);
  const [showPrompt, setShowPrompt] = React.useState(false);

  const set = <K extends keyof AgentDef>(k: K, v: AgentDef[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setError(null);
  };
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const teamNames = [...new Set(roster.map((r) => r.team).filter(Boolean))];

  const count = (v: string, n: number) => (
    <span className={`text-[11px] tabular-nums ${v.length > n ? "text-destructive" : "text-muted-foreground"}`}>
      {v.length}/{n}
    </span>
  );

  const toggleData = (k: DataSource) =>
    set("data", draft.data.includes(k) ? draft.data.filter((x) => x !== k) : [...draft.data, k]);

  return (
    <Card className="shadow-xs">
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AgentAvatar agent={{ id: draft.id, name: draft.name || "?" }} size={40} />
            <div>
              <p className="text-sm font-medium">{isNew ? "새 에이전트" : draft.name}</p>
              <p className="text-xs text-muted-foreground">
                {draft.name ? `회의실에서 @${draft.name}으로 부릅니다` : "호출 이름을 정하세요"}
                {draft.team ? ` · @${draft.team}으로 팀 전체 호출` : ""}
              </p>
            </div>
          </div>
          {!isNew && onReset && (
            <Button variant="ghost" size="sm" onClick={() => setDraft(onReset)}>
              <RotateCcwIcon className="size-3.5" /> 기본값
            </Button>
          )}
        </div>

        {draft.builtin && <p className="rounded-2xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">{BUILTIN_NOTE[draft.builtin]}.</p>}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <Label htmlFor="ag-name">호출 이름 (@이름)</Label>
              {count(draft.name, LIMITS.name)}
            </div>
            <Input id="ag-name" value={draft.name} maxLength={LIMITS.name} onChange={(e) => set("name", cleanName(e.target.value))} placeholder="예: 다빈치" />
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <Label htmlFor="ag-team">팀</Label>
              {count(draft.team, LIMITS.team)}
            </div>
            <Input id="ag-team" list="ag-teams" value={draft.team} maxLength={LIMITS.team} onChange={(e) => set("team", e.target.value)} placeholder="예: 운영" />
            <datalist id="ag-teams">
              {teamNames.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between">
            <Label htmlFor="ag-char">캐릭터 한 줄 소개</Label>
            {count(draft.character, LIMITS.character)}
          </div>
          <Input id="ag-char" value={draft.character} maxLength={LIMITS.character} onChange={(e) => set("character", e.target.value)} placeholder="예: 레오나르도 다 빈치 — 기술과 예술을 넘나들던 만능 설계자" />
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between">
            <Label htmlFor="ag-role">역할</Label>
            {count(draft.role, LIMITS.role)}
          </div>
          <Input id="ag-role" value={draft.role} maxLength={LIMITS.role} onChange={(e) => set("role", e.target.value)} placeholder="예: 캠페인 기획" />
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between">
            <Label htmlFor="ag-tone">톤</Label>
            {count(draft.tone, LIMITS.tone)}
          </div>
          <Input id="ag-tone" value={draft.tone} maxLength={LIMITS.tone} onChange={(e) => set("tone", e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between">
            <Label htmlFor="ag-exp">전문성 (줄마다 하나)</Label>
            {count(draft.expertise, LIMITS.expertise)}
          </div>
          <Textarea id="ag-exp" rows={4} value={draft.expertise} maxLength={LIMITS.expertise} onChange={(e) => set("expertise", e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between">
            <Label htmlFor="ag-rules">일하는 방식 · 규칙 (줄마다 하나)</Label>
            {count(draft.rules, LIMITS.rules)}
          </div>
          <Textarea id="ag-rules" rows={4} value={draft.rules} maxLength={LIMITS.rules} onChange={(e) => set("rules", e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>읽을 데이터</Label>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {(Object.keys(DATA_SOURCE_LABEL) as DataSource[]).map((k) => (
              <label key={k} className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={draft.data.includes(k)} onChange={() => toggleData(k)} className="size-4 accent-primary" />
                {DATA_SOURCE_LABEL[k]}
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">체크한 데이터가 AI 모드에서 이 에이전트의 &quot;참고 데이터&quot;로 전달됩니다. 체크하지 않은 데이터는 읽지 못합니다.</p>
        </div>

        <div className="space-y-1.5">
          <Label>추론 강도</Label>
          <Select value={draft.effort} onValueChange={(v) => set("effort", v as Effort)}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(EFFORT_LABEL) as Effort[]).map((e) => (
                <SelectItem key={e} value={e}>
                  {EFFORT_LABEL[e]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">높을수록 오래 생각해서 응답이 느리고 비용이 늘어납니다.</p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <button
            type="button"
            onClick={() => setShowPrompt((v) => !v)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronDownIcon className={`size-3.5 transition-transform ${showPrompt ? "rotate-180" : ""}`} /> 시스템 프롬프트 미리보기
          </button>
          <div className="flex items-center gap-2">
            {!isNew && (
              <Button
                variant="ghost"
                size="sm"
                disabled={roster.length <= 1}
                onClick={() => {
                  if (window.confirm(`"${draft.name}" 에이전트를 삭제할까요?`)) onDelete(draft.id);
                }}
              >
                <Trash2Icon className="size-3.5" /> 삭제
              </Button>
            )}
            <Button
              size="sm"
              disabled={!dirty && !isNew}
              onClick={() => {
                const err = onSave(draft);
                setError(err);
                if (!err) {
                  setSaved(true);
                  setTimeout(() => setSaved(false), 1500);
                }
              }}
            >
              {saved ? <CheckIcon className="size-3.5" /> : null}
              {saved ? "저장됨" : isNew ? "추가" : "저장"}
            </Button>
          </div>
        </div>

        {showPrompt && (
          <pre className="max-h-72 overflow-auto rounded-2xl bg-muted/50 p-4 font-sans text-xs leading-relaxed whitespace-pre-wrap">
            {buildSystemPrompt(
              draft,
              roster.map((r) => ({ name: r.name, role: r.role, team: r.team }))
            )}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
