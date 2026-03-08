"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { notify } from "@/lib/notify";

type AccessBody = {
  code?: string;
  privileges?: string[];
  message?: string;
};

const PATH_PRIVILEGE_RULES: Array<{ prefix: string; privilege: string }> = [
  { prefix: "/master-data/accommodations", privilege: "SCREEN_MASTER_ACCOMMODATIONS" },
  { prefix: "/master-data/seasons", privilege: "SCREEN_MASTER_SEASONS" },
  { prefix: "/master-data/activities", privilege: "SCREEN_MASTER_ACTIVITIES" },
  { prefix: "/master-data/transports", privilege: "SCREEN_MASTER_TRANSPORTS" },
  { prefix: "/master-data/guides", privilege: "SCREEN_MASTER_GUIDES" },
  { prefix: "/master-data/currencies", privilege: "SCREEN_MASTER_CURRENCIES" },
  { prefix: "/master-data/taxes", privilege: "SCREEN_MASTER_TAXES" },
  { prefix: "/master-data/tour-categories", privilege: "SCREEN_MASTER_TOUR_CATEGORIES" },
  { prefix: "/master-data/business-network", privilege: "SCREEN_MASTER_BUSINESS_NETWORK" },
  { prefix: "/master-data/pre-tours", privilege: "SCREEN_PRE_TOURS" },
  { prefix: "/master-data/technical-visits", privilege: "SCREEN_TECHNICAL_VISITS" },
  { prefix: "/configuration/company", privilege: "SCREEN_CONFIGURATION_COMPANY" },
  { prefix: "/billing/plans", privilege: "SUBSCRIPTION_MANAGE" },
  { prefix: "/billing/checkout", privilege: "SUBSCRIPTION_MANAGE" },
  { prefix: "/bin", privilege: "SCREEN_BIN" },
];

const PUBLIC_DASHBOARD_PATH_PREFIXES = ["/support/contact-us", "/notifications"];

export function ScreenAccessGate() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const lastWarnedPath = useRef<string | null>(null);

  const requiredPrivilege = useMemo(() => {
    if (pathname === "/" || !pathname) return null;
    if (PUBLIC_DASHBOARD_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null;
    const match = PATH_PRIVILEGE_RULES.find((rule) => pathname.startsWith(rule.prefix));
    return match?.privilege ?? null;
  }, [pathname]);

  useEffect(() => {
    if (!session?.user || !requiredPrivilege) return;
    let active = true;

    (async () => {
      try {
        const response = await fetch("/api/companies/access-control", { cache: "no-store" });
        if (!active) return;

        const body = (await response.json()) as AccessBody;
        if (!response.ok) {
          if (body.code === "SUBSCRIPTION_REQUIRED") {
            router.replace("/billing/plans");
            return;
          }
          return;
        }

        const privileges = Array.isArray(body.privileges) ? body.privileges : [];
        if (privileges.includes(requiredPrivilege)) return;

        router.replace("/");
        if (lastWarnedPath.current !== pathname) {
          lastWarnedPath.current = pathname;
          notify.warning("You do not have access to this screen. Please upgrade your plan.");
        }
      } catch {
        // no-op
      }
    })();

    return () => {
      active = false;
    };
  }, [pathname, requiredPrivilege, router, session?.user]);

  return null;
}

