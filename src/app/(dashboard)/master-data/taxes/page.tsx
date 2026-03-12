import { loadTaxManagementInitialData } from "@/modules/tax/server/tax-management-loader";
import { TaxManagementView } from "@/modules/tax/ui/views/tax-management-view";

const TaxesPage = async () => {
  const initialData = await loadTaxManagementInitialData("taxes");

  return (
    <div className="p-4 md:p-6">
      <TaxManagementView initialResource="taxes" initialData={initialData} />
    </div>
  );
};

export default TaxesPage;
