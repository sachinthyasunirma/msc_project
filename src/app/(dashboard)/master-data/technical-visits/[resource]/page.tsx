import { notFound } from "next/navigation";
import { loadTechnicalVisitManagementInitialData } from "@/modules/technical-visit/server/technical-visit-management-loader";
import { TechnicalVisitManagementView } from "@/modules/technical-visit/ui/views/technical-visit-management-view";
import type { TechnicalVisitResourceKey } from "@/modules/technical-visit/shared/technical-visit-schemas";

const allowedResources: TechnicalVisitResourceKey[] = [
  "technical-visits",
  "technical-visit-checklists",
  "technical-visit-media",
  "technical-visit-actions",
];

type PageProps = {
  params: Promise<{ resource: string }>;
};

const TechnicalVisitsResourcePage = async ({ params }: PageProps) => {
  const resolved = await params;
  if (!allowedResources.includes(resolved.resource as TechnicalVisitResourceKey)) {
    notFound();
  }
  const resource = resolved.resource as TechnicalVisitResourceKey;
  const initialData = await loadTechnicalVisitManagementInitialData(resource);

  return (
    <div className="p-4 md:p-6">
      <TechnicalVisitManagementView initialResource={resource} initialData={initialData} />
    </div>
  );
};

export default TechnicalVisitsResourcePage;
