import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSession } from "@/lib/auth/requireSession";
import {
  TaxError,
  submitTaxProfile,
  taxFormStatus,
} from "@/services/tax.service";
import { TAX_FORM_TYPES } from "@/models/TaxProfile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireSession();
    await connectToDatabase();
    const status = await taxFormStatus(session.userId);
    return NextResponse.json(status);
  } catch (error) {
    const s =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load." },
      { status: s >= 400 && s < 600 ? s : 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    await connectToDatabase();

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid body." }, { status: 400 });
    }

    const b = body as Record<string, unknown>;

    if (
      typeof b.formType !== "string" ||
      !TAX_FORM_TYPES.includes(b.formType as never)
    ) {
      return NextResponse.json({ error: "Invalid form type." }, { status: 400 });
    }

    const requiredString = (key: string) => {
      const v = b[key];
      if (typeof v !== "string" || !v.trim()) {
        throw new TaxError(`${key} is required.`);
      }
      return v;
    };

    const address = b.address as Record<string, unknown> | undefined;
    if (!address || typeof address !== "object") {
      return NextResponse.json({ error: "address required." }, { status: 400 });
    }

    const profile = await submitTaxProfile({
      userId: session.userId,
      formType: b.formType as never,
      legalName: requiredString("legalName"),
      businessName: typeof b.businessName === "string" ? b.businessName : undefined,
      country: requiredString("country"),
      address: {
        line1: requiredString.call(null, "line1") && String(address.line1),
        line2: typeof address.line2 === "string" ? address.line2 : undefined,
        city: String(address.city ?? ""),
        state: typeof address.state === "string" ? address.state : undefined,
        postalCode: String(address.postalCode ?? ""),
      },
      tin: requiredString("tin"),
      isUsPerson: Boolean(b.isUsPerson),
      treatyCountry:
        typeof b.treatyCountry === "string" ? b.treatyCountry : undefined,
      signatureName: requiredString("signatureName"),
    });

    return NextResponse.json(
      {
        profile: {
          _id: profile._id.toString(),
          status: profile.status,
          formType: profile.formType,
          tinLast4: profile.tinLast4,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof TaxError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const s =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save." },
      { status: s >= 400 && s < 600 ? s : 500 },
    );
  }
}
