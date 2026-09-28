"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Copia el enlace público (solo lectura) de la galería de fotos/videos/links. */
export function ShareGalleryButton({ weddingId }: { weddingId: string }) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    const url = `${window.location.origin}/galeria/${weddingId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Enlace copiado", { description: "Cualquiera con el enlace puede ver la galería, sin poder editarla." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sin permiso de portapapeles: se muestra el enlace para copiarlo a mano.
      toast("Copia este enlace", { description: url, duration: 15000 });
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick}>
      {copied ? <Check className="size-3.5 text-emerald-600" /> : <Link2 className="size-3.5" />}
      {copied ? "Enlace copiado" : "Compartir galería"}
    </Button>
  );
}
