"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

// En producción Next.js oculta el mensaje de los errores del servidor, así que el texto
// cubre el caso más común (rol de solo lectura) y cualquier otro fallo.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="font-heading text-2xl font-semibold text-foreground">No se pudo guardar el cambio</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Si tu rol en esta boda es de solo lectura, pide a la pareja o a un organizador que lo cambie. Si no, vuelve a
        intentarlo en un momento.
      </p>
      {error.digest && <p className="mt-3 font-mono text-xs text-muted-foreground">Código: {error.digest}</p>}
      <Button className="mt-6" onClick={reset}>
        Volver
      </Button>
    </div>
  );
}
