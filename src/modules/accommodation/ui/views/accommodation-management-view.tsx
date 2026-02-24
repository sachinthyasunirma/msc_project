"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Edit3, ImageIcon, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Availability,
  createAvailability,
  createHotel,
  createHotelImage,
  createRoomRate,
  createRoomType,
  deleteAvailability,
  deleteHotel,
  deleteHotelImage,
  deleteRoomRate,
  deleteRoomType,
  getHotel,
  Hotel,
  HotelImage,
  listAvailability,
  listHotelImages,
  listHotels,
  listRoomRates,
  listRoomTypes,
  RoomRate,
  RoomType,
  updateAvailability,
  updateHotel,
  updateHotelImage,
  updateRoomRate,
  updateRoomType,
} from "@/modules/accommodation/lib/accommodation-api";
import {
  createSeason,
  deleteSeason,
  listSeasons,
  SeasonOption,
  updateSeason,
} from "@/modules/season/lib/season-api";
import {
  createAvailabilitySchema,
  createHotelImageSchema,
  createHotelSchema,
  createRoomRateSchema,
  createRoomTypeSchema,
} from "@/modules/accommodation/shared/accommodation-schemas";
import { createSeasonSchema } from "@/modules/season/shared/season-schemas";

type DialogMode = "create" | "edit";

type Props = {
  hotelId?: string;
  showHotelList?: boolean;
};

