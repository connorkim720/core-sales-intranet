"use client";

import * as React from "react";
import { Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useInfluencerStore } from "@/lib/influencer-store";
import type { Influencer } from "@/lib/influencer-data";

export function DeleteInfluencerDialog({
  influencer,
  onDeleted,
}: {
  influencer: Influencer;
  onDeleted?: () => void;
}) {
  const { removeInfluencer } = useInfluencerStore();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-destructive hover:text-destructive"
        >
          <Trash2Icon className="size-3.5" /> 삭제
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>@{influencer.handle}을(를) 삭제할까요?</AlertDialogTitle>
          <AlertDialogDescription>
            크리에이터 정보가 목록에서 삭제됩니다. 되돌릴 수 없습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              removeInfluencer(influencer.id);
              onDeleted?.();
            }}
          >
            삭제
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
