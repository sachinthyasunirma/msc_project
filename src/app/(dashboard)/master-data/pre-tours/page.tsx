import dynamic from "next/dynamic";
import { LoadingState } from "@/components/ui/loading-state";
import { loadPreTourMastersData } from "@/modules/pre-tour/server/pre-tour-masters-service";

const PreTourPlansView = dynamic(
  () =>
    import("@/modules/pre-tour/ui/views/pre-tour-plans-view").then(
      (module) => module.PreTourPlansView
    ),
  {
    loading: () => (
      <LoadingState
        title="Loading pre-tour workspace"
        description="Preparing planning boards, pricing controls, and version history."
      />
    ),
  }
);

const PreToursPage = async () => {
  const initialMasters = await loadPreTourMastersData();

  return (
    <div className="p-4 md:p-6">
      <PreTourPlansView initialMasters={initialMasters} />
    </div>
  );
};

export default PreToursPage;
