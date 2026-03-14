"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useConfirm } from "@/components/app-confirm-provider";
import { notify } from "@/lib/notify";
import {
  createAccommodationFeeRule,
  createAccommodationCancellationPolicy,
  createAccommodationCancellationPolicyRule,
  createAccommodationHotelContract,
  createAccommodationInventoryDay,
  createAccommodationRoomRate,
  createAccommodationRatePlan,
  createAccommodationRateRestriction,
  deleteAccommodationCancellationPolicy,
  deleteAccommodationCancellationPolicyRule,
  deleteAccommodationFeeRule,
  deleteAccommodationHotelContract,
  deleteAccommodationInventoryDay,
  deleteAccommodationRoomRate,
  deleteAccommodationRatePlan,
  deleteAccommodationRateRestriction,
  updateAccommodationCancellationPolicy,
  updateAccommodationCancellationPolicyRule,
  getAccommodationContractingBundle,
  updateAccommodationFeeRule,
  updateAccommodationHotelContract,
  updateAccommodationInventoryDay,
  updateAccommodationRoomRate,
  updateAccommodationRatePlan,
  updateAccommodationRateRestriction,
} from "@/modules/accommodation/lib/accommodation-contracting-api";
import { accommodationKeys } from "@/modules/accommodation/lib/accommodation-query";
import { listBusinessNetworkRecords } from "@/modules/business-network/lib/business-network-api";
import { useAccommodationFormDialog } from "@/modules/accommodation/lib/use-accommodation-form-dialog";
import type {
  HotelCancellationPolicyRecord,
  HotelCancellationPolicyRuleRecord,
  HotelContractingBundle,
  HotelContractRecord,
  HotelFeeRuleRecord,
  HotelInventoryDayRecord,
  HotelRatePlanRecord,
  HotelRateRestrictionRecord,
  HotelRoomRateRecord,
} from "@/modules/accommodation/shared/accommodation-contracting-types";
import type {
  AccommodationContractFormState,
} from "@/modules/accommodation/ui/components/dialogs/accommodation-contract-dialog";
import type {
  AccommodationRatePlanFormState,
} from "@/modules/accommodation/ui/components/dialogs/accommodation-rate-plan-dialog";
import type {
  AccommodationContractRoomRateFormState,
} from "@/modules/accommodation/ui/components/dialogs/accommodation-contract-room-rate-dialog";
import type {
  AccommodationRateRestrictionFormState,
} from "@/modules/accommodation/ui/components/dialogs/accommodation-rate-restriction-dialog";
import type {
  AccommodationFeeRuleFormState,
} from "@/modules/accommodation/ui/components/dialogs/accommodation-fee-rule-dialog";
import type {
  AccommodationCancellationPolicyFormState,
} from "@/modules/accommodation/ui/components/dialogs/accommodation-cancellation-policy-dialog";
import type {
  AccommodationCancellationPolicyRuleFormState,
} from "@/modules/accommodation/ui/components/dialogs/accommodation-cancellation-policy-rule-dialog";
import type {
  AccommodationInventoryDayFormState,
} from "@/modules/accommodation/ui/components/dialogs/accommodation-inventory-day-dialog";

function createContractForm(row?: HotelContractRecord | null): AccommodationContractFormState {
  return {
    code: row?.code ?? "",
    supplierOrgId: row?.supplierOrgId ?? "",
    contractRef: row?.contractRef ?? "",
    currencyCode: row?.currencyCode ?? "USD",
    validFrom: row?.validFrom ?? "",
    validTo: row?.validTo ?? "",
    releaseDaysDefault:
      row?.releaseDaysDefault === null || row?.releaseDaysDefault === undefined
        ? ""
        : String(row.releaseDaysDefault),
    marketScope: row?.marketScope ?? "",
    remarks: row?.remarks ?? "",
    status: row?.status ?? "DRAFT",
    isActive: row?.isActive ?? true,
  };
}

function createRatePlanForm(row?: HotelRatePlanRecord | null): AccommodationRatePlanFormState {
  return {
    code: row?.code ?? "",
    name: row?.name ?? "",
    boardBasis: row?.boardBasis ?? "BB",
    pricingModel: row?.pricingModel ?? "PER_ROOM_PER_NIGHT",
    cancellationPolicyId: row?.cancellationPolicyId ?? "",
    validFrom: row?.validFrom ?? "",
    validTo: row?.validTo ?? "",
    releaseDaysOverride:
      row?.releaseDaysOverride === null || row?.releaseDaysOverride === undefined
        ? ""
        : String(row.releaseDaysOverride),
    marketCode: row?.marketCode ?? "",
    guestNationalityScope: row?.guestNationalityScope ?? "",
    isRefundable: row?.isRefundable ?? true,
    isCommissionable: row?.isCommissionable ?? false,
    isPackageOnly: row?.isPackageOnly ?? false,
    isActive: row?.isActive ?? true,
  };
}

