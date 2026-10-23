import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  OPERATION_STATUS_CLASS,
  OPERATION_STATUS_DOT,
  OPERATION_STATUS_LABEL,
} from "@/lib/operation-status";
import type { OperationStatus } from "@/lib/types";

export function OperationStatusBadge({
  status,
  className,
}: {
  status: OperationStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5", OPERATION_STATUS_CLASS[status], className)}
    >
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          OPERATION_STATUS_DOT[status],
          status === "in_progress" && "animate-pulse"
        )}
      />
      {OPERATION_STATUS_LABEL[status]}
    </Badge>
  );
}
