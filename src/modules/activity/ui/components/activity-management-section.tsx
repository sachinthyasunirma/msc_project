"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import {
  activityImportConfig,
  activityRateImportConfig,
} from "@/components/batch-import/master-batch-import-config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createActivityRecord } from "@/modules/activity/lib/activity-api";
import { useActivityManagement } from "@/modules/activity/lib/use-activity-management";
import { ACTIVITY_TAB_LABELS } from "@/modules/activity/shared/activity-management-constants";
import type {
  ActivityManagementInitialData,
  ActivityResourceKey,
} from "@/modules/activity/shared/activity-management-types";
import { ActivityRecordTableCard } from "@/modules/activity/ui/components/activity-record-table-card";
import { ActivityAvailabilityTab } from "@/modules/activity/ui/components/activity-manage/activity-availability-tab";
import { ActivityRatesTab } from "@/modules/activity/ui/components/activity-manage/activity-rates-tab";
import { ActivitySupplementsTab } from "@/modules/activity/ui/components/activity-manage/activity-supplements-tab";

const MasterBatchImportDialog = dynamic(
  () =>
    import("@/components/batch-import/master-batch-import-dialog").then(
      (module) => module.MasterBatchImportDialog
    ),
  { ssr: false }
);

const ActivityRecordDialog = dynamic(
  () =>
    import("@/modules/activity/ui/components/activity-record-dialog").then(
      (module) => module.ActivityRecordDialog
    ),
  { ssr: false }
);

type ActivityManagementSectionProps = {
  activityId?: string;
  showActivityList?: boolean;
  initialData?: ActivityManagementInitialData | null;
  isReadOnly: boolean;
};

