import { NextResponse } from "next/server";
import { withApiLogging } from "@/lib/logging/request";
import {
  deleteCompanyEmailAccount,
  listCompanyEmailAccounts,
  toEmailIntegrationErrorResponse,
  upsertCompanyEmailAccount,
} from "@/modules/email-integration/server/email-integration-service";

export const runtime = "nodejs";

const getHandler = withApiLogging(
  { route: "/api/email-accounts", feature: "email-integration" },
  async (request: Request) => {
    try {
      const url = new URL(request.url);
      const aiOnly = url.searchParams.get("scope") === "pre-tour-ai";
      const response = await listCompanyEmailAccounts(request.headers, aiOnly);
      return NextResponse.json(response);
    } catch (error) {
      const normalized = toEmailIntegrationErrorResponse(error);
      return NextResponse.json(normalized.body, { status: normalized.status });
    }
  }
);

const postHandler = withApiLogging(
  { route: "/api/email-accounts", feature: "email-integration" },
  async (request: Request) => {
    try {
      const payload = await request.json();
      const response = await upsertCompanyEmailAccount(payload, request.headers);
      return NextResponse.json(response);
    } catch (error) {
      const normalized = toEmailIntegrationErrorResponse(error);
      return NextResponse.json(normalized.body, { status: normalized.status });
    }
  }
);

const patchHandler = withApiLogging(
  { route: "/api/email-accounts", feature: "email-integration" },
  async (request: Request) => {
    try {
      const payload = await request.json();
      const response = await upsertCompanyEmailAccount(payload, request.headers);
      return NextResponse.json(response);
    } catch (error) {
      const normalized = toEmailIntegrationErrorResponse(error);
      return NextResponse.json(normalized.body, { status: normalized.status });
    }
  }
);

const deleteHandler = withApiLogging(
  { route: "/api/email-accounts", feature: "email-integration" },
  async (request: Request) => {
    try {
      const payload = await request.json();
      const response = await deleteCompanyEmailAccount(payload, request.headers);
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
