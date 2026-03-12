"use client";

import Link from "next/link";
import { Edit3, Plus, RefreshCw, Settings2, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TableLoadingRow } from "@/components/ui/table-loading-row";
import { TablePagination } from "@/components/ui/table-pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ACTIVITY_COLUMNS, ACTIVITY_META, ACTIVITY_TAB_LABELS } from "@/modules/activity/shared/activity-management-constants";
import type { ActivityResourceKey } from "@/modules/activity/shared/activity-management-types";
import { formatActivityCell } from "@/modules/activity/lib/activity-management-utils";

type ActivityRecordTableCardProps = {
  resource: ActivityResourceKey;
  resourceTabs: ActivityResourceKey[];
  showActivityList: boolean;
  selectedActivityLabel: string;
  query: string;
  loading: boolean;
  records: Array<Record<string, unknown>>;
  pagedRecords: Array<Record<string, unknown>>;
  currentPage: number;
  pageSize: number;
  totalItems: number;
  lookups: Record<string, string>;
  isReadOnly: boolean;
  onResourceChange?: (resource: ActivityResourceKey) => void;
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

export function ActivityRecordTableCard({
  resource,
  resourceTabs,
  showActivityList,
  selectedActivityLabel,
  query,
  loading,
  records,
  pagedRecords,
  currentPage,
  pageSize,
  totalItems,
  lookups,
  isReadOnly,
  onResourceChange,
  onQueryChange,
  onRefresh,
  onBatchOpen,
  onCreate,
  onEdit,
  onDelete,
  onPageChange,
  onPageSizeChange,
  renderRowActions,
}: ActivityRecordTableCardProps) {
  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{ACTIVITY_META[resource].title}</CardTitle>
            <CardDescription>
              {showActivityList
                ? ACTIVITY_META[resource].description
                : selectedActivityLabel || ACTIVITY_META[resource].description}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {!showActivityList ? (
              <Button variant="outline" asChild>
                <Link href="/master-data/activities">Back to Activities</Link>
              </Button>
            ) : null}
            <Button variant="outline" className="master-refresh-btn" onClick={onRefresh}>
              <RefreshCw className="mr-2 size-4" />
              Refresh
            </Button>
            {(showActivityList && resource === "activities") || resource === "activity-rates" ? (
              <Button variant="outline" onClick={onBatchOpen}>
                Batch Upload
              </Button>
            ) : null}
            <Button onClick={onCreate} disabled={isReadOnly} title={isReadOnly ? "View only mode" : undefined} className="master-add-btn">
              <Plus className="mr-2 size-4" />
              Add Record
            </Button>
          </div>
        </div>

        {resourceTabs.length > 1 ? (
          <Tabs value={resource} onValueChange={(value) => onResourceChange?.(value as ActivityResourceKey)}>
            <div className="master-tabs-scroll">
              <TabsList className="master-tabs-list">
                {resourceTabs.map((key) => (
                  <TabsTrigger key={key} value={key} className="master-tab-trigger">
                    {ACTIVITY_TAB_LABELS[key]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </Tabs>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-4">
        <Input value={query} onChange={(e) => onQueryChange(e.target.value)} placeholder="Search..." className="max-w-md" />

        <Table>
          <TableHeader>
            <TableRow>
              {ACTIVITY_COLUMNS[resource].map((column) => (
                <TableHead key={column.key}>{column.label}</TableHead>
              ))}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableLoadingRow
                colSpan={ACTIVITY_COLUMNS[resource].length + 1}
                title="Planning your activity map"
                description="Loading activity records, availability, and pricing stops."
              />
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={ACTIVITY_COLUMNS[resource].length + 1} className="text-center text-muted-foreground">
                  No records found.
                </TableCell>
              </TableRow>
            ) : (
              pagedRecords.map((row) => (
                <TableRow key={String(row.id)}>
                  {ACTIVITY_COLUMNS[resource].map((column) => (
                    <TableCell key={column.key}>
                      {column.key === "isActive" ? (
                        <Badge variant={row.isActive ? "default" : "secondary"}>
                          {row.isActive ? "Active" : "Inactive"}
                        </Badge>
                      ) : column.key === "isRequired" ? (
                        <Badge variant={row.isRequired ? "default" : "secondary"}>
                          {row.isRequired ? "Required" : "Optional"}
                        </Badge>
                      ) : column.key === "coverImageUrl" ? (
                        row.coverImageUrl ? (
                          <a href={String(row.coverImageUrl)} target="_blank" rel="noreferrer" className="text-primary underline-offset-2 hover:underline">
                            View
                          </a>
                        ) : (
                          "-"
                        )
                      ) : (
                        formatActivityCell(row[column.key], lookups)
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {resource === "activities" && showActivityList ? (
                        <Button size="sm" variant="outline" className="master-manage-btn" asChild>
                          <Link href={`/master-data/activities/${row.id}`}>
                            <Settings2 className="mr-1 size-4" />
                            Manage
                          </Link>
                        </Button>
                      ) : null}
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
            totalItems={totalItems}
            page={currentPage}
            pageSize={pageSize}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
