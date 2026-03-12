import { loadActivityManagementInitialData } from "@/modules/activity/server/activity-management-loader";
import { ActivityManagementView } from "@/modules/activity/ui/views/activity-management-view";

type PageProps = {
  params: Promise<{ activityId: string }>;
};

const ActivityDetailsPage = async ({ params }: PageProps) => {
  const { activityId } = await params;
  const initialData = await loadActivityManagementInitialData({
    activityId,
    showActivityList: false,
    resource: "activity-rates",
  });

  return (
    <div className="p-4 md:p-6">
      <ActivityManagementView
        activityId={activityId}
        showActivityList={false}
        initialData={initialData}
      />
    </div>
  );
};

export default ActivityDetailsPage;
