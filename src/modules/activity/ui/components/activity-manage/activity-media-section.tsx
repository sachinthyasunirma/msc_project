"use client";

import dynamic from "next/dynamic";
import { ImagePlus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const MediaAssetManagerView = dynamic(
  () =>
    import("@/modules/media/ui/views/media-asset-manager-view").then(
      (module) => module.MediaAssetManagerView
    ),
  { ssr: false }
);

type ActivityMediaSectionProps = {
  activityId: string;
  activityLabel: string;
  isReadOnly: boolean;
};

export function ActivityMediaSection({
  activityId,
  activityLabel,
  isReadOnly,
}: ActivityMediaSectionProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <ImagePlus className="mr-2 size-4" />
        Manage Images
      </Button>

      {open ? (
        <MediaAssetManagerView
          open={open}
          onOpenChange={setOpen}
          entityType="ACTIVITY"
          entityId={activityId}
          entityLabel={activityLabel}
          isReadOnly={isReadOnly}
        />
      ) : null}
    </>
  );
}
