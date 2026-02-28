"use client";

import { useCallback, useEffect, useState } from "react";
import { Edit3, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/app-confirm-provider";
import { notify } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  createSeason,
  deleteSeason,
  listSeasons,
  SeasonOption,
  updateSeason,
} from "@/modules/season/lib/season-api";
import { createSeasonSchema } from "@/modules/season/shared/season-schemas";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { authClient } from "@/lib/auth-client";

type Mode = "create" | "edit";
const PAGE_SIZE = 20;

export const SeasonManagementView = () => {
  const confirm = useConfirm();
  const { data: session } = authClient.useSession();
  const accessUser = session?.user as
    | { readOnly?: boolean; role?: string | null; canWriteMasterData?: boolean }
    | undefined;
  const canWrite =
    Boolean(accessUser) &&
    !Boolean(accessUser?.readOnly) &&
    (accessUser?.role === "ADMIN" ||
      accessUser?.role === "MANAGER" ||
      Boolean(accessUser?.canWriteMasterData));
  const isReadOnly = !canWrite;
  const [seasons, setSeasons] = useState<SeasonOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [startDateFrom, setStartDateFrom] = useState("");
  const [startDateTo, setStartDateTo] = useState("");
  const [hasNext, setHasNext] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([null]);
  const [pageIndex, setPageIndex] = useState(0);
  const [dialog, setDialog] = useState<{
    open: boolean;
    mode: Mode;
    row: SeasonOption | null;
  }>({ open: false, mode: "create", row: null });
  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    startDate: "",
    endDate: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const activeCursor = cursorHistory[pageIndex];
      const data = await listSeasons({
        q: debouncedSearch || undefined,
        startDateFrom: startDateFrom || undefined,
        startDateTo: startDateTo || undefined,
        cursor: activeCursor,
        limit: PAGE_SIZE,
      });
      setSeasons(data.items);
      setHasNext(data.hasNext);
      setNextCursor(data.nextCursor);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to load seasons.");
    } finally {
      setLoading(false);
    }
  }, [cursorHistory, debouncedSearch, pageIndex, startDateFrom, startDateTo]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setCursorHistory([null]);
    setPageIndex(0);
  }, [debouncedSearch, startDateFrom, startDateTo]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDialog = (mode: Mode, row: SeasonOption | null = null) => {
    if (mode === "create" && isReadOnly) {
      notify.warning("View only mode: adding records is disabled.");
      return;
    }
    setDialog({ open: true, mode, row });
    setForm({
      code: row?.code ?? "",
      name: row?.name ?? "",
      description: row?.description ?? "",
      startDate: row?.startDate ?? "",
      endDate: row?.endDate ?? "",
    });
  };

  const submit = async () => {
    if (dialog.mode === "create" && isReadOnly) {
      notify.warning("View only mode: adding records is disabled.");
      return;
    }
    const parsed = createSeasonSchema.safeParse({
      ...form,
      description: form.description || null,
    });
    if (!parsed.success) {
      notify.error(parsed.error.issues[0]?.message || "Invalid season data.");
      return;
    }

    setSaving(true);
    try {
      if (dialog.mode === "create") {
        await createSeason(parsed.data);
        notify.success("Season created.");
      } else if (dialog.row) {
        await updateSeason(dialog.row.id, parsed.data);
        notify.success("Season updated.");
      }
      setDialog({ open: false, mode: "create", row: null });
      if (pageIndex === 0) {
        await load();
      } else {
        setCursorHistory([null]);
        setPageIndex(0);
      }
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Request failed.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (season: SeasonOption) => {
    const confirmed = await confirm({
      title: "Delete Season",
      description: `Delete season "${season.name}"? This action cannot be undone.`,
      confirmText: "Yes",
      cancelText: "No",
      destructive: true,
    });
    if (!confirmed) return;
    setSaving(true);
    try {
      await deleteSeason(season.id);
      notify.success("Season deleted.");
      if (pageIndex === 0) {
        await load();
      } else {
        setCursorHistory([null]);
        setPageIndex(0);
      }
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setSaving(false);
    }
  };

  const nextPage = () => {
    if (!nextCursor) return;
    setCursorHistory((prev) => [...prev.slice(0, pageIndex + 1), nextCursor]);
    setPageIndex((prev) => prev + 1);
  };

  const previousPage = () => {
    if (pageIndex === 0) return;
    setPageIndex((prev) => prev - 1);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Season Master Data</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void load()} disabled={loading || saving}>
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
          <Button
            onClick={() => openDialog("create")}
            disabled={isReadOnly}
            title={isReadOnly ? "View only mode" : undefined}
            className="master-add-btn"
          >
            <Plus className="mr-2 size-4" />
            Add Record
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="space-y-2 md:col-span-2">
            <Label>Search</Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search season name or description"
            />
          </div>
          <div className="space-y-2">
            <Label>Start Date From</Label>
            <Input
              type="date"
              value={startDateFrom}
              onChange={(e) => setStartDateFrom(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Start Date To</Label>
            <Input
              type="date"
              value={startDateTo}
              onChange={(e) => setStartDateTo(e.target.value)}
            />
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
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : seasons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No seasons found.
                </TableCell>
              </TableRow>
            ) : (
              seasons.map((season) => (
                <TableRow key={season.id}>
                  <TableCell>{season.code}</TableCell>
                  <TableCell>{season.name}</TableCell>
                  <TableCell>{season.startDate} to {season.endDate}</TableCell>
                  <TableCell>{season.description || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => openDialog("edit", season)}>
                        <Edit3 className="size-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void remove(season)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {pageIndex + 1}</p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={previousPage}
              disabled={pageIndex === 0 || loading || saving}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={nextPage}
              disabled={!hasNext || !nextCursor || loading || saving}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>

      <Dialog open={dialog.open} onOpenChange={(open) => setDialog((prev) => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog.mode === "create" ? "Add Season" : "Edit Season"}</DialogTitle>
            <DialogDescription>Season will be available in room-rate dropdowns.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog({ open: false, mode: "create", row: null })}>
              Cancel
            </Button>
            <Button
              onClick={() => void submit()}
              disabled={saving || (isReadOnly && dialog.mode === "create")}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
