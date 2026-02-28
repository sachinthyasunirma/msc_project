import { notFound } from "next/navigation";
import { TaxManagementView, type TaxResourceKey } from "@/modules/tax/ui/views/tax-management-view";

const allowedResources: TaxResourceKey[] = [
  "tax-jurisdictions",
  "taxes",
  "tax-rates",
  "tax-rule-sets",
  "tax-rules",
  "tax-rule-taxes",
  "document-fx-snapshots",
  "document-tax-snapshots",
  "document-tax-lines",
];

type PageProps = {
  params: Promise<{ resource: string }>;
};

const TaxesResourcePage = async ({ params }: PageProps) => {
  const resolved = await params;
  if (!allowedResources.includes(resolved.resource as TaxResourceKey)) {
    notFound();
  }

  return (
    <div className="p-4 md:p-6">
      <TaxManagementView initialResource={resolved.resource as TaxResourceKey} />
    </div>
  );
};

export default TaxesResourcePage;
