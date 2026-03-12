"use client";

import dynamic from "next/dynamic";

const MediaAssetManagerPanel = dynamic(
  () =>
    import("@/modules/media/ui/components/media-asset-manager-panel").then(
      (module) => module.MediaAssetManagerPanel
    ),
  { ssr: false }
);

type ActivityImagesTabProps = {
  activityId: string;
  isReadOnly: boolean;
  enabled: boolean;
};

export function ActivityImagesTab({
  activityId,
  isReadOnly,
  enabled,
}: ActivityImagesTabProps) {
  return (
    <div className="mt-0">
      <MediaAssetManagerPanel
        entityType="ACTIVITY"
        entityId={activityId}
        enabled={enabled}
        isReadOnly={isReadOnly}
      />
    </div>
  );
}
