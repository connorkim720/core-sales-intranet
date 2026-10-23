"use client";

import { useParams } from "next/navigation";

import { SettlementForm } from "@/components/settlements/settlement-form";

export default function EditCreatorSettlementPage() {
  const { id } = useParams<{ id: string }>();
  return <SettlementForm recordId={id} />;
}
