import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export async function audit(entry: {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  try {
    await db.auditLog.create({ data: entry });
  } catch (error) {
    // Auditing must never break the main operation.
    console.error("[audit] failed to write log", error);
  }
}
