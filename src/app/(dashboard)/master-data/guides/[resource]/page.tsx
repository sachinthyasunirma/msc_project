import { notFound } from "next/navigation";
import {
  GuidesManagementView,
  type GuideResourceKey,
} from "@/modules/guides/ui/views/guides-management-view";

const allowedResources: GuideResourceKey[] = [
  "guides",
  "languages",
  "guide-languages",
  "guide-coverage-areas",
  "guide-licenses",
  "guide-certifications",
  "guide-documents",
  "guide-weekly-availability",
  "guide-blackout-dates",
  "guide-rates",
  "guide-assignments",
];

type PageProps = {
  params: Promise<{ resource: string }>;
};

const GuidesResourcePage = async ({ params }: PageProps) => {
  const resolved = await params;
  if (!allowedResources.includes(resolved.resource as GuideResourceKey)) {
    notFound();
  }

  return (
    <div className="p-4 md:p-6">
      <GuidesManagementView initialResource={resolved.resource as GuideResourceKey} />
    </div>
  );
};

export default GuidesResourcePage;
