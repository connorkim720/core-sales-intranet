"use client";

import * as React from "react";
import Link from "next/link";
import {
  DownloadIcon,
  FolderPlus,
  Plus,
  SearchIcon,
  Trash2Icon,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PLATFORM_LABEL } from "@/lib/influencer-data";
import { useInfluencerStore } from "@/lib/influencer-store";
import { useInfluencerGroupStore } from "@/lib/influencer-group-store";
import { formatDate } from "@/lib/format";
import { downloadCsv, toCsv } from "@/lib/csv";

function CreateGroupDialog() {
  const { createGroup } = useInfluencerGroupStore();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createGroup(name.trim(), description.trim());
    setName("");
    setDescription("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-9 py-2">
          <Plus className="size-3.5" /> 새 그룹
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>새 그룹 만들기</DialogTitle>
            <DialogDescription>
              캠페인별로 후보 크리에이터를 묶어서 관리합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="group-name">그룹명 *</Label>
              <Input
                id="group-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 홀리데이 스킨케어 PR 리스트"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="group-desc">설명</Label>
              <Input
                id="group-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="선택 입력"
              />
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button type="submit">만들기</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function GroupPanel() {
  const { influencers } = useInfluencerStore();
  const { groups, deleteGroup, removeMember } = useInfluencerGroupStore();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const selected = groups.find((g) => g.id === selectedId) ?? null;
  const members = selected
    ? selected.memberIds
        .map((id) => influencers.find((i) => i.id === id))
        .filter((i): i is NonNullable<typeof i> => !!i)
    : [];

  function handleExport() {
    if (!selected || members.length === 0) return;
    const headers = [
      "핸들",
      "플랫폼",
      "팔로워",
      "참여율(%)",
      "평균 조회수",
      "카테고리",
      "성별",
      "소개",
    ];
    const rows = members.map((m) => [
      `@${m.handle}`,
      PLATFORM_LABEL[m.platform],
      m.followers,
      m.engagementRate.toFixed(1),
      m.avgViews ?? "-",
      m.category.join("/"),
      m.gender === "male" ? "남" : "여",
      m.bio,
    ]);
    const filename = `${selected.name.replace(/[\\/]/g, "_")}_샘플 리스트업.csv`;
    downloadCsv(filename, toCsv(headers, rows));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="mt-1 text-sm text-muted-foreground">
          캠페인 후보 크리에이터를 그룹으로 묶어서 관리합니다 · 총 {groups.length}개
          그룹
        </p>
        <CreateGroupDialog />
      </div>

      <div className="flex h-[calc(100svh-13rem)] gap-4">
        <div className="flex h-full w-2/5 min-w-[260px] max-w-sm shrink-0 flex-col">
          <div className="h-full overflow-y-auto rounded-md border">
            {groups.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
                <FolderPlus className="size-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  아직 그룹이 없습니다. 인플루언서 서치에서 &ldquo;그룹에
                  담기&rdquo;로 만들거나, [새 그룹]으로 시작하세요.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {groups.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedId(g.id)}
                    className={`flex w-full flex-col gap-1 px-3 py-2.5 text-left transition-colors hover:bg-accent ${
                      selectedId === g.id ? "bg-accent" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {g.name}
                      </span>
                      <Badge variant="secondary" className="shrink-0 font-normal">
                        {g.memberIds.length}명
                      </Badge>
                    </div>
                    {g.description && (
                      <span className="truncate text-xs text-muted-foreground">
                        {g.description}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="h-full min-w-0 flex-1">
          {!selected ? (
            <div className="flex h-full items-center justify-center rounded-md border text-sm text-muted-foreground">
              왼쪽에서 그룹을 선택하세요
            </div>
          ) : (
            <div className="flex h-full flex-col rounded-md border">
              <div className="flex items-start justify-between gap-2 border-b p-4">
                <div>
                  <h2 className="text-base font-medium leading-none">
                    {selected.name}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selected.description || "설명 없음"} · 생성일{" "}
                    {formatDate(selected.createdAt, "YYYY.MM.DD")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    disabled={members.length === 0}
                    onClick={handleExport}
                    title={
                      members.length === 0
                        ? "담긴 크리에이터가 없습니다"
                        : "현재 그룹을 샘플 리스트업 CSV로 내보내기"
                    }
                  >
                    <DownloadIcon className="size-3.5" /> 샘플 리스트업 내보내기
                  </Button>
                  <Button asChild size="sm" className="h-8">
                    <Link href={`/influencers?group=${selected.id}`}>
                      <SearchIcon className="size-3.5" /> 서치에서 담기
                    </Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-destructive hover:text-destructive"
                      >
                        <Trash2Icon className="size-3.5" /> 그룹 삭제
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {selected.name}을(를) 삭제할까요?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          그룹만 삭제되고 크리에이터 정보는 그대로 남습니다.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            deleteGroup(selected.id);
                            setSelectedId(null);
                          }}
                        >
                          삭제
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto">
                {members.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    아직 담긴 크리에이터가 없습니다. 인플루언서 서치에서
                    &ldquo;그룹에 담기&rdquo;로 추가하세요.
                  </p>
                ) : (
                  <Table className="[&_:is(th,td)]:px-4">
                    <TableHeader>
                      <TableRow>
                        <TableHead>핸들</TableHead>
                        <TableHead className="text-center">플랫폼</TableHead>
                        <TableHead className="text-right">팔로워</TableHead>
                        <TableHead className="text-right">참여율</TableHead>
                        <TableHead>카테고리</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">
                            @{m.handle}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">
                              {PLATFORM_LABEL[m.platform]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {m.followers.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {m.engagementRate.toFixed(1)}%
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {m.category.map((cat) => (
                                <Badge
                                  key={cat}
                                  variant="secondary"
                                  className="font-normal"
                                >
                                  {cat}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={() => removeMember(selected.id, m.id)}
                              aria-label="그룹에서 제거"
                            >
                              <X className="size-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
