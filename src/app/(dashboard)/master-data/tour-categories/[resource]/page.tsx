import { notFound } from "next/navigation";
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

  return (
    <div className="p-4 md:p-6">
      <TourCategoryManagementView initialResource={resolved.resource as TourCategoryResourceKey} />
    </div>
  );
};

export default TourCategoriesResourcePage;
