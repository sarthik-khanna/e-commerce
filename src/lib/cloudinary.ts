import "server-only";
import { v2 as cloudinary } from "cloudinary";
import { features } from "@/lib/env";

export const UPLOAD_FOLDER = "enterprise-ecommerce/products";

if (features.cloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

/**
 * Creates a short-lived signature so the browser can upload directly to
 * Cloudinary. Files never pass through our server, which keeps uploads fast
 * and avoids serverless request-size limits.
 */
export function createUploadSignature() {
  const timestamp = Math.round(Date.now() / 1000);
  const params = { timestamp, folder: UPLOAD_FOLDER };
  const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET!);
  return {
    ...params,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
  };
}

export async function deleteImage(publicId: string) {
  if (!features.cloudinary) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("[cloudinary] failed to delete", publicId, error);
  }
}
