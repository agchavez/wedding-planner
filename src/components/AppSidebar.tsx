"use client";

import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarClock,
  Check,
  Images,
  ChevronsUpDown,
  Heart,
  Plus,
  UserRoundPlus,
  KeyRound,
  LayoutDashboard,
  LayoutGrid,
  ListMusic,
  LogOut,
  Receipt,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SettingsSheet } from "@/components/settings-sheet";
import { authClient } from "@/lib/auth-client";
import { roleLabel } from "@/lib/permissions";
import type { WeddingSummary } from "@/lib/wedding";
import type { Wedding } from "@/generated/prisma";

export type SidebarUser = { name: string; email: string; isAdmin: boolean };

const LINK_GROUPS = [
  {
    label: "Principal",
    links: [
      { href: "/", label: "Panel", icon: LayoutDashboard },
      { href: "/invitados", label: "Invitados", icon: Users },
      { href: "/presupuesto", label: "Presupuesto", icon: Wallet },
      { href: "/gastos", label: "Gastos", icon: Receipt },
    ],
  },
  {
    label: "La boda",
    links: [
      { href: "/canciones", label: "Canciones", icon: ListMusic },
      { href: "/linea-tiempo", label: "Línea de tiempo", icon: CalendarClock },
      { href: "/distribucion", label: "Distribución del salón", icon: LayoutGrid },
      { href: "/fotos", label: "Fotos", icon: Images },
    ],
  },
  {
    label: "Sistema",
    links: [
      { href: "/participantes", label: "Participantes", icon: UserRoundPlus },
      { href: "/configuracion", label: "Configuración", icon: Settings },
    ],
  },
];

export function AppSidebar({
  user,
  weddings,
  activeWeddingId,
  wedding,
  canEdit,
}: {
  user: SidebarUser;
  weddings: WeddingSummary[];
  activeWeddingId: string | null;
  wedding: Wedding | null;
  canEdit: boolean;
}) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" variant="floating" className="print:hidden">
      <SidebarHeader>
        <Link href="/" className="flex h-12 items-center gap-2 px-2 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:px-0">
          <BrandMark className="size-8" />
          <span className="font-heading text-lg font-semibold text-primary group-data-[collapsible=icon]:hidden">
            Wedplan
          </span>
        </Link>
        <WeddingSwitcher weddings={weddings} activeWeddingId={activeWeddingId} />
      </SidebarHeader>
      <SidebarContent>
        {LINK_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.links.map((link) => (
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
                {group.label === "Sistema" && user.isAdmin && (
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Consola de administración" render={<Link href="/admin" />}>
                      <ShieldCheck />
                      <span>Consola de administración</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <div className="flex justify-center group-data-[collapsible=icon]:hidden">
          <SettingsSheet wedding={wedding} canEdit={canEdit} />
        </div>
        <UserMenu user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}

export function UserMenu({ user }: { user: SidebarUser }) {
  const router = useRouter();

  async function signOut() {
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
              {initials(user.name)}
            </span>
            <span className="grid flex-1 text-left leading-tight">
              <span className="truncate text-sm font-medium">{user.name}</span>
              <span className="truncate text-xs text-muted-foreground">{user.email}</span>
            </span>
            <ChevronsUpDown className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="min-w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                {user.name}
                {user.isAdmin && <span className="ml-2 text-xs text-muted-foreground">Admin</span>}
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/cuenta")}>
              <KeyRound />
              Mi cuenta
            </DropdownMenuItem>
            {user.isAdmin && (
              <DropdownMenuItem onClick={() => router.push("/admin")}>
                <ShieldCheck />
                Consola de administración
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={signOut}>
              <LogOut />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function WeddingSwitcher({ weddings, activeWeddingId }: { weddings: WeddingSummary[]; activeWeddingId: string | null }) {
  const router = useRouter();
  const active = weddings.find((w) => w.id === activeWeddingId);

  async function switchTo(id: string) {
    if (id === activeWeddingId) return;
    await authClient.organization.setActive({ organizationId: id });
    router.push("/");
    router.refresh();
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger render={<SidebarMenuButton size="lg" className="border border-sidebar-border group-data-[collapsible=icon]:border-0" />}>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Heart className="size-4" />
            </span>
            <span className="grid flex-1 text-left leading-tight">
              <span className="truncate text-sm font-medium">{active?.name ?? "Sin boda"}</span>
              <span className="truncate text-xs text-muted-foreground">
                {active ? roleLabel(active.role) : "Crea o únete a una"}
              </span>
            </span>
            <ChevronsUpDown className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-64">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Tus bodas</DropdownMenuLabel>
              {weddings.map((w) => (
                <DropdownMenuItem key={w.id} onClick={() => switchTo(w.id)}>
                  <Heart className="text-decorative" />
                  <span className="flex-1 truncate">{w.name}</span>
                  <span className="text-xs text-muted-foreground">{roleLabel(w.role)}</span>
                  {w.id === activeWeddingId && <Check className="size-3.5" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/bienvenida?nueva=1")}>
              <Plus />
              Crear otra boda
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
