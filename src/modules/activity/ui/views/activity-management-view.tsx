"use client";

import { useActivityAccess } from "@/modules/activity/lib/use-activity-access";
import { ActivityManagementSection } from "@/modules/activity/ui/components/activity-management-section";

type Props = {
  activityId?: string;
  showActivityList?: boolean;
};

export function ActivityManagementView({ activityId, showActivityList = true }: Props) {
  const { isReadOnly } = useActivityAccess();

  return (
    <ActivityManagementSection
      activityId={activityId}
      showActivityList={showActivityList}
      isReadOnly={isReadOnly}
    />
  );
}
