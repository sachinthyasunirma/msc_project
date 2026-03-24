"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useConfirm } from "@/components/app-confirm-provider";
import { notify, notifyApiError } from "@/lib/notify";
import {
  assignTravelersToGroup,
  createOnTourSubgroup,
  createOnTourTraveler,
  getOnTourDetail,
  isMissingOnTourEndpoint,
  listOnTours,
} from "@/modules/on-tour/lib/on-tour-api";
import { onTourKeys } from "@/modules/on-tour/lib/on-tour-query";
import type {
  AssignTravelersToGroupInput,
  CreateOnTourSubgroupInput,
  CreateOnTourTravelerInput,
  OnTourListFilters,
} from "@/modules/on-tour/shared/on-tour-management-types";

export function useOnTourList(initialFilters?: Partial<OnTourListFilters>) {
  const [filters, setFilters] = useState<OnTourListFilters>({
    q: initialFilters?.q ?? "",
    status: initialFilters?.status ?? "",
    page: initialFilters?.page ?? 1,
    limit: initialFilters?.limit ?? 20,
  });

  const query = useQuery({
    queryKey: onTourKeys.list(filters),
    queryFn: () => listOnTours(filters),
    placeholderData: keepPreviousData,
  });

  return {
    filters,
    setFilters,
    data: query.data,
    rows: query.data?.rows ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useOnTourDetail(onTourId: string) {
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const detailQuery = useQuery({
    queryKey: onTourKeys.detail(onTourId),
    queryFn: () => getOnTourDetail(onTourId),
    retry: (failureCount, error) => {
      if (isMissingOnTourEndpoint(error)) return false;
      return failureCount < 1;
    },
  });

  const createSubgroupMutation = useMutation({
    mutationFn: (payload: CreateOnTourSubgroupInput) => createOnTourSubgroup(payload),
    onSuccess: async () => {
      notify.success("Subgroup created.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: onTourKeys.detail(onTourId) }),
        queryClient.invalidateQueries({ queryKey: onTourKeys.listsRoot() }),
      ]);
    },
    onError: (error) => notifyApiError(error, "Failed to create subgroup."),
  });

  const createTravelerMutation = useMutation({
    mutationFn: (payload: CreateOnTourTravelerInput) => createOnTourTraveler(payload),
    onSuccess: async () => {
      notify.success("Traveler added.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: onTourKeys.detail(onTourId) }),
        queryClient.invalidateQueries({ queryKey: onTourKeys.listsRoot() }),
      ]);
    },
    onError: (error) => notifyApiError(error, "Failed to add traveler."),
  });

  const assignTravelersMutation = useMutation({
    mutationFn: (payload: AssignTravelersToGroupInput) => assignTravelersToGroup(payload),
    onSuccess: async () => {
      notify.success("Travelers assigned to subgroup.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: onTourKeys.detail(onTourId) }),
        queryClient.invalidateQueries({ queryKey: onTourKeys.groups(onTourId) }),
        queryClient.invalidateQueries({ queryKey: onTourKeys.travelers(onTourId) }),
        queryClient.invalidateQueries({ queryKey: onTourKeys.rooming(onTourId) }),
      ]);
    },
    onError: (error) => notifyApiError(error, "Failed to assign travelers."),
  });

  const summaryCards = useMemo(() => {
    const dashboard = detailQuery.data?.dashboard;
    const onTour = detailQuery.data?.onTour;
    if (!dashboard || !onTour) return [];
    return [
      {
        label: "Confirmed Pax",
        value: String(onTour.totalPax || 0),
        hint: `${onTour.adults} adults • ${onTour.children} children • ${onTour.infants} infants • ${onTour.foc} FOC`,
      },
      {
        label: "Unconfirmed Services",
        value: String(dashboard.pendingMetrics.unconfirmedServices),
        hint: "Supplier and operational follow-up required",
      },
      {
        label: "Missing Rooming",
        value: String(dashboard.pendingMetrics.missingRooming),
        hint: "Travelers not yet assigned to rooms",
      },
      {
        label: "Actual Margin",
        value: dashboard.financials.actualMargin,
        hint: `Quoted revenue ${dashboard.financials.quotedRevenue}`,
      },
    ];
  }, [detailQuery.data]);

  return {
    data: detailQuery.data,
    error: detailQuery.error,
    isLoading: detailQuery.isLoading,
    isFetching: detailQuery.isFetching,
    isMissingEndpoint: isMissingOnTourEndpoint(detailQuery.error),
    refetch: detailQuery.refetch,
    summaryCards,
    createSubgroup: createSubgroupMutation.mutateAsync,
    createTraveler: createTravelerMutation.mutateAsync,
    assignTravelers: assignTravelersMutation.mutateAsync,
    isMutating:
      createSubgroupMutation.isPending ||
      createTravelerMutation.isPending ||
      assignTravelersMutation.isPending,
    confirm,
  };
}
