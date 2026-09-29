"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3Icon,
  FileTextIcon,
  FolderTreeIcon,
  LayoutDashboardIcon,
  PackageIcon,
  PlugZapIcon,
  ScrollTextIcon,
  ShieldCheckIcon,
  ShoppingCartIcon,
  StoreIcon,
  UsersIcon,
} from "lucide-react";
import type { Role } from "@/generated/prisma/enums";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { hasPermission, type Permission } from "@/lib/rbac";

type NavItem = { href: string; label: string; icon: React.ElementType; permission: Permission };

const NAV: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboardIcon, permission: "dashboard:view" },
      { href: "/admin/reports", label: "Reports", icon: BarChart3Icon, permission: "reports:view" },
    ],
  },
  {
    label: "Commerce",
    items: [
      { href: "/admin/orders", label: "Orders", icon: ShoppingCartIcon, permission: "orders:manage" },
      { href: "/admin/products", label: "Products", icon: PackageIcon, permission: "products:write" },
      { href: "/admin/categories", label: "Categories", icon: FolderTreeIcon, permission: "categories:write" },
      { href: "/admin/customers", label: "Customers", icon: UsersIcon, permission: "customers:view" },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/admin/users", label: "Users & roles", icon: ShieldCheckIcon, permission: "users:manage" },
      { href: "/admin/audit-logs", label: "Audit logs", icon: ScrollTextIcon, permission: "audit:view" },
      { href: "/admin/integrations", label: "Integrations", icon: PlugZapIcon, permission: "settings:manage" },
    ],
  },
];

export function AppSidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/admin" />}>
              <span className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <StoreIcon className="size-4" />
              </span>
              <span className="grid flex-1 text-left leading-tight">
                <span className="truncate font-semibold">Nexus Commerce</span>
                <span className="truncate text-xs text-muted-foreground">Admin console</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {NAV.map((group) => {
          const items = group.items.filter((i) => hasPermission(role, i.permission));
          if (items.length === 0) return null;
          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={isActive(item.href)}
                        tooltip={item.label}
                        render={<Link href={item.href} />}
                      >
                        <item.icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="View storefront" render={<Link href="/" />}>
              <StoreIcon />
              <span>View storefront</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="API docs" render={<a href="/api/v1/products" target="_blank" rel="noreferrer" />}>
              <FileTextIcon />
              <span>Public API</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
