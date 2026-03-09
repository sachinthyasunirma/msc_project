import { notFound } from "next/navigation";
import { loadCurrencyManagementInitialData } from "@/modules/currency/server/currency-management-loader";
import {
  CurrencyManagementView,
  type CurrencyResourceKey,
} from "@/modules/currency/ui/views/currency-management-view";

const allowedResources: CurrencyResourceKey[] = [
  "currencies",
  "fx-providers",
  "exchange-rates",
  "money-settings",
];

type PageProps = {
  params: Promise<{ resource: string }>;
};

const CurrenciesResourcePage = async ({ params }: PageProps) => {
  const resolved = await params;
  if (!allowedResources.includes(resolved.resource as CurrencyResourceKey)) {
    notFound();
  }
  const resource = resolved.resource as CurrencyResourceKey;
  const initialData = await loadCurrencyManagementInitialData(resource);

  return (
    <div className="p-4 md:p-6">
      <CurrencyManagementView initialResource={resource} initialData={initialData} />
    </div>
  );
};

export default CurrenciesResourcePage;
