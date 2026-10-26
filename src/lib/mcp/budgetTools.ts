import "server-only";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import { prisma } from "@/lib/prisma";
import { checkCatalogName } from "@/lib/catalog-server";
import { CATALOG_NAME_MAX } from "@/lib/catalog";
import { recomputeExpensePaid } from "@/lib/expensePayments";
import { effectiveBudget, formatMoney } from "@/lib/format";
import { dateOnlyStr, todayStrWeddingTz } from "@/lib/dates";
import { saveUploadedFile } from "@/lib/uploads";
import { contributorDisplayLabel, CONTRIBUTOR_OPTIONS } from "@/app/(app)/presupuesto/contributorOptions";
import { auth, dateOnly, editor, fileInput, json, log, money, objectId, parseDateOnly, toDateOnlyValue, toFile, wedding } from "@/lib/mcp/shared";
import type { Expense, ExpensePayment } from "@/generated/prisma";

/**
 * Herramientas MCP de dinero: presupuesto (categorías y aportes), gastos con sus pagos,
 * proveedores y cuentas. amountPaid y paymentStatus de un gasto nunca se escriben a mano:
 * se recalculan con recomputeExpensePaid a partir de sus pagos, igual que en la app.
 */

const contributorSchema = z.enum(CONTRIBUTOR_OPTIONS.map((o) => o.value) as [string, ...string[]]);

function describeExpense(e: Expense, categoryName?: string, payments?: ExpensePayment[], accountName?: (id: string | null) => string | null) {
  return {
    id: e.id,
    description: e.description,
    categoryId: e.categoryId,
    category: categoryName ?? null,
    vendor: e.vendor || null,
    estimatedAmount: e.estimatedAmount,
    actualAmount: e.actualAmount,
    amountPaid: e.amountPaid,
    balance: Math.max(0, e.actualAmount - e.amountPaid),
    paymentStatus: e.paymentStatus,
    dueDate: toDateOnlyValue(e.dueDate) || null,
    paidDate: toDateOnlyValue(e.paidDate) || null,
    notes: e.notes || null,
    ...(payments
      ? {
          payments: payments.map((p) => ({
            id: p.id,
            amount: p.amount,
            date: toDateOnlyValue(p.date) || null,
            account: accountName?.(p.accountId) ?? null,
            notes: p.notes || null,
            receiptUrl: p.receiptUrl || null,
          })),
        }
      : {}),
  };
}

async function ownedCategory(weddingId: string, id: string) {
  return prisma.expenseCategory.findFirst({ where: { id, weddingId } });
}

async function ownedExpense(weddingId: string, id: string) {
  return prisma.expense.findFirst({ where: { id, weddingId } });
}

/** La cuenta (si hay) debe pertenecer a la boda; acepta id o nombre. */
async function resolveAccountId(weddingId: string, account: string | null | undefined) {
  if (!account) return null;
  const accounts = await prisma.account.findMany({ where: { weddingId } });
  const found = accounts.find((x) => x.id === account || x.name.toLowerCase() === account.toLowerCase());
  if (!found) throw new Error(`No existe la cuenta "${account}". Cuentas: ${accounts.map((x) => x.name).join(", ") || "ninguna"}.`);
  return found.id;
}

async function budgetAlerts(weddingId: string, currency: string) {
  const [categories, expenses, contributions] = await Promise.all([
    prisma.expenseCategory.findMany({ where: { weddingId } }),
    prisma.expense.findMany({ where: { weddingId } }),
    prisma.budgetContribution.findMany({ where: { weddingId } }),
  ]);
  const alerts: { type: string; message: string }[] = [];
  const totalActual = expenses.reduce((n, e) => n + e.actualAmount, 0);
  const budget = effectiveBudget(contributions.reduce((n, c) => n + c.amount, 0), categories.map((c) => c.estimatedBudget));
  if (budget.amount > 0 && totalActual > budget.amount) {
    alerts.push({ type: "total_exceeded", message: `Presupuesto total superado: ${formatMoney(totalActual, currency)} de ${formatMoney(budget.amount, currency)}.` });
  }
  for (const c of categories) {
    const spent = expenses.filter((e) => e.categoryId === c.id).reduce((n, e) => n + e.actualAmount, 0);
    if (c.estimatedBudget > 0 && spent > c.estimatedBudget) {
      alerts.push({ type: "category_exceeded", message: `"${c.name}" superó su presupuesto: ${formatMoney(spent, currency)} de ${formatMoney(c.estimatedBudget, currency)}.` });
    }
  }
  const today = todayStrWeddingTz();
  const soon = dateOnlyStr(new Date(Date.now() + 7 * 86_400_000));
  for (const e of expenses) {
    if (e.paymentStatus === "paid" || !e.dueDate) continue;
    const due = dateOnlyStr(e.dueDate);
    if (due < today) alerts.push({ type: "payment_overdue", message: `Pago vencido: "${e.description}" (venció el ${due}).` });
    else if (due <= soon) alerts.push({ type: "payment_upcoming", message: `Pago próximo: "${e.description}" vence el ${due}.` });
  }
  return alerts;
}

