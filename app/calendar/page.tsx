"use client";

import * as React from "react";
import Link from "next/link";
import dayjs, { type Dayjs } from "dayjs";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PhoneIcon,
  VideoIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { calendarEvents, type CalendarEvent } from "@/lib/mock-data";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function groupByDay(events: CalendarEvent[]) {
  const groups = new Map<string, CalendarEvent[]>();
  for (const e of [...events].sort((a, b) => (a.at < b.at ? -1 : 1))) {
    const key = dayjs(e.at).format("YYYY-MM-DD");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }
  return Array.from(groups.entries());
}

function buildMonthCells(month: Dayjs) {
  const start = month.startOf("month");
  const startWeekday = start.day();
  const daysInMonth = month.daysInMonth();
  const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;
  const gridStart = start.subtract(startWeekday, "day");
  return Array.from({ length: totalCells }, (_, i) => gridStart.add(i, "day"));
}

function EventLink({ e }: { e: CalendarEvent }) {
  return (
    <Link
      href={e.customerId ? `/customers?id=${e.customerId}` : "#"}
      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent"
    >
      <div className="flex w-14 shrink-0 flex-col items-start">
        <span className="text-sm font-medium tabular-nums">
          {dayjs(e.at).format("HH:mm")}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {e.durationMin}분
        </span>
      </div>
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {e.type === "call" ? (
          <PhoneIcon className="size-3.5" />
        ) : (
          <VideoIcon className="size-3.5" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{e.title}</p>
        <p className="truncate text-xs text-muted-foreground">{e.company}</p>
      </div>
      <Badge variant="outline" className="shrink-0 text-xs">
        {e.owner}
      </Badge>
    </Link>
  );
}

function ListView({ events }: { events: CalendarEvent[] }) {
  const groups = groupByDay(events);
  return (
    <div className="space-y-4">
      {groups.map(([day, dayEvents]) => (
        <Card key={day} className="shadow-xs py-0">
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b px-4 py-2.5">
              <p className="text-sm font-medium">
                {dayjs(day).format("M월 D일 (ddd)")}
              </p>
              <Badge variant="secondary" className="font-normal">
                {dayEvents.length}건
              </Badge>
            </div>
            <div className="divide-y">
              {dayEvents.map((e) => (
                <EventLink key={e.id} e={e} />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function MonthView({ events }: { events: CalendarEvent[] }) {
  const [month, setMonth] = React.useState(() =>
    dayjs(events[0]?.at ?? undefined).startOf("month")
  );
  const [selectedDay, setSelectedDay] = React.useState<string | null>(null);

  const eventsByDay = React.useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of [...events].sort((a, b) => (a.at < b.at ? -1 : 1))) {
      const key = dayjs(e.at).format("YYYY-MM-DD");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return map;
  }, [events]);

  const cells = React.useMemo(() => buildMonthCells(month), [month]);
  const today = dayjs();
  const selectedEvents = selectedDay ? (eventsByDay.get(selectedDay) ?? []) : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{month.format("YYYY년 M월")}</p>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => {
              setMonth((m) => m.subtract(1, "month"));
              setSelectedDay(null);
            }}
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8"
            onClick={() => {
              setMonth(dayjs(events[0]?.at ?? undefined).startOf("month"));
              setSelectedDay(null);
            }}
          >
            오늘
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => {
              setMonth((m) => m.add(1, "month"));
              setSelectedDay(null);
            }}
          >
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border bg-border">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="bg-muted px-2 py-1.5 text-center text-xs font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}
        {cells.map((date) => {
          const key = date.format("YYYY-MM-DD");
          const dayEvents = eventsByDay.get(key) ?? [];
          const inMonth = date.month() === month.month();
          const isToday = date.isSame(today, "day");
          const isSelected = selectedDay === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedDay(dayEvents.length > 0 ? key : null)}
              className={`flex min-h-24 flex-col items-stretch gap-1 bg-card p-1.5 text-left transition-colors ${
                inMonth ? "" : "bg-muted/30 text-muted-foreground/50"
              } ${isSelected ? "bg-accent" : dayEvents.length > 0 ? "hover:bg-accent/60" : ""}`}
            >
              <span
                className={`flex size-5 items-center justify-center rounded-full text-xs ${
                  isToday
                    ? "bg-primary font-medium text-primary-foreground"
                    : ""
                }`}
              >
                {date.date()}
              </span>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((e) => (
                  <span
                    key={e.id}
                    className="block truncate rounded bg-muted px-1 py-0.5 text-[10px] text-foreground"
                  >
                    {dayjs(e.at).format("HH:mm")} {e.title}
                  </span>
                ))}
                {dayEvents.length > 3 && (
                  <span className="block px-1 text-[10px] text-muted-foreground">
                    +{dayEvents.length - 3}건 더보기
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {selectedDay && selectedEvents.length > 0 && (
        <Card className="shadow-xs py-0">
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b px-4 py-2.5">
              <p className="text-sm font-medium">
                {dayjs(selectedDay).format("M월 D일 (ddd)")}
              </p>
              <Badge variant="secondary" className="font-normal">
                {selectedEvents.length}건
              </Badge>
            </div>
            <div className="divide-y">
              {selectedEvents.map((e) => (
                <EventLink key={e.id} e={e} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function CalendarPage() {
  const [view, setView] = React.useState<"list" | "month">("list");

  return (
    <Tabs
      value={view}
      onValueChange={(v) => setView(v as "list" | "month")}
      className="flex-col space-y-4"
    >
      <div className="flex items-center justify-between">
        <p className="mt-1 text-sm text-muted-foreground">
          이번 주 예정된 콜·미팅 일정 · 총 {calendarEvents.length}건
        </p>
        <TabsList>
          <TabsTrigger value="list">목록</TabsTrigger>
          <TabsTrigger value="month">달력</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="list" className="mt-0">
        <ListView events={calendarEvents} />
      </TabsContent>
      <TabsContent value="month" className="mt-0">
        <MonthView events={calendarEvents} />
      </TabsContent>
    </Tabs>
  );
}
