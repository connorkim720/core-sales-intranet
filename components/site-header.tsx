"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { BellIcon } from "lucide-react";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { AgentDockToggle } from "@/components/agent-dock";
import { CommandPaletteTrigger } from "@/components/command-palette";
import { pageTitle } from "@/lib/page-meta";

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex h-full w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center"
        />
        <h1 className="text-base font-medium leading-none">
          {pageTitle(pathname)}
        </h1>
        <div className="ml-auto flex items-center gap-1">
          <CommandPaletteTrigger />
          <AgentDockToggle />
          <Button variant="ghost" size="icon" className="relative ml-auto">
            <BellIcon className="size-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
