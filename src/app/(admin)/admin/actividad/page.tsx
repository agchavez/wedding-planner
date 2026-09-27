import Link from "next/link";
import { KeyRound } from "lucide-react";
import { CATEGORY_LABEL, PageHeader } from "@/app/(admin)/admin/_components/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { describeUserAgent, getAuditPage } from "@/lib/admin-data";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { weddingDisplayName } from "@/lib/wedding";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const CATEGORIES = [
  { value: "", label: "Todo" },
  { value: "auth", label: "Accesos" },
  { value: "data", label: "Cambios en bodas" },
  { value: "admin", label: "Administración" },
];

const selectClass =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export default async function AdminActivityPage({ searchParams }: PageProps<"/admin/actividad">) {
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");
  const filters = {
    category: str(sp.categoria),
    result: str(sp.result),
    q: str(sp.q),
    weddingId: str(sp.boda),
    actorId: str(sp.actor),
    page: Number(str(sp.page)) || 1,
  };

  const [{ rows, total, page, pageSize }, weddings] = await Promise.all([
    getAuditPage(filters),
    prisma.wedding.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, partner1: true, partner2: true } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const buildHref = (patch: Record<string, string | number>) => {
    const params = new URLSearchParams();
    const merged = { categoria: filters.category, result: filters.result, q: filters.q, boda: filters.weddingId, actor: filters.actorId, page: String(page), ...patch };
    for (const [k, v] of Object.entries(merged)) if (v && !(k === "page" && v === "1")) params.set(k, String(v));
    const qs = params.toString();
    return qs ? `/admin/actividad?${qs}` : "/admin/actividad";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Actividad y auditoría"
        description="Registro de accesos, cambios en las bodas y acciones de administración. Se conserva 180 días."
      />

      <div className="space-y-3">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Tipo de evento">
          {CATEGORIES.map((c) => (
            <Link
              key={c.value}
              href={buildHref({ categoria: c.value, page: 1 })}
              aria-current={filters.category === c.value ? "page" : undefined}
              className={cn(
                "rounded-full px-3 py-1 text-sm transition-colors",
                filters.category === c.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
              )}
            >
              {c.label}
            </Link>
          ))}
        </div>
        <form className="flex flex-wrap items-center gap-2" action="/admin/actividad">
          {filters.category && <input type="hidden" name="categoria" value={filters.category} />}
          {filters.actorId && <input type="hidden" name="actor" value={filters.actorId} />}
          <Input name="q" defaultValue={filters.q} placeholder="Buscar texto, correo o IP" className="w-64" />
          <select name="boda" defaultValue={filters.weddingId} className={selectClass} aria-label="Boda">
            <option value="">Todas las bodas</option>
            {weddings.map((w) => (
              <option key={w.id} value={w.id}>
                {weddingDisplayName(w)}
              </option>
            ))}
          </select>
          <select name="result" defaultValue={filters.result} className={selectClass} aria-label="Resultado">
            <option value="">Todos los resultados</option>
            <option value="failed">Solo fallidos</option>
          </select>
          <Button type="submit" size="sm">
            Filtrar
          </Button>
          {(filters.q || filters.weddingId || filters.result || filters.actorId || filters.category) && (
            <Link href="/admin/actividad" className="text-sm text-muted-foreground hover:text-foreground">
              Quitar filtros
            </Link>
          )}
        </form>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Quién</th>
              <th className="px-4 py-3 font-medium">Qué pasó</th>
              <th className="px-4 py-3 font-medium">Boda</th>
              <th className="px-4 py-3 font-medium">Origen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.id} className={cn("align-top", !r.success && "bg-red-500/5")}>
                <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-muted-foreground">{formatDateTime(r.createdAt)}</td>
                <td className="px-4 py-2.5">
                  <p className="font-medium text-foreground">{r.actorName || "—"}</p>
                  <p className="text-xs text-muted-foreground">{r.actorEmail}</p>
                </td>
                <td className="px-4 py-2.5">
                  <p className="flex items-start gap-1.5 text-foreground">
                    {!r.success && <KeyRound className="mt-0.5 size-3.5 shrink-0 text-red-600" aria-label="Fallido" />}
                    {r.summary}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {CATEGORY_LABEL[r.category] ?? r.category} · <code className="font-mono">{r.action}</code>
                  </p>
                </td>
                <td className="px-4 py-2.5">
                  {r.weddingId ? (
                    <Link href={`/admin/bodas/${r.weddingId}`} className="text-foreground hover:underline">
                      {r.weddingName}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">
                  <p className="font-mono">{r.ip || "—"}</p>
                  <p>{describeUserAgent(r.userAgent)}</p>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  No hay eventos con estos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>
          {total} {total === 1 ? "evento" : "eventos"} · página {page} de {pages}
        </p>
        <div className="flex gap-2">
          {page > 1 && (
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href={buildHref({ page: page - 1 })} />}>
              Anterior
            </Button>
          )}
          {page < pages && (
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href={buildHref({ page: page + 1 })} />}>
              Siguiente
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
