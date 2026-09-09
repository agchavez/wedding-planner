import { AlertTriangle, Bell, Clock, PartyPopper } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { BudgetAlert } from "@/lib/budgetAlerts";

const ICONS: Record<BudgetAlert["type"], typeof AlertTriangle> = {
  category_exceeded: AlertTriangle,
  total_exceeded: PartyPopper,
  payment_overdue: Clock,
  payment_upcoming: Bell,
};

export function AlertBanner({ alerts }: { alerts: BudgetAlert[] }) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => {
        const Icon = ICONS[alert.type];
        return (
          <Alert key={i} variant={alert.type === "total_exceeded" ? "destructive" : "default"}>
            <Icon />
            <AlertDescription>{alert.message}</AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
}
