import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { logger } from "@/lib/logging/logger";
import { AccessControlError, resolveAccess } from "@/lib/security/access-control";
import { getItineraryTemplate, ITINERARY_TEMPLATES } from "@/modules/itinerary/shared/itinerary-template-registry";
import {
  itineraryCreateSchema,
  itineraryDraftUpdateSchema,
  itineraryExportCreateSchema,
  itineraryShareCreateSchema,
  itineraryShareUpdateSchema,
} from "@/modules/itinerary/shared/itinerary-schemas";
import { createMediaReadUrl, getMediaBucketName } from "@/modules/media/server/media-s3";
import type {
  ItineraryBlockStudioState,
  ItineraryDayBlock,
  ItineraryDocumentPage,
  ItineraryExportRecord,
  ItineraryGenerationOptions,
  ItineraryDayItem,
  ItineraryHighlight,
  ItineraryLauncherPayload,
  ItineraryMediaRef,
  ItineraryPolicyBlock,
  ItineraryPreviewPayload,
  ItineraryPublicSharePayload,
  ItineraryPricingSummary,
  ItineraryShareRecord,
  ItinerarySourceSnapshot,
  ItineraryStaySummary,
  ItineraryStructuredDraft,
  ItinerarySummaryRecord,
  ItineraryTemplateDescriptor,
  ItineraryTransferSummary,
  ItineraryWebSection,
} from "@/modules/itinerary/shared/itinerary-types";
import { ITINERARY_BLOCK_FAMILIES } from "@/modules/itinerary/shared/itinerary-types";

class ItineraryError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

function normalizeZodError(error: { issues?: Array<{ message?: string }> }) {
  return error.issues?.[0]?.message || "Validation failed.";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray<T>(value: unknown) {
  return Array.isArray(value) ? (value as T[]) : [];
}

function normalizeSurfaceState(value: unknown) {
  const record = asRecord(value);
  return {
    isVisible: typeof record?.isVisible === "boolean" ? record.isVisible : true,
    isLocked: typeof record?.isLocked === "boolean" ? record.isLocked : false,
    backgroundStyle:
      record?.backgroundStyle === "SOFT" || record?.backgroundStyle === "BOLD"
        ? record.backgroundStyle
        : "AUTO",
    notes: typeof record?.notes === "string" ? record.notes : null,
    sourceMode:
      record?.sourceMode === "OVERRIDE" || record?.sourceMode === "MANUAL"
        ? record.sourceMode
        : "SOURCE",
  } as const;
}

function normalizeBlockStudioStates(value: unknown): Record<string, ItineraryBlockStudioState> {
  const record = asRecord(value) ?? {};
  const next: Record<string, ItineraryBlockStudioState> = {};

  for (const [key, rawState] of Object.entries(record)) {
    const state = asRecord(rawState);
    if (!state || typeof state.family !== "string") {
      continue;
    }
    if (!ITINERARY_BLOCK_FAMILIES.includes(state.family as (typeof ITINERARY_BLOCK_FAMILIES)[number])) {
      continue;
    }

    next[key] = {
      family: state.family as (typeof ITINERARY_BLOCK_FAMILIES)[number],
      sourceMode:
        state.sourceMode === "OVERRIDE" || state.sourceMode === "MANUAL"
          ? state.sourceMode
          : "SOURCE",
      bindingKey: typeof state.bindingKey === "string" ? state.bindingKey : null,
      notes: typeof state.notes === "string" ? state.notes : null,
      layoutVariant: typeof state.layoutVariant === "string" ? state.layoutVariant : null,
    };
  }

  return next;
}

function createDefaultStudioTheme(template: ItineraryTemplateDescriptor | null | undefined) {
  return {
    documentThemeName: template?.documentTheme || "Classic Journal",
    webThemeName: template?.webTheme || "Editorial Landing",
    tone: "SANDSTONE" as const,
    typography: "EDITORIAL" as const,
    density: "BALANCED" as const,
    documentPageSize: "A4" as const,
    documentOrientation: "PORTRAIT" as const,
    brandLabel: null,
  };
}

function normalizeDraftForStudio(
  draft: ItineraryStructuredDraft,
  template: ItineraryTemplateDescriptor | null | undefined
): ItineraryStructuredDraft {
  return {
    ...draft,
    version: 3,
    theme: draft.theme ?? createDefaultStudioTheme(template),
    studio: {
      lastSavedAt: draft.studio?.lastSavedAt ?? null,
      lastEditedAt: draft.studio?.lastEditedAt ?? null,
      lastEditedByName: draft.studio?.lastEditedByName ?? null,
      blockStates: normalizeBlockStudioStates(draft.studio?.blockStates),
    },
    document: {
      pages: draft.document.pages.map((page) => ({
        ...page,
        state: normalizeSurfaceState(page.state),
      })),
    },
    web: {
      sections: draft.web.sections.map((section) => ({
        ...section,
        state: normalizeSurfaceState(section.state),
      })),
    },
  };
}

function isStructuredDraft(value: unknown): value is ItineraryStructuredDraft {
  const draft = asRecord(value);
  const overview = asRecord(draft?.overview);
  const documentPart = asRecord(draft?.document);
  const webPart = asRecord(draft?.web);

  if (!draft || !overview || !documentPart || !webPart) {
    return false;
  }

  if (draft.version !== 1 && draft.version !== 2 && draft.version !== 3) {
    return false;
  }

  return (
    isNonEmptyString(overview.planId) &&
    isNonEmptyString(overview.title) &&
    isNonEmptyString(overview.subtitle) &&
    isNonEmptyString(overview.referenceNo) &&
    isNonEmptyString(overview.planCode) &&
    isNonEmptyString(overview.status) &&
    isNonEmptyString(overview.startDateLabel) &&
    isNonEmptyString(overview.endDateLabel) &&
    isNonEmptyString(overview.routeLabel) &&
    isNonEmptyString(overview.paxLabel) &&
    isNonEmptyString(overview.durationLabel) &&
    Array.isArray(documentPart.pages) &&
    Array.isArray(webPart.sections)
  );
}

function normalizeDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const next = value instanceof Date ? value : new Date(String(value));
  return Number.isFinite(next.getTime()) ? next : null;
}

