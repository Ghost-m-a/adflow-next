import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";
import CampaignApplication from "@/models/CampaignApplication";

export async function GET() {
  try {
    const session = await requireSession();
    await connectToDatabase();

    const applications = await CampaignApplication.find({
      creatorId: session.userId,
    })
      .sort({ createdAt: -1 })
      .limit(200)
      .populate({
        path: "campaignId",
        select: "title slug status platform goal budget currency rewardPerCreator",
      })
      .lean();

    return NextResponse.json({
      applications: applications.map((application) => ({
        ...application,
        _id: application._id.toString(),
        campaignId: application.campaignId,
      })),
    });
  } catch (error) {
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;

    if (status === 401) {
      return NextResponse.json({ error: "Please log in." }, { status });
    }
    console.error("GET /api/creator/applications:", error);
    return NextResponse.json(
      { error: "Unable to load your applications." },
      { status: 500 },
    );
  }
}
