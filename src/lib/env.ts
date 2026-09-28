import "server-only";

// Feature flags derived from environment variables. Every third-party
// integration degrades gracefully so the app runs locally with only a database.

export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  isProduction: process.env.NODE_ENV === "production",
};

export const features = {
  google: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
  razorpay: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
  cloudinary: Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  ),
  email: Boolean(process.env.RESEND_API_KEY),
};

/** Simulated payments are only allowed outside production when Razorpay keys are absent. */
export const canSimulatePayments = !features.razorpay && !env.isProduction;
