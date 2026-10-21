"use client";

import { Check, Link2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { WhatsAppIcon } from "@/app/(app)/invitaciones/WhatsAppIcon";

/** Compartir una invitación de ejemplo para ver la tarjeta en WhatsApp. */
export function ShareExampleButtons({ path, couple }: { path: string; couple: string }) {
  const [copied, setCopied] = useState(false);
  const url = () => `${window.location.origin}${path}`;

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() =>
          window.open(`https://wa.me/?text=${encodeURIComponent(`Mira la invitación de ${couple} 💌\n${url()}`)}`, "_blank", "noopener")
        }
        className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#25D366] px-3 text-sm font-medium text-white transition-colors hover:bg-[#1ebe5a]"
      >
        <WhatsAppIcon className="size-4" />
        Probar en WhatsApp
      </button>
      <button
        type="button"
        aria-label="Copiar enlace"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url());
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            toast("Copia este enlace", { description: url() });
          }
        }}
        className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-card transition-colors hover:bg-muted"
      >
        {copied ? <Check className="size-4 text-emerald-600" /> : <Link2 className="size-4" />}
      </button>
    </div>
  );
}
