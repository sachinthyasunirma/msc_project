import type { DialogMode } from "@/modules/accommodation/lib/accommodation-view-helpers";

export type AccommodationDialogProps = {
  open: boolean;
  mode: DialogMode;
  saving: boolean;
  isReadOnly: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
  onSubmit: () => void;
};
