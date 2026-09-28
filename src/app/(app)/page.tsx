import Link from "next/link";
import { ArrowRight, CalendarClock, LayoutGrid, ListMusic, Users, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getActiveWeddingId } from "@/lib/wedding";
import { getBudgetAlerts } from "@/lib/budgetAlerts";
import { WeddingForm } from "@/app/(app)/WeddingForm";
import { AlertBanner } from "@/components/AlertBanner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { effectiveBudget, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

function daysUntil(date: Date | null) {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default async function DashboardPage() {
  const weddingId = await getActiveWeddingId();

  const [wedding, guests, expenses, contributions, songsCount, eventsCount, alerts, categories] = await Promise.all([
    prisma.wedding.findUnique({ where: { id: weddingId } }),
    prisma.guest.findMany({ where: { weddingId } }),
    prisma.expense.findMany({ where: { weddingId } }),
    prisma.budgetContribution.findMany({ where: { weddingId } }),
    prisma.song.count({ where: { weddingId } }),
    prisma.timelineEvent.count({ where: { weddingId } }),
    getBudgetAlerts(),
    prisma.expenseCategory.findMany({ where: { weddingId }, select: { estimatedBudget: true } }),
  ]);

  const currency = wedding?.currency ?? "HNL";
  const confirmed = guests.filter((g) => g.rsvpStatus === "confirmed");
  const pending = guests.filter((g) => g.rsvpStatus === "pending");
  const declined = guests.filter((g) => g.rsvpStatus === "declined");
  const totalAttending = confirmed.reduce((sum, g) => sum + 1 + g.plusOnes, 0);
  const totalActual = expenses.reduce((sum, e) => sum + e.actualAmount, 0);
  const totalBudget = contributions.reduce((sum, c) => sum + c.amount, 0);
  const days = daysUntil(wedding?.weddingDate ?? null);
  // Presupuesto: la suma de los aportes o, si no hay, lo estimado en las categorías.
  const budget = effectiveBudget(totalBudget, categories.map((c) => c.estimatedBudget));

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-secondary/60 to-card px-6 py-10 sm:px-10 sm:py-14">
        <WeddingForm wedding={wedding!} />
        {days !== null && (
          <div className="mt-5 flex justify-center">
            <Badge className="px-3 py-1 text-sm" variant="secondary">
              {days > 0 ? `Faltan ${days} días para la boda` : days === 0 ? "¡Es hoy! 🎉" : "La boda ya pasó"}
            </Badge>
          </div>
        )}
      </section>

      <AlertBanner alerts={alerts} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          href="/invitados"
          icon={Users}
          title="Invitados"
          value={`${totalAttending} asistentes`}
          detail={`${confirmed.length} confirmados · ${pending.length} pendientes · ${declined.length} rechazados`}
        />
        <DashboardCard
          href="/presupuesto"
          icon={Wallet}
          title="Presupuesto"
          value={formatMoney(totalActual, currency)}
          detail={budget.amount > 0 ? `de ${formatMoney(budget.amount, currency)} ${budget.source === "total" ? "en aportes" : "estimado"}` : "Sin presupuesto definido"}
        />
        <DashboardCard
          href="/canciones"
          icon={ListMusic}
          title="Canciones"
          value={`${songsCount}`}
          detail="canciones en la lista"
        />
        <DashboardCard
          href="/linea-tiempo"
          icon={CalendarClock}
          title="Línea de tiempo"
          value={`${eventsCount}`}
          detail="momentos planificados"
        />
      </div>

      <Link href="/distribucion">
        <Card className="transition-shadow hover:shadow-md">
          <CardContent className="flex items-center gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <LayoutGrid className="size-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">Editor de distribución del salón</p>
              <p className="text-sm text-muted-foreground">Mesas, escenario, pista de baile y área de fotos</p>
            </div>
            <ArrowRight className="size-4 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}

function DashboardCard({
  href,
  icon: Icon,
  title,
  value,
  detail,
}: {
  href: string;
  icon: typeof Users;
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <Link href={href}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardContent className="space-y-1">
          <div className="mb-1 flex size-9 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Icon className="size-4" />
          </div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="text-xl font-semibold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{detail}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
