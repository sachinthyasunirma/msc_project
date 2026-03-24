"use client";

import Link from "next/link";
import { ArrowRight, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { OnTourEmptyState } from "@/modules/on-tour/ui/components/on-tour-empty-state";
import { OnTourStatusBadge } from "@/modules/on-tour/ui/components/on-tour-status-badge";
import type { OnTourRecord } from "@/modules/on-tour/shared/on-tour-management-types";

export function OnTourListTable({
  query,
  onQueryChange,
  status,
  onStatusChange,
  rows,
  total,
  page,
  pageSize,
  loading,
  refreshing,
  onRefresh,
  onPageChange,
  onPageSizeChange,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  rows: OnTourRecord[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>On-Tour Operations</CardTitle>
            <CardDescription>
              Manage confirmed departures, traveler servicing, rooming, requisitions, vouchers, and cost control.
            </CardDescription>
          </div>
          <Button variant="outline" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search booking no, departure code, title, operator, or market..."
            className="max-w-xl"
          />
          <div className="flex flex-wrap items-center gap-2">
            {["", "DRAFT", "CONFIRMED", "READY_TO_OPERATE", "IN_PROGRESS", "COMPLETED"].map((value) => (
              <Button
                key={value || "ALL"}
                variant={status === value ? "default" : "outline"}
                size="sm"
                onClick={() => onStatusChange(value)}
              >
                {value || "All"}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <LoadingState
            title="Preparing your departures"
            description="Loading confirmed operational files, service status, and pending actions."
          />
        ) : rows.length === 0 ? (
          <OnTourEmptyState
            title="No on-tours yet"
            description="Confirmed departures will appear here once accepted pre-tours are converted into operational files."
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking</TableHead>
                  <TableHead>Departure</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pax</TableHead>
                  <TableHead>Travel Window</TableHead>
                  <TableHead>Market</TableHead>
                  <TableHead>Actual Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="font-medium">{row.bookingNo}</div>
                      <div className="text-xs text-muted-foreground">{row.code}</div>
                    </TableCell>
                    <TableCell>{row.departureCode}</TableCell>
                    <TableCell>
                      <div className="font-medium">{row.title}</div>
                      <div className="text-xs text-muted-foreground">{row.operatorOrgName || "Unassigned operator"}</div>
                    </TableCell>
                    <TableCell>
                      <OnTourStatusBadge status={row.status} />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{row.totalPax}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.adults}A / {row.children}C / {row.infants}I / {row.foc}FOC
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>{new Date(row.confirmedStartDate).toLocaleDateString()}</div>
                      <div className="text-xs text-muted-foreground">
                        to {new Date(row.confirmedEndDate).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>{row.marketOrgName || "-"}</div>
                      {row.preferredLanguage ? (
                        <Badge variant="secondary" className="mt-1">
                          {row.preferredLanguage}
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>{row.actualGrandTotal}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/tours/on-tours/${row.id}`}>
                          Open
                          <ArrowRight className="ml-2 size-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              totalItems={total}
              page={page}
              pageSize={pageSize}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
