"use client";

import { useRef, useState, useTransition, type ReactElement, type ReactNode } from "react";
import { toast } from "sonner";
import { CATALOG_NAME_MAX } from "@/lib/catalog";
import { useWeddingAccess } from "@/components/WeddingAccess";
import { createAccount, updateAccount } from "@/app/(app)/configuracion/accounts-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Account } from "@/generated/prisma";

export function AccountFormDialog({
  account,
  triggerRender,
  triggerChildren,
}: {
  account?: Account;
  triggerRender: ReactElement;
  triggerChildren: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { canEdit } = useWeddingAccess();
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = Boolean(account);

  // Los roles de solo lectura no ven controles de edición (el servidor también lo impide).
  if (!canEdit) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={triggerRender}>{triggerChildren}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar cuenta" : "Nueva cuenta"}</DialogTitle>
        </DialogHeader>
        <form
          ref={formRef}
          id="account-form"
          action={(formData) => {
            startTransition(async () => {
              try {
                const result = account
                  ? await updateAccount(account.id, formData)
                  : await createAccount(formData);
                if (result?.error) {
                  toast.error(result.error);
                  return;
                }
                formRef.current?.reset();
                setOpen(false);
                toast.success(account ? "Cuenta actualizada" : "Cuenta creada");
              } catch {
                toast.error("No se pudo guardar el cambio. Revisa los datos e inténtalo de nuevo.");
              }
            });
          }}
          className="space-y-3"
        >
          <div>
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" maxLength={CATALOG_NAME_MAX} defaultValue={account?.name} placeholder="Ej. Cuenta de ahorros" required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" name="notes" defaultValue={account?.notes} rows={2} className="mt-1" />
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="account-form" disabled={isPending}>
            {isPending ? "Guardando..." : isEdit ? "Guardar cambios" : "Agregar cuenta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
