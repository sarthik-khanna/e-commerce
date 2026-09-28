"use client";

import Link from "next/link";
import { useTransition } from "react";
import { LayoutDashboardIcon, LogOutIcon, PackageIcon, StoreIcon } from "lucide-react";
import type { Role } from "@/generated/prisma/enums";
import { logoutAction } from "@/actions/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RoleBadge } from "@/components/status-badge";
import { initials } from "@/lib/format";
import { isStaff } from "@/lib/rbac";

type MenuUser = { name?: string | null; email?: string | null; image?: string | null; role: Role };

export function UserMenu({ user }: { user: MenuUser }) {
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="rounded-full" aria-label="Account menu" />}>
        <Avatar className="size-8">
          {user.image && <AvatarImage src={user.image} alt="" />}
          <AvatarFallback>{initials(user.name, user.email)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-1 font-normal">
            <span className="truncate text-sm font-medium text-foreground">{user.name ?? "Account"}</span>
            <span className="truncate text-xs">{user.email}</span>
            <span>
              <RoleBadge role={user.role} />
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {isStaff(user.role) && (
            <DropdownMenuItem render={<Link href="/admin" />}>
              <LayoutDashboardIcon /> Admin dashboard
            </DropdownMenuItem>
          )}
          <DropdownMenuItem render={<Link href="/orders" />}>
            <PackageIcon /> My orders
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/products" />}>
            <StoreIcon /> Storefront
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={pending}
          onClick={() => startTransition(() => logoutAction())}
        >
          <LogOutIcon /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
