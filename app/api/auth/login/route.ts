import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { connectToDatabase } from "@/lib/db/mongodb";
import User from "@/models/User";
import { loginSchema } from "@/lib/validation/auth";
import {
   createSessionToken,
   SESSION_COOKIE_NAME,
   sessionCookieOptions,
} from "@/lib/auth/session";
import { requireSameOrigin } from "@/lib/auth/requireSameOrigin";
import {
   internalErrorResponse,
   validationErrorResponse,
} from "@/lib/auth/authResponse";
import { verifyTwoFactorLogin, TwoFactorError } from "@/services/twofactor.service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
   const originError = requireSameOrigin(request);

   if (originError) {
      return originError;
   }

   try {
      const body: unknown = await request.json();
      const parsed = loginSchema.safeParse(body);

      if (!parsed.success) {
         return validationErrorResponse(parsed.error);
      }

      const { identifier, password, rememberMe } = parsed.data;
      const normalizedIdentifier = identifier.toLowerCase();

      await connectToDatabase();

      const user = await User.findOne({
         $or: [
            { username: normalizedIdentifier },
            { email: normalizedIdentifier },
         ],
      }).select("+passwordHash twoFactorEnabled");

      // Use the same error for a missing user and an incorrect password.
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
         return NextResponse.json(
            { error: "Invalid username/email or password." },
            { status: 401 },
         );
      }

      if (!user.isActive) {
         return NextResponse.json(
            { error: "This account is currently disabled." },
            { status: 403 },
         );
      }

      // Two-factor check.
      const totp = typeof body === "object" && body !== null && "totp" in body
        ? (body as { totp?: unknown }).totp
        : undefined;

      if (user.twoFactorEnabled) {
        if (typeof totp !== "string" || !totp.trim()) {
          // Signal to the client that a second factor is required.
          return NextResponse.json(
            { requiresTwoFactor: true },
            { status: 200 },
          );
        }

        try {
          const result = await verifyTwoFactorLogin(user._id.toString(), totp.trim());
          if (!result.ok) {
            return NextResponse.json(
              { error: "Invalid verification code." },
              { status: 401 },
            );
          }
        } catch (err) {
          if (err instanceof TwoFactorError) {
            return NextResponse.json(
              { error: err.message },
              { status: err.statusCode },
            );
          }
          throw err;
        }
      }

      user.lastLoginAt = new Date();
      await user.save();

      const token = await createSessionToken(
         {
            userId: user._id.toString(),
            username: user.username,
            email: user.email,
         },
         rememberMe,
      );

      const response = NextResponse.json({
         message: "Login successful.",
         user: {
            id: user._id.toString(),
            name: user.name,
            username: user.username,
            email: user.email,
            avatarUrl: user.avatarUrl ?? "",
         },
      });

      response.cookies.set(
         SESSION_COOKIE_NAME,
         token,
         sessionCookieOptions(rememberMe),
      );

      return response;
   } catch (error) {
      console.error("Login error:", error);
      return internalErrorResponse();
   }
}
