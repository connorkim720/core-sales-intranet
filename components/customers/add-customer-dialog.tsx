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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { REPS, SOURCE_LABEL } from "@/lib/mock-data";
import { useCustomerStore } from "@/lib/customer-store";
import type { DealSource } from "@/lib/types";

const emptyForm = {
  company: "",
  category: "",
  manager: "",
  email: "",
  source: "inbound" as DealSource,
  owner: REPS[0] as string,
};

export function AddCustomerDialog({
  triggerLabel = "브랜드 추가",
  triggerClassName = "h-9 py-2",
  title = "새 브랜드 추가",
  description = "콜드아웃바운드·인바운드 문의로 확보한 신규 브랜드를 등록합니다.",
}: {
  triggerLabel?: string;
  triggerClassName?: string;
  title?: string;
  description?: string;
}) {
  const { addCustomer } = useCustomerStore();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company.trim()) return;
    addCustomer(form);
    setForm(emptyForm);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={triggerClassName}>
          <Plus className="size-3.5" /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="company">브랜드명 *</Label>
              <Input
                id="company"
                value={form.company}
                onChange={(e) =>
                  setForm((f) => ({ ...f, company: e.target.value }))
                }
                placeholder="예: 무해한식탁"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="category">카테고리</Label>
                <Input
                  id="category"
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value }))
                  }
                  placeholder="예: 뷰티·스킨케어"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="manager">담당자명</Label>
                <Input
                  id="manager"
                  value={form.manager}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, manager: e.target.value }))
                  }
                  placeholder="예: 정다은 대표"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="contact@brand.co.kr"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
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
