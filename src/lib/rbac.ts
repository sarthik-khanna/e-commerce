import type { Role } from "@/generated/prisma/enums";

// Central permission map. Every server action, route handler and admin page
// checks a permission from this list — never a raw role — so access rules
// live in exactly one place.
export const PERMISSIONS = {
  "dashboard:view": ["ADMIN", "MANAGER"],
  "products:write": ["ADMIN", "MANAGER"],
  "products:delete": ["ADMIN"],
  "categories:write": ["ADMIN", "MANAGER"],
  "orders:manage": ["ADMIN", "MANAGER"],
  "orders:refund": ["ADMIN"],
  "customers:view": ["ADMIN", "MANAGER"],
  "reports:view": ["ADMIN", "MANAGER"],
  "users:manage": ["ADMIN"],
  "audit:view": ["ADMIN"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: Role | undefined | null, permission: Permission) {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

export const STAFF_ROLES: readonly Role[] = ["ADMIN", "MANAGER"];

export function isStaff(role: Role | undefined | null) {
  return !!role && STAFF_ROLES.includes(role);
}
