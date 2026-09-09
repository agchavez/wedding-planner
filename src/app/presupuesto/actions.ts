"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getActiveWeddingId } from "@/lib/wedding";

export async function createCategory(formData: FormData) {
  const weddingId = await getActiveWeddingId();
  const count = await prisma.expenseCategory.count({ where: { weddingId } });

  await prisma.expenseCategory.create({
    data: {
      weddingId,
      name: String(formData.get("name") ?? "").trim(),
      estimatedBudget: Number(formData.get("estimatedBudget") ?? 0),
      sortOrder: count,
    },
  });

  revalidatePath("/presupuesto");
  revalidatePath("/gastos");
  revalidatePath("/");
}

export async function updateCategory(id: string, formData: FormData) {
  await prisma.expenseCategory.update({
    where: { id },
    data: {
      name: String(formData.get("name") ?? "").trim(),
      estimatedBudget: Number(formData.get("estimatedBudget") ?? 0),
    },
  });

  revalidatePath("/presupuesto");
  revalidatePath("/gastos");
  revalidatePath("/");
}

export async function deleteCategory(id: string) {
  await prisma.expense.deleteMany({ where: { categoryId: id } });
  await prisma.expenseCategory.delete({ where: { id } });

  revalidatePath("/presupuesto");
  revalidatePath("/gastos");
  revalidatePath("/");
}
