import { NextResponse } from "next/server";

import { AuthenticationError, requireSession } from "@/lib/auth/requireSession";
import { connectToDatabase } from "@/lib/db/mongodb";
import User from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
   try {
      const session = await requireSession();

      await connectToDatabase();

      const user = await User.findById(session.userId)
         .select(
            "_id name username email avatarUrl platformRole isEmailVerified createdAt twoFactorEnabled",
         )
         .lean();

      if (!user) {
         return NextResponse.json(
            { error: "User not found." },
            { status: 401 },
         );
      }

      return NextResponse.json({
         user: {
            id: user._id.toString(),
            name: user.name,
            username: user.username,
            email: user.email,
            avatarUrl: user.avatarUrl ?? "",
            platformRole: user.platformRole ?? "user",
            isEmailVerified: user.isEmailVerified,
            twoFactorEnabled: user.twoFactorEnabled ?? false,
            createdAt: user.createdAt,
         },
      });
   } catch (error) {
      if (error instanceof AuthenticationError) {
         return NextResponse.json(
            { error: error.message },
            { status: error.statusCode },
         );
      }

      console.error("Fetching current user failed:", error);

      return NextResponse.json(
         { error: "An unexpected server error occurred." },
         { status: 500 },
      );
   }
}
