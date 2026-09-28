import { z } from "zod";

const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password is too long")
  .regex(/[A-Za-z]/, "Password must contain a letter")
  .regex(/[0-9]/, "Password must contain a number");

export const loginSchema = z.object({
  email: z.email("Enter a valid email").toLowerCase().trim(),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Name is too short").max(80),
    email: z.email("Enter a valid email").toLowerCase().trim(),
    password,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export const forgotPasswordSchema = z.object({
  email: z.email("Enter a valid email").toLowerCase().trim(),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    email: z.email().toLowerCase().trim(),
    password,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(300).optional().or(z.literal("")),
});

export const productImageSchema = z.object({
  url: z.url(),
  publicId: z.string().nullish(),
  alt: z.string().nullish(),
});

export const productSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(140)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes"),
  description: z.string().trim().min(10, "Add a longer description").max(5000),
  sku: z.string().trim().min(2).max(40).toUpperCase(),
  price: z.coerce.number().positive("Price must be greater than 0").max(10_000_000),
  compareAtPrice: z.coerce.number().nonnegative().max(10_000_000).optional(),
  stock: z.coerce.number().int().min(0).max(1_000_000),
  categoryId: z.string().min(1, "Choose a category"),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  images: z.array(productImageSchema).max(8, "Up to 8 images"),
});

export const shippingSchema = z.object({
  shippingName: z.string().trim().min(2, "Enter the recipient name").max(80),
  shippingPhone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  shippingLine1: z.string().trim().min(3, "Enter an address").max(120),
  shippingLine2: z.string().trim().max(120).optional().or(z.literal("")),
  shippingCity: z.string().trim().min(2, "Enter a city").max(60),
  shippingState: z.string().trim().min(2, "Enter a state").max(60),
  shippingPostalCode: z.string().trim().regex(/^\d{6}$/, "Enter a 6-digit PIN code"),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const cartItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(20),
});

export const checkoutSchema = shippingSchema.extend({
  items: z.array(cartItemSchema).min(1, "Your cart is empty").max(50),
});

export const orderStatusSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum(["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]),
});

export const userRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["ADMIN", "MANAGER", "CUSTOMER"]),
});

export type ActionState<T = undefined> = {
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  data?: T;
};

export function fieldErrorsOf(error: z.ZodError) {
  return z.flattenError(error).fieldErrors as Record<string, string[] | undefined>;
}
