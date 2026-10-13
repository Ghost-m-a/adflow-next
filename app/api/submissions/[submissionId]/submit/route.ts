import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";
import { SubmissionError, submitForReview } from "@/services/submission.service";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ submissionId: string }> },
) {
  try {
    const session = await requireSession();
    const { submissionId } = await ctx.params;
    await connectToDatabase();

    const submission = await submitForReview(submissionId, session.userId);

    return NextResponse.json({
      submission: {
        _id: submission._id.toString(),
        status: submission.status,
        submittedAt: submission.submittedAt,
      },
    });
  } catch (error) {
    if (error instanceof SubmissionError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to submit." },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}
