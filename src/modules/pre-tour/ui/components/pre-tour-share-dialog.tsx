"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Row } from "@/modules/pre-tour/shared/pre-tour-management-types";

type PreTourShareDialogProps = {
  sharingItem: Row | null;
  shareTargetDayId: string;
  onShareTargetDayIdChange: (value: string) => void;
  dayOptions: Array<{ value: string; label: string }>;
  sharing: boolean;
  isReadOnly: boolean;
  onClose: () => void;
  onShare: () => void;
};

export function PreTourShareDialog({
  sharingItem,
  shareTargetDayId,
  onShareTargetDayIdChange,
  dayOptions,
  sharing,
  isReadOnly,
  onClose,
  onShare,
}: PreTourShareDialogProps) {
  return (
    <Dialog open={Boolean(sharingItem)} onOpenChange={(open) => (!open ? onClose() : null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Item To Another Day</DialogTitle>
          <DialogDescription>Copy this item and assign it to another day in the same pre-tour.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Target Day</Label>
          <Select value={shareTargetDayId} onValueChange={onShareTargetDayIdChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select target day" />
            </SelectTrigger>
            <SelectContent>
              {dayOptions
                .filter((option) => option.value !== String(sharingItem?.dayId || ""))
                .map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onShare} disabled={!shareTargetDayId || sharing || isReadOnly}>
            {sharing ? "Sharing..." : "Share Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

