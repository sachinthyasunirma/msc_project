"use client";

import { useEffect, useMemo, useState } from "react";
import { authClient } from "@/lib/auth-client";
import type { AccessControlResponse } from "@/modules/pre-tour/shared/pre-tour-management-types";

export function usePreTourAccess() {
  const { data: session } = authClient.useSession();
  const accessUser = session?.user as
    | { readOnly?: boolean; role?: string | null; canWritePreTour?: boolean }
    | undefined;

  const canWrite =
    Boolean(accessUser) &&
    !Boolean(accessUser?.readOnly) &&
    (accessUser?.role === "ADMIN" ||
      accessUser?.role === "MANAGER" ||
      Boolean(accessUser?.canWritePreTour));

  const [privileges, setPrivileges] = useState<string[]>([]);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const response = await fetch("/api/companies/access-control", { cache: "no-store" });
        const body = (await response.json()) as AccessControlResponse & { message?: string };
        if (!response.ok) throw new Error(body.message || "Failed to load access control.");
        if (!active) return;
        setPrivileges(Array.isArray(body.privileges) ? body.privileges : []);
      } catch {
        if (active) setPrivileges([]);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return useMemo(
    () => ({
      isReadOnly: !canWrite,
      isAdmin: accessUser?.role === "ADMIN",
      privileges,
      canViewRouteMap: privileges.includes("PRE_TOUR_MAP"),
      canViewCosting: privileges.includes("PRE_TOUR_COSTING"),
    }),
    [accessUser?.role, canWrite, privileges]
  );
}
