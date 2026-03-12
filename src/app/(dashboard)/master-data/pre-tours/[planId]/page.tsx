import { loadPreTourMastersData } from "@/modules/pre-tour/server/pre-tour-masters-service";
import { PreTourPlanManageView } from "@/modules/pre-tour/ui/views/pre-tour-plan-manage-view";

type PageProps = {
  params: Promise<{ planId: string }>;
};

const PreTourPlanManagePage = async ({ params }: PageProps) => {
  const { planId } = await params;
  const initialMasters = await loadPreTourMastersData();

  return (
    <div className="p-4 md:p-6">
      <PreTourPlanManageView planId={planId} initialMasters={initialMasters} />
    </div>
  );
};

export default PreTourPlanManagePage;
