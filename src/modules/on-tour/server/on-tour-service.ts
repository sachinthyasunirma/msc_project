import { and, desc, eq, ilike, inArray, isNull, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { AccessControlError, resolveAccess } from "@/lib/security/access-control";
import {
  assignTravelersToGroupSchema,
  onTourSubgroupSchema,
  onTourTravelerSchema,
} from "@/modules/on-tour/shared/on-tour-schemas";

class OnTourError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

const onTourListQuerySchema = z.object({
  q: z.string().trim().max(160).optional(),
  status: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).max(9999).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const SUPPORTED_SOURCE_STATUSES = [
  "QUOTED",
  "APPROVED",
  "BOOKED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

function mapPreTourStatusToOnTourStatus(status: unknown) {
  const normalized = String(status || "").toUpperCase();
  switch (normalized) {
    case "APPROVED":
      return "CONFIRMED";
    case "BOOKED":
      return "READY_TO_OPERATE";
    case "IN_PROGRESS":
      return "IN_PROGRESS";
    case "COMPLETED":
      return "COMPLETED";
    case "CANCELLED":
      return "CANCELED";
    case "QUOTED":
      return "PENDING_CONFIRMATION";
    default:
      return "DRAFT";
  }
}

function mapPlanItemStatusToConfirmationStatus(status: unknown) {
  const normalized = String(status || "").toUpperCase();
  switch (normalized) {
    case "CONFIRMED":
    case "COMPLETED":
      return "CONFIRMED";
    case "CANCELLED":
      return "CANCELED";
    default:
      return "UNREQUESTED";
  }
}

function formatMoney(value: unknown) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric.toFixed(2) : "0.00";
}

function totalPax(record: {
  adults?: number | null;
  children?: number | null;
  infants?: number | null;
}) {
  return Number(record.adults ?? 0) + Number(record.children ?? 0) + Number(record.infants ?? 0);
}

function buildMainGroupId(planId: string) {
  return `${planId}:main`;
}

function toDecimal(value: unknown, scale = 2) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric.toFixed(scale) : Number(0).toFixed(scale);
}

function toNullableDate(value: string | undefined) {
  if (!value) return null;
  return new Date(value);
}

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = parts.shift() ?? fullName.trim();
  const lastName = parts.join(" ") || null;
  return { firstName, lastName };
}

function addNights(date: Date, nights: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + Math.max(nights, 0));
  return next;
}

function isMissingRelationError(error: unknown) {
  const code =
    typeof error === "object" && error && "code" in error ? String(error.code ?? "") : "";
  const message = error instanceof Error ? error.message : String(error ?? "");
  return code === "42P01" || /relation .* does not exist/i.test(message);
}

function toSchemaNotReadyError(action: string) {
  return new OnTourError(
    501,
    "ON_TOUR_SCHEMA_NOT_READY",
    `${action} will be enabled when the operational on-tour tables are deployed.`
  );
}

async function loadPersistedOnTourState(companyId: string, onTourId: string) {
  try {
    const [tour] = await db
      .select({
        id: schema.onTour.id,
        preTourPlanId: schema.onTour.preTourPlanId,
        status: schema.onTour.status,
        code: schema.onTour.code,
        bookingNo: schema.onTour.bookingNo,
        departureCode: schema.onTour.departureCode,
        title: schema.onTour.title,
        confirmedStartDate: schema.onTour.confirmedStartDate,
        confirmedEndDate: schema.onTour.confirmedEndDate,
        preferredLanguage: schema.onTour.preferredLanguage,
        marketOrgId: schema.onTour.marketOrgId,
        operatorOrgId: schema.onTour.operatorOrgId,
        totalPax: schema.onTour.totalPax,
        adults: schema.onTour.adults,
        children: schema.onTour.children,
        infants: schema.onTour.infants,
        foc: schema.onTour.foc,
        currencyCode: schema.onTour.currencyCode,
        quotedBaseTotal: schema.onTour.quotedBaseTotal,
        quotedGrandTotal: schema.onTour.quotedGrandTotal,
        confirmedBaseTotal: schema.onTour.confirmedBaseTotal,
        confirmedGrandTotal: schema.onTour.confirmedGrandTotal,
        actualBaseTotal: schema.onTour.actualBaseTotal,
        actualGrandTotal: schema.onTour.actualGrandTotal,
        notes: schema.onTour.notes,
        isLocked: schema.onTour.isLocked,
        createdAt: schema.onTour.createdAt,
        updatedAt: schema.onTour.updatedAt,
      })
      .from(schema.onTour)
      .where(
        and(
          eq(schema.onTour.id, onTourId),
          eq(schema.onTour.companyId, companyId),
          isNull(schema.onTour.deletedAt)
        )
      )
      .limit(1);

    if (!tour) return null;

    const [groups, travelers, groupLinks] = await Promise.all([
      db
        .select({
          id: schema.onTourGroup.id,
          code: schema.onTourGroup.code,
          groupName: schema.onTourGroup.groupName,
          subgroupType: schema.onTourGroup.subgroupType,
          startDate: schema.onTourGroup.startDate,
          endDate: schema.onTourGroup.endDate,
          notes: schema.onTourGroup.notes,
          isPrimary: schema.onTourGroup.isPrimary,
          createdAt: schema.onTourGroup.createdAt,
        })
        .from(schema.onTourGroup)
        .where(eq(schema.onTourGroup.onTourId, onTourId))
        .orderBy(schema.onTourGroup.isPrimary, schema.onTourGroup.createdAt),
      db
        .select({
          id: schema.onTourTraveler.id,
          code: schema.onTourTraveler.code,
          fullName: schema.onTourTraveler.fullName,
          travelerType: schema.onTourTraveler.travelerType,
          nationality: schema.onTourTraveler.nationality,
          passportNo: schema.onTourTraveler.passportNo,
          roomingGender: schema.onTourTraveler.roomingGender,
          dietaryNotes: schema.onTourTraveler.dietaryNotes,
          medicalNotes: schema.onTourTraveler.medicalNotes,
          mobilityNotes: schema.onTourTraveler.mobilityNotes,
          isGroupLeader: schema.onTourTraveler.isGroupLeader,
          isTourLeader: schema.onTourTraveler.isTourLeader,
          requiresChildSeat: schema.onTourTraveler.requiresChildSeat,
          isActive: schema.onTourTraveler.isActive,
          createdAt: schema.onTourTraveler.createdAt,
        })
        .from(schema.onTourTraveler)
        .where(eq(schema.onTourTraveler.onTourId, onTourId))
        .orderBy(schema.onTourTraveler.createdAt),
      db
        .select({
          groupId: schema.onTourGroupTraveler.groupId,
          travelerId: schema.onTourGroupTraveler.travelerId,
        })
        .from(schema.onTourGroupTraveler)
        .where(eq(schema.onTourGroupTraveler.onTourId, onTourId)),
    ]);

    const travelersByGroup = new Map<string, Set<string>>();
    for (const link of groupLinks) {
      const groupId = String(link.groupId);
      const travelerId = String(link.travelerId);
      if (!travelersByGroup.has(groupId)) {
        travelersByGroup.set(groupId, new Set());
      }
      travelersByGroup.get(groupId)?.add(travelerId);
    }

    return {
      tour,
      groups: groups.map((group) => ({
        id: String(group.id),
        code: String(group.code),
        groupName: String(group.groupName),
        subgroupType: String(group.subgroupType),
        startDate: group.startDate ? new Date(group.startDate).toISOString() : null,
        endDate: group.endDate ? new Date(group.endDate).toISOString() : null,
        travelerCount: travelersByGroup.get(String(group.id))?.size ?? 0,
        notes: group.notes ? String(group.notes) : null,
        isPrimary: Boolean(group.isPrimary),
      })),
      travelers: travelers.map((traveler) => ({
        id: String(traveler.id),
        code: String(traveler.code),
        fullName: String(traveler.fullName),
        travelerType: String(traveler.travelerType),
        nationality: traveler.nationality ? String(traveler.nationality) : null,
        passportNo: traveler.passportNo ? String(traveler.passportNo) : null,
        roomingGender: traveler.roomingGender ? String(traveler.roomingGender) : null,
        dietaryNotes: traveler.dietaryNotes ? String(traveler.dietaryNotes) : null,
        medicalNotes: traveler.medicalNotes ? String(traveler.medicalNotes) : null,
        mobilityNotes: traveler.mobilityNotes ? String(traveler.mobilityNotes) : null,
        isGroupLeader: Boolean(traveler.isGroupLeader),
        isTourLeader: Boolean(traveler.isTourLeader),
        requiresChildSeat: Boolean(traveler.requiresChildSeat),
        isActive: Boolean(traveler.isActive),
      })),
      assignedTravelerIds: new Set(groupLinks.map((link) => String(link.travelerId))),
      audit: [
        {
          id: `${tour.id}:persisted`,
          action: "ON_TOUR_PERSISTED",
          actorName: null,
          createdAt: new Date(tour.createdAt).toISOString(),
          summary: "Operational file is persisted in the on-tour tables.",
        },
        {
          id: `${tour.id}:updated`,
          action: "ON_TOUR_UPDATED",
          actorName: null,
          createdAt: new Date(tour.updatedAt).toISOString(),
          summary: "Latest operational update timestamp mirrored from the persisted on-tour record.",
        },
      ],
    };
  } catch (error) {
    if (isMissingRelationError(error)) {
      return null;
    }
    throw error;
  }
}

