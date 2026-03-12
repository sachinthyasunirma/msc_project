"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MediaAssetManagerPanel } from "@/modules/media/ui/components/media-asset-manager-panel";
import type { MediaEntityType } from "@/modules/media/shared/media-types";

type MediaAssetManagerViewProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: MediaEntityType;
  entityId: string;
  entityLabel: string;
  isReadOnly?: boolean;
};

export function MediaAssetManagerView({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityLabel,
  isReadOnly = false,
}: MediaAssetManagerViewProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>{entityLabel} Media Assets</DialogTitle>
        </DialogHeader>
        <MediaAssetManagerPanel
          entityType={entityType}
          entityId={entityId}
          enabled={open}
          isReadOnly={isReadOnly}
        />
        {isReadOnly ? (
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
