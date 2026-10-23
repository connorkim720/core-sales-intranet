"use client";

import * as React from "react";
import Link from "next/link";
import { LayoutGridIcon, ListIcon, PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Campaign, CampaignTask, CampaignTaskPhase, CampaignTaskStatus } from "@/lib/campaign-store";

const COLUMNS: { status: CampaignTaskStatus; label: string }[] = [
  { status: "todo", label: "할 일" },
  { status: "doing", label: "진행 중" },
  { status: "done", label: "완료" },
];
const PHASES: { value: CampaignTaskPhase; label: string }[] = [
  { value: "brief", label: "브리프" },
  { value: "selection", label: "크리에이터 섭외" },
  { value: "production", label: "제작" },
  { value: "review", label: "검수" },
  { value: "upload", label: "업로드" },
  { value: "metrics", label: "성과 확인" },
  { value: "settlement", label: "정산" },
];

type Row = { campaign: Campaign; task: CampaignTask };

export function TaskBoard({
  campaigns,
  update,
  campaignId,
}: {
  campaigns: Campaign[];
  update: (id: string, fn: (campaign: Campaign) => Campaign) => void;
  campaignId?: string;
}) {
  const available = campaignId ? campaigns.filter((campaign) => campaign.id === campaignId) : campaigns;
  const [view, setView] = React.useState<"board" | "list">("board");
  const [query, setQuery] = React.useState("");
  const [campaignFilter, setCampaignFilter] = React.useState("all");
  const [showForm, setShowForm] = React.useState(false);
  const [targetId, setTargetId] = React.useState(campaignId ?? "");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [assignee, setAssignee] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [phase, setPhase] = React.useState<CampaignTaskPhase>("brief");

  const rows = available.flatMap((campaign) => (campaign.tasks ?? []).map((task) => ({ campaign, task })));
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const stats = {
    overdue: rows.filter(({ task }) => task.status !== "done" && task.dueDate && task.dueDate < today).length,
    today: rows.filter(({ task }) => task.status !== "done" && task.dueDate === today).length,
    upcoming: rows.filter(({ task }) => task.status !== "done" && task.dueDate > today).length,
    done: rows.filter(({ task }) => task.status === "done").length,
  };
  const filtered = rows
    .filter(({ campaign }) => campaignFilter === "all" || campaign.id === campaignFilter)
    .filter(({ campaign, task }) =>
      `${task.title} ${task.description} ${task.assignee} ${campaign.name}`.toLowerCase().includes(query.toLowerCase())
    )
    .sort((a, b) => (a.task.dueDate || "9999").localeCompare(b.task.dueDate || "9999"));

  function patch(campaignIdToUpdate: string, taskId: string, change: Partial<CampaignTask>) {
    update(campaignIdToUpdate, (campaign) => ({
      ...campaign,
      tasks: (campaign.tasks ?? []).map((task) => (task.id === taskId ? { ...task, ...change } : task)),
    }));
  }

  function createTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = campaignId ?? (targetId || available[0]?.id);
    if (!id || !title.trim()) return;
    const task: CampaignTask = {
      id: `task-${crypto.randomUUID()}`,
      title: title.trim(),
      description: description.trim(),
      assignee: assignee.trim(),
      dueDate,
      status: "todo",
      phase,
      createdAt: new Date().toISOString(),
    };
    update(id, (campaign) => ({ ...campaign, tasks: [...(campaign.tasks ?? []), task] }));
    setTitle("");
    setDescription("");
    setAssignee("");
    setDueDate("");
    setPhase("brief");
    setShowForm(false);
  }

  function remove(campaign: Campaign, task: CampaignTask) {
    if (!window.confirm(`"${task.title}" 작업을 삭제할까요?`)) return;
    update(campaign.id, (current) => ({
      ...current,
      tasks: (current.tasks ?? []).filter((item) => item.id !== task.id),
    }));
  }

  function renderTask(row: Row, compact = false) {
    const { campaign, task } = row;
    const overdue = task.status !== "done" && task.dueDate && task.dueDate < today;
    return (
      <div className={`rounded-xl border bg-card p-3 ${compact ? "grid gap-3 md:grid-cols-[minmax(0,1fr)_130px_115px_100px_32px] md:items-center" : "space-y-3"}`}>
        <div className="min-w-0">
          <p className="text-sm font-medium break-words">{task.title}</p>
          {task.phase && <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">{PHASES.find((item) => item.value === task.phase)?.label}</span>}
          {task.description && <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{task.description}</p>}
          {!campaignId && <Link className="mt-1 block truncate text-xs text-primary hover:underline" href={`/campaigns/${campaign.id}`}>{campaign.name}</Link>}
        </div>
        <Input aria-label="담당자" placeholder="담당자" value={task.assignee} onChange={(event) => patch(campaign.id, task.id, { assignee: event.target.value })} className="h-8 text-xs" />
        <Input aria-label="마감일" type="date" value={task.dueDate} onChange={(event) => patch(campaign.id, task.id, { dueDate: event.target.value })} className={`h-8 text-xs ${overdue ? "border-destructive text-destructive" : ""}`} />
        <select aria-label="작업 상태" value={task.status} onChange={(event) => patch(campaign.id, task.id, { status: event.target.value as CampaignTaskStatus })} className="h-8 rounded-md border bg-background px-2 text-xs">
          {COLUMNS.map((column) => <option key={column.status} value={column.status}>{column.label}</option>)}
        </select>
        <Button variant="ghost" size="icon-sm" aria-label="작업 삭제" onClick={() => remove(campaign, task)}><Trash2Icon className="size-3.5" /></Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">업무 보드</h2>
          <p className="text-xs text-muted-foreground">캠페인별 작업을 등록하고 마감일과 진행 상태를 관리합니다.</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((value) => !value)} disabled={available.length === 0}><PlusIcon className="size-4" /> 새 작업</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {([
          ["기한 지남", stats.overdue], ["오늘 마감", stats.today], ["예정", stats.upcoming], ["완료", stats.done],
        ] as const).map(([label, count]) => (
          <Card key={label} className="py-3 shadow-xs"><CardContent className="px-4"><p className="text-xs text-muted-foreground">{label}</p><p className={`mt-1 text-2xl font-semibold tabular-nums ${label === "기한 지남" && count ? "text-destructive" : ""}`}>{count}</p></CardContent></Card>
        ))}
      </div>

      {showForm && (
        <form onSubmit={createTask} className="space-y-3 rounded-xl border bg-card p-4">
          <div className="grid gap-3 md:grid-cols-2">
            {!campaignId && <select aria-label="캠페인 선택" value={targetId || available[0]?.id || ""} onChange={(event) => setTargetId(event.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm">{available.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select>}
            <Input aria-label="작업 제목" autoFocus required maxLength={120} placeholder="작업 제목" value={title} onChange={(event) => setTitle(event.target.value)} />
            <Input aria-label="담당자" placeholder="담당자" value={assignee} onChange={(event) => setAssignee(event.target.value)} />
            <Input aria-label="마감일" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            <select aria-label="업무 단계" value={phase} onChange={(event) => setPhase(event.target.value as CampaignTaskPhase)} className="h-9 rounded-md border bg-background px-3 text-sm">{PHASES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
          </div>
          <Textarea aria-label="작업 설명" placeholder="작업 내용이나 참고할 링크" rows={2} value={description} onChange={(event) => setDescription(event.target.value)} />
          <div className="flex gap-2"><Button type="submit" size="sm">작업 추가</Button><Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>취소</Button></div>
        </form>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Input aria-label="작업 검색" placeholder="작업·담당자·캠페인 검색" value={query} onChange={(event) => setQuery(event.target.value)} className="max-w-xs" />
        {!campaignId && <select aria-label="캠페인 필터" value={campaignFilter} onChange={(event) => setCampaignFilter(event.target.value)} className="h-9 max-w-56 rounded-md border bg-background px-3 text-sm"><option value="all">모든 캠페인</option>{available.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select>}
        <div className="ml-auto flex gap-1 rounded-lg border p-1"><Button size="sm" variant={view === "board" ? "secondary" : "ghost"} onClick={() => setView("board")}><LayoutGridIcon className="size-4" /> 보드</Button><Button size="sm" variant={view === "list" ? "secondary" : "ghost"} onClick={() => setView("list")}><ListIcon className="size-4" /> 목록</Button></div>
      </div>

      {filtered.length === 0 ? <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">표시할 작업이 없습니다. 새 작업을 등록해 보세요.</div> : view === "list" ? (
        <div className="space-y-2">{filtered.map((row) => <React.Fragment key={row.task.id}>{renderTask(row, true)}</React.Fragment>)}</div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-3">{COLUMNS.map((column) => <section key={column.status} className="min-h-44 rounded-xl bg-muted/50 p-3"><h3 className="mb-3 flex items-center justify-between text-sm font-semibold">{column.label}<span className="rounded-full bg-background px-2 py-0.5 text-xs tabular-nums">{filtered.filter((row) => row.task.status === column.status).length}</span></h3><div className="space-y-2">{filtered.filter((row) => row.task.status === column.status).map((row) => <React.Fragment key={row.task.id}>{renderTask(row)}</React.Fragment>)}</div></section>)}</div>
      )}
    </div>
  );
}
