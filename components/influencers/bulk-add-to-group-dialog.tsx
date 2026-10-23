"use client";

import * as React from "react";
import { FolderPlus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useInfluencerGroupStore } from "@/lib/influencer-group-store";

export function BulkAddToGroupDialog({
  influencerIds,
  onDone,
}: {
  influencerIds: string[];
  onDone?: () => void;
}) {
  const { groups, createGroup, addMember } = useInfluencerGroupStore();
  const [open, setOpen] = React.useState(false);
  const [newGroupName, setNewGroupName] = React.useState("");

  function addAllToGroup(groupId: string) {
    influencerIds.forEach((id) => addMember(groupId, id));
    setOpen(false);
    onDone?.();
  }

  function handleCreateAndAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    const group = createGroup(newGroupName.trim());
    influencerIds.forEach((id) => addMember(group.id, id));
    setNewGroupName("");
    setOpen(false);
    onDone?.();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8">
          <FolderPlus className="size-3.5" /> 그룹에 담기
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>그룹에 담기</DialogTitle>
          <DialogDescription>
            선택한 {influencerIds.length}명을 담을 그룹을 고르세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1">
          {groups.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              아직 그룹이 없습니다. 아래에서 새로 만들어보세요.
            </p>
          ) : (
            groups.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => addAllToGroup(g.id)}
                className="flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
              >
                <span>{g.name}</span>
                <span className="text-xs text-muted-foreground">
                  {g.memberIds.length}명
                </span>
              </button>
            ))
          )}
        </div>

        <form
          onSubmit={handleCreateAndAdd}
          className="flex items-end gap-2 border-t pt-3"
        >
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="bulk-new-group-name" className="text-xs">
              새 그룹 만들어서 담기
            </Label>
            <Input
              id="bulk-new-group-name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="예: Q1 웰니스 캠페인 후보"
              className="h-8"
            />
          </div>
          <Button type="submit" size="sm" className="h-8">
            <Plus className="size-3.5" /> 만들기
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
