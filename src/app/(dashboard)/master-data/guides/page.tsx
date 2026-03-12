import { loadGuidesManagementInitialData } from "@/modules/guides/server/guides-management-loader";
import { GuidesManagementView } from "@/modules/guides/ui/views/guides-management-view";

const GuidesPage = async () => {
  const initialData = await loadGuidesManagementInitialData("guides");

  return (
    <div className="p-4 md:p-6">
      <GuidesManagementView initialData={initialData} />
    </div>
  );
};

export default GuidesPage;
