import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/product-form";
import { requirePermission } from "@/lib/auth-guard";
import { db } from "@/lib/db";

export const metadata = { title: "Edit product" };

export default async function EditProductPage(props: PageProps<"/admin/products/[id]">) {
  await requirePermission("products:write");
  const { id } = await props.params;

  const [product, categories] = await Promise.all([
    db.product.findUnique({ where: { id }, include: { images: { orderBy: { position: "asc" } } } }),
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!product) notFound();

  return (
    <>
      <PageHeader title={product.name} description={`SKU ${product.sku}`} />
      <ProductForm
        categories={categories}
        initial={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          sku: product.sku,
          price: (product.price / 100).toFixed(2),
          compareAtPrice: product.compareAtPrice ? (product.compareAtPrice / 100).toFixed(2) : "",
          stock: String(product.stock),
          categoryId: product.categoryId,
          isActive: product.isActive,
          isFeatured: product.isFeatured,
          images: product.images.map((i) => ({ url: i.url, publicId: i.publicId, alt: i.alt })),
        }}
      />
    </>
  );
}
