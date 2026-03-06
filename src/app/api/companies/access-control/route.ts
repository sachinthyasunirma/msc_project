import { NextResponse } from "next/server";
import { AccessControlError, resolveAccess } from "@/lib/security/access-control";

export async function GET(request: Request) {
  try {
    const access = await resolveAccess(request.headers);
    return NextResponse.json({
      companyId: access.companyId,
      role: access.role,
      plan: access.plan,
      subscriptionStatus: access.subscriptionStatus,
      subscriptionEndsAt: access.subscriptionEndsAt,
      subscriptionLimited: access.subscriptionLimited,
      readOnly: access.readOnly,
      privileges: access.privileges,
    });
  } catch (error) {
    if (error instanceof AccessControlError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { code: "INTERNAL_SERVER_ERROR", message: "Failed to resolve access." },
      { status: 500 }
    );
  }
}