export const AccommodationManagementView = ({
  hotelId,
  showHotelList = true,
}: Props) => {
  const [loadingHotels, setLoadingHotels] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hotelSearch, setHotelSearch] = useState("");
  const [debouncedHotelSearch, setDebouncedHotelSearch] = useState("");
  const [hotelFilters, setHotelFilters] = useState({
    isActive: "all",
    city: "",
    country: "",
  });
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([null]);
  const [pageIndex, setPageIndex] = useState(0);
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(hotelId ?? null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [roomRates, setRoomRates] = useState<RoomRate[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [images, setImages] = useState<HotelImage[]>([]);
  const [seasons, setSeasons] = useState<SeasonOption[]>([]);

  const [hotelDialog, setHotelDialog] = useState<{
    open: boolean;
    mode: DialogMode;
    row: Hotel | null;
  }>({ open: false, mode: "create", row: null });
  const [roomTypeDialog, setRoomTypeDialog] = useState<{
    open: boolean;
    mode: DialogMode;
    row: RoomType | null;
  }>({ open: false, mode: "create", row: null });
  const [roomRateDialog, setRoomRateDialog] = useState<{
    open: boolean;
    mode: DialogMode;
    row: RoomRate | null;
  }>({ open: false, mode: "create", row: null });
  const [availabilityDialog, setAvailabilityDialog] = useState<{
    open: boolean;
    mode: DialogMode;
    row: Availability | null;
  }>({ open: false, mode: "create", row: null });
  const [imageDialog, setImageDialog] = useState<{
    open: boolean;
    mode: DialogMode;
    row: HotelImage | null;
  }>({ open: false, mode: "create", row: null });
  const [seasonDialog, setSeasonDialog] = useState<{
    open: boolean;
    mode: DialogMode;
    row: SeasonOption | null;
  }>({ open: false, mode: "create", row: null });

  const [hotelForm, setHotelForm] = useState({
    name: "",
    description: "",
    address: "",
    city: "",
    country: "",
    starRating: 3,
    contactEmail: "",
    contactPhone: "",
    isActive: true,
  });
  const [roomTypeForm, setRoomTypeForm] = useState({
    name: "",
    description: "",
    maxOccupancy: 2,
    bedType: "",
    size: "",
    amenitiesRaw: "",
    totalRooms: 10,
    availableRooms: 10,
    isActive: true,
  });
  const [roomRateForm, setRoomRateForm] = useState({
    roomTypeId: "",
    seasonId: "",
    baseRatePerNight: 0,
    seasonMultiplier: 1,
    currency: "USD",
    isActive: true,
    validFrom: "",
    validTo: "",
  });
  const [availabilityForm, setAvailabilityForm] = useState({
    roomTypeId: "",
    date: "",
    availableRooms: 0,
    bookedRooms: 0,
    isBlocked: false,
    blockReason: "",
  });
  const [imageForm, setImageForm] = useState({
    imageUrl: "",
    caption: "",
    isPrimary: false,
    order: 0,
  });
  const [seasonForm, setSeasonForm] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
  });

  const selectedHotel = useMemo(
    () => hotels.find((item) => item.id === selectedHotelId) || null,
    [hotels, selectedHotelId]
  );

  const loadHotels = useCallback(async () => {
    setLoadingHotels(true);
    try {
      if (!showHotelList && hotelId) {
        const hotel = await getHotel(hotelId);
        setHotels([hotel]);
        setSelectedHotelId(hotel.id);
        setHasNext(false);
        setNextCursor(null);
        return;
      }

      const params = new URLSearchParams();
      params.set("limit", "15");
      if (debouncedHotelSearch) params.set("q", debouncedHotelSearch);
      if (hotelFilters.isActive !== "all") params.set("isActive", hotelFilters.isActive);
      if (hotelFilters.city) params.set("city", hotelFilters.city);
      if (hotelFilters.country) params.set("country", hotelFilters.country);
      const activeCursor = cursorHistory[pageIndex];
      if (activeCursor) params.set("cursor", activeCursor);

      const result = await listHotels(params);
      setHotels(result.items);
      setHasNext(result.hasNext);
      setNextCursor(result.nextCursor);
      if (!selectedHotelId && result.items.length > 0) {
        setSelectedHotelId(result.items[0].id);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load hotels.");
    } finally {
      setLoadingHotels(false);
    }
  }, [
    cursorHistory,
    debouncedHotelSearch,
    hotelId,
    hotelFilters.city,
    hotelFilters.country,
    hotelFilters.isActive,
    pageIndex,
    selectedHotelId,
    showHotelList,
  ]);

  const loadDetails = useCallback(async () => {
    if (!selectedHotelId) {
      setRoomTypes([]);
      setRoomRates([]);
      setAvailability([]);
      setImages([]);
      return;
    }

    setLoadingDetails(true);
    try {
      const [rt, rr, av, im, ss] = await Promise.all([
        listRoomTypes(selectedHotelId),
        listRoomRates(selectedHotelId),
        listAvailability(selectedHotelId),
        listHotelImages(selectedHotelId),
        listSeasons({ limit: 200 }),
      ]);
      setRoomTypes(rt);
      setRoomRates(rr);
      setAvailability(av);
      setImages(im);
      setSeasons(ss.items);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load hotel details.");
    } finally {
      setLoadingDetails(false);
    }
  }, [selectedHotelId]);

  useEffect(() => {
    if (!showHotelList) return;
    const timer = setTimeout(() => setDebouncedHotelSearch(hotelSearch), 300);
    return () => clearTimeout(timer);
  }, [hotelSearch, showHotelList]);

  useEffect(() => {
    if (!showHotelList) return;
    setCursorHistory([null]);
    setPageIndex(0);
  }, [
    debouncedHotelSearch,
    hotelFilters.city,
    hotelFilters.country,
    hotelFilters.isActive,
    showHotelList,
  ]);

  useEffect(() => {
    void loadHotels();
  }, [loadHotels]);

  useEffect(() => {
    void loadDetails();
  }, [loadDetails]);

  const openHotelDialog = (mode: DialogMode, row: Hotel | null = null) => {
    setHotelDialog({ open: true, mode, row });
    setHotelForm({
      name: row?.name ?? "",
      description: row?.description ?? "",
      address: row?.address ?? "",
      city: row?.city ?? "",
      country: row?.country ?? "",
      starRating: row?.starRating ?? 3,
      contactEmail: row?.contactEmail ?? "",
      contactPhone: row?.contactPhone ?? "",
      isActive: row?.isActive ?? true,
    });
  };

  const openRoomTypeDialog = (mode: DialogMode, row: RoomType | null = null) => {
    setRoomTypeDialog({ open: true, mode, row });
    setRoomTypeForm({
      name: row?.name ?? "",
      description: row?.description ?? "",
      maxOccupancy: row?.maxOccupancy ?? 2,
      bedType: row?.bedType ?? "",
      size: row?.size ?? "",
      amenitiesRaw: row?.amenities?.join(", ") ?? "",
      totalRooms: row?.totalRooms ?? 10,
      availableRooms: row?.availableRooms ?? 10,
      isActive: row?.isActive ?? true,
    });
  };

  const openRoomRateDialog = (mode: DialogMode, row: RoomRate | null = null) => {
    setRoomRateDialog({ open: true, mode, row });
    setRoomRateForm({
      roomTypeId: row?.roomTypeId ?? roomTypes[0]?.id ?? "",
      seasonId: row?.seasonId ?? "",
      baseRatePerNight: row ? Number(row.baseRatePerNight) : 0,
      seasonMultiplier: row ? Number(row.seasonMultiplier) : 1,
      currency: row?.currency ?? "USD",
      isActive: row?.isActive ?? true,
      validFrom: row?.validFrom ?? "",
      validTo: row?.validTo ?? "",
    });
  };

  const openAvailabilityDialog = (mode: DialogMode, row: Availability | null = null) => {
    setAvailabilityDialog({ open: true, mode, row });
    setAvailabilityForm({
      roomTypeId: row?.roomTypeId ?? roomTypes[0]?.id ?? "",
      date: row?.date ?? "",
      availableRooms: row?.availableRooms ?? 0,
      bookedRooms: row?.bookedRooms ?? 0,
      isBlocked: row?.isBlocked ?? false,
      blockReason: row?.blockReason ?? "",
    });
  };

  const openImageDialog = (mode: DialogMode, row: HotelImage | null = null) => {
    setImageDialog({ open: true, mode, row });
    setImageForm({
      imageUrl: row?.imageUrl ?? "",
      caption: row?.caption ?? "",
      isPrimary: row?.isPrimary ?? false,
      order: row?.order ?? 0,
    });
  };

  const openSeasonDialog = (mode: DialogMode, row: SeasonOption | null = null) => {
    setSeasonDialog({ open: true, mode, row });
    setSeasonForm({
      name: row?.name ?? "",
      description: row?.description ?? "",
      startDate: row?.startDate ?? "",
      endDate: row?.endDate ?? "",
    });
  };

  const withSave = async (callback: () => Promise<void>) => {
    try {
      setSaving(true);
      await callback();
    } finally {
      setSaving(false);
    }
  };

  const submitHotel = async () => {
    const parsed = createHotelSchema.safeParse({
      ...hotelForm,
      description: hotelForm.description || null,
      contactEmail: hotelForm.contactEmail || null,
      contactPhone: hotelForm.contactPhone || null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Invalid hotel data.");
      return;
    }
    await withSave(async () => {
      if (hotelDialog.mode === "create") {
        await createHotel(parsed.data);
        toast.success("Hotel created.");
      } else if (hotelDialog.row) {
        await updateHotel(hotelDialog.row.id, parsed.data);
        toast.success("Hotel updated.");
      }
      setHotelDialog({ open: false, mode: "create", row: null });
      await loadHotels();
    });
  };

  const submitRoomType = async () => {
    if (!selectedHotelId) return;
    const parsed = createRoomTypeSchema.safeParse({
      ...roomTypeForm,
      description: roomTypeForm.description || null,
      size: roomTypeForm.size || null,
      amenities: roomTypeForm.amenitiesRaw
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Invalid room type data.");
      return;
    }
    await withSave(async () => {
      if (roomTypeDialog.mode === "create") {
        await createRoomType(selectedHotelId, parsed.data);
        toast.success("Room type created.");
      } else if (roomTypeDialog.row) {
        await updateRoomType(selectedHotelId, roomTypeDialog.row.id, parsed.data);
        toast.success("Room type updated.");
      }
      setRoomTypeDialog({ open: false, mode: "create", row: null });
      await loadDetails();
    });
  };

  const submitRoomRate = async () => {
    if (!selectedHotelId) return;
    const parsed = createRoomRateSchema.safeParse({
      ...roomRateForm,
      seasonId: roomRateForm.seasonId || null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Invalid room rate data.");
      return;
    }
    await withSave(async () => {
      if (roomRateDialog.mode === "create") {
        await createRoomRate(selectedHotelId, parsed.data);
        toast.success("Room rate created.");
      } else if (roomRateDialog.row) {
        await updateRoomRate(selectedHotelId, roomRateDialog.row.id, parsed.data);
        toast.success("Room rate updated.");
      }
      setRoomRateDialog({ open: false, mode: "create", row: null });
      await loadDetails();
    });
  };

  const submitAvailability = async () => {
    if (!selectedHotelId) return;
    const parsed = createAvailabilitySchema.safeParse({
      ...availabilityForm,
      blockReason: availabilityForm.blockReason || null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Invalid availability data.");
      return;
    }
    await withSave(async () => {
      if (availabilityDialog.mode === "create") {
        await createAvailability(selectedHotelId, parsed.data);
        toast.success("Availability created.");
      } else if (availabilityDialog.row) {
        await updateAvailability(selectedHotelId, availabilityDialog.row.id, parsed.data);
        toast.success("Availability updated.");
      }
      setAvailabilityDialog({ open: false, mode: "create", row: null });
      await loadDetails();
    });
  };

  const submitImage = async () => {
    if (!selectedHotelId) return;
    const parsed = createHotelImageSchema.safeParse({
      ...imageForm,
      caption: imageForm.caption || null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Invalid image data.");
      return;
    }
    await withSave(async () => {
      if (imageDialog.mode === "create") {
        await createHotelImage(selectedHotelId, parsed.data);
        toast.success("Image created.");
      } else if (imageDialog.row) {
        await updateHotelImage(selectedHotelId, imageDialog.row.id, parsed.data);
        toast.success("Image updated.");
      }
      setImageDialog({ open: false, mode: "create", row: null });
      await loadDetails();
    });
  };

  const submitSeason = async () => {
    const parsed = createSeasonSchema.safeParse({
      ...seasonForm,
      description: seasonForm.description || null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Invalid season data.");
      return;
    }

    await withSave(async () => {
      if (seasonDialog.mode === "create") {
        await createSeason(parsed.data);
        toast.success("Season created.");
      } else if (seasonDialog.row) {
        await updateSeason(seasonDialog.row.id, parsed.data);
        toast.success("Season updated.");
      }
      setSeasonDialog({ open: false, mode: "create", row: null });
      const refreshed = await listSeasons({ limit: 200 });
      setSeasons(refreshed.items);
    });
  };

  const onDelete = async (message: string, callback: () => Promise<void>) => {
    if (!window.confirm(message)) return;
    await withSave(async () => {
      await callback();
      await loadDetails();
      await loadHotels();
    });
  };

  const nextPage = () => {
    if (!nextCursor) return;
    setCursorHistory((prev) => [...prev.slice(0, pageIndex + 1), nextCursor]);
    setPageIndex((prev) => prev + 1);
  };

  const previousPage = () => {
    if (pageIndex === 0) return;
    setPageIndex((prev) => prev - 1);
  };

  return (
    <div className="space-y-6">
      {showHotelList ? (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Accommodation Hotels</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => void loadHotels()} disabled={loadingHotels}>
              <RefreshCw className="mr-2 size-4" />
              Refresh
            </Button>
            <Button onClick={() => openHotelDialog("create")}>
              <Plus className="mr-2 size-4" />
              Add Hotel
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Input
              placeholder="Search hotels..."
              value={hotelSearch}
              onChange={(event) => setHotelSearch(event.target.value)}
            />
            <Input
              placeholder="City"
              value={hotelFilters.city}
              onChange={(event) =>
                setHotelFilters((prev) => ({ ...prev, city: event.target.value }))
              }
            />
            <Input
              placeholder="Country"
              value={hotelFilters.country}
              onChange={(event) =>
                setHotelFilters((prev) => ({ ...prev, country: event.target.value }))
              }
            />
            <Select
              value={hotelFilters.isActive}
              onValueChange={(value) =>
                setHotelFilters((prev) => ({ ...prev, isActive: value }))
              }
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
                    onClick={() => setSelectedHotelId(hotel.id)}
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
                        <Button size="sm" asChild>
                          <Link href={`/master-data/accommodations/${hotel.id}`}>
                            Manage
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(event) => {
                            event.stopPropagation();
                            openHotelDialog("edit", hotel);
                          }}
                        >
                          <Edit3 className="size-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(event) => {
                            event.stopPropagation();
                            void onDelete("Delete this hotel?", async () => {
                              await deleteHotel(hotel.id);
                              toast.success("Hotel deleted.");
                            });
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
              <Button variant="outline" size="sm" onClick={previousPage} disabled={pageIndex === 0}>
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={nextPage} disabled={!hasNext || !nextCursor}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      ) : null}

      {!showHotelList ? (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {selectedHotel ? `Hotel Details: ${selectedHotel.name}` : "Select a hotel"}
          </CardTitle>
          <div className="flex items-center gap-2">
            {!showHotelList ? (
              <Button variant="outline" size="sm" asChild>
                <Link href="/master-data/accommodations">Back to Hotels</Link>
              </Button>
            ) : null}
            {selectedHotel ? (
              <Badge variant="outline">{`${selectedHotel.city}, ${selectedHotel.country}`}</Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {!selectedHotel ? (
            <p className="text-sm text-muted-foreground">Select a hotel to manage related data.</p>
          ) : (
            <Tabs defaultValue="room-types">
              <TabsList>
                <TabsTrigger value="room-types">Room Types</TabsTrigger>
                <TabsTrigger value="room-rates">Room Rates</TabsTrigger>
                <TabsTrigger value="availability">Availability</TabsTrigger>
                <TabsTrigger value="images">Images</TabsTrigger>
              </TabsList>

              <TabsContent value="room-types" className="mt-4 space-y-3">
                <div className="flex justify-end">
                  <Button onClick={() => openRoomTypeDialog("create")}>
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
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : roomTypes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No room types.
                        </TableCell>
                      </TableRow>
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
                              <Button size="sm" variant="outline" onClick={() => openRoomTypeDialog("edit", item)}>
                                <Edit3 className="size-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  void onDelete("Delete room type?", async () => {
                                    await deleteRoomType(selectedHotel.id, item.id);
                                    toast.success("Room type deleted.");
                                  })
                                }
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
              </TabsContent>

              <TabsContent value="room-rates" className="mt-4 space-y-3">
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => openSeasonDialog("create")}>
                    Manage Seasons
                  </Button>
                  <Button onClick={() => openRoomRateDialog("create")} disabled={roomTypes.length === 0}>
                    <Plus className="mr-2 size-4" />
                    Add Room Rate
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Room Type</TableHead>
                      <TableHead>Season</TableHead>
                      <TableHead className="text-right">Base</TableHead>
                      <TableHead className="text-right">Multiplier</TableHead>
                      <TableHead className="text-right">Final</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingDetails ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : roomRates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No room rates.
                        </TableCell>
                      </TableRow>
                    ) : (
                      roomRates.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.roomTypeName}</TableCell>
                          <TableCell>{item.seasonName || "-"}</TableCell>
                          <TableCell className="text-right">{item.baseRatePerNight}</TableCell>
                          <TableCell className="text-right">{item.seasonMultiplier}</TableCell>
                          <TableCell className="text-right">{item.finalRatePerNight}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => openRoomRateDialog("edit", item)}>
                                <Edit3 className="size-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  void onDelete("Delete room rate?", async () => {
                                    await deleteRoomRate(selectedHotel.id, item.id);
                                    toast.success("Room rate deleted.");
                                  })
                                }
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
              </TabsContent>

              <TabsContent value="availability" className="mt-4 space-y-3">
                <div className="flex justify-end">
                  <Button onClick={() => openAvailabilityDialog("create")} disabled={roomTypes.length === 0}>
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
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : availability.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No availability records.
                        </TableCell>
                      </TableRow>
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
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openAvailabilityDialog("edit", item)}
                              >
                                <Edit3 className="size-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  void onDelete("Delete availability record?", async () => {
                                    await deleteAvailability(selectedHotel.id, item.id);
                                    toast.success("Availability deleted.");
                                  })
                                }
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
              </TabsContent>

              <TabsContent value="images" className="mt-4 space-y-3">
                <div className="flex justify-end">
                  <Button onClick={() => openImageDialog("create")}>
                    <Plus className="mr-2 size-4" />
                    Add Image
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Preview</TableHead>
                      <TableHead>Caption</TableHead>
                      <TableHead>Primary</TableHead>
                      <TableHead className="text-right">Order</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingDetails ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : images.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No images.
                        </TableCell>
                      </TableRow>
                    ) : (
                      images.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <a href={item.imageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-primary">
                              <ImageIcon className="size-4" />
                              Open
                            </a>
                          </TableCell>
                          <TableCell>{item.caption || "-"}</TableCell>
                          <TableCell>{item.isPrimary ? "Yes" : "No"}</TableCell>
                          <TableCell className="text-right">{item.order}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => openImageDialog("edit", item)}>
                                <Edit3 className="size-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  void onDelete("Delete image?", async () => {
                                    await deleteHotelImage(selectedHotel.id, item.id);
                                    toast.success("Image deleted.");
                                  })
                                }
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
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
      ) : null}

      <Dialog open={hotelDialog.open} onOpenChange={(open) => setHotelDialog((prev) => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{hotelDialog.mode === "create" ? "Add Hotel" : "Edit Hotel"}</DialogTitle>
            <DialogDescription>Hotel (accommodation) details.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2"><Label>Name</Label><Input value={hotelForm.name} onChange={(e)=>setHotelForm({...hotelForm,name:e.target.value})} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Description</Label><Input value={hotelForm.description} onChange={(e)=>setHotelForm({...hotelForm,description:e.target.value})} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Address</Label><Input value={hotelForm.address} onChange={(e)=>setHotelForm({...hotelForm,address:e.target.value})} /></div>
            <div className="space-y-2"><Label>City</Label><Input value={hotelForm.city} onChange={(e)=>setHotelForm({...hotelForm,city:e.target.value})} /></div>
            <div className="space-y-2"><Label>Country</Label><Input value={hotelForm.country} onChange={(e)=>setHotelForm({...hotelForm,country:e.target.value})} /></div>
            <div className="space-y-2"><Label>Star Rating</Label><Input type="number" min={1} max={5} value={hotelForm.starRating} onChange={(e)=>setHotelForm({...hotelForm,starRating:Number(e.target.value)})} /></div>
            <div className="space-y-2"><Label>Contact Email</Label><Input value={hotelForm.contactEmail} onChange={(e)=>setHotelForm({...hotelForm,contactEmail:e.target.value})} /></div>
            <div className="space-y-2"><Label>Contact Phone</Label><Input value={hotelForm.contactPhone} onChange={(e)=>setHotelForm({...hotelForm,contactPhone:e.target.value})} /></div>
            <div className="flex items-center justify-between rounded-md border p-3"><Label>Active</Label><Switch checked={hotelForm.isActive} onCheckedChange={(checked)=>setHotelForm({...hotelForm,isActive:checked})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setHotelDialog({open:false,mode:"create",row:null})}>Cancel</Button>
            <Button disabled={saving} onClick={() => void submitHotel()}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={roomTypeDialog.open} onOpenChange={(open)=>setRoomTypeDialog((prev)=>({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>{roomTypeDialog.mode === "create" ? "Add Room Type" : "Edit Room Type"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2"><Label>Name</Label><Input value={roomTypeForm.name} onChange={(e)=>setRoomTypeForm({...roomTypeForm,name:e.target.value})} /></div>
            <div className="space-y-2"><Label>Bed Type</Label><Input value={roomTypeForm.bedType} onChange={(e)=>setRoomTypeForm({...roomTypeForm,bedType:e.target.value})} /></div>
            <div className="space-y-2"><Label>Max Occupancy</Label><Input type="number" min={1} value={roomTypeForm.maxOccupancy} onChange={(e)=>setRoomTypeForm({...roomTypeForm,maxOccupancy:Number(e.target.value)})} /></div>
            <div className="space-y-2"><Label>Size</Label><Input value={roomTypeForm.size} onChange={(e)=>setRoomTypeForm({...roomTypeForm,size:e.target.value})} /></div>
            <div className="space-y-2"><Label>Total Rooms</Label><Input type="number" min={1} value={roomTypeForm.totalRooms} onChange={(e)=>setRoomTypeForm({...roomTypeForm,totalRooms:Number(e.target.value)})} /></div>
            <div className="space-y-2"><Label>Available Rooms</Label><Input type="number" min={0} value={roomTypeForm.availableRooms} onChange={(e)=>setRoomTypeForm({...roomTypeForm,availableRooms:Number(e.target.value)})} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Amenities (comma separated)</Label><Input value={roomTypeForm.amenitiesRaw} onChange={(e)=>setRoomTypeForm({...roomTypeForm,amenitiesRaw:e.target.value})} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Description</Label><Input value={roomTypeForm.description} onChange={(e)=>setRoomTypeForm({...roomTypeForm,description:e.target.value})} /></div>
            <div className="flex items-center justify-between rounded-md border p-3 md:col-span-2"><Label>Active</Label><Switch checked={roomTypeForm.isActive} onCheckedChange={(checked)=>setRoomTypeForm({...roomTypeForm,isActive:checked})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setRoomTypeDialog({open:false,mode:"create",row:null})}>Cancel</Button>
            <Button disabled={saving} onClick={() => void submitRoomType()}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={roomRateDialog.open} onOpenChange={(open)=>setRoomRateDialog((prev)=>({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>{roomRateDialog.mode === "create" ? "Add Room Rate" : "Edit Room Rate"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Room Type</Label>
              <Select value={roomRateForm.roomTypeId} onValueChange={(value)=>setRoomRateForm({...roomRateForm,roomTypeId:value})}>
                <SelectTrigger><SelectValue placeholder="Select room type" /></SelectTrigger>
                <SelectContent>{roomTypes.map((item)=><SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Season (Optional)</Label>
              <Select value={roomRateForm.seasonId || "__none__"} onValueChange={(value)=>setRoomRateForm({...roomRateForm,seasonId:value==="__none__"?"":value})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No Season</SelectItem>
                  {seasons.map((season)=><SelectItem key={season.id} value={season.id}>{season.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Base Rate</Label><Input type="number" min={0} step="0.01" value={roomRateForm.baseRatePerNight} onChange={(e)=>setRoomRateForm({...roomRateForm,baseRatePerNight:Number(e.target.value)})} /></div>
            <div className="space-y-2"><Label>Season Multiplier</Label><Input type="number" min={0} step="0.01" value={roomRateForm.seasonMultiplier} onChange={(e)=>setRoomRateForm({...roomRateForm,seasonMultiplier:Number(e.target.value)})} /></div>
            <div className="space-y-2"><Label>Currency</Label><Input value={roomRateForm.currency} maxLength={3} onChange={(e)=>setRoomRateForm({...roomRateForm,currency:e.target.value.toUpperCase()})} /></div>
            <div className="space-y-2"><Label>Valid From</Label><Input type="date" value={roomRateForm.validFrom} onChange={(e)=>setRoomRateForm({...roomRateForm,validFrom:e.target.value})} /></div>
            <div className="space-y-2"><Label>Valid To</Label><Input type="date" value={roomRateForm.validTo} onChange={(e)=>setRoomRateForm({...roomRateForm,validTo:e.target.value})} /></div>
            <div className="flex items-center justify-between rounded-md border p-3"><Label>Active</Label><Switch checked={roomRateForm.isActive} onCheckedChange={(checked)=>setRoomRateForm({...roomRateForm,isActive:checked})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setRoomRateDialog({open:false,mode:"create",row:null})}>Cancel</Button>
            <Button disabled={saving} onClick={() => void submitRoomRate()}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={availabilityDialog.open} onOpenChange={(open)=>setAvailabilityDialog((prev)=>({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>{availabilityDialog.mode === "create" ? "Add Availability" : "Edit Availability"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Room Type</Label>
              <Select value={availabilityForm.roomTypeId} onValueChange={(value)=>setAvailabilityForm({...availabilityForm,roomTypeId:value})}>
                <SelectTrigger><SelectValue placeholder="Select room type" /></SelectTrigger>
                <SelectContent>{roomTypes.map((item)=><SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Date</Label><Input type="date" value={availabilityForm.date} onChange={(e)=>setAvailabilityForm({...availabilityForm,date:e.target.value})} /></div>
            <div className="space-y-2"><Label>Available Rooms</Label><Input type="number" min={0} value={availabilityForm.availableRooms} onChange={(e)=>setAvailabilityForm({...availabilityForm,availableRooms:Number(e.target.value)})} /></div>
            <div className="space-y-2"><Label>Booked Rooms</Label><Input type="number" min={0} value={availabilityForm.bookedRooms} onChange={(e)=>setAvailabilityForm({...availabilityForm,bookedRooms:Number(e.target.value)})} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Block Reason</Label><Input value={availabilityForm.blockReason} onChange={(e)=>setAvailabilityForm({...availabilityForm,blockReason:e.target.value})} /></div>
            <div className="flex items-center justify-between rounded-md border p-3 md:col-span-2"><Label>Blocked</Label><Switch checked={availabilityForm.isBlocked} onCheckedChange={(checked)=>setAvailabilityForm({...availabilityForm,isBlocked:checked})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setAvailabilityDialog({open:false,mode:"create",row:null})}>Cancel</Button>
            <Button disabled={saving} onClick={() => void submitAvailability()}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={imageDialog.open} onOpenChange={(open)=>setImageDialog((prev)=>({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>{imageDialog.mode === "create" ? "Add Image" : "Edit Image"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-2"><Label>Image URL</Label><Input value={imageForm.imageUrl} onChange={(e)=>setImageForm({...imageForm,imageUrl:e.target.value})} /></div>
            <div className="space-y-2"><Label>Caption</Label><Input value={imageForm.caption} onChange={(e)=>setImageForm({...imageForm,caption:e.target.value})} /></div>
            <div className="space-y-2"><Label>Order</Label><Input type="number" min={0} value={imageForm.order} onChange={(e)=>setImageForm({...imageForm,order:Number(e.target.value)})} /></div>
            <div className="flex items-center justify-between rounded-md border p-3"><Label>Primary Image</Label><Switch checked={imageForm.isPrimary} onCheckedChange={(checked)=>setImageForm({...imageForm,isPrimary:checked})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setImageDialog({open:false,mode:"create",row:null})}>Cancel</Button>
            <Button disabled={saving} onClick={() => void submitImage()}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={seasonDialog.open} onOpenChange={(open)=>setSeasonDialog((prev)=>({ ...prev, open }))}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{seasonDialog.mode === "create" ? "Add Season" : "Edit Season"}</DialogTitle>
            <DialogDescription>These seasons are used in the Room Rate season dropdown.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2"><Label>Name</Label><Input value={seasonForm.name} onChange={(e)=>setSeasonForm({...seasonForm,name:e.target.value})} /></div>
            <div className="space-y-2"><Label>Description</Label><Input value={seasonForm.description} onChange={(e)=>setSeasonForm({...seasonForm,description:e.target.value})} /></div>
            <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={seasonForm.startDate} onChange={(e)=>setSeasonForm({...seasonForm,startDate:e.target.value})} /></div>
            <div className="space-y-2"><Label>End Date</Label><Input type="date" value={seasonForm.endDate} onChange={(e)=>setSeasonForm({...seasonForm,endDate:e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setSeasonDialog({open:false,mode:"create",row:null})}>Cancel</Button>
            <Button disabled={saving} onClick={() => void submitSeason()}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Range</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {seasons.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No seasons found.
                    </TableCell>
                  </TableRow>
                ) : (
                  seasons.map((season) => (
                    <TableRow key={season.id}>
                      <TableCell>{season.name}</TableCell>
                      <TableCell>{season.startDate} to {season.endDate}</TableCell>
                      <TableCell>{season.description || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => openSeasonDialog("edit", season)}>
                            <Edit3 className="size-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              void onDelete(
                                "Delete this season? Linked room rates may be deleted due cascade.",
                                async () => {
                                  await deleteSeason(season.id);
                                  toast.success("Season deleted.");
                                  const refreshed = await listSeasons({ limit: 200 });
                                  setSeasons(refreshed.items);
                                }
                              )
                            }
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