async function bootstrapOnTourFromPreTour(companyId: string, onTourId: string) {
  const [plan] = await db
    .select({
      id: schema.preTourPlan.id,
      code: schema.preTourPlan.code,
      customerId: schema.preTourPlan.customerId,
      agentId: schema.preTourPlan.agentId,
      leadId: schema.preTourPlan.leadId,
      operatorOrgId: schema.preTourPlan.operatorOrgId,
      marketOrgId: schema.preTourPlan.marketOrgId,
      referenceNo: schema.preTourPlan.referenceNo,
      planCode: schema.preTourPlan.planCode,
      title: schema.preTourPlan.title,
      status: schema.preTourPlan.status,
      startDate: schema.preTourPlan.startDate,
      endDate: schema.preTourPlan.endDate,
      totalNights: schema.preTourPlan.totalNights,
      adults: schema.preTourPlan.adults,
      children: schema.preTourPlan.children,
      infants: schema.preTourPlan.infants,
      preferredLanguage: schema.preTourPlan.preferredLanguage,
      notes: schema.preTourPlan.notes,
      currencyCode: schema.preTourPlan.currencyCode,
      baseCurrencyCode: schema.preTourPlan.baseCurrencyCode,
      exchangeRateMode: schema.preTourPlan.exchangeRateMode,
      exchangeRate: schema.preTourPlan.exchangeRate,
      exchangeRateDate: schema.preTourPlan.exchangeRateDate,
      baseTotal: schema.preTourPlan.baseTotal,
      taxTotal: schema.preTourPlan.taxTotal,
      grandTotal: schema.preTourPlan.grandTotal,
      version: schema.preTourPlan.version,
    })
    .from(schema.preTourPlan)
    .where(
      and(
        eq(schema.preTourPlan.id, onTourId),
        eq(schema.preTourPlan.companyId, companyId),
        isNull(schema.preTourPlan.deletedAt)
      )
    )
    .limit(1);

  if (!plan) {
    throw new OnTourError(404, "ON_TOUR_NOT_FOUND", "Operational file not found.");
  }

  const [dayRows, itemRows, guideRows, categoryRows, technicalVisitRows] = await Promise.all([
    db
      .select({
        id: schema.preTourPlanDay.id,
        code: schema.preTourPlanDay.code,
        dayNumber: schema.preTourPlanDay.dayNumber,
        date: schema.preTourPlanDay.date,
        title: schema.preTourPlanDay.title,
        notes: schema.preTourPlanDay.notes,
        startLocationId: schema.preTourPlanDay.startLocationId,
        endLocationId: schema.preTourPlanDay.endLocationId,
      })
      .from(schema.preTourPlanDay)
      .where(eq(schema.preTourPlanDay.planId, plan.id))
      .orderBy(schema.preTourPlanDay.dayNumber),
    db
      .select({
        id: schema.preTourPlanItem.id,
        code: schema.preTourPlanItem.code,
        dayId: schema.preTourPlanItem.dayId,
        itemType: schema.preTourPlanItem.itemType,
        title: schema.preTourPlanItem.title,
        description: schema.preTourPlanItem.description,
        notes: schema.preTourPlanItem.notes,
        startAt: schema.preTourPlanItem.startAt,
        endAt: schema.preTourPlanItem.endAt,
        sortOrder: schema.preTourPlanItem.sortOrder,
        pax: schema.preTourPlanItem.pax,
        nights: schema.preTourPlanItem.nights,
        rooms: schema.preTourPlanItem.rooms,
        fromLocationId: schema.preTourPlanItem.fromLocationId,
        toLocationId: schema.preTourPlanItem.toLocationId,
        locationId: schema.preTourPlanItem.locationId,
        currencyCode: schema.preTourPlanItem.currencyCode,
        priceMode: schema.preTourPlanItem.priceMode,
        baseAmount: schema.preTourPlanItem.baseAmount,
        taxAmount: schema.preTourPlanItem.taxAmount,
        totalAmount: schema.preTourPlanItem.totalAmount,
        status: schema.preTourPlanItem.status,
      })
      .from(schema.preTourPlanItem)
      .where(eq(schema.preTourPlanItem.planId, plan.id))
      .orderBy(schema.preTourPlanItem.dayId, schema.preTourPlanItem.sortOrder),
    db
      .select({
        id: schema.preTourPlanGuideAllocation.id,
        code: schema.preTourPlanGuideAllocation.code,
        coverageMode: schema.preTourPlanGuideAllocation.coverageMode,
        startDayId: schema.preTourPlanGuideAllocation.startDayId,
        endDayId: schema.preTourPlanGuideAllocation.endDayId,
        language: schema.preTourPlanGuideAllocation.language,
        guideBasis: schema.preTourPlanGuideAllocation.guideBasis,
        pax: schema.preTourPlanGuideAllocation.pax,
        title: schema.preTourPlanGuideAllocation.title,
        notes: schema.preTourPlanGuideAllocation.notes,
        status: schema.preTourPlanGuideAllocation.status,
      })
      .from(schema.preTourPlanGuideAllocation)
      .where(eq(schema.preTourPlanGuideAllocation.planId, plan.id))
      .orderBy(schema.preTourPlanGuideAllocation.createdAt),
    db
      .select({
        code: schema.preTourPlanCategory.code,
        typeId: schema.preTourPlanCategory.typeId,
        categoryId: schema.preTourPlanCategory.categoryId,
        notes: schema.preTourPlanCategory.notes,
      })
      .from(schema.preTourPlanCategory)
      .where(eq(schema.preTourPlanCategory.planId, plan.id))
      .orderBy(schema.preTourPlanCategory.createdAt),
    db
      .select({
        code: schema.preTourPlanTechnicalVisit.code,
        dayId: schema.preTourPlanTechnicalVisit.dayId,
        technicalVisitId: schema.preTourPlanTechnicalVisit.technicalVisitId,
        notes: schema.preTourPlanTechnicalVisit.notes,
      })
      .from(schema.preTourPlanTechnicalVisit)
      .where(eq(schema.preTourPlanTechnicalVisit.planId, plan.id))
      .orderBy(schema.preTourPlanTechnicalVisit.createdAt),
  ]);

  try {
    const created = await db.transaction(async (tx) => {
      const [insertedOnTour] = await tx
        .insert(schema.onTour)
        .values({
          id: onTourId,
          companyId,
          code: String(plan.code),
          preTourPlanId: String(plan.id),
          sourcePlanVersion: Number(plan.version ?? 1),
          referenceNo: String(plan.referenceNo),
          bookingNo: String(plan.referenceNo),
          departureCode: String(plan.planCode),
          title: String(plan.title),
          status: mapPreTourStatusToOnTourStatus(plan.status),
          customerId: plan.customerId ? String(plan.customerId) : null,
          agentId: plan.agentId ? String(plan.agentId) : null,
          leadId: plan.leadId ? String(plan.leadId) : null,
          operatorOrgId: plan.operatorOrgId ? String(plan.operatorOrgId) : null,
          marketOrgId: plan.marketOrgId ? String(plan.marketOrgId) : null,
          confirmedStartDate: new Date(plan.startDate),
          confirmedEndDate: new Date(plan.endDate),
          totalNights: Number(plan.totalNights ?? 0),
          adults: Number(plan.adults ?? 0),
          children: Number(plan.children ?? 0),
          infants: Number(plan.infants ?? 0),
          foc: 0,
          totalPax: totalPax(plan),
          preferredLanguage: plan.preferredLanguage ? String(plan.preferredLanguage) : null,
          currencyCode: String(plan.currencyCode),
          baseCurrencyCode: String(plan.baseCurrencyCode || "USD"),
          exchangeRateMode: String(plan.exchangeRateMode || "AUTO"),
          exchangeRate: toDecimal(plan.exchangeRate, 8),
          exchangeRateDate: plan.exchangeRateDate ? new Date(plan.exchangeRateDate) : null,
          quotedBaseTotal: toDecimal(plan.baseTotal),
          quotedTaxTotal: toDecimal(plan.taxTotal),
          quotedGrandTotal: toDecimal(plan.grandTotal),
          confirmedBaseTotal: toDecimal(plan.baseTotal),
          confirmedTaxTotal: toDecimal(plan.taxTotal),
          confirmedGrandTotal: toDecimal(plan.grandTotal),
          actualBaseTotal: toDecimal(plan.baseTotal),
          actualTaxTotal: toDecimal(plan.taxTotal),
          actualGrandTotal: toDecimal(plan.grandTotal),
          quotationSnapshot: {
            source: "pre_tour_plan",
            preTourPlanId: String(plan.id),
            referenceNo: String(plan.referenceNo),
          },
          conversionSnapshot: {
            mode: "lazy_bootstrap",
            createdFromPreTour: true,
          },
          notes: plan.notes ? String(plan.notes) : null,
        })
        .returning({
          id: schema.onTour.id,
          code: schema.onTour.code,
          confirmedStartDate: schema.onTour.confirmedStartDate,
          confirmedEndDate: schema.onTour.confirmedEndDate,
        });

      const [mainGroup] = await tx
        .insert(schema.onTourGroup)
        .values({
          companyId,
          code: `${String(plan.code)}-MAIN`,
          onTourId,
          groupName: "Main Group",
        subgroupType: "MAIN",
        startDate: new Date(plan.startDate),
        endDate: new Date(plan.endDate),
        preferredLanguage: plan.preferredLanguage ? String(plan.preferredLanguage) : null,
          notes: plan.notes ? String(plan.notes) : null,
          isPrimary: true,
          isOperationalSplit: false,
        })
        .returning({
          id: schema.onTourGroup.id,
        });

      const insertedDays =
        dayRows.length > 0
          ? await tx
              .insert(schema.onTourDay)
              .values(
                dayRows.map((day) => ({
                  companyId,
                  code: String(day.code),
                  onTourId,
                  sourcePlanDayId: String(day.id),
                  dayNumber: Number(day.dayNumber),
                  dayDate: new Date(day.date),
                  title: day.title ? String(day.title) : null,
                  notes: day.notes ? String(day.notes) : null,
                  startLocationId: day.startLocationId ? String(day.startLocationId) : null,
                  endLocationId: day.endLocationId ? String(day.endLocationId) : null,
                }))
              )
              .returning({
                id: schema.onTourDay.id,
                sourcePlanDayId: schema.onTourDay.sourcePlanDayId,
                dayDate: schema.onTourDay.dayDate,
              })
          : [];

      const onTourDayIdBySourceDayId = new Map(
        insertedDays.map((day) => [String(day.sourcePlanDayId), String(day.id)] as const)
      );
      const dayDateBySourceDayId = new Map(
        insertedDays.map((day) => [String(day.sourcePlanDayId), new Date(day.dayDate)] as const)
      );

      const insertedServices =
        itemRows.length > 0
          ? await tx
              .insert(schema.onTourService)
              .values(
                itemRows.map((item) => {
                  const fallbackDayDate =
                    dayDateBySourceDayId.get(String(item.dayId)) ?? new Date(plan.startDate);
                  const startAt = item.startAt ? new Date(item.startAt) : fallbackDayDate;
                  const endAt =
                    item.endAt
                      ? new Date(item.endAt)
                      : item.nights
                        ? addNights(startAt, Number(item.nights))
                        : null;

                  return {
                    companyId,
                    code: String(item.code),
                    onTourId,
                    dayId: onTourDayIdBySourceDayId.get(String(item.dayId)) ?? null,
                    groupId: String(mainGroup.id),
                    sourcePlanItemId: String(item.id),
                    serviceType: String(item.itemType).toUpperCase(),
                    serviceMode: "CORE",
                    chargeBasis: "FLAT",
                    title: String(item.title || item.itemType),
                    description: item.description ? String(item.description) : null,
                    startAt,
                    endAt,
                    serviceDate: startAt,
                    sortOrder: Number(item.sortOrder ?? 0),
                    adults: Number(plan.adults ?? 0),
                    children: Number(plan.children ?? 0),
                    infants: Number(plan.infants ?? 0),
                    foc: 0,
                    totalPax: totalPax(plan),
                    nights: Number(item.nights ?? 0) || null,
                    currencyCode: String(item.currencyCode),
                    priceMode: String(item.priceMode || "EXCLUSIVE"),
                    quotedBaseAmount: toDecimal(item.baseAmount),
                    quotedTaxAmount: toDecimal(item.taxAmount),
                    quotedTotalAmount: toDecimal(item.totalAmount),
                    confirmedBaseAmount: toDecimal(item.baseAmount),
                    confirmedTaxAmount: toDecimal(item.taxAmount),
                    confirmedTotalAmount: toDecimal(item.totalAmount),
                    actualBaseAmount: toDecimal(item.baseAmount),
                    actualTaxAmount: toDecimal(item.taxAmount),
                    actualTotalAmount: toDecimal(item.totalAmount),
                    status: "PLANNED",
                    confirmationStatus: mapPlanItemStatusToConfirmationStatus(item.status),
                    quotationSnapshot: {
                      sourcePlanItemId: String(item.id),
                    },
                    notes: item.notes ? String(item.notes) : null,
                  };
                })
              )
              .returning({
                id: schema.onTourService.id,
                sourcePlanItemId: schema.onTourService.sourcePlanItemId,
                serviceType: schema.onTourService.serviceType,
                startAt: schema.onTourService.startAt,
                endAt: schema.onTourService.endAt,
              })
          : [];

      const serviceIdBySourcePlanItemId = new Map(
        insertedServices
          .filter((service) => service.sourcePlanItemId)
          .map((service) => [String(service.sourcePlanItemId), String(service.id)] as const)
      );

      if (categoryRows.length > 0) {
        await tx.insert(schema.onTourCategory).values(
          categoryRows.map((categoryRow) => ({
            companyId,
            code: String(categoryRow.code),
            onTourId,
            typeId: String(categoryRow.typeId),
            categoryId: String(categoryRow.categoryId),
            notes: categoryRow.notes ? String(categoryRow.notes) : null,
          }))
        );
      }

      if (technicalVisitRows.length > 0) {
        await tx.insert(schema.onTourTechnicalVisit).values(
          technicalVisitRows.map((visitRow) => ({
            companyId,
            code: String(visitRow.code),
            onTourId,
            dayId: visitRow.dayId
              ? onTourDayIdBySourceDayId.get(String(visitRow.dayId)) ?? null
              : null,
            technicalVisitId: String(visitRow.technicalVisitId),
            notes: visitRow.notes ? String(visitRow.notes) : null,
          }))
        );
      }

      const accommodationValues = itemRows
        .filter((item) => String(item.itemType).toUpperCase() === "ACCOMMODATION")
        .flatMap((item) => {
          const serviceId = serviceIdBySourcePlanItemId.get(String(item.id));
          if (!serviceId) return [];
          const startAt = item.startAt
            ? new Date(item.startAt)
            : dayDateBySourceDayId.get(String(item.dayId)) ?? new Date(plan.startDate);
          const nights = Number(item.nights ?? 0);
          const roomCount = Array.isArray(item.rooms)
            ? item.rooms.reduce(
                (sum, room) => sum + Number((room as { count?: number }).count ?? 0),
                0
              )
            : 0;
          return [
            {
              companyId,
              code: `${String(item.code)}-ACC`,
              onTourId,
              serviceId,
              groupId: String(mainGroup.id),
              stayStartDate: startAt,
              stayEndDate: addNights(startAt, nights || 1),
              nights,
              roomCount,
              singleRoomCount: Array.isArray(item.rooms)
                ? item.rooms.reduce((sum, room) => {
                    const adults = Number((room as { adults?: number }).adults ?? 0);
                    const count = Number((room as { count?: number }).count ?? 0);
                    return sum + (adults <= 1 ? count : 0);
                  }, 0)
                : 0,
              twinRoomCount: Array.isArray(item.rooms)
                ? item.rooms.reduce((sum, room) => {
                    const adults = Number((room as { adults?: number }).adults ?? 0);
                    const count = Number((room as { count?: number }).count ?? 0);
                    return sum + (adults >= 2 ? count : 0);
                  }, 0)
                : 0,
              confirmationStatus: mapPlanItemStatusToConfirmationStatus(item.status),
            },
          ];
        });

      const insertedAccommodationDetails =
        accommodationValues.length > 0
          ? await tx
              .insert(schema.onTourAccommodationDetail)
              .values(accommodationValues)
              .returning({
                id: schema.onTourAccommodationDetail.id,
                serviceId: schema.onTourAccommodationDetail.serviceId,
              })
          : [];

      if (insertedAccommodationDetails.length > 0) {
        const accommodationDetailIdByServiceId = new Map(
          insertedAccommodationDetails.map((row) => [String(row.serviceId), String(row.id)] as const)
        );
        const roomAllocationValues = itemRows
          .filter(
            (item) =>
              String(item.itemType).toUpperCase() === "ACCOMMODATION" &&
              Array.isArray(item.rooms) &&
              item.rooms.length > 0
          )
          .flatMap((item) => {
            const serviceId = serviceIdBySourcePlanItemId.get(String(item.id));
            const accommodationDetailId = serviceId
              ? accommodationDetailIdByServiceId.get(serviceId)
              : null;
            if (!serviceId || !accommodationDetailId || !Array.isArray(item.rooms)) return [];

            return item.rooms.flatMap((room, roomIndex) => {
              const roomTypeName = String((room as { roomType?: string }).roomType || "Room");
              const count = Math.max(Number((room as { count?: number }).count ?? 0), 1);
              const adults = Number((room as { adults?: number }).adults ?? 0);
              const children = Number((room as { children?: number }).children ?? 0);

              return Array.from({ length: count }).map((_, allocationIndex) => ({
                companyId,
                code: `${String(item.code)}-RM-${roomIndex + 1}-${allocationIndex + 1}`,
                onTourId,
                accommodationDetailId,
                groupId: String(mainGroup.id),
                roomLabel: `${roomTypeName} ${roomIndex + 1}-${allocationIndex + 1}`,
                occupancyType:
                  adults <= 1
                    ? "SINGLE"
                    : adults === 2
                      ? "TWIN"
                      : adults === 3
                        ? "TRIPLE"
                        : "FAMILY",
                maxAdults: Math.max(adults, 1),
                maxChildren: Math.max(children, 0),
                adultCount: adults,
                childCount: children,
                infantCount: 0,
                childWithBedCount: 0,
                childWithoutBedCount: children,
                extraBedCount: 0,
                isSingleSupplementApplied: adults <= 1,
                status: "PLANNED",
                roomingSnapshot: {
                  source: "pre_tour_plan_item.rooms",
                  sourcePlanItemId: String(item.id),
                  roomIndex,
                },
              }));
            });
          });

        if (roomAllocationValues.length > 0) {
          await tx.insert(schema.onTourRoomAllocation).values(roomAllocationValues);
        }
      }

      const transportDetailValues = itemRows
        .filter((item) => String(item.itemType).toUpperCase() === "TRANSPORT")
        .flatMap((item) => {
          const serviceId = serviceIdBySourcePlanItemId.get(String(item.id));
          if (!serviceId) return [];
          const seatDemand = Number(item.pax ?? totalPax(plan));
          return [
            {
              companyId,
              code: `${String(item.code)}-TRN`,
              onTourId,
              serviceId,
              groupId: String(mainGroup.id),
              transportType: "SIGHTSEEING",
              fromLocationId: item.fromLocationId ? String(item.fromLocationId) : null,
              toLocationId: item.toLocationId ? String(item.toLocationId) : null,
              departureAt: item.startAt ? new Date(item.startAt) : null,
              arrivalAt: item.endAt ? new Date(item.endAt) : null,
              seatDemand,
              notes: item.notes ? String(item.notes) : null,
            },
          ];
        });

      const insertedTransportDetails =
        transportDetailValues.length > 0
          ? await tx
              .insert(schema.onTourTransportDetail)
              .values(transportDetailValues)
              .returning({
                id: schema.onTourTransportDetail.id,
                serviceId: schema.onTourTransportDetail.serviceId,
                seatDemand: schema.onTourTransportDetail.seatDemand,
              })
          : [];

      if (insertedTransportDetails.length > 0) {
        await tx.insert(schema.onTourVehicleRequirement).values(
          insertedTransportDetails.map((detail) => ({
            companyId,
            code: `${String(detail.serviceId)}-VEH`,
            onTourId,
            serviceId: String(detail.serviceId),
            transportDetailId: String(detail.id),
            groupId: String(mainGroup.id),
            passengerCount: Number(detail.seatDemand ?? 0),
            legalSeatDemand: Number(detail.seatDemand ?? 0),
            requirementStatus: "OPEN",
          }))
        );
      }

      const guideRequirementValues = guideRows.map((guideRow) => ({
        companyId,
        code: String(guideRow.code),
        onTourId,
        serviceId: null,
        groupId: String(mainGroup.id),
        coverageMode: String(guideRow.coverageMode || "FULL_TOUR"),
        startDayId: guideRow.startDayId
          ? onTourDayIdBySourceDayId.get(String(guideRow.startDayId)) ?? null
          : null,
        endDayId: guideRow.endDayId
          ? onTourDayIdBySourceDayId.get(String(guideRow.endDayId)) ?? null
          : null,
        languageId: null,
        guideBasis: guideRow.guideBasis ? String(guideRow.guideBasis) : null,
        paxCount: Number(guideRow.pax ?? totalPax(plan)),
        status: String(guideRow.status || "OPEN"),
        notes:
          [
            guideRow.title ? String(guideRow.title) : null,
            guideRow.language ? `Language: ${String(guideRow.language)}` : null,
            guideRow.notes ? String(guideRow.notes) : null,
          ]
            .filter(Boolean)
            .join(" | ") || null,
      }));

      if (guideRequirementValues.length > 0) {
        await tx.insert(schema.onTourGuideRequirement).values(guideRequirementValues);
      }

      return insertedOnTour;
    });

    return created;
  } catch (error) {
    if (isMissingRelationError(error)) {
      throw toSchemaNotReadyError("Operational record creation");
    }
    throw error;
  }
}

