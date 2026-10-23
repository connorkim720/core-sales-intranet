"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeftIcon, RocketIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InsightsTab, SettlementTab } from "@/components/campaign/insights-settlement";
import { ProgressTab } from "@/components/campaign/progress-tab";
import { SelectionTab } from "@/components/campaign/selection-tab";
import { TaskBoard } from "@/components/campaign/task-board";
import { CampaignNotes } from "@/components/campaign/campaign-notes";
import { progressPercent, useCampaigns } from "@/lib/campaign-store";
import { useInfluencerStore } from "@/lib/influencer-store";

type TabValue = "selection" | "progress" | "tasks" | "notes" | "insights" | "settlement";

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { campaigns, hydrated, update, updateCreator } = useCampaigns();
  const { influencers } = useInfluencerStore();
  const [tab, setTab] = React.useState<TabValue>("progress");

  const influencerById = React.useMemo(() => new Map(influencers.map((i) => [i.id, i])), [influencers]);
  const campaign = campaigns.find((c) => c.id === id);

  if (!hydrated) return null;

  if (!campaign) {
    return (
      <Card className="shadow-xs">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <RocketIcon className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">캠페인을 찾을 수 없습니다</p>
          <Button asChild variant="outline" className="h-9 py-2">
            <Link href="/campaigns">캠페인 목록으로</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const needsMetrics = campaign.creators.some((c) => c.upload === "done" && c.views === 0);
  const selectionRequired = campaign.selectionConfirmed === false;
  const visibleTab = selectionRequired && (tab === "progress" || tab === "insights" || tab === "settlement") ? "selection" : tab;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" aria-label="캠페인 목록">
            <Link href="/campaigns">
              <ArrowLeftIcon className="size-4" />
            </Link>
          </Button>
          <div>
            <p className="text-sm font-semibold">{campaign.name}</p>
            <p className="text-xs text-muted-foreground">
              {campaign.brand} · 진행률 {progressPercent(campaign)}%
            </p>
          </div>
        </div>
      </div>

      <Tabs value={visibleTab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="selection">인플루언서 선정</TabsTrigger>
          <TabsTrigger value="progress" disabled={selectionRequired}>
            진행사항
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] text-background tabular-nums">
              {campaign.creators.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="tasks">업무 보드</TabsTrigger>
          <TabsTrigger value="notes">메모</TabsTrigger>
          <TabsTrigger value="insights" disabled={selectionRequired}>
            인사이트
            {needsMetrics && <span className="size-1.5 rounded-full bg-destructive" aria-label="수치 입력 필요" />}
          </TabsTrigger>
          <TabsTrigger value="settlement" disabled={selectionRequired}>정산</TabsTrigger>
        </TabsList>
      </Tabs>

      {visibleTab === "selection" && (
        <SelectionTab
          campaign={campaign}
          influencers={influencers}
          onUpdate={(fn) => update(campaign.id, fn)}
          onConfirmed={() => setTab("progress")}
        />
      )}
      {visibleTab === "progress" && (
        <ProgressTab
          campaign={campaign}
          influencerById={influencerById}
          onUpdate={(fn) => update(campaign.id, fn)}
          onUpdateCreator={(iid, patch) => updateCreator(campaign.id, iid, patch)}
        />
      )}
      {visibleTab === "tasks" && <TaskBoard campaigns={campaigns} update={update} campaignId={campaign.id} />}
      {visibleTab === "notes" && <CampaignNotes campaign={campaign} onUpdate={(fn) => update(campaign.id, fn)} />}
      {visibleTab === "insights" && (
        <InsightsTab
          campaign={campaign}
          influencerById={influencerById}
          onUpdateCreator={(iid, patch) => updateCreator(campaign.id, iid, patch)}
        />
      )}
      {visibleTab === "settlement" && (
        <SettlementTab
          campaign={campaign}
          influencerById={influencerById}
          onUpdateCreator={(iid, patch) => updateCreator(campaign.id, iid, patch)}
        />
      )}
    </div>
  );
}
