"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { SettingsSheet } from "@/components/settings-sheet";
import { Separator } from "@/components/ui/separator";
import type { Wedding } from "@/generated/prisma";

export function SiteHeader({ wedding = null, canEdit = false }: { wedding?: Wedding | null; canEdit?: boolean }) {
  const partner1 = wedding?.partner1 ?? "";
  const partner2 = wedding?.partner2 ?? "";
  const coupleNames = partner1 && partner2 ? `${partner1} & ${partner2}` : partner1 || partner2 || "";

  return (
    <div className="sticky top-0 z-40 px-3 pt-3 print:hidden">
      <header className="flex h-14 shrink-0 items-center gap-2 rounded-xl border border-border/70 bg-card/80 px-4 shadow-sm backdrop-blur-md">
        <SidebarTrigger />
        <Separator orientation="vertical" className="data-vertical:h-4 data-vertical:self-center" />
        <span className="truncate font-heading text-base font-medium text-primary">{coupleNames || "Wedplan"}</span>
        <div className="ml-auto md:hidden">
          <SettingsSheet wedding={wedding} canEdit={canEdit} />
        </div>
      </header>
    </div>
  );
}
