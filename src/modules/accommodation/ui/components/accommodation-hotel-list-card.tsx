"use client";

import { memo } from "react";
import Link from "next/link";
import { Edit3, Loader2, Plus, RefreshCw, Settings2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Hotel } from "@/modules/accommodation/lib/accommodation-api";

type AccommodationHotelListCardProps = {
  loadingHotels: boolean;
  hotels: Hotel[];
  selectedHotelId: string | null;
  hotelSearch: string;
  hotelFilters: { isActive: string; city: string; country: string };
  pageIndex: number;
  hasNext: boolean;
  nextCursor: string | null;
  isReadOnly: boolean;
  onRefresh: () => void;
  onOpenBatch: () => void;
  onAddHotel: () => void;
  onSearchChange: (value: string) => void;
  onFiltersChange: (next: { isActive: string; city: string; country: string }) => void;
  onSelectHotel: (hotelId: string) => void;
  onManageHotel: (hotelId: string) => void;
  onEditHotel: (hotel: Hotel) => void;
  onDeleteHotel: (hotel: Hotel) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
};

function AccommodationHotelListCardComponent({
  loadingHotels,
  hotels,
  selectedHotelId,
  hotelSearch,
  hotelFilters,
  pageIndex,
  hasNext,
  nextCursor,
  isReadOnly,
  onRefresh,
  onOpenBatch,
  onAddHotel,
  onSearchChange,
  onFiltersChange,
  onSelectHotel,
  onEditHotel,
  onDeleteHotel,
  onPreviousPage,
  onNextPage,
}: AccommodationHotelListCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Accommodation Hotels</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="master-refresh-btn" onClick={onRefresh} disabled={loadingHotels}>
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={onOpenBatch}>
            Batch Upload
          </Button>
          <Button
            onClick={onAddHotel}
            disabled={isReadOnly}
            title={isReadOnly ? "View only mode" : undefined}
            className="master-add-btn"
          >
            <Plus className="mr-2 size-4" />
            Add Record
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Input placeholder="Search hotels..." value={hotelSearch} onChange={(event) => onSearchChange(event.target.value)} />
          <Input
            placeholder="City"
            value={hotelFilters.city}
            onChange={(event) => onFiltersChange({ ...hotelFilters, city: event.target.value })}
          />
          <Input
            placeholder="Country"
            value={hotelFilters.country}
            onChange={(event) => onFiltersChange({ ...hotelFilters, country: event.target.value })}
          />
          <Select
            value={hotelFilters.isActive}
            onValueChange={(value) => onFiltersChange({ ...hotelFilters, isActive: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingHotels ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Loading hotels...
                  </span>
                </TableCell>
              </TableRow>
            ) : hotels.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No hotels found.
                </TableCell>
              </TableRow>
            ) : (
              hotels.map((hotel) => (
                <TableRow
                  key={hotel.id}
                  className={selectedHotelId === hotel.id ? "bg-muted/60" : ""}
                  onClick={() => onSelectHotel(hotel.id)}
                >
                  <TableCell>{hotel.name}</TableCell>
                  <TableCell>{`${hotel.city}, ${hotel.country}`}</TableCell>
                  <TableCell>{hotel.starRating}</TableCell>
                  <TableCell>
                    <Badge variant={hotel.isActive ? "default" : "secondary"}>
                      {hotel.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" className="master-manage-btn" asChild>
                        <Link href={`/master-data/accommodations/${hotel.id}`}>
                          <Settings2 className="mr-1 size-4" />
                          Manage
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(event) => {
                          event.stopPropagation();
                          onEditHotel(hotel);
                        }}
                      >
                        <Edit3 className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDeleteHotel(hotel);
                        }}
                      >
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
          <p className="text-sm text-muted-foreground">
            Page {pageIndex + 1} {hasNext ? "(more)" : ""}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onPreviousPage} disabled={pageIndex === 0}>
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={onNextPage} disabled={!hasNext || !nextCursor}>
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export const AccommodationHotelListCard = memo(AccommodationHotelListCardComponent);
