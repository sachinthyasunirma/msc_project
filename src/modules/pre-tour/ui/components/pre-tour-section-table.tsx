"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, CopyPlus, PanelLeftOpen, Pencil, Plus, Settings2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TablePagination } from "@/components/ui/table-pagination";
import { LoadingState } from "@/components/ui/loading-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableLoadingRow } from "@/components/ui/table-loading-row";
import { cn } from "@/lib/utils";
import { COLUMNS, META } from "@/modules/pre-tour/shared/pre-tour-management-constants";
import type { PreTourResourceKey, Row } from "@/modules/pre-tour/shared/pre-tour-management-types";
import { formatCell } from "@/modules/pre-tour/lib/pre-tour-management-utils";

type SectionTableProps = {
  resource: PreTourResourceKey;
  rows: Row[];
  loading: boolean;
  isReadOnly: boolean;
  lookups: Record<string, string>;
  embedded?: boolean;
  hideHeader?: boolean;
  hideSummary?: boolean;
  showManage?: boolean;
  onCreateVersion?: (row: Row) => void;
  onCopyPlan?: (row: Row) => void;
  onAdd?: () => void;
  hideAdd?: boolean;
  onView?: (row: Row) => void;
  hideEdit?: boolean;
  editLabel?: string;
  deleteLabel?: string;
  onEdit: (row: Row) => void;
  onDelete: (row: Row) => void;
};

