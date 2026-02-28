import { and, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { auth } from "@/lib/auth";
import {
  createGuideAssignmentSchema,
  createGuideBlackoutDateSchema,
  createGuideCertificationSchema,
  createGuideCoverageAreaSchema,
  createGuideDocumentSchema,
  createGuideLanguageSchema,
  createGuideLicenseSchema,
  createGuideRateSchema,
  createGuideSchema,
  createGuideWeeklyAvailabilitySchema,
  createLanguageSchema,
  guideListQuerySchema,
  guideResourceSchema,
  updateGuideAssignmentSchema,
  updateGuideBlackoutDateSchema,
  updateGuideCertificationSchema,
  updateGuideCoverageAreaSchema,
  updateGuideDocumentSchema,
  updateGuideLanguageSchema,
  updateGuideLicenseSchema,
  updateGuideRateSchema,
  updateGuideSchema,
  updateGuideWeeklyAvailabilitySchema,
  updateLanguageSchema,
} from "@/modules/guides/shared/guides-schemas";

class GuideError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

type GuideResource = z.infer<typeof guideResourceSchema>;

function normalizeZodError(error: z.ZodError) {
  return error.issues[0]?.message || "Validation failed.";
}

function toDecimal(value: number | string | null | undefined, scale = 2) {
  if (value === null || value === undefined) return null;
  const numeric = typeof value === "number" ? value : Number(value);
  return numeric.toFixed(scale);
}

function toDate(value: string | null | undefined) {
  if (!value) return null;
  return new Date(value);
}

async function getAccess(headers: Headers) {
  const session = await auth.api.getSession({ headers });
  if (!session?.user) {
    throw new GuideError(401, "UNAUTHORIZED", "You are not authenticated.");
  }
  const user = session.user as {
    companyId?: string | null;
    role?: string | null;
    readOnly?: boolean;
    canWriteMasterData?: boolean;
  };
  if (!user.companyId) {
    throw new GuideError(403, "COMPANY_REQUIRED", "User is not linked to a company.");
  }
  return {
    companyId: user.companyId,
    role: user.role ?? "USER",
    readOnly: Boolean(user.readOnly),
    canWriteMasterData: Boolean(user.canWriteMasterData),
  };
}

async function ensureWritable(headers: Headers) {
  const access = await getAccess(headers);
  if (access.readOnly) {
    throw new GuideError(
      403,
      "READ_ONLY_MODE",
      "You are in read-only mode. Contact a manager for edit access."
    );
  }
  const elevated = access.role === "ADMIN" || access.role === "MANAGER";
  if (!elevated && !access.canWriteMasterData) {
    throw new GuideError(
      403,
      "PERMISSION_DENIED",
      "You do not have write access for Master Data."
    );
  }
  return access;
}

function parseResource(input: string): GuideResource {
  const parsed = guideResourceSchema.safeParse(input);
  if (!parsed.success) {
    throw new GuideError(404, "RESOURCE_NOT_FOUND", "Guide resource not found.");
  }
  return parsed.data;
}

async function ensureGuide(companyId: string, guideId: string) {
  const [record] = await db
    .select({ id: schema.guide.id })
    .from(schema.guide)
    .where(and(eq(schema.guide.id, guideId), eq(schema.guide.companyId, companyId)))
    .limit(1);
  if (!record) {
    throw new GuideError(400, "GUIDE_NOT_FOUND", "Guide not found.");
  }
}

async function ensureLanguage(companyId: string, languageId: string) {
  const [record] = await db
    .select({ id: schema.guideLanguageMaster.id })
    .from(schema.guideLanguageMaster)
    .where(
      and(
        eq(schema.guideLanguageMaster.id, languageId),
        eq(schema.guideLanguageMaster.companyId, companyId)
      )
    )
    .limit(1);
  if (!record) {
    throw new GuideError(400, "LANGUAGE_NOT_FOUND", "Language not found.");
  }
}

async function ensureLocation(companyId: string, locationId: string) {
  const [record] = await db
    .select({ id: schema.transportLocation.id })
    .from(schema.transportLocation)
    .where(
      and(
        eq(schema.transportLocation.id, locationId),
        eq(schema.transportLocation.companyId, companyId)
      )
    )
    .limit(1);
  if (!record) {
    throw new GuideError(400, "LOCATION_NOT_FOUND", "Location not found.");
  }
}

async function ensureCurrency(companyId: string, currencyId: string) {
  const [record] = await db
    .select({ id: schema.currency.id })
    .from(schema.currency)
    .where(and(eq(schema.currency.id, currencyId), eq(schema.currency.companyId, companyId)))
    .limit(1);
  if (!record) {
    throw new GuideError(400, "CURRENCY_NOT_FOUND", "Currency not found.");
  }
}

export async function listGuideRecords(
  resourceInput: string,
  searchParams: URLSearchParams,
  headers: Headers
) {
  const resource = parseResource(resourceInput);
  const parsed = guideListQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    throw new GuideError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }
  const { companyId } = await getAccess(headers);
  const q = parsed.data.q ? `%${parsed.data.q}%` : null;
  const limit = parsed.data.limit;
  const guideId = parsed.data.guideId;

  switch (resource) {
    case "guides": {
      const clauses = [eq(schema.guide.companyId, companyId)];
      if (guideId) clauses.push(eq(schema.guide.id, guideId));
      if (q) {
        const searchClause = or(ilike(schema.guide.code, q), ilike(schema.guide.fullName, q));
        if (searchClause) clauses.push(searchClause);
      }
      return db.select().from(schema.guide).where(and(...clauses)).orderBy(desc(schema.guide.createdAt)).limit(limit);
    }
    case "languages": {
      const clauses = [eq(schema.guideLanguageMaster.companyId, companyId)];
      if (q) {
        const searchClause = or(
          ilike(schema.guideLanguageMaster.code, q),
          ilike(schema.guideLanguageMaster.name, q)
        );
        if (searchClause) clauses.push(searchClause);
      }
      return db
        .select()
        .from(schema.guideLanguageMaster)
        .where(and(...clauses))
        .orderBy(desc(schema.guideLanguageMaster.createdAt))
        .limit(limit);
    }
    case "guide-languages": {
      const clauses = [eq(schema.guideLanguage.companyId, companyId)];
      if (guideId) clauses.push(eq(schema.guideLanguage.guideId, guideId));
      if (q) {
        const searchClause = or(
          ilike(schema.guideLanguage.code, q),
          ilike(schema.guideLanguage.proficiency, q)
        );
        if (searchClause) clauses.push(searchClause);
      }
      return db.select().from(schema.guideLanguage).where(and(...clauses)).limit(limit);
    }
    case "guide-coverage-areas": {
      const clauses = [eq(schema.guideCoverageArea.companyId, companyId)];
      if (guideId) clauses.push(eq(schema.guideCoverageArea.guideId, guideId));
      if (q) {
        const searchClause = or(
          ilike(schema.guideCoverageArea.code, q),
          ilike(schema.guideCoverageArea.coverageType, q)
        );
        if (searchClause) clauses.push(searchClause);
      }
      return db.select().from(schema.guideCoverageArea).where(and(...clauses)).limit(limit);
    }
    case "guide-licenses": {
      const clauses = [eq(schema.guideLicense.companyId, companyId)];
      if (guideId) clauses.push(eq(schema.guideLicense.guideId, guideId));
      if (q) {
        const searchClause = or(
          ilike(schema.guideLicense.code, q),
          ilike(schema.guideLicense.licenseType, q),
          ilike(schema.guideLicense.licenseNumber, q)
        );
        if (searchClause) clauses.push(searchClause);
      }
      return db
        .select()
        .from(schema.guideLicense)
        .where(and(...clauses))
        .orderBy(desc(schema.guideLicense.createdAt))
        .limit(limit);
    }
    case "guide-certifications": {
      const clauses = [eq(schema.guideCertification.companyId, companyId)];
      if (guideId) clauses.push(eq(schema.guideCertification.guideId, guideId));
      if (q) {
        const searchClause = or(
          ilike(schema.guideCertification.code, q),
          ilike(schema.guideCertification.name, q),
          ilike(schema.guideCertification.provider, q)
        );
        if (searchClause) clauses.push(searchClause);
      }
      return db
        .select()
        .from(schema.guideCertification)
        .where(and(...clauses))
        .orderBy(desc(schema.guideCertification.createdAt))
        .limit(limit);
    }
    case "guide-documents": {
      const clauses = [eq(schema.guideDocument.companyId, companyId)];
      if (guideId) clauses.push(eq(schema.guideDocument.guideId, guideId));
      if (q) {
        const searchClause = or(
          ilike(schema.guideDocument.code, q),
          ilike(schema.guideDocument.docType, q),
          ilike(schema.guideDocument.fileName, q)
        );
        if (searchClause) clauses.push(searchClause);
      }
      return db
        .select()
        .from(schema.guideDocument)
        .where(and(...clauses))
        .orderBy(desc(schema.guideDocument.createdAt))
        .limit(limit);
    }
    case "guide-weekly-availability": {
      const clauses = [eq(schema.guideWeeklyAvailability.companyId, companyId)];
      if (guideId) clauses.push(eq(schema.guideWeeklyAvailability.guideId, guideId));
      if (q) {
        const searchClause = or(
          ilike(schema.guideWeeklyAvailability.code, q),
          ilike(schema.guideWeeklyAvailability.startTime, q),
          ilike(schema.guideWeeklyAvailability.endTime, q)
        );
        if (searchClause) clauses.push(searchClause);
      }
      return db.select().from(schema.guideWeeklyAvailability).where(and(...clauses)).limit(limit);
    }
    case "guide-blackout-dates": {
      const clauses = [eq(schema.guideBlackoutDate.companyId, companyId)];
      if (guideId) clauses.push(eq(schema.guideBlackoutDate.guideId, guideId));
      if (q) {
        const searchClause = or(ilike(schema.guideBlackoutDate.code, q), ilike(schema.guideBlackoutDate.reason, q));
        if (searchClause) clauses.push(searchClause);
      }
      return db
        .select()
        .from(schema.guideBlackoutDate)
        .where(and(...clauses))
        .orderBy(desc(schema.guideBlackoutDate.createdAt))
        .limit(limit);
    }
    case "guide-rates": {
      const clauses = [eq(schema.guideRate.companyId, companyId)];
      if (guideId) clauses.push(eq(schema.guideRate.guideId, guideId));
      if (q) {
        const searchClause = or(
          ilike(schema.guideRate.code, q),
          ilike(schema.guideRate.rateName, q),
          ilike(schema.guideRate.pricingModel, q)
        );
        if (searchClause) clauses.push(searchClause);
      }
      return db
        .select()
        .from(schema.guideRate)
        .where(and(...clauses))
        .orderBy(desc(schema.guideRate.createdAt))
        .limit(limit);
    }
    case "guide-assignments": {
      const clauses = [eq(schema.guideAssignment.companyId, companyId)];
      if (guideId) clauses.push(eq(schema.guideAssignment.guideId, guideId));
      if (q) {
        const searchClause = or(
          ilike(schema.guideAssignment.code, q),
          ilike(schema.guideAssignment.bookingId, q),
          ilike(schema.guideAssignment.status, q)
        );
        if (searchClause) clauses.push(searchClause);
      }
      return db
        .select()
        .from(schema.guideAssignment)
        .where(and(...clauses))
        .orderBy(desc(schema.guideAssignment.createdAt))
        .limit(limit);
    }
    default:
      throw new GuideError(404, "RESOURCE_NOT_FOUND", "Guide resource not found.");
  }
}

