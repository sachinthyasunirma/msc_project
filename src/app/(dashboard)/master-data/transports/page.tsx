import { loadTransportManagementInitialData } from "@/modules/transport/server/transport-management-loader";
import { TransportManagementView } from "@/modules/transport/ui/views/transport-management-view";

const TransportsPage = async () => {
  const initialData = await loadTransportManagementInitialData("locations");

  return (
    <div className="p-4 md:p-6">
      <TransportManagementView initialData={initialData} />
    </div>
  );
};

export default TransportsPage;