export function SectionTable({
  resource,
  rows,
  loading,
  isReadOnly,
  lookups,
  embedded = false,
  hideHeader = false,
  hideSummary = false,
  showManage,
  onCreateVersion,
  onCopyPlan,
  onAdd,
  hideAdd,
  onView,
  hideEdit,
  editLabel,
  deleteLabel,
  onEdit,
  onDelete,
}: SectionTableProps) {
  const isPreTourPlans = resource === "pre-tours";
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    if (page > totalPages) setPage(totalPages);
  }, [page, pageSize, rows.length]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [page, pageSize, rows]);

  const preTourSummary = useMemo(() => {
    if (!isPreTourPlans) return null;
    let draft = 0;
    let active = 0;
    let completed = 0;
    rows.forEach((row) => {
      const status = String(row.status || "").toUpperCase();
      if (status === "DRAFT") draft += 1;
      if (["QUOTED", "APPROVED", "BOOKED", "IN_PROGRESS"].includes(status)) active += 1;
      if (status === "COMPLETED") completed += 1;
    });
    return { total: rows.length, draft, active, completed };
  }, [isPreTourPlans, rows]);

  const statusClassName = (statusValue: unknown) => {
    const status = String(statusValue || "").toUpperCase();
    if (status === "DRAFT") return "border-slate-300 bg-slate-100 text-slate-700";
    if (status === "QUOTED") return "border-sky-200 bg-sky-100 text-sky-700";
    if (status === "APPROVED") return "border-violet-200 bg-violet-100 text-violet-700";
    if (status === "BOOKED") return "border-amber-200 bg-amber-100 text-amber-700";
    if (status === "IN_PROGRESS") return "border-indigo-200 bg-indigo-100 text-indigo-700";
    if (status === "COMPLETED") return "border-emerald-200 bg-emerald-100 text-emerald-700";
    if (status === "CANCELLED") return "border-rose-200 bg-rose-100 text-rose-700";
    return "border-muted bg-muted text-muted-foreground";
  };

  const formatDate = (value: unknown) => {
    if (!value) return "-";
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  };

  const renderActions = (row: Row, compact = false) => (
    <div className="flex flex-wrap justify-end gap-1">
      {onView ? (
        compact ? (
          <Button size="icon" variant="outline" className="size-7" title="View" onClick={() => onView(row)}>
            <PanelLeftOpen className="size-4" />
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => onView(row)}>
            <PanelLeftOpen className="mr-1 size-4" />
            View
          </Button>
        )
      ) : null}
      {showManage && resource === "pre-tours" ? (
        <Button
          size={compact ? "icon" : "sm"}
          variant="outline"
          className={cn(compact ? "size-7" : "master-manage-btn")}
          title="Manage"
          asChild
        >
          <Link href={`/master-data/pre-tours/${row.id}`}>
            <Settings2 className={cn("size-4", compact ? "" : "mr-1")} />
            {compact ? null : "Manage"}
          </Link>
        </Button>
      ) : null}
      {resource === "pre-tours" && onCreateVersion ? (
        compact ? (
          <Button
            size="icon"
            variant="outline"
            className="size-7"
            title="Create Version"
            onClick={() => onCreateVersion(row)}
            disabled={isReadOnly}
          >
            <Plus className="size-4" />
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => onCreateVersion(row)} disabled={isReadOnly}>
            + Version
          </Button>
        )
      ) : null}
      {resource === "pre-tours" && onCopyPlan ? (
        compact ? (
          <Button
            size="icon"
            variant="outline"
            className="size-7"
            title="Copy"
            onClick={() => onCopyPlan(row)}
            disabled={isReadOnly}
          >
            <CopyPlus className="size-4" />
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => onCopyPlan(row)} disabled={isReadOnly}>
            <CopyPlus className="mr-1 size-4" />
            Copy
          </Button>
        )
      ) : null}
      {!hideEdit ? (
        compact ? (
          <Button
            size="icon"
            variant="outline"
            className="size-7"
            title={editLabel || "Edit"}
            onClick={() => onEdit(row)}
            disabled={isReadOnly}
          >
            <Pencil className="size-4" />
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => onEdit(row)} disabled={isReadOnly}>
            <Pencil className="mr-1 size-4" />
            {editLabel || "Edit"}
          </Button>
        )
      ) : null}
      {compact ? (
        <Button
          size="icon"
          variant="outline"
          className="size-7"
          title={deleteLabel || "Delete"}
          onClick={() => onDelete(row)}
          disabled={isReadOnly}
        >
          <Trash2 className="size-4" />
        </Button>
      ) : (
        <Button size="sm" variant="outline" onClick={() => onDelete(row)} disabled={isReadOnly}>
          <Trash2 className="mr-1 size-4" />
          {deleteLabel || "Delete"}
        </Button>
      )}
    </div>
  );

  return (
    <Card className={cn("border-border/70 shadow-sm", embedded && "border-0 bg-transparent shadow-none")}>
      {!hideHeader ? (
        <CardHeader className={cn("flex flex-row items-start justify-between gap-2 space-y-0 px-4 py-3", embedded && "px-0 pt-0")}>
          <div>
            <CardTitle className="text-sm">{META[resource].title}</CardTitle>
            <CardDescription className="text-xs">{META[resource].description}</CardDescription>
          </div>
          {!hideAdd ? (
            <Button className="master-add-btn" size="sm" onClick={onAdd} disabled={isReadOnly}>
              <Plus className="mr-1 size-4" />
              Add
            </Button>
          ) : null}
        </CardHeader>
      ) : null}
      <CardContent className={cn("space-y-2", embedded && "px-0 pb-0 pt-0")}>
        {isPreTourPlans && preTourSummary && !hideSummary ? (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs">
              <p className="text-muted-foreground">Total Plans</p>
              <p className="text-base font-semibold">{preTourSummary.total}</p>
            </div>
            <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs">
              <p className="text-muted-foreground">Draft</p>
              <p className="text-base font-semibold">{preTourSummary.draft}</p>
            </div>
            <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs">
              <p className="text-muted-foreground">Active Pipeline</p>
              <p className="text-base font-semibold">{preTourSummary.active}</p>
            </div>
            <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs">
              <p className="text-muted-foreground">Completed</p>
              <p className="text-base font-semibold">{preTourSummary.completed}</p>
            </div>
          </div>
        ) : null}

        {isPreTourPlans ? (
          <div className="space-y-2">
            <div className="hidden overflow-x-auto lg:block">
              <Table className="min-w-[980px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference No</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Travel Window</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableLoadingRow
                      colSpan={6}
                      title="Plotting pre-tour plans"
                      description="Loading routes, versions, and planning summaries."
                    />
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                        No records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedRows.map((row) => (
                      <TableRow key={String(row.id)} className="h-11 align-middle">
                        <TableCell className="py-1.5">
                          <span className="text-xs font-semibold">{String(row.referenceNo || "-")}</span>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-semibold">{String(row.planCode || "-")}</span>
                            <span className="truncate text-muted-foreground">{String(row.title || "-")}</span>
                            <span className="text-muted-foreground">{`V${String(row.version || 1)}`}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <div className="flex items-center gap-1.5 text-xs">
                            <CalendarDays className="size-3.5 text-muted-foreground" />
                            <span>{`${formatDate(row.startDate)} - ${formatDate(row.endDate)}`}</span>
                            <span className="text-muted-foreground">{`(${String(
                              row.totalNights ?? 0
                            )}n)`}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <Badge variant="outline" className={cn("font-medium", statusClassName(row.status))}>
                            {String(row.status || "-")}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <div className="truncate text-xs text-muted-foreground">
                            <span>{formatDate(row.updatedAt)}</span>
                            <span className="mx-1">•</span>
                            <span>{String(row.updatedByName || "-")}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-1.5 text-right">{renderActions(row, true)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-2 lg:hidden">
              {loading ? (
                <LoadingState
                  compact
                  title="Plotting pre-tour plans"
                  description="Loading mobile cards for your current route pipeline."
                  className="justify-center rounded-md border px-3 py-6"
                />
              ) : rows.length === 0 ? (
                <div className="rounded-md border px-3 py-6 text-center text-sm text-muted-foreground">
                  No records found.
                </div>
              ) : (
                paginatedRows.map((row) => (
                  <div key={String(row.id)} className="rounded-md border bg-card p-3">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold">{`Ref: ${String(row.referenceNo || "-")}`}</p>
                        <p className="text-sm font-semibold">{String(row.planCode || "-")}</p>
                        <p className="text-xs text-muted-foreground">{String(row.title || "-")}</p>
                      </div>
                      <Badge variant="outline" className={cn("font-medium", statusClassName(row.status))}>
                        {String(row.status || "-")}
                      </Badge>
                    </div>
                    <div className="grid gap-1 text-xs">
                      <p>{`${formatDate(row.startDate)} - ${formatDate(row.endDate)} (${String(
                        row.totalNights ?? 0
                      )} nights)`}</p>
                      <p className="text-muted-foreground">{`V${String(row.version || 1)}`}</p>
                    </div>
                    <div className="mt-3">{renderActions(row)}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-[920px]">
            <TableHeader>
              <TableRow>
                {COLUMNS[resource].map((column) => (
                  <TableHead key={column.key}>{column.label}</TableHead>
                ))}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableLoadingRow
                  colSpan={COLUMNS[resource].length + 1}
                  title="Loading pre-tour records"
                  description="Pulling the latest operational records into view."
                />
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={COLUMNS[resource].length + 1}
                    className="py-6 text-center text-muted-foreground"
                  >
                    No records found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRows.map((row) => (
                  <TableRow key={String(row.id)}>
                    {COLUMNS[resource].map((column) => (
                      <TableCell key={column.key}>
                        {column.key === "status" ? (
                          <Badge variant="outline">{String(row[column.key] || "-")}</Badge>
                        ) : (
                          formatCell(row[column.key], lookups)
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="py-1.5 text-right">{renderActions(row)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        )}
        <TablePagination
          totalItems={rows.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </CardContent>
    </Card>
  );
}
