"use client";

import { memo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Availability, Hotel, HotelImage, RoomRate, RoomRateHeader, RoomType } from "@/modules/accommodation/lib/accommodation-api";
import { AvailabilityTab } from "@/modules/accommodation/ui/components/accommodation-manage/availability-tab";
import { ImagesTab } from "@/modules/accommodation/ui/components/accommodation-manage/images-tab";
import { RoomRatesTab } from "@/modules/accommodation/ui/components/accommodation-manage/room-rates-tab";
import { RoomTypesTab } from "@/modules/accommodation/ui/components/accommodation-manage/room-types-tab";

type AccommodationHotelDetailCardProps = {
  selectedHotel: Hotel | null;
  showHotelList: boolean;
  loadingDetails: boolean;
  roomTypes: RoomType[];
  roomRateHeaders: RoomRateHeader[];
  selectedRoomRateHeaderId: string | null;
  availability: Availability[];
  images: HotelImage[];
  isReadOnly: boolean;
  roomTypesAvailable: boolean;
  roomRateLineSearch: string;
  roomRateLineStatusFilter: string;
  roomRateLinePageSize: string;
  roomRateLinePage: number;
  roomRateLineTotalPages: number;
  filteredRoomRatesCount: number;
  statusFilteredRoomRatesCount: number;
  pagedRoomRates: RoomRate[];
  selectedRoomRateHeader: RoomRateHeader | null;
  onSelectRoomRateHeader: (id: string | null) => void;
  onRoomRateLineSearchChange: (value: string) => void;
  onRoomRateLineStatusFilterChange: (value: string) => void;
  onRoomRateLinePageSizeChange: (value: string) => void;
  onRoomRateLinePageChange: (value: number) => void;
  onAddRoomType: () => void;
  onEditRoomType: (row: RoomType) => void;
  onDeleteRoomType: (row: RoomType) => void;
  onAddRoomRateHeader: () => void;
  onOpenRoomRateLines: (header: RoomRateHeader) => void;
  onEditRoomRateHeader: (header: RoomRateHeader) => void;
  onDeleteRoomRateHeader: (header: RoomRateHeader) => void;
  onAddAvailability: () => void;
  onEditAvailability: (row: Availability) => void;
  onDeleteAvailability: (row: Availability) => void;
  onAddImage: () => void;
  onEditImage: (row: HotelImage) => void;
  onDeleteImage: (row: HotelImage) => void;
  onAddRateLine: () => void;
  onEditRateLine: (row: RoomRate) => void;
  onDeleteRateLine: (row: RoomRate) => void;
  onCloseRateLines: () => void;
};

