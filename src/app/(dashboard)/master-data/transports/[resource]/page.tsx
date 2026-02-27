import { notFound } from "next/navigation";
import {
  TransportManagementView,
  type TransportResourceKey,
} from "@/modules/transport/ui/views/transport-management-view";

const allowedResources: TransportResourceKey[] = [
  "locations",
  "vehicle-categories",
  "vehicle-types",
  "location-rates",
  "location-expenses",
  "pax-vehicle-rates",
  "baggage-rates",
];

const TransportResourcePage = async ({
  params,
}: {
  params: Promise<{ resource: string }>;
}) => {
  const resolved = await params;
  if (!allowedResources.includes(resolved.resource as TransportResourceKey)) {
    notFound();
  }

  return (
    <div className="p-4 md:p-6">
      <TransportManagementView initialResource={resolved.resource as TransportResourceKey} />
    </div>
  );
};

export default TransportResourcePage;
