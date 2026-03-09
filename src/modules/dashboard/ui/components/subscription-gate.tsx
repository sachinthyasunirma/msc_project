"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useDashboardShell } from "@/modules/dashboard/ui/components/dashboard-shell-provider";

const ALLOWED_WHEN_SUBSCRIPTION_REQUIRED = [
  "/billing/plans",
  "/billing/checkout",
  "/support/contact-us",
];

export function SubscriptionGate() {
  const router = useRouter();
  const pathname = usePathname();
  const { accessErrorCode, needsSetup, viewer } = useDashboardShell();

  useEffect(() => {
    if (!viewer || needsSetup || accessErrorCode !== "SUBSCRIPTION_REQUIRED") return;

    const allowed = ALLOWED_WHEN_SUBSCRIPTION_REQUIRED.some((path) => pathname.startsWith(path));
    if (!allowed) {
      router.replace("/billing/plans");
    }
  }, [accessErrorCode, needsSetup, pathname, router, viewer]);

  return null;
}
