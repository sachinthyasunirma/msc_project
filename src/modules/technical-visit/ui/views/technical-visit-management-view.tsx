"use client";

import { authClient } from "@/lib/auth-client";
import type { TechnicalVisitResourceKey } from "@/modules/technical-visit/shared/technical-visit-schemas";
import { TechnicalVisitManagementSection } from "@/modules/technical-visit/ui/components/technical-visit-management-section";

export function TechnicalVisitManagementView({
  initialResource = "technical-visits",
}: {
  initialResource?: TechnicalVisitResourceKey;
}) {
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

  return <TechnicalVisitManagementSection initialResource={initialResource} isReadOnly={isReadOnly} />;
}