export async function createGuideRecord(resourceInput: string, payload: unknown, headers: Headers) {
  const resource = parseResource(resourceInput);
  const { companyId } = await ensureWritable(headers);

  switch (resource) {
    case "guides": {
      const parsed = createGuideSchema.safeParse(payload);
      if (!parsed.success) throw new GuideError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      if (parsed.data.baseCurrencyId) await ensureCurrency(companyId, parsed.data.baseCurrencyId);
      const [created] = await db
        .insert(schema.guide)
        .values({
          ...parsed.data,
          companyId,
          dob: toDate(parsed.data.dob),
          rating: toDecimal(parsed.data.rating),
        })
        .returning();
      return created;
    }
    case "languages": {
      const parsed = createLanguageSchema.safeParse(payload);
      if (!parsed.success) throw new GuideError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      const [created] = await db.insert(schema.guideLanguageMaster).values({ ...parsed.data, companyId }).returning();
      return created;
    }
    case "guide-languages": {
      const parsed = createGuideLanguageSchema.safeParse(payload);
      if (!parsed.success) throw new GuideError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      await ensureGuide(companyId, parsed.data.guideId);
      await ensureLanguage(companyId, parsed.data.languageId);
      const [created] = await db.insert(schema.guideLanguage).values({ ...parsed.data, companyId }).returning();
      return created;
    }
    case "guide-coverage-areas": {
      const parsed = createGuideCoverageAreaSchema.safeParse(payload);
      if (!parsed.success) throw new GuideError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      await ensureGuide(companyId, parsed.data.guideId);
      await ensureLocation(companyId, parsed.data.locationId);
      const [created] = await db.insert(schema.guideCoverageArea).values({ ...parsed.data, companyId }).returning();
      return created;
    }
    case "guide-licenses": {
      const parsed = createGuideLicenseSchema.safeParse(payload);
      if (!parsed.success) throw new GuideError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      await ensureGuide(companyId, parsed.data.guideId);
      const [created] = await db
        .insert(schema.guideLicense)
        .values({
          ...parsed.data,
          companyId,
          issuedAt: toDate(parsed.data.issuedAt),
          expiresAt: toDate(parsed.data.expiresAt),
        })
        .returning();
      return created;
    }
    case "guide-certifications": {
      const parsed = createGuideCertificationSchema.safeParse(payload);
      if (!parsed.success) throw new GuideError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      await ensureGuide(companyId, parsed.data.guideId);
      const [created] = await db
        .insert(schema.guideCertification)
        .values({
          ...parsed.data,
          companyId,
          issuedAt: toDate(parsed.data.issuedAt),
          expiresAt: toDate(parsed.data.expiresAt),
        })
        .returning();
      return created;
    }
    case "guide-documents": {
      const parsed = createGuideDocumentSchema.safeParse(payload);
      if (!parsed.success) throw new GuideError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      await ensureGuide(companyId, parsed.data.guideId);
      const [created] = await db.insert(schema.guideDocument).values({ ...parsed.data, companyId }).returning();
      return created;
    }
    case "guide-weekly-availability": {
      const parsed = createGuideWeeklyAvailabilitySchema.safeParse(payload);
      if (!parsed.success) throw new GuideError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      await ensureGuide(companyId, parsed.data.guideId);
      const [created] = await db
        .insert(schema.guideWeeklyAvailability)
        .values({ ...parsed.data, companyId })
        .returning();
      return created;
    }
    case "guide-blackout-dates": {
      const parsed = createGuideBlackoutDateSchema.safeParse(payload);
      if (!parsed.success) throw new GuideError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      await ensureGuide(companyId, parsed.data.guideId);
      const [created] = await db
        .insert(schema.guideBlackoutDate)
        .values({
          ...parsed.data,
          companyId,
          startAt: toDate(parsed.data.startAt)!,
          endAt: toDate(parsed.data.endAt)!,
        })
        .returning();
      return created;
    }
    case "guide-rates": {
      const parsed = createGuideRateSchema.safeParse(payload);
      if (!parsed.success) throw new GuideError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      await ensureGuide(companyId, parsed.data.guideId);
      await ensureCurrency(companyId, parsed.data.currencyId);
      if (parsed.data.locationId) await ensureLocation(companyId, parsed.data.locationId);
      const [created] = await db
        .insert(schema.guideRate)
        .values({
          ...parsed.data,
          companyId,
          fixedRate: toDecimal(parsed.data.fixedRate),
          perHourRate: toDecimal(parsed.data.perHourRate),
          perPaxRate: toDecimal(parsed.data.perPaxRate),
          minCharge: toDecimal(parsed.data.minCharge) ?? "0.00",
          overtimeAfterHours: toDecimal(parsed.data.overtimeAfterHours),
          overtimePerHourRate: toDecimal(parsed.data.overtimePerHourRate),
          nightAllowance: toDecimal(parsed.data.nightAllowance),
          perDiem: toDecimal(parsed.data.perDiem),
          effectiveFrom: toDate(parsed.data.effectiveFrom)!,
          effectiveTo: toDate(parsed.data.effectiveTo),
        })
        .returning();
      return created;
    }
    case "guide-assignments": {
      const parsed = createGuideAssignmentSchema.safeParse(payload);
      if (!parsed.success) throw new GuideError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      await ensureGuide(companyId, parsed.data.guideId);
      const [created] = await db
        .insert(schema.guideAssignment)
        .values({
          ...parsed.data,
          companyId,
          startAt: toDate(parsed.data.startAt)!,
          endAt: toDate(parsed.data.endAt)!,
          baseAmount: toDecimal(parsed.data.baseAmount) ?? "0.00",
          taxAmount: toDecimal(parsed.data.taxAmount) ?? "0.00",
          totalAmount: toDecimal(parsed.data.totalAmount) ?? "0.00",
        })
        .returning();
      return created;
    }
    default:
      throw new GuideError(404, "RESOURCE_NOT_FOUND", "Guide resource not found.");
  }
}

