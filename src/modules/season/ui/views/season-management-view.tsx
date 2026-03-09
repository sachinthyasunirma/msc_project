"use client";

import { authClient } from "@/lib/auth-client";
import { SeasonManagementSection } from "@/modules/season/ui/components/season-management-section";

export const SeasonManagementView = () => {
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
  const isReadOnly = !canWrite;

  return <SeasonManagementSection isReadOnly={isReadOnly} />;
};
