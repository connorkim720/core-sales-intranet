"use client";

import * as React from "react";
import { Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PLATFORM_LABEL, type Influencer } from "@/lib/influencer-data";
import { useInfluencerStore } from "@/lib/influencer-store";
import { EditInfluencerDialog } from "@/components/influencers/edit-influencer-dialog";
import { DeleteInfluencerDialog } from "@/components/influencers/delete-influencer-dialog";
import { AddToGroupDialog } from "@/components/influencers/add-to-group-dialog";

export function InfluencerDetailDialog({
  influencer,
  open,
  onOpenChange,
}: {
  influencer: Influencer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { togglePinned } = useInfluencerStore();
  if (!influencer) return null;
  const c = influencer;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            @{c.handle}
            <button
              type="button"
              onClick={() => togglePinned(c.id)}
              className="text-muted-foreground/40 transition-colors hover:text-amber-400"
              aria-label={c.pinned ? "관심 해제" : "관심 등록"}
            >
              <Star
                className={`size-3.5 ${
                  c.pinned ? "fill-amber-400 text-amber-400" : ""
                }`}
              />
            </button>
          </DialogTitle>
          <DialogDescription>
            <a
              href={`https://instagram.com/${c.handle}`}
              target="_blank"
              rel="noreferrer"
            >
              {PLATFORM_LABEL[c.platform]} 프로필 열기 ↗
            </a>
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">팔로워</p>
            <p className="text-sm font-semibold tabular-nums">
              {c.followers.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">참여율</p>
            <p className="text-sm font-semibold tabular-nums">
              {c.engagementRate.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">평균 조회수</p>
            <p className="text-sm font-semibold tabular-nums">
              {c.avgViews ? c.avgViews.toLocaleString() : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">성별</p>
            <p className="text-sm font-medium">
              {c.gender === "female" ? "여성" : "남성"}
            </p>
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs text-muted-foreground">카테고리</p>
          <div className="flex flex-wrap gap-1">
            {c.category.map((cat) => (
              <Badge key={cat} variant="secondary" className="font-normal">
                {cat}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs text-muted-foreground">소개</p>
          <p className="text-sm">{c.bio || "—"}</p>
        </div>

        <p className="text-xs text-muted-foreground">
          출처: {c.source === "manual" ? "수동 입력" : c.source}
        </p>

        <DialogFooter className="sm:justify-between">
          <DeleteInfluencerDialog
            influencer={c}
            onDeleted={() => onOpenChange(false)}
          />
          <div className="flex gap-2">
            <AddToGroupDialog influencer={c} />
            <EditInfluencerDialog influencer={c} />
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
