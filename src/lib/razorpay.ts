import "server-only";
import crypto from "node:crypto";
import Razorpay from "razorpay";
import { features, readEnv } from "@/lib/env";

let client: Razorpay | null = null;

export function getRazorpay() {
  if (!features.razorpay) throw new Error("Razorpay is not configured");
  client ??= new Razorpay({
    key_id: readEnv("RAZORPAY_KEY_ID")!,
    key_secret: readEnv("RAZORPAY_KEY_SECRET")!,
  });
  return client;
}

function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

/** Verifies the signature Razorpay Checkout returns to the browser after payment. */
export function verifyPaymentSignature(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
}) {
  const expected = crypto
    .createHmac("sha256", readEnv("RAZORPAY_KEY_SECRET")!)
    .update(`${params.razorpayOrderId}|${params.razorpayPaymentId}`)
    .digest("hex");
  return safeEqual(expected, params.signature);
}

/** Verifies the X-Razorpay-Signature header on webhook calls (HMAC of the raw body). */
export function verifyWebhookSignature(rawBody: string, signature: string | null) {
  const secret = readEnv("RAZORPAY_WEBHOOK_SECRET");
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}
