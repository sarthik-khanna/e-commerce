import type { Prisma } from "@/generated/prisma/client";
import type { Role } from "@/generated/prisma/enums";
import { FilterBar, one, pageOf } from "@/components/admin/filter-bar";
import { PageHeader } from "@/components/admin/page-header";
import { UserRowActions } from "@/components/admin/user-row-actions";
import { PaginationLinks } from "@/components/pagination-links";
import { RoleBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { PERMISSIONS } from "@/lib/rbac";

export const metadata = { title: "Users & roles" };
const PAGE_SIZE = 20;
const ROLES: Role[] = ["ADMIN", "MANAGER", "CUSTOMER"];

export default async function UsersPage(props: PageProps<"/admin/users">) {
  const me = await requirePermission("users:manage");
  const sp = await props.searchParams;
  const q = one(sp.q)?.trim();
  const role = ROLES.find((r) => r === one(sp.role));
  const page = pageOf(sp.page);

  const where: Prisma.UserWhereInput = {
    ...(role ? { role } : {}),
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {}),
  };

  const [users, total, counts] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: [{ role: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    }),
    db.user.count({ where }),
    db.user.groupBy({ by: ["role"], _count: { _all: true } }),
  ]);

  return (
    <>
      <PageHeader
        title="Users & roles"
        description={counts.map((c) => `${c._count._all} ${c.role.toLowerCase()}${c._count._all === 1 ? "" : "s"}`).join(" · ")}
      />

      <details className="mb-4 rounded-xl border p-4 text-sm">
        <summary className="cursor-pointer font-medium">Permission matrix</summary>
        <Table className="mt-3">
          <TableHeader>
            <TableRow>
              <TableHead>Permission</TableHead>
              {ROLES.map((r) => <TableHead key={r} className="text-center">{r}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(PERMISSIONS).map(([perm, roles]) => (
              <TableRow key={perm}>
                <TableCell className="font-mono text-xs">{perm}</TableCell>
                {ROLES.map((r) => (
                  <TableCell key={r} className="text-center">
                    {(roles as readonly Role[]).includes(r) ? "✓" : "—"}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </details>

      <FilterBar
        basePath="/admin/users"
        q={q}
        placeholder="Search name or email…"
        selects={[{ name: "role", label: "Role", value: role, options: ROLES.map((r) => ({ value: r, label: r.charAt(0) + r.slice(1).toLowerCase() })) }]}
      />
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="pr-4 text-right">Manage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="pl-4">
                  <p className="font-medium">{u.name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </TableCell>
                <TableCell><RoleBadge role={u.role} /></TableCell>
                <TableCell>{u.isActive ? <Badge variant="secondary">Active</Badge> : <Badge variant="destructive">Disabled</Badge>}</TableCell>
                <TableCell>{formatDate(u.createdAt)}</TableCell>
                <TableCell className="pr-4">
                  <UserRowActions userId={u.id} role={u.role} isActive={u.isActive} isSelf={u.id === me.id} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <PaginationLinks basePath="/admin/users" searchParams={sp} page={page} totalPages={Math.ceil(total / PAGE_SIZE)} />
    </>
  );
}
