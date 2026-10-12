import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectToDatabase();

    const databaseConnected = mongoose.connection.readyState === 1;

    if (!databaseConnected) {
      return NextResponse.json(
        {
          status: "error",
          database: "disconnected",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: "ok",
      database: "connected",
      service: "adflow",
      timestamp: new Date().toISOString(),
    });
  } catch {
    // Avoid exposing database credentials or connection details.
    return NextResponse.json(
      {
        status: "error",
        database: "unavailable",
      },
      { status: 503 }
    );
  }
}
