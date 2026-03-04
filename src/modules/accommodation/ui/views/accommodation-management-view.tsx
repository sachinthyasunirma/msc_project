"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Edit3, ImageIcon, Loader2, Plus, RefreshCw, Settings2, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/app-confirm-provider";
import { hotelImportConfig } from "@/components/batch-import/master-batch-import-config";
import { MasterBatchImportDialog } from "@/components/batch-import/master-batch-import-dialog";
import { RecordAuditMeta } from "@/components/ui/record-audit-meta";
import { notify } from "@/lib/notify";
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
  createRoomRateHeader,
  createRoomRate,
  createRoomType,
  deleteAvailability,
  deleteHotel,
  deleteHotelImage,
  deleteRoomRateHeader,
  deleteRoomRate,
  deleteRoomType,
  getHotel,
  Hotel,
  HotelImage,
  listAvailability,
  listHotelImages,
  listHotels,
  listRoomRateHeaders,
  listRoomRates,
  listRoomTypes,
  RoomRateHeader,
  RoomRate,
  RoomType,
  updateAvailability,
  updateHotel,
  updateHotelImage,
  updateRoomRateHeader,
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
  createRoomRateHeaderSchema,
  createRoomRateSchema,
  createRoomTypeSchema,
} from "@/modules/accommodation/shared/accommodation-schemas";
import { createSeasonSchema } from "@/modules/season/shared/season-schemas";
import { authClient } from "@/lib/auth-client";

type DialogMode = "create" | "edit";

type Props = {
  hotelId?: string;
  showHotelList?: boolean;
};