export function ActivityManagementSection({
  activityId,
  showActivityList = true,
  initialData = null,
  isReadOnly,
}: ActivityManagementSectionProps) {
  const state = useActivityManagement({ activityId, showActivityList, initialData, isReadOnly });

  const activityRateBatchConfig = useMemo(() => {
    const activityCodeOptions = state.activities.map((item) => ({
      value: String(item.code ?? "").trim().toUpperCase(),
      label: `${String(item.code ?? "").trim().toUpperCase()} - ${String(item.name ?? "")}`,
    }));
    const fields = showActivityList
      ? activityRateImportConfig.fields.map((field) =>
          field.key === "activityCode" ? { ...field, options: activityCodeOptions } : field
        )
      : activityRateImportConfig.fields.filter((field) => field.key !== "activityCode");

    return {
      ...activityRateImportConfig,
      fields,
      lookupHints: [
        {
          label: "Available Activity Codes",
          values: activityCodeOptions.map((item) => item.value).slice(0, 20),
        },
      ],
    };
  }, [showActivityList, state.activities]);

  const activityBatchConfig = useMemo(
    () => ({
      ...activityImportConfig,
      fields: activityImportConfig.fields.map((field) =>
        field.key === "locationCode"
          ? {
              ...field,
              options: state.locations.map((item) => ({
                value: String(item.code ?? "").trim().toUpperCase(),
                label: `${String(item.code ?? "").trim().toUpperCase()} - ${String(item.name ?? "")}`,
              })),
            }
          : field
      ),
      lookupHints: [
        {
          label: "Available Location Codes",
          values: state.locations
            .map((item) => String(item.code ?? "").trim().toUpperCase())
            .filter((value) => value.length > 0)
            .slice(0, 20),
        },
      ],
    }),
    [state.locations]
  );

  return (
    <>
      {showActivityList ? (
        <ActivityRecordTableCard
          resource={state.resource}
          resourceTabs={state.resourceTabs}
          showActivityList={showActivityList}
          selectedActivityLabel={state.selectedActivityLabel}
          query={state.query}
          loading={state.loading}
          records={state.records}
          pagedRecords={state.pagedRecords}
          currentPage={state.currentPage}
          pageSize={state.pageSize}
          totalItems={state.records.length}
          lookups={state.lookups}
          isReadOnly={isReadOnly}
          onResourceChange={state.setResource}
          onQueryChange={state.setQuery}
          onRefresh={() => void state.refreshAll()}
          onBatchOpen={() => state.setBatchOpen(true)}
          onCreate={() => state.openDialog("create")}
          onEdit={(row) => state.openDialog("edit", row)}
          onDelete={(row) => void state.onDelete(row)}
          onPageChange={state.setCurrentPage}
          onPageSizeChange={state.setPageSize}
        />
      ) : (
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>{state.activityMeta.title}</CardTitle>
                <CardDescription>{state.selectedActivityLabel || state.activityMeta.description}</CardDescription>
              </div>
            </div>
            <Tabs value={state.resource} onValueChange={(value) => state.setResource(value as ActivityResourceKey)}>
              <div className="master-tabs-scroll">
                <TabsList className="master-tabs-list">
                  {state.resourceTabs.map((key) => (
                    <TabsTrigger key={key} value={key} className="master-tab-trigger">
                      {ACTIVITY_TAB_LABELS[key]}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              <CardContent className="px-0 pb-0 pt-4">
                <TabsContent value="activity-rates" className="mt-0">
                  <ActivityRatesTab
                    query={state.query}
                    loading={state.loading}
                    records={state.records}
                    pagedRecords={state.pagedRecords}
                    currentPage={state.currentPage}
                    pageSize={state.pageSize}
                    lookups={state.lookups}
                    isReadOnly={isReadOnly}
                    onQueryChange={state.setQuery}
                    onRefresh={() => void state.refreshAll()}
                    onBatchOpen={() => state.setBatchOpen(true)}
                    onCreate={() => state.openDialog("create")}
                    onEdit={(row) => state.openDialog("edit", row)}
                    onDelete={(row) => void state.onDelete(row)}
                    onPageChange={state.setCurrentPage}
                    onPageSizeChange={state.setPageSize}
                  />
                </TabsContent>
                <TabsContent value="activity-availability" className="mt-0">
                  <ActivityAvailabilityTab
                    query={state.query}
                    loading={state.loading}
                    records={state.records}
                    pagedRecords={state.pagedRecords}
                    currentPage={state.currentPage}
                    pageSize={state.pageSize}
                    lookups={state.lookups}
                    isReadOnly={isReadOnly}
                    onQueryChange={state.setQuery}
                    onRefresh={() => void state.refreshAll()}
                    onBatchOpen={() => state.setBatchOpen(true)}
                    onCreate={() => state.openDialog("create")}
                    onEdit={(row) => state.openDialog("edit", row)}
                    onDelete={(row) => void state.onDelete(row)}
                    onPageChange={state.setCurrentPage}
                    onPageSizeChange={state.setPageSize}
                  />
                </TabsContent>
                <TabsContent value="activity-supplements" className="mt-0">
                  <ActivitySupplementsTab
                    query={state.query}
                    loading={state.loading}
                    records={state.records}
                    pagedRecords={state.pagedRecords}
                    currentPage={state.currentPage}
                    pageSize={state.pageSize}
                    lookups={state.lookups}
                    isReadOnly={isReadOnly}
                    onQueryChange={state.setQuery}
                    onRefresh={() => void state.refreshAll()}
                    onBatchOpen={() => state.setBatchOpen(true)}
                    onCreate={() => state.openDialog("create")}
                    onEdit={(row) => state.openDialog("edit", row)}
                    onDelete={(row) => void state.onDelete(row)}
                    onPageChange={state.setCurrentPage}
                    onPageSizeChange={state.setPageSize}
                  />
                </TabsContent>
              </CardContent>
            </Tabs>
          </CardHeader>
        </Card>
      )}

      <ActivityRecordDialog
        open={state.dialog.open}
        onOpenChange={(open) => state.setDialog((prev) => ({ ...prev, open }))}
        mode={state.dialog.mode}
        resource={state.resource}
        row={state.dialog.row}
        fields={state.fields}
        form={state.form}
        setForm={state.setForm}
        saving={state.saving}
        isReadOnly={isReadOnly}
        onSubmit={() => void state.onSubmit()}
      />

      <MasterBatchImportDialog
        open={state.batchOpen}
        onOpenChange={state.setBatchOpen}
        config={state.resource === "activity-rates" ? activityRateBatchConfig : activityBatchConfig}
        readOnly={isReadOnly}
        context={{
          locationByCode: state.locationByCode,
          currencyByCode: new Map(),
          activityByCode: state.activityByCode,
          vehicleCategoryByCode: new Map(),
          vehicleTypeByCode: new Map(),
          vehicleTypeCategoryCodeByCode: new Map(),
          defaultActivityId: showActivityList ? null : activityId || null,
        }}
        existingCodes={
          state.resource === "activity-rates"
            ? new Set(
                state.records
                  .map((row) => String(row.code ?? "").trim().toUpperCase())
                  .filter((value) => value.length > 0)
              )
            : state.activityExistingCodes
        }
        onRefreshExistingCodes={
          state.resource === "activity-rates"
            ? state.refreshActivityRateExistingCodes
            : state.refreshActivityExistingCodes
        }
        onUploadRow={async (payload) => {
          await createActivityRecord(state.resource === "activity-rates" ? "activity-rates" : "activities", payload);
        }}
        onCompleted={async () => {
          await state.refreshAll();
        }}
      />
    </>
  );
}
