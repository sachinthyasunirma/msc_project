"use client";

import { authClient } from "@/lib/auth-client";
import type { CurrencyResourceKey } from "@/modules/currency/ui/components/currency-management/currency-management-config";
import { CurrencyManagementSection } from "@/modules/currency/ui/components/currency-management/currency-management-section";

export function CurrencyManagementView({
  initialResource = "currencies",
  managedCurrencyId = "",
}: {
  initialResource?: CurrencyResourceKey;
  managedCurrencyId?: string;
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
    <CurrencyManagementSection
      initialResource={initialResource}
      managedCurrencyId={managedCurrencyId}
      isReadOnly={isReadOnly}
    />
  );
}

export type { CurrencyResourceKey };
