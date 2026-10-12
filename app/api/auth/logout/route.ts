import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { requireSameOrigin } from "@/lib/auth/requireSameOrigin";

export async function POST(request: NextRequest) {
   const originError = requireSameOrigin(request);

   if (originError) {
      return originError;
   }

   const response = NextResponse.json({ message: "Logged out successfully." });

   response.cookies.set(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
   });

   return response;
}
