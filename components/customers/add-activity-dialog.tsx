"use client";

import * as React from "react";
import { PlusIcon } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCustomerStore } from "@/lib/customer-store";
import type { ActivityType, Customer } from "@/lib/types";

type LoggableType = Exclude<ActivityType, "system">;

const ACTIVITY_TYPE_LABEL: Record<LoggableType, string> = {
  call: "통화",
  email: "이메일",
  meeting: "미팅",
  note: "메모",
  quote: "견적서 발송",
};

const ACTIVITY_TYPES = Object.keys(ACTIVITY_TYPE_LABEL) as LoggableType[];

function initialForm(customer: Customer) {
  return {
    type: "call" as LoggableType,
    summary: "",
    detail: "",
    nextStep: customer.nextStep ?? "",
    nextStepDue: customer.nextStepDue ?? "",
  };
}

export function AddActivityDialog({ customer }: { customer: Customer }) {
  const { addActivity } = useCustomerStore();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(() => initialForm(customer));

  // 다이얼로그를 여는 시점(이벤트)에 최신 값으로 리셋 — effect가 아니라
  // onOpenChange 핸들러에서 처리해 불필요한 렌더 사이클을 만들지 않는다.
  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) setForm(initialForm(customer));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.summary.trim()) return;
    addActivity(customer.id, {
      type: form.type,
      summary: form.summary.trim(),
      detail: form.detail.trim() || undefined,
      nextStep: form.nextStep.trim() || undefined,
      nextStepDue: form.nextStep.trim()
        ? form.nextStepDue.trim() || undefined
        : undefined,
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7">
          <PlusIcon className="size-3.5" /> 활동 추가
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>활동 기록</DialogTitle>
            <DialogDescription>
              {customer.company}과의 컨택 내역을 기록합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>유형</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, type: v as LoggableType }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {ACTIVITY_TYPE_LABEL[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="activity-summary">내용 *</Label>
                <Input
                  id="activity-summary"
                  value={form.summary}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, summary: e.target.value }))
                  }
                  placeholder="예: 견적 안내 콜 진행"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="activity-detail">상세 메모</Label>
              <Textarea
                id="activity-detail"
                value={form.detail}
                onChange={(e) =>
                  setForm((f) => ({ ...f, detail: e.target.value }))
                }
                rows={3}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="activity-next">다음 액션</Label>
                <Input
                  id="activity-next"
                  value={form.nextStep}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, nextStep: e.target.value }))
                  }
                  placeholder="예: 30분 온보딩 콜 예약"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="activity-due">마감일</Label>
                <Input
                  id="activity-due"
                  type="date"
                  value={form.nextStepDue}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, nextStepDue: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button type="submit">기록 저장</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
