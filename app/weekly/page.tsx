"use client";

import * as React from "react";
import dayjs from "dayjs";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, CopyIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatGrid, type Stat } from "@/components/stat-card";
import { useCustomerStore } from "@/lib/customer-store";
import { formatKRW } from "@/lib/format";
import {
  EMPTY_ENTRY,
  useWeeklyStore,
  weekKey,
  weekPeriod,
  weekStartOf,
  type WeeklyEntry,
  type WeeklyStats,
} from "@/lib/weekly-store";

const FIELDS: { name: "done" | "issues" | "plan" | "requests"; label: string; placeholder: string }[] = [
  { name: "done", label: "이번 주 한 일", placeholder: "- 계약 체결, 미팅, 제안서 발송 등" },
  { name: "issues", label: "이슈 · 블로커", placeholder: "- 막힌 건, 리스크" },
  { name: "plan", label: "다음 주 계획", placeholder: "- 다음 주에 할 일" },
  { name: "requests", label: "요청 · 공유", placeholder: "- 결정이 필요한 사항, 지원 요청" },
];

const EMPTY_STATS: WeeklyStats = {
  newLeads: 0,
  won: 0,
  wonMrr: 0,
  stageMoves: 0,
  activityCount: 0,
};

function buildReport(key: string, stats: WeeklyStats, entry: WeeklyEntry) {
  const section = (title: string, body: string) =>
    `■ ${title}\n${body.trim() || "-"}`;
  return [
    `[주간 보고] ${weekPeriod(key)}`,
    "",
    "■ 이번 주 지표",
    `- 신규 리드 ${stats.newLeads}건 / 계약 체결 ${stats.won}건 (예상 MRR ${formatKRW(stats.wonMrr)})`,
    `- 단계 이동 ${stats.stageMoves}건 / 컨택 활동 ${stats.activityCount}건`,
    "",
    section("이번 주 한 일", entry.done),
    "",
    section("이슈 · 블로커", entry.issues),
    "",
    section("다음 주 계획", entry.plan),
    "",
    section("요청 · 공유", entry.requests),
  ].join("\n");
}

