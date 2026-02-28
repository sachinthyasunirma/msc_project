import { notFound } from "next/navigation";
import {
  BusinessNetworkManagementViewContent,
  type BusinessNetworkResourceKey,
} from "@/modules/business-network/ui/views/business-network-management-view";

const allowedResources = [
  "organizations",
  "operator-profiles",
  "market-profiles",
  "org-members",
  "operator-market-contracts",
] as const;

type PageProps = {
  params: Promise<{ resource: string }>;
};

const BusinessNetworkResourcePage = async ({ params }: PageProps) => {
  const resolved = await params;
  if (!allowedResources.includes(resolved.resource as (typeof allowedResources)[number])) {
    notFound();
  }

  return (
    <div className="p-4 md:p-6">
      <BusinessNetworkManagementViewContent
        initialResource={resolved.resource as BusinessNetworkResourceKey}
      />
    </div>
  );
};

export default BusinessNetworkResourcePage;