export async function convertPreTourPlanToOnTour(preTourPlanId: string, headers: Headers) {
  const access = await ensureWritable(headers);

  const [existing] = await db
    .select({
      id: schema.onTour.id,
    })
    .from(schema.onTour)
    .where(
      and(
        eq(schema.onTour.companyId, access.companyId),
        eq(schema.onTour.preTourPlanId, preTourPlanId),
        isNull(schema.onTour.deletedAt)
      )
    )
    .limit(1)
    .catch((error) => {
      if (isMissingRelationError(error)) return [];
      throw error;
    });

  const record = existing ?? (await ensurePersistedOnTour(access.companyId, preTourPlanId));

  return {
    onTourId: String(record.id),
    created: !existing,
  };
}

async function ensurePersistedOnTour(companyId: string, onTourId: string) {
  try {
    const [existing] = await db
      .select({
        id: schema.onTour.id,
        code: schema.onTour.code,
        confirmedStartDate: schema.onTour.confirmedStartDate,
        confirmedEndDate: schema.onTour.confirmedEndDate,
      })
      .from(schema.onTour)
      .where(
        and(
          eq(schema.onTour.id, onTourId),
          eq(schema.onTour.companyId, companyId),
          isNull(schema.onTour.deletedAt)
        )
      )
      .limit(1);

    if (existing) return existing;
    return bootstrapOnTourFromPreTour(companyId, onTourId);
  } catch (error) {
    if (isMissingRelationError(error)) {
      throw toSchemaNotReadyError("Operational record access");
    }
    throw error;
  }
}

