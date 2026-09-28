"use client";

import { useTransition } from "react";
import { HandCoins, Pencil, Trash2 } from "lucide-react";
import { deleteContribution } from "@/app/(app)/presupuesto/contributions-actions";
import { contributorDisplayLabel } from "@/app/(app)/presupuesto/contributorOptions";
import { ContributionFormDialog } from "@/app/(app)/presupuesto/ContributionFormDialog";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { BudgetContribution } from "@/generated/prisma";

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("es-HN", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
}

function formatDate(date: Date | null) {
  if (!date) return null;
  return new Intl.DateTimeFormat("es-HN", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(date));
}

export function ContributionCard({ contribution, currency }: { contribution: BudgetContribution; currency: string }) {
  const [, startTransition] = useTransition();
  const date = formatDate(contribution.date);

  return (
    <Card size="sm">
      <CardContent className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <HandCoins className="size-4" />
          </div>
          <div>
            <p className="font-medium text-foreground">
              {contributorDisplayLabel(contribution.contributor, contribution.otherLabel)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatMoney(contribution.amount, currency)}
              {date && ` · ${date}`}
              {contribution.notes && ` · ${contribution.notes}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ContributionFormDialog
            contribution={contribution}
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
            title="¿Eliminar este aporte?"
            description="Esta acción no se puede deshacer."
            onConfirm={() => startTransition(() => deleteContribution(contribution.id))}
          />
        </div>
      </CardContent>
    </Card>
  );
}
