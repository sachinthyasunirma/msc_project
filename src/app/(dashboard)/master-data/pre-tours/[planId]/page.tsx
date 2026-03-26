import dynamic from "next/dynamic";
import { LoadingState } from "@/components/ui/loading-state";
import { loadPreTourMastersData } from "@/modules/pre-tour/server/pre-tour-masters-service";

const PreTourPlanManageView = dynamic(
  () =>
    import("@/modules/pre-tour/ui/views/pre-tour-plan-manage-view").then(
      (module) => module.PreTourPlanManageView
    ),
  {
    loading: () => (
      <LoadingState
        title="Loading pre-tour editor"
        description="Preparing days, allocations, costing, and routing tools."
      />
    ),
  }
);

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
