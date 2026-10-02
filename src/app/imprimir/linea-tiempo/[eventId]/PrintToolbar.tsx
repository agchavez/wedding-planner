"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Barra de la vista previa: no sale en el papel. */
export function PrintToolbar({ backHref }: { backHref: string }) {
  return (
    <div className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-[210mm] items-center justify-between gap-3 px-4 py-3">
        <Button variant="ghost" nativeButton={false} render={<Link href={backHref} />}>
          <ArrowLeft className="size-4" />
          Volver
        </Button>
        <p className="hidden text-sm text-muted-foreground sm:block">Vista previa · tamaño A4</p>
        <Button onClick={() => window.print()}>
          <Printer className="size-4" />
          Imprimir o guardar PDF
        </Button>
      </div>
    </div>
  );
}
