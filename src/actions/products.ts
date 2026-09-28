"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { AuthorizationError, assertPermission } from "@/lib/auth-guard";
import { deleteImage } from "@/lib/cloudinary";
import { rupeesToPaise } from "@/lib/format";
import { type ActionState, fieldErrorsOf, productSchema } from "@/lib/validations";

function parseProductForm(formData: FormData) {
  let images: unknown = [];
  try {
    images = JSON.parse(String(formData.get("images") ?? "[]"));
  } catch {
    images = [];
  }
  const compareAt = String(formData.get("compareAtPrice") ?? "").trim();
  return productSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    sku: formData.get("sku"),
    price: formData.get("price"),
    compareAtPrice: compareAt === "" ? undefined : compareAt,
    stock: formData.get("stock"),
    categoryId: formData.get("categoryId"),
    isActive: formData.get("isActive") === "true",
    isFeatured: formData.get("isFeatured") === "true",
    images,
  });
}

function revalidateCatalog(slug?: string) {
  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/");
  if (slug) revalidatePath(`/products/${slug}`);
}

function uniqueViolation(error: unknown): ActionState | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const target = String((error.meta?.target as string[] | undefined)?.join(",") ?? "");
    if (target.includes("sku")) return { fieldErrors: { sku: ["SKU already in use"] } };
    return { fieldErrors: { slug: ["Slug already in use"] } };
  }
  return null;
}

export async function saveProductAction(_: ActionState, formData: FormData): Promise<ActionState> {
  let user;
  try {
    user = await assertPermission("products:write");
  } catch (e) {
    return { message: (e as Error).message };
  }

  const parsed = parseProductForm(formData);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), message: "Please fix the errors below." };

  const { images, price, compareAtPrice, ...rest } = parsed.data;
  const data = {
    ...rest,
    price: rupeesToPaise(price),
    compareAtPrice: compareAtPrice ? rupeesToPaise(compareAtPrice) : null,
  };
  const imageRows = images.map((img, position) => ({
    url: img.url,
    publicId: img.publicId ?? null,
    alt: img.alt ?? rest.name,
    position,
  }));

  const id = String(formData.get("id") ?? "");

  try {
    if (id) {
      const before = await db.product.findUnique({ where: { id }, include: { images: true } });
      if (!before) return { message: "Product not found" };

      await db.$transaction([
        db.productImage.deleteMany({ where: { productId: id } }),
        db.product.update({ where: { id }, data: { ...data, images: { create: imageRows } } }),
      ]);

      // Remove Cloudinary assets that were detached from the product.
      const kept = new Set(imageRows.map((i) => i.publicId).filter(Boolean));
      await Promise.all(
        before.images.filter((i) => i.publicId && !kept.has(i.publicId)).map((i) => deleteImage(i.publicId!)),
      );

      await audit({ userId: user.id, action: "product.update", entity: "Product", entityId: id, metadata: { sku: data.sku } });
      revalidateCatalog(before.slug);
      if (before.slug !== data.slug) revalidateCatalog(data.slug);
    } else {
      const product = await db.product.create({ data: { ...data, images: { create: imageRows } } });
      await audit({ userId: user.id, action: "product.create", entity: "Product", entityId: product.id, metadata: { sku: data.sku } });
      revalidateCatalog(product.slug);
    }
  } catch (error) {
    const unique = uniqueViolation(error);
    if (unique) return unique;
    console.error(error);
    return { message: "Could not save the product. Please try again." };
  }

  redirect("/admin/products?saved=1");
}

export async function toggleProductActiveAction(productId: string) {
  const user = await assertPermission("products:write");
  const product = await db.product.findUniqueOrThrow({ where: { id: productId } });
  await db.product.update({ where: { id: productId }, data: { isActive: !product.isActive } });
  await audit({
    userId: user.id,
    action: product.isActive ? "product.archive" : "product.activate",
    entity: "Product",
    entityId: productId,
  });
  revalidateCatalog(product.slug);
}

export async function deleteProductAction(productId: string): Promise<ActionState> {
  try {
    const user = await assertPermission("products:delete");
    const product = await db.product.findUnique({ where: { id: productId }, include: { images: true } });
    if (!product) return { message: "Product not found" };

    // Order items keep a snapshot (name, SKU, price) so history survives deletion.
    await db.product.delete({ where: { id: productId } });
    await Promise.all(product.images.filter((i) => i.publicId).map((i) => deleteImage(i.publicId!)));
    await audit({ userId: user.id, action: "product.delete", entity: "Product", entityId: productId, metadata: { sku: product.sku } });
    revalidateCatalog(product.slug);
    return { ok: true, message: "Product deleted" };
  } catch (error) {
    if (error instanceof AuthorizationError) return { message: error.message };
    console.error(error);
    return { message: "Could not delete the product" };
  }
}
