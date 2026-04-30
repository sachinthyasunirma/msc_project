"use client";

import { Copy, Eye, EyeOff, GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type SectionToolbarProps = {
  visible: boolean;
  onToggleVisibility?: () => void;
  onAdd?: () => void;
  onDuplicate?: () => void;
  onRemove?: () => void;
};

export function SectionToolbar({
  visible,
  onToggleVisibility,
  onAdd,
  onDuplicate,
  onRemove,
}: SectionToolbarProps) {
  return (
    <>
      {onAdd ? (
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="size-4" />
          Add
        </Button>
      ) : null}
      {onDuplicate ? (
        <Button type="button" variant="outline" size="sm" onClick={onDuplicate}>
          <Copy className="size-4" />
          Duplicate
        </Button>
      ) : null}
      {onToggleVisibility ? (
        <Button type="button" variant="outline" size="sm" onClick={onToggleVisibility}>
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          {visible ? "Hide" : "Show"}
        </Button>
      ) : null}
      {onRemove ? (
        <Button type="button" variant="outline" size="sm" onClick={onRemove}>
          <Trash2 className="size-4" />
          Remove
        </Button>
      ) : null}
      <div className="inline-flex size-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500">
        <GripVertical className="size-4" />
      </div>
    </>
  );
}
