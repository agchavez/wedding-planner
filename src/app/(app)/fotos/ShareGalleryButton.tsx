"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Copia el enlace público (solo lectura) de la galería de fotos/videos/links. */
export function ShareGalleryButton({ weddingId }: { weddingId: string }) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    const url = `${window.location.origin}/galeria/${weddingId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copia el enlace:", url);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick}>
      {copied ? <Check className="size-3.5 text-emerald-600" /> : <Link2 className="size-3.5" />}
      {copied ? "Enlace copiado" : "Compartir galería"}
    </Button>
  );
}
