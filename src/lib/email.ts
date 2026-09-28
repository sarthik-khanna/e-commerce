import "server-only";
import type { ReactElement } from "react";
import { render } from "@react-email/render";
import { Resend } from "resend";
import { features } from "@/lib/env";

const resend = features.email ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM ?? "Nexus Commerce <onboarding@resend.dev>";

/**
 * Sends a transactional email. Never throws — email failures are logged so they
 * can't break checkout or signup. Without RESEND_API_KEY, emails are logged to
 * the console instead (handy for local development).
 */
export async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string;
  subject: string;
  react: ReactElement;
}) {
  if (!resend) {
    console.info(`[email:dev] To: ${to} | Subject: ${subject} (set RESEND_API_KEY to send for real)`);
    return;
  }
  try {
    // Render here rather than passing `react` to Resend: the SDK's own dynamic
    // import of @react-email/render isn't reliably resolvable from Next's server bundle.
    const [html, text] = await Promise.all([render(react), render(react, { plainText: true })]);
    const { error } = await resend.emails.send({ from: FROM, to, subject, html, text });
    if (error) console.error("[email] Resend error", error);
  } catch (error) {
    console.error("[email] failed to send", error);
  }
}