async function getAccess(headers: Headers) {
  try {
    return await resolveAccess(headers, {
      requiredPrivilege: "SCREEN_PRE_TOURS",
    });
  } catch (error) {
    if (error instanceof AccessControlError) {
      throw new OnTourError(error.status, error.code, error.message);
    }
    throw error;
  }
}

async function ensureWritable(headers: Headers) {
  const access = await getAccess(headers);
  if (access.readOnly) {
    throw new OnTourError(
      403,
      "READ_ONLY_MODE",
      "You are in read-only mode. Contact a manager for edit access."
    );
  }
  return access;
}

async function loadOrganizationNameMap(companyId: string, ids: string[]) {
  if (ids.length === 0) return new Map<string, string>();
  const rows = await db
    .select({
      id: schema.businessOrganization.id,
      name: schema.businessOrganization.name,
    })
    .from(schema.businessOrganization)
    .where(
      and(
        eq(schema.businessOrganization.companyId, companyId),
        inArray(schema.businessOrganization.id, ids)
      )
    );

  return new Map(rows.map((row) => [String(row.id), String(row.name)]));
}

async function loadVehicleCategoryNameMap(companyId: string, ids: string[]) {
  if (ids.length === 0) return new Map<string, string>();
  const rows = await db
    .select({
      id: schema.transportVehicleCategory.id,
      name: schema.transportVehicleCategory.name,
    })
    .from(schema.transportVehicleCategory)
    .where(
      and(
        eq(schema.transportVehicleCategory.companyId, companyId),
        inArray(schema.transportVehicleCategory.id, ids)
      )
    );

  return new Map(rows.map((row) => [String(row.id), String(row.name)]));
}

async function loadVehicleTypeNameMap(companyId: string, ids: string[]) {
  if (ids.length === 0) return new Map<string, string>();
  const rows = await db
    .select({
      id: schema.transportVehicleType.id,
      name: schema.transportVehicleType.name,
    })
    .from(schema.transportVehicleType)
    .where(
      and(
        eq(schema.transportVehicleType.companyId, companyId),
        inArray(schema.transportVehicleType.id, ids)
      )
    );

  return new Map(rows.map((row) => [String(row.id), String(row.name)]));
}

async function loadGuideNameMap(companyId: string, ids: string[]) {
  if (ids.length === 0) return new Map<string, string>();
  const rows = await db
    .select({
      id: schema.guide.id,
      name: schema.guide.fullName,
    })
    .from(schema.guide)
    .where(and(eq(schema.guide.companyId, companyId), inArray(schema.guide.id, ids)));

  return new Map(rows.map((row) => [String(row.id), String(row.name)]));
}

async function loadGuideLanguageNameMap(companyId: string, ids: string[]) {
  if (ids.length === 0) return new Map<string, string>();
  const rows = await db
    .select({
      id: schema.guideLanguageMaster.id,
      name: schema.guideLanguageMaster.name,
    })
    .from(schema.guideLanguageMaster)
    .where(
      and(
        eq(schema.guideLanguageMaster.companyId, companyId),
        inArray(schema.guideLanguageMaster.id, ids)
      )
    );

  return new Map(rows.map((row) => [String(row.id), String(row.name)]));
}

