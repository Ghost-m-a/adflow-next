import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function validationErrorResponse(error: ZodError) {
   return NextResponse.json(
      {
         error: "Please check the submitted information.",
         fields: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
         })),
      },
      { status: 400 },
   );
}

export function internalErrorResponse() {
   return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
   );
}
