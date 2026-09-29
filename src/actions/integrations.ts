"use server";

import { z } from "zod";
import { audit } from "@/lib/audit";
import { AuthorizationError, assertPermission } from "@/lib/auth-guard";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { TestEmail } from "@/emails/templates";

export type TestEmailState = { ok?: boolean; message?: string; hint?: string };

const schema = z.object({ to: z.email("Enter a valid email address").trim() });

/** Sends a real email through Resend and reports Resend's exact answer to the admin. */
export async function sendTestEmailAction(_: TestEmailState, formData: FormData): Promise<TestEmailState> {
  let user;
  try {
    user = await assertPermission("settings:manage");
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message };
    throw error;
  }

  const parsed = schema.safeParse({ to: formData.get("to") });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid email" };

  const result = await sendEmail({
    to: parsed.data.to,
    subject: "Nexus Commerce test email",
    react: TestEmail({ appUrl: env.appUrl }),
  });
  await audit({
    userId: user.id,
    action: "integrations.email.test",
    entity: "Settings",
    metadata: { ok: result.ok },
  });

  return result.ok
    ? { ok: true, message: `Resend accepted the email (id ${result.id}). Check the inbox and spam folder of ${parsed.data.to}.` }
    : { ok: false, message: `Resend refused the email: ${result.error}`, hint: result.hint };
}