async function loadPersistedOnTourOperationalSlices(
  companyId: string,
  onTourId: string,
  persistedState: NonNullable<Awaited<ReturnType<typeof loadPersistedOnTourState>>>
) {
  try {
    const [
      dayRows,
      serviceRows,
      accommodationRows,
      roomAllocationRows,
      requisitionRows,
      voucherRows,
      vehicleRequirementRows,
      vehicleAllocationRows,
      guideRequirementRows,
      guideAllocationRows,
      invoiceRows,
      supplierBillRows,
      reconciliationRows,
    ] = await Promise.all([
      db
        .select({
          id: schema.onTourDay.id,
          dayNumber: schema.onTourDay.dayNumber,
        })
        .from(schema.onTourDay)
        .where(eq(schema.onTourDay.onTourId, onTourId)),
      db
        .select({
          id: schema.onTourService.id,
          code: schema.onTourService.code,
          title: schema.onTourService.title,
          serviceType: schema.onTourService.serviceType,
          serviceMode: schema.onTourService.serviceMode,
          chargeBasis: schema.onTourService.chargeBasis,
          confirmationStatus: schema.onTourService.confirmationStatus,
          supplierOrgId: schema.onTourService.supplierOrgId,
          dayId: schema.onTourService.dayId,
          groupId: schema.onTourService.groupId,
          startAt: schema.onTourService.startAt,
          endAt: schema.onTourService.endAt,
          quotedTotalAmount: schema.onTourService.quotedTotalAmount,
          confirmedTotalAmount: schema.onTourService.confirmedTotalAmount,
          actualTotalAmount: schema.onTourService.actualTotalAmount,
        })
        .from(schema.onTourService)
        .where(eq(schema.onTourService.onTourId, onTourId))
        .orderBy(schema.onTourService.sortOrder, schema.onTourService.createdAt),
      db
        .select({
          id: schema.onTourAccommodationDetail.id,
        })
        .from(schema.onTourAccommodationDetail)
        .where(eq(schema.onTourAccommodationDetail.onTourId, onTourId)),
      db
        .select({
          id: schema.onTourRoomAllocation.id,
          roomLabel: schema.onTourRoomAllocation.roomLabel,
          occupancyType: schema.onTourRoomAllocation.occupancyType,
          roomNumber: schema.onTourRoomAllocation.roomNumber,
          mealPlan: schema.onTourRoomAllocation.mealPlan,
          adultCount: schema.onTourRoomAllocation.adultCount,
          childCount: schema.onTourRoomAllocation.childCount,
          extraBedCount: schema.onTourRoomAllocation.extraBedCount,
          isSingleSupplementApplied: schema.onTourRoomAllocation.isSingleSupplementApplied,
        })
        .from(schema.onTourRoomAllocation)
        .where(eq(schema.onTourRoomAllocation.onTourId, onTourId)),
      db
        .select({
          id: schema.serviceRequisition.id,
          requisitionNo: schema.serviceRequisition.requisitionNo,
          supplierOrgId: schema.serviceRequisition.supplierOrgId,
          requisitionType: schema.serviceRequisition.requisitionType,
          serviceType: schema.serviceRequisition.serviceType,
          status: schema.serviceRequisition.status,
          requestDate: schema.serviceRequisition.requestDate,
          totalAmount: schema.serviceRequisition.totalAmount,
        })
        .from(schema.serviceRequisition)
        .where(eq(schema.serviceRequisition.onTourId, onTourId))
        .orderBy(desc(schema.serviceRequisition.requestDate)),
      db
        .select({
          id: schema.supplierVoucher.id,
          voucherNo: schema.supplierVoucher.voucherNo,
          supplierOrgId: schema.supplierVoucher.supplierOrgId,
          status: schema.supplierVoucher.status,
          voucherDate: schema.supplierVoucher.voucherDate,
          serviceDate: schema.supplierVoucher.serviceDate,
        })
        .from(schema.supplierVoucher)
        .where(eq(schema.supplierVoucher.onTourId, onTourId))
        .orderBy(desc(schema.supplierVoucher.voucherDate)),
      db
        .select({
          id: schema.onTourVehicleRequirement.id,
          requirementStatus: schema.onTourVehicleRequirement.requirementStatus,
        })
        .from(schema.onTourVehicleRequirement)
        .where(eq(schema.onTourVehicleRequirement.onTourId, onTourId)),
      db
        .select({
          id: schema.onTourVehicleAllocation.id,
          supplierOrgId: schema.onTourVehicleAllocation.supplierOrgId,
          vehicleCategoryId: schema.onTourVehicleAllocation.vehicleCategoryId,
          vehicleTypeId: schema.onTourVehicleAllocation.vehicleTypeId,
          vehicleRegNo: schema.onTourVehicleAllocation.vehicleRegNo,
          driverName: schema.onTourVehicleAllocation.driverName,
          confirmationStatus: schema.onTourVehicleAllocation.confirmationStatus,
          status: schema.onTourVehicleAllocation.status,
        })
        .from(schema.onTourVehicleAllocation)
        .where(eq(schema.onTourVehicleAllocation.onTourId, onTourId))
        .orderBy(desc(schema.onTourVehicleAllocation.createdAt)),
      db
        .select({
          id: schema.onTourGuideRequirement.id,
          status: schema.onTourGuideRequirement.status,
        })
        .from(schema.onTourGuideRequirement)
        .where(eq(schema.onTourGuideRequirement.onTourId, onTourId)),
      db
        .select({
          id: schema.onTourGuideAllocation.id,
          supplierOrgId: schema.onTourGuideAllocation.supplierOrgId,
          guideId: schema.onTourGuideAllocation.guideId,
          languageId: schema.onTourGuideAllocation.languageId,
          confirmationStatus: schema.onTourGuideAllocation.confirmationStatus,
          status: schema.onTourGuideAllocation.status,
        })
        .from(schema.onTourGuideAllocation)
        .where(eq(schema.onTourGuideAllocation.onTourId, onTourId))
        .orderBy(desc(schema.onTourGuideAllocation.createdAt)),
      db
        .select({
          id: schema.customerInvoice.id,
          invoiceNo: schema.customerInvoice.invoiceNo,
          status: schema.customerInvoice.status,
          invoiceDate: schema.customerInvoice.invoiceDate,
          totalAmount: schema.customerInvoice.totalAmount,
        })
        .from(schema.customerInvoice)
        .where(eq(schema.customerInvoice.onTourId, onTourId))
        .orderBy(desc(schema.customerInvoice.invoiceDate)),
      db
        .select({
          id: schema.supplierBill.id,
          billNo: schema.supplierBill.billNo,
          status: schema.supplierBill.status,
          billDate: schema.supplierBill.billDate,
          totalAmount: schema.supplierBill.totalAmount,
        })
        .from(schema.supplierBill)
        .where(eq(schema.supplierBill.onTourId, onTourId))
        .orderBy(desc(schema.supplierBill.billDate)),
      db
        .select({
          quotedRevenue: schema.onTourCostReconciliation.quotedRevenue,
          invoicedRevenue: schema.onTourCostReconciliation.invoicedRevenue,
          quotedCost: schema.onTourCostReconciliation.quotedCost,
          actualCost: schema.onTourCostReconciliation.actualCost,
          quotedMargin: schema.onTourCostReconciliation.quotedMargin,
          actualMargin: schema.onTourCostReconciliation.actualMargin,
        })
        .from(schema.onTourCostReconciliation)
        .where(eq(schema.onTourCostReconciliation.onTourId, onTourId))
        .orderBy(desc(schema.onTourCostReconciliation.asOfAt))
        .limit(1),
    ]);

    const roomTravelerRows =
      roomAllocationRows.length > 0
        ? await db
            .select({
              roomAllocationId: schema.onTourRoomTraveler.roomAllocationId,
              travelerId: schema.onTourRoomTraveler.travelerId,
            })
            .from(schema.onTourRoomTraveler)
            .where(
              inArray(
                schema.onTourRoomTraveler.roomAllocationId,
                roomAllocationRows.map((row) => String(row.id))
              )
            )
        : [];

    const organizationNameMap = await loadOrganizationNameMap(
      companyId,
      [
        ...new Set(
          [
            ...serviceRows.map((row) => row.supplierOrgId),
            ...requisitionRows.map((row) => row.supplierOrgId),
            ...voucherRows.map((row) => row.supplierOrgId),
            ...vehicleAllocationRows.map((row) => row.supplierOrgId),
            ...guideAllocationRows.map((row) => row.supplierOrgId),
          ].filter((value): value is string => Boolean(value))
        ),
      ]
    );

    const [vehicleCategoryNameMap, vehicleTypeNameMap, guideNameMap, guideLanguageNameMap] =
      await Promise.all([
        loadVehicleCategoryNameMap(
          companyId,
          [
            ...new Set(
              vehicleAllocationRows
                .map((row) => row.vehicleCategoryId)
                .filter((value): value is string => Boolean(value))
            ),
          ]
        ),
        loadVehicleTypeNameMap(
          companyId,
          [
            ...new Set(
              vehicleAllocationRows
                .map((row) => row.vehicleTypeId)
                .filter((value): value is string => Boolean(value))
            ),
          ]
        ),
        loadGuideNameMap(
          companyId,
          [
            ...new Set(
              guideAllocationRows.map((row) => row.guideId).filter((value): value is string => Boolean(value))
            ),
          ]
        ),
        loadGuideLanguageNameMap(
          companyId,
          [
            ...new Set(
              guideAllocationRows
                .map((row) => row.languageId)
                .filter((value): value is string => Boolean(value))
            ),
          ]
        ),
      ]);

    const travelerNameMap = new Map(
      persistedState.travelers.map((traveler) => [traveler.id, traveler.fullName] as const)
    );
    const groupNameMap = new Map(
      persistedState.groups.map((group) => [group.id, group.groupName] as const)
    );
    const dayNumberMap = new Map(dayRows.map((row) => [String(row.id), Number(row.dayNumber)] as const));

    const travelerNamesByRoom = new Map<string, string[]>();
    for (const row of roomTravelerRows) {
      const roomAllocationId = String(row.roomAllocationId);
      const travelerName = travelerNameMap.get(String(row.travelerId));
      if (!travelerName) continue;
      if (!travelerNamesByRoom.has(roomAllocationId)) {
        travelerNamesByRoom.set(roomAllocationId, []);
      }
      travelerNamesByRoom.get(roomAllocationId)?.push(travelerName);
    }

    const services = serviceRows.map((row) => ({
      id: String(row.id),
      code: String(row.code),
      title: String(row.title),
      serviceType: String(row.serviceType).toUpperCase(),
      serviceMode: String(row.serviceMode),
      chargeBasis: String(row.chargeBasis),
      confirmationStatus: String(row.confirmationStatus),
      supplierOrgName: row.supplierOrgId
        ? organizationNameMap.get(String(row.supplierOrgId)) ?? null
        : null,
      dayNumber: row.dayId ? dayNumberMap.get(String(row.dayId)) ?? null : null,
      groupName: row.groupId ? groupNameMap.get(String(row.groupId)) ?? null : null,
      startAt: row.startAt ? new Date(row.startAt).toISOString() : null,
      endAt: row.endAt ? new Date(row.endAt).toISOString() : null,
      quotedTotalAmount: formatMoney(row.quotedTotalAmount),
      confirmedTotalAmount: formatMoney(row.confirmedTotalAmount),
      actualTotalAmount: formatMoney(row.actualTotalAmount),
    }));

    return {
      services,
      rooming: roomAllocationRows.map((row) => ({
        id: String(row.id),
        roomLabel: String(row.roomLabel),
        occupancyType: String(row.occupancyType),
        roomNumber: row.roomNumber ? String(row.roomNumber) : null,
        mealPlan: row.mealPlan ? String(row.mealPlan) : null,
        travelerNames: travelerNamesByRoom.get(String(row.id)) ?? [],
        adultCount: Number(row.adultCount ?? 0),
        childCount: Number(row.childCount ?? 0),
        extraBedCount: Number(row.extraBedCount ?? 0),
        isSingleSupplementApplied: Boolean(row.isSingleSupplementApplied),
      })),
      requisitions: requisitionRows.map((row) => ({
        id: String(row.id),
        requisitionNo: String(row.requisitionNo),
        supplierName: row.supplierOrgId
          ? organizationNameMap.get(String(row.supplierOrgId)) ?? null
          : null,
        requisitionType: String(row.requisitionType),
        serviceType: row.serviceType ? String(row.serviceType) : null,
        status: String(row.status),
        requestDate: row.requestDate ? new Date(row.requestDate).toISOString() : null,
        totalAmount: formatMoney(row.totalAmount),
      })),
      vouchers: voucherRows.map((row) => ({
        id: String(row.id),
        voucherNo: String(row.voucherNo),
        supplierName: row.supplierOrgId
          ? organizationNameMap.get(String(row.supplierOrgId)) ?? null
          : null,
        status: String(row.status),
        voucherDate: row.voucherDate ? new Date(row.voucherDate).toISOString() : null,
        serviceDate: row.serviceDate ? new Date(row.serviceDate).toISOString() : null,
      })),
      vehicleAllocations: vehicleAllocationRows.map((row) => ({
        id: String(row.id),
        vehicleCategoryName: row.vehicleCategoryId
          ? vehicleCategoryNameMap.get(String(row.vehicleCategoryId)) ?? null
          : null,
        vehicleTypeName: row.vehicleTypeId
          ? vehicleTypeNameMap.get(String(row.vehicleTypeId)) ?? null
          : null,
        vehicleRegNo: row.vehicleRegNo ? String(row.vehicleRegNo) : null,
        driverName: row.driverName ? String(row.driverName) : null,
        confirmationStatus: String(row.confirmationStatus),
        status: String(row.status),
      })),
      guideAllocations: guideAllocationRows.map((row) => ({
        id: String(row.id),
        guideName: row.guideId ? guideNameMap.get(String(row.guideId)) ?? null : null,
        languageName: row.languageId
          ? guideLanguageNameMap.get(String(row.languageId)) ?? null
          : null,
        supplierName: row.supplierOrgId
          ? organizationNameMap.get(String(row.supplierOrgId)) ?? null
          : null,
        confirmationStatus: String(row.confirmationStatus),
        status: String(row.status),
      })),
      finance: {
        invoices: invoiceRows.map((row) => ({
          id: String(row.id),
          invoiceNo: String(row.invoiceNo),
          status: String(row.status),
          invoiceDate: row.invoiceDate ? new Date(row.invoiceDate).toISOString() : null,
          totalAmount: formatMoney(row.totalAmount),
        })),
        supplierBills: supplierBillRows.map((row) => ({
          id: String(row.id),
          billNo: String(row.billNo),
          status: String(row.status),
          billDate: row.billDate ? new Date(row.billDate).toISOString() : null,
          totalAmount: formatMoney(row.totalAmount),
        })),
        reconciliation: reconciliationRows[0]
          ? {
              quotedRevenue: formatMoney(reconciliationRows[0].quotedRevenue),
              invoicedRevenue: formatMoney(reconciliationRows[0].invoicedRevenue),
              quotedCost: formatMoney(reconciliationRows[0].quotedCost),
              actualCost: formatMoney(reconciliationRows[0].actualCost),
              quotedMargin: formatMoney(reconciliationRows[0].quotedMargin),
              actualMargin: formatMoney(reconciliationRows[0].actualMargin),
            }
          : null,
      },
      metrics: {
        unconfirmedServices: services.filter((row) => row.confirmationStatus !== "CONFIRMED").length,
        openRequisitions: requisitionRows.filter((row) => {
          const status = String(row.status).toUpperCase();
          return status !== "CLOSED" && status !== "CONFIRMED" && status !== "CANCELED";
        }).length,
        missingRooming:
          roomAllocationRows.length > 0
            ? 0
            : accommodationRows.length,
        pendingVehicles:
          vehicleRequirementRows.length > 0
            ? vehicleRequirementRows.filter((row) => String(row.requirementStatus).toUpperCase() !== "ALLOCATED").length
            : services.filter((row) => row.serviceType === "TRANSPORT").length,
        pendingGuides:
          guideRequirementRows.length > 0
            ? guideRequirementRows.filter((row) => String(row.status).toUpperCase() !== "CONFIRMED").length
            : services.filter((row) => row.serviceType === "GUIDE").length,
      },
    };
  } catch (error) {
    if (isMissingRelationError(error)) {
      return null;
    }
    throw error;
  }
}

