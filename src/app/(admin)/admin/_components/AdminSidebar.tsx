"use client";

import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { usePathname } from "next/navigation";
import { Activity, ArrowLeft, Gauge, Heart, MonitorSmartphone, Users } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { UserMenu, type SidebarUser } from "@/components/AppSidebar";

const LINKS = [
  { href: "/admin", label: "Resumen", icon: Gauge },
  { href: "/admin/bodas", label: "Bodas", icon: Heart },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users },
  { href: "/admin/actividad", label: "Actividad y auditoría", icon: Activity },
  { href: "/admin/sesiones", label: "Sesiones activas", icon: MonitorSmartphone },
];

export function AdminSidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link href="/admin" className="flex items-center gap-2 px-2 py-1.5">
          <BrandMark />
          <span className="grid leading-tight group-data-[collapsible=icon]:hidden">
            <span className="font-heading text-lg font-semibold text-primary">Wedplan</span>
            <span className="text-xs text-muted-foreground">Consola de administración</span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Plataforma</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {LINKS.map((link) => (
                <SidebarMenuItem key={link.href}>
                  <SidebarMenuButton isActive={isActive(link.href)} tooltip={link.label} render={<Link href={link.href} />}>
                    <link.icon />
                    <span>{link.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Volver a la app" render={<Link href="/" />}>
                  <ArrowLeft />
                  <span>Volver a la app</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <UserMenu user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
