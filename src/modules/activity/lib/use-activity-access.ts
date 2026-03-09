"use client";

import { useMemo } from "react";
import { authClient } from "@/lib/auth-client";

export function useActivityAccess() {
  const { data: session } = authClient.useSession();
  const accessUser = session?.user as
    | { readOnly?: boolean; role?: string | null; canWriteMasterData?: boolean }
    | undefined;
  const canWrite =
    Boolean(accessUser) &&
    !Boolean(accessUser?.readOnly) &&
    (accessUser?.role === "ADMIN" ||
      accessUser?.role === "MANAGER" ||
      Boolean(accessUser?.canWriteMasterData));

  return useMemo(
    () => ({
      isReadOnly: !canWrite,
    }),
    [canWrite]
  );
}
