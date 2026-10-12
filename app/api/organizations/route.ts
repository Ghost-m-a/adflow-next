import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { randomBytes } from "node:crypto";

import { requireSession } from "@/lib/auth/requireSession";
import Organization from "@/models/Organization";
import Membership from "@/models/Membership";

function errorStatus(error: unknown): number {
  if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error
  ) {
    return Number(error.statusCode);
  }

  return 500;
}

function createSlug(name: string): string {
  const base =
    name
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 55) || "organization";

  return `${base}-${randomBytes(4).toString("hex")}`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Please provide valid JSON." },
        { status: 400 },
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Invalid organization details." },
        { status: 400 },
      );
    }

    const input = body as Record<string, unknown>;
    const name = typeof input.name === "string" ? input.name.trim() : "";
    const type = input.type ?? "advertiser";
    const description =
      typeof input.description === "string"
        ? input.description.trim()
        : "";
    const website =
      typeof input.website === "string" ? input.website.trim() : "";
    const defaultCurrency =
      typeof input.defaultCurrency === "string"
        ? input.defaultCurrency.trim().toUpperCase()
        : "USD";

    if (!name || name.length > 120) {
      return NextResponse.json(
        { error: "Organization name is required and must be at most 120 characters." },
        { status: 400 },
      );
    }

    if (type !== "advertiser" && type !== "agency") {
      return NextResponse.json(
        { error: "Organization type must be advertiser or agency." },
        { status: 400 },
      );
    }

    if (description.length > 2000) {
      return NextResponse.json(
        { error: "Description must be at most 2000 characters." },
        { status: 400 },
      );
    }

    if (
      website.length > 2048 ||
      (website && !/^https?:\/\/\S+$/i.test(website))
    ) {
      return NextResponse.json(
        { error: "Website must be a valid HTTP or HTTPS URL." },
        { status: 400 },
      );
    }

    if (!/^[A-Z]{3}$/.test(defaultCurrency)) {
      return NextResponse.json(
        { error: "Currency must be a three-letter currency code, such as USD or EGP." },
        { status: 400 },
      );
    }

    const ownerId = new mongoose.Types.ObjectId(session.userId);
    const mongoSession = await mongoose.startSession();

    let createdOrganization:
      | {
          _id: mongoose.Types.ObjectId;
          name: string;
          slug: string;
          type: "advertiser" | "agency";
          defaultCurrency: string;
        }
      | undefined;

    try {
      await mongoSession.withTransaction(async () => {
        const [organization] = await Organization.create(
          [
            {
              name,
              slug: createSlug(name),
              type,
              ownerId,
              description: description || undefined,
              website: website || undefined,
              defaultCurrency,
            },
          ],
          { session: mongoSession },
        );

        await Membership.create(
          [
            {
              organizationId: organization._id,
              userId: ownerId,
              role: "owner",
              joinedAt: new Date(),
            },
          ],
          { session: mongoSession },
        );

        createdOrganization = {
          _id: organization._id,
          name: organization.name,
          slug: organization.slug,
          type: organization.type,
          defaultCurrency: organization.defaultCurrency,
        };
      });
    } finally {
      await mongoSession.endSession();
    }

    if (!createdOrganization) {
      throw new Error("Organization creation did not complete.");
    }

    return NextResponse.json(
      {
        organization: {
          ...createdOrganization,
          _id: createdOrganization._id.toString(),
          role: "owner",
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const status = errorStatus(error);

    if (status === 401) {
      return NextResponse.json(
        { error: "Please log in before creating an organization." },
        { status: 401 },
      );
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        { error: "An organization with conflicting details already exists. Please try again." },
        { status: 409 },
      );
    }

    console.error("POST /api/organizations:", error);

    return NextResponse.json(
      {
        error:
          "Unable to create the organization. Check that your MongoDB deployment supports transactions.",
      },
      { status: 500 },
    );
  }
}
