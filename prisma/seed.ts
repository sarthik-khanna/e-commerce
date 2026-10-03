/**
 * Seeds demo data: staff accounts, categories, products, customers and ~6
 * months of orders so the analytics dashboard has something to show.
 *
 *   npm run db:seed
 *
 * Safe to re-run: it wipes catalog/order data first (never run against production).
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma, type Product, type User } from "../src/generated/prisma/client";
import type { OrderStatus, PaymentStatus } from "../src/generated/prisma/enums";
import { imagesFor } from "./product-images";

const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    max: process.env.DATABASE_POOL_MAX ? Number(process.env.DATABASE_POOL_MAX) : undefined,
  }),
});

// Demo credentials — also documented in README.md. Change them before deploying.
const DEMO_PASSWORD = "Password123";
const STAFF = [
  { name: "Admin User", email: "admin@nexus.test", role: "ADMIN" as const },
  { name: "Maya Manager", email: "manager@nexus.test", role: "MANAGER" as const },
  { name: "Chris Customer", email: "customer@nexus.test", role: "CUSTOMER" as const },
];

const CATEGORIES = [
  { name: "Electronics", color: "4f46e5", description: "Phones, audio and smart devices" },
  { name: "Fashion", color: "db2777", description: "Clothing, shoes and accessories" },
  { name: "Home & Kitchen", color: "0d9488", description: "Cookware, decor and appliances" },
  { name: "Sports", color: "ea580c", description: "Fitness gear and outdoor equipment" },
  { name: "Books", color: "7c3aed", description: "Bestsellers, tech and self-help" },
  { name: "Beauty", color: "e11d48", description: "Skincare, makeup and grooming" },
];

const PRODUCTS: Record<string, [name: string, price: number, mrp?: number][]> = {
  Electronics: [
    ["Wireless Noise-Cancelling Headphones", 7999, 12999],
    ["Smart Fitness Watch", 4499, 6999],
    ["Bluetooth Portable Speaker", 2499, 3499],
    ["USB-C Fast Charger 65W", 1799],
    ["Mechanical Keyboard", 5499, 6499],
    ["4K Action Camera", 12999, 16999],
  ],
  Fashion: [
    ["Classic Cotton T-Shirt", 599, 999],
    ["Slim Fit Denim Jeans", 1899, 2499],
    ["Leather Sneakers", 3299, 4499],
    ["Wool Blend Overcoat", 6499],
    ["Canvas Backpack", 1499, 1999],
  ],
  "Home & Kitchen": [
    ["Non-Stick Cookware Set", 3999, 5499],
    ["Ceramic Dinner Set (24 pc)", 2799],
    ["Air Fryer 4.5L", 5999, 8999],
    ["Scented Soy Candle", 449],
    ["Memory Foam Pillow", 1299, 1799],
  ],
  Sports: [
    ["Yoga Mat 6mm", 899, 1299],
    ["Adjustable Dumbbells 20kg", 4999],
    ["Running Shoes", 3799, 4999],
    ["Insulated Water Bottle", 699],
  ],
  Books: [
    ["Clean Code", 649],
    ["Atomic Habits", 499, 799],
    ["Designing Data-Intensive Applications", 1899],
    ["The Pragmatic Programmer", 899],
  ],
  Beauty: [
    ["Vitamin C Face Serum", 799, 1199],
    ["Beard Grooming Kit", 1199],
    ["Matte Lipstick Set", 999, 1499],
  ],
};

const FIRST = ["Aarav", "Diya", "Rohan", "Ananya", "Vikram", "Isha", "Kabir", "Meera", "Arjun", "Sara", "Nikhil", "Priya", "Dev", "Kavya", "Rahul", "Neha"];
const LAST = ["Sharma", "Patel", "Iyer", "Khan", "Reddy", "Gupta", "Singh", "Das", "Mehta", "Nair"];
const CITIES = [
  ["Mumbai", "Maharashtra", "400001"],
  ["Bengaluru", "Karnataka", "560001"],
  ["Delhi", "Delhi", "110001"],
  ["Hyderabad", "Telangana", "500001"],
  ["Chennai", "Tamil Nadu", "600001"],
  ["Pune", "Maharashtra", "411001"],
  ["Kolkata", "West Bengal", "700001"],
  ["Jaipur", "Rajasthan", "302001"],
];

// Deterministic pseudo-random numbers so every seed produces the same data.
let seed = 42;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
const between = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed in production");

  console.log("Clearing existing data…");
  await db.auditLog.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.productImage.deleteMany();
  await db.product.deleteMany();
  await db.category.deleteMany();
  await db.passwordResetToken.deleteMany();
  await db.session.deleteMany();
  await db.account.deleteMany();
  await db.user.deleteMany();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  console.log("Creating staff and demo accounts…");
  for (const s of STAFF) {
    await db.user.create({ data: { ...s, passwordHash, emailVerified: new Date() } });
  }

  console.log("Creating customers…");
  const now = Date.now();
  const DAY = 86_400_000;
  const customers: User[] = [];
  for (let i = 0; i < 40; i++) {
    const first = pick(FIRST);
    const last = pick(LAST);
    customers.push(
      await db.user.create({
        data: {
          name: `${first} ${last}`,
          email: `${first}.${last}.${i}@example.com`.toLowerCase(),
          passwordHash,
          createdAt: new Date(now - between(1, 200) * DAY),
        },
      }),
    );
  }
  customers.push((await db.user.findUnique({ where: { email: "customer@nexus.test" } }))!);

  console.log("Creating catalog…");
  const products: Product[] = [];
  let skuCounter = 1000;
  for (const cat of CATEGORIES) {
    const category = await db.category.create({
      data: { name: cat.name, slug: slugify(cat.name), description: cat.description },
    });
    for (const [name, price, mrp] of PRODUCTS[cat.name]) {
      const sku = `SKU-${skuCounter++}`;
      // Real photos from prisma/product-images.ts; a coloured placeholder only if a product has none.
      const photos = imagesFor(sku, name);
      const text = encodeURIComponent(name.replace(/\s*\(.*\)/, ""));
      products.push(
        await db.product.create({
          data: {
            name,
            slug: slugify(name),
            description: `${name} — thoughtfully designed and built to last.\n\n• Premium materials\n• 1-year warranty\n• Free returns within 7 days`,
            sku,
            price: price * 100,
            compareAtPrice: mrp ? mrp * 100 : null,
            stock: between(0, 10) === 0 ? between(0, 6) : between(15, 200),
            isFeatured: rand() < 0.35,
            categoryId: category.id,
            images: {
              create: photos.length
                ? photos
                : [{ url: `https://placehold.co/800x800/${cat.color}/ffffff/png?text=${text}`, alt: name, position: 0 }],
            },
          },
        }),
      );
    }
  }

  console.log("Creating ~6 months of orders…");
  // Orders are built in memory and bulk-inserted below, so seeding a remote
  // database (e.g. Neon) takes seconds instead of one round trip per order.
  const orderRows: Prisma.OrderCreateManyInput[] = [];
  const itemRows: Prisma.OrderItemCreateManyInput[] = [];
  let orderCount = 0;
  for (let daysAgo = 180; daysAgo >= 0; daysAgo--) {
    // Gentle growth trend plus weekend bumps.
    const date = new Date(now - daysAgo * DAY);
    const weekend = [0, 6].includes(date.getUTCDay());
    const perDay = Math.max(0, Math.round((180 - daysAgo) / 45 + between(0, 3) + (weekend ? 2 : 0)));

    for (let n = 0; n < perDay; n++) {
      const user = pick(customers);
      const lines = Array.from({ length: between(1, 3) }, () => pick(products));
      const unique = [...new Map(lines.map((p) => [p.id, p])).values()];
      const items = unique.map((p) => ({ product: p, quantity: between(1, 2) }));
      const subtotal = items.reduce((s, i) => s + i.product.price * i.quantity, 0);
      const tax = Math.round(subtotal * 0.18);
      const shippingFee = subtotal >= 99900 ? 0 : 4900;
      const createdAt = new Date(date.getTime() - between(0, 20) * 3_600_000);
      const [city, state, pin] = pick(CITIES);

      const roll = rand();
      let paymentStatus: PaymentStatus = "PAID";
      let status: OrderStatus;
      if (roll < 0.05) {
        paymentStatus = "FAILED";
        status = "PENDING";
      } else if (roll < 0.08) {
        paymentStatus = "REFUNDED";
        status = "CANCELLED";
      } else if (daysAgo > 7) status = "DELIVERED";
      else if (daysAgo > 3) status = pick(["SHIPPED", "DELIVERED"] as OrderStatus[]);
      else status = pick(["PROCESSING", "SHIPPED"] as OrderStatus[]);

      orderCount++;
      const orderId = randomUUID();
      orderRows.push({
        id: orderId,
        orderNumber: `ORD-${createdAt.toISOString().slice(0, 10).replace(/-/g, "")}-${String(orderCount).padStart(5, "0")}`,
        userId: user.id,
        status,
        paymentStatus,
        subtotal,
        tax,
        shippingFee,
        total: subtotal + tax + shippingFee,
        paidAt: paymentStatus === "FAILED" ? null : new Date(createdAt.getTime() + 60_000),
        razorpayPaymentId: paymentStatus === "FAILED" ? null : `pay_demo_${orderCount}`,
        shippingName: user.name ?? "Customer",
        shippingPhone: `9${String(between(100000000, 999999999))}`,
        shippingLine1: `${between(1, 999)}, ${pick(["MG Road", "Park Street", "Link Road", "Main Street"])}`,
        shippingCity: city,
        shippingState: state,
        shippingPostalCode: pin,
        createdAt,
        updatedAt: createdAt,
      });
      for (const i of items) {
        itemRows.push({
          orderId,
          productId: i.product.id,
          productName: i.product.name,
          productSku: i.product.sku,
          unitPrice: i.product.price,
          quantity: i.quantity,
        });
      }
    }
  }

  // Chunked to stay well under Postgres' bind-parameter limit.
  for (let i = 0; i < orderRows.length; i += 500) {
    await db.order.createMany({ data: orderRows.slice(i, i + 500) });
  }
  for (let i = 0; i < itemRows.length; i += 1000) {
    await db.orderItem.createMany({ data: itemRows.slice(i, i + 1000) });
  }

  console.log(`\n✔ Seeded ${products.length} products, ${customers.length} customers, ${orderCount} orders.`);
  console.log(`\nDemo logins (password: ${DEMO_PASSWORD})`);
  for (const s of STAFF) console.log(`  ${s.role.padEnd(8)} ${s.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
