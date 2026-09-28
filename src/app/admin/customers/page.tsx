import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { FilterBar, one, pageOf } from "@/components/admin/filter-bar";
import { PageHeader } from "@/components/admin/page-header";
import { PaginationLinks } from "@/components/pagination-links";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { formatDate, formatPrice, initials } from "@/lib/format";

export const metadata = { title: "Customers" };
const PAGE_SIZE = 20;

export default async function CustomersPage(props: PageProps<"/admin/customers">) {
  await requirePermission("customers:view");
  const sp = await props.searchParams;
  const q = one(sp.q)?.trim();
  const page = pageOf(sp.page);

  const where: Prisma.UserWhereInput = {
    role: "CUSTOMER",
    ...(q
      ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] }
      : {}),
  };

  const [customers, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, name: true, email: true, image: true, isActive: true, createdAt: true },
    }),
    db.user.count({ where }),
  ]);

  // Lifetime value for just this page of customers, in one grouped query.
  const stats = await db.order.groupBy({
    by: ["userId"],
    where: { userId: { in: customers.map((c) => c.id) }, paymentStatus: "PAID" },
    _sum: { total: true },
    _count: { _all: true },
    _max: { paidAt: true },
  });
  const statsByUser = new Map(stats.map((s) => [s.userId, s]));

  return (
    <>
      <PageHeader title="Customers" description={`${total} registered customers`} />
      <FilterBar basePath="/admin/customers" q={q} placeholder="Search name or email…" />
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Customer</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead className="text-right">Lifetime value</TableHead>
              <TableHead>Last order</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((c) => {
              const s = statsByUser.get(c.id);
              return (
                <TableRow key={c.id}>
                  <TableCell className="pl-4">
                    <Link href={`/admin/customers/${c.id}`} className="flex items-center gap-3">
                      <Avatar className="size-8">
                        {c.image && <AvatarImage src={c.image} alt="" />}
                        <AvatarFallback>{initials(c.name, c.email)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium hover:underline">
                          {c.name ?? "—"} {!c.isActive && <Badge variant="outline">Disabled</Badge>}
                        </p>
                        <p className="text-xs text-muted-foreground">{c.email}</p>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{s?._count._all ?? 0}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatPrice(s?._sum.total ?? 0)}</TableCell>
                  <TableCell>{s?._max.paidAt ? formatDate(s._max.paidAt) : "—"}</TableCell>
                  <TableCell>{formatDate(c.createdAt)}</TableCell>
                </TableRow>
              );
            })}
            {customers.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">No customers found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
      <PaginationLinks basePath="/admin/customers" searchParams={sp} page={page} totalPages={Math.ceil(total / PAGE_SIZE)} />
    </>
  );
}
