import { NextResponse } from "next/server";

export async function PATCH() {
  return NextResponse.json(
    {
      code: "DEPRECATED_ENDPOINT",
      message: "This endpoint is deprecated. Use /api/accommodation/* endpoints.",
    },
    { status: 410 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    {
      code: "DEPRECATED_ENDPOINT",
      message: "This endpoint is deprecated. Use /api/accommodation/* endpoints.",
    },
    { status: 410 }
  );
}
