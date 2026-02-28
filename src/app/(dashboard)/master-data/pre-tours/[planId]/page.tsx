import { PreTourManagementView } from "@/modules/pre-tour/ui/views/pre-tour-management-view";

type PageProps = {
  params: Promise<{ planId: string }>;
};

const PreTourPlanManagePage = async ({ params }: PageProps) => {
  const { planId } = await params;

  return (
    <div className="p-4 md:p-6">
      <PreTourManagementView
        managedPlanId={planId}
        initialResource="pre-tour-days"
      />
    </div>
  );
};

export default PreTourPlanManagePage;
