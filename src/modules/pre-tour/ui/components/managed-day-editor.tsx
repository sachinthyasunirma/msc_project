"use client";

import { useMemo, useState } from "react";
import { CopyPlus, GripVertical, PanelLeftOpen, Plus, Settings2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import type { Row } from "@/modules/pre-tour/shared/pre-tour-management-types";
import { formatDate, itemTypeAccentClass, matchesQuery } from "@/modules/pre-tour/lib/pre-tour-management-utils";

type ManagedDayEditorProps = {
  selectedDay: Row | null;
  selectedDayItems: Row[];
  query: string;
  isReadOnly: boolean;
  addonsByItemId: Map<string, Row[]>;
  lookupLabel: (id: unknown) => string;
  onAddItem: (day: Row) => void;
  onEditDay: (day: Row) => void;
  onViewItem: (day: Row, item: Row) => void;
  onAddAddon: (day: Row, item: Row) => void;
  onEditAddon: (item: Row, addon: Row) => void;
  onShareItem: (item: Row) => void;
  onEditItem: (day: Row, item: Row) => void;
  onDeleteItem: (item: Row) => void;
  onMoveItemWithinDay: (dayId: string, dragItemId: string, targetItemId: string) => void;
};

export function ManagedDayEditor({
  selectedDay,
  selectedDayItems,
  query,
  isReadOnly,
  addonsByItemId,
  lookupLabel,
  onAddItem,
  onEditDay,
  onViewItem,
  onAddAddon,
  onEditAddon,
  onShareItem,
  onEditItem,
  onDeleteItem,
  onMoveItemWithinDay,
}: ManagedDayEditorProps) {
  const [dragItemId, setDragItemId] = useState("");
  const itemAddonsByItemId = useMemo(() => {
    const next = new Map<string, Row[]>();
    selectedDayItems.forEach((item) => {
      const itemId = String(item.id);
      const rows = (addonsByItemId.get(itemId) ?? []).filter((addon) =>
        matchesQuery("pre-tour-item-addons", addon, query)
      );
      next.set(itemId, rows);
    });
    return next;
  }, [addonsByItemId, query, selectedDayItems]);

  if (!selectedDay) {
    return (
      <Card className="border-border/70 shadow-sm">
        <CardContent className="px-3 py-6 text-center text-sm text-muted-foreground">
          No day selected. Select a day from the Day Wise Planner to continue.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="space-y-2 px-3 py-2.5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="font-medium">{`Day ${String(
                selectedDay.dayNumber
              )}`}</Badge>
              <span className="text-sm font-semibold">{String(selectedDay.title || "Untitled Day")}</span>
            </div>
            <CardDescription className="text-xs">
              {formatDate(selectedDay.date)} • {lookupLabel(selectedDay.startLocationId)} →{" "}
              {lookupLabel(selectedDay.endLocationId)}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              className="master-add-btn h-8"
              onClick={() => onAddItem(selectedDay)}
              disabled={isReadOnly}
            >
              <Plus className="mr-1 size-4" />
              Add Item
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="size-8"
              title="Day Details"
              onClick={() => onEditDay(selectedDay)}
              disabled={isReadOnly}
            >
              <Settings2 className="size-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 px-3 pb-2.5 pt-0">
        {selectedDayItems.length === 0 ? (
          <div className="rounded-md border border-dashed bg-muted/20 px-3 py-4 text-center text-xs text-muted-foreground">
            {query.trim() ? "No matching plan items found for this day." : "No plan items for this day."}
          </div>
        ) : (
          <div className="space-y-1.5">
            {selectedDayItems.map((item) => {
              const itemId = String(item.id);
              const itemAddons = itemAddonsByItemId.get(itemId) ?? [];
              return (
                <div
                  key={itemId}
                  className={`${itemTypeAccentClass(item.itemType)} rounded-md px-2.5 py-2`}
                  draggable={!isReadOnly}
                  onDragStart={() => setDragItemId(itemId)}
                  onDragEnd={() => setDragItemId("")}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    onMoveItemWithinDay(String(selectedDay.id), dragItemId, itemId);
                    setDragItemId("");
                  }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <GripVertical className="size-4 shrink-0 text-muted-foreground" />
                        <Badge variant="secondary">{String(item.itemType || "-")}</Badge>
                        <p className="truncate text-sm font-medium">{String(item.title || item.code || "-")}</p>
                        <Badge variant="outline">{String(item.status || "-")}</Badge>
                      </div>
                      <p className="mt-1 pl-6 text-xs text-muted-foreground">
                        {String(item.startAt || "").slice(11, 16) || "-"} -{" "}
                        {String(item.endAt || "").slice(11, 16) || "-"} • {String(item.currencyCode || "-")}{" "}
                        {String(item.totalAmount || "0")}
                      </p>
                      {itemAddons.length > 0 ? (
                        <div className="mt-1.5 flex flex-wrap gap-1 pl-6">
                          {itemAddons.map((addon) => (
                            <Badge
                              key={String(addon.id)}
                              variant="outline"
                              className="cursor-pointer"
                              onClick={() => onEditAddon(item, addon)}
                            >
                              {String(addon.title || addon.code)}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        className="size-7"
                        title="View"
                        onClick={() => onViewItem(selectedDay, item)}
                      >
                        <PanelLeftOpen className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="size-7"
                        title="Add Addon"
                        onClick={() => onAddAddon(selectedDay, item)}
                        disabled={isReadOnly}
                      >
                        <Plus className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="size-7"
                        title="Share"
                        onClick={() => onShareItem(item)}
                        disabled={isReadOnly}
                      >
                        <CopyPlus className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="size-7"
                        title="Edit"
                        onClick={() => onEditItem(selectedDay, item)}
                        disabled={isReadOnly}
                      >
                        <Settings2 className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="size-7"
                        title="Delete"
                        onClick={() => onDeleteItem(item)}
                        disabled={isReadOnly}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
