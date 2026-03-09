"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TablePagination } from "@/components/ui/table-pagination";
import { useCurrencyManagement } from "@/modules/currency/lib/use-currency-management";
import type { CurrencyResourceKey } from "@/modules/currency/ui/components/currency-management/currency-management-config";
import { CurrencyManagementHeader } from "@/modules/currency/ui/components/currency-management/currency-management-header";
import { CurrencyRecordDialog } from "@/modules/currency/ui/components/currency-management/currency-record-dialog";
import { CurrencyRecordsTable } from "@/modules/currency/ui/components/currency-management/currency-records-table";

type CurrencyManagementSectionProps = {
  initialResource?: CurrencyResourceKey;
  managedCurrencyId?: string;
  isReadOnly: boolean;
};

export function CurrencyManagementSection({
  initialResource = "currencies",
  managedCurrencyId = "",
  isReadOnly,
}: CurrencyManagementSectionProps) {
  const state = useCurrencyManagement({ initialResource, managedCurrencyId, isReadOnly });

  return (
    <Card>
      <CurrencyManagementHeader
        resource={state.resource}
        visibleResources={state.visibleResources}
        isCurrencyManageMode={state.isCurrencyManageMode}
        managedCurrencyLabel={
          state.managedCurrency
            ? `${String(state.managedCurrency.code)} - ${String(state.managedCurrency.name)}`
            : ""
        }
        isReadOnly={isReadOnly}
        onResourceChange={state.setResource}
        onRefresh={() => void state.refreshAll()}
        onAdd={() => state.openDialog("create")}
      />

      <CardContent className="space-y-4">
        <Input
          value={state.query}
          onChange={(e) => state.setQuery(e.target.value)}
          placeholder="Search..."
          className="max-w-md"
        />
        <CurrencyRecordsTable
          resource={state.resource}
          records={state.pagedRecords}
          loading={state.loading}
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

      <CurrencyRecordDialog
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
