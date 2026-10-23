"use client";

import * as React from "react";
import Link from "next/link";
import { FileTextIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCustomerStore } from "@/lib/customer-store";
import { formatKRW } from "@/lib/format";

const PRICING_MODELS = [
  { value: "outcome", label: "결과기반 과금 (성과 연동)" },
  { value: "flat", label: "정액 월 구독" },
  { value: "hybrid", label: "하이브리드 (기본료 + 성과 보너스)" },
] as const;

const existingQuotes = [
  { id: "c11", status: "서명 대기", statusTone: "warning" as const },
  { id: "c12", status: "법무 검토 중", statusTone: "info" as const },
  { id: "c13", status: "조건 재협의", statusTone: "warning" as const },
  { id: "c14", status: "서명 완료", statusTone: "success" as const },
  { id: "c15", status: "서명 완료", statusTone: "success" as const },
  { id: "c16", status: "서명 완료", statusTone: "success" as const },
];

const TONE_CLASS: Record<"warning" | "info" | "success", string> = {
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-500",
  info: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  success:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

export function QuotesPanel() {
  const { customers, addActivity } = useCustomerStore();
  const targetCustomers = customers.filter(
    (c) => c.stage === "discovery" || c.stage === "proposal"
  );

  const [customerId, setCustomerId] = React.useState(targetCustomers[0]?.id ?? "");
  const [model, setModel] = React.useState<(typeof PRICING_MODELS)[number]["value"]>(
    "outcome"
  );
  const [upliftRate, setUpliftRate] = React.useState("15");
  const [note, setNote] = React.useState("");
  const [preview, setPreview] = React.useState<null | {
    company: string;
    model: string;
    monthlyBase: number;
    estimatedBilling: number;
    note: string;
  }>(null);

  const selectedCustomer = customers.find((c) => c.id === customerId);

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCustomer) return;
    const rate = Number(upliftRate) || 0;
    const modelLabel =
      PRICING_MODELS.find((m) => m.value === model)?.label ?? "";
    const estimatedBilling =
      model === "flat"
        ? selectedCustomer.dealValueMonthly
        : Math.round(selectedCustomer.dealValueMonthly * (rate / 100));
    setPreview({
      company: selectedCustomer.company,
      model: modelLabel,
      monthlyBase: selectedCustomer.dealValueMonthly,
      estimatedBilling,
      note,
    });
    // 견적서 생성 시점을 해당 브랜드의 활동 타임라인에도 남긴다 —
    // 영업사원이 각 브랜드마다 견적을 언제 보냈는지 별도로 기록할 필요 없이
    // 여기서 만들면 고객사 상세 히스토리에 자동으로 쌓인다.
    addActivity(selectedCustomer.id, {
      type: "quote",
      summary: `견적서 발송 · ${modelLabel}`,
      detail: `기준 MRR ${formatKRW(selectedCustomer.dealValueMonthly)} · 예상 월 청구액 ${formatKRW(estimatedBilling)}${note ? ` · ${note}` : ""}`,
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="mt-1 text-sm text-muted-foreground">
          제안·상담 단계 브랜드에 결과기반 과금 견적서를 작성합니다
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="text-sm font-medium">새 견적서 작성</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-3">
              <div className="space-y-1.5">
                <Label>대상 브랜드</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="브랜드 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {targetCustomers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>과금 모델</Label>
                <Select
                  value={model}
                  onValueChange={(v) => setModel(v as typeof model)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICING_MODELS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {model !== "flat" && (
                <div className="space-y-1.5">
                  <Label htmlFor="uplift">예상 매출 개선율 (%)</Label>
                  <Input
                    id="uplift"
                    type="number"
                    min={0}
                    max={100}
                    value={upliftRate}
                    onChange={(e) => setUpliftRate(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="note">특이사항 · 조건</Label>
                <Textarea
                  id="note"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="예: 3개월 파일럿 이후 정식 계약 전환, 광고 계정 접근 권한 필요"
                />
              </div>

              <Button type="submit" className="w-full">
                견적서 생성
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
              <FileTextIcon className="size-4 text-muted-foreground" />
              견적 미리보기
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!preview ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                왼쪽에서 견적서를 생성하세요
              </p>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">브랜드</p>
                  <p className="text-sm font-medium">{preview.company}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">과금 모델</p>
                  <p className="text-sm font-medium">{preview.model}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 rounded-md border p-3">
                  <div>
                    <p className="text-xs text-muted-foreground">기준 MRR</p>
                    <p className="text-sm font-semibold tabular-nums">
                      {formatKRW(preview.monthlyBase)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">예상 월 청구액</p>
                    <p className="text-sm font-semibold tabular-nums text-primary">
                      {formatKRW(preview.estimatedBilling)}
                    </p>
                  </div>
                </div>
                {preview.note && (
                  <div>
                    <p className="text-xs text-muted-foreground">특이사항</p>
                    <p className="text-sm whitespace-pre-wrap">{preview.note}</p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  &ldquo;성과가 없으면 청구하지 않습니다&rdquo; 원칙에 따라 실제
                  청구는 합의된 성과 지표 달성 시에만 발생합니다.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-xs py-0">
        <CardHeader className="pt-5 pb-2">
          <CardTitle className="text-sm font-medium">진행 중인 견적·계약</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="[&_:is(th,td)]:px-4">
            <TableHeader>
              <TableRow>
                <TableHead>브랜드</TableHead>
                <TableHead className="text-right">월 예상 금액</TableHead>
                <TableHead className="text-center">상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {existingQuotes.map((q) => {
                const c = customers.find((cust) => cust.id === q.id);
                if (!c) return null;
                return (
                  <TableRow key={q.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/customers?id=${c.id}`}
                        className="hover:underline"
                      >
                        {c.company}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatKRW(c.dealValueMonthly)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={TONE_CLASS[q.statusTone]}
                      >
                        {q.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
