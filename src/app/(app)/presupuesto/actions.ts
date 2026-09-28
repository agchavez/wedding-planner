"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getEditableWeddingId } from "@/lib/wedding";
import { audit } from "@/lib/audit";

export async function createCategory(formData: FormData) {
  const weddingId = await getEditableWeddingId();
  const count = await prisma.expenseCategory.count({ where: { weddingId } });

  const category = await prisma.expenseCategory.create({
    data: {
      weddingId,
      name: String(formData.get("name") ?? "").trim(),
      estimatedBudget: Number(formData.get("estimatedBudget") ?? 0),
      sortOrder: count,
    },
  });
  await audit("budget_category.create", `Creó la categoría "${category.name}"`, { weddingId, targetId: category.id });

  revalidatePath("/presupuesto");
  revalidatePath("/gastos");
  revalidatePath("/");
}

export async function updateCategory(id: string, formData: FormData) {
  const weddingId = await getEditableWeddingId();
  const category = await prisma.expenseCategory.update({
    where: { id, weddingId },
    data: {
      name: String(formData.get("name") ?? "").trim(),
      estimatedBudget: Number(formData.get("estimatedBudget") ?? 0),
    },
  });
  await audit("budget_category.update", `Editó la categoría "${category.name}" (presupuesto ${category.estimatedBudget})`, { weddingId, targetId: id });

  revalidatePath("/presupuesto");
  revalidatePath("/gastos");
  revalidatePath("/");
}

export async function deleteCategory(id: string) {
  const weddingId = await getEditableWeddingId();
  await prisma.expenseCategory.findFirstOrThrow({ where: { id, weddingId }, select: { id: true } });
  const expenseIds = (await prisma.expense.findMany({ where: { categoryId: id, weddingId }, select: { id: true } })).map((e) => e.id);
  await prisma.expensePayment.deleteMany({ where: { expenseId: { in: expenseIds } } });
  await prisma.expense.deleteMany({ where: { categoryId: id, weddingId } });
  const category = await prisma.expenseCategory.delete({ where: { id, weddingId } });
  await audit("budget_category.delete", `Eliminó la categoría "${category.name}" y sus gastos`, { weddingId, targetId: id });


  revalidatePath("/presupuesto");
  revalidatePath("/gastos");
  revalidatePath("/");
}
