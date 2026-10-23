"use client";

import * as React from "react";
import { Plus } from "lucide-react";

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
import { PLATFORM_LABEL, type InfluencerPlatform } from "@/lib/influencer-data";
import { useInfluencerStore, type InfluencerInput } from "@/lib/influencer-store";

const emptyForm = {
  handle: "",
  platform: "instagram" as InfluencerPlatform,
  followers: "",
  engagementRate: "",
  avgViews: "",
  gender: "female" as "male" | "female",
  category: "",
  bio: "",
};

export function AddInfluencerDialog() {
  const { addInfluencer } = useInfluencerStore();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);

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
      source: "manual",
      pinned: false,
      optOut: false,
    };
    addInfluencer(input);
    setForm(emptyForm);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-9 py-2">
          <Plus className="size-3.5" /> 크리에이터 추가
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>새 크리에이터 추가</DialogTitle>
            <DialogDescription>
              협업 후보로 검토할 크리에이터를 수동으로 등록합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="inf-handle">핸들 *</Label>
                <Input
                  id="inf-handle"
                  value={form.handle}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, handle: e.target.value }))
                  }
                  placeholder="예: yul.cosmetic"
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
                <Label htmlFor="inf-followers">팔로워</Label>
                <Input
                  id="inf-followers"
                  type="number"
                  min={0}
                  value={form.followers}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, followers: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inf-eng">참여율 (%)</Label>
                <Input
                  id="inf-eng"
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
                <Label htmlFor="inf-views">평균 조회수</Label>
                <Input
                  id="inf-views"
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
                <Label htmlFor="inf-category">카테고리 (콤마로 구분)</Label>
                <Input
                  id="inf-category"
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value }))
                  }
                  placeholder="예: 뷰티, 스킨케어"
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
              <Label htmlFor="inf-bio">소개</Label>
              <Textarea
                id="inf-bio"
                rows={2}
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                placeholder="크리에이터 소개 · 콘텐츠 성향"
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