function formatDateLabel(value: Date | string | null | undefined) {
  const date = normalizeDate(value);
  if (!date) return "TBC";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTimeLabel(value: Date | string | null | undefined) {
  const date = normalizeDate(value);
  if (!date) return null;
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoneyLabel(value: unknown) {
  return toNumber(value).toFixed(2);
}

function createPaxLabel(plan: typeof schema.preTourPlan.$inferSelect) {
  const parts = [`${plan.adults} adult${plan.adults === 1 ? "" : "s"}`];
  if (plan.children > 0) {
    parts.push(`${plan.children} child${plan.children === 1 ? "" : "ren"}`);
  }
  if (plan.infants > 0) {
    parts.push(`${plan.infants} infant${plan.infants === 1 ? "" : "s"}`);
  }
  return parts.join(" • ");
}

function createDurationLabel(plan: typeof schema.preTourPlan.$inferSelect) {
  const nights = Number(plan.totalNights || 0);
  return `${nights + 1} days / ${nights} nights`;
}

function createRouteStops(input: {
  days: Array<typeof schema.preTourPlanDay.$inferSelect>;
  dayItemsByDayId: Map<string, Array<typeof schema.preTourPlanItem.$inferSelect>>;
  locationsById: Map<string, typeof schema.transportLocation.$inferSelect>;
  stays: ItineraryStaySummary[];
}) {
  const seen = new Set<string>();
  const ordered: string[] = [];

  const push = (value: string | null | undefined) => {
    const label = String(value || "").trim();
    if (!label || seen.has(label)) return;
    seen.add(label);
    ordered.push(label);
  };

  for (const day of input.days) {
    push(input.locationsById.get(String(day.startLocationId || ""))?.name);
    for (const item of input.dayItemsByDayId.get(day.id) ?? []) {
      if (String(item.itemType || "").toUpperCase() === "TRANSPORT") {
        push(input.locationsById.get(String(item.fromLocationId || ""))?.name);
        push(input.locationsById.get(String(item.toLocationId || ""))?.name);
      }
      if (String(item.itemType || "").toUpperCase() === "ACTIVITY") {
        push(input.locationsById.get(String(item.locationId || ""))?.name);
      }
    }
    push(input.locationsById.get(String(day.endLocationId || ""))?.name);
  }

  if (ordered.length === 0) {
    for (const stay of input.stays) {
      push([stay.city, stay.country].filter(Boolean).join(", "));
    }
  }

  return ordered;
}

function buildMediaRoute(assetId: string) {
  return `/api/media/assets/${assetId}/file`;
}

function pickFirstNonNull<T>(values: Array<T | null | undefined>) {
  for (const value of values) {
    if (value) return value;
  }
  return null;
}

function toIsoString(value: Date | string | null | undefined) {
  const date = normalizeDate(value);
  return date ? date.toISOString() : null;
}

function buildPublicBaseUrl() {
  return (process.env.BETTER_AUTH_URL?.trim() || "http://localhost:3000").replace(/\/+$/, "");
}

function buildPublicShareUrl(token: string) {
  return `${buildPublicBaseUrl()}/i/${token}`;
}

function hashShareToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createShareToken() {
  return randomBytes(24).toString("base64url");
}

function buildAnchorLabel(input: { family: string; title?: string | null; ordinal?: number | null }) {
  if (input.ordinal && input.title) {
    return `${input.title} ${input.ordinal}`;
  }
  if (input.ordinal) {
    return `${input.family} ${input.ordinal}`;
  }
  return input.title || input.family;
}

function buildExportFileName(itineraryCode: string, versionNumber: number, format: "PDF" | "DOCX") {
  return format === "PDF"
    ? `${itineraryCode}-v${versionNumber}-pdf-hook.html`
    : `${itineraryCode}-v${versionNumber}-docx-hook.json`;
}

function withMediaRole(
  media: ItineraryMediaRef | null | undefined,
  role: NonNullable<ItineraryMediaRef["role"]>
): ItineraryMediaRef | null {
  return media
    ? {
        ...media,
        role,
      }
    : null;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isMediaRef(value: unknown): value is ItineraryMediaRef {
  return (
    !!value &&
    typeof value === "object" &&
    "kind" in value &&
    "src" in value &&
    "alt" in value
  );
}

function collectAssetIds(value: unknown, bucket: Set<string>) {
  if (!value) return;
  if (Array.isArray(value)) {
    for (const item of value) collectAssetIds(item, bucket);
    return;
  }
  if (isMediaRef(value)) {
    if (value.kind === "ASSET" && value.assetId) {
      bucket.add(value.assetId);
    }
    return;
  }
  if (typeof value === "object") {
    for (const next of Object.values(value as Record<string, unknown>)) {
      collectAssetIds(next, bucket);
    }
  }
}

function rewriteMediaRefsForPublicShare<T>(value: T, assetUrlById: Map<string, string>): T {
  if (Array.isArray(value)) {
    return value.map((item) => rewriteMediaRefsForPublicShare(item, assetUrlById)) as T;
  }
  if (isMediaRef(value)) {
    if (value.kind !== "ASSET") return value;
    const readUrl = value.assetId ? assetUrlById.get(value.assetId) : null;
    if (!readUrl) return null as T;
    return {
      ...value,
      kind: "URL",
      src: readUrl,
    } as T;
  }
  if (value && typeof value === "object") {
    const nextEntries = Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      rewriteMediaRefsForPublicShare(entry, assetUrlById),
    ]);
    return Object.fromEntries(nextEntries) as T;
  }
  return value;
}

function buildDocumentExportHtml(input: {
  itinerary: typeof schema.itinerary.$inferSelect;
  versionNumber: number;
  template: ItineraryTemplateDescriptor | null;
  draft: ItineraryStructuredDraft;
}) {
  const pageMarkup = input.draft.document.pages
    .map((page) => {
      switch (page.family) {
        case "COVER":
          return `
            <section class="page cover">
              <p class="eyebrow">${escapeHtml(page.anchorLabel)}</p>
              <h1>${escapeHtml(page.title)}</h1>
              <p class="subtitle">${escapeHtml(page.subtitle)}</p>
              <p class="meta">${page.meta.map(escapeHtml).join(" • ")}</p>
              ${page.routeLabel ? `<p class="route">${escapeHtml(page.routeLabel)}</p>` : ""}
            </section>
          `;
        case "TRIP_SUMMARY":
          return `
            <section class="page">
              <p class="eyebrow">${escapeHtml(page.anchorLabel)}</p>
              <h2>${escapeHtml(page.title)}</h2>
              <ul>${page.facts
                .map((fact) => `<li><strong>${escapeHtml(fact.label)}:</strong> ${escapeHtml(fact.value)}</li>`)
                .join("")}</ul>
            </section>
          `;
        case "DAY_DETAIL":
          return `
            <section class="page">
              <p class="eyebrow">${escapeHtml(page.anchorLabel)}</p>
              <h2>${escapeHtml(page.day.title)}</h2>
              <p class="meta">${escapeHtml(page.day.dateLabel)}${page.day.routeLabel ? ` • ${escapeHtml(page.day.routeLabel)}` : ""}</p>
              <p>${escapeHtml(page.day.narrative || "")}</p>
              <ol>${page.day.items
                .map(
                  (item) => `
                    <li>
                      <strong>${escapeHtml(item.title)}</strong>
                      ${item.timeLabel ? `<span> (${escapeHtml(item.timeLabel)})</span>` : ""}
                      ${item.summary ? `<p>${escapeHtml(item.summary)}</p>` : ""}
                    </li>
                  `
                )
                .join("")}</ol>
            </section>
          `;
        case "ACCOMMODATION_SUMMARY":
          return `
            <section class="page">
              <p class="eyebrow">${escapeHtml(page.anchorLabel)}</p>
              <h2>${escapeHtml(page.title)}</h2>
              <ul>${page.stays
                .map((stay) => `<li>${escapeHtml(stay.name)} • ${stay.nights} night(s)</li>`)
                .join("")}</ul>
            </section>
          `;
        case "TRANSPORT_SUMMARY":
          return `
            <section class="page">
              <p class="eyebrow">${escapeHtml(page.anchorLabel)}</p>
              <h2>${escapeHtml(page.title)}</h2>
              <ul>${page.transfers
                .map(
                  (transfer) =>
                    `<li>${escapeHtml(transfer.title)} • ${escapeHtml(
                      [transfer.fromLabel, transfer.toLabel].filter(Boolean).join(" -> ")
                    )}</li>`
                )
                .join("")}</ul>
            </section>
          `;
        case "PRICING_SUMMARY":
          return `
            <section class="page">
              <p class="eyebrow">${escapeHtml(page.anchorLabel)}</p>
              <h2>${escapeHtml(page.title)}</h2>
              <p><strong>${escapeHtml(page.pricing.currencyCode)} ${escapeHtml(page.pricing.grandTotal)}</strong></p>
              <p>${escapeHtml(page.pricing.estimatedPerGuestLabel || "")}</p>
            </section>
          `;
        case "POLICY_NOTES":
          return `
            <section class="page">
              <p class="eyebrow">${escapeHtml(page.anchorLabel)}</p>
              <h2>${escapeHtml(page.title)}</h2>
              ${page.blocks
                .map(
                  (block) => `
                    <article>
                      <h3>${escapeHtml(block.title)}</h3>
                      <ul>${block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
                    </article>
                  `
                )
                .join("")}
            </section>
          `;
        case "ROUTE_OVERVIEW":
          return `
            <section class="page">
              <p class="eyebrow">${escapeHtml(page.anchorLabel)}</p>
              <h2>${escapeHtml(page.title)}</h2>
              <p>${escapeHtml(page.summary)}</p>
              <ol>${page.routeStops.map((stop) => `<li>${escapeHtml(stop)}</li>`).join("")}</ol>
            </section>
          `;
        case "HIGHLIGHTS":
          return `
            <section class="page">
              <p class="eyebrow">${escapeHtml(page.anchorLabel)}</p>
              <h2>${escapeHtml(page.title)}</h2>
              <ul>${page.items.map((item) => `<li>${escapeHtml(item.title)}</li>`).join("")}</ul>
            </section>
          `;
      }
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(input.itinerary.title)} • Export Hook</title>
    <style>
      body { font-family: Georgia, "Times New Roman", serif; margin: 0; background: #f5f1ea; color: #1e2933; }
      main { max-width: 980px; margin: 0 auto; padding: 32px 20px 48px; }
      .hero { margin-bottom: 24px; padding: 24px 28px; border-radius: 24px; background: #17343b; color: #fff; }
      .page { page-break-after: always; margin-bottom: 18px; padding: 24px 28px; border-radius: 24px; background: #fff; box-shadow: 0 4px 18px rgba(19, 31, 38, 0.08); }
      .cover { min-height: 360px; }
      .eyebrow { margin: 0 0 8px; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; opacity: 0.72; }
      h1, h2, h3, p { margin-top: 0; }
      .subtitle, .meta, .route { color: rgba(255,255,255,0.82); }
      ul, ol { padding-left: 20px; }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <p class="eyebrow">Prepared ${escapeHtml(input.template?.title || "Itinerary")} export hook</p>
        <h1>${escapeHtml(input.itinerary.title)}</h1>
        <p class="meta">Version ${input.versionNumber} • ${escapeHtml(
          input.draft.overview.referenceNo
        )} • ${escapeHtml(input.draft.overview.routeLabel)}</p>
      </section>
      ${pageMarkup}
    </main>
  </body>
</html>`;
}

function createPolicyBlocks(input: {
  includePolicies: boolean;
  includeCommercials: boolean;
  hasTransport: boolean;
  hasAccommodation: boolean;
  hasActivities: boolean;
  hasGuides: boolean;
  currencyCode: string;
}) {
  const included: string[] = [];
  if (input.hasAccommodation) included.push("Accommodation services currently allocated in the pre-tour program.");
  if (input.hasTransport) included.push("Transport sectors and transfer planning currently allocated in the program.");
  if (input.hasActivities) included.push("Sightseeing and activity elements already attached to the daily plan.");
  if (input.hasGuides) included.push("Guide support captured in the operational planning records.");
  if (included.length === 0) {
    included.push("Services confirmed in the final quotation and supplier reconfirmation set.");
  }

  const blocks: ItineraryPolicyBlock[] = [
    {
      title: "Inclusions Snapshot",
      items: included,
    },
  ];

  if (input.includeCommercials) {
    blocks.push({
      title: "Commercial Notes",
      items: [
        `All quoted values are currently expressed in ${input.currencyCode} and remain subject to final confirmation.`,
        "Taxes, supplier availability, and exchange conditions should be reconfirmed before release to the traveler.",
      ],
    });
  }

  if (input.includePolicies) {
    blocks.push({
      title: "Travel Notes",
      items: [
        "Operational timings, check-in windows, and supplier sequencing should be treated as draft until reconfirmed.",
        "Cancellation, payment, and amendment policies should follow the final company and supplier policy pack.",
        "Special requests, accessibility needs, and meal requirements should be validated before client release.",
      ],
    });
  }

  return blocks;
}

function toSummaryRecord(record: typeof schema.itinerary.$inferSelect): ItinerarySummaryRecord {
  return {
    id: record.id,
    code: record.code,
    title: record.title,
    status: record.status,
    planId: record.planId,
    templateKey: record.templateKey,
    outputMode: record.outputMode,
    currentVersionNumber: record.currentVersionNumber,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function toExportRecord(
  record: typeof schema.itineraryExport.$inferSelect,
  versionNumber: number
): ItineraryExportRecord {
  return {
    id: record.id,
    itineraryId: record.itineraryId,
    versionNumber,
    format: record.format,
    status: record.status,
    fileName: record.fileName,
    createdAt: record.createdAt.toISOString(),
    downloadUrl: `/api/itineraries/${record.itineraryId}/exports/${record.id}/download`,
  };
}

function toShareRecord(
  record: typeof schema.itineraryShare.$inferSelect,
  versionNumber: number,
  shareUrl: string | null
): ItineraryShareRecord {
  return {
    id: record.id,
    itineraryId: record.itineraryId,
    versionNumber,
    surface: record.surface,
    shareUrl,
    tokenHint: record.tokenHint,
    revokedAt: toIsoString(record.revokedAt),
    expiresAt: toIsoString(record.expiresAt),
    createdAt: record.createdAt.toISOString(),
  };
}

async function getItineraryAccess(headers: Headers, options?: { write?: boolean }) {
  try {
    const access = await resolveAccess(headers, { requiredPrivilege: "SCREEN_PRE_TOURS" });
    if (options?.write && (access.readOnly || !access.canWritePreTour)) {
      throw new ItineraryError(
        403,
        "PERMISSION_DENIED",
        "You do not have write access for itinerary creation."
      );
    }
    return access;
  } catch (error) {
    if (error instanceof AccessControlError) {
      throw new ItineraryError(error.status, error.code, error.message);
    }
    throw error;
  }
}

async function getPlanOrThrow(companyId: string, planId: string) {
  const [plan] = await db
    .select()
    .from(schema.preTourPlan)
    .where(
      and(
        eq(schema.preTourPlan.id, planId),
        eq(schema.preTourPlan.companyId, companyId),
        isNull(schema.preTourPlan.deletedAt)
      )
    )
    .limit(1);

  if (!plan) {
    throw new ItineraryError(404, "NOT_FOUND", "Pre-tour plan not found.");
  }

  return plan;
}

async function loadPlanSource(companyId: string, planId: string) {
  const plan = await getPlanOrThrow(companyId, planId);

  const [days, items, addons, guideAllocations, totals, categoryLinks, technicalVisitLinks] =
    await Promise.all([
      db
        .select()
        .from(schema.preTourPlanDay)
        .where(
          and(
            eq(schema.preTourPlanDay.companyId, companyId),
            eq(schema.preTourPlanDay.planId, planId)
          )
        )
        .orderBy(schema.preTourPlanDay.dayNumber),
      db
        .select()
        .from(schema.preTourPlanItem)
        .where(
          and(
            eq(schema.preTourPlanItem.companyId, companyId),
            eq(schema.preTourPlanItem.planId, planId)
          )
        )
        .orderBy(schema.preTourPlanItem.dayId, schema.preTourPlanItem.sortOrder, schema.preTourPlanItem.createdAt),
      db
        .select()
        .from(schema.preTourPlanItemAddon)
        .where(
          and(
            eq(schema.preTourPlanItemAddon.companyId, companyId),
            eq(schema.preTourPlanItemAddon.planId, planId)
          )
        )
        .orderBy(desc(schema.preTourPlanItemAddon.createdAt)),
      db
        .select()
        .from(schema.preTourPlanGuideAllocation)
        .where(
          and(
            eq(schema.preTourPlanGuideAllocation.companyId, companyId),
            eq(schema.preTourPlanGuideAllocation.planId, planId)
          )
        )
        .orderBy(schema.preTourPlanGuideAllocation.createdAt),
      db
        .select()
        .from(schema.preTourPlanTotal)
        .where(
          and(
            eq(schema.preTourPlanTotal.companyId, companyId),
            eq(schema.preTourPlanTotal.planId, planId)
          )
        )
        .limit(1),
      db
        .select()
        .from(schema.preTourPlanCategory)
        .where(
          and(
            eq(schema.preTourPlanCategory.companyId, companyId),
            eq(schema.preTourPlanCategory.planId, planId)
          )
        ),
      db
        .select()
        .from(schema.preTourPlanTechnicalVisit)
        .where(
          and(
            eq(schema.preTourPlanTechnicalVisit.companyId, companyId),
            eq(schema.preTourPlanTechnicalVisit.planId, planId)
          )
        ),
    ]);

  const hotelIds = Array.from(
    new Set(
      items
        .filter((item) => String(item.itemType || "").toUpperCase() === "ACCOMMODATION")
        .map((item) => String(item.serviceId || ""))
        .filter(Boolean)
    )
  );
  const activityIds = Array.from(
    new Set(
      items
        .filter((item) => String(item.itemType || "").toUpperCase() === "ACTIVITY")
        .map((item) => String(item.serviceId || ""))
        .filter(Boolean)
    )
  );
  const guideIds = Array.from(
    new Set(
      [
        ...items
          .filter((item) => String(item.itemType || "").toUpperCase() === "GUIDE")
          .map((item) => String(item.serviceId || "")),
        ...guideAllocations.map((allocation) => String(allocation.serviceId || "")),
      ].filter(Boolean)
    )
  );
  const vehicleTypeIds = Array.from(
    new Set(
      items
        .filter((item) => String(item.itemType || "").toUpperCase() === "TRANSPORT")
        .map((item) => String(item.serviceId || ""))
        .filter(Boolean)
    )
  );
  const locationIds = Array.from(
    new Set(
      [
        ...days.flatMap((day) => [day.startLocationId, day.endLocationId]),
        ...items.flatMap((item) => [item.fromLocationId, item.toLocationId, item.locationId]),
      ]
        .map((value) => String(value || ""))
        .filter(Boolean)
    )
  );
  const orgIds = Array.from(
    new Set([String(plan.operatorOrgId || ""), String(plan.marketOrgId || "")].filter(Boolean))
  );
  const categoryIds = Array.from(
    new Set([String(plan.categoryId || ""), ...categoryLinks.map((link) => String(link.categoryId || ""))].filter(Boolean))
  );

  const [
    hotels,
    hotelImages,
    activities,
    activityImages,
    locations,
    guides,
    vehicleTypes,
    orgs,
    categories,
    mediaAssets,
  ] = await Promise.all([
    hotelIds.length
      ? db
          .select()
          .from(schema.hotel)
          .where(and(eq(schema.hotel.companyId, companyId), inArray(schema.hotel.id, hotelIds)))
      : Promise.resolve([]),
    hotelIds.length
      ? db
          .select()
          .from(schema.hotelImage)
          .where(inArray(schema.hotelImage.hotelId, hotelIds))
          .orderBy(desc(schema.hotelImage.isPrimary), schema.hotelImage.order, schema.hotelImage.createdAt)
      : Promise.resolve([]),
    activityIds.length
      ? db
          .select()
          .from(schema.activity)
          .where(and(eq(schema.activity.companyId, companyId), inArray(schema.activity.id, activityIds)))
      : Promise.resolve([]),
    activityIds.length
      ? db
          .select()
          .from(schema.activityImage)
          .where(and(eq(schema.activityImage.companyId, companyId), inArray(schema.activityImage.activityId, activityIds)))
          .orderBy(desc(schema.activityImage.isCover), schema.activityImage.sortOrder, schema.activityImage.createdAt)
      : Promise.resolve([]),
    locationIds.length
      ? db
          .select()
          .from(schema.transportLocation)
          .where(
            and(
              eq(schema.transportLocation.companyId, companyId),
              inArray(schema.transportLocation.id, locationIds)
            )
          )
      : Promise.resolve([]),
    guideIds.length
      ? db
          .select()
          .from(schema.guide)
          .where(and(eq(schema.guide.companyId, companyId), inArray(schema.guide.id, guideIds)))
      : Promise.resolve([]),
    vehicleTypeIds.length
      ? db
          .select()
          .from(schema.transportVehicleType)
          .where(
            and(
              eq(schema.transportVehicleType.companyId, companyId),
              inArray(schema.transportVehicleType.id, vehicleTypeIds)
            )
          )
      : Promise.resolve([]),
    orgIds.length
      ? db
          .select()
          .from(schema.businessOrganization)
          .where(
            and(
              eq(schema.businessOrganization.companyId, companyId),
              inArray(schema.businessOrganization.id, orgIds)
            )
          )
      : Promise.resolve([]),
    categoryIds.length
      ? db
          .select()
          .from(schema.tourCategory)
          .where(
            and(
              eq(schema.tourCategory.companyId, companyId),
              inArray(schema.tourCategory.id, categoryIds)
            )
          )
      : Promise.resolve([]),
    (async () => {
      try {
        const result: Array<typeof schema.mediaAsset.$inferSelect> = [];

        if (hotelIds.length) {
          result.push(
            ...(await db
              .select()
              .from(schema.mediaAsset)
              .where(
                and(
                  eq(schema.mediaAsset.companyId, companyId),
                  eq(schema.mediaAsset.entityType, "ACCOMMODATION_HOTEL"),
                  inArray(schema.mediaAsset.entityId, hotelIds),
                  eq(schema.mediaAsset.isActive, true),
                  eq(schema.mediaAsset.reviewStatus, "APPROVED")
                )
              )
              .orderBy(desc(schema.mediaAsset.isPrimary), desc(schema.mediaAsset.createdAt)))
          );
        }

        if (activityIds.length) {
          result.push(
            ...(await db
              .select()
              .from(schema.mediaAsset)
              .where(
                and(
                  eq(schema.mediaAsset.companyId, companyId),
                  eq(schema.mediaAsset.entityType, "ACTIVITY"),
                  inArray(schema.mediaAsset.entityId, activityIds),
                  eq(schema.mediaAsset.isActive, true),
                  eq(schema.mediaAsset.reviewStatus, "APPROVED")
                )
              )
              .orderBy(desc(schema.mediaAsset.isPrimary), desc(schema.mediaAsset.createdAt)))
          );
        }

        if (locationIds.length) {
          result.push(
            ...(await db
              .select()
              .from(schema.mediaAsset)
              .where(
                and(
                  eq(schema.mediaAsset.companyId, companyId),
                  eq(schema.mediaAsset.entityType, "TRANSPORT_LOCATION"),
                  inArray(schema.mediaAsset.entityId, locationIds),
                  eq(schema.mediaAsset.isActive, true),
                  eq(schema.mediaAsset.reviewStatus, "APPROVED")
                )
              )
              .orderBy(desc(schema.mediaAsset.isPrimary), desc(schema.mediaAsset.createdAt)))
          );
        }

        return result;
      } catch (error) {
        logger.warn("itinerary_media_asset_query_fallback", {
          feature: "itinerary",
          companyId,
          metadata: {
            planId,
            message: error instanceof Error ? error.message : String(error),
          },
        });
        return [];
      }
    })(),
  ]);

  return {
    plan,
    days,
    items,
    addons,
    guideAllocations,
    totals: totals[0] ?? null,
    categoryLinks,
    technicalVisitLinks,
    hotels,
    hotelImages,
    activities,
    activityImages,
    locations,
    guides,
    vehicleTypes,
    orgs,
    categories,
    mediaAssets,
  };
}

async function getItineraryWithCurrentVersion(
  companyId: string,
  itineraryId: string
): Promise<{
  itinerary: typeof schema.itinerary.$inferSelect;
  currentVersion: Omit<typeof schema.itineraryVersion.$inferSelect, "structuredDraft"> & {
    structuredDraft: ItineraryStructuredDraft;
  };
}> {
  const [itinerary] = await db
    .select()
    .from(schema.itinerary)
    .where(and(eq(schema.itinerary.id, itineraryId), eq(schema.itinerary.companyId, companyId)))
    .limit(1);

  if (!itinerary) {
    throw new ItineraryError(404, "NOT_FOUND", "Itinerary not found.");
  }

  const [currentVersion] = await db
    .select()
    .from(schema.itineraryVersion)
    .where(
      and(
        eq(schema.itineraryVersion.companyId, companyId),
        eq(schema.itineraryVersion.itineraryId, itineraryId),
        eq(schema.itineraryVersion.versionNumber, itinerary.currentVersionNumber)
      )
    )
    .limit(1);

  if (!currentVersion?.structuredDraft) {
    throw new ItineraryError(404, "VERSION_NOT_FOUND", "Itinerary draft version not found.");
  }

  return {
    itinerary,
    currentVersion: {
      ...currentVersion,
      structuredDraft: currentVersion.structuredDraft,
    },
  };
}

async function listExportRecords(companyId: string, itineraryId: string) {
  const rows = await db
    .select()
    .from(schema.itineraryExport)
    .where(
      and(
        eq(schema.itineraryExport.companyId, companyId),
        eq(schema.itineraryExport.itineraryId, itineraryId)
      )
    )
    .orderBy(desc(schema.itineraryExport.createdAt));

  if (!rows.length) return [];

  const versionIds = Array.from(new Set(rows.map((row) => row.itineraryVersionId)));
  const versions = await db
    .select({ id: schema.itineraryVersion.id, versionNumber: schema.itineraryVersion.versionNumber })
    .from(schema.itineraryVersion)
    .where(
      and(
        eq(schema.itineraryVersion.companyId, companyId),
        inArray(schema.itineraryVersion.id, versionIds)
      )
    );
  const versionNumberById = new Map(versions.map((version) => [version.id, version.versionNumber]));

  return rows.map((row) => toExportRecord(row, versionNumberById.get(row.itineraryVersionId) ?? 1));
}

async function listShareRecords(companyId: string, itineraryId: string) {
  const rows = await db
    .select()
    .from(schema.itineraryShare)
    .where(
      and(
        eq(schema.itineraryShare.companyId, companyId),
        eq(schema.itineraryShare.itineraryId, itineraryId)
      )
    )
    .orderBy(desc(schema.itineraryShare.createdAt));

  if (!rows.length) return [];

  const versionIds = Array.from(new Set(rows.map((row) => row.itineraryVersionId)));
  const versions = await db
    .select({ id: schema.itineraryVersion.id, versionNumber: schema.itineraryVersion.versionNumber })
    .from(schema.itineraryVersion)
    .where(
      and(
        eq(schema.itineraryVersion.companyId, companyId),
        inArray(schema.itineraryVersion.id, versionIds)
      )
    );
  const versionNumberById = new Map(versions.map((version) => [version.id, version.versionNumber]));

  return rows.map((row) => toShareRecord(row, versionNumberById.get(row.itineraryVersionId) ?? 1, null));
}

function buildStructuredDraft(
  input: Awaited<ReturnType<typeof loadPlanSource>>,
  template: ItineraryTemplateDescriptor,
  options: ItineraryGenerationOptions
) {
  const hotelsById = new Map(input.hotels.map((hotel) => [hotel.id, hotel]));
  const activitiesById = new Map(input.activities.map((activity) => [activity.id, activity]));
  const locationsById = new Map(input.locations.map((location) => [location.id, location]));
  const guidesById = new Map(input.guides.map((guide) => [guide.id, guide]));
  const vehicleTypesById = new Map(input.vehicleTypes.map((vehicleType) => [vehicleType.id, vehicleType]));
  const orgsById = new Map(input.orgs.map((org) => [org.id, org]));
  const categoriesById = new Map(input.categories.map((category) => [category.id, category]));
  const itemAddonsByItemId = new Map<string, Array<typeof schema.preTourPlanItemAddon.$inferSelect>>();
  const dayItemsByDayId = new Map<string, Array<typeof schema.preTourPlanItem.$inferSelect>>();

  for (const addon of input.addons) {
    const existing = itemAddonsByItemId.get(addon.planItemId) ?? [];
    existing.push(addon);
    itemAddonsByItemId.set(addon.planItemId, existing);
  }

  for (const item of input.items) {
    const existing = dayItemsByDayId.get(item.dayId) ?? [];
    existing.push(item);
    dayItemsByDayId.set(item.dayId, existing);
  }

  const assetMediaByEntityKey = new Map<string, Array<typeof schema.mediaAsset.$inferSelect>>();
  for (const asset of input.mediaAssets) {
    const key = `${asset.entityType}:${asset.entityId}`;
    const bucket = assetMediaByEntityKey.get(key) ?? [];
    bucket.push(asset);
    assetMediaByEntityKey.set(key, bucket);
  }

  const scoreAssetForRole = (
    asset: typeof schema.mediaAsset.$inferSelect,
    role: NonNullable<ItineraryMediaRef["role"]>
  ) => {
    let score = 0;
    if (asset.useInItinerary) score += 100;
    if (asset.safeForCustomerShare) score += 30;
    if (role === "HERO" && asset.eligibleForItineraryHero) score += 60;
    if (role === "GALLERY" && asset.eligibleForItineraryGallery) score += 50;
    if (asset.isPrimary) score += 10;
    score += asset.itineraryPriority * 5;
    return score;
  };

  const createAssetMediaRef = (
    asset: typeof schema.mediaAsset.$inferSelect,
    role: NonNullable<ItineraryMediaRef["role"]>
  ): ItineraryMediaRef => ({
    kind: "ASSET",
    src: buildMediaRoute(asset.id),
    alt: asset.altText || asset.caption || asset.originalFileName,
    caption: asset.caption,
    assetId: asset.id,
    entityType: asset.entityType,
    entityId: asset.entityId,
    shareSafe: asset.safeForCustomerShare,
    role,
  });

  const pickEntityAssetMedia = (
    entityType: string,
    entityId: string | null | undefined,
    role: NonNullable<ItineraryMediaRef["role"]>
  ) => {
    if (!entityId) return null;
    const assets = assetMediaByEntityKey.get(`${entityType}:${entityId}`) ?? [];
    if (!assets.length) return null;
    const selected = [...assets].sort((left, right) => {
      const byScore = scoreAssetForRole(right, role) - scoreAssetForRole(left, role);
      if (byScore !== 0) return byScore;
      return (
        (normalizeDate(right.createdAt)?.getTime() || 0) -
        (normalizeDate(left.createdAt)?.getTime() || 0)
      );
    })[0];
    return selected ? createAssetMediaRef(selected, role) : null;
  };

  const hotelFallbackMediaById = new Map<string, ItineraryMediaRef>();
  for (const image of input.hotelImages) {
    if (hotelFallbackMediaById.has(image.hotelId)) continue;
    hotelFallbackMediaById.set(image.hotelId, {
      kind: "URL",
      src: image.imageUrl,
      alt: image.caption || "Hotel image",
      caption: image.caption,
      shareSafe: null,
      entityType: "ACCOMMODATION_HOTEL",
      entityId: image.hotelId,
      role: "DETAIL",
    });
  }

  const activityFallbackMediaById = new Map<string, ItineraryMediaRef>();
  for (const image of input.activityImages) {
    if (activityFallbackMediaById.has(image.activityId)) continue;
    activityFallbackMediaById.set(image.activityId, {
      kind: "URL",
      src: image.url,
      alt: image.altText || "Activity image",
      shareSafe: null,
      entityType: "ACTIVITY",
      entityId: image.activityId,
      role: "DETAIL",
    });
  }

  const pickHotelMedia = (
    hotelId: string | null | undefined,
    role: NonNullable<ItineraryMediaRef["role"]> = "DETAIL"
  ) =>
    pickFirstNonNull([
      pickEntityAssetMedia("ACCOMMODATION_HOTEL", hotelId, role),
      hotelId ? withMediaRole(hotelFallbackMediaById.get(hotelId), role) : null,
    ]);

  const pickActivityMedia = (
    activityId: string | null | undefined,
    role: NonNullable<ItineraryMediaRef["role"]> = "DETAIL"
  ) =>
    pickFirstNonNull([
      pickEntityAssetMedia("ACTIVITY", activityId, role),
      activityId ? withMediaRole(activityFallbackMediaById.get(activityId), role) : null,
    ]);

  const pickLocationMedia = (
    locationId: string | null | undefined,
    role: NonNullable<ItineraryMediaRef["role"]> = "DETAIL"
  ) => pickEntityAssetMedia("TRANSPORT_LOCATION", locationId, role);

  const stayRollup = new Map<
    string,
    {
      id: string;
      hotelId?: string | null;
      name: string;
      city?: string | null;
      country?: string | null;
      starLabel?: string | null;
      nights: number;
      mealPlan?: string | null;
      roomSummary?: string | null;
      image?: ItineraryMediaRef | null;
    }
  >();

  const transfers: ItineraryTransferSummary[] = [];
  const dayBlocks: ItineraryDayBlock[] = input.days.map((day) => {
    const items = dayItemsByDayId.get(day.id) ?? [];

    const dayItemEntries: ItineraryDayItem[] = items.map((item) => {
      const snapshot = asRecord(item.pricingSnapshot);
      const dimensions = asRecord(snapshot?.dimensions);
      const itemType = String(item.itemType || "MISC").toUpperCase();

      if (itemType === "ACCOMMODATION") {
        const hotel = hotelsById.get(String(item.serviceId || ""));
        const roomBasis = typeof dimensions?.roomBasis === "string" ? dimensions.roomBasis : null;
        const roomSummary = asArray<Record<string, unknown>>(item.rooms)
          .map((room) => `${toNumber(room.count)} x ${String(room.roomType || "Room")}`)
          .join(", ");
        const stayKey = hotel?.id || item.id;
        const existingStay = stayRollup.get(stayKey);
        const nextStay: ItineraryStaySummary = {
          id: stayKey,
          hotelId: hotel?.id ?? null,
          name: hotel?.name || String(item.title || "Accommodation"),
          city: hotel?.city || null,
          country: hotel?.country || null,
          starLabel: hotel?.starRating ? `${hotel.starRating}-star stay` : null,
          nights: toNumber(item.nights || dimensions?.nights || 1),
          mealPlan: roomBasis || input.plan.mealPreference || null,
          roomSummary: roomSummary || null,
          image: options.includeMedia ? pickHotelMedia(hotel?.id, "CARD") : null,
        };
        stayRollup.set(stayKey, {
          ...nextStay,
          nights: (existingStay?.nights ?? 0) + nextStay.nights,
        });
        return {
          id: item.id,
          type: itemType,
          title: hotel?.name || String(item.title || "Accommodation"),
          timeLabel: formatDateLabel(item.startAt),
          summary: [roomBasis, roomSummary].filter(Boolean).join(" • ") || hotel?.description || item.description,
          amountLabel: `${item.currencyCode} ${formatMoneyLabel(item.totalAmount)}`,
          image: options.includeMedia ? pickHotelMedia(hotel?.id, "CARD") : null,
        };
      }

      if (itemType === "ACTIVITY") {
        const activity = activitiesById.get(String(item.serviceId || ""));
        const location = activity?.locationId ? locationsById.get(activity.locationId) : null;
        return {
          id: item.id,
          type: itemType,
          title: activity?.name || String(item.title || "Activity"),
          timeLabel: formatDateTimeLabel(item.startAt),
          routeLabel: location?.name || null,
          summary:
            activity?.shortDescription ||
            activity?.description ||
            item.description ||
            asArray<typeof schema.preTourPlanItemAddon.$inferSelect>(itemAddonsByItemId.get(item.id)).map((addon) => addon.title).join(", "),
          amountLabel: `${item.currencyCode} ${formatMoneyLabel(item.totalAmount)}`,
          image: options.includeMedia ? pickActivityMedia(activity?.id, "CARD") : null,
        };
      }

      if (itemType === "TRANSPORT") {
        const vehicleType = vehicleTypesById.get(String(item.serviceId || ""));
        const fromLabel = locationsById.get(String(item.fromLocationId || ""))?.name || "Start";
        const toLabel = locationsById.get(String(item.toLocationId || ""))?.name || "End";
        transfers.push({
          id: item.id,
          title: String(item.title || "Transfer"),
          fromLabel,
          toLabel,
          vehicleLabel: vehicleType?.name || null,
          startLabel: formatDateTimeLabel(item.startAt),
          endLabel: formatDateTimeLabel(item.endAt),
          notes: item.description || null,
        });
        return {
          id: item.id,
          type: itemType,
          title: String(item.title || `${fromLabel} to ${toLabel}`),
          timeLabel: formatDateTimeLabel(item.startAt),
          routeLabel: `${fromLabel} → ${toLabel}`,
          summary: vehicleType?.name || item.description || null,
          amountLabel: `${item.currencyCode} ${formatMoneyLabel(item.totalAmount)}`,
          image: options.includeMedia
            ? pickFirstNonNull([
                pickLocationMedia(String(item.toLocationId || ""), "CARD"),
                pickLocationMedia(String(item.fromLocationId || ""), "CARD"),
              ])
            : null,
        };
      }

      if (itemType === "GUIDE") {
        const guide = guidesById.get(String(item.serviceId || ""));
        return {
          id: item.id,
          type: itemType,
          title: guide?.displayName || guide?.fullName || String(item.title || "Guide service"),
          timeLabel: null,
          summary: item.description || guide?.bio || item.notes || null,
          amountLabel: `${item.currencyCode} ${formatMoneyLabel(item.totalAmount)}`,
          image: null,
        };
      }

      return {
        id: item.id,
        type: itemType,
        title: String(item.title || item.itemType || "Service"),
        timeLabel: formatDateTimeLabel(item.startAt),
        summary: item.description || item.notes || null,
        amountLabel: `${item.currencyCode} ${formatMoneyLabel(item.totalAmount)}`,
        image: null,
      };
    });

    const routeStart = locationsById.get(String(day.startLocationId || ""))?.name || null;
    const routeEnd = locationsById.get(String(day.endLocationId || ""))?.name || null;
    const routeLabel =
      routeStart && routeEnd ? `${routeStart} → ${routeEnd}` : routeStart || routeEnd || null;
    const accommodationItem = items.find((item) => String(item.itemType || "").toUpperCase() === "ACCOMMODATION");
    const activityItem = items.find((item) => String(item.itemType || "").toUpperCase() === "ACTIVITY");
    const heroImage = options.includeMedia
      ? pickFirstNonNull([
          accommodationItem ? pickHotelMedia(String(accommodationItem.serviceId || ""), "HERO") : null,
          activityItem ? pickActivityMedia(String(activityItem.serviceId || ""), "HERO") : null,
          pickLocationMedia(String(day.endLocationId || day.startLocationId || ""), "HERO"),
        ])
      : null;

    return {
      id: day.id,
      dayNumber: day.dayNumber,
      dateLabel: formatDateLabel(day.date),
      title: day.title || `Day ${day.dayNumber}`,
      routeLabel,
      narrative:
        day.notes ||
        `Experience ${dayItemEntries.length} planned service${dayItemEntries.length === 1 ? "" : "s"} across the day, built from the confirmed pre-tour program draft.`,
      items: dayItemEntries,
      heroImage,
    };
  });

  const stays = Array.from(stayRollup.values());
  const routeStops = createRouteStops({
    days: input.days,
    dayItemsByDayId,
    locationsById,
    stays,
  });
  const routeLabel =
    routeStops.length > 1 ? routeStops.join(" • ") : routeStops[0] || input.plan.title || "Curated route";
  const category = categoriesById.get(String(input.plan.categoryId || ""));
  const operatorOrg = orgsById.get(String(input.plan.operatorOrgId || ""));
  const marketOrg = orgsById.get(String(input.plan.marketOrgId || ""));

  const highlights: ItineraryHighlight[] = [
    ...stays.slice(0, 2).map((stay) => ({
      title: stay.name,
      description:
        [stay.city, stay.country].filter(Boolean).join(", ") || "Accommodation touchpoint in the planned route.",
      eyebrow: "Stay",
      image: withMediaRole(stay.image, "GALLERY"),
    })),
    ...input.items
      .filter((item) => String(item.itemType || "").toUpperCase() === "ACTIVITY")
      .slice(0, 3)
      .map((item) => {
        const activity = activitiesById.get(String(item.serviceId || ""));
        const location = activity?.locationId ? locationsById.get(activity.locationId) : null;
        return {
          title: activity?.name || String(item.title || "Activity"),
          description:
            activity?.shortDescription ||
            activity?.description ||
          location?.name ||
          item.description ||
          "Signature experience selected from the pre-tour program.",
          eyebrow: "Experience",
          image: options.includeMedia ? pickActivityMedia(activity?.id, "GALLERY") : null,
        };
      }),
  ].slice(0, 5);

  const totalsByType = Object.entries(input.totals?.totalsByType || {}).map(([type, values]) => ({
    type,
    base: formatMoneyLabel(values?.base ?? 0),
    tax: formatMoneyLabel(values?.tax ?? 0),
    total: formatMoneyLabel(values?.total ?? 0),
  }));
  const travellingGuests = Math.max(1, toNumber(input.plan.adults) + toNumber(input.plan.children));
  const pricing: ItineraryPricingSummary = {
    currencyCode: input.totals?.currencyCode || input.plan.currencyCode,
    baseTotal: formatMoneyLabel(input.totals?.baseTotal ?? input.plan.baseTotal),
    taxTotal: formatMoneyLabel(input.totals?.taxTotal ?? input.plan.taxTotal),
    grandTotal: formatMoneyLabel(input.totals?.grandTotal ?? input.plan.grandTotal),
    estimatedPerGuestLabel: `${(toNumber(input.totals?.grandTotal ?? input.plan.grandTotal) / travellingGuests).toFixed(2)} per travelling guest`,
    totalsByType,
  };

  const heroImage = options.includeMedia
    ? pickFirstNonNull([
        stays[0]?.hotelId ? pickHotelMedia(stays[0].hotelId, "HERO") : stays[0]?.image,
        highlights[0]?.image,
        routeStops[0]
          ? pickLocationMedia(
              String(input.locations.find((location) => location.name === routeStops[0])?.id || ""),
              "HERO"
            )
          : null,
      ])
    : null;

  const facts = [
    { label: "Travel Window", value: `${formatDateLabel(input.plan.startDate)} - ${formatDateLabel(input.plan.endDate)}` },
    { label: "Duration", value: createDurationLabel(input.plan) },
    { label: "Guests", value: createPaxLabel(input.plan) },
    { label: "Currency", value: input.plan.currencyCode },
    { label: "Plan Status", value: String(input.plan.status || "DRAFT") },
    { label: "Preferred Language", value: input.plan.preferredLanguage || "TBC" },
  ];

  const policyBlocks = createPolicyBlocks({
    includePolicies: options.includePolicies,
    includeCommercials: options.includeCommercials,
    hasTransport: transfers.length > 0,
    hasAccommodation: stays.length > 0,
    hasActivities: highlights.some((highlight) => highlight.eyebrow === "Experience"),
    hasGuides: input.guideAllocations.length > 0,
    currencyCode: input.plan.currencyCode,
  });

  const documentPages: ItineraryDocumentPage[] = [];
  for (const composition of template.pageComposition.document) {
    switch (composition.family) {
      case "COVER":
        documentPages.push({
          id: "cover",
          family: "COVER",
          layoutVariant: composition.layoutVariant,
          anchorLabel: buildAnchorLabel({ family: "Cover", title: "Cover" }),
          title: input.plan.title,
          subtitle: `${createDurationLabel(input.plan)} crafted from the operational pre-tour program`,
          heroImage,
          meta: [input.plan.referenceNo, input.plan.planCode, createPaxLabel(input.plan)],
          routeLabel,
        });
        break;
      case "TRIP_SUMMARY":
        documentPages.push({
          id: "trip-summary",
          family: "TRIP_SUMMARY",
          layoutVariant: composition.layoutVariant,
          anchorLabel: buildAnchorLabel({ family: "Trip Summary", title: "Trip Summary" }),
          title: "Trip Summary",
          facts,
          highlights,
        });
        break;
      case "ROUTE_OVERVIEW":
        documentPages.push({
          id: "route-overview",
          family: "ROUTE_OVERVIEW",
          layoutVariant: composition.layoutVariant,
          anchorLabel: buildAnchorLabel({ family: "Route", title: "Route Overview" }),
          title: "Route Overview",
          routeStops,
          summary:
            routeStops.length > 1
              ? `This itinerary draft currently travels through ${routeStops.join(", ")}.`
              : "This itinerary draft is ready for route enrichment as planning details evolve.",
          image: heroImage,
        });
        break;
      case "HIGHLIGHTS":
        if (highlights.length) {
          documentPages.push({
            id: "highlights",
            family: "HIGHLIGHTS",
            layoutVariant: composition.layoutVariant,
            anchorLabel: buildAnchorLabel({ family: "Highlights", title: "Signature Highlights" }),
            title: "Signature Highlights",
            items: highlights,
          });
        }
        break;
      case "DAY_DETAIL":
        for (const day of dayBlocks) {
          documentPages.push({
            id: `day-${day.dayNumber}`,
            family: "DAY_DETAIL",
            layoutVariant: composition.layoutVariant,
            anchorLabel: buildAnchorLabel({ family: "Day", title: "Day", ordinal: day.dayNumber }),
            title: `Day ${day.dayNumber}`,
            day,
          });
        }
        break;
      case "ACCOMMODATION_SUMMARY":
        if (stays.length) {
          documentPages.push({
            id: "accommodation-summary",
            family: "ACCOMMODATION_SUMMARY",
            layoutVariant: composition.layoutVariant,
            anchorLabel: buildAnchorLabel({ family: "Stay", title: "Accommodation Summary" }),
            title: "Accommodation Summary",
            stays,
          });
        }
        break;
      case "TRANSPORT_SUMMARY":
        if (transfers.length) {
          documentPages.push({
            id: "transport-summary",
            family: "TRANSPORT_SUMMARY",
            layoutVariant: composition.layoutVariant,
            anchorLabel: buildAnchorLabel({ family: "Transport", title: "Transport & Transfers" }),
            title: "Transport & Transfers",
            transfers,
          });
        }
        break;
      case "PRICING_SUMMARY":
        documentPages.push({
          id: "pricing-summary",
          family: "PRICING_SUMMARY",
          layoutVariant: composition.layoutVariant,
          anchorLabel: buildAnchorLabel({ family: "Pricing", title: "Pricing Snapshot" }),
          title: "Pricing Snapshot",
          pricing,
        });
        break;
      case "POLICY_NOTES":
        documentPages.push({
          id: "policy-notes",
          family: "POLICY_NOTES",
          layoutVariant: composition.layoutVariant,
          anchorLabel: buildAnchorLabel({ family: "Notes", title: "Travel Notes & Commercial Guidance" }),
          title: "Travel Notes & Commercial Guidance",
          blocks: policyBlocks,
        });
        break;
    }
  }

  const webSections: ItineraryWebSection[] = [];
  for (const composition of template.pageComposition.web) {
    switch (composition.family) {
      case "HERO":
        webSections.push({
          id: "hero",
          family: "HERO",
          layoutVariant: composition.layoutVariant,
          anchorLabel: buildAnchorLabel({ family: "Hero", title: "Overview" }),
          title: input.plan.title,
          subtitle: `${createDurationLabel(input.plan)} across ${routeStops[0] || "the planned route"}`,
          heroImage,
          chips: [input.plan.referenceNo, createPaxLabel(input.plan), input.plan.currencyCode],
        });
        break;
      case "QUICK_FACTS":
        webSections.push({
          id: "quick-facts",
          family: "QUICK_FACTS",
          layoutVariant: composition.layoutVariant,
          anchorLabel: buildAnchorLabel({ family: "Facts", title: "At a Glance" }),
          title: "At a glance",
          facts,
          highlights,
        });
        break;
      case "ROUTE":
        webSections.push({
          id: "route",
          family: "ROUTE",
          layoutVariant: composition.layoutVariant,
          anchorLabel: buildAnchorLabel({ family: "Route", title: "Route Story" }),
          title: "Route Story",
          routeStops,
          summary:
            routeStops.length > 1
              ? `Move through ${routeStops.join(" to ")} on a program built from the approved pre-tour planning data.`
              : "Route sequencing will expand as transport and destination details deepen.",
          image: heroImage,
        });
        break;
      case "TIMELINE":
        webSections.push({
          id: "timeline",
          family: "TIMELINE",
          layoutVariant: composition.layoutVariant,
          anchorLabel: buildAnchorLabel({ family: "Timeline", title: "Day Timeline" }),
          title: "Day Timeline",
          days: dayBlocks,
        });
        break;
      case "STAYS":
        if (stays.length) {
          webSections.push({
            id: "stays",
            family: "STAYS",
            layoutVariant: composition.layoutVariant,
            anchorLabel: buildAnchorLabel({ family: "Stays", title: "Where you'll stay" }),
            title: "Where you'll stay",
            stays,
          });
        }
        break;
      case "GALLERY":
        if (highlights.length) {
          webSections.push({
            id: "gallery",
            family: "GALLERY",
            layoutVariant: composition.layoutVariant,
            anchorLabel: buildAnchorLabel({ family: "Gallery", title: "Moments from the journey" }),
            title: "Moments from the journey",
            items: highlights,
          });
        }
        break;
      case "PRICING":
        webSections.push({
          id: "pricing",
          family: "PRICING",
          layoutVariant: composition.layoutVariant,
          anchorLabel: buildAnchorLabel({ family: "Pricing", title: "Pricing Snapshot" }),
          title: "Pricing Snapshot",
          pricing,
        });
        break;
      case "TRAVEL_NOTES":
        webSections.push({
          id: "travel-notes",
          family: "TRAVEL_NOTES",
          layoutVariant: composition.layoutVariant,
          anchorLabel: buildAnchorLabel({ family: "Notes", title: "Travel Notes" }),
          title: "Travel notes",
          blocks: policyBlocks,
        });
        break;
      case "SUPPORT_FOOTER":
        webSections.push({
          id: "support-footer",
          family: "SUPPORT_FOOTER",
          layoutVariant: composition.layoutVariant,
          anchorLabel: buildAnchorLabel({ family: "Support", title: "Planning Context" }),
          title: "Planning context",
          lines: [
            operatorOrg?.name ? `Operator: ${operatorOrg.name}` : "Operator pending",
            marketOrg?.name ? `Market: ${marketOrg.name}` : "Market pending",
            category?.name ? `Category: ${category.name}` : "Category pending",
            `${input.technicalVisitLinks.length} technical visit reference(s) connected to the current plan.`,
          ],
        });
        break;
    }
  }

  return normalizeDraftForStudio(
    {
      version: 1,
      overview: {
        planId: input.plan.id,
        title: input.plan.title,
        subtitle: `${createDurationLabel(input.plan)} itinerary draft`,
        referenceNo: input.plan.referenceNo,
        planCode: input.plan.planCode,
        status: input.plan.status,
        startDateLabel: formatDateLabel(input.plan.startDate),
        endDateLabel: formatDateLabel(input.plan.endDate),
        routeLabel,
        paxLabel: createPaxLabel(input.plan),
        durationLabel: createDurationLabel(input.plan),
        operatorLabel: operatorOrg?.name || null,
        marketLabel: marketOrg?.name || null,
        categoryLabel: category?.name || null,
        preferredLanguage: input.plan.preferredLanguage || null,
        mealPreference: input.plan.mealPreference || null,
        notes: input.plan.notes || null,
        heroImage,
      },
      document: {
        pages: documentPages,
      },
      web: {
        sections: webSections,
      },
    } satisfies ItineraryStructuredDraft,
    template
  );
}

export async function getItineraryLauncherPayload(planId: string, headers: Headers): Promise<ItineraryLauncherPayload> {
  const access = await getItineraryAccess(headers);
  const plan = await getPlanOrThrow(access.companyId, planId);
  const itineraries = await db
    .select()
    .from(schema.itinerary)
    .where(and(eq(schema.itinerary.companyId, access.companyId), eq(schema.itinerary.planId, planId)))
    .orderBy(desc(schema.itinerary.updatedAt), desc(schema.itinerary.createdAt));

  return {
    plan: {
      id: plan.id,
      title: plan.title,
      referenceNo: plan.referenceNo,
      planCode: plan.planCode,
      status: plan.status,
      startDate: plan.startDate.toISOString(),
      endDate: plan.endDate.toISOString(),
      totalNights: plan.totalNights,
      adults: plan.adults,
      children: plan.children,
      currencyCode: plan.currencyCode,
    },
    templates: ITINERARY_TEMPLATES,
    itineraries: itineraries.map(toSummaryRecord),
  };
}

export async function createItineraryDraft(planId: string, payload: unknown, headers: Headers) {
  const parsed = itineraryCreateSchema.safeParse(payload);
  if (!parsed.success) {
    throw new ItineraryError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }

  const access = await getItineraryAccess(headers, { write: true });
  const template = getItineraryTemplate(parsed.data.templateKey);
  if (!template) {
    throw new ItineraryError(404, "TEMPLATE_NOT_FOUND", "Itinerary template not found.");
  }
  if (!template.supportedOutputs.includes(parsed.data.outputMode)) {
    throw new ItineraryError(
      400,
      "OUTPUT_MODE_NOT_SUPPORTED",
      "Selected template does not support the requested output mode."
    );
  }

  const source = await loadPlanSource(access.companyId, planId);
  const generationOptions: ItineraryGenerationOptions = {
    outputMode: parsed.data.outputMode,
    includeMedia: parsed.data.includeMedia,
    includeCommercials: parsed.data.includeCommercials,
    includePolicies: parsed.data.includePolicies,
  };
  const draft = buildStructuredDraft(source, template, generationOptions);
  const sourceSnapshot: ItinerarySourceSnapshot = {
    planId: source.plan.id,
    planVersion: source.plan.version,
    dayCount: source.days.length,
    itemCount: source.items.length,
    totalCount: source.totals ? 1 : 0,
    generatedAt: new Date().toISOString(),
  };

  const itineraryCode = `ITN_${source.plan.planCode}_${nanoid(6).toUpperCase()}`;
  const itineraryTitle = `${source.plan.title} • ${template.title}`;

  let createdItinerary: typeof schema.itinerary.$inferSelect | null = null;

  try {
    [createdItinerary] = await db
      .insert(schema.itinerary)
      .values({
        companyId: access.companyId,
        planId: source.plan.id,
        code: itineraryCode,
        title: itineraryTitle,
        status: "DRAFT",
        templateKey: template.key,
        outputMode: parsed.data.outputMode,
        currentVersionNumber: 1,
        createdByUserId: access.userId,
        createdByName: access.userName,
      })
      .returning();

    const [createdVersion] = await db
      .insert(schema.itineraryVersion)
      .values({
        companyId: access.companyId,
        itineraryId: createdItinerary.id,
        versionNumber: 1,
        status: "DRAFT",
        generationOptions,
        sourceSnapshot,
        structuredDraft: draft,
        createdByUserId: access.userId,
        createdByName: access.userName,
      })
      .returning();

    return {
      itinerary: toSummaryRecord(createdItinerary),
      version: {
        id: createdVersion.id,
        versionNumber: createdVersion.versionNumber,
        createdAt: createdVersion.createdAt.toISOString(),
      },
    };
  } catch (error) {
    if (createdItinerary) {
      try {
        await db.delete(schema.itinerary).where(eq(schema.itinerary.id, createdItinerary.id));
      } catch (cleanupError) {
        logger.error("itinerary_create_cleanup_failed", {
          feature: "itinerary",
          itineraryId: createdItinerary.id,
          errorMessage:
            cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
        });
      }
    }
    throw error;
  }
}

export async function getItineraryPreviewPayload(
  itineraryId: string,
  planId: string,
  headers: Headers
): Promise<ItineraryPreviewPayload> {
  const access = await getItineraryAccess(headers);
  const { itinerary, currentVersion } = await getItineraryWithCurrentVersion(access.companyId, itineraryId);
  if (itinerary.planId !== planId) {
    throw new ItineraryError(404, "NOT_FOUND", "Itinerary not found.");
  }
  const template = getItineraryTemplate(itinerary.templateKey);
  const normalizedDraft = normalizeDraftForStudio(currentVersion.structuredDraft, template);
  const [exports, shares] = await Promise.all([
    listExportRecords(access.companyId, itineraryId),
    listShareRecords(access.companyId, itineraryId),
  ]);

  return {
    itinerary: toSummaryRecord(itinerary),
    template,
    exports,
    shares,
    currentVersion: {
      id: currentVersion.id,
      versionNumber: currentVersion.versionNumber,
      createdAt: currentVersion.createdAt.toISOString(),
      generationOptions: currentVersion.generationOptions,
      draft: normalizedDraft,
    },
  };
}

export async function updateItineraryDraft(itineraryId: string, payload: unknown, headers: Headers) {
  const parsed = itineraryDraftUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    throw new ItineraryError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }

  if (!isStructuredDraft(parsed.data.draft)) {
    throw new ItineraryError(400, "VALIDATION_ERROR", "Structured itinerary draft payload is invalid.");
  }

  const access = await getItineraryAccess(headers, { write: true });
  const { itinerary, currentVersion } = await getItineraryWithCurrentVersion(access.companyId, itineraryId);

  if (parsed.data.expectedVersionId && parsed.data.expectedVersionId !== currentVersion.id) {
    throw new ItineraryError(
      409,
      "VERSION_CONFLICT",
      "The itinerary changed on another session. Refresh before saving new edits."
    );
  }

  if (parsed.data.draft.overview.planId !== itinerary.planId) {
    throw new ItineraryError(400, "VALIDATION_ERROR", "Itinerary draft is not bound to the current pre-tour.");
  }

  const template = getItineraryTemplate(itinerary.templateKey);
  const normalizedDraft = normalizeDraftForStudio(parsed.data.draft, template);
  normalizedDraft.studio = {
    ...(normalizedDraft.studio ?? {}),
    lastSavedAt: new Date().toISOString(),
    lastEditedAt: new Date().toISOString(),
    lastEditedByName: access.userName,
  };

  const [updatedVersion] = await db
    .update(schema.itineraryVersion)
    .set({
      structuredDraft: normalizedDraft,
    })
    .where(
      and(
        eq(schema.itineraryVersion.id, currentVersion.id),
        eq(schema.itineraryVersion.companyId, access.companyId)
      )
    )
    .returning();

  const [updatedItinerary] = await db
    .update(schema.itinerary)
    .set({
      title: normalizedDraft.overview.title,
      updatedAt: new Date(),
    })
    .where(and(eq(schema.itinerary.id, itinerary.id), eq(schema.itinerary.companyId, access.companyId)))
    .returning();

  return {
    itinerary: toSummaryRecord(updatedItinerary ?? itinerary),
    currentVersion: {
      id: updatedVersion.id,
      versionNumber: updatedVersion.versionNumber,
      createdAt: updatedVersion.createdAt.toISOString(),
      draft: normalizedDraft,
    },
  };
}

export async function createItineraryExportHook(itineraryId: string, payload: unknown, headers: Headers) {
  const parsed = itineraryExportCreateSchema.safeParse(payload);
  if (!parsed.success) {
    throw new ItineraryError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }

  const access = await getItineraryAccess(headers);
  const { itinerary, currentVersion } = await getItineraryWithCurrentVersion(access.companyId, itineraryId);
  const template = getItineraryTemplate(itinerary.templateKey);
  const fileName = buildExportFileName(itinerary.code, currentVersion.versionNumber, parsed.data.format);
  const snapshot =
    parsed.data.format === "PDF"
      ? {
          artifactKind: "PRINT_HTML",
          html: buildDocumentExportHtml({
            itinerary,
            versionNumber: currentVersion.versionNumber,
            template,
            draft: currentVersion.structuredDraft,
          }),
        }
      : {
          artifactKind: "DOCX_PAYLOAD",
          payload: {
            generatedAt: new Date().toISOString(),
            itinerary: {
              id: itinerary.id,
              code: itinerary.code,
              title: itinerary.title,
            },
            template: template
              ? {
                  key: template.key,
                  title: template.title,
                }
              : null,
            versionNumber: currentVersion.versionNumber,
            overview: currentVersion.structuredDraft.overview,
            documentPages: currentVersion.structuredDraft.document.pages.map((page) => ({
              id: page.id,
              family: page.family,
              anchorLabel: page.anchorLabel,
              layoutVariant: page.layoutVariant,
            })),
          },
        };

  const [createdExport] = await db
    .insert(schema.itineraryExport)
    .values({
      companyId: access.companyId,
      itineraryId: itinerary.id,
      itineraryVersionId: currentVersion.id,
      format: parsed.data.format,
      status: "PREPARED",
      fileName,
      snapshot,
      requestedByUserId: access.userId,
      requestedByName: access.userName,
    })
    .returning();

  return {
    export: toExportRecord(createdExport, currentVersion.versionNumber),
  };
}

export async function downloadItineraryExportHook(
  itineraryId: string,
  exportId: string,
  headers: Headers
) {
  const access = await getItineraryAccess(headers);
  const [record] = await db
    .select()
    .from(schema.itineraryExport)
    .where(
      and(
        eq(schema.itineraryExport.id, exportId),
        eq(schema.itineraryExport.companyId, access.companyId),
        eq(schema.itineraryExport.itineraryId, itineraryId)
      )
    )
    .limit(1);

  if (!record) {
    throw new ItineraryError(404, "NOT_FOUND", "Itinerary export hook not found.");
  }

  const snapshot = asRecord(record.snapshot);
  const artifactKind = typeof snapshot?.artifactKind === "string" ? snapshot.artifactKind : null;

  if (artifactKind === "PRINT_HTML") {
    return {
      fileName: record.fileName,
      contentType: "text/html; charset=utf-8",
      body: typeof snapshot?.html === "string" ? snapshot.html : "",
    };
  }

  return {
    fileName: record.fileName,
    contentType: "application/json; charset=utf-8",
    body: JSON.stringify(snapshot?.payload ?? snapshot ?? {}, null, 2),
  };
}

export async function createItineraryShareLink(itineraryId: string, payload: unknown, headers: Headers) {
  const parsed = itineraryShareCreateSchema.safeParse(payload);
  if (!parsed.success) {
    throw new ItineraryError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }

  const access = await getItineraryAccess(headers, { write: true });
  const { itinerary, currentVersion } = await getItineraryWithCurrentVersion(access.companyId, itineraryId);
  if (
    (itinerary.outputMode === "DOCUMENT" && parsed.data.surface !== "DOCUMENT") ||
    (itinerary.outputMode === "WEB" && parsed.data.surface !== "WEB")
  ) {
    throw new ItineraryError(
      400,
      "SHARE_SURFACE_NOT_SUPPORTED",
      "Selected share surface is not enabled for this itinerary."
    );
  }
  const rawToken = createShareToken();
  const tokenHash = hashShareToken(rawToken);
  const expiresAt =
    typeof parsed.data.expiresInDays === "number"
      ? new Date(Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

  const [createdShare] = await db
    .insert(schema.itineraryShare)
    .values({
      companyId: access.companyId,
      itineraryId: itinerary.id,
      itineraryVersionId: currentVersion.id,
      surface: parsed.data.surface,
      tokenHash,
      tokenHint: rawToken.slice(-8),
      expiresAt,
      createdByUserId: access.userId,
      createdByName: access.userName,
    })
    .returning();

  return {
    share: toShareRecord(createdShare, currentVersion.versionNumber, buildPublicShareUrl(rawToken)),
  };
}

export async function revokeItineraryShareLink(
  itineraryId: string,
  shareId: string,
  payload: unknown,
  headers: Headers
) {
  const parsed = itineraryShareUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    throw new ItineraryError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }
  if (!parsed.data.revoke) {
    throw new ItineraryError(400, "VALIDATION_ERROR", "Only revoke is supported for share updates.");
  }

  const access = await getItineraryAccess(headers, { write: true });
  const [record] = await db
    .select()
    .from(schema.itineraryShare)
    .where(
      and(
        eq(schema.itineraryShare.id, shareId),
        eq(schema.itineraryShare.companyId, access.companyId),
        eq(schema.itineraryShare.itineraryId, itineraryId)
      )
    )
    .limit(1);

  if (!record) {
    throw new ItineraryError(404, "NOT_FOUND", "Itinerary share link not found.");
  }

  const [updatedShare] = await db
    .update(schema.itineraryShare)
    .set({
      isActive: false,
      revokedAt: new Date(),
      revokedByUserId: access.userId,
    })
    .where(eq(schema.itineraryShare.id, record.id))
    .returning();

  const [version] = await db
    .select({ versionNumber: schema.itineraryVersion.versionNumber })
    .from(schema.itineraryVersion)
    .where(eq(schema.itineraryVersion.id, updatedShare.itineraryVersionId))
    .limit(1);

  return {
    share: toShareRecord(updatedShare, version?.versionNumber ?? 1, null),
  };
}

export async function getItineraryPublicSharePayload(
  rawToken: string
): Promise<ItineraryPublicSharePayload> {
  const token = rawToken.trim();
  if (!token) {
    throw new ItineraryError(404, "NOT_FOUND", "Share link not found.");
  }

  const [share] = await db
    .select()
    .from(schema.itineraryShare)
    .where(eq(schema.itineraryShare.tokenHash, hashShareToken(token)))
    .limit(1);

  if (!share || !share.isActive || share.revokedAt) {
    throw new ItineraryError(404, "NOT_FOUND", "Share link not found.");
  }

  if (share.expiresAt && share.expiresAt.getTime() < Date.now()) {
    throw new ItineraryError(410, "SHARE_EXPIRED", "Share link has expired.");
  }

  const [itinerary, version] = await Promise.all([
    db
      .select()
      .from(schema.itinerary)
      .where(
        and(
          eq(schema.itinerary.id, share.itineraryId),
          eq(schema.itinerary.companyId, share.companyId)
        )
      )
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db
      .select()
      .from(schema.itineraryVersion)
      .where(
        and(
          eq(schema.itineraryVersion.id, share.itineraryVersionId),
          eq(schema.itineraryVersion.companyId, share.companyId)
        )
      )
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ]);

  if (!itinerary || !version?.structuredDraft) {
    throw new ItineraryError(404, "NOT_FOUND", "Shared itinerary is no longer available.");
  }

  const assetIds = new Set<string>();
  collectAssetIds(version.structuredDraft, assetIds);
  const assetUrlById = new Map<string, string>();

  if (assetIds.size) {
    const assets = await db
      .select({
        id: schema.mediaAsset.id,
        storageKey: schema.mediaAsset.storageKey,
      })
      .from(schema.mediaAsset)
      .where(
        and(
          eq(schema.mediaAsset.companyId, share.companyId),
          inArray(schema.mediaAsset.id, Array.from(assetIds)),
          eq(schema.mediaAsset.isActive, true),
          eq(schema.mediaAsset.reviewStatus, "APPROVED"),
          eq(schema.mediaAsset.safeForCustomerShare, true)
        )
      );

    await Promise.all(
      assets.map(async (asset) => {
        const url = await createMediaReadUrl({
          bucket: getMediaBucketName(),
          storageKey: asset.storageKey,
        });
        assetUrlById.set(asset.id, url);
      })
    );
  }

  const sanitizedDraft = normalizeDraftForStudio(
    rewriteMediaRefsForPublicShare(version.structuredDraft, assetUrlById),
    getItineraryTemplate(itinerary.templateKey)
  );

  await db
    .update(schema.itineraryShare)
    .set({ lastAccessedAt: new Date() })
    .where(eq(schema.itineraryShare.id, share.id));

  return {
    share: toShareRecord(share, version.versionNumber, buildPublicShareUrl(token)),
    itinerary: {
      id: itinerary.id,
      title: itinerary.title,
      templateKey: itinerary.templateKey,
      outputMode: itinerary.outputMode,
    },
    template: getItineraryTemplate(itinerary.templateKey),
    currentVersion: {
      id: version.id,
      versionNumber: version.versionNumber,
      createdAt: version.createdAt.toISOString(),
      draft: sanitizedDraft,
    },
  };
}

export function toItineraryErrorResponse(error: unknown) {
  if (error instanceof ItineraryError) {
    return {
      status: error.status,
      body: {
        code: error.code,
        message: error.message,
      },
    };
  }

  if (error && typeof error === "object") {
    const maybe = error as {
      code?: string;
      message?: string;
      cause?: { code?: string; message?: string };
      sourceError?: { code?: string; message?: string };
    };
    const lowered = String(maybe.message || "").toLowerCase();
    const causeCode = maybe.cause?.code;
    const sourceCode = maybe.sourceError?.code;

    if (
      causeCode === "ENOTFOUND" ||
      causeCode === "UND_ERR_SOCKET" ||
      sourceCode === "ENOTFOUND" ||
      sourceCode === "UND_ERR_SOCKET" ||
      lowered.includes("fetch failed")
    ) {
      return {
        status: 503,
        body: {
          code: "DATABASE_UNAVAILABLE",
          message: "Database connection is unavailable. Check DATABASE_URL/network and try again.",
        },
      };
    }
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    logger.error(`itinerary_request_failed: ${error.message}`, {
      feature: "itinerary",
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
    });

    if (message.includes("fetch failed") || message.includes("enotfound")) {
      return {
        status: 503,
        body: {
          code: "DATABASE_UNAVAILABLE",
          message: "Database connection is unavailable. Check DATABASE_URL/network and try again.",
        },
      };
    }

    if (
      (message.includes("relation") && message.includes("does not exist")) ||
      (message.includes("column") && message.includes("does not exist"))
    ) {
      return {
        status: 500,
        body: {
          code: "DB_SCHEMA_MISMATCH",
          message: "Database schema is not up to date. Please run the latest Drizzle migration/db push.",
        },
      };
    }

    if (message.includes("duplicate key")) {
      return {
        status: 409,
        body: {
          code: "DUPLICATE_RECORD",
          message: "An itinerary record already exists for the generated unique fields.",
        },
      };
    }

    if (message.includes("violates foreign key")) {
      return {
        status: 400,
        body: {
          code: "FOREIGN_KEY_ERROR",
          message: "The itinerary could not be created because one of the related records is invalid.",
        },
      };
    }
  }

  return {
    status: 500,
    body: {
      code: "INTERNAL_SERVER_ERROR",
      message:
        error instanceof Error && process.env.NODE_ENV !== "production"
          ? error.message
          : "Failed to process itinerary request.",
    },
  };
}
