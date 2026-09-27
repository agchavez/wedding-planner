import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { ActivityChart } from "@/app/(admin)/admin/_components/ActivityChart";
import { ActivityFeed, HealthPill, PageHeader, Panel, StatTile } from "@/app/(admin)/admin/_components/ui";
import { getOverview, getRecentActivity, getSystemHealth } from "@/lib/admin-data";
import { relativeTime, formatIp } from "@/lib/format";

export const dynamic = "force-dynamic";

const FAILED_LOGIN_ALERT = 10;

export default async function AdminOverviewPage() {
  const [overview, health, recent] = await Promise.all([getOverview(), getSystemHealth(), getRecentActivity(12)]);
  const suspicious = overview.failedByIp.filter((f) => f.count >= 3);

  return (
    <div className="space-y-6">
      <PageHeader title="Resumen" description="Estado de la plataforma, uso de las bodas y señales de seguridad." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Bodas"
          value={overview.totalWeddings}
          hint={`${overview.activeWeddings7d} con cambios esta semana`}
          href="/admin/bodas"
        />
        <StatTile
          label="Usuarios"
          value={overview.totalUsers}
          hint={
            overview.newUsers7d
              ? `${overview.newUsers7d} nuevos esta semana${overview.bannedUsers ? ` · ${overview.bannedUsers} suspendidos` : ""}`
              : overview.bannedUsers
                ? `${overview.bannedUsers} suspendidos`
                : "Sin altas esta semana"
          }
          href="/admin/usuarios"
        />
        <StatTile
          label="Sesiones activas"
          value={overview.activeSessions}
          hint={`${overview.signIns24h} inicios de sesión en 24 h`}
          href="/admin/sesiones"
        />
        <StatTile
          label="Accesos fallidos (24 h)"
          value={overview.failed24h}
          hint={overview.failed24h >= FAILED_LOGIN_ALERT ? "Más de lo normal: revisa las IPs" : "Dentro de lo normal"}
          tone={overview.failed24h >= FAILED_LOGIN_ALERT ? "warning" : "default"}
          href="/admin/actividad?result=failed"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Panel title="Actividad en las bodas" description="Cambios hechos por los participantes, por día.">
          <div className="py-3">
            <ActivityChart series={overview.series} />
          </div>
        </Panel>

        <Panel title="Salud del sistema" description="Se mide al cargar esta página.">
          <ul className="divide-y divide-border">
            {health.map((check) => (
              <li key={check.label} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{check.label}</p>
                  <p className="text-xs text-muted-foreground">{check.detail}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm tabular-nums text-foreground">{check.value}</p>
                  <HealthPill level={check.level} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Panel
          title="Actividad reciente"
          action={
            <Link href="/admin/actividad" className="text-sm text-primary hover:underline">
              Ver todo
            </Link>
          }
        >
          <ActivityFeed rows={recent} />
        </Panel>

        <Panel title="Seguridad" description="IPs con intentos fallidos en las últimas 24 h.">
          {suspicious.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Sin actividad sospechosa.</p>
          ) : (
            <ul className="divide-y divide-border">
              {suspicious.map((f) => (
                <li key={f.ip} className="flex gap-3 py-3">
                  <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">
                      <Link href={`/admin/actividad?q=${encodeURIComponent(f.ip)}`} className="break-all font-mono hover:underline">
                        {formatIp(f.ip)}
                      </Link>{" "}
                      <span className="text-muted-foreground">· {f.count} intentos</span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {f.emails.slice(0, 2).join(", ") || "sin correo"} · {relativeTime(f.last)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
