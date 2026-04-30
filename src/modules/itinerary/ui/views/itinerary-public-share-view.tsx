"use client";

import { FileStack, Globe2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ItineraryDocumentRenderer } from "@/modules/itinerary/ui/renderers/document/itinerary-document-renderer";
import { ItineraryWebRenderer } from "@/modules/itinerary/ui/renderers/web/itinerary-web-renderer";
import type { ItineraryPublicSharePayload } from "@/modules/itinerary/shared/itinerary-types";

type ItineraryPublicShareViewProps = {
  payload: ItineraryPublicSharePayload;
};

export function ItineraryPublicShareView({ payload }: ItineraryPublicShareViewProps) {
  const isWebSurface = payload.share.surface === "WEB";

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-6">
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Shared Itinerary</Badge>
            <Badge variant="outline" className="gap-1">
              {isWebSurface ? <Globe2 className="size-3.5" /> : <FileStack className="size-3.5" />}
              {payload.share.surface}
            </Badge>
            {payload.share.expiresAt ? (
              <Badge variant="outline">
                Expires {new Date(payload.share.expiresAt).toLocaleDateString("en-US")}
              </Badge>
            ) : null}
          </div>
          <CardTitle className="text-2xl">{payload.itinerary.title}</CardTitle>
          <CardDescription>
            Template: {payload.template?.title || payload.itinerary.templateKey} • Version{" "}
            {payload.currentVersion.versionNumber}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Reference</p>
            <p className="mt-1 font-medium text-foreground">
              {payload.currentVersion.draft.overview.referenceNo}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Route</p>
            <p className="mt-1 font-medium text-foreground">
              {payload.currentVersion.draft.overview.routeLabel}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Travel Window</p>
            <p className="mt-1 font-medium text-foreground">
              {payload.currentVersion.draft.overview.startDateLabel} -{" "}
              {payload.currentVersion.draft.overview.endDateLabel}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Guests</p>
            <p className="mt-1 font-medium text-foreground">
              {payload.currentVersion.draft.overview.paxLabel}
            </p>
          </div>
        </CardContent>
      </Card>

      {isWebSurface ? (
        <ItineraryWebRenderer sections={payload.currentVersion.draft.web.sections} />
      ) : (
        <ItineraryDocumentRenderer pages={payload.currentVersion.draft.document.pages} />
      )}
    </div>
  );
}
