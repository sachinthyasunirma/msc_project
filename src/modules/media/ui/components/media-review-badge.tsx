"use client";

import { Badge } from "@/components/ui/badge";
import type { MediaReviewStatus } from "@/modules/media/shared/media-types";

export function MediaReviewBadge({ status }: { status: MediaReviewStatus }) {
  const variant =
    status === "APPROVED" ? "default" : status === "REJECTED" ? "destructive" : "secondary";
  return <Badge variant={variant}>{status.replaceAll("_", " ")}</Badge>;
}
