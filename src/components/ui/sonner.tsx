"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

/** Avisos breves de éxito o error, con los colores del tema activo. */
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="bottom-right"
      closeButton
      toastOptions={{
        classNames: {
          toast: "!rounded-xl !border-border !bg-popover !text-popover-foreground !shadow-lg",
          description: "!text-muted-foreground",
          error: "!text-destructive",
        },
      }}
      {...props}
    />
  );
}
