"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

const ALLOWED_WHEN_SUBSCRIPTION_REQUIRED = [
  "/billing/plans",
  "/billing/checkout",
  "/support/contact-us",
];

export function SubscriptionGate() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = authClient.useSession();

  useEffect(() => {
    if (!session?.user) return;
    let active = true;
    (async () => {
      try {
        const response = await fetch("/api/companies/access-control", { cache: "no-store" });
        if (!active) return;
        if (response.ok) return;
        const body = (await response.json()) as { code?: string };
        if (body.code === "SUBSCRIPTION_REQUIRED") {
          const allowed = ALLOWED_WHEN_SUBSCRIPTION_REQUIRED.some((path) =>
            pathname.startsWith(path)
          );
          if (!allowed) {
            router.replace("/billing/plans");
          }
        }
      } catch {
        // no-op
      }
    })();
    return () => {
      active = false;
    };
  }, [pathname, router, session?.user]);

  return null;
}
