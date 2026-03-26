"use client";

type PatchedWindow = Window &
  typeof globalThis & {
    __mscApiFetchPatched__?: boolean;
    __mscOriginalFetch__?: typeof fetch;
  };

function resolveRequestUrl(input: RequestInfo | URL) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  if (typeof Request !== "undefined" && input instanceof Request) return input.url;
  return "";
}

function isInternalApiRequest(input: RequestInfo | URL) {
  const rawUrl = resolveRequestUrl(input);
  if (!rawUrl) return false;
  if (rawUrl.startsWith("/api/")) return true;

  try {
    const url = new URL(rawUrl, window.location.origin);
    return url.origin === window.location.origin && url.pathname.startsWith("/api/");
  } catch {
    return false;
  }
}

export function installClientApiFetchPatch() {
  if (typeof window === "undefined") return;

  const patchedWindow = window as PatchedWindow;
  if (patchedWindow.__mscApiFetchPatched__) return;

  const originalFetch = window.fetch.bind(window);
  patchedWindow.__mscOriginalFetch__ = originalFetch;
  patchedWindow.__mscApiFetchPatched__ = true;

  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (!isInternalApiRequest(input)) {
      return originalFetch(input, init);
    }

    const nextInit: RequestInit = {
      ...init,
      credentials: init?.credentials ?? "include",
    };

    return originalFetch(input, nextInit);
  }) as typeof fetch;
}
