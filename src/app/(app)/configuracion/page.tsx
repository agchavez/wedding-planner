import { Plus, Tag, Store, Landmark, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getActiveWeddingId } from "@/lib/wedding";
import { CategoryFormDialog } from "@/app/(app)/presupuesto/CategoryFormDialog";
import { CategoryCard } from "@/app/(app)/presupuesto/CategoryCard";
import { VendorFormDialog } from "@/app/(app)/configuracion/VendorFormDialog";
import { VendorCard } from "@/app/(app)/configuracion/VendorCard";
import { AccountFormDialog } from "@/app/(app)/configuracion/AccountFormDialog";
import { AccountCard } from "@/app/(app)/configuracion/AccountCard";
import { GroupFormDialog } from "@/app/(app)/configuracion/GroupFormDialog";
import { GroupCard } from "@/app/(app)/configuracion/GroupCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function ConfiguracionPage() {
  const weddingId = await getActiveWeddingId();
  const [categories, expenses, vendors, accounts, groups, currency] = await Promise.all([
    prisma.expenseCategory.findMany({ where: { weddingId }, orderBy: { sortOrder: "asc" } }),
    prisma.expense.findMany({ where: { weddingId } }),
    prisma.vendor.findMany({ where: { weddingId }, orderBy: { name: "asc" } }),
    prisma.account.findMany({ where: { weddingId }, orderBy: { name: "asc" } }),
    prisma.guestGroup.findMany({ where: { weddingId }, orderBy: { name: "asc" } }),
    prisma.wedding.findUnique({ where: { id: weddingId } }).then((w) => w?.currency ?? "HNL"),
  ]);

  const payments = await prisma.expensePayment.findMany({
    where: { expenseId: { in: expenses.map((e) => e.id) }, accountId: { not: null } },
    orderBy: { date: "desc" },
  });
  const expenseDescriptionById = Object.fromEntries(expenses.map((e) => [e.id, e.description]));
  const paymentsByAccount: Record<string, typeof payments> = {};
  for (const payment of payments) {
    if (!payment.accountId) continue;
    (paymentsByAccount[payment.accountId] ??= []).push(payment);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración"
        description="Administra las categorías de gasto, los proveedores, las cuentas y los grupos de invitados."
      />

      <Tabs defaultValue="categorias">
        <TabsList>
          <TabsTrigger value="categorias">
            <Tag className="size-4" />
            Categorías
          </TabsTrigger>
          <TabsTrigger value="proveedores">
            <Store className="size-4" />
            Proveedores
          </TabsTrigger>
          <TabsTrigger value="cuentas">
            <Landmark className="size-4" />
            Cuentas
          </TabsTrigger>
          <TabsTrigger value="grupos">
            <Users className="size-4" />
            Grupos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categorias" className="space-y-3 pt-2">
          <div className="flex items-center justify-end">
            <CategoryFormDialog
              triggerRender={<Button size="sm" />}
              triggerChildren={
                <>
                  <Plus className="size-3.5" />
                  Agregar categoría
                </>
              }
            />
          </div>
          {categories.length === 0 ? (
            <EmptyState
              icon={Tag}
              title="Todavía no hay categorías"
              description="Divide el presupuesto en categorías (catering, fotografía, flores…) con un monto estimado."
            />
          ) : (
            <div className="space-y-2">
              {categories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  expenses={expenses.filter((e) => e.categoryId === category.id)}
                  currency={currency}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="proveedores" className="space-y-3 pt-2">
          <div className="flex items-center justify-end">
            <VendorFormDialog
              triggerRender={<Button size="sm" />}
              triggerChildren={
                <>
                  <Plus className="size-3.5" />
                  Agregar proveedor
                </>
              }
            />
          </div>
          {vendors.length === 0 ? (
            <EmptyState
              icon={Store}
              title="Todavía no hay proveedores"
              description="Guarda el contacto de cada proveedor; aparecerán como sugerencia al registrar un gasto."
            />
          ) : (
            <div className="space-y-2">
              {vendors.map((vendor) => (
                <VendorCard key={vendor.id} vendor={vendor} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="cuentas" className="space-y-3 pt-2">
          <div className="flex items-center justify-end">
            <AccountFormDialog
              triggerRender={<Button size="sm" />}
              triggerChildren={
                <>
                  <Plus className="size-3.5" />
                  Agregar cuenta
                </>
              }
            />
          </div>
          {accounts.length === 0 ? (
            <EmptyState
              icon={Landmark}
              title="Todavía no hay cuentas"
              description="Las cuentas son de dónde sale el dinero de cada pago (ej. «Cuenta de ahorros», «Efectivo»)."
            />
          ) : (
            <div className="space-y-2">
              {accounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  payments={paymentsByAccount[account.id] ?? []}
                  expenseDescriptionById={expenseDescriptionById}
                  currency={currency}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="grupos" className="space-y-3 pt-2">
          <div className="flex items-center justify-end">
            <GroupFormDialog
              triggerRender={<Button size="sm" />}
              triggerChildren={
                <>
                  <Plus className="size-3.5" />
                  Agregar grupo
                </>
              }
            />
          </div>
          {groups.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Todavía no hay grupos"
              description="Agrupa a tus invitados (ej. «Familia del novio», «Amigos de la universidad»)."
            />
          ) : (
            <div className="space-y-2">
              {groups.map((group) => (
                <GroupCard key={group.id} group={group} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
