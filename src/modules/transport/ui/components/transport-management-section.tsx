"use client";

import dynamic from "next/dynamic";
import { ImagePlus } from "lucide-react";
import { useMemo, useState } from "react";
import {
  locationImportConfig,
  transportBaggageRateImportConfig,
  transportLocationExpenseImportConfig,
  transportLocationRateImportConfig,
  transportPaxVehicleRateImportConfig,
  transportVehicleCategoryImportConfig,
  transportVehicleTypeImportConfig,
} from "@/components/batch-import/master-batch-import-config";
import {
  type ImportEntityConfig,
} from "@/components/batch-import/master-batch-import-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createTransportRecord } from "@/modules/transport/lib/transport-api";
import { useTransportManagement } from "@/modules/transport/lib/use-transport-management";
import { TRANSPORT_RESOURCE_META } from "@/modules/transport/shared/transport-management-constants";
import type {
  TransportManagementInitialData,
  TransportResourceKey,
} from "@/modules/transport/shared/transport-management-types";
import { BaggageRatesTab } from "@/modules/transport/ui/components/transport-manage/baggage-rates-tab";
import { LocationExpensesTab } from "@/modules/transport/ui/components/transport-manage/location-expenses-tab";
import { LocationRatesTab } from "@/modules/transport/ui/components/transport-manage/location-rates-tab";
import { LocationsTab } from "@/modules/transport/ui/components/transport-manage/locations-tab";
import { PaxVehicleRatesTab } from "@/modules/transport/ui/components/transport-manage/pax-vehicle-rates-tab";
import { VehicleCategoriesTab } from "@/modules/transport/ui/components/transport-manage/vehicle-categories-tab";
import { VehicleTypesTab } from "@/modules/transport/ui/components/transport-manage/vehicle-types-tab";

const MasterBatchImportDialog = dynamic(
  () =>
    import("@/components/batch-import/master-batch-import-dialog").then(
      (module) => module.MasterBatchImportDialog
    ),
  { ssr: false }
);

const TransportRecordDialog = dynamic(
  () =>
    import("@/modules/transport/ui/components/transport-record-dialog").then(
      (module) => module.TransportRecordDialog
    ),
  { ssr: false }
);

const MediaAssetManagerView = dynamic(
  () =>
    import("@/modules/media/ui/views/media-asset-manager-view").then(
      (module) => module.MediaAssetManagerView
    ),
  { ssr: false }
);

type TransportManagementSectionProps = {
  initialResource?: TransportResourceKey;
  initialData?: TransportManagementInitialData | null;
  isReadOnly: boolean;
};

