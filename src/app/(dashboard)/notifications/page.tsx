import { loadNotificationsViewInitialData } from "@/modules/notifications/server/notifications-view-loader";
import { NotificationsView } from "@/modules/dashboard/ui/views/notifications-view";

const NotificationsPage = async () => {
  const initialData = await loadNotificationsViewInitialData();

  return <NotificationsView initialData={initialData} />;
};

export default NotificationsPage;
