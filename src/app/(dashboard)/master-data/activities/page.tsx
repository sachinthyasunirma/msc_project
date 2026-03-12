import { loadActivityManagementInitialData } from "@/modules/activity/server/activity-management-loader";
import { ActivityManagementView } from "@/modules/activity/ui/views/activity-management-view";

const ActivitiesPage = async () => {
  const initialData = await loadActivityManagementInitialData({
    showActivityList: true,
    resource: "activities",
  });

  return (
    <div className="p-4 md:p-6">
      <ActivityManagementView initialData={initialData} />
    </div>
  );
};

export default ActivitiesPage;
