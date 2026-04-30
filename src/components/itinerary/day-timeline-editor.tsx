"use client";

import { Plus, Trash2 } from "lucide-react";
import { nanoid } from "nanoid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { TimelineItem } from "@/lib/types/itinerary";

type DayTimelineEditorProps = {
  items: TimelineItem[];
  onChange: (items: TimelineItem[]) => void;
};

export function DayTimelineEditor({ items, onChange }: DayTimelineEditorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-950">Timeline</h4>
          <p className="text-xs text-slate-500">Build the day as a refined sequence instead of a single wall of text.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange([
              ...items,
              {
                id: nanoid(),
                title: "New timeline item",
                time: "09:00",
                type: "activity",
                phase: "morning",
                location: "Add location",
                description: "Describe the moment.",
              },
            ])
          }
        >
          <Plus className="size-4" />
          Add item
        </Button>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  value={item.time}
                  onChange={(event) =>
                    onChange(items.map((entry) => (entry.id === item.id ? { ...entry, time: event.target.value } : entry)))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={item.type}
                  onValueChange={(value) =>
                    onChange(items.map((entry) => (entry.id === item.id ? { ...entry, type: value as TimelineItem["type"] } : entry)))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activity">Activity</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="meal">Meal</SelectItem>
                    <SelectItem value="check-in">Check-in</SelectItem>
                    <SelectItem value="note">Note</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Phase</Label>
                <Select
                  value={item.phase}
                  onValueChange={(value) =>
                    onChange(items.map((entry) => (entry.id === item.id ? { ...entry, phase: value as TimelineItem["phase"] } : entry)))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="afternoon">Afternoon</SelectItem>
                    <SelectItem value="evening">Evening</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={item.location}
                  onChange={(event) =>
                    onChange(items.map((entry) => (entry.id === item.id ? { ...entry, location: event.target.value } : entry)))
                  }
                />
              </div>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={item.title}
                    onChange={(event) =>
                      onChange(items.map((entry) => (entry.id === item.id ? { ...entry, title: event.target.value } : entry)))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    rows={3}
                    value={item.description}
                    onChange={(event) =>
                      onChange(items.map((entry) => (entry.id === item.id ? { ...entry, description: event.target.value } : entry)))
                    }
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() => onChange(items.filter((entry) => entry.id !== item.id))}
              >
                <Trash2 className="size-4" />
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
