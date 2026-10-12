import { z } from "zod";

export const registerSchema = z
   .object({
      name: z
         .string()
         .trim()
         .min(2, "Enter your full name.")
         .max(100, "Your name is too long."),

      username: z
         .string()
         .trim()
         .toLowerCase()
         .min(3, "Username must have at least 3 characters.")
         .max(30, "Username cannot exceed 30 characters.")
         .regex(
            /^[a-z0-9_]+$/,
            "Use only lowercase letters, numbers, and underscores.",
         ),

      email: z
         .string()
         .trim()
         .toLowerCase()
         .email("Enter a valid email address.")
         .max(254),

      password: z
         .string()
         .min(12, "Password must have at least 12 characters.")
         .max(128, "Password cannot exceed 128 characters."),

      acceptedTerms: z.literal(true, {
         error: "You must accept the Terms and Conditions.",
      }),
   })
   .strict();

export const loginSchema = z
   .object({
      identifier: z
         .string()
         .trim()
         .min(1, "Enter your username or email.")
         .max(254),

      password: z.string().min(1, "Enter your password.").max(128),

      rememberMe: z.boolean().default(false),
   })
   .strict()
   .superRefine((data, ctx) => {
      const identifier = data.identifier;

      const looksLikeEmail = identifier.includes("@");

      if (looksLikeEmail) {
         if (!z.email().safeParse(identifier).success) {
            ctx.addIssue({
               code: "custom",
               path: ["identifier"],
               message: "Enter a valid email address or username.",
            });
         }
      } else if (
         identifier.length < 3 ||
         identifier.length > 30 ||
         !/^[a-zA-Z0-9_]+$/.test(identifier)
      ) {
         ctx.addIssue({
            code: "custom",
            path: ["identifier"],
            message: "Enter a valid email address or username.",
         });
      }
   });
