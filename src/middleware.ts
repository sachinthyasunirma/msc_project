import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createUuid } from "@/lib/runtime/uuid";

function withCorrelationHeaders(request: NextRequest) {
  const requestId = request.headers.get("x-request-id")?.trim() || createUuid();
  const traceId = request.headers.get("x-trace-id")?.trim() || requestId;
  const response = NextResponse.next();
  response.headers.set("x-request-id", requestId);
  response.headers.set("x-trace-id", traceId);
  return response;
}

export function middleware(request: NextRequest) {
  return withCorrelationHeaders(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
