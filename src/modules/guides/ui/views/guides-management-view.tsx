"use client";

import { authClient } from "@/lib/auth-client";
import { GuidesManagementSection, type GuideResourceKey } from "@/modules/guides/ui/components/guides-management-section";

export function GuidesManagementView({
  initialResource = "guides",
  managedGuideId = "",
}: {
  initialResource?: GuideResourceKey;
  managedGuideId?: string;
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

  return (
    <GuidesManagementSection
      initialResource={initialResource}
      managedGuideId={managedGuideId}
      isReadOnly={isReadOnly}
    />
  );
}

export type { GuideResourceKey };
