"use client";

import dynamic from "next/dynamic";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TablePagination } from "@/components/ui/table-pagination";
import { useTaxManagement } from "@/modules/tax/lib/use-tax-management";
import type { TaxManagementInitialData } from "@/modules/tax/shared/tax-management-types";
import type { TaxResourceKey } from "@/modules/tax/ui/components/tax-management/tax-management-config";
import { TaxManagementHeader } from "@/modules/tax/ui/components/tax-management/tax-management-header";
import { TaxRecordsTable } from "@/modules/tax/ui/components/tax-management/tax-records-table";

const TaxRecordDialog = dynamic(
  () =>
    import("@/modules/tax/ui/components/tax-management/tax-record-dialog").then(
      (module) => module.TaxRecordDialog
    ),
  { ssr: false }
);

type TaxManagementSectionProps = {
  initialResource?: TaxResourceKey;
  managedTaxId?: string;
  initialData?: TaxManagementInitialData | null;
  isReadOnly: boolean;
};

export function TaxManagementSection({
  initialResource = "taxes",
  managedTaxId = "",
  initialData = null,
  isReadOnly,
}: TaxManagementSectionProps) {
  const state = useTaxManagement({ initialResource, managedTaxId, initialData, isReadOnly });

  return (
    <Card>
      <TaxManagementHeader
        resource={state.resource}
        visibleResources={state.visibleResources}
        isTaxManageMode={state.isTaxManageMode}
        managedTaxLabel={state.managedTax ? `${String(state.managedTax.code)} - ${String(state.managedTax.name)}` : ""}
        isReadOnly={isReadOnly}
        onResourceChange={state.setResource}
        onRefresh={() => void state.refreshAll()}
        onAdd={() => state.openDialog("create")}
      />

      <CardContent className="space-y-4">
        <Input
          value={state.query}
          onChange={(event) => state.setQuery(event.target.value)}
          placeholder="Search..."
          className="max-w-md"
        />
        <TaxRecordsTable
          resource={state.resource}
          records={state.pagedRecords}
          loading={state.loading}
          isReadOnly={isReadOnly}
          lookups={state.lookups}
          onEdit={(row) => state.openDialog("edit", row)}
          onDelete={(row) => void state.onDelete(row)}
        />
        {!state.loading && state.records.length > 0 ? (
          <TablePagination
            totalItems={state.records.length}
            page={state.currentPage}
            pageSize={state.pageSize}
            onPageChange={state.setCurrentPage}
            onPageSizeChange={state.setPageSize}
          />
        ) : null}
      </CardContent>
      <TaxRecordDialog
        dialog={state.dialog}
        resourceTitle={state.meta.title}
        visibleFields={state.visibleFields}
        form={state.form}
        saving={state.saving}
        isReadOnly={isReadOnly}
        setDialog={state.setDialog}
        setForm={state.setForm}
        onSubmit={state.onSubmit}
      />
    </Card>
  );
}
