import type { Metadata } from "next";
import { requireSession } from "@/lib/session";
import { AccountForms } from "@/app/(app)/cuenta/AccountForms";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = { title: "Mi cuenta · Wedplan" };

export default async function CuentaPage() {
  const { user } = await requireSession();

  return (
    <div className="space-y-6">
      <PageHeader title="Mi cuenta" description={user.email} />
      <AccountForms name={user.name} />
    </div>
  );
}
