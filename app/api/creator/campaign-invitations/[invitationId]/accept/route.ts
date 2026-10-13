import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";
import {
  InvitationError,
  acceptInvitation,
} from "@/services/campaign-invitation.service";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ invitationId: string }> },
) {
  try {
    const session = await requireSession();
    const { invitationId } = await ctx.params;
    await connectToDatabase();

    const { invitation } = await acceptInvitation(invitationId, session.userId);

    return NextResponse.json({
      invitation: {
        _id: invitation._id.toString(),
        status: invitation.status,
      },
    });
  } catch (error) {
    if (error instanceof InvitationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to accept." },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}
