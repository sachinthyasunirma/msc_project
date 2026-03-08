import { PreTourPlanManageView } from "@/modules/pre-tour/ui/views/pre-tour-plan-manage-view";

type PageProps = {
  params: Promise<{ planId: string }>;
};

const PreTourPlanManagePage = async ({ params }: PageProps) => {
  const { planId } = await params;

  return (
    <div className="p-4 md:p-6">
      <PreTourPlanManageView planId={planId} />
    </div>
  );
};

export default PreTourPlanManagePage;
