import { TaxManagementView } from "@/modules/tax/ui/views/tax-management-view";

type PageProps = {
  params: Promise<{ taxId: string }>;
};

const TaxManagePage = async ({ params }: PageProps) => {
  const resolved = await params;

  return (
    <div className="p-4 md:p-6">
      <TaxManagementView initialResource="tax-rates" managedTaxId={resolved.taxId} />
    </div>
  );
};

export default TaxManagePage;
