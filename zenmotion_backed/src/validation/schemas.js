import { z } from "zod";

const email = z.string().trim().toLowerCase().email("Please enter a valid email address.").max(254);
const password = z.string().min(8, "Password must be at least 8 characters.").max(200);

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  email,
  password,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required.").max(200),
});

const cartItemSchema = z.object({
  id: z.string().trim().min(1),
  // Frontend sends `opts`; accept `options` too for flexibility.
  opts: z.record(z.string(), z.string()).optional(),
  options: z.record(z.string(), z.string()).optional(),
  qty: z.coerce.number().int().min(1).max(99).optional(),
  quantity: z.coerce.number().int().min(1).max(99).optional(),
  // We intentionally ignore any client-sent price fields.
});

export const shippingSchema = z.object({
  fullname: z.string().trim().min(1).max(120),
  addr1: z.string().trim().min(1).max(200),
  city: z.string().trim().min(1).max(120),
  zip: z.string().trim().min(1).max(40),
  country: z.string().trim().min(1).max(120),
});

export const checkoutSchema = z.object({
  email,
  items: z.array(cartItemSchema).min(1, "Your cart is empty."),
  method: z.enum(["card", "apple_pay", "paypal"]).optional().default("card"),
  shipping: shippingSchema.partial().optional(),
});

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  email,
  subject: z.string().trim().max(160).optional(),
  message: z.string().trim().min(1, "Message is required.").max(5000),
});
