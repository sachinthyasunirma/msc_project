import { NextResponse } from "next/server";
import { withApiLogging } from "@/lib/logging/request";
import {
  deleteCompanyEmailIntakeProfile,
  listCompanyEmailIntakeProfiles,
  toEmailIntegrationErrorResponse,
  upsertCompanyEmailIntakeProfile,
} from "@/modules/email-integration/server/email-integration-service";

export const runtime = "nodejs";

const getHandler = withApiLogging(
  { route: "/api/email-intake-profiles", feature: "email-integration" },
  async (request: Request) => {
    try {
      const response = await listCompanyEmailIntakeProfiles(request.headers);
      return NextResponse.json(response);
    } catch (error) {
      const normalized = toEmailIntegrationErrorResponse(error);
      return NextResponse.json(normalized.body, { status: normalized.status });
    }
  }
);

const postHandler = withApiLogging(
  { route: "/api/email-intake-profiles", feature: "email-integration" },
  async (request: Request) => {
    try {
      const payload = await request.json();
      const response = await upsertCompanyEmailIntakeProfile(payload, request.headers);
      return NextResponse.json(response);
    } catch (error) {
      const normalized = toEmailIntegrationErrorResponse(error);
      return NextResponse.json(normalized.body, { status: normalized.status });
    }
  }
);

const patchHandler = withApiLogging(
  { route: "/api/email-intake-profiles", feature: "email-integration" },
  async (request: Request) => {
    try {
      const payload = await request.json();
      const response = await upsertCompanyEmailIntakeProfile(payload, request.headers);
      return NextResponse.json(response);
    } catch (error) {
      const normalized = toEmailIntegrationErrorResponse(error);
      return NextResponse.json(normalized.body, { status: normalized.status });
    }
  }
);

const deleteHandler = withApiLogging(
  { route: "/api/email-intake-profiles", feature: "email-integration" },
  async (request: Request) => {
    try {
      const payload = await request.json();
      const response = await deleteCompanyEmailIntakeProfile(payload, request.headers);
      return NextResponse.json(response);
    } catch (error) {
      const normalized = toEmailIntegrationErrorResponse(error);
      return NextResponse.json(normalized.body, { status: normalized.status });
    }
  }
);

export async function GET(request: Request) {
  return getHandler(request);
}

export async function POST(request: Request) {
  return postHandler(request);
}

export async function PATCH(request: Request) {
  return patchHandler(request);
}

export async function DELETE(request: Request) {
  return deleteHandler(request);
}
