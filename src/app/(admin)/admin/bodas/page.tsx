import Link from "next/link";
import { CalendarDays, MailPlus, Users } from "lucide-react";
import { Avatar, PageHeader, RoleChip } from "@/app/(admin)/admin/_components/ui";
import { getAdminWeddings } from "@/lib/admin-data";
import { daysUntil, formatDate, formatMoney, relativeTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminWeddingsPage() {
  const weddings = await getAdminWeddings();
  const upcoming = weddings.filter((w) => {
    const d = daysUntil(w.weddingDate);
    return d !== null && d >= 0 && d <= 30;
  }).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bodas"
        description={`${weddings.length} bodas en la plataforma${upcoming ? ` · ${upcoming} se celebran en los próximos 30 días` : ""}.`}
      />

      {weddings.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">
          Todavía no hay bodas. Aparecerán aquí cuando los usuarios creen la suya.
        </p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {weddings.map((w) => {
            const days = daysUntil(w.weddingDate);
            const budgetPct = w.totalBudget > 0 ? Math.min(100, Math.round((w.spent / w.totalBudget) * 100)) : null;
            return (
              <li key={w.id}>
                <Link
                  href={`/admin/bodas/${w.id}`}
                  className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate font-heading text-xl font-semibold text-foreground">{w.name}</h2>
                      <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <CalendarDays className="size-3.5" />
                        {w.weddingDate ? formatDate(w.weddingDate) : "Fecha por definir"}
                      </p>
                    </div>
                    {days !== null && (
                      <span className="shrink-0 rounded-full bg-accent px-2.5 py-1 text-xs font-medium tabular-nums text-accent-foreground">
                        {days > 0 ? `en ${days} días` : days === 0 ? "hoy" : "celebrada"}
                      </span>
                    )}
                  </div>

                  <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-muted/50 py-2">
                      <dt className="text-[11px] text-muted-foreground">Invitados</dt>
                      <dd className="text-sm font-semibold tabular-nums text-foreground">
                        {w.confirmedGuests}/{w.guests}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-muted/50 py-2">
                      <dt className="text-[11px] text-muted-foreground">Gastado</dt>
                      <dd className="text-sm font-semibold tabular-nums text-foreground">{formatMoney(w.spent, w.currency)}</dd>
                    </div>
                    <div className="rounded-lg bg-muted/50 py-2">
                      <dt className="text-[11px] text-muted-foreground">Canciones</dt>
                      <dd className="text-sm font-semibold tabular-nums text-foreground">{w.songs}</dd>
                    </div>
                  </dl>
                  {budgetPct !== null && (
                    <div className="mt-3">
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className={budgetPct >= 100 ? "h-full bg-destructive" : "h-full bg-primary"}
                          style={{ width: `${budgetPct}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">{budgetPct}% del presupuesto usado</p>
                    </div>
                  )}

                  <div className="mt-4 flex-1 space-y-1.5 border-t border-border pt-3">
                    {w.members.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Sin participantes</p>
                    ) : (
                      w.members.slice(0, 3).map((m) => (
                        <div key={m.userId} className="flex items-center gap-2 text-sm">
                          <Avatar name={m.name} className="size-6 text-[10px]" />
                          <span className="min-w-0 flex-1 truncate text-foreground">{m.name}</span>
                          <RoleChip role={m.role} />
                        </div>
                      ))
                    )}
                    {w.members.length > 3 && <p className="text-xs text-muted-foreground">y {w.members.length - 3} más</p>}
                  </div>

                  <p className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="size-3.5" />
                      {w.members.length}
                    </span>
                    {w.pendingInvites > 0 && (
                      <span className="flex items-center gap-1">
                        <MailPlus className="size-3.5" />
                        {w.pendingInvites} por aceptar
                      </span>
                    )}
                    <span className="ml-auto">Último cambio {relativeTime(w.lastActivity).toLowerCase()}</span>
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
