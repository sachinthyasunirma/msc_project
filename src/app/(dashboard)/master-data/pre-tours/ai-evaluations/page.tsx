import dynamic from "next/dynamic";
import { LoadingState } from "@/components/ui/loading-state";

const PreTourAIEvaluationsView = dynamic(
  () =>
    import("@/modules/pre-tour/ui/views/pre-tour-ai-evaluations-view").then(
      (module) => module.PreTourAIEvaluationsView
    ),
  {
    loading: () => (
      <LoadingState
        title="Loading AI evaluation dashboard"
        description="Preparing prompt analytics, validation outcomes, and review controls."
      />
    ),
  }
);

const PreTourAIEvaluationsPage = () => {
  return (
    <div className="p-4 md:p-6">
      <PreTourAIEvaluationsView />
    </div>
  );
};

export default PreTourAIEvaluationsPage;
