"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, FileStack, Globe2, Loader2, PlusCircle, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { LoadingState } from "@/components/ui/loading-state";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { createItineraryDraft, getItineraryLauncher } from "@/modules/itinerary/lib/itinerary-api";
import type { ItineraryCreateInput } from "@/modules/itinerary/shared/itinerary-schemas";
import { ITINERARY_OUTPUT_MODES, type ItineraryLauncherPayload } from "@/modules/itinerary/shared/itinerary-types";
import type { Row } from "@/modules/pre-tour/shared/pre-tour-management-types";

type ItineraryLauncherDialogProps = {
  open: boolean;
  plan: Row | null;
  onOpenChange: (open: boolean) => void;
};

const OUTPUT_LABELS: Record<(typeof ITINERARY_OUTPUT_MODES)[number], string> = {
  DOCUMENT: "Document",
  WEB: "Web",
  BOTH: "Both",
};

export function ItineraryLauncherDialog({
  open,
  plan,
  onOpenChange,
}: ItineraryLauncherDialogProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const planId = String(plan?.id || "");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [payload, setPayload] = useState<ItineraryLauncherPayload | null>(null);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>("");
  const [form, setForm] = useState<ItineraryCreateInput>({
    templateKey: "",
    outputMode: "BOTH",
    includeCommercials: true,
    includeMedia: true,
    includePolicies: true,
  });

  useEffect(() => {
    if (!open || !planId) {
      setPayload(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void getItineraryLauncher(planId)
      .then((nextPayload) => {
        if (cancelled) return;
        setPayload(nextPayload);
        const nextTemplateKey = nextPayload.templates[0]?.key || "";
        setSelectedTemplateKey(nextTemplateKey);
        setForm((current) => ({
          ...current,
          templateKey: nextTemplateKey,
          outputMode:
            nextPayload.templates[0]?.supportedOutputs.includes("BOTH")
              ? "BOTH"
              : nextPayload.templates[0]?.supportedOutputs[0] || "DOCUMENT",
        }));
      })
      .catch((error) => {
        if (cancelled) return;
        notify.error(error instanceof Error ? error.message : "Failed to load itinerary launcher.");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, planId]);

  const selectedTemplate = useMemo(
    () => payload?.templates.find((template) => template.key === selectedTemplateKey) ?? null,
    [payload?.templates, selectedTemplateKey]
  );

  useEffect(() => {
    if (!selectedTemplate) return;
    setForm((current) => {
      const nextOutputMode = selectedTemplate.supportedOutputs.includes(current.outputMode)
        ? current.outputMode
        : selectedTemplate.supportedOutputs[0];
      return {
        ...current,
        templateKey: selectedTemplate.key,
        outputMode: nextOutputMode,
      };
    });
  }, [selectedTemplate]);

  const handleCreate = async () => {
    if (!planId || !selectedTemplate) return;
    setCreating(true);
    try {
      const result = await createItineraryDraft(planId, {
        ...form,
        templateKey: selectedTemplate.key,
      });
      notify.success("Itinerary draft created.");
      onOpenChange(false);
      router.push(`/master-data/pre-tours/${planId}/itineraries/${result.itinerary.id}`);
      router.refresh();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to create itinerary draft.");
    } finally {
      setCreating(false);
    }
  };

  const launcherBody = !planId ? (
    <LoadingState
      compact
      title="Preparing launcher"
      description="Select a pre-tour plan to load itinerary templates and existing drafts."
    />
  ) : loading || !payload ? (
    <LoadingState
      title="Loading itinerary launcher"
      description="Collecting templates, saved drafts, and the current pre-tour context."
    />
  ) : (
    <div className="grid min-h-0 flex-1 gap-3 md:gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
      <div className="grid min-h-0 gap-3 md:gap-4">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="gap-2 pb-3 sm:pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{payload.plan.referenceNo}</Badge>
              <Badge variant="outline">{payload.plan.planCode}</Badge>
              <Badge variant="outline">{payload.plan.status}</Badge>
            </div>
            <CardTitle className="text-lg sm:text-xl">{payload.plan.title}</CardTitle>
            <CardDescription className="leading-6">
              {new Date(payload.plan.startDate).toLocaleDateString("en-US")} -{" "}
              {new Date(payload.plan.endDate).toLocaleDateString("en-US")} • {payload.plan.totalNights} nights •{" "}
              {payload.plan.adults} adult(s)
              {payload.plan.children > 0 ? ` • ${payload.plan.children} child(ren)` : ""}
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="min-h-0 border-border/70 shadow-sm">
          <CardHeader className="gap-2 pb-3 sm:pb-4">
            <CardTitle className="text-base">Available Templates</CardTitle>
            <CardDescription>
              Choose the best layout foundation before generating the first structured itinerary draft.
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-0 px-4 pb-4 sm:px-6 sm:pb-6">
            <ScrollArea className="min-h-0 pr-3 2xl:h-[360px]">
              <div className="grid gap-3 pb-1">
                {payload.templates.map((template) => {
                  const selected = template.key === selectedTemplateKey;
                  return (
                    <button
                      key={template.key}
                      type="button"
                      onClick={() => setSelectedTemplateKey(template.key)}
                      className={cn(
                        "rounded-2xl border px-4 py-4 text-left transition-colors sm:px-5",
                        selected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border/70 bg-background hover:border-primary/40 hover:bg-muted/30"
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{template.badge}</Badge>
                        <Badge variant="outline">{template.documentTheme}</Badge>
                        <Badge variant="outline">{template.webTheme}</Badge>
                      </div>
                      <div className="mt-3 space-y-2">
                        <h3 className="text-base font-semibold text-foreground">{template.title}</h3>
                        <p className="text-sm leading-6 text-muted-foreground">{template.description}</p>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {template.supportedOutputs.map((output) => (
                          <span
                            key={`${template.key}-${output}`}
                            className="rounded-full border border-dashed px-2 py-1"
                          >
                            {OUTPUT_LABELS[output]}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <div className="grid min-h-0 gap-3 md:gap-4">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="gap-2 pb-3 sm:pb-4">
            <CardTitle className="text-base">Create New Itinerary</CardTitle>
            <CardDescription>
              Phase 1 creates a saved structured draft and opens it in preview. Full page editing comes later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 px-4 pb-4 sm:px-6 sm:pb-6">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Output surface</p>
              <div className="flex flex-wrap gap-2">
                {ITINERARY_OUTPUT_MODES.map((mode) => {
                  const supported = selectedTemplate?.supportedOutputs.includes(mode) ?? false;
                  return (
                    <Button
                      key={mode}
                      type="button"
                      variant={form.outputMode === mode ? "default" : "outline"}
                      size="sm"
                      disabled={!supported || creating}
                      onClick={() => setForm((current) => ({ ...current, outputMode: mode }))}
                    >
                      {OUTPUT_LABELS[mode]}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Draft options</p>
              <label className="flex items-start gap-3 rounded-2xl border px-4 py-3">
                <Checkbox
                  checked={form.includeMedia}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({ ...current, includeMedia: checked === true }))
                  }
                />
                <span className="space-y-1">
                  <span className="block text-sm font-medium text-foreground">Use master-data media</span>
                  <span className="block text-sm text-muted-foreground">
                    Pull approved hotel, activity, and destination media into the generated draft when available.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3 rounded-2xl border px-4 py-3">
                <Checkbox
                  checked={form.includeCommercials}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({ ...current, includeCommercials: checked === true }))
                  }
                />
                <span className="space-y-1">
                  <span className="block text-sm font-medium text-foreground">Include commercial summary</span>
                  <span className="block text-sm text-muted-foreground">
                    Add pricing snapshot and commercial context from the current pre-tour totals.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3 rounded-2xl border px-4 py-3">
                <Checkbox
                  checked={form.includePolicies}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({ ...current, includePolicies: checked === true }))
                  }
                />
                <span className="space-y-1">
                  <span className="block text-sm font-medium text-foreground">Include travel notes</span>
                  <span className="block text-sm text-muted-foreground">
                    Add operational guidance and policy placeholders that can be refined in later phases.
                  </span>
                </span>
              </label>
            </div>

            <div className="rounded-2xl border bg-muted/20 px-4 py-4 text-sm">
              <div className="flex items-center gap-2 text-foreground">
                <Sparkles className="size-4 text-primary" />
                <span className="font-medium">
                  {selectedTemplate ? selectedTemplate.title : "Select a template"}
                </span>
              </div>
              <p className="mt-2 leading-6 text-muted-foreground">
                {selectedTemplate
                  ? selectedTemplate.description
                  : "Choose a template to enable itinerary draft generation."}
              </p>
            </div>

            <Button className="w-full sm:h-11" disabled={!selectedTemplate || creating} onClick={handleCreate}>
              {creating ? <Loader2 className="mr-2 size-4 animate-spin" /> : <PlusCircle className="mr-2 size-4" />}
              Create New Itinerary
            </Button>
          </CardContent>
        </Card>

        <Card className="min-h-0 border-border/70 shadow-sm">
          <CardHeader className="gap-2 pb-3 sm:pb-4">
            <CardTitle className="text-base">Existing Itineraries</CardTitle>
            <CardDescription>
              Open saved drafts directly for this pre-tour without regenerating them.
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-0 px-4 pb-4 sm:px-6 sm:pb-6">
            <ScrollArea className="min-h-0 pr-3 xl:h-[300px]">
              {payload.itineraries.length === 0 ? (
                <div className="rounded-2xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
                  No itineraries have been created for this pre-tour yet.
                </div>
              ) : (
                <div className="grid gap-3 pb-1">
                  {payload.itineraries.map((itinerary) => (
                    <article key={itinerary.id} className="rounded-2xl border px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{itinerary.code}</Badge>
                        <Badge variant="outline">{itinerary.outputMode}</Badge>
                        <Badge variant="outline">v{itinerary.currentVersionNumber}</Badge>
                      </div>
                      <h3 className="mt-3 text-sm font-semibold text-foreground">{itinerary.title}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Updated {new Date(itinerary.updatedAt).toLocaleString("en-US")}
                      </p>
                      <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
                        <Button size="sm" variant="outline" className="w-full sm:w-auto" asChild>
                          <Link href={`/master-data/pre-tours/${planId}/itineraries/${itinerary.id}`}>
                            <ExternalLink className="mr-1 size-4" />
                            Open Draft
                          </Link>
                        </Button>
                        {itinerary.outputMode !== "WEB" ? (
                          <Button size="sm" variant="ghost" className="w-full sm:w-auto" asChild>
                            <Link
                              href={`/master-data/pre-tours/${planId}/itineraries/${itinerary.id}?surface=document`}
                            >
                              <FileStack className="mr-1 size-4" />
                              Document
                            </Link>
                          </Button>
                        ) : null}
                        {itinerary.outputMode !== "DOCUMENT" ? (
                          <Button size="sm" variant="ghost" className="w-full sm:w-auto" asChild>
                            <Link
                              href={`/master-data/pre-tours/${planId}/itineraries/${itinerary.id}?surface=web`}
                            >
                              <Globe2 className="mr-1 size-4" />
                              Web
                            </Link>
                          </Button>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const launcherShell = (
    <>
      {isMobile ? (
        <DrawerHeader className="px-4 pt-2 text-left">
          <DrawerTitle>Create Itinerary</DrawerTitle>
          <DrawerDescription>
            Launch a structured itinerary draft from the selected pre-tour using reusable template foundations.
          </DrawerDescription>
        </DrawerHeader>
      ) : (
        <DialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6">
          <DialogTitle>Create Itinerary</DialogTitle>
          <DialogDescription>
            Launch a structured itinerary draft from the selected pre-tour using reusable template foundations.
          </DialogDescription>
        </DialogHeader>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 sm:px-4 sm:pb-4 lg:px-6 lg:pb-6">
        {launcherBody}
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="data-[vaul-drawer-direction=bottom]:max-h-[100dvh] data-[vaul-drawer-direction=bottom]:rounded-none sm:data-[vaul-drawer-direction=bottom]:max-h-[96dvh] sm:data-[vaul-drawer-direction=bottom]:rounded-t-lg">
          {launcherShell}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[94vh] w-[calc(100vw-1rem)] max-w-none flex-col overflow-hidden p-0 sm:w-[calc(100vw-2rem)] sm:max-w-none lg:w-[min(94vw,72rem)] xl:w-[min(92vw,84rem)]">
        {launcherShell}
      </DialogContent>
    </Dialog>
  );
}
