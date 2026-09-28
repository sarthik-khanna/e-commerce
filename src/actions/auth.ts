"use server";

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { after } from "next/server";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { db } from "@/lib/db";
import { env, features } from "@/lib/env";
import { sendEmail } from "@/lib/email";
import { audit } from "@/lib/audit";
import {
  type ActionState,
  fieldErrorsOf,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validations";
import { PasswordResetEmail, WelcomeEmail } from "@/emails/templates";

function safeCallbackUrl(value: FormDataEntryValue | null) {
  const raw = typeof value === "string" && value ? value : "/";
  // Keep only the path + query so a crafted callbackUrl can never redirect
  // to another host (prevents open redirects).
  try {
    const url = new URL(raw, "http://placeholder.local");
    return url.pathname.startsWith("//") ? "/" : url.pathname + url.search;
  } catch {
    return "/";
  }
}

export async function loginAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: safeCallbackUrl(formData.get("callbackUrl")),
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { message: "Invalid email or password, or the account is disabled." };
    }
    throw error; // re-throw Next.js redirect
  }
}

export async function googleSignInAction(formData: FormData) {
  await signIn("google", { redirectTo: safeCallbackUrl(formData.get("callbackUrl")) });
}

export async function registerAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const { name, email, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { fieldErrors: { email: ["An account with this email already exists"] } };

  const user = await db.user.create({
    data: { name, email, passwordHash: await bcrypt.hash(password, 12) },
  });
  await audit({ userId: user.id, action: "user.register", entity: "User", entityId: user.id });

  after(() =>
    sendEmail({
      to: email,
      subject: "Welcome to Nexus Commerce",
      react: WelcomeEmail({ name, appUrl: env.appUrl }),
    }),
  );

  await signIn("credentials", { email, password, redirectTo: "/" });
  return { ok: true };
}

export async function forgotPasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const { email } = parsed.data;

  const user = await db.user.findUnique({ where: { email }, select: { id: true, isActive: true } });
  if (user?.isActive) {
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    await db.passwordResetToken.deleteMany({ where: { email } });
    await db.passwordResetToken.create({
      data: { email, tokenHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
    const resetUrl = `${env.appUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
    // Without an email provider in development, print the link so reset can still be tested.
    if (!features.email && !env.isProduction) console.info(`[auth:dev] Password reset link: ${resetUrl}`);
    after(() => sendEmail({ to: email, subject: "Reset your password", react: PasswordResetEmail({ resetUrl }) }));
  }

  // Same response whether or not the account exists (prevents email enumeration).
  return { ok: true, message: "If an account exists for that email, a reset link is on its way." };
}

export async function resetPasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const { token, email, password } = parsed.data;

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const record = await db.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record || record.email !== email || record.expiresAt < new Date()) {
    return { message: "This reset link is invalid or has expired. Please request a new one." };
  }

  const user = await db.user.update({
    where: { email },
    data: { passwordHash: await bcrypt.hash(password, 12) },
  });
  await db.passwordResetToken.deleteMany({ where: { email } });
  await audit({ userId: user.id, action: "user.password.reset", entity: "User", entityId: user.id });

  return { ok: true, message: "Password updated. You can now sign in." };
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}
