"use client";

import { authClient } from "@/lib/auth-client";
import type { TourCategoryResourceKey } from "@/modules/tour-category/shared/tour-category-schemas";
import { TourCategoryManagementSection } from "@/modules/tour-category/ui/components/tour-category-management-section";

export function TourCategoryManagementView({
  initialResource = "tour-category-types",
}: {
  initialResource?: TourCategoryResourceKey;
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

  return <TourCategoryManagementSection initialResource={initialResource} isReadOnly={isReadOnly} />;
}
