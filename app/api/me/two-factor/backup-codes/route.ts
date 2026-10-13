import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";
import {
  TwoFactorError,
  regenerateBackupCodes,
} from "@/services/twofactor.service";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json().catch(() => null);
    const token = (body as { token?: string } | null)?.token;
    if (typeof token !== "string") {
      return NextResponse.json({ error: "token required." }, { status: 400 });
    }

    await connectToDatabase();
    const result = await regenerateBackupCodes(session.userId, token);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof TwoFactorError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to regenerate." },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}
