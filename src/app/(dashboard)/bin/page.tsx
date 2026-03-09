import { loadPreTourMastersData } from "@/modules/pre-tour/server/pre-tour-masters-service";
import { PreTourPlansView } from "@/modules/pre-tour/ui/views/pre-tour-plans-view";

const BinPage = async () => {
  const initialMasters = await loadPreTourMastersData();

  return (
    <div className="p-4 md:p-6">
      <PreTourPlansView showBinOnly initialMasters={initialMasters} />
    </div>
  );
};

export default BinPage;