export async function updateGuideRecord(
  resourceInput: string,
  id: string,
  payload: unknown,
  headers: Headers
) {
  const resource = parseResource(resourceInput);
  const { companyId } = await ensureWritable(headers);

  switch (resource) {
    case "guides": {
      const parsed = updateGuideSchema.safeParse(payload);
      if (!parsed.success) throw new GuideError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      if (parsed.data.baseCurrencyId) await ensureCurrency(companyId, parsed.data.baseCurrencyId);
      const [updated] = await db
        .update(schema.guide)
        .set({
          ...parsed.data,
          dob: parsed.data.dob !== undefined ? toDate(parsed.data.dob) : undefined,
          rating: parsed.data.rating !== undefined ? toDecimal(parsed.data.rating) ?? undefined : undefined,
          updatedAt: new Date(),
        })
        .where(and(eq(schema.guide.id, id), eq(schema.guide.companyId, companyId)))
        .returning();
      if (!updated) throw new GuideError(404, "RECORD_NOT_FOUND", "Guide not found.");
      return updated;
    }
    case "languages": {
      const parsed = updateLanguageSchema.safeParse(payload);
      if (!parsed.success) throw new GuideError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      const [updated] = await db
        .update(schema.guideLanguageMaster)
        .set(parsed.data)
        .where(and(eq(schema.guideLanguageMaster.id, id), eq(schema.guideLanguageMaster.companyId, companyId)))
        .returning();
      if (!updated) throw new GuideError(404, "RECORD_NOT_FOUND", "Language not found.");
      return updated;
    }
    case "guide-languages": {
      const parsed = updateGuideLanguageSchema.safeParse(payload);
      if (!parsed.success) throw new GuideError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      if (parsed.data.guideId) await ensureGuide(companyId, parsed.data.guideId);
      if (parsed.data.languageId) await ensureLanguage(companyId, parsed.data.languageId);
      const [updated] = await db
        .update(schema.guideLanguage)
        .set(parsed.data)
        .where(and(eq(schema.guideLanguage.id, id), eq(schema.guideLanguage.companyId, companyId)))
        .returning();
      if (!updated) throw new GuideError(404, "RECORD_NOT_FOUND", "Guide language not found.");
      return updated;
    }
    case "guide-coverage-areas": {
      const parsed = updateGuideCoverageAreaSchema.safeParse(payload);
      if (!parsed.success) throw new GuideError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      if (parsed.data.guideId) await ensureGuide(companyId, parsed.data.guideId);
      if (parsed.data.locationId) await ensureLocation(companyId, parsed.data.locationId);
      const [updated] = await db
        .update(schema.guideCoverageArea)
        .set(parsed.data)
        .where(and(eq(schema.guideCoverageArea.id, id), eq(schema.guideCoverageArea.companyId, companyId)))
        .returning();
      if (!updated) throw new GuideError(404, "RECORD_NOT_FOUND", "Guide coverage area not found.");
      return updated;
    }
    case "guide-licenses": {
      const parsed = updateGuideLicenseSchema.safeParse(payload);
      if (!parsed.success) throw new GuideError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      if (parsed.data.guideId) await ensureGuide(companyId, parsed.data.guideId);
      const [updated] = await db
        .update(schema.guideLicense)
        .set({
          ...parsed.data,
          issuedAt: parsed.data.issuedAt !== undefined ? toDate(parsed.data.issuedAt) ?? undefined : undefined,
          expiresAt: parsed.data.expiresAt !== undefined ? toDate(parsed.data.expiresAt) ?? undefined : undefined,
        })
        .where(and(eq(schema.guideLicense.id, id), eq(schema.guideLicense.companyId, companyId)))
        .returning();
      if (!updated) throw new GuideError(404, "RECORD_NOT_FOUND", "Guide license not found.");
      return updated;
    }
    case "guide-certifications": {
      const parsed = updateGuideCertificationSchema.safeParse(payload);
      if (!parsed.success) throw new GuideError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      if (parsed.data.guideId) await ensureGuide(companyId, parsed.data.guideId);
      const [updated] = await db
        .update(schema.guideCertification)
        .set({
          ...parsed.data,
          issuedAt: parsed.data.issuedAt !== undefined ? toDate(parsed.data.issuedAt) ?? undefined : undefined,
          expiresAt: parsed.data.expiresAt !== undefined ? toDate(parsed.data.expiresAt) ?? undefined : undefined,
        })
        .where(and(eq(schema.guideCertification.id, id), eq(schema.guideCertification.companyId, companyId)))
        .returning();
      if (!updated) throw new GuideError(404, "RECORD_NOT_FOUND", "Guide certification not found.");
      return updated;
    }
    case "guide-documents": {
      const parsed = updateGuideDocumentSchema.safeParse(payload);
      if (!parsed.success) throw new GuideError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      if (parsed.data.guideId) await ensureGuide(companyId, parsed.data.guideId);
      const [updated] = await db
        .update(schema.guideDocument)
        .set(parsed.data)
        .where(and(eq(schema.guideDocument.id, id), eq(schema.guideDocument.companyId, companyId)))
        .returning();
      if (!updated) throw new GuideError(404, "RECORD_NOT_FOUND", "Guide document not found.");
      return updated;
    }
    case "guide-weekly-availability": {
      const parsed = updateGuideWeeklyAvailabilitySchema.safeParse(payload);
      if (!parsed.success) throw new GuideError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      if (parsed.data.guideId) await ensureGuide(companyId, parsed.data.guideId);
      const [updated] = await db
        .update(schema.guideWeeklyAvailability)
        .set(parsed.data)
        .where(and(eq(schema.guideWeeklyAvailability.id, id), eq(schema.guideWeeklyAvailability.companyId, companyId)))
        .returning();
      if (!updated) throw new GuideError(404, "RECORD_NOT_FOUND", "Guide weekly availability not found.");
      return updated;
    }
    case "guide-blackout-dates": {
      const parsed = updateGuideBlackoutDateSchema.safeParse(payload);
      if (!parsed.success) throw new GuideError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      if (parsed.data.guideId) await ensureGuide(companyId, parsed.data.guideId);
      const [updated] = await db
        .update(schema.guideBlackoutDate)
        .set({
          ...parsed.data,
          startAt: parsed.data.startAt !== undefined ? toDate(parsed.data.startAt) ?? undefined : undefined,
          endAt: parsed.data.endAt !== undefined ? toDate(parsed.data.endAt) ?? undefined : undefined,
        })
        .where(and(eq(schema.guideBlackoutDate.id, id), eq(schema.guideBlackoutDate.companyId, companyId)))
        .returning();
      if (!updated) throw new GuideError(404, "RECORD_NOT_FOUND", "Guide blackout not found.");
      return updated;
    }
    case "guide-rates": {
      const parsed = updateGuideRateSchema.safeParse(payload);
      if (!parsed.success) throw new GuideError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      if (parsed.data.guideId) await ensureGuide(companyId, parsed.data.guideId);
      if (parsed.data.currencyId) await ensureCurrency(companyId, parsed.data.currencyId);
      if (parsed.data.locationId) await ensureLocation(companyId, parsed.data.locationId);
      const [updated] = await db
        .update(schema.guideRate)
        .set({
          ...parsed.data,
          fixedRate: parsed.data.fixedRate !== undefined ? toDecimal(parsed.data.fixedRate) ?? undefined : undefined,
          perHourRate: parsed.data.perHourRate !== undefined ? toDecimal(parsed.data.perHourRate) ?? undefined : undefined,
          perPaxRate: parsed.data.perPaxRate !== undefined ? toDecimal(parsed.data.perPaxRate) ?? undefined : undefined,
          minCharge: parsed.data.minCharge !== undefined ? toDecimal(parsed.data.minCharge) ?? undefined : undefined,
          overtimeAfterHours: parsed.data.overtimeAfterHours !== undefined ? toDecimal(parsed.data.overtimeAfterHours) ?? undefined : undefined,
          overtimePerHourRate: parsed.data.overtimePerHourRate !== undefined ? toDecimal(parsed.data.overtimePerHourRate) ?? undefined : undefined,
          nightAllowance: parsed.data.nightAllowance !== undefined ? toDecimal(parsed.data.nightAllowance) ?? undefined : undefined,
          perDiem: parsed.data.perDiem !== undefined ? toDecimal(parsed.data.perDiem) ?? undefined : undefined,
          effectiveFrom: parsed.data.effectiveFrom !== undefined ? toDate(parsed.data.effectiveFrom) ?? undefined : undefined,
          effectiveTo: parsed.data.effectiveTo !== undefined ? toDate(parsed.data.effectiveTo) ?? undefined : undefined,
          updatedAt: new Date(),
        })
        .where(and(eq(schema.guideRate.id, id), eq(schema.guideRate.companyId, companyId)))
        .returning();
      if (!updated) throw new GuideError(404, "RECORD_NOT_FOUND", "Guide rate not found.");
      return updated;
    }
    case "guide-assignments": {
      const parsed = updateGuideAssignmentSchema.safeParse(payload);
      if (!parsed.success) throw new GuideError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      if (parsed.data.guideId) await ensureGuide(companyId, parsed.data.guideId);
      const [updated] = await db
        .update(schema.guideAssignment)
        .set({
          ...parsed.data,
          startAt: parsed.data.startAt !== undefined ? toDate(parsed.data.startAt) ?? undefined : undefined,
          endAt: parsed.data.endAt !== undefined ? toDate(parsed.data.endAt) ?? undefined : undefined,
          baseAmount: parsed.data.baseAmount !== undefined ? toDecimal(parsed.data.baseAmount) ?? undefined : undefined,
          taxAmount: parsed.data.taxAmount !== undefined ? toDecimal(parsed.data.taxAmount) ?? undefined : undefined,
          totalAmount: parsed.data.totalAmount !== undefined ? toDecimal(parsed.data.totalAmount) ?? undefined : undefined,
        })
        .where(and(eq(schema.guideAssignment.id, id), eq(schema.guideAssignment.companyId, companyId)))
        .returning();
      if (!updated) throw new GuideError(404, "RECORD_NOT_FOUND", "Guide assignment not found.");
      return updated;
    }
    default:
      throw new GuideError(404, "RESOURCE_NOT_FOUND", "Guide resource not found.");
  }
}

