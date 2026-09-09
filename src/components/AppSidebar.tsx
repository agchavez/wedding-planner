"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, LayoutDashboard, LayoutGrid, ListMusic, Receipt, Users, Wallet } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { ThemeSwitcher } from "@/components/theme-switcher";

const LINKS = [
  { href: "/", label: "Panel", icon: LayoutDashboard },
  { href: "/invitados", label: "Invitados", icon: Users },
  { href: "/presupuesto", label: "Presupuesto", icon: Wallet },
  { href: "/gastos", label: "Gastos", icon: Receipt },
  { href: "/canciones", label: "Canciones", icon: ListMusic },
  { href: "/linea-tiempo", label: "Línea de tiempo", icon: CalendarClock },
  { href: "/distribucion", label: "Distribución del salón", icon: LayoutGrid },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" className="print:hidden">
      <SidebarHeader>
        <Link href="/" className="flex items-center gap-2 px-2 py-1.5">
          <span className="text-xl">💍</span>
          <span className="font-heading text-lg font-semibold text-primary group-data-[collapsible=icon]:hidden">
            WeddingPlanner
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {LINKS.map((link) => (
                <SidebarMenuItem key={link.href}>
                  <SidebarMenuButton
                    isActive={pathname === link.href}
                    tooltip={link.label}
                    render={<Link href={link.href} />}
                  >
                    <link.icon />
                    <span>{link.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex justify-center">
          <ThemeSwitcher />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