export async function listOnTourRecords(searchParams: URLSearchParams, headers: Headers) {
  const access = await getAccess(headers);
  const query = onTourListQuerySchema.parse({
    q: searchParams.get("q") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });

  let persistedRows: Array<{
    id: string;
    preTourPlanId: string | null;
    code: string;
    bookingNo: string;
    departureCode: string;
    title: string;
    status: string;
    confirmedStartDate: Date;
    confirmedEndDate: Date;
    preferredLanguage: string | null;
    marketOrgId: string | null;
    operatorOrgId: string | null;
    totalPax: number | null;
    adults: number | null;
    children: number | null;
    infants: number | null;
    foc: number | null;
    currencyCode: string;
    quotedGrandTotal: string | null;
    confirmedGrandTotal: string | null;
    actualGrandTotal: string | null;
    updatedAt: Date;
    isLocked: boolean | null;
  }> = [];

  try {
    persistedRows = await db
      .select({
        id: schema.onTour.id,
        preTourPlanId: schema.onTour.preTourPlanId,
        code: schema.onTour.code,
        bookingNo: schema.onTour.bookingNo,
        departureCode: schema.onTour.departureCode,
        title: schema.onTour.title,
        status: schema.onTour.status,
        confirmedStartDate: schema.onTour.confirmedStartDate,
        confirmedEndDate: schema.onTour.confirmedEndDate,
        preferredLanguage: schema.onTour.preferredLanguage,
        marketOrgId: schema.onTour.marketOrgId,
        operatorOrgId: schema.onTour.operatorOrgId,
        totalPax: schema.onTour.totalPax,
        adults: schema.onTour.adults,
        children: schema.onTour.children,
        infants: schema.onTour.infants,
        foc: schema.onTour.foc,
        currencyCode: schema.onTour.currencyCode,
        quotedGrandTotal: schema.onTour.quotedGrandTotal,
        confirmedGrandTotal: schema.onTour.confirmedGrandTotal,
        actualGrandTotal: schema.onTour.actualGrandTotal,
        updatedAt: schema.onTour.updatedAt,
        isLocked: schema.onTour.isLocked,
      })
      .from(schema.onTour)
      .where(
        and(
          eq(schema.onTour.companyId, access.companyId),
          isNull(schema.onTour.deletedAt),
          query.status ? eq(schema.onTour.status, query.status) : undefined,
          query.q
            ? or(
                ilike(schema.onTour.bookingNo, `%${query.q}%`),
                ilike(schema.onTour.departureCode, `%${query.q}%`),
                ilike(schema.onTour.title, `%${query.q}%`),
                ilike(schema.onTour.code, `%${query.q}%`)
              )
            : undefined
        )
      )
      .orderBy(desc(schema.onTour.updatedAt));
  } catch (error) {
    if (!isMissingRelationError(error)) {
      throw error;
    }
  }

  const persistedPreTourPlanIds = new Set(
    persistedRows
      .map((row) => row.preTourPlanId)
      .filter((value): value is string => Boolean(value))
  );
  const persistedIds = new Set(persistedRows.map((row) => String(row.id)));

  const plans = await db
    .select({
      id: schema.preTourPlan.id,
      code: schema.preTourPlan.code,
      referenceNo: schema.preTourPlan.referenceNo,
      planCode: schema.preTourPlan.planCode,
      title: schema.preTourPlan.title,
      status: schema.preTourPlan.status,
      startDate: schema.preTourPlan.startDate,
      endDate: schema.preTourPlan.endDate,
      preferredLanguage: schema.preTourPlan.preferredLanguage,
      adults: schema.preTourPlan.adults,
      children: schema.preTourPlan.children,
      infants: schema.preTourPlan.infants,
      currencyCode: schema.preTourPlan.currencyCode,
      grandTotal: schema.preTourPlan.grandTotal,
      updatedAt: schema.preTourPlan.updatedAt,
      marketOrgId: schema.preTourPlan.marketOrgId,
      operatorOrgId: schema.preTourPlan.operatorOrgId,
      isLocked: schema.preTourPlan.isLocked,
    })
    .from(schema.preTourPlan)
    .where(
      and(
        eq(schema.preTourPlan.companyId, access.companyId),
        isNull(schema.preTourPlan.deletedAt),
        or(...SUPPORTED_SOURCE_STATUSES.map((status) => eq(schema.preTourPlan.status, status))),
        query.q
          ? or(
              ilike(schema.preTourPlan.referenceNo, `%${query.q}%`),
              ilike(schema.preTourPlan.planCode, `%${query.q}%`),
              ilike(schema.preTourPlan.title, `%${query.q}%`),
              ilike(schema.preTourPlan.code, `%${query.q}%`)
            )
          : undefined
      )
    )
    .orderBy(desc(schema.preTourPlan.updatedAt));

  const organizationNameMap = await loadOrganizationNameMap(
    access.companyId,
    [
      ...new Set(
        [...plans, ...persistedRows]
          .flatMap((row) => [row.marketOrgId, row.operatorOrgId])
          .filter((value): value is string => Boolean(value))
      ),
    ]
  );

  const projectedRows = plans
    .map((plan) => ({
      id: String(plan.id),
      code: String(plan.code),
      bookingNo: String(plan.referenceNo),
      departureCode: String(plan.planCode),
      title: String(plan.title),
      status: mapPreTourStatusToOnTourStatus(plan.status),
      confirmedStartDate: new Date(plan.startDate).toISOString(),
      confirmedEndDate: new Date(plan.endDate).toISOString(),
      preferredLanguage: plan.preferredLanguage ? String(plan.preferredLanguage) : null,
      marketOrgName: plan.marketOrgId ? organizationNameMap.get(String(plan.marketOrgId)) ?? null : null,
      operatorOrgName: plan.operatorOrgId ? organizationNameMap.get(String(plan.operatorOrgId)) ?? null : null,
      totalPax: totalPax(plan),
      adults: Number(plan.adults ?? 0),
      children: Number(plan.children ?? 0),
      infants: Number(plan.infants ?? 0),
      foc: 0,
      currencyCode: String(plan.currencyCode),
      quotedGrandTotal: formatMoney(plan.grandTotal),
      confirmedGrandTotal: formatMoney(plan.grandTotal),
      actualGrandTotal: formatMoney(plan.grandTotal),
      updatedAt: new Date(plan.updatedAt).toISOString(),
      isLocked: Boolean(plan.isLocked),
    }))
    .filter((row) => !persistedPreTourPlanIds.has(row.id) && !persistedIds.has(row.id))
    .filter((row) => !query.status || row.status === query.status);

  const normalizedRows = [
    ...persistedRows.map((row) => ({
      id: String(row.id),
      code: String(row.code),
      bookingNo: String(row.bookingNo),
      departureCode: String(row.departureCode),
      title: String(row.title),
      status: String(row.status),
      confirmedStartDate: new Date(row.confirmedStartDate).toISOString(),
      confirmedEndDate: new Date(row.confirmedEndDate).toISOString(),
      preferredLanguage: row.preferredLanguage ? String(row.preferredLanguage) : null,
      marketOrgName: row.marketOrgId ? organizationNameMap.get(String(row.marketOrgId)) ?? null : null,
      operatorOrgName: row.operatorOrgId ? organizationNameMap.get(String(row.operatorOrgId)) ?? null : null,
      totalPax: Number(row.totalPax ?? 0),
      adults: Number(row.adults ?? 0),
      children: Number(row.children ?? 0),
      infants: Number(row.infants ?? 0),
      foc: Number(row.foc ?? 0),
      currencyCode: String(row.currencyCode),
      quotedGrandTotal: formatMoney(row.quotedGrandTotal),
      confirmedGrandTotal: formatMoney(row.confirmedGrandTotal),
      actualGrandTotal: formatMoney(row.actualGrandTotal),
      updatedAt: new Date(row.updatedAt).toISOString(),
      isLocked: Boolean(row.isLocked),
    })),
    ...projectedRows,
  ]
    .sort((left, right) => {
      const leftTime = left.updatedAt ? new Date(left.updatedAt).getTime() : 0;
      const rightTime = right.updatedAt ? new Date(right.updatedAt).getTime() : 0;
      return rightTime - leftTime;
    })
    .filter((row) => !query.status || row.status === query.status);

  const total = normalizedRows.length;
  const start = (query.page - 1) * query.limit;

  return {
    rows: normalizedRows.slice(start, start + query.limit),
    total,
    page: query.page,
    limit: query.limit,
  };
}

