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
import { useCustomerStore } from "@/lib/customer-store";
import type { Customer } from "@/lib/types";

export function DeleteCustomerDialog({
  customer,
  onDeleted,
}: {
  customer: Customer;
  onDeleted?: () => void;
}) {
  const { removeCustomer } = useCustomerStore();

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
          <AlertDialogTitle>{customer.company}을(를) 삭제할까요?</AlertDialogTitle>
          <AlertDialogDescription>
            브랜드 정보와 활동 기록이 모두 삭제됩니다. 되돌릴 수 없습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              removeCustomer(customer.id);
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
