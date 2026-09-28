"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { assertPermission } from "@/lib/auth-guard";
import { slugify } from "@/lib/format";
import { type ActionState, categorySchema, fieldErrorsOf } from "@/lib/validations";

export async function saveCategoryAction(_: ActionState, formData: FormData): Promise<ActionState> {
  let user;
  try {
    user = await assertPermission("categories:write");
  } catch (e) {
    return { message: (e as Error).message };
  }

  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const id = String(formData.get("id") ?? "");
  const data = {
    name: parsed.data.name,
    slug: slugify(parsed.data.name),
    description: parsed.data.description || null,
  };

  try {
    const category = id
      ? await db.category.update({ where: { id }, data })
      : await db.category.create({ data });
    await audit({
      userId: user.id,
      action: id ? "category.update" : "category.create",
      entity: "Category",
      entityId: category.id,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { fieldErrors: { name: ["A category with this name already exists"] } };
    }
    throw error;
  }

  revalidatePath("/admin/categories");
  revalidatePath("/products");
  return { ok: true, message: id ? "Category updated" : "Category created" };
}

export async function deleteCategoryAction(categoryId: string): Promise<ActionState> {
  const user = await assertPermission("categories:write");
  const count = await db.product.count({ where: { categoryId } });
  if (count > 0) {
    return { message: `Move or delete the ${count} product(s) in this category first.` };
  }
  await db.category.delete({ where: { id: categoryId } });
  await audit({ userId: user.id, action: "category.delete", entity: "Category", entityId: categoryId });
  revalidatePath("/admin/categories");
  return { ok: true, message: "Category deleted" };
}
