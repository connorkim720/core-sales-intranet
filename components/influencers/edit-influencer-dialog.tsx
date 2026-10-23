"use client";

import * as React from "react";
import { PencilIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PLATFORM_LABEL,
  type Influencer,
  type InfluencerPlatform,
} from "@/lib/influencer-data";
import { useInfluencerStore, type InfluencerInput } from "@/lib/influencer-store";

function toForm(c: Influencer) {
  return {
    handle: c.handle,
    platform: c.platform,
    followers: String(c.followers),
    engagementRate: String(c.engagementRate),
    avgViews: c.avgViews != null ? String(c.avgViews) : "",
    gender: c.gender,
    category: c.category.join(", "),
    bio: c.bio,
    pinned: c.pinned,
    optOut: c.optOut,
  };
}

export function EditInfluencerDialog({
  influencer,
  trigger,
}: {
  influencer: Influencer;
  trigger?: React.ReactNode;
}) {
  const { updateInfluencer } = useInfluencerStore();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(() => toForm(influencer));

  // 다이얼로그를 여는 시점(이벤트)에 최신 값으로 리셋 — effect가 아니라
  // onOpenChange 핸들러에서 처리한다 (customer-store 쪽과 동일한 이유).
  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) setForm(toForm(influencer));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.handle.trim()) return;
    const input: InfluencerInput = {
      handle: form.handle.trim().replace(/^@/, ""),
      platform: form.platform,
      followers: Number(form.followers) || 0,
      engagementRate: Number(form.engagementRate) || 0,
      avgViews: form.avgViews ? Number(form.avgViews) : null,
      gender: form.gender,
      category: form.category
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
      bio: form.bio,
      source: influencer.source,
      pinned: form.pinned,
      optOut: form.optOut,
    };
    updateInfluencer(influencer.id, input);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="h-8">
            <PencilIcon className="size-3.5" /> 수정
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>크리에이터 정보 수정</DialogTitle>
            <DialogDescription>
              @{influencer.handle}의 정보를 수정합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-inf-handle">핸들 *</Label>
                <Input
                  id="edit-inf-handle"
                  value={form.handle}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, handle: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>플랫폼</Label>
                <Select
                  value={form.platform}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, platform: v as InfluencerPlatform }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PLATFORM_LABEL) as InfluencerPlatform[]).map(
                      (p) => (
                        <SelectItem key={p} value={p}>
                          {PLATFORM_LABEL[p]}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-inf-followers">팔로워</Label>
                <Input
                  id="edit-inf-followers"
                  type="number"
                  min={0}
                  value={form.followers}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, followers: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-inf-eng">참여율 (%)</Label>
                <Input
                  id="edit-inf-eng"
                  type="number"
                  min={0}
                  step="0.1"
                  value={form.engagementRate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, engagementRate: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-inf-views">평균 조회수</Label>
                <Input
                  id="edit-inf-views"
                  type="number"
                  min={0}
                  value={form.avgViews}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, avgViews: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-inf-category">카테고리 (콤마로 구분)</Label>
                <Input
                  id="edit-inf-category"
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>성별</Label>
                <Select
                  value={form.gender}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, gender: v as "male" | "female" }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">여성</SelectItem>
                    <SelectItem value="male">남성</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-inf-bio">소개</Label>
              <Textarea
                id="edit-inf-bio"
                rows={2}
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button type="submit">저장</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
