import "server-only";
import type { ReactElement } from "react";
import { render } from "@react-email/render";
import { Resend } from "resend";
import { readEnv } from "@/lib/env";

const DEFAULT_FROM = "Nexus Commerce <onboarding@resend.dev>";
// "Name <user@domain>" or a bare "user@domain"
const FROM_PATTERN = /^(?:[^<>]+<[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+>|[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+)$/;

const apiKey = readEnv("RESEND_API_KEY");
const resend = apiKey ? new Resend(apiKey) : null;

function resolveFrom() {
  const configured = readEnv("EMAIL_FROM");
  if (!configured) return DEFAULT_FROM;
  if (FROM_PATTERN.test(configured)) return configured;
  console.warn(`[email] EMAIL_FROM "${configured}" is not a valid sender; using ${DEFAULT_FROM} instead`);
  return DEFAULT_FROM;
}

export const emailConfig = {
  configured: Boolean(resend),
  from: resolveFrom(),
  keyLooksValid: apiKey?.startsWith("re_") ?? false,
};

export type EmailResult = { ok: true; id?: string } | { ok: false; error: string; hint?: string };

/** Turns Resend's error messages into a concrete next step. */
function hintFor(message: string): string | undefined {
  const m = message.toLowerCase();
  if (m.includes("testing email address"))
    return "Resend doesn't accept placeholder domains such as example.com or test.com. Use a real inbox.";
  if (m.includes("testing emails") || m.includes("your own email"))
    return "Resend is in test mode: it only delivers to the email address you signed up to Resend with. Send to that address, or verify a domain in Resend → Domains and set EMAIL_FROM to an address on it.";
  if (m.includes("api key is invalid") || m.includes("invalid api key") || m.includes("missing api key"))
    return "RESEND_API_KEY is wrong. Copy it again from Resend → API Keys, save it (without quotes) in your environment variables, then redeploy.";
  if (m.includes("domain") && m.includes("not verified"))
    return "EMAIL_FROM uses a domain that isn't verified in Resend. Verify it under Resend → Domains, or use Nexus Commerce <onboarding@resend.dev>.";
  if (m.includes("from"))
    return 'EMAIL_FROM must look like "Your Name <you@yourdomain.com>".';
  if (m.includes("rate limit") || m.includes("too many"))
    return "Resend's rate limit was reached. Wait a moment and try again.";
  return undefined;
}

/** "sarthik@example.com" → "sa***@example.com", so logs don't store full addresses. */
function mask(address: string) {
  const [user, domain] = address.split("@");
  return domain ? `${user.slice(0, 2)}***@${domain}` : "***";
}

/**
 * Sends a transactional email. Never throws — failures are logged (with a hint)
 * and returned, so they can't break checkout or signup. Without RESEND_API_KEY,
 * emails are only logged (handy for local development).
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
  if (!resend) {
    const error = "RESEND_API_KEY is not set in this environment";
    console.info(`[email:dev] To: ${to} | Subject: ${subject} (set RESEND_API_KEY to send for real)`);
    return {
      ok: false,
      error,
      hint: "Add RESEND_API_KEY to your environment variables. On Vercel, new variables only apply after you redeploy.",
    };
  }
  try {
    // Render here rather than passing `react` to Resend: the SDK's own dynamic
    // import of @react-email/render isn't reliably resolvable from Next's server bundle.
    const [html, text] = await Promise.all([render(react), render(react, { plainText: true })]);
    const { data, error } = await resend.emails.send({ from: emailConfig.from, to, subject, html, text });
    if (error) {
      const hint = hintFor(error.message);
      console.error(`[email] NOT sent "${subject}" to ${mask(to)}: ${error.message}${hint ? ` → ${hint}` : ""}`);
      return { ok: false, error: error.message, hint };
    }
    console.info(`[email] sent "${subject}" to ${mask(to)} (id ${data?.id})`);
    return { ok: true, id: data?.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[email] failed to send "${subject}" to ${mask(to)}:`, error);
    return { ok: false, error: message, hint: hintFor(message) };
  }
}
