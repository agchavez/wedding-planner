"use client";

import { useState } from "react";
import { Check, Copy, Download, ExternalLink, QrCode } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** Enlace y QR de la página donde los invitados suben sus fotos (llegan a "Fotos de la boda"). */
export function GuestShareCard({ weddingId }: { weddingId: string }) {
  const [copied, setCopied] = useState(false);
  const path = `/compartir/${weddingId}`;

  async function copy() {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Enlace copiado");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Copia este enlace", { description: url, duration: 15000 });
    }
  }

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${path}/qr`} alt="QR para subir fotos" className="mx-auto size-28 shrink-0 rounded-lg border border-border bg-white p-2 sm:mx-0" />
        <div className="min-w-0 flex-1 space-y-1 text-center sm:text-left">
          <p className="flex items-center justify-center gap-2 font-medium text-foreground sm:justify-start">
            <QrCode className="size-4" />
            Enlace para que los invitados suban fotos
          </p>
          <p className="text-sm text-muted-foreground">
            Pon el QR en las mesas. Se puede subir desde un día antes de la boda hasta 30 días después; ustedes, con
            sesión iniciada, pueden probarlo cuando quieran.
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-2 sm:justify-start">
            <Button variant="outline" size="sm" onClick={copy}>
              {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
              {copied ? "Copiado" : "Copiar enlace"}
            </Button>
            <Button variant="outline" size="sm" render={<a href={path} target="_blank" rel="noopener noreferrer" />}>
              <ExternalLink className="size-3.5" />
              Abrir página
            </Button>
            <Button variant="outline" size="sm" render={<a href={`${path}/qr`} download="qr-fotos-boda.svg" />}>
              <Download className="size-3.5" />
              Descargar QR
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
