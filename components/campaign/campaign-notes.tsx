"use client";

import * as React from "react";
import { FileTextIcon, PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Campaign, CampaignNote } from "@/lib/campaign-store";

function Preview({ body }: { body: string }) {
  if (!body.trim()) return <p className="text-sm text-muted-foreground">내용이 없습니다.</p>;
  return <div className="space-y-2 text-sm leading-7">{body.split("\n").map((line, index) => {
    if (line.startsWith("# ")) return <h2 key={index} className="pt-3 text-xl font-semibold">{line.slice(2)}</h2>;
    if (line.startsWith("## ")) return <h3 key={index} className="pt-2 text-lg font-semibold">{line.slice(3)}</h3>;
    if (line.startsWith("- [ ] ")) return <p key={index}>☐ {line.slice(6)}</p>;
    if (line.startsWith("- [x] ")) return <p key={index}>☑ {line.slice(6)}</p>;
    if (line.startsWith("- ")) return <p key={index}>• {line.slice(2)}</p>;
    return <p key={index} className="min-h-6 whitespace-pre-wrap">{line || " "}</p>;
  })}</div>;
}

export function CampaignNotes({ campaign, onUpdate }: { campaign: Campaign; onUpdate: (fn: (campaign: Campaign) => Campaign) => void }) {
  const notes = campaign.notes ?? [];
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState(false);
  const selected = notes.find((note) => note.id === selectedId) ?? notes[0];

  function createNote() {
    const now = new Date().toISOString();
    const note: CampaignNote = { id: `note-${crypto.randomUUID()}`, title: "제목 없음", body: "", createdAt: now, updatedAt: now };
    onUpdate((current) => ({ ...current, notes: [...(current.notes ?? []), note] }));
    setSelectedId(note.id);
    setPreview(false);
  }

  function patch(noteId: string, changes: Partial<CampaignNote>) {
    onUpdate((current) => ({
      ...current,
      notes: (current.notes ?? []).map((note) => note.id === noteId ? { ...note, ...changes, updatedAt: new Date().toISOString() } : note),
    }));
  }

  function removeNote(note: CampaignNote) {
    if (!window.confirm(`"${note.title}" 메모를 삭제할까요?`)) return;
    onUpdate((current) => ({ ...current, notes: (current.notes ?? []).filter((item) => item.id !== note.id) }));
    setSelectedId(null);
  }

  return (
    <div className="grid min-h-[540px] gap-4 rounded-xl border bg-card p-4 md:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="border-b pb-4 md:border-r md:border-b-0 md:pr-4">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">캠페인 메모</h2><Button variant="ghost" size="icon-sm" aria-label="새 메모" onClick={createNote}><PlusIcon className="size-4" /></Button></div>
        <div className="space-y-1">{notes.map((note) => <button key={note.id} type="button" onClick={() => { setSelectedId(note.id); setPreview(false); }} className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm ${selected?.id === note.id ? "bg-accent font-medium" : "hover:bg-muted"}`}><FileTextIcon className="size-4 shrink-0" /><span className="truncate">{note.title || "제목 없음"}</span></button>)}</div>
        {notes.length === 0 && <p className="px-2 py-4 text-xs text-muted-foreground">메모를 만들어 브리프, 회의 내용, 체크리스트를 기록하세요.</p>}
      </aside>

      <div className="min-w-0">
        {selected ? <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-muted-foreground">입력할 때마다 이 브라우저에 자동 저장됩니다.</p><div className="flex gap-1"><Button size="sm" variant={preview ? "outline" : "secondary"} onClick={() => setPreview(false)}>편집</Button><Button size="sm" variant={preview ? "secondary" : "outline"} onClick={() => setPreview(true)}>미리보기</Button><Button size="icon-sm" variant="ghost" aria-label="메모 삭제" onClick={() => removeNote(selected)}><Trash2Icon className="size-4" /></Button></div></div>
          <Input aria-label="메모 제목" value={selected.title} maxLength={120} onChange={(event) => patch(selected.id, { title: event.target.value })} className="h-auto border-0 px-0 text-2xl font-semibold shadow-none focus-visible:ring-0" placeholder="제목 없음" />
          {preview ? <div className="min-h-96 border-t pt-4"><Preview body={selected.body} /></div> : <><Textarea aria-label="메모 내용" value={selected.body} onChange={(event) => patch(selected.id, { body: event.target.value })} placeholder="내용을 적어보세요.\n# 제목\n## 소제목\n- [ ] 체크리스트\n- 목록" className="min-h-96 resize-y border-0 px-0 text-sm leading-7 shadow-none focus-visible:ring-0" /><p className="text-xs text-muted-foreground"># 제목 · ## 소제목 · - 목록 · - [ ] 체크리스트</p></>}
        </div> : <div className="flex min-h-96 flex-col items-center justify-center gap-3 text-center"><FileTextIcon className="size-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">첫 메모를 작성해 보세요.</p><Button onClick={createNote}><PlusIcon className="size-4" /> 메모 만들기</Button></div>}
      </div>
    </div>
  );
}
