"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreatorSettlements, type CreatorSettlement, type SettlementInput } from "@/lib/creator-settlement-store";
import { useInfluencerStore } from "@/lib/influencer-store";

function isHttpUrl(value: string) {
  if (!value) return true;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

export function SettlementForm({ recordId }: { recordId?: string }) {
  const { records, hydrated, create, update } = useCreatorSettlements();
  const { influencers } = useInfluencerStore();
  const record = records.find((entry) => entry.id === recordId);

  if (!hydrated) {
    return <p className="py-12 text-center text-sm text-muted-foreground">정산 내역을 불러오는 중입니다.</p>;
  }

  if (recordId && !record) {
    return (
      <div className="space-y-3 py-12 text-center">
        <p className="text-sm text-muted-foreground">정산 내역을 찾을 수 없습니다.</p>
        <Link href="/creator-settlements" className="text-sm text-primary hover:underline">정산 목록으로</Link>
      </div>
    );
  }

  return (
    <SettlementFields
      key={record?.id ?? "new"}
      record={record}
      creatorNames={influencers.map((creator) => creator.handle)}
      onSave={(input) => {
        if (record) update(record.id, input);
        else create(input);
      }}
    />
  );
}

function SettlementFields({
  record,
  creatorNames,
  onSave,
}: {
  record?: CreatorSettlement;
  creatorNames: string[];
  onSave: (input: SettlementInput) => void;
}) {
  const router = useRouter();
  const [creatorName, setCreatorName] = React.useState(record?.creatorName ?? "");
  const [campaignName, setCampaignName] = React.useState(record?.campaignName ?? "");
  const [resultUrl, setResultUrl] = React.useState(record?.resultUrl ?? "");
  const [amount, setAmount] = React.useState(record?.amount ? String(record.amount) : "");
  const [note, setNote] = React.useState(record?.note ?? "");
  const [error, setError] = React.useState("");

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedAmount = Number(amount);
    const url = resultUrl.trim();
    if (!creatorName.trim() || !Number.isSafeInteger(parsedAmount) || parsedAmount <= 0) {
      setError("크리에이터와 올바른 지급 예정액을 입력해 주세요.");
      return;
    }
    if (!isHttpUrl(url)) {
      setError("결과 URL은 http 또는 https 주소로 입력해 주세요.");
      return;
    }
    onSave({
      creatorName: creatorName.trim(),
      campaignName: campaignName.trim(),
      resultUrl: url,
      amount: parsedAmount,
      note: note.trim(),
    });
    router.push("/creator-settlements");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" aria-label="정산 목록으로">
          <Link href="/creator-settlements"><ArrowLeftIcon className="size-4" /></Link>
        </Button>
        <div>
          <h1 className="text-lg font-semibold">{record ? "정산 건 수정" : "정산 건 등록"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            크리에이터, 결과 URL, 지급 예정액을 기록합니다. 새 건은 정산 대기로 등록됩니다.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            캠페인 운영에서 선정된 크리에이터는 정산 목록에 자동 표시되므로 같은 지급 건을 다시 등록하지 않아도 됩니다.
          </p>
        </div>
      </div>

      <Card className="shadow-xs">
        <CardContent>
          <form onSubmit={submit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="settlement-creator">크리에이터 <span className="text-destructive">*</span></Label>
                <Input
                  id="settlement-creator"
                  list="settlement-creators"
                  value={creatorName}
                  onChange={(event) => setCreatorName(event.target.value)}
                  placeholder="활동명 또는 이름"
                  required
                  autoFocus
                />
                <datalist id="settlement-creators">
                  {creatorNames.map((name) => <option key={name} value={name} />)}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label htmlFor="settlement-campaign">캠페인 / 브랜드</Label>
                <Input
                  id="settlement-campaign"
                  value={campaignName}
                  onChange={(event) => setCampaignName(event.target.value)}
                  placeholder="예: 신제품 시딩 캠페인"
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="settlement-amount">지급 예정액 (원) <span className="text-destructive">*</span></Label>
                <Input
                  id="settlement-amount"
                  type="number"
                  min="1"
                  step="1"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="예: 500000"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settlement-url">결과 URL</Label>
                <Input
                  id="settlement-url"
                  type="url"
                  value={resultUrl}
                  onChange={(event) => setResultUrl(event.target.value)}
                  placeholder="https://..."
                />
                <p className="text-xs text-muted-foreground">콘텐츠 업로드 후 추가해도 됩니다.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="settlement-note">메모</Label>
              <Textarea
                id="settlement-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="정산 관련 참고 사항"
              />
            </div>

            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button asChild variant="outline"><Link href="/creator-settlements">취소</Link></Button>
              <Button type="submit">{record ? "변경 저장" : "정산 건 등록"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        이 기록은 현재 브라우저에 저장됩니다. 정산 상태 변경은 실제 송금이나 은행 거래 확인을 실행하지 않습니다.
      </p>
    </div>
  );
}