function AccommodationHotelDetailCardComponent({
  selectedHotel,
  showHotelList,
  loadingDetails,
  roomTypes,
  roomRateHeaders,
  selectedRoomRateHeaderId,
  availability,
  images,
  isReadOnly,
  roomTypesAvailable,
  roomRateLineSearch,
  roomRateLineStatusFilter,
  roomRateLinePageSize,
  roomRateLinePage,
  roomRateLineTotalPages,
  filteredRoomRatesCount,
  statusFilteredRoomRatesCount,
  pagedRoomRates,
  selectedRoomRateHeader,
  onSelectRoomRateHeader,
  onRoomRateLineSearchChange,
  onRoomRateLineStatusFilterChange,
  onRoomRateLinePageSizeChange,
  onRoomRateLinePageChange,
  onAddRoomType,
  onEditRoomType,
  onDeleteRoomType,
  onAddRoomRateHeader,
  onOpenRoomRateLines,
  onEditRoomRateHeader,
  onDeleteRoomRateHeader,
  onAddAvailability,
  onEditAvailability,
  onDeleteAvailability,
  onAddImage,
  onEditImage,
  onDeleteImage,
  onAddRateLine,
  onEditRateLine,
  onDeleteRateLine,
  onCloseRateLines,
}: AccommodationHotelDetailCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{selectedHotel ? `Hotel Details: ${selectedHotel.name}` : "Select a hotel"}</CardTitle>
        <div className="flex items-center gap-2">
          {!showHotelList ? (
            <Button variant="outline" size="sm" asChild>
              <Link href="/master-data/accommodations">Back to Hotels</Link>
            </Button>
          ) : null}
          {selectedHotel ? <Badge variant="outline">{`${selectedHotel.city}, ${selectedHotel.country}`}</Badge> : null}
        </div>
      </CardHeader>
      <CardContent>
        {!selectedHotel ? (
          <p className="text-sm text-muted-foreground">Select a hotel to manage related data.</p>
        ) : (
          <Tabs defaultValue="room-types">
            <div className="master-tabs-scroll">
              <TabsList className="master-tabs-list">
                <TabsTrigger value="room-types" className="master-tab-trigger">Room Types</TabsTrigger>
                <TabsTrigger value="room-rates" className="master-tab-trigger">Room Rates</TabsTrigger>
                <TabsTrigger value="availability" className="master-tab-trigger">Availability</TabsTrigger>
                <TabsTrigger value="images" className="master-tab-trigger">Images</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="room-types">
              <RoomTypesTab
                loadingDetails={loadingDetails}
                roomTypes={roomTypes}
                isReadOnly={isReadOnly}
                onAddRoomType={onAddRoomType}
                onEditRoomType={onEditRoomType}
                onDeleteRoomType={onDeleteRoomType}
              />
            </TabsContent>

            <TabsContent value="room-rates">
              <RoomRatesTab
                loadingDetails={loadingDetails}
                roomRateHeaders={roomRateHeaders}
                selectedRoomRateHeaderId={selectedRoomRateHeaderId}
                selectedRoomRateHeader={selectedRoomRateHeader}
                filteredRoomRatesCount={filteredRoomRatesCount}
                statusFilteredRoomRatesCount={statusFilteredRoomRatesCount}
                pagedRoomRates={pagedRoomRates}
                roomRateLineSearch={roomRateLineSearch}
                roomRateLineStatusFilter={roomRateLineStatusFilter}
                roomRateLinePageSize={roomRateLinePageSize}
                roomRateLinePage={roomRateLinePage}
                roomRateLineTotalPages={roomRateLineTotalPages}
                roomTypesAvailable={roomTypesAvailable}
                isReadOnly={isReadOnly}
                onOpenRoomRateLines={onOpenRoomRateLines}
                onAddRoomRateHeader={onAddRoomRateHeader}
                onEditRoomRateHeader={onEditRoomRateHeader}
                onDeleteRoomRateHeader={onDeleteRoomRateHeader}
                onRoomRateLineSearchChange={onRoomRateLineSearchChange}
                onRoomRateLineStatusFilterChange={onRoomRateLineStatusFilterChange}
                onRoomRateLinePageSizeChange={onRoomRateLinePageSizeChange}
                onRoomRateLinePageChange={onRoomRateLinePageChange}
                onAddRateLine={onAddRateLine}
                onEditRateLine={onEditRateLine}
                onDeleteRateLine={onDeleteRateLine}
                onCloseRateLines={onCloseRateLines}
              />
            </TabsContent>

            <TabsContent value="availability">
              <AvailabilityTab
                loadingDetails={loadingDetails}
                availability={availability}
                roomTypesAvailable={roomTypesAvailable}
                isReadOnly={isReadOnly}
                onAddAvailability={onAddAvailability}
                onEditAvailability={onEditAvailability}
                onDeleteAvailability={onDeleteAvailability}
              />
            </TabsContent>

            <TabsContent value="images">
              <ImagesTab
                loadingDetails={loadingDetails}
                images={images}
                isReadOnly={isReadOnly}
                onAddImage={onAddImage}
                onEditImage={onEditImage}
                onDeleteImage={onDeleteImage}
              />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

export const AccommodationHotelDetailCard = memo(AccommodationHotelDetailCardComponent);
