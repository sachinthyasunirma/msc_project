"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Transfer } from "@/lib/types/itinerary";

type TransferCardEditorProps = {
  transfer: Transfer;
  onChange: (transfer: Transfer) => void;
  onRemove: (transferId: string) => void;
};

export function TransferCardEditor({
  transfer,
  onChange,
  onRemove,
}: TransferCardEditorProps) {
  return (
    <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-base font-semibold text-slate-950">{transfer.mode}</h4>
          <p className="text-sm text-slate-500">
            {transfer.from} → {transfer.to}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => onRemove(transfer.id)}>
          <Trash2 className="size-4" />
          Remove
        </Button>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="space-y-2">
          <Label>Transport mode</Label>
          <Input value={transfer.mode} onChange={(event) => onChange({ ...transfer, mode: event.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Confirmation</Label>
          <Input
            value={transfer.confirmation}
            onChange={(event) => onChange({ ...transfer, confirmation: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>From</Label>
          <Input value={transfer.from} onChange={(event) => onChange({ ...transfer, from: event.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>To</Label>
          <Input value={transfer.to} onChange={(event) => onChange({ ...transfer, to: event.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Departure</Label>
          <Input
            value={transfer.departureTime}
            onChange={(event) => onChange({ ...transfer, departureTime: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Arrival</Label>
          <Input
            value={transfer.arrivalTime}
            onChange={(event) => onChange({ ...transfer, arrivalTime: event.target.value })}
          />
        </div>
        <div className="space-y-2 xl:col-span-2">
          <Label>Driver / contact</Label>
          <Input
            value={transfer.driverContact}
            onChange={(event) => onChange({ ...transfer, driverContact: event.target.value })}
          />
        </div>
        <div className="space-y-2 xl:col-span-2">
          <Label>Notes</Label>
          <Textarea rows={3} value={transfer.notes} onChange={(event) => onChange({ ...transfer, notes: event.target.value })} />
        </div>
      </div>
    </div>
  );
}
