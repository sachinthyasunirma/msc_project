"use client";

import { useActivityAccess } from "@/modules/activity/lib/use-activity-access";
import type { ActivityManagementInitialData } from "@/modules/activity/shared/activity-management-types";
import { ActivityManagementSection } from "@/modules/activity/ui/components/activity-management-section";

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
