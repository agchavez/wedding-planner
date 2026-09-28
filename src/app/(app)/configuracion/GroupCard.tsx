"use client";

import { useTransition } from "react";
import { Pencil, Trash2, Users } from "lucide-react";
import { deleteGroup } from "@/app/(app)/configuracion/groups-actions";
import { GroupFormDialog } from "@/app/(app)/configuracion/GroupFormDialog";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { GuestGroup } from "@/generated/prisma";

export function GroupCard({ group }: { group: GuestGroup }) {
  const [, startTransition] = useTransition();

  return (
    <Card size="sm">
      <CardContent className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Users className="size-4" />
          </div>
          <p className="font-medium text-foreground">{group.name}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <GroupFormDialog
            group={group}
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
            title={`¿Eliminar el grupo "${group.name}"?`}
            description="Los invitados que ya lo usaban conservan el nombre como texto libre. Esta acción no se puede deshacer."
            onConfirm={() => startTransition(() => deleteGroup(group.id))}
          />
        </div>
      </CardContent>
    </Card>
  );
}
