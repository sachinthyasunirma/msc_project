"use client";

import dynamic from "next/dynamic";
import { memo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Availability, Hotel, RoomType } from "@/modules/accommodation/lib/accommodation-api";
import { AvailabilityTab } from "@/modules/accommodation/ui/components/accommodation-manage/availability-tab";
import { RoomTypesTab } from "@/modules/accommodation/ui/components/accommodation-manage/room-types-tab";
import type { HotelContractingBundle } from "@/modules/accommodation/shared/accommodation-contracting-types";
import type { AccommodationHotelDetailTab } from "@/modules/accommodation/shared/accommodation-detail-types";

const lazyTabFallback = (
  <div className="py-8 text-sm text-muted-foreground">Loading tab...</div>
);

const ContractingTab = dynamic(
  () =>
    import("@/modules/accommodation/ui/components/accommodation-manage/contracting-tab").then(
      (module) => module.ContractingTab
    ),
  { loading: () => lazyTabFallback }
);
const ImagesTab = dynamic(
  () =>
    import("@/modules/accommodation/ui/components/accommodation-manage/images-tab").then(
      (module) => module.ImagesTab
    ),
  { loading: () => lazyTabFallback }
);
const AccommodationRoomRatesTab = dynamic(
  () =>
    import("@/modules/accommodation/ui/components/manage-tabs/accommodation-room-rates-tab").then(
      (module) => module.AccommodationRoomRatesTab
    ),
  { loading: () => lazyTabFallback }
);

type AccommodationHotelDetailCardProps = {
  selectedHotel: Hotel | null;
  showHotelList: boolean;
  activeTab: AccommodationHotelDetailTab;
  onActiveTabChange: (tab: AccommodationHotelDetailTab) => void;
  loadingDetails: boolean;
  roomTypes: RoomType[];
  availability: Availability[];
  initialContracting?: HotelContractingBundle | null;
  isReadOnly: boolean;
  onAddRoomType: () => void;
  onOpenRoomTypeBatchUpload: () => void;
  onEditRoomType: (row: RoomType) => void;
  onDeleteRoomType: (row: RoomType) => void;
  onAddAvailability: () => void;
  onEditAvailability: (row: Availability) => void;
  onDeleteAvailability: (row: Availability) => void;
};

function AccommodationHotelDetailCardComponent({
  selectedHotel,
  showHotelList,
  activeTab,
  onActiveTabChange,
  loadingDetails,
  roomTypes,
  availability,
  initialContracting = null,
  isReadOnly,
  onAddRoomType,
  onOpenRoomTypeBatchUpload,
  onEditRoomType,
  onDeleteRoomType,
  onAddAvailability,
  onEditAvailability,
  onDeleteAvailability,
}: AccommodationHotelDetailCardProps) {
  const tabsIdBase = selectedHotel ? `accommodation-hotel-tabs-${selectedHotel.id}` : "accommodation-hotel-tabs";

  const handleTabChange = (value: string) => {
    switch (value) {
      case "room-types":
      case "room-rates":
      case "contracting":
      case "availability":
      case "images":
        onActiveTabChange(value);
        break;
      default:
        onActiveTabChange("room-types");
    }
  };

  const getTabTriggerId = (value: AccommodationHotelDetailTab) => `${tabsIdBase}-trigger-${value}`;
  const getTabContentId = (value: AccommodationHotelDetailTab) => `${tabsIdBase}-content-${value}`;

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
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <div className="master-tabs-scroll">
              <TabsList className="master-tabs-list">
                <TabsTrigger
                  value="room-types"
                  id={getTabTriggerId("room-types")}
                  aria-controls={getTabContentId("room-types")}
                  className="master-tab-trigger"
                >
                  Room Types
                </TabsTrigger>
                <TabsTrigger
                  value="room-rates"
                  id={getTabTriggerId("room-rates")}
                  aria-controls={getTabContentId("room-rates")}
                  className="master-tab-trigger"
                >
                  Room Rates
                </TabsTrigger>
                <TabsTrigger
                  value="contracting"
                  id={getTabTriggerId("contracting")}
                  aria-controls={getTabContentId("contracting")}
                  className="master-tab-trigger"
                >
                  Contracting
                </TabsTrigger>
                <TabsTrigger
                  value="availability"
                  id={getTabTriggerId("availability")}
                  aria-controls={getTabContentId("availability")}
                  className="master-tab-trigger"
                >
                  Availability
                </TabsTrigger>
                <TabsTrigger
                  value="images"
                  id={getTabTriggerId("images")}
                  aria-controls={getTabContentId("images")}
                  className="master-tab-trigger"
                >
                  Images
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent
              value="room-types"
              id={getTabContentId("room-types")}
              aria-labelledby={getTabTriggerId("room-types")}
            >
              <RoomTypesTab
                loadingDetails={loadingDetails}
                roomTypes={roomTypes}
                isReadOnly={isReadOnly}
                onAddRoomType={onAddRoomType}
                onOpenBatchUpload={onOpenRoomTypeBatchUpload}
                onEditRoomType={onEditRoomType}
                onDeleteRoomType={onDeleteRoomType}
              />
            </TabsContent>

            <TabsContent
              value="room-rates"
              id={getTabContentId("room-rates")}
              aria-labelledby={getTabTriggerId("room-rates")}
            >
              <AccommodationRoomRatesTab
                hotelId={selectedHotel.id}
                loadingDetails={loadingDetails}
                initialContracting={initialContracting}
                roomTypes={roomTypes}
                isReadOnly={isReadOnly}
              />
            </TabsContent>

            <TabsContent
              value="availability"
              id={getTabContentId("availability")}
              aria-labelledby={getTabTriggerId("availability")}
            >
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

            <TabsContent
              value="contracting"
              id={getTabContentId("contracting")}
              aria-labelledby={getTabTriggerId("contracting")}
            >
              <ContractingTab
                hotelId={selectedHotel.id}
                loadingDetails={loadingDetails}
                initialContracting={initialContracting}
                roomTypes={roomTypes}
                isReadOnly={isReadOnly}
              />
            </TabsContent>

            <TabsContent
              value="images"
              id={getTabContentId("images")}
              aria-labelledby={getTabTriggerId("images")}
            >
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