export async function getOnTourDetail(onTourId: string, headers: Headers) {
  const access = await getAccess(headers);
  const persistedState = await loadPersistedOnTourState(access.companyId, onTourId);
  const persistedOperational = persistedState
    ? await loadPersistedOnTourOperationalSlices(access.companyId, onTourId, persistedState)
    : null;
  const planLookupId = persistedState?.tour.preTourPlanId
    ? String(persistedState.tour.preTourPlanId)
    : onTourId;

  const [plan] = await db
    .select({
      id: schema.preTourPlan.id,
      code: schema.preTourPlan.code,
      referenceNo: schema.preTourPlan.referenceNo,
      planCode: schema.preTourPlan.planCode,
      title: schema.preTourPlan.title,
      status: schema.preTourPlan.status,
      startDate: schema.preTourPlan.startDate,
      endDate: schema.preTourPlan.endDate,
      preferredLanguage: schema.preTourPlan.preferredLanguage,
      adults: schema.preTourPlan.adults,
      children: schema.preTourPlan.children,
      infants: schema.preTourPlan.infants,
      currencyCode: schema.preTourPlan.currencyCode,
      grandTotal: schema.preTourPlan.grandTotal,
      baseTotal: schema.preTourPlan.baseTotal,
      updatedAt: schema.preTourPlan.updatedAt,
      createdAt: schema.preTourPlan.createdAt,
      marketOrgId: schema.preTourPlan.marketOrgId,
      operatorOrgId: schema.preTourPlan.operatorOrgId,
      totalNights: schema.preTourPlan.totalNights,
      notes: schema.preTourPlan.notes,
      isLocked: schema.preTourPlan.isLocked,
    })
    .from(schema.preTourPlan)
    .where(
      and(
        eq(schema.preTourPlan.id, planLookupId),
        eq(schema.preTourPlan.companyId, access.companyId),
        isNull(schema.preTourPlan.deletedAt)
      )
    )
    .limit(1);

  if (!plan && !persistedState) {
    throw new OnTourError(404, "ON_TOUR_NOT_FOUND", "Operational file not found.");
  }

  const organizationNameMap = await loadOrganizationNameMap(
    access.companyId,
    [
      persistedState?.tour.marketOrgId ?? null,
      persistedState?.tour.operatorOrgId ?? null,
      plan?.marketOrgId ?? null,
      plan?.operatorOrgId ?? null,
    ].filter((value): value is string => Boolean(value))
  );

  const [days, items, guideAllocations] = await Promise.all([
    plan
      ? db
      .select({
        id: schema.preTourPlanDay.id,
        dayNumber: schema.preTourPlanDay.dayNumber,
      })
      .from(schema.preTourPlanDay)
      .where(eq(schema.preTourPlanDay.planId, plan.id))
      .orderBy(schema.preTourPlanDay.dayNumber)
      : Promise.resolve([]),
    plan
      ? db
      .select({
        id: schema.preTourPlanItem.id,
        code: schema.preTourPlanItem.code,
        title: schema.preTourPlanItem.title,
        itemType: schema.preTourPlanItem.itemType,
        dayId: schema.preTourPlanItem.dayId,
        startAt: schema.preTourPlanItem.startAt,
        endAt: schema.preTourPlanItem.endAt,
        totalAmount: schema.preTourPlanItem.totalAmount,
        status: schema.preTourPlanItem.status,
        rooms: schema.preTourPlanItem.rooms,
      })
      .from(schema.preTourPlanItem)
      .where(eq(schema.preTourPlanItem.planId, plan.id))
      .orderBy(schema.preTourPlanItem.dayId, schema.preTourPlanItem.sortOrder)
      : Promise.resolve([]),
    plan
      ? db
      .select({
        id: schema.preTourPlanGuideAllocation.id,
        code: schema.preTourPlanGuideAllocation.code,
        title: schema.preTourPlanGuideAllocation.title,
        language: schema.preTourPlanGuideAllocation.language,
        status: schema.preTourPlanGuideAllocation.status,
      })
      .from(schema.preTourPlanGuideAllocation)
      .where(eq(schema.preTourPlanGuideAllocation.planId, plan.id))
      .orderBy(schema.preTourPlanGuideAllocation.createdAt)
      : Promise.resolve([]),
  ]);

  const dayNumberById = new Map(days.map((day) => [String(day.id), Number(day.dayNumber)]));

  const services = items.map((item) => ({
    id: String(item.id),
    code: String(item.code),
    title: String(item.title || item.itemType),
    serviceType: String(item.itemType).toUpperCase(),
    serviceMode: "CORE",
    chargeBasis: "FLAT",
    confirmationStatus: mapPlanItemStatusToConfirmationStatus(item.status),
    supplierOrgName: null,
    dayNumber: dayNumberById.get(String(item.dayId)) ?? null,
    groupName: "Main Group",
    startAt: item.startAt ? new Date(item.startAt).toISOString() : null,
    endAt: item.endAt ? new Date(item.endAt).toISOString() : null,
    quotedTotalAmount: formatMoney(item.totalAmount),
    confirmedTotalAmount: formatMoney(item.totalAmount),
    actualTotalAmount: formatMoney(item.totalAmount),
  }));

  const rooming = items.flatMap((item) => {
    if (String(item.itemType).toUpperCase() !== "ACCOMMODATION" || !Array.isArray(item.rooms)) {
      return [];
    }

    const dayNumber = dayNumberById.get(String(item.dayId)) ?? 0;
    return item.rooms.flatMap((room, index) => {
      const count = Number((room as { count?: number }).count ?? 0);
      const adults = Number((room as { adults?: number }).adults ?? 0);
      const children = Number((room as { children?: number }).children ?? 0);
      return Array.from({ length: Math.max(count, 1) }).map((_, roomIndex) => ({
        id: `${item.id}:${index}:${roomIndex}`,
        roomLabel: `Day ${dayNumber} • ${String((room as { roomType?: string }).roomType || "Room")} ${count > 1 ? roomIndex + 1 : ""}`.trim(),
        occupancyType: adults <= 1 ? "SINGLE" : "TWIN",
        roomNumber: null,
        mealPlan: null,
        travelerNames: [],
        adultCount: adults,
        childCount: children,
        extraBedCount: 0,
        isSingleSupplementApplied: adults === 1,
      }));
    });
  });

  const resolvedServices =
    persistedOperational && persistedOperational.services.length > 0
      ? persistedOperational.services
      : services;
  const resolvedRooming =
    persistedOperational && (persistedOperational.rooming.length > 0 || persistedState)
      ? persistedOperational.rooming
      : rooming;
  const resolvedGuideAllocations =
    persistedOperational && persistedOperational.guideAllocations.length > 0
      ? persistedOperational.guideAllocations
      : guideAllocations.map((row) => ({
          id: String(row.id),
          guideName: row.title ? String(row.title) : "Guide requirement",
          languageName: row.language ? String(row.language) : null,
          supplierName: null,
          confirmationStatus: mapPlanItemStatusToConfirmationStatus(row.status),
          status: String(row.status || "PLANNED"),
        }));
  const unconfirmedServices = persistedOperational
    ? persistedOperational.metrics.unconfirmedServices
    : resolvedServices.filter((service) => service.confirmationStatus !== "CONFIRMED").length;
  const pendingVehicles = persistedOperational
    ? persistedOperational.metrics.pendingVehicles
    : resolvedServices.filter((service) => service.serviceType === "TRANSPORT").length;
  const projectedMissingRooming = items.filter(
    (item) => String(item.itemType).toUpperCase() === "ACCOMMODATION" && (!Array.isArray(item.rooms) || item.rooms.length === 0)
  ).length;
  const missingRooming = persistedOperational
    ? persistedOperational.metrics.missingRooming
    : projectedMissingRooming;
  const travelers = persistedState?.travelers ?? [];
  const groups =
    persistedState?.groups ??
    [
      {
        id: buildMainGroupId(String(plan?.id)),
        code: `${plan?.code}-MAIN`,
        groupName: "Main Group",
        subgroupType: "MAIN",
        startDate: plan?.startDate ? new Date(plan.startDate).toISOString() : null,
        endDate: plan?.endDate ? new Date(plan.endDate).toISOString() : null,
        travelerCount: plan ? totalPax(plan) : Number(persistedState?.tour.totalPax ?? 0),
        notes: plan?.notes ? String(plan.notes) : persistedState?.tour.notes ? String(persistedState.tour.notes) : null,
        isPrimary: true,
      },
    ];
  const unassignedTravelers = persistedState
    ? Math.max(Number(persistedState.tour.totalPax ?? 0) - persistedState.assignedTravelerIds.size, 0)
    : totalPax(plan ?? {});
  const onTourHeader = persistedState?.tour;
  const resolvedStatus = onTourHeader ? String(onTourHeader.status) : mapPreTourStatusToOnTourStatus(plan?.status);
  const resolvedQuotedRevenue = onTourHeader
    ? formatMoney(onTourHeader.quotedGrandTotal)
    : formatMoney(plan?.grandTotal);
  const resolvedConfirmedCost = onTourHeader
    ? formatMoney(onTourHeader.confirmedBaseTotal)
    : formatMoney(plan?.baseTotal);
  const resolvedActualCost = onTourHeader
    ? formatMoney(onTourHeader.actualBaseTotal)
    : formatMoney(plan?.baseTotal);
  const resolvedActualMargin = onTourHeader
    ? formatMoney(Number(onTourHeader.actualGrandTotal ?? 0) - Number(onTourHeader.actualBaseTotal ?? 0))
    : formatMoney(Number(plan?.grandTotal ?? 0) - Number(plan?.baseTotal ?? 0));

  return {
    onTour: {
      id: onTourHeader ? String(onTourHeader.id) : String(plan?.id),
      code: onTourHeader ? String(onTourHeader.code) : String(plan?.code),
      bookingNo: onTourHeader ? String(onTourHeader.bookingNo) : String(plan?.referenceNo),
      departureCode: onTourHeader ? String(onTourHeader.departureCode) : String(plan?.planCode),
      title: onTourHeader ? String(onTourHeader.title) : String(plan?.title),
      status: resolvedStatus,
      confirmedStartDate: onTourHeader
        ? new Date(onTourHeader.confirmedStartDate).toISOString()
        : new Date(plan?.startDate ?? Date.now()).toISOString(),
      confirmedEndDate: onTourHeader
        ? new Date(onTourHeader.confirmedEndDate).toISOString()
        : new Date(plan?.endDate ?? Date.now()).toISOString(),
      preferredLanguage: onTourHeader
        ? onTourHeader.preferredLanguage
          ? String(onTourHeader.preferredLanguage)
          : null
        : plan?.preferredLanguage
          ? String(plan.preferredLanguage)
          : null,
      marketOrgName: onTourHeader?.marketOrgId
        ? organizationNameMap.get(String(onTourHeader.marketOrgId)) ?? null
        : plan?.marketOrgId
          ? organizationNameMap.get(String(plan.marketOrgId)) ?? null
          : null,
      operatorOrgName: onTourHeader?.operatorOrgId
        ? organizationNameMap.get(String(onTourHeader.operatorOrgId)) ?? null
        : plan?.operatorOrgId
          ? organizationNameMap.get(String(plan.operatorOrgId)) ?? null
          : null,
      totalPax: onTourHeader ? Number(onTourHeader.totalPax ?? 0) : totalPax(plan ?? {}),
      adults: onTourHeader ? Number(onTourHeader.adults ?? 0) : Number(plan?.adults ?? 0),
      children: onTourHeader ? Number(onTourHeader.children ?? 0) : Number(plan?.children ?? 0),
      infants: onTourHeader ? Number(onTourHeader.infants ?? 0) : Number(plan?.infants ?? 0),
      foc: onTourHeader ? Number(onTourHeader.foc ?? 0) : 0,
      currencyCode: onTourHeader ? String(onTourHeader.currencyCode) : String(plan?.currencyCode),
      quotedGrandTotal: onTourHeader ? formatMoney(onTourHeader.quotedGrandTotal) : formatMoney(plan?.grandTotal),
      confirmedGrandTotal: onTourHeader
        ? formatMoney(onTourHeader.confirmedGrandTotal)
        : formatMoney(plan?.grandTotal),
      actualGrandTotal: onTourHeader ? formatMoney(onTourHeader.actualGrandTotal) : formatMoney(plan?.grandTotal),
      updatedAt: onTourHeader
        ? new Date(onTourHeader.updatedAt).toISOString()
        : new Date(plan?.updatedAt ?? Date.now()).toISOString(),
      isLocked: onTourHeader ? Boolean(onTourHeader.isLocked) : Boolean(plan?.isLocked),
    },
    dashboard: {
      statusCounts: [{ status: resolvedStatus, count: 1 }],
      confirmationCounts: [
        { status: "CONFIRMED", count: services.length - unconfirmedServices },
        { status: "UNREQUESTED", count: unconfirmedServices },
      ],
      pendingMetrics: {
        unassignedTravelers,
        unconfirmedServices,
        openRequisitions: persistedOperational?.metrics.openRequisitions ?? 0,
        missingRooming,
        pendingVehicles,
        pendingGuides:
          persistedOperational?.metrics.pendingGuides ??
          guideAllocations.filter((row) => String(row.status || "").toUpperCase() !== "CONFIRMED").length,
      },
      financials: {
        quotedRevenue: resolvedQuotedRevenue,
        confirmedCost: resolvedConfirmedCost,
        actualCost: resolvedActualCost,
        actualMargin: resolvedActualMargin,
      },
    },
    travelers,
    groups,
    rooming: resolvedRooming,
    services: resolvedServices,
    requisitions: persistedOperational?.requisitions ?? [],
    vouchers: persistedOperational?.vouchers ?? [],
    vehicleAllocations: persistedOperational?.vehicleAllocations ?? [],
    guideAllocations: resolvedGuideAllocations,
    finance:
      persistedOperational?.finance ?? {
        invoices: [],
        supplierBills: [],
        reconciliation: {
          quotedRevenue: resolvedQuotedRevenue,
          invoicedRevenue: "0.00",
          quotedCost: resolvedConfirmedCost,
          actualCost: resolvedActualCost,
          quotedMargin: onTourHeader
            ? formatMoney(
                Number(onTourHeader.quotedGrandTotal ?? 0) - Number(onTourHeader.quotedBaseTotal ?? 0)
              )
            : formatMoney(Number(plan?.grandTotal ?? 0) - Number(plan?.baseTotal ?? 0)),
          actualMargin: resolvedActualMargin,
        },
      },
    audit: [
      {
        id: `${onTourHeader ? onTourHeader.id : plan?.id}:created`,
        action: "PRE_TOUR_VERSION_LINKED",
        actorName: null,
        createdAt: new Date(onTourHeader?.createdAt ?? plan?.createdAt ?? Date.now()).toISOString(),
        summary: onTourHeader
          ? "Operational workspace is backed by a persisted on-tour record."
          : "Operational workspace is currently projected from the source pre-tour plan.",
      },
      {
        id: `${onTourHeader ? onTourHeader.id : plan?.id}:updated`,
        action: "LATEST_PLAN_UPDATE",
        actorName: null,
        createdAt: new Date(onTourHeader?.updatedAt ?? plan?.updatedAt ?? Date.now()).toISOString(),
        summary: onTourHeader
          ? "Latest operational update timestamp mirrored from the persisted on-tour record."
          : "Latest commercial revision timestamp mirrored into the operational projection.",
      },
      ...(persistedState?.audit.filter((entry) => !entry.id.endsWith(":updated")) ?? []),
    ],
  };
}

