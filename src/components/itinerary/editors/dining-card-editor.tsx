"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { DiningReservation } from "@/lib/types/itinerary";

type DiningCardEditorProps = {
  dining: DiningReservation;
  onChange: (dining: DiningReservation) => void;
  onRemove: (diningId: string) => void;
};

export function DiningCardEditor({
  dining,
  onChange,
  onRemove,
}: DiningCardEditorProps) {
  return (
    <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-base font-semibold text-slate-950">{dining.restaurantName}</h4>
          <p className="text-sm text-slate-500">{dining.cuisine}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => onRemove(dining.id)}>
          <Trash2 className="size-4" />
          Remove
        </Button>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="space-y-2">
          <Label>Restaurant</Label>
          <Input
            value={dining.restaurantName}
            onChange={(event) => onChange({ ...dining, restaurantName: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Reservation time</Label>
          <Input
            value={dining.reservationTime}
            onChange={(event) => onChange({ ...dining, reservationTime: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Cuisine</Label>
          <Input value={dining.cuisine} onChange={(event) => onChange({ ...dining, cuisine: event.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Confirmation</Label>
          <Input
            value={dining.confirmation}
            onChange={(event) => onChange({ ...dining, confirmation: event.target.value })}
          />
        </div>
        <div className="space-y-2 xl:col-span-2">
          <Label>Address</Label>
          <Input value={dining.address} onChange={(event) => onChange({ ...dining, address: event.target.value })} />
        </div>
        <div className="space-y-2 xl:col-span-2">
          <Label>Notes</Label>
          <Textarea rows={3} value={dining.notes} onChange={(event) => onChange({ ...dining, notes: event.target.value })} />
        </div>
      </div>
    </div>
  );
}
