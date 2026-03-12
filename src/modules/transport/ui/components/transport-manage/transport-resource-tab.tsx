"use client";

import { Edit3, Plus, RefreshCw, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableLoadingRow } from "@/components/ui/table-loading-row";
import { TablePagination } from "@/components/ui/table-pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TRANSPORT_RESOURCE_COLUMNS, TRANSPORT_RESOURCE_META } from "@/modules/transport/shared/transport-management-constants";
import type { TransportResourceKey } from "@/modules/transport/shared/transport-management-types";
import { formatTransportCell } from "@/modules/transport/lib/transport-management-utils";

type TransportResourceTabProps = {
  resource: TransportResourceKey;
  query: string;
  records: Array<Record<string, unknown>>;
  pagedRecords: Array<Record<string, unknown>>;
  loading: boolean;
  currentPage: number;
  pageSize: number;
  lookupMap: Record<string, string>;
  isReadOnly: boolean;
  onQueryChange: (value: string) => void;
  onRefresh: () => void;
  onBatchOpen: () => void;
  onCreate: () => void;
  onEdit: (row: Record<string, unknown>) => void;
  onDelete: (row: Record<string, unknown>) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  renderRowActions?: (row: Record<string, unknown>) => ReactNode;
};

export function TransportResourceTab({
  resource,
  query,
  records,
  pagedRecords,
  loading,
  currentPage,
  pageSize,
  lookupMap,
  isReadOnly,
  onQueryChange,
  onRefresh,
  onBatchOpen,
  onCreate,
  onEdit,
  onDelete,
  onPageChange,
  onPageSizeChange,
  renderRowActions,
}: TransportResourceTabProps) {
  const meta = TRANSPORT_RESOURCE_META[resource];
  return (
    <div className="space-y-4">
      <div className="flex flex-row items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{meta.title}</h3>
          <p className="text-sm text-muted-foreground">{meta.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="master-refresh-btn" onClick={onRefresh}>
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={onBatchOpen}>Batch Upload</Button>
          <Button onClick={onCreate} disabled={isReadOnly} title={isReadOnly ? "View only mode" : undefined} className="master-add-btn">
            <Plus className="mr-2 size-4" />
            Add Record
          </Button>
        </div>
      </div>
      <Input placeholder="Search..." value={query} onChange={(event) => onQueryChange(event.target.value)} className="max-w-md" />
      <Table>
        <TableHeader>
          <TableRow>
            {TRANSPORT_RESOURCE_COLUMNS[resource].map((column) => (
              <TableHead key={column.key}>{column.label}</TableHead>
            ))}
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableLoadingRow
              colSpan={TRANSPORT_RESOURCE_COLUMNS[resource].length + 1}
              title="Positioning transport routes"
              description="Loading locations, vehicles, and transport pricing."
            />
          ) : records.length === 0 ? (
            <TableRow><TableCell colSpan={TRANSPORT_RESOURCE_COLUMNS[resource].length + 1} className="text-center text-muted-foreground">No records found.</TableCell></TableRow>
          ) : (
            pagedRecords.map((row) => (
              <TableRow key={String(row.id)}>
                {TRANSPORT_RESOURCE_COLUMNS[resource].map((column) => (
                  <TableCell key={column.key}>
                    {column.key === "isActive" ? (
                      <Badge variant={row.isActive ? "default" : "secondary"}>
                        {row.isActive ? "Active" : "Inactive"}
                      </Badge>
                    ) : (
                      formatTransportCell(row[column.key], lookupMap)
                    )}
                  </TableCell>
                ))}
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {renderRowActions ? renderRowActions(row) : null}
                    <Button size="sm" variant="outline" onClick={() => onEdit(row)}>
                      <Edit3 className="size-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onDelete(row)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {!loading && records.length > 0 ? (
        <TablePagination
          totalItems={records.length}
          page={currentPage}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      ) : null}
    </div>
  );
}
