import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ActivityFeed, Avatar, PageHeader, Panel, RoleChip, StatTile } from "@/app/(admin)/admin/_components/ui";
import { getAdminWeddings, getRecentActivity } from "@/lib/admin-data";
import { daysUntil, formatDate, formatMoney, relativeTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminWeddingDetailPage({ params }: PageProps<"/admin/bodas/[id]">) {
  const { id } = await params;
  if (!/^[a-f0-9]{24}$/.test(id)) notFound();

  const [[wedding], activity, timelineCount, eventCount] = await Promise.all([
    getAdminWeddings(id),
    getRecentActivity(40, { weddingId: id }),
    prisma.timelineEvent.count({ where: { weddingId: id } }),
    prisma.weddingEvent.count({ where: { weddingId: id } }),
  ]);
  if (!wedding) notFound();

  const days = daysUntil(wedding.weddingDate);

  return (
    <div className="space-y-6">
      <Link href="/admin/bodas" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Todas las bodas
      </Link>
      <PageHeader
        title={wedding.name}
        description={[
          wedding.weddingDate ? formatDate(wedding.weddingDate) : "Fecha por definir",
          wedding.venueName || null,
          `creada ${relativeTime(wedding.createdAt).toLowerCase()}`,
        ]
          .filter(Boolean)
          .join(" · ")}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Faltan"
          value={days === null ? "—" : days >= 0 ? `${days} días` : "Celebrada"}
          hint={wedding.weddingDate ? formatDate(wedding.weddingDate) : "Sin fecha"}
        />
        <StatTile label="Invitados confirmados" value={`${wedding.confirmedGuests}/${wedding.guests}`} />
        <StatTile
          label="Gastado"
          value={formatMoney(wedding.spent, wedding.currency)}
          hint={wedding.totalBudget ? `de ${formatMoney(wedding.totalBudget, wedding.currency)}` : "Sin presupuesto total"}
          tone={wedding.totalBudget > 0 && wedding.spent > wedding.totalBudget ? "warning" : "default"}
        />
        <StatTile label="Planificación" value={timelineCount} hint={`momentos en ${eventCount || 1} evento(s) · ${wedding.songs} canciones`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Panel title="Historial de la boda" description="Todo lo que cambiaron sus participantes.">
          <ActivityFeed rows={activity} showWedding={false} />
          {activity.length >= 40 && (
            <Link href={`/admin/actividad?boda=${wedding.id}`} className="block py-3 text-center text-sm text-primary hover:underline">
              Ver historial completo
            </Link>
          )}
        </Panel>

        <Panel title="Participantes" description={`${wedding.members.length} personas${wedding.pendingInvites ? ` · ${wedding.pendingInvites} invitaciones pendientes` : ""}`}>
          <ul className="divide-y divide-border">
            {wedding.members.map((m) => (
              <li key={m.userId} className="flex items-center gap-3 py-3">
                <Avatar name={m.name} />
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/actividad?actor=${m.userId}`} className="block truncate text-sm font-medium text-foreground hover:underline">
                    {m.name}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                </div>
                <RoleChip role={m.role} />
              </li>
            ))}
            {wedding.members.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">Sin participantes</li>}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
