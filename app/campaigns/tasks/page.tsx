"use client";

import { TaskBoard } from "@/components/campaign/task-board";
import { useCampaigns } from "@/lib/campaign-store";

export default function CampaignTasksPage() {
  const { campaigns, hydrated, update } = useCampaigns();
  if (!hydrated) return null;
  return <TaskBoard campaigns={campaigns} update={update} />;
}
