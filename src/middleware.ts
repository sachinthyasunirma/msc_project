import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createUuid } from "@/lib/runtime/uuid";

function withCorrelationHeaders(request: NextRequest) {
  const requestId = request.headers.get("x-request-id")?.trim() || createUuid();
  const traceId = request.headers.get("x-trace-id")?.trim() || requestId;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  requestHeaders.set("x-trace-id", traceId);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
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
