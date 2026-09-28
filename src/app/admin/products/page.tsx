import Link from "next/link";
import { PlusIcon } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { FilterBar, one, pageOf } from "@/components/admin/filter-bar";
import { PageHeader } from "@/components/admin/page-header";
import { ProductRowActions } from "@/components/admin/product-row-actions";
import { SavedToast } from "@/components/admin/saved-toast";
import { PaginationLinks } from "@/components/pagination-links";
import { ProductImage } from "@/components/product-image";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { hasPermission } from "@/lib/rbac";

export const metadata = { title: "Products" };
const PAGE_SIZE = 15;

export default async function AdminProductsPage(props: PageProps<"/admin/products">) {
  const user = await requirePermission("products:write");
  const sp = await props.searchParams;
  const q = one(sp.q)?.trim();
  const category = one(sp.category);
  const status = one(sp.status);
  const page = pageOf(sp.page);

  const where: Prisma.ProductWhereInput = {
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }] } : {}),
    ...(category ? { categoryId: category } : {}),
    ...(status === "active" ? { isActive: true } : status === "archived" ? { isActive: false } : {}),
    ...(status === "low" ? { stock: { lte: 10 } } : {}),
  };

  const [products, total, categories] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        category: { select: { name: true } },
        images: { take: 1, orderBy: { position: "asc" }, select: { url: true } },
        _count: { select: { orderItems: true } },
      },
    }),
    db.product.count({ where }),
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const canDelete = hasPermission(user.role, "products:delete");

  return (
    <>
      <SavedToast message="Product saved" />
      <PageHeader
        title="Products"
        description={`${total} products in the catalog`}
        actions={
          <Link href="/admin/products/new" className={buttonVariants()}>
            <PlusIcon /> Add product
          </Link>
        }
      />
      <FilterBar
        basePath="/admin/products"
        q={q}
        placeholder="Search name or SKU…"
        selects={[
          { name: "category", label: "Category", value: category, options: categories.map((c) => ({ value: c.id, label: c.name })) },
          {
            name: "status",
            label: "Status",
            value: status,
            options: [
              { value: "active", label: "Active" },
              { value: "archived", label: "Archived" },
              { value: "low", label: "Low stock" },
            ],
          },
        ]}
      />
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16 pl-4">Image</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="pl-4">
                  <ProductImage src={p.images[0]?.url} alt={p.name} sizes="40px" className="size-10 rounded-md" />
                </TableCell>
                <TableCell>
                  <Link href={`/admin/products/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
                  <p className="text-xs text-muted-foreground">{p.sku} · {p._count.orderItems} sold lines</p>
                </TableCell>
                <TableCell>{p.category.name}</TableCell>
                <TableCell className="text-right tabular-nums">{formatPrice(p.price)}</TableCell>
                <TableCell className="text-right">
                  <span className={p.stock === 0 ? "text-destructive" : p.stock <= 10 ? "text-amber-600" : ""}>{p.stock}</span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {p.isActive ? <Badge variant="secondary">Active</Badge> : <Badge variant="outline">Archived</Badge>}
                    {p.isFeatured && <Badge className="bg-primary/15 text-primary">Featured</Badge>}
                  </div>
                </TableCell>
                <TableCell>
                  <ProductRowActions product={{ id: p.id, slug: p.slug, name: p.name, isActive: p.isActive }} canDelete={canDelete} />
                </TableCell>
              </TableRow>
            ))}
            {products.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">No products match these filters.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
      <PaginationLinks basePath="/admin/products" searchParams={sp} page={page} totalPages={Math.ceil(total / PAGE_SIZE)} />
    </>
  );
}
