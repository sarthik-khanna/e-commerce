import { CircleAlertIcon, CircleCheckIcon, CircleMinusIcon } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { TestEmailForm } from "@/components/admin/test-email-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { emailConfig } from "@/lib/email";
import { env, features, readEnv } from "@/lib/env";
import { cn } from "@/lib/utils";

export const metadata = { title: "Integrations" };
export const dynamic = "force-dynamic";

type Status = "ok" | "warn" | "off";
type Row = { name: string; status: Status; summary: string; details: string[] };

const ICONS = {
  ok: <CircleCheckIcon className="size-5 text-emerald-600" />,
  warn: <CircleAlertIcon className="size-5 text-amber-500" />,
  off: <CircleMinusIcon className="size-5 text-muted-foreground" />,
};
const LABELS: Record<Status, string> = { ok: "Working", warn: "Needs attention", off: "Not configured" };

async function databaseRow(): Promise<Row> {
  const started = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return { name: "Database", status: "ok", summary: `Connected (${Date.now() - started} ms)`, details: [] };
  } catch {
    return { name: "Database", status: "warn", summary: "Cannot connect", details: ["Check DATABASE_URL."] };
  }
}

function siteRow(): Row {
  const url = readEnv("NEXT_PUBLIC_APP_URL");
  const local = !url || url.includes("localhost");
  if (env.isProduction && local) {
    return {
      name: "Site address",
      status: "warn",
      summary: url ? url : "NEXT_PUBLIC_APP_URL is not set",
      details: ["Links inside emails point to localhost. Set NEXT_PUBLIC_APP_URL to your live address, then redeploy."],
    };
  }
  return { name: "Site address", status: "ok", summary: url ?? env.appUrl, details: ["Used for links inside emails."] };
}

function emailRow(): Row {
  if (!emailConfig.configured) {
    return {
      name: "Email",
      status: env.isProduction ? "warn" : "off",
      summary: "No email provider configured",
      details: [
        "No emails are sent. Set SMTP_HOST, SMTP_USER and SMTP_PASS (Gmail + App Password, free) or RESEND_API_KEY, then redeploy — new variables only apply to new deployments.",
      ],
    };
  }
  if (emailConfig.provider === "smtp") {
    return {
      name: "Email (SMTP)",
      status: "ok",
      summary: `Sending through ${emailConfig.smtpHost} — use the test below to confirm delivery`,
      details: [
        `Sender: ${emailConfig.from}`,
        emailConfig.smtpHost?.endsWith("gmail.com")
          ? "Gmail delivers to any address, up to about 500 emails a day."
          : "Delivers to any address the SMTP server accepts.",
      ],
    };
  }
  const details = [`Sender: ${emailConfig.from}`];
  if (!emailConfig.keyLooksValid) details.push("RESEND_API_KEY doesn't start with re_ — it may be the wrong value.");
  if (emailConfig.from.includes("@resend.dev")) {
    details.push(
      "Test mode: Resend only delivers to the email address you signed up to Resend with. Verify a domain, or switch to Gmail SMTP (free), to email everyone.",
    );
  }
  return {
    name: "Email (Resend)",
    status: emailConfig.keyLooksValid ? "ok" : "warn",
    summary: "API key set — use the test below to confirm delivery",
    details,
  };
}

function paymentsRow(): Row {
  if (!features.razorpay) {
    return {
      name: "Payments (Razorpay)",
      status: env.isProduction ? "warn" : "off",
      summary: "RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set",
      details: [env.isProduction ? "Checkout is disabled on the live site." : "Checkout uses simulated payments in development."],
    };
  }
  const keyId = readEnv("RAZORPAY_KEY_ID")!;
  const mode = keyId.startsWith("rzp_live_") ? "Live mode" : keyId.startsWith("rzp_test_") ? "Test mode" : "Unknown key type";
  return {
    name: "Payments (Razorpay)",
    status: "ok",
    summary: mode,
    details: [
      readEnv("RAZORPAY_WEBHOOK_SECRET")
        ? "Webhook secret set."
        : "Webhook secret not set (optional) — payments are still confirmed in the browser.",
    ],
  };
}

function uploadsRow(): Row {
  return features.cloudinary
    ? { name: "Image uploads (Cloudinary)", status: "ok", summary: `Cloud: ${readEnv("CLOUDINARY_CLOUD_NAME")}`, details: ["If uploads fail with “missing permissions”, give the API key upload access in Cloudinary."] }
    : { name: "Image uploads (Cloudinary)", status: "off", summary: "Not configured", details: ["Admins can paste image URLs instead."] };
}

function googleRow(): Row {
  return features.google
    ? { name: "Google sign-in", status: "ok", summary: "Enabled", details: [`Redirect URI: ${env.appUrl}/api/auth/callback/google`] }
    : { name: "Google sign-in", status: "off", summary: "Not configured", details: ["The Google button is hidden on the login page."] };
}

export default async function IntegrationsPage() {
  const user = await requirePermission("settings:manage");
  const rows = [await databaseRow(), siteRow(), emailRow(), paymentsRow(), uploadsRow(), googleRow()];
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7);

  return (
    <>
      <PageHeader
        title="Integrations"
        description="Which services this deployment can use. Secret values are never shown."
      />

      <Card className="py-0">
        <ul className="divide-y">
          {rows.map((row) => (
            <li key={row.name} className="flex gap-3 p-4">
              <span className="mt-0.5">{ICONS[row.status]}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{row.name}</p>
                  <span
                    className={cn(
                      "text-xs",
                      row.status === "ok" && "text-emerald-600",
                      row.status === "warn" && "text-amber-600",
                      row.status === "off" && "text-muted-foreground",
                    )}
                  >
                    {LABELS[row.status]}
                  </span>
                </div>
                <p className="text-sm break-words text-muted-foreground">{row.summary}</p>
                {row.details.map((d) => (
                  <p key={d} className="text-xs break-words text-muted-foreground">
                    {d}
                  </p>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Send a test email</CardTitle>
          <CardDescription>
            Sends a real email through your email provider and shows its exact answer, so you can see why an email isn&apos;t
            arriving.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TestEmailForm defaultTo={user.email ?? ""} />
        </CardContent>
      </Card>

      <p className="mt-6 text-xs text-muted-foreground">
        Environment: {env.isProduction ? "production" : "development"}
        {process.env.VERCEL_REGION ? ` · Vercel region ${process.env.VERCEL_REGION}` : ""}
        {commit ? ` · deployed commit ${commit}` : ""}
      </p>
    </>
  );
}
