"use client";

import { useTransition, type ReactElement, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useWeddingAccess } from "@/components/WeddingAccess";

/**
 * Confirmación antes de una acción destructiva o sensible. Por defecto es "Eliminar"; con
 * `confirmLabel` y `destructive={false}` sirve para cualquier otra acción que conviene
 * confirmar. Se oculta a los roles de solo lectura salvo `requiresEdit={false}`.
 */
export function ConfirmDeleteDialog({
  triggerRender,
  triggerChildren,
  title,
  description,
  onConfirm,
  confirmLabel = "Eliminar",
  destructive = true,
  successMessage,
  requiresEdit = true,
}: {
  triggerRender: ReactElement;
  triggerChildren: ReactNode;
  title: string;
  description: string;
  /** Si devuelve `{ error }`, se muestra el error; si lanza, se muestra un error genérico. */
  onConfirm: () => unknown | Promise<unknown>;
  confirmLabel?: string;
  destructive?: boolean;
  successMessage?: string;
  requiresEdit?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const { canEdit } = useWeddingAccess();

  if (requiresEdit && !canEdit) return null;

  return (
    <AlertDialog>
      <AlertDialogTrigger render={triggerRender}>{triggerChildren}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel render={<Button variant="outline" />}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            render={<Button variant={destructive ? "destructive" : "default"} disabled={isPending} />}
            onClick={() =>
              startTransition(async () => {
                try {
                  const result = (await onConfirm()) as { error?: string } | void;
                  if (result && typeof result === "object" && result.error) {
                    toast.error(result.error);
                    return;
                  }
                  if (successMessage) toast.success(successMessage);
                } catch {
                  toast.error("No se pudo completar la acción. Inténtalo de nuevo.");
                }
              })
            }
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
