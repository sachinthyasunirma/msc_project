import { loadTaxManagementInitialData } from "@/modules/tax/server/tax-management-loader";
import { TaxManagementView } from "@/modules/tax/ui/views/tax-management-view";

type PageProps = {
  params: Promise<{ taxId: string }>;
};

const TaxManagePage = async ({ params }: PageProps) => {
  const resolved = await params;
  const initialData = await loadTaxManagementInitialData("tax-rates", {
    managedTaxId: resolved.taxId,
  });

  return (
    <div className="p-4 md:p-6">
      <TaxManagementView
        initialResource="tax-rates"
        managedTaxId={resolved.taxId}
        initialData={initialData}
      />
    </div>
  );
};

export default TaxManagePage;
