"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Bot, ClipboardCheck, RefreshCw } from "lucide-react";
import { notify } from "@/lib/notify";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  getPreTourAIEvaluation,
  listPreTourAIEvaluations,
  reviewPreTourAIEvaluation,
} from "@/modules/pre-tour/lib/pre-tour-ai-api";
import type {
  PreTourAIRunDetail,
  PreTourAIRunListResponse,
  PreTourAIRunReviewRequest,
} from "@/modules/pre-tour/shared/pre-tour-ai-schemas";
import { usePreTourAccess } from "@/modules/pre-tour/ui/hooks/use-pre-tour-access";

const NO_SCORE = "__none__";

function accuracyBadgeVariant(value: "high" | "medium" | "low") {
  if (value === "high") return "default" as const;
  if (value === "medium") return "secondary" as const;
  return "destructive" as const;
}

function reviewBadgeVariant(status: "PENDING" | "APPROVED" | "NEEDS_WORK" | "REJECTED") {
  if (status === "APPROVED") return "default" as const;
  if (status === "NEEDS_WORK") return "secondary" as const;
  if (status === "REJECTED") return "destructive" as const;
  return "outline" as const;
}

function issueBadgeVariant(severity: "low" | "medium" | "high") {
  if (severity === "high") return "destructive" as const;
  if (severity === "medium") return "secondary" as const;
  return "outline" as const;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type ReviewFormState = {
  reviewStatus: "PENDING" | "APPROVED" | "NEEDS_WORK" | "REJECTED";
  reviewScore: string;
  reviewNotes: string;
};

function buildReviewForm(detail: PreTourAIRunDetail | null): ReviewFormState {
  return {
    reviewStatus: detail?.reviewStatus ?? "PENDING",
    reviewScore:
      detail?.reviewScore === null || detail?.reviewScore === undefined
        ? NO_SCORE
        : String(detail.reviewScore),
    reviewNotes: detail?.reviewNotes ?? "",
  };
}

export function PreTourAIEvaluationsView() {
  const { isAdmin } = usePreTourAccess();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const [modeFilter, setModeFilter] = useState<"ALL" | "CREATE" | "REVISE">("ALL");
  const [accuracyFilter, setAccuracyFilter] = useState<"ALL" | "high" | "medium" | "low">("ALL");
  const [canApplyFilter, setCanApplyFilter] = useState<"ALL" | "yes" | "no">("ALL");
  const [appliedFilter, setAppliedFilter] = useState<"ALL" | "yes" | "no">("ALL");
  const [reviewStatusFilter, setReviewStatusFilter] = useState<
    "ALL" | "PENDING" | "APPROVED" | "NEEDS_WORK" | "REJECTED"
  >("ALL");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [savingReview, setSavingReview] = useState(false);
  const [payload, setPayload] = useState<PreTourAIRunListResponse | null>(null);
  const [selectedRunId, setSelectedRunId] = useState("");
  const [detail, setDetail] = useState<PreTourAIRunDetail | null>(null);
  const [reviewForm, setReviewForm] = useState<ReviewFormState>(buildReviewForm(null));

  useEffect(() => {
    setPage(1);
  }, [deferredQuery, modeFilter, accuracyFilter, canApplyFilter, appliedFilter, reviewStatusFilter]);

  const loadRuns = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listPreTourAIEvaluations({
        q: deferredQuery || undefined,
        mode: modeFilter,
        accuracy: accuracyFilter,
        canApply: canApplyFilter,
        applied: appliedFilter,
        reviewStatus: reviewStatusFilter,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      setPayload(response);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to load AI evaluations.");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [
    accuracyFilter,
    appliedFilter,
    canApplyFilter,
    deferredQuery,
    modeFilter,
    page,
    pageSize,
    reviewStatusFilter,
  ]);

  useEffect(() => {
    void loadRuns();
  }, [loadRuns]);

  useEffect(() => {
    const items = payload?.items ?? [];
    if (items.length === 0) {
      setSelectedRunId("");
      setDetail(null);
      setReviewForm(buildReviewForm(null));
      return;
    }
    if (!items.some((entry) => entry.id === selectedRunId)) {
      setSelectedRunId(items[0]?.id ?? "");
    }
  }, [payload, selectedRunId]);

  const loadDetail = useCallback(async () => {
    if (!selectedRunId) {
      setDetail(null);
      setReviewForm(buildReviewForm(null));
      return;
    }
    setDetailLoading(true);
    try {
      const response = await getPreTourAIEvaluation(selectedRunId);
      setDetail(response);
      setReviewForm(buildReviewForm(response));
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to load AI evaluation.");
      setDetail(null);
      setReviewForm(buildReviewForm(null));
    } finally {
      setDetailLoading(false);
    }
  }, [selectedRunId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const summary = payload?.summary ?? null;
  const runs = useMemo(() => payload?.items ?? [], [payload]);
  const selectedRun = useMemo(
    () => runs.find((entry) => entry.id === selectedRunId) ?? null,
    [runs, selectedRunId]
  );

  const handleReviewSave = async () => {
    if (!selectedRunId) return;
    try {
      const request: PreTourAIRunReviewRequest = {
        reviewStatus: reviewForm.reviewStatus,
        reviewScore: reviewForm.reviewScore === NO_SCORE ? null : Number(reviewForm.reviewScore),
        reviewNotes: reviewForm.reviewNotes.trim() || null,
      };
      setSavingReview(true);
      const updated = await reviewPreTourAIEvaluation(selectedRunId, request);
      setDetail(updated);
      setReviewForm(buildReviewForm(updated));
      notify.success("AI evaluation review updated.");
      await loadRuns();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to save AI review.");
    } finally {
      setSavingReview(false);
    }
  };

  if (!isAdmin) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="size-4" />
        <AlertTitle>Admin access required</AlertTitle>
        <AlertDescription>
          The AI evaluation dashboard is restricted to Admin users because it contains prompt and
          draft audit data.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="space-y-2 px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle>AI Evaluation Dashboard</CardTitle>
              <CardDescription>
                Review prompt quality, validation accuracy, revision adoption, and human approval on
                generated Pre-Tour drafts.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <Link href="/master-data/pre-tours">Back to Pre-Tours</Link>
              </Button>
              <Button variant="outline" onClick={() => void loadRuns()} disabled={loading}>
                <RefreshCw className="mr-2 size-4" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 px-4 pb-4 pt-0">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Card className="border-border/70">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total AI Runs</p>
                <p className="mt-2 text-2xl font-semibold">{summary?.totalRuns ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="border-border/70">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Applicable Drafts</p>
                <p className="mt-2 text-2xl font-semibold">{summary?.applicableRuns ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="border-border/70">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Applied Plans</p>
                <p className="mt-2 text-2xl font-semibold">{summary?.appliedRuns ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="border-border/70">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Revision Runs</p>
                <p className="mt-2 text-2xl font-semibold">{summary?.revisedRuns ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="border-border/70">
              <CardContent className="space-y-2 p-4">
                <p className="text-xs text-muted-foreground">Average Coverage</p>
                <p className="text-2xl font-semibold">{summary?.avgCoveragePercent ?? 0}%</p>
                <p className="text-xs text-muted-foreground">
                  Review avg: {summary?.avgReviewScore ?? 0}/5
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search prompt, code, or draft title..."
              className="xl:col-span-2"
            />
            <Select value={modeFilter} onValueChange={(value) => setModeFilter(value as typeof modeFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All modes</SelectItem>
                <SelectItem value="CREATE">Create</SelectItem>
                <SelectItem value="REVISE">Revise</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={accuracyFilter}
              onValueChange={(value) => setAccuracyFilter(value as typeof accuracyFilter)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Accuracy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All accuracy</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={canApplyFilter}
              onValueChange={(value) => setCanApplyFilter(value as typeof canApplyFilter)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Apply" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All apply states</SelectItem>
                <SelectItem value="yes">Ready to apply</SelectItem>
                <SelectItem value="no">Blocked</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={appliedFilter}
              onValueChange={(value) => setAppliedFilter(value as typeof appliedFilter)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Applied" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All apply outcomes</SelectItem>
                <SelectItem value="yes">Applied</SelectItem>
                <SelectItem value="no">Not applied</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={reviewStatusFilter}
              onValueChange={(value) => setReviewStatusFilter(value as typeof reviewStatusFilter)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Review" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All reviews</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="NEEDS_WORK">Needs Work</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)]">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-base">AI Run Log</CardTitle>
            <CardDescription>
              Generated prompts are stored with validation results and downstream apply status.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4 pt-0">
            {loading ? (
              <LoadingState
                compact
                title="Loading AI runs"
                description="Collecting audit records, prompt quality metrics, and review status."
              />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Draft</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Accuracy</TableHead>
                      <TableHead>Apply</TableHead>
                      <TableHead>Review</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No AI evaluation records match the current filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      runs.map((run) => (
                        <TableRow
                          key={run.id}
                          className="cursor-pointer"
                          data-state={run.id === selectedRunId ? "selected" : undefined}
                          onClick={() => setSelectedRunId(run.id)}
                        >
                          <TableCell className="min-w-[240px] whitespace-normal">
                            <div className="space-y-1">
                              <div className="font-medium">{run.draftTitle}</div>
                              <p className="line-clamp-2 text-xs text-muted-foreground">
                                {run.prompt}
                              </p>
                              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                <span>{run.draftDayCount} days</span>
                                {run.sourcePlanCode ? <span>Source: {run.sourcePlanCode}</span> : null}
                                {run.resultingPlanCode ? (
                                  <span>Applied: {run.resultingPlanCode}</span>
                                ) : null}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{run.mode}</Badge>
                          </TableCell>
                          <TableCell className="min-w-[170px] whitespace-normal">
                            <div className="space-y-2">
                              <Badge variant={accuracyBadgeVariant(run.overallAccuracy)}>
                                {run.overallAccuracy.toUpperCase()}
                              </Badge>
                              <Progress value={run.masterCoveragePercent} className="h-2" />
                              <p className="text-xs text-muted-foreground">
                                {run.masterCoveragePercent}% coverage
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {run.canApply ? (
                              <Badge>Ready</Badge>
                            ) : (
                              <Badge variant="destructive">Blocked</Badge>
                            )}
                          </TableCell>
                          <TableCell className="min-w-[140px] whitespace-normal">
                            <div className="space-y-1">
                              <Badge variant={reviewBadgeVariant(run.reviewStatus)}>
                                {run.reviewStatus.replaceAll("_", " ")}
                              </Badge>
                              <p className="text-xs text-muted-foreground">
                                Score: {run.reviewScore ?? "-"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDateTime(run.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                <TablePagination
                  totalItems={payload?.total ?? 0}
                  page={page}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="px-4 py-3">
              <CardTitle className="text-base">Admin Review</CardTitle>
              <CardDescription>
                Add the final human verdict so prompt quality can be tracked beyond automatic
                validation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 px-4 pb-4 pt-0">
              {!selectedRun ? (
                <p className="text-sm text-muted-foreground">Select an AI run to review.</p>
              ) : (
                <>
                  <div className="rounded-lg border bg-muted/15 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{selectedRun.mode}</Badge>
                      <Badge variant={accuracyBadgeVariant(selectedRun.overallAccuracy)}>
                        {selectedRun.overallAccuracy.toUpperCase()}
                      </Badge>
                      <Badge variant={reviewBadgeVariant(selectedRun.reviewStatus)}>
                        {selectedRun.reviewStatus.replaceAll("_", " ")}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm font-medium">{selectedRun.draftTitle}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Created {formatDateTime(selectedRun.createdAt)} by{" "}
                      {selectedRun.createdByName || "Unknown user"}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <label className="text-sm font-medium">Review Status</label>
                      <Select
                        value={reviewForm.reviewStatus}
                        onValueChange={(value) =>
                          setReviewForm((current) => ({
                            ...current,
                            reviewStatus: value as ReviewFormState["reviewStatus"],
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PENDING">Pending</SelectItem>
                          <SelectItem value="APPROVED">Approved</SelectItem>
                          <SelectItem value="NEEDS_WORK">Needs Work</SelectItem>
                          <SelectItem value="REJECTED">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1.5">
                      <label className="text-sm font-medium">Review Score</label>
                      <Select
                        value={reviewForm.reviewScore}
                        onValueChange={(value) =>
                          setReviewForm((current) => ({ ...current, reviewScore: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Optional" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_SCORE}>No score</SelectItem>
                          <SelectItem value="1">1 - Poor</SelectItem>
                          <SelectItem value="2">2 - Weak</SelectItem>
                          <SelectItem value="3">3 - Fair</SelectItem>
                          <SelectItem value="4">4 - Strong</SelectItem>
                          <SelectItem value="5">5 - Excellent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-1.5">
                    <label className="text-sm font-medium">Review Notes</label>
                    <Textarea
                      value={reviewForm.reviewNotes}
                      onChange={(event) =>
                        setReviewForm((current) => ({
                          ...current,
                          reviewNotes: event.target.value,
                        }))
                      }
                      className="min-h-28"
                      placeholder="Capture what made this prompt effective, risky, or in need of prompt/template changes."
                    />
                  </div>

                  <Button onClick={() => void handleReviewSave()} disabled={savingReview || !selectedRunId}>
                    {savingReview ? "Saving Review..." : "Save Review"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader className="px-4 py-3">
              <CardTitle className="text-base">Run Details</CardTitle>
              <CardDescription>
                Inspect the original prompt, validation output, and generated draft structure.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              {detailLoading ? (
                <LoadingState
                  compact
                  title="Loading run details"
                  description="Fetching the full draft, prompt context, and validation issues."
                />
              ) : !detail ? (
                <p className="text-sm text-muted-foreground">Select an AI run to inspect.</p>
              ) : (
                <Tabs defaultValue="overview" className="space-y-3">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="prompt">Prompt</TabsTrigger>
                    <TabsTrigger value="validation">Validation</TabsTrigger>
                    <TabsTrigger value="draft">Draft</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Card className="border-border/70">
                        <CardContent className="space-y-2 p-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Bot className="size-4 text-muted-foreground" />
                            <span className="font-medium">Model</span>
                          </div>
                          <p className="text-muted-foreground">{detail.model}</p>
                          <p className="text-muted-foreground">
                            Coverage: {detail.masterCoveragePercent}%
                          </p>
                          <p className="text-muted-foreground">
                            Resolved refs: {detail.resolvedReferenceCount} / Unresolved refs:{" "}
                            {detail.unresolvedReferenceCount}
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="border-border/70">
                        <CardContent className="space-y-2 p-4 text-sm">
                          <div className="flex items-center gap-2">
                            <ClipboardCheck className="size-4 text-muted-foreground" />
                            <span className="font-medium">Plan Links</span>
                          </div>
                          {detail.sourcePlanId ? (
                            <Link
                              href={`/master-data/pre-tours/${detail.sourcePlanId}`}
                              className="block text-primary hover:underline"
                            >
                              Source: {detail.sourcePlanCode || detail.sourcePlanId}
                            </Link>
                          ) : (
                            <p className="text-muted-foreground">Source: none</p>
                          )}
                          {detail.resultingPlanId ? (
                            <Link
                              href={`/master-data/pre-tours/${detail.resultingPlanId}`}
                              className="block text-primary hover:underline"
                            >
                              Result: {detail.resultingPlanCode || detail.resultingPlanId}
                            </Link>
                          ) : (
                            <p className="text-muted-foreground">Result: not applied yet</p>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    {detail.validationSnapshot.canApply ? null : (
                      <Alert variant="destructive">
                        <AlertTriangle className="size-4" />
                        <AlertTitle>Apply blocked by validation</AlertTitle>
                        <AlertDescription>
                          This draft still has high-severity issues and cannot be applied safely
                          without prompt or master-data changes.
                        </AlertDescription>
                      </Alert>
                    )}
                  </TabsContent>

                  <TabsContent value="prompt" className="space-y-3">
                    <div className="rounded-lg border bg-muted/10 p-3">
                      <p className="text-xs text-muted-foreground">Prompt</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm">{detail.requestSnapshot.prompt}</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border p-3 text-sm">
                        <p className="font-medium">Travel Window</p>
                        <p className="mt-1 text-muted-foreground">
                          {formatDateTime(detail.requestSnapshot.startDate)} to{" "}
                          {formatDateTime(detail.requestSnapshot.endDate)}
                        </p>
                      </div>
                      <div className="rounded-lg border p-3 text-sm">
                        <p className="font-medium">Party</p>
                        <p className="mt-1 text-muted-foreground">
                          Adults {detail.requestSnapshot.adults}, Children{" "}
                          {detail.requestSnapshot.children}, Infants {detail.requestSnapshot.infants}
                        </p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="validation" className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={accuracyBadgeVariant(detail.validationSnapshot.overallAccuracy)}>
                        {detail.validationSnapshot.overallAccuracy.toUpperCase()}
                      </Badge>
                      <Badge variant={detail.validationSnapshot.canApply ? "default" : "destructive"}>
                        {detail.validationSnapshot.canApply ? "Ready to Apply" : "Blocked"}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {detail.validationSnapshot.issues.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No validation issues recorded.</p>
                      ) : (
                        detail.validationSnapshot.issues.map((issue) => (
                          <div
                            key={`${issue.path}-${issue.message}`}
                            className="rounded-lg border bg-muted/10 p-3"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={issueBadgeVariant(issue.severity)}>
                                {issue.severity.toUpperCase()}
                              </Badge>
                              <span className="text-xs text-muted-foreground">{issue.path}</span>
                            </div>
                            <p className="mt-2 text-sm">{issue.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="draft" className="space-y-3">
                    <div className="rounded-lg border bg-muted/10 p-3">
                      <p className="font-medium">{detail.draftSnapshot.plan.title}</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {detail.draftSnapshot.plan.summary}
                      </p>
                    </div>
                    {detail.draftSnapshot.assumptions.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Assumptions</p>
                        {detail.draftSnapshot.assumptions.map((entry) => (
                          <p key={entry} className="text-sm text-muted-foreground">
                            - {entry}
                          </p>
                        ))}
                      </div>
                    ) : null}
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Day Outline</p>
                      {detail.draftSnapshot.days.map((day) => (
                        <div key={`${day.dayNumber}-${day.title}`} className="rounded-lg border p-3">
                          <p className="font-medium">
                            Day {day.dayNumber} - {day.title}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {day.items.length} items
                          </p>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