export const AccommodationManagementView = ({
  hotelId,
  showHotelList = true,
}: Props) => {
  const confirm = useConfirm();
  const { data: session } = authClient.useSession();
  const accessUser = session?.user as
    | { readOnly?: boolean; role?: string | null; canWriteMasterData?: boolean }
    | undefined;
  const canWrite =
    Boolean(accessUser) &&
    !Boolean(accessUser?.readOnly) &&
    (accessUser?.role === "ADMIN" ||
      accessUser?.role === "MANAGER" ||
      Boolean(accessUser?.canWriteMasterData));
  const isReadOnly = !canWrite;
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
  const [roomRateHeaders, setRoomRateHeaders] = useState<RoomRateHeader[]>([]);
  const [selectedRoomRateHeaderId, setSelectedRoomRateHeaderId] = useState<string | null>(null);
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
  const [roomRateHeaderDialog, setRoomRateHeaderDialog] = useState<{
    open: boolean;
    mode: DialogMode;
    row: RoomRateHeader | null;
  }>({ open: false, mode: "create", row: null });
  const [roomRateLinesDialog, setRoomRateLinesDialog] = useState<{
    open: boolean;
    headerId: string | null;
  }>({ open: false, headerId: null });
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
  const [batchOpen, setBatchOpen] = useState(false);

  const [hotelForm, setHotelForm] = useState({
    code: "",
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
    code: "",
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
    code: "",
    roomRateHeaderId: "",
    roomTypeId: "",
    roomCategory: "Standard",
    roomBasis: "HB",
    baseRatePerNight: 0,
    isActive: true,
  });
  const [roomRateHeaderForm, setRoomRateHeaderForm] = useState({
    code: "",
    name: "",
    seasonId: "",
    currency: "USD",
    validFrom: "",
    validTo: "",
    isActive: true,
  });
  const [availabilityForm, setAvailabilityForm] = useState({
    code: "",
    roomTypeId: "",
    date: "",
    availableRooms: 0,
    bookedRooms: 0,
    isBlocked: false,
    blockReason: "",
  });
  const [imageForm, setImageForm] = useState({
    code: "",
    imageUrl: "",
    caption: "",
    isPrimary: false,
    order: 0,
  });
  const [seasonForm, setSeasonForm] = useState({
    code: "",
    name: "",
    description: "",
    startDate: "",
    endDate: "",
  });
  const [roomRateLineSearch, setRoomRateLineSearch] = useState("");
  const [roomRateLineStatusFilter, setRoomRateLineStatusFilter] = useState("all");
  const [roomRateLinePageSize, setRoomRateLinePageSize] = useState("10");
  const [roomRateLinePage, setRoomRateLinePage] = useState(1);

  const hotelExistingCodes = useMemo(() => {
    return new Set(
      hotels
        .map((hotel) => String(hotel.code ?? "").trim().toUpperCase())
        .filter((value) => value.length > 0)
    );
  }, [hotels]);

  const selectedHotel = useMemo(
    () => hotels.find((item) => item.id === selectedHotelId) || null,
    [hotels, selectedHotelId]
  );
  const activeRoomRateHeaderId = roomRateLinesDialog.headerId ?? selectedRoomRateHeaderId;
  const filteredRoomRates = useMemo(
    () =>
      activeRoomRateHeaderId
        ? roomRates.filter((item) => item.roomRateHeaderId === activeRoomRateHeaderId)
        : roomRates,
    [roomRates, activeRoomRateHeaderId]
  );
  const visibleRoomRates = useMemo(() => {
    if (!roomRateLineSearch.trim()) return filteredRoomRates;
    const term = roomRateLineSearch.toLowerCase();
    return filteredRoomRates.filter((item) =>
      [item.roomCategory, item.roomTypeName, item.roomBasis, item.baseRatePerNight, item.currency]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [filteredRoomRates, roomRateLineSearch]);
  const statusFilteredRoomRates = useMemo(
    () =>
      roomRateLineStatusFilter === "all"
        ? visibleRoomRates
        : visibleRoomRates.filter((item) =>
            roomRateLineStatusFilter === "active" ? item.isActive : !item.isActive
          ),
    [visibleRoomRates, roomRateLineStatusFilter]
  );
  const roomRateLineTotalPages = Math.max(
    1,
    Math.ceil(statusFilteredRoomRates.length / Number(roomRateLinePageSize))
  );
  const pagedRoomRates = useMemo(() => {
    const pageSize = Number(roomRateLinePageSize);
    const start = (roomRateLinePage - 1) * pageSize;
    return statusFilteredRoomRates.slice(start, start + pageSize);
  }, [statusFilteredRoomRates, roomRateLinePageSize, roomRateLinePage]);
  const selectedRoomRateHeader = useMemo(
    () => roomRateHeaders.find((item) => item.id === activeRoomRateHeaderId) || null,
    [roomRateHeaders, activeRoomRateHeaderId]
  );

  const loadSeasonsForRoomRates = useCallback(async () => {
    const refreshed = await listSeasons({ limit: 100 });
    setSeasons(refreshed.items);
  }, []);

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
      notify.error(error instanceof Error ? error.message : "Failed to load hotels.");
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
      setRoomRateHeaders([]);
      setRoomRates([]);
      setAvailability([]);
      setImages([]);
      setSelectedRoomRateHeaderId(null);
      return;
    }

    setLoadingDetails(true);
    try {
      const [rt, rh, rr, av, im, ss] = await Promise.allSettled([
        listRoomTypes(selectedHotelId),
        listRoomRateHeaders(selectedHotelId),
        listRoomRates(selectedHotelId),
        listAvailability(selectedHotelId),
        listHotelImages(selectedHotelId),
        listSeasons({ limit: 100 }),
      ]);

      if (rt.status === "fulfilled") {
        setRoomTypes(rt.value);
      } else {
        setRoomTypes([]);
        notify.error("Failed to load room types.");
      }

      if (rh.status === "fulfilled") {
        setRoomRateHeaders(rh.value);
        setSelectedRoomRateHeaderId((prev) =>
          prev && rh.value.some((item) => item.id === prev) ? prev : (rh.value[0]?.id ?? null)
        );
      } else {
        setRoomRateHeaders([]);
        setSelectedRoomRateHeaderId(null);
      }

      if (rr.status === "fulfilled") {
        setRoomRates(rr.value);
      } else {
        setRoomRates([]);
      }

      if (av.status === "fulfilled") {
        setAvailability(av.value);
      } else {
        setAvailability([]);
      }

      if (im.status === "fulfilled") {
        setImages(im.value);
      } else {
        setImages([]);
      }

      if (ss.status === "fulfilled") {
        setSeasons(ss.value.items);
      } else {
        setSeasons([]);
      }
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

  useEffect(() => {
    setRoomRateLinePage(1);
  }, [roomRateLineSearch, roomRateLineStatusFilter, roomRateLinePageSize, activeRoomRateHeaderId]);

  useEffect(() => {
    if (roomRateLinePage > roomRateLineTotalPages) {
      setRoomRateLinePage(roomRateLineTotalPages);
    }
  }, [roomRateLinePage, roomRateLineTotalPages]);

  const openHotelDialog = (mode: DialogMode, row: Hotel | null = null) => {
    if (mode === "create" && isReadOnly) {
      notify.warning("View only mode: adding records is disabled.");
      return;
    }
    setHotelDialog({ open: true, mode, row });
    setHotelForm({
      code: row?.code ?? "",
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
    if (mode === "create" && isReadOnly) {
      notify.warning("View only mode: adding records is disabled.");
      return;
    }
    setRoomTypeDialog({ open: true, mode, row });
    setRoomTypeForm({
      code: row?.code ?? "",
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
    if (mode === "create" && isReadOnly) {
      notify.warning("View only mode: adding records is disabled.");
      return;
    }
    setRoomRateDialog({ open: true, mode, row });
    setRoomRateForm({
      code: row?.code ?? "",
      roomRateHeaderId: row?.roomRateHeaderId ?? activeRoomRateHeaderId ?? "",
      roomTypeId: row?.roomTypeId ?? roomTypes[0]?.id ?? "",
      roomCategory: row?.roomCategory ?? "Standard",
      roomBasis: row?.roomBasis ?? "HB",
      baseRatePerNight: row ? Number(row.baseRatePerNight) : 0,
      isActive: row?.isActive ?? true,
    });
  };

  const openRoomRateHeaderDialog = async (
    mode: DialogMode,
    row: RoomRateHeader | null = null
  ) => {
    if (mode === "create" && isReadOnly) {
      notify.warning("View only mode: adding records is disabled.");
      return;
    }
    try {
      await loadSeasonsForRoomRates();
    } catch {
      notify.error("Failed to load seasons from master data.");
    }
    setRoomRateHeaderDialog({ open: true, mode, row });
    setRoomRateHeaderForm({
      code: row?.code ?? "",
      name: row?.name ?? "",
      seasonId: row?.seasonId ?? "",
      currency: row?.currency ?? "USD",
      validFrom: row?.validFrom ?? "",
      validTo: row?.validTo ?? "",
      isActive: row?.isActive ?? true,
    });
  };

  const openRoomRateLinesDialog = (header: RoomRateHeader) => {
    setSelectedRoomRateHeaderId(header.id);
    setRoomRateLineSearch("");
    setRoomRateLineStatusFilter("all");
    setRoomRateLinePageSize("10");
    setRoomRateLinePage(1);
    setRoomRateLinesDialog({ open: true, headerId: header.id });
  };

  const openAvailabilityDialog = (mode: DialogMode, row: Availability | null = null) => {
    if (mode === "create" && isReadOnly) {
      notify.warning("View only mode: adding records is disabled.");
      return;
    }
    setAvailabilityDialog({ open: true, mode, row });
    setAvailabilityForm({
      code: row?.code ?? "",
      roomTypeId: row?.roomTypeId ?? roomTypes[0]?.id ?? "",
      date: row?.date ?? "",
      availableRooms: row?.availableRooms ?? 0,
      bookedRooms: row?.bookedRooms ?? 0,
      isBlocked: row?.isBlocked ?? false,
      blockReason: row?.blockReason ?? "",
    });
  };

  const openImageDialog = (mode: DialogMode, row: HotelImage | null = null) => {
    if (mode === "create" && isReadOnly) {
      notify.warning("View only mode: adding records is disabled.");
      return;
    }
    setImageDialog({ open: true, mode, row });
    setImageForm({
      code: row?.code ?? "",
      imageUrl: row?.imageUrl ?? "",
      caption: row?.caption ?? "",
      isPrimary: row?.isPrimary ?? false,
      order: row?.order ?? 0,
    });
  };

  const openSeasonDialog = (mode: DialogMode, row: SeasonOption | null = null) => {
    if (mode === "create" && isReadOnly) {
      notify.warning("View only mode: adding records is disabled.");
      return;
    }
    setSeasonDialog({ open: true, mode, row });
    setSeasonForm({
      code: row?.code ?? "",
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
    if (hotelDialog.mode === "create" && isReadOnly) {
      notify.warning("View only mode: adding records is disabled.");
      return;
    }
    const parsed = createHotelSchema.safeParse({
      ...hotelForm,
      description: hotelForm.description || null,
      contactEmail: hotelForm.contactEmail || null,
      contactPhone: hotelForm.contactPhone || null,
    });
    if (!parsed.success) {
      notify.error(parsed.error.issues[0]?.message || "Invalid hotel data.");
      return;
    }
    await withSave(async () => {
      if (hotelDialog.mode === "create") {
        await createHotel(parsed.data);
        notify.success("Hotel created.");
      } else if (hotelDialog.row) {
        await updateHotel(hotelDialog.row.id, parsed.data);
        notify.success("Hotel updated.");
      }
      setHotelDialog({ open: false, mode: "create", row: null });
      await loadHotels();
    });
  };

  const submitRoomType = async () => {
    if (!selectedHotelId) return;
    if (roomTypeDialog.mode === "create" && isReadOnly) {
      notify.warning("View only mode: adding records is disabled.");
      return;
    }
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
      notify.error(parsed.error.issues[0]?.message || "Invalid room type data.");
      return;
    }
    await withSave(async () => {
      if (roomTypeDialog.mode === "create") {
        await createRoomType(selectedHotelId, parsed.data);
        notify.success("Room type created.");
      } else if (roomTypeDialog.row) {
        await updateRoomType(selectedHotelId, roomTypeDialog.row.id, parsed.data);
        notify.success("Room type updated.");
      }
      setRoomTypeDialog({ open: false, mode: "create", row: null });
      await loadDetails();
    });
  };

  const submitRoomRate = async () => {
    if (!selectedHotelId) return;
    if (roomRateDialog.mode === "create" && isReadOnly) {
      notify.warning("View only mode: adding records is disabled.");
      return;
    }
    const parsed = createRoomRateSchema.safeParse(roomRateForm);
    if (!parsed.success) {
      notify.error(parsed.error.issues[0]?.message || "Invalid room rate data.");
      return;
    }
    await withSave(async () => {
      if (roomRateDialog.mode === "create") {
        await createRoomRate(selectedHotelId, parsed.data);
        notify.success("Room rate created.");
      } else if (roomRateDialog.row) {
        await updateRoomRate(selectedHotelId, roomRateDialog.row.id, parsed.data);
        notify.success("Room rate updated.");
      }
      setRoomRateDialog({ open: false, mode: "create", row: null });
      await loadDetails();
    });
  };

  const submitRoomRateHeader = async () => {
    if (!selectedHotelId) return;
    if (roomRateHeaderDialog.mode === "create" && isReadOnly) {
      notify.warning("View only mode: adding records is disabled.");
      return;
    }
    const parsed = createRoomRateHeaderSchema.safeParse({
      ...roomRateHeaderForm,
      seasonId: roomRateHeaderForm.seasonId || null,
    });
    if (!parsed.success) {
      notify.error(parsed.error.issues[0]?.message || "Invalid room rate header data.");
      return;
    }
    await withSave(async () => {
      if (roomRateHeaderDialog.mode === "create") {
        const created = await createRoomRateHeader(selectedHotelId, parsed.data);
        setSelectedRoomRateHeaderId(created.id);
        notify.success("Room rate header created.");
      } else if (roomRateHeaderDialog.row) {
        await updateRoomRateHeader(selectedHotelId, roomRateHeaderDialog.row.id, parsed.data);
        notify.success("Room rate header updated.");
      }
      setRoomRateHeaderDialog({ open: false, mode: "create", row: null });
      await loadDetails();
    });
  };

  const submitAvailability = async () => {
    if (!selectedHotelId) return;
    if (availabilityDialog.mode === "create" && isReadOnly) {
      notify.warning("View only mode: adding records is disabled.");
      return;
    }
    const parsed = createAvailabilitySchema.safeParse({
      ...availabilityForm,
      blockReason: availabilityForm.blockReason || null,
    });
    if (!parsed.success) {
      notify.error(parsed.error.issues[0]?.message || "Invalid availability data.");
      return;
    }
    await withSave(async () => {
      if (availabilityDialog.mode === "create") {
        await createAvailability(selectedHotelId, parsed.data);
        notify.success("Availability created.");
      } else if (availabilityDialog.row) {
        await updateAvailability(selectedHotelId, availabilityDialog.row.id, parsed.data);
        notify.success("Availability updated.");
      }
      setAvailabilityDialog({ open: false, mode: "create", row: null });
      await loadDetails();
    });
  };

  const submitImage = async () => {
    if (!selectedHotelId) return;
    if (imageDialog.mode === "create" && isReadOnly) {
      notify.warning("View only mode: adding records is disabled.");
      return;
    }
    const parsed = createHotelImageSchema.safeParse({
      ...imageForm,
      caption: imageForm.caption || null,
    });
    if (!parsed.success) {
      notify.error(parsed.error.issues[0]?.message || "Invalid image data.");
      return;
    }
    await withSave(async () => {
      if (imageDialog.mode === "create") {
        await createHotelImage(selectedHotelId, parsed.data);
        notify.success("Image created.");
      } else if (imageDialog.row) {
        await updateHotelImage(selectedHotelId, imageDialog.row.id, parsed.data);
        notify.success("Image updated.");
      }
      setImageDialog({ open: false, mode: "create", row: null });
      await loadDetails();
    });
  };

  const submitSeason = async () => {
    if (seasonDialog.mode === "create" && isReadOnly) {
      notify.warning("View only mode: adding records is disabled.");
      return;
    }
    const parsed = createSeasonSchema.safeParse({
      ...seasonForm,
      description: seasonForm.description || null,
    });
    if (!parsed.success) {
      notify.error(parsed.error.issues[0]?.message || "Invalid season data.");
      return;
    }

    await withSave(async () => {
      if (seasonDialog.mode === "create") {
        await createSeason(parsed.data);
        notify.success("Season created.");
      } else if (seasonDialog.row) {
        await updateSeason(seasonDialog.row.id, parsed.data);
        notify.success("Season updated.");
      }
      setSeasonDialog({ open: false, mode: "create", row: null });
      const refreshed = await listSeasons({ limit: 100 });
      setSeasons(refreshed.items);
    });
  };

  const onDelete = async (message: string, callback: () => Promise<void>) => {
    const confirmed = await confirm({
      title: "Delete Record",
      description: `${message} This action cannot be undone.`,
      confirmText: "Yes",
      cancelText: "No",
      destructive: true,
    });
    if (!confirmed) return;
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

  const refreshHotelExistingCodes = async () => {
    const codes = new Set<string>();
    let cursor: string | null = null;
    let keepLoading = true;
    let pageSafety = 0;

    while (keepLoading && pageSafety < 100) {
      const params = new URLSearchParams();
      params.set("limit", "100");
      if (cursor) params.set("cursor", cursor);
      const response = await listHotels(params);
      response.items.forEach((hotel) => {
        const code = String(hotel.code ?? "").trim().toUpperCase();
        if (code) codes.add(code);
      });
      keepLoading = response.hasNext && Boolean(response.nextCursor);
      cursor = response.nextCursor;
      pageSafety += 1;
    }

    return codes;
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
            <Button variant="outline" onClick={() => setBatchOpen(true)}>
              Batch Upload
            </Button>
            <Button
              onClick={() => openHotelDialog("create")}
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
                        <Button
                          size="sm"
                          variant="outline"
                          className="master-manage-btn"
                          asChild
                        >
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
                              notify.success("Hotel deleted.");
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
              <div className="master-tabs-scroll">
                <TabsList className="master-tabs-list">
                  <TabsTrigger value="room-types" className="master-tab-trigger">Room Types</TabsTrigger>
                  <TabsTrigger value="room-rates" className="master-tab-trigger">Room Rates</TabsTrigger>
                  <TabsTrigger value="availability" className="master-tab-trigger">Availability</TabsTrigger>
                  <TabsTrigger value="images" className="master-tab-trigger">Images</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="room-types" className="mt-4 space-y-3">
                <div className="flex justify-end">
                  <Button
                    onClick={() => openRoomTypeDialog("create")}
                    disabled={isReadOnly}
                    title={isReadOnly ? "View only mode" : undefined}
                  >
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
                                    notify.success("Room type deleted.");
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
                  <Button
                    onClick={() => void openRoomRateHeaderDialog("create")}
                    disabled={isReadOnly}
                    title={isReadOnly ? "View only mode" : undefined}
                  >
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
                        <TableRow>
                          <TableCell colSpan={6} className="text-center">
                            Loading...
                          </TableCell>
                        </TableRow>
                      ) : roomRateHeaders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            No room rate headers.
                          </TableCell>
                        </TableRow>
                      ) : (
                        roomRateHeaders.map((header) => (
                          <TableRow
                            key={header.id}
                            className={
                              selectedRoomRateHeaderId === header.id ? "bg-muted/50" : undefined
                            }
                          >
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
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openRoomRateLinesDialog(header)}
                                >
                                  Add Rates
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => void openRoomRateHeaderDialog("edit", header)}
                                >
                                  <Edit3 className="size-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    void onDelete("Delete room rate header and linked lines?", async () => {
                                      await deleteRoomRateHeader(selectedHotel.id, header.id);
                                      if (selectedRoomRateHeaderId === header.id) {
                                        setSelectedRoomRateHeaderId(null);
                                        setRoomRateLinesDialog({ open: false, headerId: null });
                                      }
                                      notify.success("Room rate header deleted.");
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
                </div>
              </TabsContent>

              <TabsContent value="availability" className="mt-4 space-y-3">
                <div className="flex justify-end">
                  <Button
                    onClick={() => openAvailabilityDialog("create")}
                    disabled={isReadOnly || roomTypes.length === 0}
                    title={isReadOnly ? "View only mode" : undefined}
                  >
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
                                    notify.success("Availability deleted.");
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
                  <Button
                    onClick={() => openImageDialog("create")}
                    disabled={isReadOnly}
                    title={isReadOnly ? "View only mode" : undefined}
                  >
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
                                    notify.success("Image deleted.");
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
            <div className="space-y-2"><Label>Code</Label><Input value={hotelForm.code} onChange={(e)=>setHotelForm({...hotelForm,code:e.target.value.toUpperCase()})} /></div>
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
            <RecordAuditMeta row={hotelDialog.row} className="mr-auto" />
            <Button variant="outline" onClick={()=>setHotelDialog({open:false,mode:"create",row:null})}>Cancel</Button>
            <Button
              disabled={saving || (isReadOnly && hotelDialog.mode === "create")}
              onClick={() => void submitHotel()}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={roomTypeDialog.open} onOpenChange={(open)=>setRoomTypeDialog((prev)=>({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>{roomTypeDialog.mode === "create" ? "Add Room Type" : "Edit Room Type"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2"><Label>Code</Label><Input value={roomTypeForm.code} onChange={(e)=>setRoomTypeForm({...roomTypeForm,code:e.target.value.toUpperCase()})} /></div>
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
            <RecordAuditMeta row={roomTypeDialog.row} className="mr-auto" />
            <Button variant="outline" onClick={()=>setRoomTypeDialog({open:false,mode:"create",row:null})}>Cancel</Button>
            <Button
              disabled={saving || (isReadOnly && roomTypeDialog.mode === "create")}
              onClick={() => void submitRoomType()}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={roomRateHeaderDialog.open}
        onOpenChange={(open) => setRoomRateHeaderDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {roomRateHeaderDialog.mode === "create"
                ? "Add Room Rate Header"
                : "Edit Room Rate Header"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input
                value={roomRateHeaderForm.code}
                onChange={(e) =>
                  setRoomRateHeaderForm({ ...roomRateHeaderForm, code: e.target.value.toUpperCase() })
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Header Name</Label>
              <Input
                value={roomRateHeaderForm.name}
                onChange={(e) =>
                  setRoomRateHeaderForm({ ...roomRateHeaderForm, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Season (Optional)</Label>
              <Select
                value={roomRateHeaderForm.seasonId || "__none__"}
                onValueChange={(value) =>
                  setRoomRateHeaderForm({
                    ...roomRateHeaderForm,
                    seasonId: value === "__none__" ? "" : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No Season</SelectItem>
                  {seasons.map((season) => (
                    <SelectItem key={season.id} value={season.id}>
                      {season.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input
                value={roomRateHeaderForm.currency}
                maxLength={3}
                onChange={(e) =>
                  setRoomRateHeaderForm({
                    ...roomRateHeaderForm,
                    currency: e.target.value.toUpperCase(),
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Valid From</Label>
              <Input
                type="date"
                value={roomRateHeaderForm.validFrom}
                onChange={(e) =>
                  setRoomRateHeaderForm({
                    ...roomRateHeaderForm,
                    validFrom: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Valid To</Label>
              <Input
                type="date"
                value={roomRateHeaderForm.validTo}
                onChange={(e) =>
                  setRoomRateHeaderForm({ ...roomRateHeaderForm, validTo: e.target.value })
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3 md:col-span-2">
              <Label>Active</Label>
              <Switch
                checked={roomRateHeaderForm.isActive}
                onCheckedChange={(checked) =>
                  setRoomRateHeaderForm({ ...roomRateHeaderForm, isActive: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <RecordAuditMeta row={roomRateHeaderDialog.row} className="mr-auto" />
            <Button
              variant="outline"
              onClick={() => setRoomRateHeaderDialog({ open: false, mode: "create", row: null })}
            >
              Cancel
            </Button>
            <Button
              disabled={saving || (isReadOnly && roomRateHeaderDialog.mode === "create")}
              onClick={() => void submitRoomRateHeader()}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={roomRateLinesDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setRoomRateLineSearch("");
            setRoomRateLineStatusFilter("all");
            setRoomRateLinePageSize("10");
            setRoomRateLinePage(1);
          }
          setRoomRateLinesDialog((prev) => (open ? { ...prev, open } : { open: false, headerId: null }));
        }}
      >
        <DialogContent className="w-[96vw] max-w-[96vw] sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>
              Room Rate Lines{selectedRoomRateHeader ? ` - ${selectedRoomRateHeader.name}` : ""}
            </DialogTitle>
            <DialogDescription>
              Header details: Season {selectedRoomRateHeader?.seasonName || "-"} | Period{" "}
              {selectedRoomRateHeader
                ? `${selectedRoomRateHeader.validFrom} to ${selectedRoomRateHeader.validTo}`
                : "-"}{" "}
              | Currency {selectedRoomRateHeader?.currency || "-"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 rounded-md border p-3 md:grid-cols-4">
            <div className="text-sm">
              <p className="text-muted-foreground">Season</p>
              <p className="font-medium">{selectedRoomRateHeader?.seasonName || "-"}</p>
            </div>
            <div className="text-sm">
              <p className="text-muted-foreground">Rate Period</p>
              <p className="font-medium">
                {selectedRoomRateHeader
                  ? `${selectedRoomRateHeader.validFrom} to ${selectedRoomRateHeader.validTo}`
                  : "-"}
              </p>
            </div>
            <div className="text-sm">
              <p className="text-muted-foreground">Currency</p>
              <p className="font-medium">{selectedRoomRateHeader?.currency || "-"}</p>
            </div>
            <div className="text-sm">
              <p className="text-muted-foreground">Lines</p>
              <p className="font-medium">{filteredRoomRates.length}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <Input
              placeholder="Search by category, room type, basis..."
              value={roomRateLineSearch}
              onChange={(e) => setRoomRateLineSearch(e.target.value)}
              className="md:max-w-sm"
            />
            <div className="flex items-center gap-2">
              <Select value={roomRateLineStatusFilter} onValueChange={setRoomRateLineStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Select value={roomRateLinePageSize} onValueChange={setRoomRateLinePageSize}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 / page</SelectItem>
                  <SelectItem value="10">10 / page</SelectItem>
                  <SelectItem value="20">20 / page</SelectItem>
                  <SelectItem value="50">50 / page</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => openRoomRateDialog("create")}
                disabled={isReadOnly || roomTypes.length === 0 || !selectedRoomRateHeaderId}
                title={isReadOnly ? "View only mode" : undefined}
              >
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
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : statusFilteredRoomRates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    {roomRateLineSearch
                      ? "No matching room rate lines."
                      : "No room rate lines for this header."}
                  </TableCell>
                </TableRow>
              ) : (
                pagedRoomRates.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.roomCategory || "-"}</TableCell>
                    <TableCell>{item.roomTypeName}</TableCell>
                    <TableCell>{item.roomBasis || "-"}</TableCell>
                    <TableCell className="text-right">
                      {item.baseRatePerNight} {item.currency}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.isActive ? "default" : "secondary"}>
                        {item.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openRoomRateDialog("edit", item)}>
                          <Edit3 className="size-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            void onDelete("Delete room rate line?", async () => {
                              if (!selectedHotelId) return;
                              await deleteRoomRate(selectedHotelId, item.id);
                              notify.success("Room rate line deleted.");
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
          <DialogFooter>
            <div className="mr-auto text-sm text-muted-foreground">
              Page {roomRateLinePage} of {roomRateLineTotalPages} ({statusFilteredRoomRates.length} records)
            </div>
            <Button
              variant="outline"
              disabled={roomRateLinePage <= 1}
              onClick={() => setRoomRateLinePage((prev) => Math.max(1, prev - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={roomRateLinePage >= roomRateLineTotalPages}
              onClick={() =>
                setRoomRateLinePage((prev) => Math.min(roomRateLineTotalPages, prev + 1))
              }
            >
              Next
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setRoomRateLineSearch("");
                setRoomRateLineStatusFilter("all");
                setRoomRateLinePageSize("10");
                setRoomRateLinePage(1);
                setRoomRateLinesDialog({ open: false, headerId: null });
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={roomRateDialog.open} onOpenChange={(open)=>setRoomRateDialog((prev)=>({ ...prev, open }))}>
        <DialogContent className="w-[96vw] max-w-[96vw] sm:max-w-5xl">
          <DialogHeader><DialogTitle>{roomRateDialog.mode === "create" ? "Add Room Rate" : "Edit Room Rate"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input value={roomRateForm.code} onChange={(e)=>setRoomRateForm({...roomRateForm,code:e.target.value.toUpperCase()})} />
            </div>
            <div className="space-y-2">
              <Label>Room Rate Header</Label>
              <Select
                value={roomRateForm.roomRateHeaderId}
                onValueChange={(value) => setRoomRateForm({ ...roomRateForm, roomRateHeaderId: value })}
              >
                <SelectTrigger><SelectValue placeholder="Select header" /></SelectTrigger>
                <SelectContent>
                  {roomRateHeaders.map((item)=><SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Room Type</Label>
              <Select value={roomRateForm.roomTypeId} onValueChange={(value)=>setRoomRateForm({...roomRateForm,roomTypeId:value})}>
                <SelectTrigger><SelectValue placeholder="Select room type" /></SelectTrigger>
                <SelectContent>{roomTypes.map((item)=><SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Room Category</Label>
              <Input value={roomRateForm.roomCategory} onChange={(e)=>setRoomRateForm({...roomRateForm,roomCategory:e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Room Basis</Label>
              <Input value={roomRateForm.roomBasis} onChange={(e)=>setRoomRateForm({...roomRateForm,roomBasis:e.target.value.toUpperCase()})} />
            </div>
            <div className="space-y-2"><Label>Base Rate</Label><Input type="number" min={0} step="0.01" value={roomRateForm.baseRatePerNight} onChange={(e)=>setRoomRateForm({...roomRateForm,baseRatePerNight:Number(e.target.value)})} /></div>
            <div className="flex items-center justify-between rounded-md border p-3"><Label>Active</Label><Switch checked={roomRateForm.isActive} onCheckedChange={(checked)=>setRoomRateForm({...roomRateForm,isActive:checked})} /></div>
          </div>
          <DialogFooter>
            <RecordAuditMeta row={roomRateDialog.row} className="mr-auto" />
            <Button variant="outline" onClick={()=>setRoomRateDialog({open:false,mode:"create",row:null})}>Cancel</Button>
            <Button
              disabled={saving || (isReadOnly && roomRateDialog.mode === "create")}
              onClick={() => void submitRoomRate()}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={availabilityDialog.open} onOpenChange={(open)=>setAvailabilityDialog((prev)=>({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>{availabilityDialog.mode === "create" ? "Add Availability" : "Edit Availability"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2"><Label>Code</Label><Input value={availabilityForm.code} onChange={(e)=>setAvailabilityForm({...availabilityForm,code:e.target.value.toUpperCase()})} /></div>
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
            <RecordAuditMeta row={availabilityDialog.row} className="mr-auto" />
            <Button variant="outline" onClick={()=>setAvailabilityDialog({open:false,mode:"create",row:null})}>Cancel</Button>
            <Button
              disabled={saving || (isReadOnly && availabilityDialog.mode === "create")}
              onClick={() => void submitAvailability()}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={imageDialog.open} onOpenChange={(open)=>setImageDialog((prev)=>({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>{imageDialog.mode === "create" ? "Add Image" : "Edit Image"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-2"><Label>Code</Label><Input value={imageForm.code} onChange={(e)=>setImageForm({...imageForm,code:e.target.value.toUpperCase()})} /></div>
            <div className="space-y-2"><Label>Image URL</Label><Input value={imageForm.imageUrl} onChange={(e)=>setImageForm({...imageForm,imageUrl:e.target.value})} /></div>
            <div className="space-y-2"><Label>Caption</Label><Input value={imageForm.caption} onChange={(e)=>setImageForm({...imageForm,caption:e.target.value})} /></div>
            <div className="space-y-2"><Label>Order</Label><Input type="number" min={0} value={imageForm.order} onChange={(e)=>setImageForm({...imageForm,order:Number(e.target.value)})} /></div>
            <div className="flex items-center justify-between rounded-md border p-3"><Label>Primary Image</Label><Switch checked={imageForm.isPrimary} onCheckedChange={(checked)=>setImageForm({...imageForm,isPrimary:checked})} /></div>
          </div>
          <DialogFooter>
            <RecordAuditMeta row={imageDialog.row} className="mr-auto" />
            <Button variant="outline" onClick={()=>setImageDialog({open:false,mode:"create",row:null})}>Cancel</Button>
            <Button
              disabled={saving || (isReadOnly && imageDialog.mode === "create")}
              onClick={() => void submitImage()}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
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
            <div className="space-y-2"><Label>Code</Label><Input value={seasonForm.code} onChange={(e)=>setSeasonForm({...seasonForm,code:e.target.value.toUpperCase()})} /></div>
            <div className="space-y-2"><Label>Name</Label><Input value={seasonForm.name} onChange={(e)=>setSeasonForm({...seasonForm,name:e.target.value})} /></div>
            <div className="space-y-2"><Label>Description</Label><Input value={seasonForm.description} onChange={(e)=>setSeasonForm({...seasonForm,description:e.target.value})} /></div>
            <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={seasonForm.startDate} onChange={(e)=>setSeasonForm({...seasonForm,startDate:e.target.value})} /></div>
            <div className="space-y-2"><Label>End Date</Label><Input type="date" value={seasonForm.endDate} onChange={(e)=>setSeasonForm({...seasonForm,endDate:e.target.value})} /></div>
          </div>
          <DialogFooter>
            <RecordAuditMeta row={seasonDialog.row} className="mr-auto" />
            <Button variant="outline" onClick={()=>setSeasonDialog({open:false,mode:"create",row:null})}>Cancel</Button>
            <Button
              disabled={saving || (isReadOnly && seasonDialog.mode === "create")}
              onClick={() => void submitSeason()}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
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
                                  notify.success("Season deleted.");
                                  const refreshed = await listSeasons({ limit: 100 });
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

      <MasterBatchImportDialog
        open={batchOpen}
        onOpenChange={setBatchOpen}
        config={hotelImportConfig}
        readOnly={isReadOnly}
        context={{
          locationByCode: new Map(),
          currencyByCode: new Map(),
          vehicleCategoryByCode: new Map(),
          vehicleTypeByCode: new Map(),
          vehicleTypeCategoryCodeByCode: new Map(),
        }}
        existingCodes={hotelExistingCodes}
        onRefreshExistingCodes={refreshHotelExistingCodes}
        onUploadRow={async (payload) => {
          await createHotel(payload);
        }}
        onCompleted={async () => {
          await loadHotels();
        }}
      />
    </div>
  );
};
