import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { logger } from "@/lib/logging/logger";

const authHandlers = toNextJsHandler(auth);

async function handleAuthRequest(request: Request, method: string) {
  try {
    const response =
      method === "GET" ? await authHandlers.GET(request) : await authHandlers.POST(request);
    const pathname = new URL(request.url).pathname;

    if (response.status >= 500) {
      let responseText: string | undefined;
      try {
        responseText = await response.clone().text();
      } catch {
        responseText = undefined;
      }

        logger.error("auth_route_failed", {
          eventType: "error",
          feature: "auth",
          status: response.status,
          method,
          path: pathname,
          responseText,
        });
    }

    if (method === "POST" && pathname.endsWith("/sign-in/email") && response.status < 500) {
      const setCookieHeader = response.headers.get("set-cookie");
      if (!setCookieHeader) {
        logger.warn("auth_sign_in_missing_session_cookie", {
          eventType: "error",
          feature: "auth",
          status: response.status,
          path: pathname,
        });
      }
    }

    return response;
  } catch (error) {
    logger.error("auth_route_exception", {
      eventType: "error",
      feature: "auth",
      method,
      path: new URL(request.url).pathname,
      errorMessage: error instanceof Error ? error.message : "Unknown auth route error",
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

export async function GET(request: Request) {
  return handleAuthRequest(request, "GET");
}

export async function POST(request: Request) {
  return handleAuthRequest(request, "POST");
}
