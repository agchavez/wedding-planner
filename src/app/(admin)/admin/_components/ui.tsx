import type { ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CircleCheck,
  CircleX,
  KeyRound,
  LogIn,
  Pencil,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { AuditRow, HealthLevel } from "@/lib/admin-data";
import { formatDateTime, initials, relativeTime, formatIp } from "@/lib/format";
import { roleLabel, type WeddingRole } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export { PageHeader } from "@/components/PageHeader";

/** Cifra principal con etiqueta; `hint` da contexto (p. ej. "+3 esta semana"). */
export function StatTile({
  label,
  value,
  hint,
  href,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  tone?: "default" | "warning";
}) {
  const body = (
    <div
      className={cn(
        "h-full rounded-2xl border bg-card px-5 py-4 transition-colors",
        tone === "warning" ? "border-amber-500/40" : "border-border",
        href && "hover:border-primary/40"
      )}
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-heading text-3xl font-semibold tabular-nums text-foreground">{value}</p>
      {hint && (
        <p className={cn("mt-1 text-xs", tone === "warning" ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground")}>
          {hint}
        </p>
      )}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

const HEALTH: Record<HealthLevel, { icon: LucideIcon; label: string; className: string }> = {
  good: { icon: CircleCheck, label: "Normal", className: "text-emerald-700 bg-emerald-500/10 dark:text-emerald-400" },
  warning: { icon: AlertTriangle, label: "Atención", className: "text-amber-700 bg-amber-500/10 dark:text-amber-400" },
  critical: { icon: CircleX, label: "Crítico", className: "text-red-700 bg-red-500/10 dark:text-red-400" },
};

export function HealthPill({ level }: { level: HealthLevel }) {
  const h = HEALTH[level];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", h.className)}>
      <h.icon className="size-3.5" />
      {h.label}
    </span>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground",
        className
      )}
    >
      {initials(name)}
    </span>
  );
}

export function RoleChip({ role }: { role: WeddingRole }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        role === "owner" ? "bg-primary/10 text-primary" : "bg-secondary text-secondary-foreground"
      )}
    >
      {roleLabel(role)}
    </span>
  );
}

const CATEGORY_ICON: Record<string, LucideIcon> = { auth: LogIn, data: Pencil, admin: ShieldCheck };
export const CATEGORY_LABEL: Record<string, string> = { auth: "Acceso", data: "Boda", admin: "Administración" };

/** Línea de tiempo de eventos de auditoría. */
export function ActivityFeed({ rows, showWedding = true }: { rows: AuditRow[]; showWedding?: boolean }) {
  if (rows.length === 0) {
    return <p className="px-1 py-6 text-center text-sm text-muted-foreground">Todavía no hay actividad registrada.</p>;
  }
  return (
    <ol className="divide-y divide-border">
      {rows.map((row) => {
        const Icon = row.success ? (CATEGORY_ICON[row.category] ?? Pencil) : KeyRound;
        return (
          <li key={row.id} className="flex gap-3 py-3">
            <span
              className={cn(
                "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                row.success ? "bg-accent text-accent-foreground" : "bg-red-500/10 text-red-700 dark:text-red-400"
              )}
            >
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground">
                <span className="font-medium">{row.actorName || row.actorEmail || "Sistema"}</span>{" "}
                <span className="text-muted-foreground">{lowerFirst(row.summary)}</span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                <time dateTime={row.createdAt} title={formatDateTime(row.createdAt)}>
                  {relativeTime(row.createdAt)}
                </time>
                {showWedding && row.weddingId && (
                  <>
                    {" · "}
                    <Link href={`/admin/bodas/${row.weddingId}`} className="hover:text-foreground hover:underline">
                      {row.weddingName}
                    </Link>
                  </>
                )}
                {row.ip && <span className="break-all">{` · ${formatIp(row.ip)}`}</span>}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function lowerFirst(text: string) {
  return text ? text[0].toLowerCase() + text.slice(1) : text;
}

export function Panel({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("min-w-0 rounded-2xl border border-border bg-card", className)}>
      <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="font-medium text-foreground">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {action}
      </header>
      <div className="px-5 py-2">{children}</div>
    </section>
  );
}
