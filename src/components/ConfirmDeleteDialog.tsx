"use client";

import { useTransition, type ReactElement, type ReactNode } from "react";
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

export function ConfirmDeleteDialog({
  triggerRender,
  triggerChildren,
  title,
  description,
  onConfirm,
}: {
  triggerRender: ReactElement;
  triggerChildren: ReactNode;
  title: string;
  description: string;
  onConfirm: () => void | Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

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
            render={<Button variant="destructive" disabled={isPending} />}
            onClick={() => startTransition(() => onConfirm())}
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
