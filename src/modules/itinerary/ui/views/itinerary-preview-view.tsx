"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  Copy,
  ExternalLink,
  FileDown,
  FileStack,
  Globe2,
  Link2,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getErrorMessage, notify, notifyApiError } from "@/lib/notify";
import {
  createItineraryExportHook,
  createItineraryShareLink,
  revokeItineraryShareLink,
} from "@/modules/itinerary/lib/itinerary-api";
import { ItineraryDocumentRenderer } from "@/modules/itinerary/ui/renderers/document/itinerary-document-renderer";
import { ItineraryWebRenderer } from "@/modules/itinerary/ui/renderers/web/itinerary-web-renderer";
import type {
  ItineraryPreviewPayload,
  ItineraryShareSurface,
  ItinerarySurface,
} from "@/modules/itinerary/shared/itinerary-types";

type ItineraryPreviewViewProps = {
  payload: ItineraryPreviewPayload;
  initialSurface: ItinerarySurface;
};

export function ItineraryPreviewView({
  payload,
  initialSurface,
}: ItineraryPreviewViewProps) {
  const router = useRouter();
  const defaultShareSurface: ItineraryShareSurface =
    payload.itinerary.outputMode === "DOCUMENT" ? "DOCUMENT" : "WEB";
  const [isPending, startTransition] = useTransition();
  const [shareSurface, setShareSurface] = useState<ItineraryShareSurface>(defaultShareSurface);
  const [shareExpiryDays, setShareExpiryDays] = useState("30");

  const availableSurfaces: ItinerarySurface[] =
    payload.itinerary.outputMode === "DOCUMENT"
      ? ["DOCUMENT"]
      : payload.itinerary.outputMode === "WEB"
        ? ["WEB"]
        : ["DOCUMENT", "WEB"];

  const safeInitialSurface = availableSurfaces.includes(initialSurface)
    ? initialSurface
    : availableSurfaces[0];
  const supportsWebShare = payload.itinerary.outputMode === "BOTH" || payload.itinerary.outputMode === "WEB";
  const supportsDocumentShare =
    payload.itinerary.outputMode === "BOTH" || payload.itinerary.outputMode === "DOCUMENT";

  const pageOutline = useMemo(
    () =>
      payload.currentVersion.draft.document.pages.map((page) => ({
        id: page.id,
        label: page.anchorLabel,
        layoutVariant: page.layoutVariant,
      })),
    [payload.currentVersion.draft.document.pages]
  );

  const sectionOutline = useMemo(
    () =>
      payload.currentVersion.draft.web.sections.map((section) => ({
        id: section.id,
        label: section.anchorLabel,
        layoutVariant: section.layoutVariant,
      })),
    [payload.currentVersion.draft.web.sections]
  );

  const onCreateExport = (format: "PDF" | "DOCX") => {
    startTransition(async () => {
      try {
        const result = await createItineraryExportHook(payload.itinerary.id, { format });
        notify.success(`${format} export hook prepared.`);
        if (result.export.downloadUrl) {
          router.refresh();
        }
      } catch (error) {
        notifyApiError(error, `Failed to prepare ${format} export hook.`);
      }
    });
  };

  const onCreateShare = () => {
    startTransition(async () => {
      try {
        const parsedExpiry = shareExpiryDays.trim()
          ? Number.parseInt(shareExpiryDays.trim(), 10)
          : undefined;
        const result = await createItineraryShareLink(payload.itinerary.id, {
          surface: shareSurface,
          expiresInDays: Number.isFinite(parsedExpiry) ? parsedExpiry : undefined,
        });

        if (result.share.shareUrl && typeof navigator !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(result.share.shareUrl);
          notify.success("Share link created and copied.");
        } else {
          notify.success("Share link created.");
        }

        router.refresh();
      } catch (error) {
        notifyApiError(error, "Failed to create secure share link.");
      }
    });
  };

  const onRevokeShare = (shareId: string) => {
    startTransition(async () => {
      try {
        await revokeItineraryShareLink(payload.itinerary.id, shareId);
        notify.success("Share link revoked.");
        router.refresh();
      } catch (error) {
        notifyApiError(error, "Failed to revoke share link.");
      }
    });
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid gap-4 2xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">Phase 2 Foundation</Badge>
                <Badge variant="outline">{payload.itinerary.outputMode}</Badge>
              </div>
              <CardTitle className="text-xl">{payload.itinerary.title}</CardTitle>
              <CardDescription>
                Template: {payload.template?.title || payload.itinerary.templateKey}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Reference</p>
                <p className="font-medium">{payload.currentVersion.draft.overview.referenceNo}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Route</p>
                <p className="font-medium">{payload.currentVersion.draft.overview.routeLabel}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Travel Window</p>
                <p className="font-medium">
                  {payload.currentVersion.draft.overview.startDateLabel} -{" "}
                  {payload.currentVersion.draft.overview.endDateLabel}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Guests</p>
                <p className="font-medium">{payload.currentVersion.draft.overview.paxLabel}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Version</p>
                <p className="font-medium">
                  v{payload.currentVersion.versionNumber} created{" "}
                  {new Date(payload.currentVersion.createdAt).toLocaleString("en-US")}
                </p>
              </div>
              <div className="rounded-2xl border bg-muted/20 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Phase 2 scope</p>
                <p className="mt-2 leading-6 text-muted-foreground">
                  Structured page families, template-driven layouts, itinerary-safe media selection,
                  export hooks, and secure share-link foundations are now in place on top of the saved draft model.
                </p>
              </div>
              <Link
                href={`/master-data/pre-tours/${payload.itinerary.planId}`}
                className="inline-flex items-center gap-2 text-sm font-medium text-primary"
              >
                <ExternalLink className="size-4" />
                Open source pre-tour
              </Link>
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Structured Page Families</CardTitle>
              <CardDescription>Template registry output for this saved draft.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Document Pages</p>
                  <div className="mt-3 space-y-2">
                    {pageOutline.map((page) => (
                      <div key={page.id} className="rounded-xl border bg-muted/20 px-3 py-3">
                        <p className="text-sm font-medium">{page.label}</p>
                        <p className="text-xs text-muted-foreground">{page.layoutVariant}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Web Sections</p>
                  <div className="mt-3 space-y-2">
                    {sectionOutline.map((section) => (
                      <div key={section.id} className="rounded-xl border bg-muted/20 px-3 py-3">
                        <p className="text-sm font-medium">{section.label}</p>
                        <p className="text-xs text-muted-foreground">{section.layoutVariant}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Export Hooks</CardTitle>
              <CardDescription>
                Persisted PDF and DOCX foundations ready for worker-based binary generation later.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => onCreateExport("PDF")} disabled={isPending}>
                  <FileDown className="size-4" />
                  Prepare PDF Hook
                </Button>
                <Button variant="outline" onClick={() => onCreateExport("DOCX")} disabled={isPending}>
                  <FileDown className="size-4" />
                  Prepare DOCX Hook
                </Button>
              </div>
              <div className="space-y-2">
                {payload.exports.length ? (
                  payload.exports.map((item) => (
                    <div key={item.id} className="rounded-2xl border bg-muted/20 px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">
                            {item.format} • v{item.versionNumber}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.fileName} • {new Date(item.createdAt).toLocaleString("en-US")}
                          </p>
                        </div>
                        <Button asChild size="sm" variant="outline">
                          <a href={item.downloadUrl}>
                            <FileDown className="size-4" />
                            Download Hook
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No export hooks prepared yet.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Secure Share Links</CardTitle>
              <CardDescription>
                Private-by-default, revocable share foundations for document or web surfaces.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={shareSurface === "WEB" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShareSurface("WEB")}
                  disabled={!supportsWebShare}
                >
                  <Globe2 className="size-4" />
                  Web Surface
                </Button>
                <Button
                  variant={shareSurface === "DOCUMENT" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShareSurface("DOCUMENT")}
                  disabled={!supportsDocumentShare}
                >
                  <FileStack className="size-4" />
                  Document Surface
                </Button>
              </div>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Expiry (days)</p>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={shareExpiryDays}
                  onChange={(event) => setShareExpiryDays(event.target.value)}
                />
              </div>
              <Button onClick={onCreateShare} disabled={isPending}>
                <ShieldCheck className="size-4" />
                Create Secure Share Link
              </Button>
              <div className="space-y-2">
                {payload.shares.length ? (
                  payload.shares.map((item) => (
                    <div key={item.id} className="rounded-2xl border bg-muted/20 px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            {item.surface} share • v{item.versionNumber}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Token ending {item.tokenHint} • created{" "}
                            {new Date(item.createdAt).toLocaleString("en-US")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.revokedAt
                              ? `Revoked ${new Date(item.revokedAt).toLocaleString("en-US")}`
                              : item.expiresAt
                                ? `Expires ${new Date(item.expiresAt).toLocaleString("en-US")}`
                                : "No expiry set"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {item.shareUrl ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(item.shareUrl || "");
                                  notify.success("Share link copied.");
                                } catch (error) {
                                  notify.error(getErrorMessage(error, "Unable to copy share link."));
                                }
                              }}
                            >
                              <Copy className="size-4" />
                              Copy
                            </Button>
                          ) : null}
                          {!item.revokedAt ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onRevokeShare(item.id)}
                              disabled={isPending}
                            >
                              <XCircle className="size-4" />
                              Revoke
                            </Button>
                          ) : null}
                        </div>
                      </div>
                      {item.shareUrl ? (
                        <div className="mt-3 flex items-center gap-2 rounded-xl border bg-background px-3 py-2 text-xs">
                          <Link2 className="size-3.5 text-muted-foreground" />
                          <span className="truncate">{item.shareUrl}</span>
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No share links created yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue={safeInitialSurface} className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Render Foundations</h2>
              <p className="text-sm text-muted-foreground">
                Separate document and web renderers now follow the template registry and saved page families.
              </p>
            </div>
            <TabsList className="max-w-full justify-start overflow-x-auto">
              {availableSurfaces.includes("DOCUMENT") ? (
                <TabsTrigger value="DOCUMENT" className="gap-2">
                  <FileStack className="size-4" />
                  Document
                </TabsTrigger>
              ) : null}
              {availableSurfaces.includes("WEB") ? (
                <TabsTrigger value="WEB" className="gap-2">
                  <Globe2 className="size-4" />
                  Web
                </TabsTrigger>
              ) : null}
            </TabsList>
          </div>

          <TabsContent value="DOCUMENT" className="space-y-4">
            <ItineraryDocumentRenderer pages={payload.currentVersion.draft.document.pages} />
          </TabsContent>
          <TabsContent value="WEB" className="space-y-4">
            <ItineraryWebRenderer sections={payload.currentVersion.draft.web.sections} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
