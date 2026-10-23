"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CircleHelpIcon,
  EllipsisVerticalIcon,
  SearchIcon,
  Settings2Icon,
  XIcon,
} from "lucide-react";

import {
  Sidebar,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  NAV_CATEGORIES,
  categoryOfPath,
  type NavItem,
} from "@/components/nav-config";
import { cn } from "@/lib/utils";

const navSecondary = [
  { title: "설정", url: "/settings", icon: <Settings2Icon /> },
  { title: "도움말", url: "#", icon: <CircleHelpIcon /> },
];

function isActiveItem(pathname: string, item: NavItem) {
  if (item.external) return false;
  return item.url === "/" ? pathname === "/" : pathname === item.url;
}

function NavLinkButton({ item, pathname }: { item: NavItem; pathname: string }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActiveItem(pathname, item)}
        tooltip={item.title}
        className="data-[active=true]:border-l-[3px] data-[active=true]:border-primary data-[active=true]:bg-primary/15! data-[active=true]:font-semibold data-[active=true]:text-primary!"
      >
        {item.external ? (
          <a href={item.url} target="_blank" rel="noopener noreferrer">
            {item.icon}
            <span>{item.title}</span>
          </a>
        ) : (
          <Link href={item.url}>
            {item.icon}
            <span>{item.title}</span>
          </Link>
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

// 왼쪽 아이콘 레일(대분류) + 오른쪽 소메뉴 패널 + 메뉴 검색.
function TwoLevelNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [picked, setPicked] = React.useState<{ path: string; id: string } | null>(null);
  const [query, setQuery] = React.useState("");

  // 레일에서 직접 고른 대분류는 같은 경로에 머무는 동안만 유지하고,
  // 페이지가 바뀌면 현재 경로가 속한 대분류로 되돌아간다.
  const activeId = picked?.path === pathname ? picked.id : categoryOfPath(pathname);
  const active = NAV_CATEGORIES.find((c) => c.id === activeId) ?? NAV_CATEGORIES[0];

  const q = query.trim().toLowerCase();
  const matches = q
    ? NAV_CATEGORIES.flatMap((c) =>
        c.items.filter((i) => i.title.toLowerCase().includes(q)).map((i) => ({ cat: c, item: i }))
      )
    : [];

  const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") setQuery("");
    if (e.key === "Enter" && matches[0]) {
      const { item } = matches[0];
      if (item.external) window.open(item.url, "_blank", "noopener,noreferrer");
      else router.push(item.url);
      setQuery("");
    }
  };

  return (
    <div className="flex min-h-0 flex-1">
      <nav
        aria-label="대분류"
        className="no-scrollbar flex w-16 shrink-0 flex-col items-center gap-1 overflow-y-auto py-1"
      >
        {NAV_CATEGORIES.map((c) => {
          const on = c.id === active.id && !q;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setPicked({ path: pathname, id: c.id });
                setQuery("");
              }}
              aria-pressed={on}
              className={cn(
                "flex w-14 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[10px] leading-tight whitespace-nowrap transition-colors [&_svg]:size-[18px]",
                on
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              )}
            >
              {c.icon}
              <span>{c.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="flex min-w-0 flex-1 flex-col border-l pl-2">
        <div className="relative mb-2">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKey}
            placeholder="메뉴 검색…"
            aria-label="메뉴 검색"
            className="pr-7 pl-8"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="검색 지우기"
            >
              <XIcon className="size-3.5" />
            </button>
          )}
        </div>

        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
          {q ? (
            matches.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                일치하는 메뉴가 없습니다
              </p>
            ) : (
              <SidebarMenu>
                {matches.map(({ cat, item }) => (
                  <React.Fragment key={item.url}>
                    <NavLinkButton item={item} pathname={pathname} />
                    <span className="-mt-1 mb-1 px-2 text-[10px] text-muted-foreground">
                      {cat.label}
                    </span>
                  </React.Fragment>
                ))}
              </SidebarMenu>
            )
          ) : (
            <>
              <p className="px-2 pb-1 text-[11px] font-medium text-muted-foreground">
                {active.label}
              </p>
              <SidebarMenu>
                {active.items.map((item) => (
                  <NavLinkButton key={item.url} item={item} pathname={pathname} />
                ))}
              </SidebarMenu>
            </>
          )}
        </div>

        <SidebarMenu className="mt-2">
          {navSecondary.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild size="sm">
                <a href={item.url}>
                  {item.icon}
                  <span>{item.title}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </div>
    </div>
  );
}

function NavUser() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg">
          <Avatar className="h-8 w-8 rounded-lg grayscale">
            <AvatarFallback className="rounded-lg">김세</AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">김세일</span>
            <span className="truncate text-xs text-muted-foreground">
              sales@heycore.com
            </span>
          </div>
          <EllipsisVerticalIcon className="ml-auto size-4" />
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link href="/">
                <svg
                  viewBox="0 0 622 622"
                  className="size-5! shrink-0"
                  fill="currentColor"
                >
                  <circle cx="180" cy="180" r="160" opacity="1" />
                  <circle cx="442" cy="180" r="160" opacity="0.4" />
                  <circle cx="180" cy="442" r="160" opacity="0.4" />
                  <circle cx="442" cy="442" r="160" opacity="0.2" />
                </svg>
                <span className="text-base font-semibold">Core Sales</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <TwoLevelNav />
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
