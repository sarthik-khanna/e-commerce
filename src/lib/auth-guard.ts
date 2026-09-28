import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasPermission, type Permission } from "@/lib/rbac";

/** For pages: returns the signed-in user or redirects to /login. */
export async function requireUser(callbackUrl?: string) {
  const session = await auth();
  if (!session?.user) {
    redirect(callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login");
  }
  return session.user;
}

/** For pages: returns the user if they hold the permission, else redirects. */
export async function requirePermission(permission: Permission) {
  const user = await requireUser();
  if (!hasPermission(user.role, permission)) redirect("/unauthorized");
  return user;
}

export class AuthorizationError extends Error {
  constructor(message = "You are not allowed to perform this action") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** For server actions and route handlers: throws instead of redirecting. */
export async function assertPermission(permission: Permission) {
  const session = await auth();
  if (!session?.user) throw new AuthorizationError("Please sign in");
  if (!hasPermission(session.user.role, permission)) throw new AuthorizationError();
  return session.user;
}
