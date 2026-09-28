import { CategoryDialog, DeleteCategoryButton } from "@/components/admin/category-dialog";
import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  await requirePermission("categories:write");
  const categories = await db.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <>
      <PageHeader title="Categories" description="Organize your catalog." actions={<CategoryDialog />} />
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="text-right">Products</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="pl-4">
                  <p className="font-medium">{c.name}</p>
                  {c.description && <p className="max-w-md truncate text-xs text-muted-foreground">{c.description}</p>}
                </TableCell>
                <TableCell className="font-mono text-xs">{c.slug}</TableCell>
                <TableCell className="text-right tabular-nums">{c._count.products}</TableCell>
                <TableCell>{formatDate(c.createdAt)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <CategoryDialog category={{ id: c.id, name: c.name, description: c.description }} />
                    <DeleteCategoryButton id={c.id} name={c.name} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {categories.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">No categories yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
