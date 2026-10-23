"use client";

import * as React from "react";
import { FolderPlus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { Influencer } from "@/lib/influencer-data";
import { useInfluencerGroupStore } from "@/lib/influencer-group-store";

export function AddToGroupDialog({ influencer }: { influencer: Influencer }) {
  const { groups, createGroup, addMember, removeMember } =
    useInfluencerGroupStore();
  const [open, setOpen] = React.useState(false);
  const [newGroupName, setNewGroupName] = React.useState("");

  function handleCreateAndAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    const group = createGroup(newGroupName.trim());
    addMember(group.id, influencer.id);
    setNewGroupName("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <FolderPlus className="size-3.5" /> 그룹에 담기
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>그룹에 담기</DialogTitle>
          <DialogDescription>
            @{influencer.handle}을(를) 담을 그룹을 선택하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          {groups.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              아직 그룹이 없습니다. 아래에서 새로 만들어보세요.
            </p>
          ) : (
            groups.map((g) => {
              const checked = g.memberIds.includes(influencer.id);
              return (
                <label
                  key={g.id}
                  className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-accent"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) =>
                      v
                        ? addMember(g.id, influencer.id)
                        : removeMember(g.id, influencer.id)
                    }
                  />
                  <span className="flex-1 text-sm">{g.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {g.memberIds.length}명
                  </span>
                </label>
              );
            })
          )}
        </div>

        <form onSubmit={handleCreateAndAdd} className="flex items-end gap-2 border-t pt-3">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="new-group-name" className="text-xs">
              새 그룹 만들어서 담기
            </Label>
            <Input
              id="new-group-name"
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
