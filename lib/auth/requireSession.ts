import mongoose from "mongoose";

import { getSession } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongodb";
import User from "@/models/User";

export class AuthenticationError extends Error {
   readonly statusCode = 401;

   constructor(message = "You must be logged in.") {
      super(message);
      this.name = "AuthenticationError";
   }
}

export async function requireSession() {
   const session = await getSession();

   if (!session || !mongoose.isValidObjectId(session.userId)) {
      throw new AuthenticationError();
   }

   await connectToDatabase();

   const user = await User.findById(session.userId)
      .select("_id email isActive")
      .lean();

   if (!user || !user.isActive || user.email !== session.email.toLowerCase()) {
      throw new AuthenticationError("Your session is no longer valid.");
   }

   return {
      userId: user._id.toString(),
      email: user.email,
   };
}
