"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { AuthorizationError, assertPermission } from "@/lib/auth-guard";
import { type ActionState, userRoleSchema } from "@/lib/validations";

async function guardNotSelf(targetId: string) {
  const user = await assertPermission("users:manage");
  if (user.id === targetId) throw new AuthorizationError("You can't change your own account here");
  return user;
}

async function ensureAnotherAdminRemains(targetId: string) {
  const target = await db.user.findUnique({ where: { id: targetId }, select: { role: true } });
  if (target?.role !== "ADMIN") return;
  const admins = await db.user.count({ where: { role: "ADMIN", isActive: true } });
  if (admins <= 1) throw new AuthorizationError("At least one active admin is required");
}

export async function updateUserRoleAction(userId: string, role: string): Promise<ActionState> {
  try {
    const parsed = userRoleSchema.safeParse({ userId, role });
    if (!parsed.success) return { message: "Invalid role" };
    const actor = await guardNotSelf(userId);
    if (parsed.data.role !== "ADMIN") await ensureAnotherAdminRemains(userId);

    await db.user.update({ where: { id: userId }, data: { role: parsed.data.role } });
    await audit({
      userId: actor.id,
      action: "user.role.update",
      entity: "User",
      entityId: userId,
      metadata: { role: parsed.data.role },
    });
    revalidatePath("/admin/users");
    return { ok: true, message: `Role changed to ${parsed.data.role.toLowerCase()}` };
  } catch (error) {
    if (error instanceof AuthorizationError) return { message: error.message };
    throw error;
  }
}

export async function toggleUserActiveAction(userId: string): Promise<ActionState> {
  try {
    const actor = await guardNotSelf(userId);
    const target = await db.user.findUniqueOrThrow({ where: { id: userId } });
    if (target.isActive) await ensureAnotherAdminRemains(userId);

    await db.$transaction([
      db.user.update({ where: { id: userId }, data: { isActive: !target.isActive } }),
      // Kill any database sessions (OAuth) immediately; JWTs expire on next revalidation.
      db.session.deleteMany({ where: { userId } }),
    ]);
    await audit({
      userId: actor.id,
      action: target.isActive ? "user.deactivate" : "user.activate",
      entity: "User",
      entityId: userId,
    });
    revalidatePath("/admin/users");
    return { ok: true, message: target.isActive ? "User deactivated" : "User activated" };
  } catch (error) {
    if (error instanceof AuthorizationError) return { message: error.message };
    throw error;
  }
}
