"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { PlusIcon, RocketIcon, Trash2Icon, UsersIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { progressPercent, stepStates, useCampaigns, type CampaignBrief, type CampaignPackage } from "@/lib/campaign-store";
import { useCustomerStore } from "@/lib/customer-store";

export default function CampaignsPage() {
  const router = useRouter();
  const { campaigns, hydrated, create, remove } = useCampaigns();
  const [open, setOpen] = React.useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="mt-1 text-sm text-muted-foreground">
          브랜드별 캠페인의 가이드라인, 배송, 대본·영상 피드백, 업로드 확인과 정산까지 진행 상황을 관리합니다.
        </p>
        <Button className="h-9 py-2" disabled={!hydrated} onClick={() => setOpen(true)}>
          <PlusIcon className="size-3.5" /> 캠페인 생성
        </Button>
      </div>

      {hydrated && campaigns.length === 0 ? (
        <Card className="shadow-xs">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <RocketIcon className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">진행 중인 캠페인이 없습니다</p>
            <Button variant="outline" className="h-9 py-2" onClick={() => setOpen(true)}>
              첫 캠페인 만들기
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((c) => {
            const states = stepStates(c);
            const current = states.find((s) => s.state === "active");
            const pct = progressPercent(c);
            return (
              <Card key={c.id} className="shadow-xs transition-shadow hover:shadow-sm">
                <CardContent className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/campaigns/${c.id}`} className="min-w-0 flex-1 hover:underline">
                      <p className="truncate text-sm font-semibold">{c.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.brand} · {c.selectionConfirmed === false ? "인플루언서 선정 중" : "운영 중"}
                      </p>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="캠페인 삭제"
                      onClick={() => {
                        if (window.confirm(`"${c.name}" 캠페인을 삭제할까요?`)) remove(c.id);
                      }}
                    >
                      <Trash2Icon className="size-3.5 text-muted-foreground" />
                    </Button>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        {current ? `${current.label} · ${current.note}` : "모든 단계 완료"}
                      </span>
                      <span className="tabular-nums">{pct}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <UsersIcon className="size-3.5" /> {c.creators.length}명
                    </span>
                    <span className="tabular-nums">
                      업로드 {dayjs(c.deadlines.uploadFrom).format("MM/DD")} ~{" "}
                      {dayjs(c.deadlines.uploadTo).format("MM/DD")}
                    </span>
                  </div>

                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href={`/campaigns/${c.id}`}>캠페인 열기</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CreateDialog
        open={open}
        onOpenChange={setOpen}
        onCreate={(input) => {
          const c = create(input);
          setOpen(false);
          router.push(`/campaigns/${c.id}`);
        }}
      />
    </div>
  );
}

function CreateDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (input: { name: string; brand: string; packageType: CampaignPackage; brief: CampaignBrief }) => void;
}) {
  const { customers } = useCustomerStore();
  const [name, setName] = React.useState("");
  const [brand, setBrand] = React.useState("");
  const [packageType, setPackageType] = React.useState<CampaignPackage>("managed");
  const [brief, setBrief] = React.useState<CampaignBrief>({ product: "", goal: "", audience: "", message: "" });
  const valid = name.trim() !== "" && brand.trim() !== "" && brief.product.trim() !== "" && brief.goal.trim() !== "";
  const setBriefField = (field: keyof CampaignBrief, value: string) =>
    setBrief((prev) => ({ ...prev, [field]: value }));

  const submit = () => {
    if (!valid) return;
    onCreate({
      name: name.trim(),
      brand: brand.trim(),
      packageType,
      brief: {
        product: brief.product.trim(),
        goal: brief.goal.trim(),
        audience: brief.audience.trim(),
        message: brief.message.trim(),
      },
    });
    setName("");
    setBrand("");
    setPackageType("managed");
    setBrief({ product: "", goal: "", audience: "", message: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>캠페인 생성</DialogTitle>
          <DialogDescription>캠페인 정보를 입력하고 추천 목록에서 크리에이터를 선정합니다.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>운영 방식</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {([
                { value: "managed", title: "올인원 풀패키지", detail: "가이드라인과 제작 피드백까지 함께 관리" },
                { value: "lite", title: "알뜰 패키지", detail: "크리에이터 선정과 진행 현황을 직접 관리" },
              ] as const).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={packageType === option.value}
                  onClick={() => setPackageType(option.value)}
                  className={`rounded-xl border p-3 text-left ${packageType === option.value ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
                >
                  <span className="block text-sm font-medium">{option.title}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{option.detail}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">운영 방식은 내부 관리용입니다. 상품 구매나 결제와 연결되지 않습니다.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="camp-name">캠페인 이름</Label>
            <Input id="camp-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 신제품 시딩 캠페인" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="camp-brand">브랜드</Label>
            <Input
              id="camp-brand"
              list="camp-brands"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="고객사에서 고르거나 직접 입력"
            />
            <datalist id="camp-brands">
              {customers.map((c) => (
                <option key={c.id} value={c.company} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="camp-product">광고 제품</Label>
            <Input id="camp-product" value={brief.product} onChange={(e) => setBriefField("product", e.target.value)} placeholder="예: 세라마이드 세럼 30ml" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="camp-goal">캠페인 목표</Label>
            <Input id="camp-goal" value={brief.goal} onChange={(e) => setBriefField("goal", e.target.value)} placeholder="예: 제품 리뷰 콘텐츠 확보" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="camp-audience">타깃 고객</Label>
            <Input id="camp-audience" value={brief.audience} onChange={(e) => setBriefField("audience", e.target.value)} placeholder="예: 20~30대 스킨케어 관심층" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="camp-message">전달할 메시지</Label>
            <Textarea id="camp-message" rows={3} value={brief.message} onChange={(e) => setBriefField("message", e.target.value)} placeholder="제품의 핵심 특징과 피해야 할 표현" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button disabled={!valid} onClick={submit}>
            생성하고 크리에이터 찾기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
