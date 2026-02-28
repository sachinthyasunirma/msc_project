import { GuidesManagementView } from "@/modules/guides/ui/views/guides-management-view";

type PageProps = {
  params: Promise<{ guideId: string }>;
};

const GuideManagePage = async ({ params }: PageProps) => {
  const resolved = await params;

  return (
    <div className="p-4 md:p-6">
      <GuidesManagementView initialResource="guide-rates" managedGuideId={resolved.guideId} />
    </div>
  );
};

export default GuideManagePage;
