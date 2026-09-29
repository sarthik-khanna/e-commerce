import "server-only";
import type { ReactElement } from "react";
import { render } from "@react-email/render";
import nodemailer from "nodemailer";
import { Resend } from "resend";
import { readEnv } from "@/lib/env";

// Two interchangeable providers:
//  • SMTP (e.g. a Gmail account + App Password) — free, delivers to any address, no domain needed.
//  • Resend — needs a verified domain to email anyone; in test mode it only delivers to the account owner.
// SMTP wins when both are configured.

const DEFAULT_FROM = "Nexus Commerce <onboarding@resend.dev>";
// "Name <user@domain>" or a bare "user@domain"
const FROM_PATTERN = /^(?:[^<>]+<[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+>|[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+)$/;

const smtpHost = readEnv("SMTP_HOST");
const smtpUser = readEnv("SMTP_USER");
const rawSmtpPass = readEnv("SMTP_PASS");
// Google shows App Passwords in groups ("abcd efgh ijkl mnop"); the spaces aren't part of it.
const smtpPass = smtpHost?.endsWith("gmail.com") ? rawSmtpPass?.replace(/\s+/g, "") : rawSmtpPass;
const smtpPort = Number(readEnv("SMTP_PORT") ?? 465);

const transporter =
  smtpHost && smtpUser && smtpPass
    ? nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465, // 465 = implicit TLS; 587 upgrades with STARTTLS
        auth: { user: smtpUser, pass: smtpPass },
        connectionTimeout: 10_000,
      })
    : null;

const resendKey = readEnv("RESEND_API_KEY");
const resend = !transporter && resendKey ? new Resend(resendKey) : null;

function configuredFrom() {
  const configured = readEnv("EMAIL_FROM");
  if (!configured) return undefined;
  if (FROM_PATTERN.test(configured)) return configured;
  console.warn(`[email] EMAIL_FROM "${configured}" is not a valid sender; ignoring it`);
  return undefined;
}

function resolveFrom() {
  const configured = configuredFrom();
  if (transporter) {
    // SMTP servers like Gmail only send as the signed-in account, so keep the
    // display name from EMAIL_FROM but always use the SMTP address.
    const name = configured?.match(/^\s*"?([^"<]+?)"?\s*</)?.[1] ?? "Nexus Commerce";
    return `${name} <${smtpUser}>`;
  }
  return configured ?? DEFAULT_FROM;
}

export const emailConfig = {
  provider: transporter ? ("smtp" as const) : resend ? ("resend" as const) : ("none" as const),
  configured: Boolean(transporter || resend),
  from: resolveFrom(),
  smtpHost,
  keyLooksValid: resend ? (resendKey?.startsWith("re_") ?? false) : true,
};

export type EmailResult = { ok: true; id?: string } | { ok: false; error: string; hint?: string };

/** Turns provider error messages into a concrete next step. */
function hintFor(message: string): string | undefined {
  const m = message.toLowerCase();
  // SMTP / Gmail
  if (m.includes("username and password not accepted") || m.includes("invalid login") || m.includes("eauth") || m.includes("535"))
    return "SMTP login failed. For Gmail, SMTP_USER must be your full Gmail address and SMTP_PASS a 16-character App Password (Google Account → Security → 2-Step Verification → App passwords) — not your normal password.";
  if (m.includes("application-specific password required") || m.includes("534"))
    return "Gmail requires an App Password. Turn on 2-Step Verification, create an App Password, and use it as SMTP_PASS.";
  if (m.includes("timeout") || m.includes("econnrefused") || m.includes("enotfound") || m.includes("econnection"))
    return "Couldn't reach the SMTP server. For Gmail use SMTP_HOST=smtp.gmail.com and SMTP_PORT=465.";
  if (m.includes("daily") && m.includes("limit"))
    return "The SMTP account hit its daily sending limit (about 500 emails/day for Gmail). Try again tomorrow.";
  // Resend
  if (m.includes("testing email address"))
    return "Resend doesn't accept placeholder domains such as example.com or test.com. Use a real inbox.";
  if (m.includes("testing emails") || m.includes("your own email"))
    return "Resend is in test mode: it only delivers to the email address you signed up to Resend with. Without a domain, send through Gmail instead (set SMTP_HOST, SMTP_USER and SMTP_PASS).";
  if (m.includes("api key is invalid") || m.includes("invalid api key") || m.includes("missing api key"))
    return "RESEND_API_KEY is wrong. Copy it again from Resend → API Keys, save it (without quotes) in your environment variables, then redeploy.";
  if (m.includes("domain") && m.includes("not verified"))
    return "EMAIL_FROM uses a domain that isn't verified in Resend. Verify it under Resend → Domains, or use Nexus Commerce <onboarding@resend.dev>.";
  if (m.includes("from"))
    return 'EMAIL_FROM must look like "Your Name <you@yourdomain.com>".';
  if (m.includes("rate limit") || m.includes("too many"))
    return "The provider's rate limit was reached. Wait a moment and try again.";
  return undefined;
}

/** "sarthik@example.com" → "sa***@example.com", so logs don't store full addresses. */
function mask(address: string) {
  const [user, domain] = address.split("@");
  return domain ? `${user.slice(0, 2)}***@${domain}` : "***";
}

/**
 * Sends a transactional email. Never throws — failures are logged (with a hint)
 * and returned, so they can't break checkout or signup. With no provider
 * configured, emails are only logged (handy for local development).
 */
export async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string;
  subject: string;
  react: ReactElement;
}): Promise<EmailResult> {
  if (!transporter && !resend) {
    console.info(`[email:dev] To: ${to} | Subject: ${subject} (configure SMTP_* or RESEND_API_KEY to send for real)`);
    return {
      ok: false,
      error: "No email provider is configured in this environment",
      hint: "Set SMTP_HOST, SMTP_USER and SMTP_PASS (e.g. Gmail with an App Password) or RESEND_API_KEY. On Vercel, new variables only apply after you redeploy.",
    };
  }
  try {
    // Render here rather than passing `react` to Resend: the SDK's own dynamic
    // import of @react-email/render isn't reliably resolvable from Next's server bundle.
    const [html, text] = await Promise.all([render(react), render(react, { plainText: true })]);

    let id: string | undefined;
    if (transporter) {
      const info = await transporter.sendMail({ from: emailConfig.from, to, subject, html, text });
      id = info.messageId;
    } else {
      const { data, error } = await resend!.emails.send({ from: emailConfig.from, to, subject, html, text });
      if (error) {
        const hint = hintFor(error.message);
        console.error(`[email] NOT sent "${subject}" to ${mask(to)}: ${error.message}${hint ? ` → ${hint}` : ""}`);
        return { ok: false, error: error.message, hint };
      }
      id = data?.id;
    }
    console.info(`[email] sent "${subject}" to ${mask(to)} via ${emailConfig.provider} (id ${id})`);
    return { ok: true, id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const hint = hintFor(message);
    console.error(`[email] NOT sent "${subject}" to ${mask(to)}: ${message}${hint ? ` → ${hint}` : ""}`);
    return { ok: false, error: message, hint };
  }
}
