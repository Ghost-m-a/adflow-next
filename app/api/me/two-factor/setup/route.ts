import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";
import {
  TwoFactorError,
  beginTwoFactorSetup,
} from "@/services/twofactor.service";

export async function POST() {
  try {
    const session = await requireSession();
    await connectToDatabase();
    const result = await beginTwoFactorSetup(session.userId);
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
      { error: error instanceof Error ? error.message : "Unable to start setup." },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}
