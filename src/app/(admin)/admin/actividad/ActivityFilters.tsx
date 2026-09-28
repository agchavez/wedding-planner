"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "", label: "Todo" },
  { value: "auth", label: "Accesos" },
  { value: "data", label: "Cambios en bodas" },
  { value: "admin", label: "Administración" },
];

const ALL = "all";

/** Filtros de la auditoría: se aplican al cambiar, sin botón, y viven en la URL. */
export function ActivityFilters({ weddings }: { weddings: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(params.get("q") ?? "");

  function update(patch: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value && value !== ALL) next.set(key, value);
      else next.delete(key);
    }
    next.delete("page");
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  // La búsqueda se aplica medio segundo después de dejar de escribir.
  useEffect(() => {
    if (query === (params.get("q") ?? "")) return;
    const timeout = setTimeout(() => update({ q: query.trim() }), 500);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const category = params.get("categoria") ?? "";
  const weddingNames: Record<string, string> = { [ALL]: "Todas las bodas", ...Object.fromEntries(weddings.map((w) => [w.id, w.name])) };
  const hasFilters = ["categoria", "q", "boda", "result", "actor"].some((k) => params.get(k));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Tipo de evento">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => update({ categoria: c.value })}
            aria-pressed={category === c.value}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm transition-colors",
              category === c.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
            )}
          >
            {c.label}
          </button>
        ))}
        {isPending && <LoaderCircle className="ml-2 size-4 animate-spin text-muted-foreground" aria-label="Filtrando" />}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar texto, correo o IP"
            className="pl-8"
            aria-label="Buscar en la auditoría"
          />
        </div>
        <Select value={params.get("boda") || ALL} onValueChange={(v) => update({ boda: v ?? ALL })}>
          <SelectTrigger className="w-full sm:w-56" aria-label="Boda">
            <SelectValue>{(value: string) => weddingNames[value] ?? "Boda"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas las bodas</SelectItem>
            {weddings.map((w) => (
              <SelectItem key={w.id} value={w.id}>
                {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={params.get("result") || ALL} onValueChange={(v) => update({ result: v ?? ALL })}>
          <SelectTrigger className="w-full sm:w-48" aria-label="Resultado">
            <SelectValue>{(value: string) => (value === "failed" ? "Solo fallidos" : "Todos los resultados")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los resultados</SelectItem>
            <SelectItem value="failed">Solo fallidos</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              startTransition(() => router.replace(pathname, { scroll: false }));
            }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Quitar filtros
          </button>
        )}
      </div>
    </div>
  );
}
