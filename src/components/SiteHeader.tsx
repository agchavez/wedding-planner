"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Separator } from "@/components/ui/separator";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card/95 px-4 backdrop-blur print:hidden">
      <SidebarTrigger />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <span className="font-heading text-base font-medium text-primary md:hidden">WeddingPlanner</span>
      <div className="ml-auto md:hidden">
        <ThemeSwitcher />
      </div>
    </header>
  );
}
