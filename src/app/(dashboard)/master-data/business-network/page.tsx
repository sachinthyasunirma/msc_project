import { loadBusinessNetworkManagementInitialData } from "@/modules/business-network/server/business-network-management-loader";
import { BusinessNetworkManagementView } from "@/modules/business-network/ui/views/business-network-management-view";

const BusinessNetworkPage = async () => {
  const initialData = await loadBusinessNetworkManagementInitialData("organizations");

  return (
    <div className="p-4 md:p-6">
      <BusinessNetworkManagementView initialData={initialData} />
    </div>
  );
};

export default BusinessNetworkPage;
