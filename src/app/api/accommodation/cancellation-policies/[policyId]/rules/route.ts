import { NextResponse } from "next/server";
import {
  createHotelCancellationPolicyRule,
  listHotelCancellationPolicyRules,
  toAccommodationContractingErrorResponse,
} from "@/modules/accommodation/server/accommodation-contracting-service";

type RouteContext = {
  params: Promise<{ policyId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { policyId } = await context.params;
    const result = await listHotelCancellationPolicyRules(
      policyId,
      new URL(request.url).searchParams,
      request.headers
    );
    return NextResponse.json(result);
  } catch (error) {
    const formatted = toAccommodationContractingErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { policyId } = await context.params;
    const payload = await request.json();
    const result = await createHotelCancellationPolicyRule(policyId, payload, request.headers);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const formatted = toAccommodationContractingErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}
