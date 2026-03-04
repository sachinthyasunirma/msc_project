import { PreTourManagementView } from "@/modules/pre-tour/ui/views/pre-tour-management-view";

const BinPage = () => {
  return (
    <div className="p-4 md:p-6">
      <PreTourManagementView showBinOnly />
    </div>
  );
};

export default BinPage;

