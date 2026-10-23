"use client";

import * as React from "react";
import Link from "next/link";
import dayjs from "dayjs";
import {
  ChevronDownIcon,
  Columns3Icon,
  MailIcon,
  SearchIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  IRM_LIMIT,
  IRM_OWNERS,
  IRM_STATUS_DOT,
  IRM_STATUS_LABEL,
  IRM_TAGS,
  useCreatorIrm,
  type IrmStatus,
} from "@/lib/creator-irm-store";
import { useInfluencerGroupStore } from "@/lib/influencer-group-store";
import { useInfluencerStore } from "@/lib/influencer-store";

type ColumnKey = "status" | "owner" | "list" | "tags" | "platform" | "lastContact";

const COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: "status", label: "상태" },
  { key: "owner", label: "담당자" },
  { key: "list", label: "리스트" },
  { key: "tags", label: "태그" },
  { key: "platform", label: "플랫폼" },
  { key: "lastContact", label: "마지막 컨택일" },
];

const NO_LIST = "__none__";

function hueOf(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

export default function CreatorIrmPage() {
  const { influencers } = useInfluencerStore();
  const { groups, addMember, removeMember } = useInfluencerGroupStore();
  const irm = useCreatorIrm();

  const [query, setQuery] = React.useState("");
  const [checked, setChecked] = React.useState<Set<string>>(new Set());
  const [hidden, setHidden] = React.useState<Set<ColumnKey>>(new Set());

  const byId = React.useMemo(() => new Map(influencers.map((c) => [c.id, c])), [influencers]);

  const rows = React.useMemo(
    () =>
      Object.values(irm.entries)
        .flatMap((e) => {
          const c = byId.get(e.id);
          return c ? [{ entry: e, creator: c }] : [];
        })
        .filter(({ creator }) =>
          query.trim() ? creator.handle.toLowerCase().includes(query.trim().toLowerCase()) : true
        )
        .sort((a, b) => b.entry.addedAt.localeCompare(a.entry.addedAt)),
    [irm.entries, byId, query]
  );

  const show = (k: ColumnKey) => !hidden.has(k);
  const allChecked = rows.length > 0 && rows.every((r) => checked.has(r.entry.id));

  const toggleAll = () =>
    setChecked(allChecked ? new Set() : new Set(rows.map((r) => r.entry.id)));
  const toggleOne = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const groupOf = (id: string) => groups.find((g) => g.memberIds.includes(id));
  const changeList = (id: string, value: string) => {
    const cur = groupOf(id);
    if (cur) removeMember(cur.id, id);
    if (value !== NO_LIST) addMember(value, id);
  };

  const contactTargets = checked.size > 0 ? [...checked] : rows.map((r) => r.entry.id);

  const total = Object.keys(irm.entries).length;
  const platformCount = (p: string) =>
    Object.keys(irm.entries).filter((id) => byId.get(id)?.platform === p).length;

  return (
    <div className="space-y-4 pb-16">
      <div>
        <p className="mt-1 text-sm text-muted-foreground">
          인플루언서 관계 관리(IRM) · 컨택한 크리에이터의 상태, 담당자, 리스트, 태그를 관리합니다.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-9 min-w-9 items-center justify-center rounded-2xl bg-muted px-2.5 text-xs font-semibold text-muted-foreground tabular-nums">
          {checked.size}
        </div>
        <div className="relative w-64">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="프로필 이름으로 검색"
            className="h-9 pl-8"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="검색 지우기"
            >
              <XIcon className="size-3.5" />
            </button>
          )}
        </div>
        <Button
          className="h-9 py-2"
          disabled={contactTargets.length === 0}
          onClick={() => irm.markContacted(contactTargets)}
        >
          <MailIcon className="size-3.5" />
          {checked.size > 0 ? `선택 컨택 (${checked.size})` : "전체 컨택"}
        </Button>

        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 py-2">
                <Columns3Icon className="size-3.5" /> 필드 관리
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              <DropdownMenuLabel>표시할 필드</DropdownMenuLabel>
              {COLUMNS.map((c) => (
                <DropdownMenuCheckboxItem
                  key={c.key}
                  checked={show(c.key)}
                  onSelect={(e) => e.preventDefault()}
                  onCheckedChange={(v) =>
                    setHidden((prev) => {
                      const next = new Set(prev);
                      if (v) next.delete(c.key);
                      else next.add(c.key);
                      return next;
                    })
                  }
                >
                  {c.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Card className="py-0 shadow-xs">
        <CardContent className="p-0">
          {total === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <UsersIcon className="size-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                커뮤니티에 담긴 크리에이터가 없습니다
              </p>
              <Button asChild variant="outline" className="h-9 py-2">
                <Link href="/creator-search">크리에이터 탐색에서 컨택하기</Link>
              </Button>
            </div>
          ) : rows.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              검색 결과가 없습니다
            </p>
          ) : (
            <Table className="[&_:is(th,td)]:px-4">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allChecked}
                      onCheckedChange={toggleAll}
                      aria-label="전체 선택"
                    />
                  </TableHead>
                  <TableHead>프로필 이름</TableHead>
                  {show("status") && <TableHead>상태</TableHead>}
                  {show("owner") && <TableHead>담당자</TableHead>}
                  {show("list") && <TableHead>리스트</TableHead>}
                  {show("tags") && <TableHead>태그</TableHead>}
                  {show("platform") && <TableHead>플랫폼</TableHead>}
                  {show("lastContact") && <TableHead>마지막 컨택일</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ entry, creator }) => {
                  const hue = hueOf(creator.id);
                  const list = groupOf(creator.id);
                  return (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <Checkbox
                          checked={checked.has(entry.id)}
                          onCheckedChange={() => toggleOne(entry.id)}
                          aria-label={`${creator.handle} 선택`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <span
                            className="flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                            style={{
                              background: `linear-gradient(135deg, hsl(${hue} 70% 62%), hsl(${
                                (hue + 50) % 360
                              } 70% 48%))`,
                            }}
                          >
                            {creator.handle.slice(0, 2).toUpperCase()}
                          </span>
                          <span className="font-medium">{creator.handle}</span>
                        </div>
                      </TableCell>
                      {show("status") && (
                        <TableCell>
                          <Select
                            value={entry.status}
                            onValueChange={(v) => irm.update(entry.id, { status: v as IrmStatus })}
                          >
                            <SelectTrigger className="h-8 w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(Object.keys(IRM_STATUS_LABEL) as IrmStatus[]).map((s) => (
                                <SelectItem key={s} value={s}>
                                  <span className={`size-2 rounded-full ${IRM_STATUS_DOT[s]}`} />
                                  {IRM_STATUS_LABEL[s]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      )}
                      {show("owner") && (
                        <TableCell>
                          <Select
                            value={entry.owner}
                            onValueChange={(v) => irm.update(entry.id, { owner: v })}
                          >
                            <SelectTrigger className="h-8 w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {IRM_OWNERS.map((o) => (
                                <SelectItem key={o} value={o}>
                                  {o}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      )}
                      {show("list") && (
                        <TableCell>
                          <Select
                            value={list?.id ?? NO_LIST}
                            onValueChange={(v) => changeList(creator.id, v)}
                          >
                            <SelectTrigger className="h-8 w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NO_LIST}>—</SelectItem>
                              {groups.map((g) => (
                                <SelectItem key={g.id} value={g.id}>
                                  {g.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      )}
                      {show("tags") && (
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-44 justify-between font-normal text-muted-foreground"
                              >
                                <span className="flex flex-wrap items-center gap-1 overflow-hidden">
                                  {entry.tags.length === 0
                                    ? "태그 추가"
                                    : entry.tags.map((t) => (
                                        <Badge key={t} variant="secondary" className="font-normal">
                                          {t}
                                        </Badge>
                                      ))}
                                </span>
                                <ChevronDownIcon className="size-3.5 shrink-0" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="min-w-44">
                              {IRM_TAGS.map((t) => (
                                <DropdownMenuCheckboxItem
                                  key={t}
                                  checked={entry.tags.includes(t)}
                                  onSelect={(e) => e.preventDefault()}
                                  onCheckedChange={(v) =>
                                    irm.update(entry.id, {
                                      tags: v
                                        ? [...entry.tags, t]
                                        : entry.tags.filter((x) => x !== t),
                                    })
                                  }
                                >
                                  {t}
                                </DropdownMenuCheckboxItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                      {show("platform") && (
                        <TableCell className="text-muted-foreground">
                          {creator.platform === "instagram" ? "Instagram" : "TikTok"}
                        </TableCell>
                      )}
                      {show("lastContact") && (
                        <TableCell className="text-muted-foreground tabular-nums">
                          {entry.lastContactAt
                            ? dayjs(entry.lastContactAt).format("YYYY.MM.DD")
                            : "컨택 기록 없음"}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="sticky bottom-2 z-10 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl bg-card px-5 py-3 shadow-sm ring-1 ring-foreground/5">
        <span className="text-sm font-semibold text-primary">요약</span>
        <div className="flex items-center gap-2 text-sm">
          <UsersIcon className="size-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">커뮤니티</span>
          <span className="font-semibold tabular-nums">
            {total} / {IRM_LIMIT}
          </span>
        </div>
        <Summary label="인플루언서" value={total} />
        <Summary label="INSTAGRAM" value={platformCount("instagram")} />
        <Summary label="TIKTOK" value={platformCount("tiktok")} />
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold text-primary tabular-nums">{value}</span>
    </div>
  );
}
