import { notFound } from "next/navigation";
import { loadTourCategoryManagementInitialData } from "@/modules/tour-category/server/tour-category-management-loader";
import {
  TourCategoryManagementView,
} from "@/modules/tour-category/ui/views/tour-category-management-view";
import type { TourCategoryResourceKey } from "@/modules/tour-category/shared/tour-category-schemas";

const allowedResources: TourCategoryResourceKey[] = [
  "tour-category-types",
  "tour-categories",
  "tour-category-rules",
];

type PageProps = {
  params: Promise<{ resource: string }>;
};

const TourCategoriesResourcePage = async ({ params }: PageProps) => {
  const resolved = await params;
  if (!allowedResources.includes(resolved.resource as TourCategoryResourceKey)) {
    notFound();
  }

  const initialResource = resolved.resource as TourCategoryResourceKey;
  const initialData = await loadTourCategoryManagementInitialData(initialResource);

  return (
    <div className="p-4 md:p-6">
      <TourCategoryManagementView
        initialResource={initialResource}
        initialData={initialData}
      />
    </div>
  );
};

export default TourCategoriesResourcePage;
