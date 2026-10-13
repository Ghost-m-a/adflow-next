import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { connectToDatabase } from "@/lib/db/mongodb";
import User from "@/models/User";
import { registerSchema } from "@/lib/validation/auth";
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
import {
   sendSafe,
   sendVerificationEmail,
   sendWelcomeEmail,
} from "@/services/email.service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
   const originError = requireSameOrigin(request);

   if (originError) {
      return originError;
   }

   try {
      const body: unknown = await request.json();
      const parsed = registerSchema.safeParse(body);

      if (!parsed.success) {
         return validationErrorResponse(parsed.error);
      }

      const { name, username, email, password } = parsed.data;

      await connectToDatabase();

      const existingUser = await User.findOne({
         $or: [{ username }, { email }],
      })
         .select("_id username email")
         .lean();

      if (existingUser) {
         const usernameExists = existingUser.username === username;

         return NextResponse.json(
            {
               error: usernameExists
                  ? "That username is already taken."
                  : "An account with this email already exists.",
            },
            { status: 409 },
         );
      }

      const passwordHash = await bcrypt.hash(password, 12);

      let user;

      try {
         user = await User.create({
            name,
            username,
            email,
            passwordHash,
            acceptedTermsAt: new Date(),
            isEmailVerified: false,
            isActive: true,
         });
      } catch (error: unknown) {
         // A concurrent request may have claimed the username/email after
         // the earlier lookup. MongoDB's unique index is the final safeguard.
         if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === 11000
         ) {
            return NextResponse.json(
               { error: "That username or email is already registered." },
               { status: 409 },
            );
         }

         throw error;
      }

      const token = await createSessionToken(
         {
            userId: user._id.toString(),
            username: user.username,
            email: user.email,
         },
         false,
      );

      const response = NextResponse.json(
         {
            message: "Account created successfully.",
            user: {
               id: user._id.toString(),
               name: user.name,
               username: user.username,
               email: user.email,
               avatarUrl: user.avatarUrl ?? "",
            },
         },
         { status: 201 },
      );

      response.cookies.set(
         SESSION_COOKIE_NAME,
         token,
         sessionCookieOptions(false),
      );

      // Fire-and-forget — never block the signup response on email.
      const userId = user._id.toString();
      sendSafe(sendWelcomeEmail, userId);
      sendSafe(sendVerificationEmail, userId);

      return response;
   } catch (error) {
      console.error("Registration error:", error);
      return internalErrorResponse();
   }
}
