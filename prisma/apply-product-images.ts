/**
 * Gives the demo products real photos WITHOUT resetting any data (unlike `npm run db:seed`,
 * which wipes users and orders).
 *
 *   npm run db:images -- --dry-run   # show what would change, write nothing
 *   npm run db:images                # apply
 *
 * Only products whose images are all placeholders (placehold.co) — or that have no images —
 * are changed, so photos an admin uploaded are never overwritten. Safe to run repeatedly.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { PRODUCT_IMAGES, imagesFor } from "./product-images";

const dryRun = process.argv.includes("--dry-run");
const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    max: process.env.DATABASE_POOL_MAX ? Number(process.env.DATABASE_POOL_MAX) : undefined,
  }),
});

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return "invalid-url";
  }
};

async function main() {
  let updated = 0;
  const skipped: string[] = [];
  const missing: string[] = [];

  for (const sku of Object.keys(PRODUCT_IMAGES)) {
    const product = await db.product.findUnique({
      where: { sku },
      select: { id: true, name: true, images: { select: { url: true } } },
    });
    if (!product) {
      missing.push(sku);
      continue;
    }

    const onlyPlaceholders = product.images.every((image) => hostOf(image.url) === "placehold.co");
    if (!onlyPlaceholders) {
      skipped.push(`${sku} ${product.name} (has custom images)`);
      continue;
    }

    const rows = imagesFor(sku, product.name);
    console.log(`${dryRun ? "[dry run] would update" : "updating"} ${sku} ${product.name}: ${product.images.length} → ${rows.length} images`);
    if (!dryRun) {
      await db.$transaction([
        db.productImage.deleteMany({ where: { productId: product.id } }),
        db.productImage.createMany({ data: rows.map((row) => ({ ...row, productId: product.id })) }),
      ]);
    }
    updated++;
  }

  console.log(`\n${dryRun ? "Would update" : "Updated"} ${updated} product(s).`);
  if (skipped.length) console.log(`Left alone (${skipped.length}):\n  ${skipped.join("\n  ")}`);
  if (missing.length) console.log(`Not in this database (${missing.length}): ${missing.join(", ")}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