export default function WeeklyPage() {
  const { customers } = useCustomerStore();
  const { entries, save, hydrated } = useWeeklyStore();

  const [start, setStart] = React.useState(() => weekStartOf(dayjs()));
  const key = weekKey(start);
  const end = start.add(6, "day");
  const isThisWeek = key === weekKey(weekStartOf(dayjs()));

  const [draft, setDraft] = React.useState<WeeklyEntry>(EMPTY_ENTRY);
  const [savedFlash, setSavedFlash] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  // 주를 바꾸거나 저장분이 복원되면 그 주의 저장값으로 폼을 채운다.
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(entries[key] ?? EMPTY_ENTRY);
    // entries는 의도적으로 제외 — 저장할 때마다 입력 중인 폼을 덮어쓰지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, hydrated]);

  const inWeek = React.useCallback(
    (iso: string) => {
      const t = dayjs(iso);
      return !t.isBefore(start) && t.isBefore(end.add(1, "day"));
    },
    [start, end]
  );

  const auto = React.useMemo(() => {
    const newLeads = customers.filter((c) => inWeek(c.createdAt));
    const won = customers.filter((c) =>
      c.activities.some(
        (a) => a.type === "system" && a.summary.includes("→ 계약") && inWeek(a.at)
      )
    );
    const activityCount = customers.reduce(
      (n, c) => n + c.activities.filter((a) => a.type !== "system" && inWeek(a.at)).length,
      0
    );
    const stageMoves = customers.reduce(
      (n, c) =>
        n +
        c.activities.filter(
          (a) =>
            (a.summary.startsWith("단계 이동:") || a.summary.includes("단계 변경(")) &&
            inWeek(a.at)
        ).length,
      0
    );
    return {
      newLeads: newLeads.length,
      won: won.length,
      wonMrr: won.reduce((s, c) => s + c.dealValueMonthly, 0),
      activityCount,
      stageMoves,
    };
  }, [customers, inWeek]);

  const stats: Stat[] = [
    { label: "신규 리드", value: `${auto.newLeads}건` },
    {
      label: "계약 체결",
      value: `${auto.won}건`,
      footerTitle: `예상 MRR ${formatKRW(auto.wonMrr)}`,
    },
    { label: "단계 이동", value: `${auto.stageMoves}건` },
    { label: "컨택 활동", value: `${auto.activityCount}건`, footerTitle: "통화·메일·미팅·메모" },
  ];

  const period = `${start.format("YYYY.MM.DD")} ~ ${end.format("MM.DD")}`;

  const handleSave = () => {
    save(key, { ...draft, stats: auto });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildReport(key, auto, draft));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 권한이 없으면 무시
    }
  };

  const saved = entries[key];

  // 저장된 보고서 카드 — 최근 주가 위로.
  const reportKeys = Object.keys(entries).sort().reverse();
  const [openKey, setOpenKey] = React.useState<string | null>(null);
  const openEntry = openKey ? entries[openKey] : undefined;
  const [dialogCopied, setDialogCopied] = React.useState(false);

  const handleDialogCopy = async () => {
    if (!openKey || !openEntry) return;
    try {
      await navigator.clipboard.writeText(
        buildReport(openKey, openEntry.stats ?? EMPTY_STATS, openEntry)
      );
      setDialogCopied(true);
      setTimeout(() => setDialogCopied(false), 1500);
    } catch {
      // 클립보드 권한이 없으면 무시
    }
  };

  const editWeek = (k: string) => {
    setStart(dayjs(k));
    setOpenKey(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          주 단위 지표는 자동 집계, 나머지는 직접 입력해 보고합니다.
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="이전 주"
            onClick={() => setStart((s) => s.subtract(7, "day"))}
          >
            <ChevronLeftIcon />
          </Button>
          <div className="min-w-44 text-center text-sm font-medium tabular-nums">
            {period}
            {isThisWeek && (
              <span className="ml-1.5 text-xs text-muted-foreground">(이번 주)</span>
            )}
          </div>
          <Button
            variant="outline"
            size="icon"
            aria-label="다음 주"
            onClick={() => setStart((s) => s.add(7, "day"))}
          >
            <ChevronRightIcon />
          </Button>
          {!isThisWeek && (
            <Button variant="ghost" size="sm" onClick={() => setStart(weekStartOf(dayjs()))}>
              이번 주
            </Button>
          )}
        </div>
      </div>

      <StatGrid stats={stats} />

      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle className="text-sm font-medium">주간 보고 입력</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {FIELDS.map((f) => (
            <div key={f.name} className="space-y-1.5">
              <Label htmlFor={`weekly-${f.name}`}>{f.label}</Label>
              <Textarea
                id={`weekly-${f.name}`}
                rows={4}
                placeholder={f.placeholder}
                value={draft[f.name] ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, [f.name]: e.target.value }))}
              />
            </div>
          ))}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {saved?.updatedAt
                ? `마지막 저장 ${dayjs(saved.updatedAt).format("MM.DD HH:mm")}`
                : "아직 저장 전"}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCopy}>
                {copied ? <CheckIcon /> : <CopyIcon />}
                {copied ? "복사됨" : "보고서 복사"}
              </Button>
              <Button onClick={handleSave}>
                {savedFlash ? <CheckIcon /> : null}
                {savedFlash ? "저장됨" : "저장"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-sm font-medium">저장된 주간 보고 ({reportKeys.length})</h2>
        {reportKeys.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            저장하면 이곳에 주별 보고 카드가 생깁니다.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {reportKeys.map((k) => {
              const e = entries[k];
              const s = e.stats ?? EMPTY_STATS;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setOpenKey(k)}
                  className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
                >
                  <Card className="h-full gap-2 shadow-xs transition-shadow hover:shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold tabular-nums">
                        📄 {weekPeriod(k)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <p className="text-xs text-muted-foreground tabular-nums">
                        리드 {s.newLeads} · 계약 {s.won} · 단계이동 {s.stageMoves} · 컨택 {s.activityCount}
                      </p>
                      <p className="line-clamp-3 whitespace-pre-line">
                        {e.done.trim() || "(한 일 미입력)"}
                      </p>
                      {e.updatedAt && (
                        <p className="text-xs text-muted-foreground">
                          저장 {dayjs(e.updatedAt).format("MM.DD HH:mm")}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!openKey} onOpenChange={(o) => !o && setOpenKey(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          {openKey && openEntry && (
            <>
              <DialogHeader>
                <DialogTitle>주간 보고 · {weekPeriod(openKey)}</DialogTitle>
                <DialogDescription>
                  {openEntry.updatedAt
                    ? `저장 ${dayjs(openEntry.updatedAt).format("YYYY.MM.DD HH:mm")}`
                    : ""}
                </DialogDescription>
              </DialogHeader>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                {buildReport(openKey, openEntry.stats ?? EMPTY_STATS, openEntry)}
              </pre>
              <DialogFooter>
                <Button variant="outline" onClick={handleDialogCopy}>
                  {dialogCopied ? <CheckIcon /> : <CopyIcon />}
                  {dialogCopied ? "복사됨" : "복사"}
                </Button>
                <Button onClick={() => editWeek(openKey)}>수정</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
