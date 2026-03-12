"use client";

import { Edit3, Plus, RefreshCw, Trash2 } from "lucide-react";
import { RecordAuditMeta } from "@/components/ui/record-audit-meta";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableLoadingRow } from "@/components/ui/table-loading-row";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SeasonListResponse } from "@/modules/season/lib/season-api";
import { useSeasonManagement } from "@/modules/season/lib/use-season-management";

type SeasonManagementSectionProps = {
  isReadOnly: boolean;
  initialSeasons?: SeasonListResponse | null;
};

export function SeasonManagementSection({
  isReadOnly,
  initialSeasons = null,
}: SeasonManagementSectionProps) {
  const state = useSeasonManagement({ isReadOnly, initialData: initialSeasons });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Season Master Data</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="master-refresh-btn" onClick={() => void state.load()} disabled={state.loading || state.saving}>
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
          <Button onClick={() => state.openDialog("create")} disabled={isReadOnly} title={isReadOnly ? "View only mode" : undefined} className="master-add-btn">
            <Plus className="mr-2 size-4" />
            Add Record
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="space-y-2 md:col-span-2">
            <Label>Search</Label>
            <Input value={state.search} onChange={(e) => state.setSearch(e.target.value)} placeholder="Search season name or description" />
          </div>
          <div className="space-y-2">
            <Label>Start Date From</Label>
            <Input type="date" value={state.startDateFrom} onChange={(e) => state.setStartDateFrom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Start Date To</Label>
            <Input type="date" value={state.startDateTo} onChange={(e) => state.setStartDateTo(e.target.value)} />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Date Range</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
          {state.loading ? (
            <TableLoadingRow
              colSpan={5}
              title="Setting seasonal windows"
              description="Loading your valid seasons and date ranges."
            />
          ) : state.seasons.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No seasons found.</TableCell></TableRow>
          ) : (
              state.seasons.map((season) => (
                <TableRow key={season.id}>
                  <TableCell>{season.code}</TableCell>
                  <TableCell>{season.name}</TableCell>
                  <TableCell>{season.startDate} to {season.endDate}</TableCell>
                  <TableCell>{season.description || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => state.openDialog("edit", season)}><Edit3 className="size-4" /></Button>
                      <Button size="sm" variant="outline" onClick={() => void state.remove(season)}><Trash2 className="size-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {state.pageIndex + 1}</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={state.previousPage} disabled={state.pageIndex === 0 || state.loading || state.saving}>Previous</Button>
            <Button variant="outline" onClick={state.nextPage} disabled={!state.hasNext || !state.nextCursor || state.loading || state.saving}>Next</Button>
          </div>
        </div>
      </CardContent>

      <Dialog open={state.dialog.open} onOpenChange={(open) => state.setDialog((prev) => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{state.dialog.mode === "create" ? "Add Season" : "Edit Season"}</DialogTitle>
            <DialogDescription>Season will be available in room-rate dropdowns.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input value={state.form.code} onChange={(e) => state.setForm({ ...state.form, code: e.target.value.toUpperCase() })} />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={state.form.name} onChange={(e) => state.setForm({ ...state.form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={state.form.description} onChange={(e) => state.setForm({ ...state.form, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={state.form.startDate} onChange={(e) => state.setForm({ ...state.form, startDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={state.form.endDate} onChange={(e) => state.setForm({ ...state.form, endDate: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <RecordAuditMeta row={state.dialog.row} className="mr-auto" />
            <Button variant="outline" onClick={() => state.setDialog({ open: false, mode: "create", row: null })}>Cancel</Button>
            <Button onClick={() => void state.submit()} disabled={state.saving}>{state.saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
