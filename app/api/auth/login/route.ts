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
      }).select("+passwordHash");

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

      user.lastLoginAt = new Date();
      await user.save();

      const token = await createSessionToken(
         {
            userId: user._id.toString(),
            username: user.username,
            email: user.email,
            sessionVersion: user.sessionVersion ?? 0,
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
