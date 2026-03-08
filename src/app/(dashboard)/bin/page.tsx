import { PreTourPlansView } from "@/modules/pre-tour/ui/views/pre-tour-plans-view";

const BinPage = () => {
  return (
    <div className="p-4 md:p-6">
      <PreTourPlansView showBinOnly />
    </div>
  );
};

export default BinPage;
