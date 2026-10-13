import { requireSession } from "@/lib/auth/requireSession";
import { connectToDatabase } from "@/lib/db/mongodb";
import User from "@/models/User";

export class AdminAuthError extends Error {
  statusCode = 403;
  constructor(message = "Admin access required.") {
    super(message);
    this.name = "AdminAuthError";
  }
}

/** Verifies the caller is signed in AND has platformRole === "admin". */
export async function requireAdmin() {
  const session = await requireSession();
  await connectToDatabase();

  const user = await User.findById(session.userId)
    .select("platformRole isActive")
    .lean();

  if (!user || !user.isActive) {
    throw new AdminAuthError("Your session is no longer valid.");
  }
  if (user.platformRole !== "admin") {
    throw new AdminAuthError();
  }

  return session;
}
