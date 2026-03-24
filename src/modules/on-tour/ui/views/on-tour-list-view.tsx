"use client";

import { useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { OnTourListTable } from "@/modules/on-tour/ui/components/on-tour-list-table";
import { OnTourScreenHeader } from "@/modules/on-tour/ui/components/on-tour-screen-header";
import { useOnTourList } from "@/modules/on-tour/lib/use-on-tour-management";

export function OnTourListView() {
  const { filters, setFilters, rows, total, isLoading, isFetching, error, refetch } = useOnTourList();

  useEffect(() => {
    if (filters.page !== 1 && rows.length === 0 && total === 0) {
      setFilters((current) => ({ ...current, page: 1 }));
    }
  }, [filters.page, rows.length, setFilters, total]);

  return (
    <div className="space-y-6">
      <OnTourScreenHeader
        title="On-Tour Management"
        description="Operational files, confirmed services, traveler servicing, and real-time tour execution control."
        onRefresh={() => {
          void refetch();
        }}
        refreshing={isFetching}
      />

      {error ? (
        <Alert>
          <AlertTitle>Operational API unavailable</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "The on-tour API is not available yet. The screen shell is ready for the backend integration."}
          </AlertDescription>
        </Alert>
      ) : null}

      <OnTourListTable
        query={filters.q ?? ""}
        onQueryChange={(value) => setFilters((current) => ({ ...current, q: value, page: 1 }))}
        status={filters.status ?? ""}
        onStatusChange={(value) => setFilters((current) => ({ ...current, status: value, page: 1 }))}
        rows={rows}
        total={total}
        page={filters.page ?? 1}
        pageSize={filters.limit ?? 20}
        loading={isLoading}
        refreshing={isFetching}
        onRefresh={() => {
          void refetch();
        }}
        onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
        onPageSizeChange={(limit) => setFilters((current) => ({ ...current, limit, page: 1 }))}
      />
    </div>
  );
}
