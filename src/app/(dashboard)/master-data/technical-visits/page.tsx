import { loadTechnicalVisitManagementInitialData } from "@/modules/technical-visit/server/technical-visit-management-loader";
import { TechnicalVisitManagementView } from "@/modules/technical-visit/ui/views/technical-visit-management-view";

const TechnicalVisitsPage = async () => {
  const initialData = await loadTechnicalVisitManagementInitialData("technical-visits");

  return (
    <div className="p-4 md:p-6">
      <TechnicalVisitManagementView initialData={initialData} />
    </div>
  );
};

export default TechnicalVisitsPage;
