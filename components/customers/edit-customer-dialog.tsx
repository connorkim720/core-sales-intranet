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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { REPS, SOURCE_LABEL, STAGE_LABEL, STAGE_ORDER } from "@/lib/mock-data";
import { useCustomerStore } from "@/lib/customer-store";
import type { Customer, DealSource, DealStage } from "@/lib/types";

export function EditCustomerDialog({ customer }: { customer: Customer }) {
  const { updateCustomer } = useCustomerStore();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({
    company: customer.company,
    category: customer.category,
    manager: customer.manager,
    email: customer.email,
    source: customer.source,
    owner: customer.owner,
    stage: customer.stage,
    dealValueMonthly: String(customer.dealValueMonthly),
  });

  // 다이얼로그를 여는 시점(이벤트)에 최신 값으로 리셋 — effect가 아니라
  // onOpenChange 핸들러에서 처리해 불필요한 렌더 사이클을 만들지 않는다.
  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setForm({
        company: customer.company,
        category: customer.category,
        manager: customer.manager,
        email: customer.email,
        source: customer.source,
        owner: customer.owner,
        stage: customer.stage,
        dealValueMonthly: String(customer.dealValueMonthly),
      });
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company.trim()) return;
    updateCustomer(customer.id, {
      company: form.company,
      category: form.category,
      manager: form.manager,
      email: form.email,
      source: form.source,
      owner: form.owner,
      stage: form.stage,
      dealValueMonthly: Number(form.dealValueMonthly) || 0,
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <PencilIcon className="size-3.5" /> 수정
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>브랜드 정보 수정</DialogTitle>
            <DialogDescription>
              {customer.company}의 정보와 딜 단계를 수정합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-company">브랜드명 *</Label>
              <Input
                id="edit-company"
                value={form.company}
                onChange={(e) =>
                  setForm((f) => ({ ...f, company: e.target.value }))
                }
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-category">카테고리</Label>
                <Input
                  id="edit-category"
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-manager">담당자명</Label>
                <Input
                  id="edit-manager"
                  value={form.manager}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, manager: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-email">이메일</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-value">예상 MRR (원)</Label>
                <Input
                  id="edit-value"
                  type="number"
                  min={0}
                  value={form.dealValueMonthly}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dealValueMonthly: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>단계</Label>
                <Select
                  value={form.stage}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, stage: v as DealStage }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGE_ORDER.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STAGE_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>유입경로</Label>
                <Select
                  value={form.source}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, source: v as DealSource }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SOURCE_LABEL) as DealSource[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {SOURCE_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>담당 영업</Label>
                <Select
                  value={form.owner}
                  onValueChange={(v) => setForm((f) => ({ ...f, owner: v }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REPS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
