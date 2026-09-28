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
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground sm:text-3xl">Configuración</h1>
        <p className="text-sm text-muted-foreground">
          Administra las categorías de gasto, los proveedores, las cuentas y los grupos de invitados.
        </p>
      </div>

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
            <p className="text-sm text-muted-foreground">Todavía no hay categorías de gasto. Agrega la primera arriba.</p>
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
            <p className="text-sm text-muted-foreground">Todavía no hay proveedores registrados. Agrega el primero arriba.</p>
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
            <p className="text-sm text-muted-foreground">
              Todavía no hay cuentas registradas. Agrega la primera arriba (ej. &quot;Cuenta de ahorros&quot;, &quot;Efectivo&quot;).
            </p>
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
            <p className="text-sm text-muted-foreground">
              Todavía no hay grupos registrados. Agrega el primero arriba (ej. &quot;Familia del novio&quot;).
            </p>
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