export function registerBudgetTools(server: McpServer) {
  server.registerTool(
    "budget_summary",
    {
      title: "Resumen del presupuesto",
      description:
        "Presupuesto total (suma de aportes o, si no hay, de lo estimado por categoría), lo gastado, pagado y pendiente, el detalle por categoría, los aportes y las alertas (categorías excedidas, pagos vencidos o próximos).",
      annotations: { readOnlyHint: true },
    },
    async (ctx) => {
      const a = auth(ctx);
      const [w, categories, expenses, contributions] = await Promise.all([
        wedding(a),
        prisma.expenseCategory.findMany({ where: { weddingId: a.weddingId }, orderBy: { sortOrder: "asc" } }),
        prisma.expense.findMany({ where: { weddingId: a.weddingId } }),
        prisma.budgetContribution.findMany({ where: { weddingId: a.weddingId }, orderBy: { date: "asc" } }),
      ]);
      const sum = (xs: Expense[], k: "estimatedAmount" | "actualAmount" | "amountPaid") => xs.reduce((n, e) => n + e[k], 0);
      const totalContributions = contributions.reduce((n, c) => n + c.amount, 0);
      const budget = effectiveBudget(totalContributions, categories.map((c) => c.estimatedBudget));
      return json({
        currency: w.currency,
        budget: budget.amount,
        budgetSource: budget.source,
        totalContributions,
        estimated: sum(expenses, "estimatedAmount"),
        actual: sum(expenses, "actualAmount"),
        paid: sum(expenses, "amountPaid"),
        pending: sum(expenses, "actualAmount") - sum(expenses, "amountPaid"),
        remaining: budget.amount - sum(expenses, "actualAmount"),
        categories: categories.map((c) => {
          const items = expenses.filter((e) => e.categoryId === c.id);
          return { id: c.id, name: c.name, estimatedBudget: c.estimatedBudget, expenses: items.length, actual: sum(items, "actualAmount"), paid: sum(items, "amountPaid") };
        }),
        contributions: contributions.map((c) => ({
          id: c.id,
          contributor: c.contributor,
          label: contributorDisplayLabel(c.contributor, c.otherLabel),
          amount: c.amount,
          date: toDateOnlyValue(c.date) || null,
          notes: c.notes || null,
        })),
        alerts: await budgetAlerts(a.weddingId, w.currency),
      });
    }
  );

  server.registerTool(
    "manage_budget_category",
    {
      title: "Crear, editar o eliminar una categoría de presupuesto",
      description:
        "action=create (name, estimatedBudget), update (categoryId y lo que cambie) o delete (categoryId). Eliminar una categoría borra también sus gastos y pagos: confirma antes con la persona.",
      inputSchema: z.object({
        action: z.enum(["create", "update", "delete"]),
        categoryId: objectId.optional(),
        name: z.string().max(CATALOG_NAME_MAX).optional(),
        estimatedBudget: money.optional(),
      }),
    },
    async ({ action, categoryId, name, estimatedBudget }, ctx) => {
      const a = editor(ctx);
      if (action === "create") {
        const check = await checkCatalogName("category", a.weddingId, name);
        if (!check.ok) return json({ error: check.error, existing: check.existing });
        const sortOrder = await prisma.expenseCategory.count({ where: { weddingId: a.weddingId } });
        const c = await prisma.expenseCategory.create({ data: { weddingId: a.weddingId, name: check.name, estimatedBudget: estimatedBudget ?? 0, sortOrder } });
        await log(a, "budget_category.create", `Creó la categoría "${c.name}"`, c.id);
        return json({ created: { id: c.id, name: c.name, estimatedBudget: c.estimatedBudget } });
      }
      const category = categoryId ? await ownedCategory(a.weddingId, categoryId) : null;
      if (!category) return json({ error: "Categoría no encontrada." });
      if (action === "update") {
        let newName = category.name;
        if (name !== undefined) {
          const check = await checkCatalogName("category", a.weddingId, name, category.id);
          if (!check.ok) return json({ error: check.error });
          newName = check.name;
        }
        const c = await prisma.expenseCategory.update({
          where: { id: category.id },
          data: { name: newName, ...(estimatedBudget !== undefined ? { estimatedBudget } : {}) },
        });
        await log(a, "budget_category.update", `Editó la categoría "${c.name}" (presupuesto ${c.estimatedBudget})`, c.id);
        return json({ updated: { id: c.id, name: c.name, estimatedBudget: c.estimatedBudget } });
      }
      const expenseIds = (await prisma.expense.findMany({ where: { categoryId: category.id, weddingId: a.weddingId }, select: { id: true } })).map((e) => e.id);
      await prisma.expensePayment.deleteMany({ where: { expenseId: { in: expenseIds } } });
      await prisma.expense.deleteMany({ where: { categoryId: category.id, weddingId: a.weddingId } });
      await prisma.expenseCategory.delete({ where: { id: category.id } });
      await log(a, "budget_category.delete", `Eliminó la categoría "${category.name}" y sus gastos`, category.id);
      return json({ deleted: category.name, expensesDeleted: expenseIds.length });
    }
  );

  server.registerTool(
    "reorder_budget_categories",
    {
      title: "Reordenar categorías",
      description: "Define el orden de las categorías de presupuesto (lista completa de ids en el orden deseado).",
      inputSchema: z.object({ categoryIds: z.array(objectId).min(1).max(200) }),
    },
    async ({ categoryIds }, ctx) => {
      const a = editor(ctx);
      await Promise.all(
        categoryIds.map((id, index) => prisma.expenseCategory.updateMany({ where: { id, weddingId: a.weddingId }, data: { sortOrder: index } }))
      );
      await log(a, "budget_category.reorder", "Reordenó las categorías del presupuesto");
      return json({ ok: true });
    }
  );

  server.registerTool(
    "list_expenses",
    {
      title: "Listar gastos",
      description: "Gastos con filtros opcionales por categoría, estado de pago, proveedor, texto o vencimiento. includePayments agrega el detalle de cada pago.",
      inputSchema: z.object({
        categoryId: objectId.optional(),
        paymentStatus: z.enum(["pending", "partially_paid", "paid"]).optional(),
        vendor: z.string().optional(),
        search: z.string().optional(),
        dueBefore: dateOnly.optional().describe("Solo gastos que vencen antes o en esta fecha"),
        includePayments: z.boolean().optional(),
      }),
      annotations: { readOnlyHint: true },
    },
    async (args, ctx) => {
      const a = auth(ctx);
      const [expenses, categories, accounts] = await Promise.all([
        prisma.expense.findMany({ where: { weddingId: a.weddingId }, orderBy: { createdAt: "asc" } }),
        prisma.expenseCategory.findMany({ where: { weddingId: a.weddingId } }),
        prisma.account.findMany({ where: { weddingId: a.weddingId } }),
      ]);
      const q = args.search?.toLowerCase() ?? "";
      const filtered = expenses
        .filter((e) => !args.categoryId || e.categoryId === args.categoryId)
        .filter((e) => !args.paymentStatus || e.paymentStatus === args.paymentStatus)
        .filter((e) => !args.vendor || e.vendor.toLowerCase().includes(args.vendor.toLowerCase()))
        .filter((e) => !q || `${e.description} ${e.vendor} ${e.notes}`.toLowerCase().includes(q))
        .filter((e) => !args.dueBefore || (e.dueDate && dateOnlyStr(e.dueDate) <= args.dueBefore));
      const payments = args.includePayments
        ? await prisma.expensePayment.findMany({ where: { expenseId: { in: filtered.map((e) => e.id) } }, orderBy: { date: "asc" } })
        : null;
      const accountName = (id: string | null) => accounts.find((x) => x.id === id)?.name ?? null;
      return json({
        count: filtered.length,
        expenses: filtered.map((e) =>
          describeExpense(e, categories.find((c) => c.id === e.categoryId)?.name, payments?.filter((p) => p.expenseId === e.id), accountName)
        ),
      });
    }
  );

  const expenseFields = {
    description: z.string().min(1).max(200),
    categoryId: objectId,
    vendor: z.string().max(120).optional().describe("Texto libre; idealmente un proveedor del catálogo"),
    estimatedAmount: money.optional(),
    actualAmount: money.optional().describe("Monto real/contratado; define cuándo el gasto queda pagado"),
    dueDate: dateOnly.optional(),
    notes: z.string().max(1000).optional(),
  };

  server.registerTool(
    "add_expenses",
    {
      title: "Registrar gastos",
      description: "Registra uno o varios gastos (hasta 100). Los pagos se registran aparte con add_payment.",
      inputSchema: z.object({ expenses: z.array(z.object(expenseFields)).min(1).max(100) }),
    },
    async ({ expenses: input }, ctx) => {
      const a = editor(ctx);
      const categories = await prisma.expenseCategory.findMany({ where: { weddingId: a.weddingId } });
      const created: Expense[] = [];
      for (const e of input) {
        const category = categories.find((c) => c.id === e.categoryId);
        if (!category) throw new Error(`La categoría ${e.categoryId} no existe en esta boda.`);
        const expense = await prisma.expense.create({
          data: {
            weddingId: a.weddingId,
            categoryId: category.id,
            description: e.description.trim(),
            vendor: e.vendor ?? "",
            estimatedAmount: e.estimatedAmount ?? 0,
            actualAmount: e.actualAmount ?? 0,
            dueDate: parseDateOnly(e.dueDate),
            notes: e.notes ?? "",
          },
        });
        created.push(expense);
        await log(a, "expense.create", `Registró el gasto "${expense.description}"`, expense.id);
      }
      return json({ created: created.map((e) => describeExpense(e, categories.find((c) => c.id === e.categoryId)?.name)) });
    }
  );

  server.registerTool(
    "update_expense",
    {
      title: "Editar gasto",
      description: "Cambia los datos de un gasto. Lo pagado y el estado se recalculan solos a partir de sus pagos.",
      inputSchema: z.object({ expenseId: objectId, ...z.object(expenseFields).partial().shape }),
    },
    async ({ expenseId, categoryId, dueDate, ...rest }, ctx) => {
      const a = editor(ctx);
      const expense = await ownedExpense(a.weddingId, expenseId);
      if (!expense) return json({ error: "Gasto no encontrado." });
      if (categoryId && !(await ownedCategory(a.weddingId, categoryId))) return json({ error: "Categoría no encontrada." });
      await prisma.expense.update({
        where: { id: expense.id },
        data: {
          ...rest,
          ...(rest.description !== undefined ? { description: rest.description.trim() } : {}),
          ...(categoryId ? { categoryId } : {}),
          ...(dueDate !== undefined ? { dueDate: parseDateOnly(dueDate) } : {}),
        },
      });
      await recomputeExpensePaid(expense.id);
      const updated = await prisma.expense.findUniqueOrThrow({ where: { id: expense.id } });
      await log(a, "expense.update", `Editó el gasto "${updated.description}"`, updated.id);
      return json({ updated: describeExpense(updated) });
    }
  );

  server.registerTool(
    "delete_expense",
    {
      title: "Eliminar gasto",
      description: "Elimina un gasto y todos sus pagos. Confirma antes con la persona.",
      inputSchema: z.object({ expenseId: objectId }),
      annotations: { destructiveHint: true },
    },
    async ({ expenseId }, ctx) => {
      const a = editor(ctx);
      const expense = await ownedExpense(a.weddingId, expenseId);
      if (!expense) return json({ error: "Gasto no encontrado." });
      await prisma.expensePayment.deleteMany({ where: { expenseId } });
      await prisma.expense.delete({ where: { id: expenseId } });
      await log(a, "expense.delete", `Eliminó el gasto "${expense.description}"`, expenseId);
      return json({ deleted: expense.description });
    }
  );

  const paymentFields = {
    amount: money,
    date: dateOnly.optional(),
    account: z.string().optional().describe("Id o nombre de la cuenta de la que salió el dinero"),
    notes: z.string().max(500).optional(),
    receipt: fileInput.optional().describe("Comprobante (imagen o PDF)"),
  };

  server.registerTool(
    "add_payment",
    {
      title: "Registrar pago de un gasto",
      description: "Registra un abono o pago a un gasto (opcionalmente con comprobante). Recalcula lo pagado y el estado del gasto.",
      inputSchema: z.object({ expenseId: objectId, ...paymentFields }),
    },
    async ({ expenseId, amount, date, account, notes, receipt }, ctx) => {
      const a = editor(ctx);
      const expense = await ownedExpense(a.weddingId, expenseId);
      if (!expense) return json({ error: "Gasto no encontrado." });
      const saved = receipt ? await saveUploadedFile(toFile(receipt), "receipts") : null;
      const payment = await prisma.expensePayment.create({
        data: {
          expenseId,
          accountId: await resolveAccountId(a.weddingId, account),
          amount,
          date: parseDateOnly(date),
          notes: notes?.trim() ?? "",
          receiptUrl: saved?.url ?? "",
          receiptName: saved?.name ?? "",
        },
      });
      await recomputeExpensePaid(expenseId);
      const w = await wedding(a);
      await log(a, "payment.create", `Registró un pago de ${formatMoney(amount, w.currency)} al gasto "${expense.description}"`, payment.id);
      return json({ paymentId: payment.id, expense: describeExpense(await prisma.expense.findUniqueOrThrow({ where: { id: expenseId } })) });
    }
  );

  server.registerTool(
    "update_payment",
    {
      title: "Editar pago",
      description: "Cambia un pago registrado (monto, fecha, cuenta, notas o comprobante). account=\"\" lo deja sin cuenta.",
      inputSchema: z.object({ paymentId: objectId, ...z.object(paymentFields).partial().shape }),
    },
    async ({ paymentId, amount, date, account, notes, receipt }, ctx) => {
      const a = editor(ctx);
      const payment = await prisma.expensePayment.findUnique({ where: { id: paymentId } });
      const expense = payment ? await ownedExpense(a.weddingId, payment.expenseId) : null;
      if (!payment || !expense) return json({ error: "Pago no encontrado." });
      const saved = receipt ? await saveUploadedFile(toFile(receipt), "receipts") : null;
      await prisma.expensePayment.update({
        where: { id: paymentId },
        data: {
          ...(amount !== undefined ? { amount } : {}),
          ...(date !== undefined ? { date: parseDateOnly(date) } : {}),
          ...(account !== undefined ? { accountId: await resolveAccountId(a.weddingId, account) } : {}),
          ...(notes !== undefined ? { notes: notes.trim() } : {}),
          ...(saved ? { receiptUrl: saved.url, receiptName: saved.name } : {}),
        },
      });
      await recomputeExpensePaid(expense.id);
      await log(a, "payment.update", `Editó un pago del gasto "${expense.description}"`, paymentId);
      return json({ expense: describeExpense(await prisma.expense.findUniqueOrThrow({ where: { id: expense.id } })) });
    }
  );

  server.registerTool(
    "delete_payment",
    {
      title: "Eliminar pago",
      description: "Elimina un pago de un gasto y recalcula lo pagado.",
      inputSchema: z.object({ paymentId: objectId }),
      annotations: { destructiveHint: true },
    },
    async ({ paymentId }, ctx) => {
      const a = editor(ctx);
      const payment = await prisma.expensePayment.findUnique({ where: { id: paymentId } });
      const expense = payment ? await ownedExpense(a.weddingId, payment.expenseId) : null;
      if (!payment || !expense) return json({ error: "Pago no encontrado." });
      await prisma.expensePayment.delete({ where: { id: paymentId } });
      await recomputeExpensePaid(expense.id);
      const w = await wedding(a);
      await log(a, "payment.delete", `Eliminó un pago de ${formatMoney(payment.amount, w.currency)} del gasto "${expense.description}"`, paymentId);
      return json({ expense: describeExpense(await prisma.expense.findUniqueOrThrow({ where: { id: expense.id } })) });
    }
  );

  server.registerTool(
    "manage_contribution",
    {
      title: "Registrar, editar o eliminar un aporte",
      description:
        "Aportes de dinero al presupuesto (el presupuesto total es su suma). action=create, update (contributionId) o delete (contributionId). contributor: groom (novio), bride (novia), groom_parents, bride_parents u other (con otherLabel).",
      inputSchema: z.object({
        action: z.enum(["create", "update", "delete"]),
        contributionId: objectId.optional(),
        contributor: contributorSchema.optional(),
        otherLabel: z.string().max(80).optional(),
        amount: money.optional(),
        date: dateOnly.optional(),
        notes: z.string().max(500).optional(),
      }),
    },
    async ({ action, contributionId, ...input }, ctx) => {
      const a = editor(ctx);
      const w = await wedding(a);
      if (action === "create") {
        const contributor = input.contributor ?? "other";
        const c = await prisma.budgetContribution.create({
          data: {
            weddingId: a.weddingId,
            contributor,
            otherLabel: contributor === "other" ? (input.otherLabel ?? "").trim() : "",
            amount: input.amount ?? 0,
            date: parseDateOnly(input.date),
            notes: input.notes?.trim() ?? "",
          },
        });
        await log(a, "contribution.create", `Registró un aporte de ${formatMoney(c.amount, w.currency)}`, c.id);
        return json({ created: { id: c.id, label: contributorDisplayLabel(c.contributor, c.otherLabel), amount: c.amount } });
      }
      const existing = contributionId ? await prisma.budgetContribution.findFirst({ where: { id: contributionId, weddingId: a.weddingId } }) : null;
      if (!existing) return json({ error: "Aporte no encontrado." });
      if (action === "delete") {
        await prisma.budgetContribution.delete({ where: { id: existing.id } });
        await log(a, "contribution.delete", `Eliminó un aporte de ${formatMoney(existing.amount, w.currency)}`, existing.id);
        return json({ deleted: existing.id });
      }
      const contributor = input.contributor ?? existing.contributor;
      const c = await prisma.budgetContribution.update({
        where: { id: existing.id },
        data: {
          contributor,
          otherLabel: contributor === "other" ? (input.otherLabel ?? existing.otherLabel).trim() : "",
          ...(input.amount !== undefined ? { amount: input.amount } : {}),
          ...(input.date !== undefined ? { date: parseDateOnly(input.date) } : {}),
          ...(input.notes !== undefined ? { notes: input.notes.trim() } : {}),
        },
      });
      await log(a, "contribution.update", `Editó un aporte (${formatMoney(c.amount, w.currency)})`, c.id);
      return json({ updated: { id: c.id, label: contributorDisplayLabel(c.contributor, c.otherLabel), amount: c.amount } });
    }
  );

  server.registerTool(
    "list_vendors_and_accounts",
    {
      title: "Proveedores y cuentas",
      description: "Directorio de proveedores (con contacto, teléfono y total de gastos asociados) y cuentas de dinero (con lo pagado desde cada una).",
      annotations: { readOnlyHint: true },
    },
    async (ctx) => {
      const a = auth(ctx);
      const [vendors, accounts, expenses] = await Promise.all([
        prisma.vendor.findMany({ where: { weddingId: a.weddingId }, orderBy: { name: "asc" } }),
        prisma.account.findMany({ where: { weddingId: a.weddingId }, orderBy: { name: "asc" } }),
        prisma.expense.findMany({ where: { weddingId: a.weddingId } }),
      ]);
      const payments = await prisma.expensePayment.findMany({ where: { expenseId: { in: expenses.map((e) => e.id) } } });
      const key = (s: string) => s.trim().toLowerCase();
      return json({
        vendors: vendors.map((v) => {
          const items = expenses.filter((e) => key(e.vendor) === key(v.name));
          return {
            id: v.id,
            name: v.name,
            contactName: v.contactName || null,
            phone: v.phone || null,
            notes: v.notes || null,
            expenses: items.length,
            actual: items.reduce((n, e) => n + e.actualAmount, 0),
            paid: items.reduce((n, e) => n + e.amountPaid, 0),
          };
        }),
        accounts: accounts.map((x) => ({
          id: x.id,
          name: x.name,
          notes: x.notes || null,
          paidFromAccount: payments.filter((p) => p.accountId === x.id).reduce((n, p) => n + p.amount, 0),
        })),
      });
    }
  );

  server.registerTool(
    "manage_vendor",
    {
      title: "Crear, editar o eliminar un proveedor",
      description: "action=create (name y datos de contacto), update (vendorId) o delete (vendorId). Los gastos guardan el proveedor como texto, así que eliminarlo no borra gastos.",
      inputSchema: z.object({
        action: z.enum(["create", "update", "delete"]),
        vendorId: objectId.optional(),
        name: z.string().max(CATALOG_NAME_MAX).optional(),
        contactName: z.string().max(120).optional(),
        phone: z.string().max(40).optional(),
        notes: z.string().max(1000).optional(),
      }),
    },
    async ({ action, vendorId, name, ...rest }, ctx) => {
      const a = editor(ctx);
      if (action === "create") {
        const check = await checkCatalogName("vendor", a.weddingId, name);
        if (!check.ok) return json({ error: check.error, existing: check.existing });
        const v = await prisma.vendor.create({ data: { weddingId: a.weddingId, name: check.name, ...rest } });
        await log(a, "vendor.create", `Creó el proveedor "${v.name}"`, v.id);
        return json({ created: v });
      }
      const vendor = vendorId ? await prisma.vendor.findFirst({ where: { id: vendorId, weddingId: a.weddingId } }) : null;
      if (!vendor) return json({ error: "Proveedor no encontrado." });
      if (action === "delete") {
        await prisma.vendor.delete({ where: { id: vendor.id } });
        await log(a, "vendor.delete", `Eliminó el proveedor "${vendor.name}"`, vendor.id);
        return json({ deleted: vendor.name });
      }
      let newName = vendor.name;
      if (name !== undefined) {
        const check = await checkCatalogName("vendor", a.weddingId, name, vendor.id);
        if (!check.ok) return json({ error: check.error });
        newName = check.name;
      }
      const v = await prisma.vendor.update({ where: { id: vendor.id }, data: { name: newName, ...rest } });
      await log(a, "vendor.update", `Editó el proveedor "${v.name}"`, v.id);
      return json({ updated: v });
    }
  );

  server.registerTool(
    "manage_account",
    {
      title: "Crear, editar o eliminar una cuenta",
      description: "Cuentas o fuentes de dinero de las que salen los pagos (ej. «Efectivo»). action=create (name), update (accountId) o delete (accountId).",
      inputSchema: z.object({
        action: z.enum(["create", "update", "delete"]),
        accountId: objectId.optional(),
        name: z.string().max(CATALOG_NAME_MAX).optional(),
        notes: z.string().max(1000).optional(),
      }),
    },
    async ({ action, accountId, name, notes }, ctx) => {
      const a = editor(ctx);
      if (action === "create") {
        const check = await checkCatalogName("account", a.weddingId, name);
        if (!check.ok) return json({ error: check.error, existing: check.existing });
        const x = await prisma.account.create({ data: { weddingId: a.weddingId, name: check.name, notes: notes ?? "" } });
        await log(a, "account.create", `Creó la cuenta "${x.name}"`, x.id);
        return json({ created: x });
      }
      const account = accountId ? await prisma.account.findFirst({ where: { id: accountId, weddingId: a.weddingId } }) : null;
      if (!account) return json({ error: "Cuenta no encontrada." });
      if (action === "delete") {
        await prisma.account.delete({ where: { id: account.id } });
        await log(a, "account.delete", `Eliminó la cuenta "${account.name}"`, account.id);
        return json({ deleted: account.name });
      }
      let newName = account.name;
      if (name !== undefined) {
        const check = await checkCatalogName("account", a.weddingId, name, account.id);
        if (!check.ok) return json({ error: check.error });
        newName = check.name;
      }
      const x = await prisma.account.update({ where: { id: account.id }, data: { name: newName, ...(notes !== undefined ? { notes } : {}) } });
      await log(a, "account.update", `Editó la cuenta "${x.name}"`, x.id);
      return json({ updated: x });
    }
  );
}
