"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { OnTourEmptyState } from "@/modules/on-tour/ui/components/on-tour-empty-state";
import { OnTourScreenHeader } from "@/modules/on-tour/ui/components/on-tour-screen-header";
import { OnTourStatusBadge } from "@/modules/on-tour/ui/components/on-tour-status-badge";
import { OnTourSummaryCards } from "@/modules/on-tour/ui/components/on-tour-summary-cards";
import { useOnTourDetail } from "@/modules/on-tour/lib/use-on-tour-management";
import type { OnTourTabKey } from "@/modules/on-tour/shared/on-tour-management-types";

const OnTourDetailTabs = dynamic(
  () =>
    import("@/modules/on-tour/ui/components/on-tour-detail-tabs").then(
      (module) => module.OnTourDetailTabs
    ),
  {
    loading: () => (
      <LoadingState
        title="Loading operational tabs"
        description="Preparing travelers, services, operations, and finance panels."
      />
    ),
  }
);
const OnTourSubgroupDialog = dynamic(
  () =>
    import("@/modules/on-tour/ui/components/on-tour-subgroup-dialog").then(
      (module) => module.OnTourSubgroupDialog
    ),
  { ssr: false }
);
const OnTourTravelerDialog = dynamic(
  () =>
    import("@/modules/on-tour/ui/components/on-tour-traveler-dialog").then(
      (module) => module.OnTourTravelerDialog
    ),
  { ssr: false }
);
const OnTourAssignTravelersDialog = dynamic(
  () =>
    import("@/modules/on-tour/ui/components/on-tour-assign-travelers-dialog").then(
      (module) => module.OnTourAssignTravelersDialog
    ),
  { ssr: false }
);

export function OnTourManageView({ onTourId }: { onTourId: string }) {
  const [tab, setTab] = useState<OnTourTabKey>("summary");
  const [subgroupDialogOpen, setSubgroupDialogOpen] = useState(false);
  const [travelerDialogOpen, setTravelerDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  const {
    data,
    error,
    isLoading,
    isFetching,
    isMissingEndpoint,
    refetch,
    summaryCards,
    createSubgroup,
    createTraveler,
    assignTravelers,
    isMutating,
  } = useOnTourDetail(onTourId);

  const title = useMemo(() => {
    if (!data?.onTour) return "On-Tour";
    return `${data.onTour.bookingNo} · ${data.onTour.title}`;
  }, [data?.onTour]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <OnTourScreenHeader
          title="On-Tour Workspace"
          description="Loading operational services, travelers, subgroups, and servicing status."
          backHref="/tours/on-tours"
        />
        <OnTourEmptyState
          title="Loading operational file"
          description="Bringing together rooming, service confirmations, vouchers, and financial signals."
        />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <OnTourScreenHeader
          title="On-Tour Workspace"
          description="Operational management for confirmed departures."
          backHref="/tours/on-tours"
          onRefresh={() => {
            void refetch();
          }}
          refreshing={isFetching}
        />
        <Alert>
          <AlertTitle>{isMissingEndpoint ? "On-tour API not implemented yet" : "Unable to load on-tour"}</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "The requested operational file could not be loaded."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <OnTourScreenHeader
        title={title}
        description="Control execution, supplier follow-up, rooming, allocations, vouchers, and departure finance from one workspace."
        backHref="/tours/on-tours"
        backLabel="Back to On-Tours"
        onRefresh={() => {
          void refetch();
        }}
        refreshing={isFetching}
        actions={
          <>
            <Button variant="outline" onClick={() => setAssignDialogOpen(true)}>
              Assign Travelers
            </Button>
            <Button variant="outline" onClick={() => setSubgroupDialogOpen(true)}>
              New Subgroup
            </Button>
            <Button onClick={() => setTravelerDialogOpen(true)}>Add Traveler</Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <OnTourStatusBadge status={data.onTour.status} />
        <div className="text-sm text-muted-foreground">
          {new Date(data.onTour.confirmedStartDate).toLocaleDateString()} to{" "}
          {new Date(data.onTour.confirmedEndDate).toLocaleDateString()}
        </div>
        <div className="text-sm text-muted-foreground">
          {data.onTour.marketOrgName || "No market org"} • {data.onTour.operatorOrgName || "No operator"}
        </div>
      </div>

      <OnTourSummaryCards cards={summaryCards} />

      <OnTourDetailTabs
        data={data}
        activeTab={tab}
        onTabChange={setTab}
        actions={
          <div className="text-xs text-muted-foreground">
            Quoted {data.onTour.quotedGrandTotal} • Confirmed {data.onTour.confirmedGrandTotal} • Actual {data.onTour.actualGrandTotal}
          </div>
        }
      />

      {subgroupDialogOpen ? (
        <OnTourSubgroupDialog
          open={subgroupDialogOpen}
          saving={isMutating}
          onOpenChange={setSubgroupDialogOpen}
          onSubmit={async (values) => {
            await createSubgroup({
              onTourId,
              groupName: values.groupName,
              subgroupType: values.subgroupType,
              startDate: values.startDate || undefined,
              endDate: values.endDate || undefined,
              preferredLanguage: values.preferredLanguage,
              notes: values.notes,
            });
            setSubgroupDialogOpen(false);
          }}
        />
      ) : null}

      {travelerDialogOpen ? (
        <OnTourTravelerDialog
          open={travelerDialogOpen}
          saving={isMutating}
          onOpenChange={setTravelerDialogOpen}
          onSubmit={async (values) => {
            await createTraveler({
              onTourId,
              ...values,
            });
            setTravelerDialogOpen(false);
          }}
        />
      ) : null}

      {assignDialogOpen ? (
        <OnTourAssignTravelersDialog
          open={assignDialogOpen}
          saving={isMutating}
          groups={data.groups}
          travelers={data.travelers}
          onOpenChange={setAssignDialogOpen}
          onSubmit={async (values) => {
            await assignTravelers({
              onTourId,
              groupId: values.groupId,
              travelerIds: values.travelerIds,
              effectiveFrom: values.effectiveFrom || undefined,
              effectiveTo: values.effectiveTo || undefined,
            });
            setAssignDialogOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
