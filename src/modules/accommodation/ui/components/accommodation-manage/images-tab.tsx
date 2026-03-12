"use client";

import { MediaAssetManagerPanel } from "@/modules/media/ui/components/media-asset-manager-panel";

type ImagesTabProps = {
  hotelId: string;
  isReadOnly: boolean;
};

export function ImagesTab({
  hotelId,
  isReadOnly,
}: ImagesTabProps) {
  return (
    <div className="mt-4 space-y-3">
      <MediaAssetManagerPanel
        entityType="ACCOMMODATION_HOTEL"
        entityId={hotelId}
        isReadOnly={isReadOnly}
      />
    </div>
  );
}
