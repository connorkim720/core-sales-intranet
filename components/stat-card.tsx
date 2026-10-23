import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type StatTone =
  | "neutral"
  | "danger"
  | "warning"
  | "info"
  | "success"
  | "violet";

const TONE_CLASS: Record<StatTone, string> = {
  neutral: "border-border bg-muted text-muted-foreground",
  danger: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
  warning:
    "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-500",
  info: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  success:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  violet:
    "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400",
};

export type Stat = {
  label: React.ReactNode;
  value: React.ReactNode;
  danger?: boolean;
  badge?: { text: React.ReactNode; icon?: React.ReactNode; tone?: StatTone };
  footerTitle?: React.ReactNode;
  footerSub?: React.ReactNode;
  href?: string;
};

export function StatCard({ stat }: { stat: Stat }) {
  const card = (
    <Card className="@container/card h-full shadow-xs">
      <CardHeader>
        <CardDescription>{stat.label}</CardDescription>
        <CardTitle
          className={cn(
            "text-2xl font-semibold tabular-nums @[250px]/card:text-3xl",
            stat.danger && "text-destructive"
          )}
        >
          {stat.value}
        </CardTitle>
        {stat.badge && (
          <CardAction>
            <Badge
              variant="outline"
              className={cn(TONE_CLASS[stat.badge.tone ?? "neutral"])}
            >
              {stat.badge.icon}
              {stat.badge.text}
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      {(stat.footerTitle || stat.footerSub) && (
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          {stat.footerTitle && (
            <div className="line-clamp-1 flex gap-2 font-medium">
              {stat.footerTitle}
            </div>
          )}
          {stat.footerSub && (
            <div className="text-muted-foreground">{stat.footerSub}</div>
          )}
        </CardFooter>
      )}
    </Card>
  );

  if (stat.href) {
    return (
      <Link
        href={stat.href}
        className="block transition-shadow hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {card}
      </Link>
    );
  }
  return card;
}

export function StatGrid({
  stats,
  className,
}: {
  stats: Stat[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4",
        className
      )}
    >
      {stats.map((s, i) => (
        <StatCard key={i} stat={s} />
      ))}
    </div>
  );
}
