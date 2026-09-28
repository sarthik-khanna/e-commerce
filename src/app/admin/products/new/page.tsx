import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/product-form";
import { requirePermission } from "@/lib/auth-guard";
import { db } from "@/lib/db";

export const metadata = { title: "New product" };

export default async function NewProductPage() {
  await requirePermission("products:write");
  const categories = await db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });

  if (categories.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center">
        <p className="mb-2 font-medium">Create a category first</p>
        <Link href="/admin/categories" className="text-sm text-primary hover:underline">Go to categories →</Link>
      </div>
    );
  }

  return (
    <>
      <PageHeader title="New product" description="Add a product to your catalog." />
      <ProductForm
        categories={categories}
        initial={{
          name: "",
          slug: "",
          description: "",
          sku: "",
          price: "",
          compareAtPrice: "",
          stock: "0",
          categoryId: "",
          isActive: true,
          isFeatured: false,
          images: [],
        }}
      />
    </>
  );
}
