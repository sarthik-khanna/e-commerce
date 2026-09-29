import "server-only";

// Feature flags derived from environment variables. Every third-party
// integration degrades gracefully so the app runs locally with only a database.

/**
 * Reads an environment variable, trimming whitespace and one pair of wrapping
 * quotes. Values copied from `.env` into a hosting dashboard (e.g. Vercel) often
 * keep their quotes — `"re_123"` — which would otherwise make keys invalid.
 */
export function readEnv(name: string): string | undefined {
  const raw = process.env[name]?.trim();
  if (!raw) return undefined;
  const unquoted = raw.replace(/^(["'])([\s\S]*)\1$/, "$2").trim();
  return unquoted || undefined;
}

export const env = {
  appUrl: readEnv("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000",
  isProduction: process.env.NODE_ENV === "production",
};

export const features = {
  google: Boolean(readEnv("AUTH_GOOGLE_ID") && readEnv("AUTH_GOOGLE_SECRET")),
  razorpay: Boolean(readEnv("RAZORPAY_KEY_ID") && readEnv("RAZORPAY_KEY_SECRET")),
  cloudinary: Boolean(
    readEnv("CLOUDINARY_CLOUD_NAME") && readEnv("CLOUDINARY_API_KEY") && readEnv("CLOUDINARY_API_SECRET"),
  ),
  // Gmail/SMTP (any recipient, no domain needed) or Resend.
  email: Boolean(
    (readEnv("SMTP_HOST") && readEnv("SMTP_USER") && readEnv("SMTP_PASS")) || readEnv("RESEND_API_KEY"),
  ),
};

/** Simulated payments are only allowed outside production when Razorpay keys are absent. */
export const canSimulatePayments = !features.razorpay && !env.isProduction;
