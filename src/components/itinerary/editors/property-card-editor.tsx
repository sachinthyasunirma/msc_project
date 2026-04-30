"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Stay } from "@/lib/types/itinerary";

type PropertyCardEditorProps = {
  stay: Stay;
  onChange: (stay: Stay) => void;
  onRemove: (stayId: string) => void;
};

export function PropertyCardEditor({ stay, onChange, onRemove }: PropertyCardEditorProps) {
  return (
    <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-base font-semibold text-slate-950">{stay.propertyName}</h4>
          <p className="text-sm text-slate-500">{stay.city}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => onRemove(stay.id)}>
          <Trash2 className="size-4" />
          Remove
        </Button>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="space-y-2">
          <Label>Property name</Label>
          <Input value={stay.propertyName} onChange={(event) => onChange({ ...stay, propertyName: event.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>City</Label>
          <Input value={stay.city} onChange={(event) => onChange({ ...stay, city: event.target.value })} />
        </div>
        <div className="space-y-2 xl:col-span-2">
          <Label>Address</Label>
          <Input value={stay.address} onChange={(event) => onChange({ ...stay, address: event.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Check-in</Label>
          <Input value={stay.checkIn} onChange={(event) => onChange({ ...stay, checkIn: event.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Check-out</Label>
          <Input value={stay.checkOut} onChange={(event) => onChange({ ...stay, checkOut: event.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Room type</Label>
          <Input value={stay.roomType} onChange={(event) => onChange({ ...stay, roomType: event.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Confirmation</Label>
          <Input value={stay.confirmation} onChange={(event) => onChange({ ...stay, confirmation: event.target.value })} />
        </div>
        <div className="space-y-2 xl:col-span-2">
          <Label>Amenities</Label>
          <Input
            value={stay.amenities.join(", ")}
            onChange={(event) =>
              onChange({
                ...stay,
                amenities: event.target.value.split(",").map((item) => item.trim()).filter(Boolean),
              })
            }
            placeholder="Breakfast, Spa, Pool"
          />
        </div>
        <div className="space-y-2 xl:col-span-2">
          <Label>Notes</Label>
          <Textarea rows={3} value={stay.notes} onChange={(event) => onChange({ ...stay, notes: event.target.value })} />
        </div>
      </div>
    </div>
  );
}
