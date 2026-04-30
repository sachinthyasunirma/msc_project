"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Activity } from "@/lib/types/itinerary";

type ActivityCardEditorProps = {
  activity: Activity;
  onChange: (activity: Activity) => void;
  onRemove: (activityId: string) => void;
};

export function ActivityCardEditor({
  activity,
  onChange,
  onRemove,
}: ActivityCardEditorProps) {
  return (
    <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-base font-semibold text-slate-950">{activity.title}</h4>
          <p className="text-sm text-slate-500">{activity.location}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => onRemove(activity.id)}>
          <Trash2 className="size-4" />
          Remove
        </Button>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="space-y-2">
          <Label>Activity title</Label>
          <Input value={activity.title} onChange={(event) => onChange({ ...activity, title: event.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Location</Label>
          <Input value={activity.location} onChange={(event) => onChange({ ...activity, location: event.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Start time</Label>
          <Input
            value={activity.startTime}
            onChange={(event) => onChange({ ...activity, startTime: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Duration</Label>
          <Input value={activity.duration} onChange={(event) => onChange({ ...activity, duration: event.target.value })} />
        </div>
        <div className="space-y-2 xl:col-span-2">
          <Label>Booking reference</Label>
          <Input
            value={activity.bookingReference}
            onChange={(event) => onChange({ ...activity, bookingReference: event.target.value })}
          />
        </div>
        <label className="flex items-center gap-3 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 xl:col-span-2">
          <Checkbox
            checked={activity.included}
            onCheckedChange={(checked) => onChange({ ...activity, included: checked === true })}
          />
          <span className="text-sm font-medium text-slate-700">Included in the itinerary price</span>
        </label>
        <div className="space-y-2 xl:col-span-2">
          <Label>Notes</Label>
          <Textarea rows={3} value={activity.notes} onChange={(event) => onChange({ ...activity, notes: event.target.value })} />
        </div>
      </div>
    </div>
  );
}
