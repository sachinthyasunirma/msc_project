"use client";

import { memo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Availability, Hotel, RoomType } from "@/modules/accommodation/lib/accommodation-api";
import { AvailabilityTab } from "@/modules/accommodation/ui/components/accommodation-manage/availability-tab";
import { ContractingTab } from "@/modules/accommodation/ui/components/accommodation-manage/contracting-tab";
import { ImagesTab } from "@/modules/accommodation/ui/components/accommodation-manage/images-tab";
import { RoomTypesTab } from "@/modules/accommodation/ui/components/accommodation-manage/room-types-tab";
import type { AccommodationRoomRatesInitialData } from "@/modules/accommodation/shared/accommodation-room-rates.types";
import type { HotelContractingBundle } from "@/modules/accommodation/shared/accommodation-contracting-types";
import { AccommodationRoomRatesTab } from "@/modules/accommodation/ui/components/manage-tabs/accommodation-room-rates-tab";

type AccommodationHotelDetailCardProps = {
  selectedHotel: Hotel | null;
  showHotelList: boolean;
  loadingDetails: boolean;
  roomTypes: RoomType[];
  availability: Availability[];
  contracting: HotelContractingBundle | null;
  isReadOnly: boolean;
  initialRoomRatesData?: AccommodationRoomRatesInitialData | null;
  onAddRoomType: () => void;
  onEditRoomType: (row: RoomType) => void;
  onDeleteRoomType: (row: RoomType) => void;
  onAddAvailability: () => void;
  onEditAvailability: (row: Availability) => void;
  onDeleteAvailability: (row: Availability) => void;
};

function AccommodationHotelDetailCardComponent({
  selectedHotel,
  showHotelList,
  loadingDetails,
  roomTypes,
  availability,
  contracting,
  isReadOnly,
  initialRoomRatesData = null,
  onAddRoomType,
  onEditRoomType,
  onDeleteRoomType,
  onAddAvailability,
  onEditAvailability,
  onDeleteAvailability,
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
                <TabsTrigger value="contracting" className="master-tab-trigger">Contracting</TabsTrigger>
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
              <AccommodationRoomRatesTab
                hotelId={selectedHotel.id}
                isReadOnly={isReadOnly}
                roomTypes={roomTypes}
                roomTypesLoading={loadingDetails && roomTypes.length === 0}
                initialData={initialRoomRatesData}
              />
            </TabsContent>

            <TabsContent value="availability">
              <AvailabilityTab
                loadingDetails={loadingDetails}
                availability={availability}
                roomTypesAvailable={roomTypes.length > 0}
                isReadOnly={isReadOnly}
                onAddAvailability={onAddAvailability}
                onEditAvailability={onEditAvailability}
                onDeleteAvailability={onDeleteAvailability}
              />
            </TabsContent>

            <TabsContent value="contracting">
              <ContractingTab
                hotelId={selectedHotel.id}
                loadingDetails={loadingDetails}
                contracting={contracting}
                roomTypes={roomTypes}
                isReadOnly={isReadOnly}
              />
            </TabsContent>

            <TabsContent value="images">
              <ImagesTab
                hotelId={selectedHotel.id}
                isReadOnly={isReadOnly}
              />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

export const AccommodationHotelDetailCard = memo(AccommodationHotelDetailCardComponent);
