import type { Metadata } from "next";
import { requireSession } from "@/lib/session";
import { AccountForms } from "@/app/(app)/cuenta/AccountForms";

export const metadata: Metadata = { title: "Mi cuenta · Wedplan" };

export default async function CuentaPage() {
  const { user } = await requireSession();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground sm:text-3xl">Mi cuenta</h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </div>
      <AccountForms name={user.name} />
    </div>
  );
}
