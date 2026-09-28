import { NextResponse } from "next/server";
import { AuthorizationError, assertPermission } from "@/lib/auth-guard";
import { createUploadSignature } from "@/lib/cloudinary";
import { features } from "@/lib/env";

/**
 * POST /api/upload/sign
 * Returns a signed payload the browser uses to upload an image directly to
 * Cloudinary. Only staff who can edit products may request one.
 */
export async function POST() {
  try {
    await assertPermission("products:write");
  } catch (error) {
    const status = error instanceof AuthorizationError ? 403 : 500;
    return NextResponse.json({ error: (error as Error).message }, { status });
  }

  if (!features.cloudinary) {
    return NextResponse.json(
      { error: "Cloudinary is not configured. Paste an image URL instead." },
      { status: 503 },
    );
  }

  return NextResponse.json(createUploadSignature());
}
