import { NextRequest, NextResponse } from "next/server";

export function requireSameOrigin(request: NextRequest) {
   const origin = request.headers.get("origin");

   // Some non-browser clients do not send Origin. Authentication endpoints
   // should normally be called by the browser application.
   if (!origin) {
      return NextResponse.json(
         { error: "Origin header is required." },
         { status: 403 },
      );
   }

   try {
      const originUrl = new URL(origin);
      const requestUrl = new URL(request.url);

      if (originUrl.origin !== requestUrl.origin) {
         return NextResponse.json(
            { error: "Cross-origin request rejected." },
            { status: 403 },
         );
      }
   } catch {
      return NextResponse.json(
         { error: "Invalid request origin." },
         { status: 403 },
      );
   }

   return null;
}
