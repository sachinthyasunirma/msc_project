"use client";

import { Edit3, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Availability } from "@/modules/accommodation/lib/accommodation-api";

type AvailabilityTabProps = {
  loadingDetails: boolean;
  availability: Availability[];
  roomTypesAvailable: boolean;
  isReadOnly: boolean;
  onAddAvailability: () => void;
  onEditAvailability: (row: Availability) => void;
  onDeleteAvailability: (row: Availability) => void;
};

export function AvailabilityTab({
  loadingDetails,
  availability,
  roomTypesAvailable,
  isReadOnly,
  onAddAvailability,
  onEditAvailability,
  onDeleteAvailability,
}: AvailabilityTabProps) {
  return (
    <div className="mt-4 space-y-3">
      <div className="flex justify-end">
        <Button onClick={onAddAvailability} disabled={isReadOnly || !roomTypesAvailable} title={isReadOnly ? "View only mode" : undefined}>
          <Plus className="mr-2 size-4" />
          Add Availability
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Room Type</TableHead>
            <TableHead className="text-right">Available</TableHead>
            <TableHead className="text-right">Booked</TableHead>
            <TableHead>Blocked</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loadingDetails ? (
            <TableRow><TableCell colSpan={6} className="text-center">Loading...</TableCell></TableRow>
          ) : availability.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No availability records.</TableCell></TableRow>
          ) : (
            availability.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.date}</TableCell>
                <TableCell>{item.roomTypeName}</TableCell>
                <TableCell className="text-right">{item.availableRooms}</TableCell>
                <TableCell className="text-right">{item.bookedRooms}</TableCell>
                <TableCell>{item.isBlocked ? "Yes" : "No"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => onEditAvailability(item)}>
                      <Edit3 className="size-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onDeleteAvailability(item)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
