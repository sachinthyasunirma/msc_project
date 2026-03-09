import { notFound } from "next/navigation";
import { loadTransportManagementInitialData } from "@/modules/transport/server/transport-management-loader";
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
  const resource = resolved.resource as TransportResourceKey;
  const initialData = await loadTransportManagementInitialData(resource);

  return (
    <div className="p-4 md:p-6">
      <TransportManagementView initialResource={resource} initialData={initialData} />
    </div>
  );
};

export default TransportResourcePage;