function createRoomRateForm(row?: HotelRoomRateRecord | null): AccommodationContractRoomRateFormState {
  return {
    code: row?.code ?? "",
    roomTypeId: row?.roomTypeId ?? "",
    validFrom: row?.validFrom ?? "",
    validTo: row?.validTo ?? "",
    baseOccupancyAdults: String(row?.baseOccupancyAdults ?? 2),
    maxAdults: String(row?.maxAdults ?? 2),
    maxChildren: String(row?.maxChildren ?? 0),
    singleUseRate: row?.singleUseRate ?? "",
    doubleRate: row?.doubleRate ?? "",
    tripleRate: row?.tripleRate ?? "",
    quadRate: row?.quadRate ?? "",
    extraAdultRate: row?.extraAdultRate ?? "",
    childWithBedRate: row?.childWithBedRate ?? "",
    childNoBedRate: row?.childNoBedRate ?? "",
    infantRate: row?.infantRate ?? "",
    singleSupplementRate: row?.singleSupplementRate ?? "",
    currencyCode: row?.currencyCode ?? "USD",
    taxMode: row?.taxMode ?? "EXCLUSIVE",
    isActive: row?.isActive ?? true,
  };
}

function createRestrictionForm(
  row?: HotelRateRestrictionRecord | null
): AccommodationRateRestrictionFormState {
  return {
    code: row?.code ?? "",
    roomTypeId: row?.roomTypeId ?? "",
    stayFrom: row?.stayFrom ?? "",
    stayTo: row?.stayTo ?? "",
    bookingFrom: row?.bookingFrom ?? "",
    bookingTo: row?.bookingTo ?? "",
    minStay: row?.minStay === null || row?.minStay === undefined ? "" : String(row.minStay),
    maxStay: row?.maxStay === null || row?.maxStay === undefined ? "" : String(row.maxStay),
    closedToArrival: row?.closedToArrival ?? false,
    closedToDeparture: row?.closedToDeparture ?? false,
    stopSell: row?.stopSell ?? false,
    releaseDays: row?.releaseDays === null || row?.releaseDays === undefined ? "" : String(row.releaseDays),
    notes: row?.notes ?? "",
  };
}

function createFeeRuleForm(row?: HotelFeeRuleRecord | null): AccommodationFeeRuleFormState {
  return {
    code: row?.code ?? "",
    name: row?.name ?? "",
    feeType: row?.feeType ?? "TAX",
    chargeBasis: row?.chargeBasis ?? "PER_ROOM_PER_NIGHT",
    amount: row?.amount ?? "",
    currencyCode: row?.currencyCode ?? "",
    isMandatory: row?.isMandatory ?? true,
    validFrom: row?.validFrom ?? "",
    validTo: row?.validTo ?? "",
    remarks: row?.remarks ?? "",
    isActive: row?.isActive ?? true,
  };
}

function createCancellationPolicyForm(
  row?: HotelCancellationPolicyRecord | null
): AccommodationCancellationPolicyFormState {
  return {
    code: row?.code ?? "",
    name: row?.name ?? "",
    description: row?.description ?? "",
    noShowPolicy: row?.noShowPolicy ?? "",
    afterCheckInPolicy: row?.afterCheckInPolicy ?? "",
    isDefault: row?.isDefault ?? false,
    isActive: row?.isActive ?? true,
  };
}

function createCancellationPolicyRuleForm(
  row?: HotelCancellationPolicyRuleRecord | null
): AccommodationCancellationPolicyRuleFormState {
  return {
    code: row?.code ?? "",
    fromDaysBefore:
      row?.fromDaysBefore === null || row?.fromDaysBefore === undefined ? "" : String(row.fromDaysBefore),
    toDaysBefore:
      row?.toDaysBefore === null || row?.toDaysBefore === undefined ? "" : String(row.toDaysBefore),
    penaltyType: row?.penaltyType ?? "PERCENT",
    penaltyValue: row?.penaltyValue ?? "",
    basis: row?.basis ?? "",
    appliesOnNoShow: row?.appliesOnNoShow ?? false,
    appliesAfterCheckIn: row?.appliesAfterCheckIn ?? false,
  };
}

function createInventoryDayForm(row?: HotelInventoryDayRecord | null): AccommodationInventoryDayFormState {
  return {
    code: row?.code ?? "",
    roomTypeId: row?.roomTypeId ?? "",
    date: row?.date ?? "",
    physicalInventory: String(row?.physicalInventory ?? 0),
    contractedAllotment:
      row?.contractedAllotment === null || row?.contractedAllotment === undefined
        ? ""
        : String(row.contractedAllotment),
    soldRooms: String(row?.soldRooms ?? 0),
    blockedRooms: String(row?.blockedRooms ?? 0),
    freeSale: row?.freeSale ?? false,
    stopSell: row?.stopSell ?? false,
    releaseDaysOverride:
      row?.releaseDaysOverride === null || row?.releaseDaysOverride === undefined
        ? ""
        : String(row.releaseDaysOverride),
    isClosed: row?.isClosed ?? false,
    notes: row?.notes ?? "",
  };
}

