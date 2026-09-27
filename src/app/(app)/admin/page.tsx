import type { Metadata } from "next";
import { headers } from "next/headers";
import { Heart, ShieldCheck, UserX, Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { Card, CardContent } from "@/components/ui/card";
import { AdminUsers, type AdminUserRow, type WeddingOption } from "@/app/(app)/admin/AdminUsers";

export const metadata: Metadata = { title: "Administración · WeddingPlanner" };
export const dynamic = "force-dynamic";

function weddingLabel(w: { partner1: string; partner2: string; id: string }) {
  const names = [w.partner1, w.partner2].filter(Boolean).join(" & ");
  return names || `Boda sin nombre (${w.id.slice(-6)})`;
}

export default async function AdminPage() {
  const session = await requireAdmin();

  const [{ users }, weddings] = await Promise.all([
    auth.api.listUsers({ headers: await headers(), query: { limit: 500, sortBy: "createdAt", sortDirection: "desc" } }),
    prisma.wedding.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  const weddingOptions: WeddingOption[] = weddings.map((w) => ({
    id: w.id,
    label: weddingLabel(w),
    date: w.weddingDate?.toISOString() ?? null,
  }));
  const labelById = new Map(weddingOptions.map((w) => [w.id, w.label]));

  const rows: AdminUserRow[] = users.map((u) => {
    const weddingId = (u as { weddingId?: string | null }).weddingId ?? null;
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role === "admin" ? "admin" : "user",
      banned: Boolean(u.banned),
      createdAt: new Date(u.createdAt).toISOString(),
      weddingId,
      weddingLabel: weddingId ? (labelById.get(weddingId) ?? null) : null,
    };
  });

  const activeWeddings = new Set(rows.map((r) => r.weddingId).filter(Boolean)).size;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground sm:text-3xl">Administración</h1>
        <p className="text-sm text-muted-foreground">
          Crea cuentas, asigna cada usuario a su boda y controla quién tiene acceso.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={Users} label="Usuarios" value={rows.length} />
        <Stat icon={ShieldCheck} label="Administradores" value={rows.filter((r) => r.role === "admin").length} />
        <Stat icon={Heart} label="Bodas con usuarios" value={activeWeddings} />
        <Stat icon={UserX} label="Suspendidos" value={rows.filter((r) => r.banned).length} />
      </div>

      <AdminUsers users={rows} weddings={weddingOptions} currentUserId={session.user.id} />
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Icon className="size-4" />
        </div>
        <div>
          <p className="text-xl font-semibold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
