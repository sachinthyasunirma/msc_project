import { loadCompanyConfigurationInitialData } from "@/modules/dashboard/server/company-configuration-loader";
import { CompanyConfigurationView } from "@/modules/dashboard/ui/views/company-configuration-view";

const CompanyConfigurationPage = async () => {
  const initialData = await loadCompanyConfigurationInitialData();

  return (
    <div className="p-4 md:p-6">
      <CompanyConfigurationView initialData={initialData} />
    </div>
  );
};

export default CompanyConfigurationPage;