export async function createOnTourSubgroupRecord(
  onTourId: string,
  input: unknown,
  headers: Headers
) {
  const access = await ensureWritable(headers);
  const parsed = onTourSubgroupSchema.parse(input);
  const persistedTour = await ensurePersistedOnTour(access.companyId, onTourId);

  const startDate = toNullableDate(parsed.startDate || undefined);
  const endDate = toNullableDate(parsed.endDate || undefined);
  const tourStart = new Date(persistedTour.confirmedStartDate);
  const tourEnd = new Date(persistedTour.confirmedEndDate);

  if (startDate && startDate < tourStart) {
    throw new OnTourError(
      400,
      "VALIDATION_ERROR",
      "Subgroup start date must be within the operational tour dates."
    );
  }
  if (endDate && endDate > tourEnd) {
    throw new OnTourError(
      400,
      "VALIDATION_ERROR",
      "Subgroup end date must be within the operational tour dates."
    );
  }

  try {
    const [existing] = await db
      .select({ id: schema.onTourGroup.id })
      .from(schema.onTourGroup)
      .where(
        and(
          eq(schema.onTourGroup.onTourId, onTourId),
          eq(schema.onTourGroup.groupName, parsed.groupName)
        )
      )
      .limit(1);

    if (existing) {
      throw new OnTourError(
        400,
        "VALIDATION_ERROR",
        "A subgroup with this name already exists for the operational file."
      );
    }

    const [created] = await db
      .insert(schema.onTourGroup)
      .values({
        companyId: access.companyId,
        code: `${String(persistedTour.code)}-GRP-${nanoid(6)}`,
        onTourId,
        groupName: parsed.groupName,
        subgroupType: parsed.subgroupType,
        startDate,
        endDate,
        preferredLanguage: parsed.preferredLanguage || null,
        notes: parsed.notes || null,
        isPrimary: false,
        isOperationalSplit: parsed.subgroupType !== "MAIN",
      })
      .returning({
        id: schema.onTourGroup.id,
        code: schema.onTourGroup.code,
        groupName: schema.onTourGroup.groupName,
        subgroupType: schema.onTourGroup.subgroupType,
      });

    return {
      id: String(created.id),
      code: String(created.code),
      groupName: String(created.groupName),
      subgroupType: String(created.subgroupType),
    };
  } catch (error) {
    if (isMissingRelationError(error)) {
      throw toSchemaNotReadyError("Subgroup creation");
    }
    throw error;
  }
}

export async function createOnTourTravelerRecord(
  onTourId: string,
  input: unknown,
  headers: Headers
) {
  const access = await ensureWritable(headers);
  const parsed = onTourTravelerSchema.parse(input);
  const persistedTour = await ensurePersistedOnTour(access.companyId, onTourId);
  const { firstName, lastName } = splitFullName(parsed.fullName);

  try {
    const [mainGroup] = await db
      .select({
        id: schema.onTourGroup.id,
      })
      .from(schema.onTourGroup)
      .where(
        and(eq(schema.onTourGroup.onTourId, onTourId), eq(schema.onTourGroup.isPrimary, true))
      )
      .limit(1);

    const created = await db.transaction(async (tx) => {
      const [traveler] = await tx
        .insert(schema.onTourTraveler)
        .values({
          companyId: access.companyId,
          code: `${String(persistedTour.code)}-TRV-${nanoid(6)}`,
          onTourId,
          travelerType: parsed.travelerType,
          firstName,
          lastName,
          fullName: parsed.fullName,
          nationality: parsed.nationality || null,
          passportNo: parsed.passportNo || null,
          dietaryNotes: parsed.dietaryNotes || null,
          medicalNotes: parsed.medicalNotes || null,
          mobilityNotes: parsed.mobilityNotes || null,
          roomingGender: parsed.roomingGender || null,
          requiresChildSeat: Boolean(parsed.requiresChildSeat),
          isGroupLeader: Boolean(parsed.isGroupLeader),
          isTourLeader: Boolean(parsed.isTourLeader),
          isFoc: parsed.travelerType === "FOC",
        })
        .returning({
          id: schema.onTourTraveler.id,
          code: schema.onTourTraveler.code,
          fullName: schema.onTourTraveler.fullName,
          travelerType: schema.onTourTraveler.travelerType,
        });

      if (mainGroup) {
        await tx.insert(schema.onTourGroupTraveler).values({
          companyId: access.companyId,
          code: `${String(persistedTour.code)}-GTR-${nanoid(6)}`,
          onTourId,
          groupId: String(mainGroup.id),
          travelerId: String(traveler.id),
          role: parsed.isGroupLeader ? "LEADER" : "MEMBER",
          isPrimary: true,
        });
      }

      return traveler;
    });

    return {
      id: String(created.id),
      code: String(created.code),
      fullName: String(created.fullName),
      travelerType: String(created.travelerType),
    };
  } catch (error) {
    if (isMissingRelationError(error)) {
      throw toSchemaNotReadyError("Traveler capture");
    }
    throw error;
  }
}

export async function assignOnTourTravelersToGroupRecord(
  onTourId: string,
  groupId: string,
  input: unknown,
  headers: Headers
) {
  const access = await ensureWritable(headers);
  const parsed = assignTravelersToGroupSchema.parse(input);
  if (parsed.groupId !== groupId) {
    throw new OnTourError(
      400,
      "VALIDATION_ERROR",
      "Assignment payload does not match the selected subgroup."
    );
  }

  const persistedTour = await ensurePersistedOnTour(access.companyId, onTourId);
  const effectiveFrom = toNullableDate(parsed.effectiveFrom || undefined);
  const effectiveTo = toNullableDate(parsed.effectiveTo || undefined);

  if (effectiveFrom && effectiveTo && effectiveFrom > effectiveTo) {
    throw new OnTourError(
      400,
      "VALIDATION_ERROR",
      "Assignment end date must be on or after the start date."
    );
  }

  try {
    const [[group], travelers, existingAssignments] = await Promise.all([
      db
        .select({
          id: schema.onTourGroup.id,
        })
        .from(schema.onTourGroup)
        .where(and(eq(schema.onTourGroup.id, groupId), eq(schema.onTourGroup.onTourId, onTourId)))
        .limit(1),
      db
        .select({
          id: schema.onTourTraveler.id,
        })
        .from(schema.onTourTraveler)
        .where(
          and(
            eq(schema.onTourTraveler.onTourId, onTourId),
            inArray(schema.onTourTraveler.id, parsed.travelerIds)
          )
        ),
      db
        .select({
          travelerId: schema.onTourGroupTraveler.travelerId,
          effectiveFrom: schema.onTourGroupTraveler.effectiveFrom,
          effectiveTo: schema.onTourGroupTraveler.effectiveTo,
        })
        .from(schema.onTourGroupTraveler)
        .where(
          and(
            eq(schema.onTourGroupTraveler.groupId, groupId),
            inArray(schema.onTourGroupTraveler.travelerId, parsed.travelerIds)
          )
        ),
    ]);

    if (!group) {
      throw new OnTourError(404, "GROUP_NOT_FOUND", "Operational subgroup not found.");
    }

    if (travelers.length !== parsed.travelerIds.length) {
      throw new OnTourError(
        400,
        "VALIDATION_ERROR",
        "One or more selected travelers do not belong to this operational file."
      );
    }

    const existingKeys = new Set(
      existingAssignments.map(
        (assignment) =>
          `${String(assignment.travelerId)}:${assignment.effectiveFrom ? new Date(assignment.effectiveFrom).toISOString() : ""}:${assignment.effectiveTo ? new Date(assignment.effectiveTo).toISOString() : ""}`
      )
    );

    const values = parsed.travelerIds
      .filter((travelerId) => {
        const key = `${travelerId}:${effectiveFrom ? effectiveFrom.toISOString() : ""}:${effectiveTo ? effectiveTo.toISOString() : ""}`;
        return !existingKeys.has(key);
      })
      .map((travelerId) => ({
        companyId: access.companyId,
        code: `${String(persistedTour.code)}-GTR-${nanoid(6)}`,
        onTourId,
        groupId,
        travelerId,
        effectiveFrom,
        effectiveTo,
        role: "MEMBER",
        isPrimary: false,
      }));

    if (values.length > 0) {
      await db.insert(schema.onTourGroupTraveler).values(values);
    }

    return {
      groupId,
      assignedTravelerIds: parsed.travelerIds,
      insertedCount: values.length,
    };
  } catch (error) {
    if (isMissingRelationError(error)) {
      throw toSchemaNotReadyError("Traveler-to-subgroup assignment");
    }
    throw error;
  }
}

export function toOnTourErrorResponse(error: unknown) {
  if (error instanceof z.ZodError) {
    return {
      status: 400,
      body: {
        code: "VALIDATION_ERROR",
        message: error.issues[0]?.message || "Validation failed.",
      },
    };
  }

  if (error instanceof OnTourError) {
    return {
      status: error.status,
      body: {
        code: error.code,
        message: error.message,
      },
    };
  }

  return {
    status: 500,
    body: {
      code: "INTERNAL_SERVER_ERROR",
      message: error instanceof Error ? error.message : "Unexpected on-tour error.",
    },
  };
}
