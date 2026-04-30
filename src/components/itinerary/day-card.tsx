"use client";

import { Copy, GripVertical, MinusCircle, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { DayPlan } from "@/lib/types/itinerary";
import { DayTimelineEditor } from "@/components/itinerary/day-timeline-editor";

type DayCardProps = {
  day: DayPlan;
  draggedDayId: string | null;
  onDragStart: (dayId: string) => void;
  onDragEnd: () => void;
  onDrop: (targetDayId: string) => void;
  onChange: (nextDay: DayPlan) => void;
  onDuplicate: (dayId: string) => void;
  onRemove: (dayId: string) => void;
};

export function DayCard({
  day,
  draggedDayId,
  onDragStart,
  onDragEnd,
  onDrop,
  onChange,
  onDuplicate,
  onRemove,
}: DayCardProps) {
  return (
    <Card
      draggable
      onDragStart={() => onDragStart(day.id)}
      onDragEnd={onDragEnd}
      onDragOver={(event) => event.preventDefault()}
      onDrop={() => onDrop(day.id)}
      className={cn(
        "overflow-hidden rounded-[28px] border-slate-200/80 bg-white/95 shadow-[0_22px_60px_-36px_rgba(15,23,42,0.22)] transition-all",
        draggedDayId === day.id ? "opacity-60" : "hover:-translate-y-0.5"
      )}
    >
      <Collapsible open={day.expanded} onOpenChange={(open) => onChange({ ...day, expanded: open })}>
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-1 rounded-full border border-slate-200 bg-slate-50 p-2 text-slate-500">
                <GripVertical className="size-4" />
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                    Day {day.dayNumber}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {day.date}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-slate-950">{day.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{day.summary}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => onDuplicate(day.id)}>
                <Copy className="size-4" />
                Duplicate
              </Button>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  {day.expanded ? <MinusCircle className="size-4" /> : <Plus className="size-4" />}
                  {day.expanded ? "Collapse" : "Expand"}
                </Button>
              </CollapsibleTrigger>
              <Button type="button" variant="outline" size="sm" onClick={() => onRemove(day.id)}>
                <Trash2 className="size-4" />
                Remove
              </Button>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-6 pt-6">
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="space-y-2">
                <Label>Day title</Label>
                <Input value={day.title} onChange={(event) => onChange({ ...day, title: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input value={day.date} onChange={(event) => onChange({ ...day, date: event.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Summary</Label>
              <Textarea rows={3} value={day.summary} onChange={(event) => onChange({ ...day, summary: event.target.value })} />
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="space-y-2">
                <Label>Morning</Label>
                <Textarea rows={4} value={day.morning} onChange={(event) => onChange({ ...day, morning: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Afternoon</Label>
                <Textarea rows={4} value={day.afternoon} onChange={(event) => onChange({ ...day, afternoon: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Evening</Label>
                <Textarea rows={4} value={day.evening} onChange={(event) => onChange({ ...day, evening: event.target.value })} />
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="space-y-2">
                <Label>Transportation</Label>
                <Input
                  value={day.transportation}
                  onChange={(event) => onChange({ ...day, transportation: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Accommodation</Label>
                <Input
                  value={day.accommodation}
                  onChange={(event) => onChange({ ...day, accommodation: event.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="space-y-2">
                <Label>Activities</Label>
                <Textarea
                  rows={4}
                  value={day.activities.join("\n")}
                  onChange={(event) =>
                    onChange({
                      ...day,
                      activities: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean),
                    })
                  }
                  placeholder="One activity per line"
                />
              </div>
              <div className="space-y-2">
                <Label>Meals</Label>
                <Textarea
                  rows={4}
                  value={day.meals.join("\n")}
                  onChange={(event) =>
                    onChange({
                      ...day,
                      meals: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean),
                    })
                  }
                  placeholder="Breakfast&#10;Lunch&#10;Dinner"
                />
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
              <div className="mb-4 flex items-center gap-2 text-slate-900">
                <Sparkles className="size-4" />
                <h4 className="text-sm font-semibold">Timeline builder</h4>
              </div>
              <DayTimelineEditor items={day.timeline} onChange={(timeline) => onChange({ ...day, timeline })} />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea rows={4} value={day.notes} onChange={(event) => onChange({ ...day, notes: event.target.value })} />
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
