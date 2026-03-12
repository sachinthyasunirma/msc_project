import { loadTourCategoryManagementInitialData } from "@/modules/tour-category/server/tour-category-management-loader";
import { TourCategoryManagementView } from "@/modules/tour-category/ui/views/tour-category-management-view";

const TourCategoriesPage = async () => {
  const initialData = await loadTourCategoryManagementInitialData("tour-category-types");

  return (
    <div className="p-4 md:p-6">
      <TourCategoryManagementView initialData={initialData} />
    </div>
  );
};

export default TourCategoriesPage;