type UseAccommodationContractingTabOptions = {
  hotelId: string;
  initialContracting: HotelContractingBundle | null;
  isReadOnly: boolean;
};

export function useAccommodationContractingTab({
  hotelId,
  initialContracting,
  isReadOnly,
}: UseAccommodationContractingTabOptions) {
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState(initialContracting?.contracts[0]?.id ?? "");
  const [selectedRatePlanId, setSelectedRatePlanId] = useState(initialContracting?.ratePlans[0]?.id ?? "");
  const [selectedCancellationPolicyId, setSelectedCancellationPolicyId] = useState(
    initialContracting?.cancellationPolicies[0]?.id ?? ""
  );

  const contractDialog = useAccommodationFormDialog<AccommodationContractFormState, HotelContractRecord>(
    createContractForm
  );
  const ratePlanDialog = useAccommodationFormDialog<AccommodationRatePlanFormState, HotelRatePlanRecord>(
    createRatePlanForm
  );
  const roomRateDialog = useAccommodationFormDialog<
    AccommodationContractRoomRateFormState,
    HotelRoomRateRecord
  >(createRoomRateForm);
  const restrictionDialog = useAccommodationFormDialog<
    AccommodationRateRestrictionFormState,
    HotelRateRestrictionRecord
  >(createRestrictionForm);
  const feeRuleDialog = useAccommodationFormDialog<
    AccommodationFeeRuleFormState,
    HotelFeeRuleRecord
  >(createFeeRuleForm);
  const cancellationPolicyDialog = useAccommodationFormDialog<
    AccommodationCancellationPolicyFormState,
    HotelCancellationPolicyRecord
  >(createCancellationPolicyForm);
  const cancellationPolicyRuleDialog = useAccommodationFormDialog<
    AccommodationCancellationPolicyRuleFormState,
    HotelCancellationPolicyRuleRecord
  >(createCancellationPolicyRuleForm);
  const inventoryDayDialog = useAccommodationFormDialog<
    AccommodationInventoryDayFormState,
    HotelInventoryDayRecord
  >(createInventoryDayForm);

  const {
    data: contracting = null,
    isFetching: contractingLoading,
    error: contractingError,
    refetch: refetchContracting,
  } = useQuery({
    queryKey: accommodationKeys.hotelContracting(hotelId),
    queryFn: async () => {
      const payload = await getAccommodationContractingBundle(hotelId);
      return payload.contracting;
    },
    initialData: initialContracting ?? undefined,
  });

  const {
    data: supplierOptions = [],
    isFetching: supplierOptionsLoading,
    error: supplierOptionsError,
  } = useQuery({
    queryKey: accommodationKeys.supplierOrganizations(),
    queryFn: async () => {
      const rows = await listBusinessNetworkRecords("organizations", { limit: 300 });
      return rows.map((row) => ({
        value: String(row.id),
        label: `${String(row.code ?? row.id)} - ${String(row.name ?? "Organization")}`,
      }));
    },
  });

  const refresh = useCallback(async () => {
    try {
      await queryClient.invalidateQueries({
        queryKey: accommodationKeys.hotelContracting(hotelId),
      });
      await refetchContracting();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to refresh accommodation contracting.");
    }
  }, [hotelId, queryClient, refetchContracting]);

  useEffect(() => {
    if (!contractingError) return;
    notify.error(
      contractingError instanceof Error
        ? contractingError.message
        : "Failed to load accommodation contracting."
    );
  }, [contractingError]);

  useEffect(() => {
    if (!supplierOptionsError) return;
    notify.error(
      supplierOptionsError instanceof Error
        ? supplierOptionsError.message
        : "Failed to load supplier organizations."
    );
  }, [supplierOptionsError]);

  const selectedContract = useMemo(
    () => contracting?.contracts.find((row) => row.id === selectedContractId) ?? null,
    [contracting, selectedContractId]
  );
  const selectedRatePlans = useMemo(
    () => contracting?.ratePlans.filter((row) => row.contractId === selectedContractId) ?? [],
    [contracting, selectedContractId]
  );
  const selectedRatePlan = useMemo(
    () => selectedRatePlans.find((row) => row.id === selectedRatePlanId) ?? null,
    [selectedRatePlanId, selectedRatePlans]
  );
  const selectedRoomRates = useMemo(
    () => contracting?.roomRates.filter((row) => row.ratePlanId === selectedRatePlanId) ?? [],
    [contracting, selectedRatePlanId]
  );
  const selectedRestrictions = useMemo(
    () => contracting?.restrictions.filter((row) => row.ratePlanId === selectedRatePlanId) ?? [],
    [contracting, selectedRatePlanId]
  );
  const selectedFeeRules = useMemo(
    () => contracting?.feeRules.filter((row) => row.ratePlanId === selectedRatePlanId) ?? [],
    [contracting, selectedRatePlanId]
  );
  const selectedCancellationPolicy = useMemo(
    () => contracting?.cancellationPolicies.find((row) => row.id === selectedCancellationPolicyId) ?? null,
    [contracting, selectedCancellationPolicyId]
  );
  const selectedCancellationPolicyRules = useMemo(
    () =>
      contracting?.cancellationPolicyRules.filter((row) => row.policyId === selectedCancellationPolicyId) ?? [],
    [contracting, selectedCancellationPolicyId]
  );
  const cancellationPolicyOptions = useMemo(
    () =>
      (contracting?.cancellationPolicies ?? []).map((row) => ({
        value: row.id,
        label: `${row.code} - ${row.name}`,
      })),
    [contracting]
  );

  useEffect(() => {
    setSelectedRatePlanId((current) => {
      if (current && selectedRatePlans.some((row) => row.id === current)) {
        return current;
      }
      return selectedRatePlans[0]?.id ?? "";
    });
  }, [selectedRatePlans]);

  useEffect(() => {
    setSelectedCancellationPolicyId((current) => {
      if (current && (contracting?.cancellationPolicies ?? []).some((row) => row.id === current)) {
        return current;
      }
      return contracting?.cancellationPolicies[0]?.id ?? "";
    });
  }, [contracting]);

  const loading = contractingLoading || supplierOptionsLoading;

  const guardReadOnly = useCallback(() => {
    if (!isReadOnly) return false;
    notify.warning("View only mode: accommodation contracting changes are disabled.");
    return true;
  }, [isReadOnly]);

  const openContractDialog = useCallback(
    (mode: "create" | "edit", row: HotelContractRecord | null = null) => {
      if (guardReadOnly()) return;
      contractDialog.openDialog(mode, row);
    },
    [contractDialog, guardReadOnly]
  );

  const openRatePlanDialog = useCallback(
    (mode: "create" | "edit", row: HotelRatePlanRecord | null = null) => {
      if (guardReadOnly()) return;
      if (mode === "create" && !selectedContractId) {
        notify.warning("Create a hotel contract first before adding rate plans.");
        return;
      }
      if (row?.id) {
        setSelectedRatePlanId(row.id);
      }
      ratePlanDialog.openDialog(mode, row);
    },
    [guardReadOnly, ratePlanDialog, selectedContractId]
  );

  const openRoomRateDialog = useCallback(
    (mode: "create" | "edit", row: HotelRoomRateRecord | null = null) => {
      if (guardReadOnly()) return;
      const activeRatePlanId = row?.ratePlanId || selectedRatePlanId;
      if (!activeRatePlanId) {
        notify.warning("Create a rate plan first before adding occupancy room rates.");
        return;
      }
      roomRateDialog.openDialog(mode, row);
    },
    [guardReadOnly, roomRateDialog, selectedRatePlanId]
  );

  const openRestrictionDialog = useCallback(
    (mode: "create" | "edit", row: HotelRateRestrictionRecord | null = null) => {
      if (guardReadOnly()) return;
      if (!selectedRatePlanId && mode === "create") {
        notify.warning("Select a rate plan before adding restrictions.");
        return;
      }
      restrictionDialog.openDialog(mode, row);
    },
    [guardReadOnly, restrictionDialog, selectedRatePlanId]
  );

  const openFeeRuleDialog = useCallback(
    (mode: "create" | "edit", row: HotelFeeRuleRecord | null = null) => {
      if (guardReadOnly()) return;
      if (!selectedRatePlanId && mode === "create") {
        notify.warning("Select a rate plan before adding fee rules.");
        return;
      }
      feeRuleDialog.openDialog(mode, row);
    },
    [feeRuleDialog, guardReadOnly, selectedRatePlanId]
  );

  const openCancellationPolicyDialog = useCallback(
    (mode: "create" | "edit", row: HotelCancellationPolicyRecord | null = null) => {
      if (guardReadOnly()) return;
      if (row?.id) {
        setSelectedCancellationPolicyId(row.id);
      }
      cancellationPolicyDialog.openDialog(mode, row);
    },
    [cancellationPolicyDialog, guardReadOnly]
  );

  const openCancellationPolicyRuleDialog = useCallback(
    (mode: "create" | "edit", row: HotelCancellationPolicyRuleRecord | null = null) => {
      if (guardReadOnly()) return;
      if (!selectedCancellationPolicyId && mode === "create") {
        notify.warning("Select a cancellation policy before adding rules.");
        return;
      }
      cancellationPolicyRuleDialog.openDialog(mode, row);
    },
    [cancellationPolicyRuleDialog, guardReadOnly, selectedCancellationPolicyId]
  );

  const openInventoryDayDialog = useCallback(
    (mode: "create" | "edit", row: HotelInventoryDayRecord | null = null) => {
      if (guardReadOnly()) return;
      inventoryDayDialog.openDialog(mode, row);
    },
    [guardReadOnly, inventoryDayDialog]
  );

  const submitContract = useCallback(async () => {
    try {
      setSaving(true);
      const payload = {
        ...contractDialog.form,
        supplierOrgId: contractDialog.form.supplierOrgId || null,
        contractRef: contractDialog.form.contractRef || null,
        releaseDaysDefault: contractDialog.form.releaseDaysDefault
          ? Number(contractDialog.form.releaseDaysDefault)
          : null,
        marketScope: contractDialog.form.marketScope || null,
        remarks: contractDialog.form.remarks || null,
      };
      const next =
        contractDialog.dialog.mode === "create"
          ? await createAccommodationHotelContract(hotelId, payload)
          : await updateAccommodationHotelContract(String(contractDialog.dialog.row?.id), payload);
      setSelectedContractId(next.id);
      contractDialog.closeDialog();
      await refresh();
      notify.success(
        contractDialog.dialog.mode === "create"
          ? "Hotel contract created."
          : "Hotel contract updated."
      );
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to save hotel contract.");
    } finally {
      setSaving(false);
    }
  }, [contractDialog, hotelId, refresh]);

  const deleteContract = useCallback(
    async (row: HotelContractRecord) => {
      if (guardReadOnly()) return;
      const confirmed = await confirm({
        title: "Delete Hotel Contract",
        description: "This contract and its linked rate plans will be removed.",
        confirmText: "Delete",
        cancelText: "Cancel",
        destructive: true,
      });
      if (!confirmed) return;
      try {
        setSaving(true);
        await deleteAccommodationHotelContract(row.id);
        await refresh();
        notify.success("Hotel contract deleted.");
      } catch (error) {
        notify.error(error instanceof Error ? error.message : "Failed to delete hotel contract.");
      } finally {
        setSaving(false);
      }
    },
    [confirm, guardReadOnly, refresh]
  );

  const submitRatePlan = useCallback(async () => {
    if (!selectedContractId && ratePlanDialog.dialog.mode === "create") {
      notify.warning("Select a contract before adding rate plans.");
      return;
    }
    try {
      setSaving(true);
      const payload = {
        ...ratePlanDialog.form,
        cancellationPolicyId: ratePlanDialog.form.cancellationPolicyId || null,
        releaseDaysOverride: ratePlanDialog.form.releaseDaysOverride
          ? Number(ratePlanDialog.form.releaseDaysOverride)
          : null,
        marketCode: ratePlanDialog.form.marketCode || null,
        guestNationalityScope: ratePlanDialog.form.guestNationalityScope || null,
      };
      const next =
        ratePlanDialog.dialog.mode === "create"
          ? await createAccommodationRatePlan(selectedContractId, payload)
          : await updateAccommodationRatePlan(String(ratePlanDialog.dialog.row?.id), payload);
      setSelectedRatePlanId(next.id);
      ratePlanDialog.closeDialog();
      await refresh();
      notify.success(
        ratePlanDialog.dialog.mode === "create" ? "Rate plan created." : "Rate plan updated."
      );
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to save rate plan.");
    } finally {
      setSaving(false);
    }
  }, [ratePlanDialog, refresh, selectedContractId]);

  const deleteRatePlan = useCallback(
    async (row: HotelRatePlanRecord) => {
      if (guardReadOnly()) return;
      const confirmed = await confirm({
        title: "Delete Rate Plan",
        description: "This rate plan and its linked occupancy rates will be removed.",
        confirmText: "Delete",
        cancelText: "Cancel",
        destructive: true,
      });
      if (!confirmed) return;
      try {
        setSaving(true);
        await deleteAccommodationRatePlan(row.id);
        if (selectedRatePlanId === row.id) {
          setSelectedRatePlanId("");
        }
        await refresh();
        notify.success("Rate plan deleted.");
      } catch (error) {
        notify.error(error instanceof Error ? error.message : "Failed to delete rate plan.");
      } finally {
        setSaving(false);
      }
    },
    [confirm, guardReadOnly, refresh, selectedRatePlanId]
  );

  const submitRoomRate = useCallback(async () => {
    if (!selectedRatePlanId && roomRateDialog.dialog.mode === "create") {
      notify.warning("Select a rate plan before adding occupancy room rates.");
      return;
    }
    try {
      setSaving(true);
      const payload = {
        ...roomRateDialog.form,
        baseOccupancyAdults: Number(roomRateDialog.form.baseOccupancyAdults),
        maxAdults: Number(roomRateDialog.form.maxAdults),
        maxChildren: Number(roomRateDialog.form.maxChildren),
        singleUseRate: roomRateDialog.form.singleUseRate ? Number(roomRateDialog.form.singleUseRate) : null,
        doubleRate: roomRateDialog.form.doubleRate ? Number(roomRateDialog.form.doubleRate) : null,
        tripleRate: roomRateDialog.form.tripleRate ? Number(roomRateDialog.form.tripleRate) : null,
        quadRate: roomRateDialog.form.quadRate ? Number(roomRateDialog.form.quadRate) : null,
        extraAdultRate: roomRateDialog.form.extraAdultRate ? Number(roomRateDialog.form.extraAdultRate) : null,
        childWithBedRate: roomRateDialog.form.childWithBedRate ? Number(roomRateDialog.form.childWithBedRate) : null,
        childNoBedRate: roomRateDialog.form.childNoBedRate ? Number(roomRateDialog.form.childNoBedRate) : null,
        infantRate: roomRateDialog.form.infantRate ? Number(roomRateDialog.form.infantRate) : null,
        singleSupplementRate: roomRateDialog.form.singleSupplementRate
          ? Number(roomRateDialog.form.singleSupplementRate)
          : null,
      };
      if (roomRateDialog.dialog.mode === "create") {
        await createAccommodationRoomRate(selectedRatePlanId, payload);
      } else {
        await updateAccommodationRoomRate(String(roomRateDialog.dialog.row?.id), payload);
      }
      roomRateDialog.closeDialog();
      await refresh();
      notify.success(
        roomRateDialog.dialog.mode === "create" ? "Room rate created." : "Room rate updated."
      );
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to save room rate.");
    } finally {
      setSaving(false);
    }
  }, [refresh, roomRateDialog, selectedRatePlanId]);

  const deleteRoomRate = useCallback(
    async (row: HotelRoomRateRecord) => {
      if (guardReadOnly()) return;
      const confirmed = await confirm({
        title: "Delete Room Rate",
        description: "This contracted occupancy price line will be removed.",
        confirmText: "Delete",
        cancelText: "Cancel",
        destructive: true,
      });
      if (!confirmed) return;
      try {
        setSaving(true);
        await deleteAccommodationRoomRate(row.id);
        await refresh();
        notify.success("Room rate deleted.");
      } catch (error) {
        notify.error(error instanceof Error ? error.message : "Failed to delete room rate.");
      } finally {
        setSaving(false);
      }
    },
    [confirm, guardReadOnly, refresh]
  );

  const submitRestriction = useCallback(async () => {
    if (!selectedRatePlanId && restrictionDialog.dialog.mode === "create") {
      notify.warning("Select a rate plan before adding restrictions.");
      return;
    }
    try {
      setSaving(true);
      const payload = {
        ...restrictionDialog.form,
        roomTypeId: restrictionDialog.form.roomTypeId || null,
        bookingFrom: restrictionDialog.form.bookingFrom || null,
        bookingTo: restrictionDialog.form.bookingTo || null,
        minStay: restrictionDialog.form.minStay ? Number(restrictionDialog.form.minStay) : null,
        maxStay: restrictionDialog.form.maxStay ? Number(restrictionDialog.form.maxStay) : null,
        releaseDays: restrictionDialog.form.releaseDays ? Number(restrictionDialog.form.releaseDays) : null,
        notes: restrictionDialog.form.notes || null,
      };
      if (restrictionDialog.dialog.mode === "create") {
        await createAccommodationRateRestriction(selectedRatePlanId, payload);
      } else {
        await updateAccommodationRateRestriction(
          String(restrictionDialog.dialog.row?.id),
          payload
        );
      }
      restrictionDialog.closeDialog();
      await refresh();
      notify.success(
        restrictionDialog.dialog.mode === "create"
          ? "Restriction created."
          : "Restriction updated."
      );
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to save restriction.");
    } finally {
      setSaving(false);
    }
  }, [refresh, restrictionDialog, selectedRatePlanId]);

  const deleteRestriction = useCallback(
    async (row: HotelRateRestrictionRecord) => {
      if (guardReadOnly()) return;
      const confirmed = await confirm({
        title: "Delete Restriction",
        description: "This stay and booking rule will be removed.",
        confirmText: "Delete",
        cancelText: "Cancel",
        destructive: true,
      });
      if (!confirmed) return;
      try {
        setSaving(true);
        await deleteAccommodationRateRestriction(row.id);
        await refresh();
        notify.success("Restriction deleted.");
      } catch (error) {
        notify.error(error instanceof Error ? error.message : "Failed to delete restriction.");
      } finally {
        setSaving(false);
      }
    },
    [confirm, guardReadOnly, refresh]
  );

  const submitFeeRule = useCallback(async () => {
    if (!selectedRatePlanId && feeRuleDialog.dialog.mode === "create") {
      notify.warning("Select a rate plan before adding fee rules.");
      return;
    }
    try {
      setSaving(true);
      const payload = {
        ...feeRuleDialog.form,
        amount: Number(feeRuleDialog.form.amount),
        currencyCode: feeRuleDialog.form.currencyCode || null,
        validFrom: feeRuleDialog.form.validFrom || null,
        validTo: feeRuleDialog.form.validTo || null,
        remarks: feeRuleDialog.form.remarks || null,
      };
      if (feeRuleDialog.dialog.mode === "create") {
        await createAccommodationFeeRule(selectedRatePlanId, payload);
      } else {
        await updateAccommodationFeeRule(String(feeRuleDialog.dialog.row?.id), payload);
      }
      feeRuleDialog.closeDialog();
      await refresh();
      notify.success(
        feeRuleDialog.dialog.mode === "create"
          ? "Fee rule created."
          : "Fee rule updated."
      );
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to save fee rule.");
    } finally {
      setSaving(false);
    }
  }, [feeRuleDialog, refresh, selectedRatePlanId]);

  const deleteFeeRule = useCallback(
    async (row: HotelFeeRuleRecord) => {
      if (guardReadOnly()) return;
      const confirmed = await confirm({
        title: "Delete Fee Rule",
        description: "This contract charge rule will be removed.",
        confirmText: "Delete",
        cancelText: "Cancel",
        destructive: true,
      });
      if (!confirmed) return;
      try {
        setSaving(true);
        await deleteAccommodationFeeRule(row.id);
        await refresh();
        notify.success("Fee rule deleted.");
      } catch (error) {
        notify.error(error instanceof Error ? error.message : "Failed to delete fee rule.");
      } finally {
        setSaving(false);
      }
    },
    [confirm, guardReadOnly, refresh]
  );

  const submitCancellationPolicy = useCallback(async () => {
    try {
      setSaving(true);
      const payload = {
        ...cancellationPolicyDialog.form,
        description: cancellationPolicyDialog.form.description || null,
        noShowPolicy: cancellationPolicyDialog.form.noShowPolicy || null,
        afterCheckInPolicy: cancellationPolicyDialog.form.afterCheckInPolicy || null,
      };
      const next =
        cancellationPolicyDialog.dialog.mode === "create"
          ? await createAccommodationCancellationPolicy(hotelId, payload)
          : await updateAccommodationCancellationPolicy(
              String(cancellationPolicyDialog.dialog.row?.id),
              payload
            );
      setSelectedCancellationPolicyId(next.id);
      cancellationPolicyDialog.closeDialog();
      await refresh();
      notify.success(
        cancellationPolicyDialog.dialog.mode === "create"
          ? "Cancellation policy created."
          : "Cancellation policy updated."
      );
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to save cancellation policy.");
    } finally {
      setSaving(false);
    }
  }, [cancellationPolicyDialog, hotelId, refresh]);

  const deleteCancellationPolicy = useCallback(
    async (row: HotelCancellationPolicyRecord) => {
      if (guardReadOnly()) return;
      const confirmed = await confirm({
        title: "Delete Cancellation Policy",
        description: "This policy and its penalty rules will be removed.",
        confirmText: "Delete",
        cancelText: "Cancel",
        destructive: true,
      });
      if (!confirmed) return;
      try {
        setSaving(true);
        await deleteAccommodationCancellationPolicy(row.id);
        if (selectedCancellationPolicyId === row.id) {
          setSelectedCancellationPolicyId("");
        }
        await refresh();
        notify.success("Cancellation policy deleted.");
      } catch (error) {
        notify.error(error instanceof Error ? error.message : "Failed to delete cancellation policy.");
      } finally {
        setSaving(false);
      }
    },
    [confirm, guardReadOnly, refresh, selectedCancellationPolicyId]
  );

  const submitCancellationPolicyRule = useCallback(async () => {
    if (!selectedCancellationPolicyId && cancellationPolicyRuleDialog.dialog.mode === "create") {
      notify.warning("Select a cancellation policy before adding rules.");
      return;
    }
    try {
      setSaving(true);
      const payload = {
        ...cancellationPolicyRuleDialog.form,
        fromDaysBefore: cancellationPolicyRuleDialog.form.fromDaysBefore
          ? Number(cancellationPolicyRuleDialog.form.fromDaysBefore)
          : null,
        toDaysBefore: cancellationPolicyRuleDialog.form.toDaysBefore
          ? Number(cancellationPolicyRuleDialog.form.toDaysBefore)
          : null,
        penaltyValue: Number(cancellationPolicyRuleDialog.form.penaltyValue),
        basis: cancellationPolicyRuleDialog.form.basis || null,
      };
      if (cancellationPolicyRuleDialog.dialog.mode === "create") {
        await createAccommodationCancellationPolicyRule(selectedCancellationPolicyId, payload);
      } else {
        await updateAccommodationCancellationPolicyRule(
          String(cancellationPolicyRuleDialog.dialog.row?.id),
          payload
        );
      }
      cancellationPolicyRuleDialog.closeDialog();
      await refresh();
      notify.success(
        cancellationPolicyRuleDialog.dialog.mode === "create"
          ? "Cancellation rule created."
          : "Cancellation rule updated."
      );
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to save cancellation rule.");
    } finally {
      setSaving(false);
    }
  }, [cancellationPolicyRuleDialog, refresh, selectedCancellationPolicyId]);

  const deleteCancellationPolicyRule = useCallback(
    async (row: HotelCancellationPolicyRuleRecord) => {
      if (guardReadOnly()) return;
      const confirmed = await confirm({
        title: "Delete Cancellation Rule",
        description: "This penalty window will be removed.",
        confirmText: "Delete",
        cancelText: "Cancel",
        destructive: true,
      });
      if (!confirmed) return;
      try {
        setSaving(true);
        await deleteAccommodationCancellationPolicyRule(row.id);
        await refresh();
        notify.success("Cancellation rule deleted.");
      } catch (error) {
        notify.error(error instanceof Error ? error.message : "Failed to delete cancellation rule.");
      } finally {
        setSaving(false);
      }
    },
    [confirm, guardReadOnly, refresh]
  );

  const submitInventoryDay = useCallback(async () => {
    try {
      setSaving(true);
      const payload = {
        ...inventoryDayDialog.form,
        physicalInventory: Number(inventoryDayDialog.form.physicalInventory),
        contractedAllotment: inventoryDayDialog.form.contractedAllotment
          ? Number(inventoryDayDialog.form.contractedAllotment)
          : null,
        soldRooms: Number(inventoryDayDialog.form.soldRooms),
        blockedRooms: Number(inventoryDayDialog.form.blockedRooms),
        releaseDaysOverride: inventoryDayDialog.form.releaseDaysOverride
          ? Number(inventoryDayDialog.form.releaseDaysOverride)
          : null,
        notes: inventoryDayDialog.form.notes || null,
      };
      if (inventoryDayDialog.dialog.mode === "create") {
        await createAccommodationInventoryDay(hotelId, payload);
      } else {
        await updateAccommodationInventoryDay(
          String(inventoryDayDialog.dialog.row?.id),
          payload
        );
      }
      inventoryDayDialog.closeDialog();
      await refresh();
      notify.success(
        inventoryDayDialog.dialog.mode === "create"
          ? "Inventory day created."
          : "Inventory day updated."
      );
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to save inventory day.");
    } finally {
      setSaving(false);
    }
  }, [hotelId, inventoryDayDialog, refresh]);

  const deleteInventoryDay = useCallback(
    async (row: HotelInventoryDayRecord) => {
      if (guardReadOnly()) return;
      const confirmed = await confirm({
        title: "Delete Inventory Day",
        description: "This day-level inventory row will be removed.",
        confirmText: "Delete",
        cancelText: "Cancel",
        destructive: true,
      });
      if (!confirmed) return;
      try {
        setSaving(true);
        await deleteAccommodationInventoryDay(row.id);
        await refresh();
        notify.success("Inventory day deleted.");
      } catch (error) {
        notify.error(error instanceof Error ? error.message : "Failed to delete inventory day.");
      } finally {
        setSaving(false);
      }
    },
    [confirm, guardReadOnly, refresh]
  );

  return {
    contracting,
    loading,
    saving,
    selectedContractId,
    selectedContract,
    selectedRatePlans,
    selectedRatePlanId,
    selectedRatePlan,
    selectedCancellationPolicyId,
    selectedCancellationPolicy,
    selectedCancellationPolicyRules,
    selectedRoomRates,
    selectedRestrictions,
    selectedFeeRules,
    supplierOptions,
    cancellationPolicyOptions,
    setSelectedContractId,
    setSelectedRatePlanId,
    setSelectedCancellationPolicyId,
    refresh,
    contractDialog,
    ratePlanDialog,
    roomRateDialog,
    restrictionDialog,
    feeRuleDialog,
    cancellationPolicyDialog,
    cancellationPolicyRuleDialog,
    inventoryDayDialog,
    openContractDialog,
    openRatePlanDialog,
    openRoomRateDialog,
    openRestrictionDialog,
    openFeeRuleDialog,
    openCancellationPolicyDialog,
    openCancellationPolicyRuleDialog,
    openInventoryDayDialog,
    submitContract,
    submitRatePlan,
    submitRoomRate,
    submitRestriction,
    submitFeeRule,
    submitCancellationPolicy,
    submitCancellationPolicyRule,
    submitInventoryDay,
    deleteContract,
    deleteRatePlan,
    deleteRoomRate,
    deleteRestriction,
    deleteFeeRule,
    deleteCancellationPolicy,
    deleteCancellationPolicyRule,
    deleteInventoryDay,
  };
}
