import { CurrencyManagementView } from "@/modules/currency/ui/views/currency-management-view";

type PageProps = {
  params: Promise<{ currencyId: string }>;
};

const CurrencyManagePage = async ({ params }: PageProps) => {
  const resolved = await params;

  return (
    <div className="p-4 md:p-6">
      <CurrencyManagementView
        initialResource="exchange-rates"
        managedCurrencyId={resolved.currencyId}
      />
    </div>
  );
};

export default CurrencyManagePage;
