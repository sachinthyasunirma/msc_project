import { notFound } from "next/navigation";
import { loadBusinessNetworkManagementInitialData } from "@/modules/business-network/server/business-network-management-loader";
import { BUSINESS_NETWORK_RESOURCE_KEYS, type BusinessNetworkResourceKey } from "@/modules/business-network/shared/business-network-management-config";
import { BusinessNetworkManagementViewContent } from "@/modules/business-network/ui/views/business-network-management-view";
const allowedResources = BUSINESS_NETWORK_RESOURCE_KEYS;

type PageProps = {
  params: Promise<{ resource: string }>;
};

const BusinessNetworkResourcePage = async ({ params }: PageProps) => {
  const resolved = await params;
  if (!allowedResources.includes(resolved.resource as (typeof allowedResources)[number])) {
    notFound();
  }
  const resource = resolved.resource as BusinessNetworkResourceKey;
  const initialData = await loadBusinessNetworkManagementInitialData(resource);

  return (
    <div className="p-4 md:p-6">
      <BusinessNetworkManagementViewContent initialResource={resource} initialData={initialData} />
    </div>
  );
};

export default BusinessNetworkResourcePage;
