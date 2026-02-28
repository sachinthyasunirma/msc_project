import { TaxManagementView } from "@/modules/tax/ui/views/tax-management-view";

const TaxesPage = () => {
  return (
    <div className="p-4 md:p-6">
      <TaxManagementView initialResource="taxes" />
    </div>
  );
};

export default TaxesPage;
