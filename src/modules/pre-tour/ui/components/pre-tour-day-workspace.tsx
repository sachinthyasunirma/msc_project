import { CalendarDays, Route, Sun } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Row = Record<string, unknown>;

function asNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatDateTime(value: unknown) {
  if (!value || typeof value !== "string") return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Props = {
  days: Row[];
  items: Row[];
  selectedDayId: string;
  onSelectDay: (dayId: string) => void;
  lookupLabel: (id: unknown) => string;
  onAddItem?: () => void;
  disableAdd?: boolean;
};

export function PreTourDayWorkspace({
  days,
  items,
  selectedDayId,
  onSelectDay,
  lookupLabel,
  onAddItem,
  disableAdd = false,
}: Props) {
  const sortedDays = [...days].sort(
    (a, b) => asNumber(a.dayNumber, 0) - asNumber(b.dayNumber, 0)
  );

  const selectedDay = sortedDays.find((day) => String(day.id) === selectedDayId) ?? null;

  const selectedDayItems = items
    .filter((item) => String(item.dayId) === selectedDayId)
    .sort((a, b) => asNumber(a.sortOrder, 0) - asNumber(b.sortOrder, 0));

  const activeItems = selectedDayItems.filter((item) => Boolean(item.isActive)).length;

  return (
    <Card className="border-border/70 bg-muted/20 shadow-none">
      <CardContent className="space-y-2.5 p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Day Wise Planner
            </p>
            <p className="text-xs text-muted-foreground">
              Select a day to focus operations, services, and pricing quickly.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {onAddItem && selectedDay ? (
              <Button size="sm" className="master-add-btn" onClick={onAddItem} disabled={disableAdd}>
                + Add Item
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {sortedDays.length === 0 ? (
            <div className="rounded-md border border-dashed px-2.5 py-1.5 text-xs text-muted-foreground">
              No days configured yet.
            </div>
          ) : (
            sortedDays.map((day) => {
              const dayId = String(day.id);
              const selected = dayId === selectedDayId;
              return (
                <Button
                  key={dayId}
                  type="button"
                  variant={selected ? "default" : "outline"}
                  className={selected ? "bg-primary text-primary-foreground" : "bg-background"}
                  onClick={() => onSelectDay(dayId)}
                >
                  <Sun className="mr-1 size-4" />
                  Day {day.dayNumber as number}
                </Button>
              );
            })
          )}
        </div>

        {selectedDay ? (
          <div className="grid gap-2 md:grid-cols-3">
            <div className="rounded-lg border bg-background p-2.5">
              <p className="text-xs font-medium text-muted-foreground">Day Summary</p>
              <p className="mt-1 text-sm font-semibold">
                Day {String(selectedDay.dayNumber)} {selectedDay.title ? `• ${String(selectedDay.title)}` : ""}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                <CalendarDays className="mr-1 inline size-3" />
                {formatDateTime(selectedDay.date)}
              </p>
            </div>

            <div className="rounded-lg border bg-background p-2.5">
              <p className="text-xs font-medium text-muted-foreground">Route Context</p>
              <p className="mt-1 text-xs text-muted-foreground">
                <Route className="mr-1 inline size-3" />
                {lookupLabel(selectedDay.startLocationId)} → {lookupLabel(selectedDay.endLocationId)}
              </p>
            </div>

            <div className="rounded-lg border bg-background p-2.5">
              <p className="text-xs font-medium text-muted-foreground">Services</p>
              <div className="mt-1 flex items-center gap-1.5">
                <Badge variant="outline">{selectedDayItems.length} total</Badge>
                <Badge variant="outline">{activeItems} active</Badge>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