export async function deleteGuideRecord(resourceInput: string, id: string, headers: Headers) {
  const resource = parseResource(resourceInput);
  const { companyId } = await ensureWritable(headers);

  switch (resource) {
    case "guides": {
      const [deleted] = await db.delete(schema.guide).where(and(eq(schema.guide.id, id), eq(schema.guide.companyId, companyId))).returning({ id: schema.guide.id });
      if (!deleted) throw new GuideError(404, "RECORD_NOT_FOUND", "Guide not found.");
      return;
    }
    case "languages": {
      const [deleted] = await db.delete(schema.guideLanguageMaster).where(and(eq(schema.guideLanguageMaster.id, id), eq(schema.guideLanguageMaster.companyId, companyId))).returning({ id: schema.guideLanguageMaster.id });
      if (!deleted) throw new GuideError(404, "RECORD_NOT_FOUND", "Language not found.");
      return;
    }
    case "guide-languages": {
      const [deleted] = await db.delete(schema.guideLanguage).where(and(eq(schema.guideLanguage.id, id), eq(schema.guideLanguage.companyId, companyId))).returning({ id: schema.guideLanguage.id });
      if (!deleted) throw new GuideError(404, "RECORD_NOT_FOUND", "Guide language not found.");
      return;
    }
    case "guide-coverage-areas": {
      const [deleted] = await db.delete(schema.guideCoverageArea).where(and(eq(schema.guideCoverageArea.id, id), eq(schema.guideCoverageArea.companyId, companyId))).returning({ id: schema.guideCoverageArea.id });
      if (!deleted) throw new GuideError(404, "RECORD_NOT_FOUND", "Guide coverage area not found.");
      return;
    }
    case "guide-licenses": {
      const [deleted] = await db.delete(schema.guideLicense).where(and(eq(schema.guideLicense.id, id), eq(schema.guideLicense.companyId, companyId))).returning({ id: schema.guideLicense.id });
      if (!deleted) throw new GuideError(404, "RECORD_NOT_FOUND", "Guide license not found.");
      return;
    }
    case "guide-certifications": {
      const [deleted] = await db.delete(schema.guideCertification).where(and(eq(schema.guideCertification.id, id), eq(schema.guideCertification.companyId, companyId))).returning({ id: schema.guideCertification.id });
      if (!deleted) throw new GuideError(404, "RECORD_NOT_FOUND", "Guide certification not found.");
      return;
    }
    case "guide-documents": {
      const [deleted] = await db.delete(schema.guideDocument).where(and(eq(schema.guideDocument.id, id), eq(schema.guideDocument.companyId, companyId))).returning({ id: schema.guideDocument.id });
      if (!deleted) throw new GuideError(404, "RECORD_NOT_FOUND", "Guide document not found.");
      return;
    }
    case "guide-weekly-availability": {
      const [deleted] = await db.delete(schema.guideWeeklyAvailability).where(and(eq(schema.guideWeeklyAvailability.id, id), eq(schema.guideWeeklyAvailability.companyId, companyId))).returning({ id: schema.guideWeeklyAvailability.id });
      if (!deleted) throw new GuideError(404, "RECORD_NOT_FOUND", "Guide weekly availability not found.");
      return;
    }
    case "guide-blackout-dates": {
      const [deleted] = await db.delete(schema.guideBlackoutDate).where(and(eq(schema.guideBlackoutDate.id, id), eq(schema.guideBlackoutDate.companyId, companyId))).returning({ id: schema.guideBlackoutDate.id });
      if (!deleted) throw new GuideError(404, "RECORD_NOT_FOUND", "Guide blackout not found.");
      return;
    }
    case "guide-rates": {
      const [deleted] = await db.delete(schema.guideRate).where(and(eq(schema.guideRate.id, id), eq(schema.guideRate.companyId, companyId))).returning({ id: schema.guideRate.id });
      if (!deleted) throw new GuideError(404, "RECORD_NOT_FOUND", "Guide rate not found.");
      return;
    }
    case "guide-assignments": {
      const [deleted] = await db.delete(schema.guideAssignment).where(and(eq(schema.guideAssignment.id, id), eq(schema.guideAssignment.companyId, companyId))).returning({ id: schema.guideAssignment.id });
      if (!deleted) throw new GuideError(404, "RECORD_NOT_FOUND", "Guide assignment not found.");
      return;
    }
    default:
      throw new GuideError(404, "RESOURCE_NOT_FOUND", "Guide resource not found.");
  }
}

export function toGuideErrorResponse(error: unknown) {
  if (error instanceof GuideError) {
    return { status: error.status, body: { code: error.code, message: error.message } };
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (
      (message.includes("relation") && message.includes("does not exist")) ||
      (message.includes("column") && message.includes("does not exist"))
    ) {
      return {
        status: 500,
        body: {
          code: "DB_SCHEMA_MISMATCH",
          message:
            "Database schema is not up to date. Please run the latest Drizzle migration/db push.",
        },
      };
    }
    if (message.includes("duplicate key")) {
      return {
        status: 409,
        body: {
          code: "DUPLICATE_RECORD",
          message: "Record already exists for given unique fields.",
        },
      };
    }
    if (message.includes("violates foreign key")) {
      return {
        status: 400,
        body: {
          code: "FOREIGN_KEY_ERROR",
          message: "Invalid relation provided.",
        },
      };
    }
  }
  return {
    status: 500,
    body: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong. Please try again.",
    },
  };
}
