"use client";

import { memo } from "react";
import { Edit3, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { RoomRate, RoomRateHeader } from "@/modules/accommodation/lib/accommodation-api";

type RoomRatesTabProps = {
  loadingDetails: boolean;
  roomRateHeaders: RoomRateHeader[];
  selectedRoomRateHeaderId: string | null;
  selectedRoomRateHeader: RoomRateHeader | null;
  filteredRoomRatesCount: number;
  statusFilteredRoomRatesCount: number;
  pagedRoomRates: RoomRate[];
  roomRateLineSearch: string;
  roomRateLineStatusFilter: string;
  roomRateLinePageSize: string;
  roomRateLinePage: number;
  roomRateLineTotalPages: number;
  roomTypesAvailable: boolean;
  isReadOnly: boolean;
  onOpenRoomRateLines: (header: RoomRateHeader) => void;
  onAddRoomRateHeader: () => void;
  onEditRoomRateHeader: (header: RoomRateHeader) => void;
  onDeleteRoomRateHeader: (header: RoomRateHeader) => void;
  onRoomRateLineSearchChange: (value: string) => void;
  onRoomRateLineStatusFilterChange: (value: string) => void;
  onRoomRateLinePageSizeChange: (value: string) => void;
  onRoomRateLinePageChange: (value: number) => void;
  onAddRateLine: () => void;
  onEditRateLine: (row: RoomRate) => void;
  onDeleteRateLine: (row: RoomRate) => void;
  onCloseRateLines: () => void;
};

function RoomRatesTabComponent({
  loadingDetails,
  roomRateHeaders,
  selectedRoomRateHeaderId,
  selectedRoomRateHeader,
  filteredRoomRatesCount,
  statusFilteredRoomRatesCount,
  pagedRoomRates,
  roomRateLineSearch,
  roomRateLineStatusFilter,
  roomRateLinePageSize,
  roomRateLinePage,
  roomRateLineTotalPages,
  roomTypesAvailable,
  isReadOnly,
  onOpenRoomRateLines,
  onAddRoomRateHeader,
  onEditRoomRateHeader,
  onDeleteRoomRateHeader,
  onRoomRateLineSearchChange,
  onRoomRateLineStatusFilterChange,
  onRoomRateLinePageSizeChange,
  onRoomRateLinePageChange,
  onAddRateLine,
  onEditRateLine,
  onDeleteRateLine,
  onCloseRateLines,
}: RoomRatesTabProps) {
  return (
    <div className="mt-4 space-y-3">
      <div className="flex justify-end gap-2">
        <Button onClick={onAddRoomRateHeader} disabled={isReadOnly} title={isReadOnly ? "View only mode" : undefined}>
          <Plus className="mr-2 size-4" />
          Add Header
        </Button>
      </div>
      <div className="rounded-lg border">
        <div className="border-b px-4 py-2 text-sm font-medium">Room Rate Headers</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Season</TableHead>
              <TableHead>Rate Period</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingDetails ? (
              <TableRow><TableCell colSpan={6} className="text-center">Loading...</TableCell></TableRow>
            ) : roomRateHeaders.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No room rate headers.</TableCell></TableRow>
            ) : (
              roomRateHeaders.map((header) => (
                <TableRow key={header.id} className={selectedRoomRateHeaderId === header.id ? "bg-muted/50" : undefined}>
                  <TableCell>{header.name}</TableCell>
                  <TableCell>{header.seasonName || "-"}</TableCell>
                  <TableCell>{header.validFrom} to {header.validTo}</TableCell>
                  <TableCell>{header.currency}</TableCell>
                  <TableCell>
                    <Badge variant={header.isActive ? "default" : "secondary"}>
                      {header.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => onOpenRoomRateLines(header)}>
                        Add Rates
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onEditRoomRateHeader(header)}>
                        <Edit3 className="size-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onDeleteRoomRateHeader(header)}>
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

      {selectedRoomRateHeader ? (
        <div className="space-y-3 rounded-lg border p-4">
          <div className="grid grid-cols-1 gap-3 rounded-md border p-3 md:grid-cols-4">
            <div className="text-sm"><p className="text-muted-foreground">Season</p><p className="font-medium">{selectedRoomRateHeader.seasonName || "-"}</p></div>
            <div className="text-sm"><p className="text-muted-foreground">Rate Period</p><p className="font-medium">{`${selectedRoomRateHeader.validFrom} to ${selectedRoomRateHeader.validTo}`}</p></div>
            <div className="text-sm"><p className="text-muted-foreground">Currency</p><p className="font-medium">{selectedRoomRateHeader.currency || "-"}</p></div>
            <div className="text-sm"><p className="text-muted-foreground">Lines</p><p className="font-medium">{filteredRoomRatesCount}</p></div>
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <Input
              placeholder="Search by category, room type, basis..."
              value={roomRateLineSearch}
              onChange={(event) => onRoomRateLineSearchChange(event.target.value)}
              className="md:max-w-sm"
            />
            <div className="flex items-center gap-2">
              <Select value={roomRateLineStatusFilter} onValueChange={onRoomRateLineStatusFilterChange}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Select value={roomRateLinePageSize} onValueChange={onRoomRateLinePageSizeChange}>
                <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 / page</SelectItem>
                  <SelectItem value="10">10 / page</SelectItem>
                  <SelectItem value="20">20 / page</SelectItem>
                  <SelectItem value="50">50 / page</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={onAddRateLine} disabled={isReadOnly || !roomTypesAvailable || !selectedRoomRateHeaderId} title={isReadOnly ? "View only mode" : undefined}>
                <Plus className="mr-2 size-4" />
                Add Rate Line
              </Button>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Room Type</TableHead>
                <TableHead>Basis</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingDetails ? (
                <TableRow><TableCell colSpan={6} className="text-center">Loading...</TableCell></TableRow>
              ) : statusFilteredRoomRatesCount === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">{roomRateLineSearch ? "No matching room rate lines." : "No room rate lines for this header."}</TableCell></TableRow>
              ) : (
                pagedRoomRates.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.roomCategory || "-"}</TableCell>
                    <TableCell>{item.roomTypeName}</TableCell>
                    <TableCell>{item.roomBasis || "-"}</TableCell>
                    <TableCell className="text-right">{item.baseRatePerNight} {item.currency}</TableCell>
                    <TableCell>
                      <Badge variant={item.isActive ? "default" : "secondary"}>
                        {item.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => onEditRateLine(item)}>
                          <Edit3 className="size-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => onDeleteRateLine(item)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Page {roomRateLinePage} of {roomRateLineTotalPages} ({statusFilteredRoomRatesCount} records)
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" disabled={roomRateLinePage <= 1} onClick={() => onRoomRateLinePageChange(Math.max(1, roomRateLinePage - 1))}>
                Previous
              </Button>
              <Button variant="outline" disabled={roomRateLinePage >= roomRateLineTotalPages} onClick={() => onRoomRateLinePageChange(Math.min(roomRateLineTotalPages, roomRateLinePage + 1))}>
                Next
              </Button>
              <Button variant="outline" onClick={onCloseRateLines}>Close</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export const RoomRatesTab = memo(RoomRatesTabComponent);
