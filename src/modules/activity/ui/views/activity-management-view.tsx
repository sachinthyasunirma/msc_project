"use client";

import dynamic from "next/dynamic";
import { LoadingState } from "@/components/ui/loading-state";
import { useActivityAccess } from "@/modules/activity/lib/use-activity-access";
import type { ActivityManagementInitialData } from "@/modules/activity/shared/activity-management-types";

const ActivityManagementSection = dynamic(
  () =>
    import("@/modules/activity/ui/components/activity-management-section").then(
      (module) => module.ActivityManagementSection
    ),
  {
    loading: () => (
      <LoadingState
        title="Loading activity workspace"
        description="Preparing activities, rates, and availability tools."
      />
    ),
  }
);

type Props = {
  activityId?: string;
  showActivityList?: boolean;
  initialData?: ActivityManagementInitialData | null;
};

export function ActivityManagementView({
  activityId,
  showActivityList = true,
  initialData = null,
}: Props) {
  const { isReadOnly } = useActivityAccess();

  return (
    <ActivityManagementSection
      activityId={activityId}
      showActivityList={showActivityList}
      initialData={initialData}
      isReadOnly={isReadOnly}
    />
  );
}
