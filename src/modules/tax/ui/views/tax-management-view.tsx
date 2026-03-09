"use client";

import { authClient } from "@/lib/auth-client";
import type { TaxResourceKey } from "@/modules/tax/ui/components/tax-management/tax-management-config";
import { TaxManagementSection } from "@/modules/tax/ui/components/tax-management/tax-management-section";

export function TaxManagementView({
  initialResource = "taxes",
  managedTaxId = "",
}: {
  initialResource?: TaxResourceKey;
  managedTaxId?: string;
}) {
  const { data: session } = authClient.useSession();
  const accessUser = session?.user as
    | {
        readOnly?: boolean;
        role?: string | null;
        canWriteMasterData?: boolean;
      }
    | undefined;
  const canWrite =
    Boolean(accessUser) &&
    !Boolean(accessUser?.readOnly) &&
    (accessUser?.role === "ADMIN" ||
      accessUser?.role === "MANAGER" ||
      Boolean(accessUser?.canWriteMasterData));
  const isReadOnly = !canWrite;

  return (
    <TaxManagementSection
      initialResource={initialResource}
      managedTaxId={managedTaxId}
      isReadOnly={isReadOnly}
    />
  );
}

export type { TaxResourceKey };