export function TransportManagementSection({
  initialResource = "locations",
  initialData = null,
  isReadOnly,
}: TransportManagementSectionProps) {
  const state = useTransportManagement({ initialResource, initialData, isReadOnly });
  const [mediaTarget, setMediaTarget] = useState<{ id: string; label: string } | null>(null);

  const batchConfig = useMemo<ImportEntityConfig>(() => {
    const locationCodeOptions = state.catalogs.locations.map((row) => ({
      value: String(row.code ?? "").trim().toUpperCase(),
      label: `${String(row.code ?? "").trim().toUpperCase()} - ${String(row.name ?? "")}`,
    }));
    const vehicleCategoryCodeOptions = state.catalogs.vehicleCategories.map((row) => ({
      value: String(row.code ?? "").trim().toUpperCase(),
      label: `${String(row.code ?? "").trim().toUpperCase()} - ${String(row.name ?? "")}`,
    }));
    const vehicleTypeCodeOptions = state.catalogs.vehicleTypes.map((row) => ({
      value: String(row.code ?? "").trim().toUpperCase(),
      label: `${String(row.code ?? "").trim().toUpperCase()} - ${String(row.name ?? "")}`,
    }));

    const replaceCodeOptions = (config: ImportEntityConfig) => {
      let nextFields = config.fields.map((field) => {
        if (field.key === "locationCode" || field.key === "fromLocationCode" || field.key === "toLocationCode") {
          return { ...field, options: locationCodeOptions };
        }
        if (field.key === "categoryCode" || field.key === "vehicleCategoryCode") {
          return { ...field, options: vehicleCategoryCodeOptions };
        }
        if (field.key === "vehicleTypeCode") {
          return { ...field, options: vehicleTypeCodeOptions };
        }
        return field;
      });

      if (["location-rates", "location-expenses", "pax-vehicle-rates", "baggage-rates"].includes(config.key)) {
        nextFields = nextFields.filter((field) =>
          state.transportRateBasis === "VEHICLE_CATEGORY" ? field.key !== "vehicleTypeCode" : field.key !== "vehicleCategoryCode"
        );
      }

      return {
        ...config,
        fields: nextFields,
        lookupHints: [
          { label: "Location Codes", values: locationCodeOptions.map((item) => item.value).slice(0, 20) },
          ...(state.transportRateBasis === "VEHICLE_CATEGORY"
            ? [{ label: "Vehicle Category Codes", values: vehicleCategoryCodeOptions.map((item) => item.value).slice(0, 20) }]
            : [{ label: "Vehicle Type Codes", values: vehicleTypeCodeOptions.map((item) => item.value).slice(0, 20) }]),
        ],
      };
    };

    switch (state.resource) {
      case "locations":
        return locationImportConfig;
      case "vehicle-categories":
        return transportVehicleCategoryImportConfig;
      case "vehicle-types":
        return replaceCodeOptions(transportVehicleTypeImportConfig);
      case "location-rates":
        return replaceCodeOptions(transportLocationRateImportConfig);
      case "location-expenses":
        return replaceCodeOptions(transportLocationExpenseImportConfig);
      case "pax-vehicle-rates":
        return replaceCodeOptions(transportPaxVehicleRateImportConfig);
      case "baggage-rates":
      default:
        return replaceCodeOptions(transportBaggageRateImportConfig);
    }
  }, [state.catalogs.locations, state.catalogs.vehicleCategories, state.catalogs.vehicleTypes, state.resource, state.transportRateBasis]);

  const commonTabProps = {
    query: state.query,
    records: state.records,
    pagedRecords: state.pagedRecords,
    loading: state.loading,
    currentPage: state.currentPage,
    pageSize: state.pageSize,
    lookupMap: state.lookupMap,
    isReadOnly,
    onQueryChange: state.setQuery,
    onRefresh: () => void state.refreshAll(),
    onBatchOpen: () => state.setBatchOpen(true),
    onCreate: () => state.openDialog("create"),
    onEdit: (row: Record<string, unknown>) => state.openDialog("edit", row),
    onDelete: (row: Record<string, unknown>) => void state.onDelete(row),
    onPageChange: state.setCurrentPage,
    onPageSizeChange: state.setPageSize,
    renderRowActions:
      state.resource === "locations"
        ? (row: Record<string, unknown>) => (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setMediaTarget({
                  id: String(row.id),
                  label: String(row.name ?? row.code ?? "Transport Location"),
                })
              }
            >
              <ImagePlus className="size-4" />
            </Button>
          )
        : undefined,
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{TRANSPORT_RESOURCE_META[state.resource].title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={state.resource} onValueChange={(value) => state.setResource(value as TransportResourceKey)}>
            <div className="master-tabs-scroll">
              <TabsList className="master-tabs-list">
                {(Object.keys(TRANSPORT_RESOURCE_META) as TransportResourceKey[]).map((key) => (
                  <TabsTrigger key={key} value={key} className="master-tab-trigger">
                    {TRANSPORT_RESOURCE_META[key].title.replace("Transport ", "")}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            <TabsContent value="locations"><LocationsTab {...commonTabProps} /></TabsContent>
            <TabsContent value="vehicle-categories"><VehicleCategoriesTab {...commonTabProps} /></TabsContent>
            <TabsContent value="vehicle-types"><VehicleTypesTab {...commonTabProps} /></TabsContent>
            <TabsContent value="location-rates"><LocationRatesTab {...commonTabProps} /></TabsContent>
            <TabsContent value="location-expenses"><LocationExpensesTab {...commonTabProps} /></TabsContent>
            <TabsContent value="pax-vehicle-rates"><PaxVehicleRatesTab {...commonTabProps} /></TabsContent>
            <TabsContent value="baggage-rates"><BaggageRatesTab {...commonTabProps} /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <TransportRecordDialog
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
        config={batchConfig}
        readOnly={isReadOnly}
        context={{
          locationByCode: state.locationByCode,
          currencyByCode: new Map(),
          vehicleCategoryByCode: state.vehicleCategoryByCode,
          vehicleTypeByCode: state.vehicleTypeByCode,
          vehicleTypeCategoryCodeByCode: state.vehicleTypeCategoryCodeByCode,
          transportRateBasis: state.transportRateBasis,
        }}
        existingCodes={state.existingCodes}
        onRefreshExistingCodes={state.refreshExistingCodes}
        onUploadRow={async (payload) => {
          await createTransportRecord(state.resource, payload);
        }}
        onCompleted={async () => {
          await state.refreshAll();
        }}
      />

      {mediaTarget ? (
        <MediaAssetManagerView
          open={Boolean(mediaTarget)}
          onOpenChange={(open) => {
            if (!open) {
              setMediaTarget(null);
            }
          }}
          entityType="TRANSPORT_LOCATION"
          entityId={mediaTarget.id}
          entityLabel={mediaTarget.label}
          isReadOnly={isReadOnly}
        />
      ) : null}
    </>
  );
}
