"use client";

import { Pencil, Store, Trash2 } from "lucide-react";
import { deleteVendor } from "@/app/(app)/configuracion/vendors-actions";
import { VendorFormDialog } from "@/app/(app)/configuracion/VendorFormDialog";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Vendor } from "@/generated/prisma";

export function VendorCard({ vendor }: { vendor: Vendor }) {

  return (
    <Card size="sm">
      <CardContent className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Store className="size-4" />
          </div>
          <div>
            <p className="font-medium text-foreground">{vendor.name}</p>
            <p className="text-xs text-muted-foreground">
              {[vendor.contactName, vendor.phone].filter(Boolean).join(" · ") || "Sin datos de contacto"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <VendorFormDialog
            vendor={vendor}
            triggerRender={<Button variant="outline" size="icon-sm" />}
            triggerChildren={
              <>
                <Pencil className="size-3.5" />
                <span className="sr-only">Editar</span>
              </>
            }
          />
          <ConfirmDeleteDialog
            triggerRender={<Button variant="outline" size="icon-sm" />}
            triggerChildren={
              <>
                <Trash2 className="size-3.5 text-destructive" />
                <span className="sr-only">Eliminar</span>
              </>
            }
            title={`¿Eliminar el proveedor "${vendor.name}"?`}
            description="Esta acción no se puede deshacer."
            onConfirm={() => deleteVendor(vendor.id)}
            successMessage="Proveedor eliminado"
          />
        </div>
      </CardContent>
    </Card>
  );
}
