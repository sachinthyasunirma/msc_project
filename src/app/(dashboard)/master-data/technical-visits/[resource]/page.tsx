import { notFound } from "next/navigation";
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

  return (
    <div className="p-4 md:p-6">
      <TechnicalVisitManagementView initialResource={resolved.resource as TechnicalVisitResourceKey} />
    </div>
  );
};

export default TechnicalVisitsResourcePage;
