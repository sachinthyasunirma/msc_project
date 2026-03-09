"use client";

import { Edit3, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { RoomType } from "@/modules/accommodation/lib/accommodation-api";

type RoomTypesTabProps = {
  loadingDetails: boolean;
  roomTypes: RoomType[];
  isReadOnly: boolean;
  onAddRoomType: () => void;
  onEditRoomType: (row: RoomType) => void;
  onDeleteRoomType: (row: RoomType) => void;
};

export function RoomTypesTab({
  loadingDetails,
  roomTypes,
  isReadOnly,
  onAddRoomType,
  onEditRoomType,
  onDeleteRoomType,
}: RoomTypesTabProps) {
  return (
    <div className="mt-4 space-y-3">
      <div className="flex justify-end">
        <Button onClick={onAddRoomType} disabled={isReadOnly} title={isReadOnly ? "View only mode" : undefined}>
          <Plus className="mr-2 size-4" />
          Add Room Type
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Bed Type</TableHead>
            <TableHead className="text-right">Occupancy</TableHead>
            <TableHead className="text-right">Rooms</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loadingDetails ? (
            <TableRow><TableCell colSpan={6} className="text-center">Loading...</TableCell></TableRow>
          ) : roomTypes.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No room types.</TableCell></TableRow>
          ) : (
            roomTypes.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.bedType}</TableCell>
                <TableCell className="text-right">{item.maxOccupancy}</TableCell>
                <TableCell className="text-right">{`${item.availableRooms}/${item.totalRooms}`}</TableCell>
                <TableCell>
                  <Badge variant={item.isActive ? "default" : "secondary"}>
                    {item.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => onEditRoomType(item)}>
                      <Edit3 className="size-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onDeleteRoomType(item)}>
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
