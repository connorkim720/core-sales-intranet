"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2Icon, CornerDownLeftIcon, SearchIcon, UsersIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { NAV_CATEGORIES } from "@/components/nav-config";
import { useCustomerStore } from "@/lib/customer-store";
import { useInfluencerStore } from "@/lib/influencer-store";

type Result = {
  key: string;
  group: string;
  title: string;
  hint?: string;
  icon: React.ReactElement;
  go: () => void;
};

const MAX_PER_GROUP = 6;

// ⌘K / Ctrl+K — 메뉴, 고객사, 크리에이터를 한 번에 찾는 통합 검색.
export function CommandPaletteTrigger() {
  const router = useRouter();
  const { customers } = useCustomerStore();
  const { influencers } = useInfluencerStore();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [cursor, setCursor] = React.useState(0);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const close = React.useCallback(() => {
    setOpen(false);
    setQuery("");
    setCursor(0);
  }, []);

  const results = React.useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    const push = (cb: () => void) => () => {
      cb();
      close();
    };

    const menus: Result[] = NAV_CATEGORIES.flatMap((c) =>
      c.items.map((item) => ({
        key: `menu-${item.url}`,
        group: "메뉴",
        title: item.title,
        hint: c.label,
        icon: item.icon,
        go: push(() =>
          item.external
            ? window.open(item.url, "_blank", "noopener,noreferrer")
            : router.push(item.url)
        ),
      }))
    );
    const companies: Result[] = customers.map((c) => ({
      key: `cust-${c.id}`,
      group: "고객사",
      title: c.company,
      hint: c.category,
      icon: <Building2Icon />,
      go: push(() => router.push(`/customers?id=${c.id}`)),
    }));
    const creators: Result[] = influencers.map((c) => ({
      key: `inf-${c.id}`,
      group: "크리에이터",
      title: c.handle,
      hint: c.category.join(" · "),
      icon: <UsersIcon />,
      go: push(() => router.push(`/creator-search?id=${encodeURIComponent(c.id)}`)),
    }));

    const filter = (list: Result[]) =>
      (q ? list.filter((r) => `${r.title} ${r.hint ?? ""}`.toLowerCase().includes(q)) : list).slice(
        0,
        MAX_PER_GROUP
      );

    // 검색어가 없으면 메뉴만 보여 준다.
    return q ? [...filter(menus), ...filter(companies), ...filter(creators)] : filter(menus);
  }, [query, customers, influencers, router, close]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      results[cursor]?.go();
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="hidden h-8 w-56 justify-start gap-2 font-normal text-muted-foreground sm:inline-flex"
        onClick={() => setOpen(true)}
      >
        <SearchIcon className="size-3.5" />
        <span className="flex-1 text-left">통합 검색</span>
        <kbd className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="sm:hidden"
        aria-label="통합 검색"
        onClick={() => setOpen(true)}
      >
        <SearchIcon className="size-4" />
      </Button>

      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
        <DialogContent showCloseButton={false} className="top-[22%] translate-y-0 gap-0 p-0 sm:max-w-lg">
          <DialogTitle className="sr-only">통합 검색</DialogTitle>
          <DialogDescription className="sr-only">
            메뉴, 고객사, 크리에이터를 검색합니다.
          </DialogDescription>
          <div className="relative border-b p-3">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-5 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCursor(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="메뉴, 고객사, 크리에이터 검색…"
              className="h-9 w-full rounded-2xl bg-input/50 pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/30"
            />
          </div>
          <div className="max-h-80 overflow-y-auto p-1.5">
            {results.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                검색 결과가 없습니다
              </p>
            ) : (
              results.map((r, i) => {
                const showGroup = i === 0 || results[i - 1].group !== r.group;
                return (
                  <React.Fragment key={r.key}>
                    {showGroup && (
                      <p className="px-2 pt-2 pb-1 text-xs text-muted-foreground">{r.group}</p>
                    )}
                    <button
                      type="button"
                      onClick={r.go}
                      onMouseEnter={() => setCursor(i)}
                      className={`flex min-h-8 w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm [&_svg]:size-4 [&_svg]:shrink-0 ${
                        i === cursor ? "bg-accent text-accent-foreground" : ""
                      }`}
                    >
                      {r.icon}
                      <span className="flex-1 truncate">{r.title}</span>
                      {r.hint && (
                        <span className="max-w-40 truncate text-xs text-muted-foreground">
                          {r.hint}
                        </span>
                      )}
                      {i === cursor && <CornerDownLeftIcon className="size-3 text-muted-foreground" />}
                    </button>
                  </React.Fragment>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
