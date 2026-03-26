import { OnTourManageView } from "@/modules/on-tour/ui/views/on-tour-manage-view";

type PageProps = {
  params: Promise<{ onTourId: string }>;
};

const OnTourManagePage = async ({ params }: PageProps) => {
  const { onTourId } = await params;

  return (
    <div className="p-4 md:p-6">
      <OnTourManageView onTourId={onTourId} />
    </div>
  );
};

export default OnTourManagePage;
