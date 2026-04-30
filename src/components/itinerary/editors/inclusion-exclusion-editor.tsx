"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type InclusionExclusionEditorProps = {
  inclusions: string[];
  exclusions: string[];
  onChange: (value: { inclusions: string[]; exclusions: string[] }) => void;
};

function ChecklistColumn({
  title,
  description,
  items,
  onChange,
}: {
  title: string;
  description: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  return (
    <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h4 className="text-base font-semibold text-slate-950">{title}</h4>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, "New line item"])}>
          <Plus className="size-4" />
          Add
        </Button>
      </div>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={`${title}-${index}`} className="flex items-center gap-2">
            <Input
              value={item}
              onChange={(event) =>
                onChange(items.map((entry, entryIndex) => (entryIndex === index ? event.target.value : entry)))
              }
            />
            <Button type="button" variant="outline" size="icon" onClick={() => onChange(items.filter((_, entryIndex) => entryIndex !== index))}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function InclusionExclusionEditor({
  inclusions,
  exclusions,
  onChange,
}: InclusionExclusionEditorProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-[0.22em] text-slate-500">Inclusions</Label>
        <ChecklistColumn
          title="Included"
          description="Everything that should confidently feel covered."
          items={inclusions}
          onChange={(next) => onChange({ inclusions: next, exclusions })}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-[0.22em] text-slate-500">Exclusions</Label>
        <ChecklistColumn
          title="Excluded"
          description="Set expectations clearly and elegantly."
          items={exclusions}
          onChange={(next) => onChange({ inclusions, exclusions: next })}
        />
      </div>
    </div>
  );
}
