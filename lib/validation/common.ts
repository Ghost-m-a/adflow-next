import { z } from "zod";

export const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid ID.");

export const slugSchema = z
  .string()
  .trim()
  .min(3, "Slug must have at least 3 characters.")
  .max(80, "Slug must not exceed 80 characters.")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers, and hyphens."
  );

export const currencySchema = z
  .string()
  .trim()
  .regex(/^[A-Z]{3}$/, "Currency must be a three-letter code.");

export const urlSchema = z
  .string()
  .trim()
  .url("Enter a valid URL.")
  .max(2048)
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }, "Only HTTP and HTTPS URLs are supported.");

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}
