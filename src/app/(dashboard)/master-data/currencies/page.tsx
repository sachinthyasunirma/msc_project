import { loadCurrencyManagementInitialData } from "@/modules/currency/server/currency-management-loader";
import { CurrencyManagementView } from "@/modules/currency/ui/views/currency-management-view";

const CurrenciesPage = async () => {
  const initialData = await loadCurrencyManagementInitialData("currencies");

  return (
    <div className="p-4 md:p-6">
      <CurrencyManagementView initialData={initialData} />
    </div>
  );
};

export default CurrenciesPage;
