import { ActivityManagementView } from "@/modules/activity/ui/views/activity-management-view";

type PageProps = {
  params: Promise<{ activityId: string }>;
};

const ActivityDetailsPage = async ({ params }: PageProps) => {
  const { activityId } = await params;

  return (
    <div className="p-4 md:p-6">
      <ActivityManagementView activityId={activityId} showActivityList={false} />
    </div>
  );
};

export default ActivityDetailsPage;
