import {
  and,
  asc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  getOrSetMasterDataCache,
  invalidateMasterDataCacheByPrefixes,
  masterDataCachePrefix,
  masterDataListCacheKey,
} from "@/lib/cache/master-data-cache";
import { AccessControlError, resolveAccess } from "@/lib/security/access-control";
import {
  contractingListQuerySchema,
  createHotelCancellationPolicySchema,
  createHotelCancellationPolicyRuleSchema,
  createHotelContractSchema,
  createHotelInventoryDaySchema,
  createHotelRoomRateSchema,
  createHotelRatePlanSchema,
  createHotelRateRestrictionSchema,
  createHotelFeeRuleSchema,
  hotelRateResolutionQuerySchema,
  inventoryDayListQuerySchema,
  updateHotelCancellationPolicySchema,
  updateHotelCancellationPolicyRuleSchema,
  updateHotelContractSchema,
  updateHotelInventoryDaySchema,
  updateHotelRoomRateSchema,
  updateHotelRatePlanSchema,
  updateHotelRateRestrictionSchema,
  updateHotelFeeRuleSchema,
} from "@/modules/accommodation/shared/accommodation-contracting-schemas";
import type {
  HotelCancellationPolicyRecord,
  HotelCancellationPolicyRuleRecord,
  HotelContractingBundle,
  HotelContractRecord,
  HotelFeeRuleRecord,
  HotelInventoryDayRecord,
  HotelRatePlanRecord,
  HotelRateRestrictionRecord,
  HotelResolvedContractRateOption,
  HotelRoomRateRecord,
} from "@/modules/accommodation/shared/accommodation-contracting-types";

class AccommodationContractingError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

function normalizeZodError(error: z.ZodError) {
  return error.issues[0]?.message || "Validation failed.";
}

function toPriceNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) return 0;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

async function getCompanyId(requestHeaders: Headers) {
  try {
    const access = await resolveAccess(requestHeaders, {
      requiredPrivilege: "SCREEN_MASTER_ACCOMMODATIONS",
    });
    return access.companyId;
  } catch (error) {
    if (error instanceof AccessControlError) {
      throw new AccommodationContractingError(error.status, error.code, error.message);
    }
    throw error;
  }
}

async function ensureWritable(requestHeaders: Headers) {
  let access: Awaited<ReturnType<typeof resolveAccess>>;
  try {
    access = await resolveAccess(requestHeaders, {
      requiredPrivilege: "SCREEN_MASTER_ACCOMMODATIONS",
    });
  } catch (error) {
    if (error instanceof AccessControlError) {
      throw new AccommodationContractingError(error.status, error.code, error.message);
    }
    throw error;
  }
  if (access.readOnly) {
    throw new AccommodationContractingError(
      403,
      "READ_ONLY_MODE",
      "You are in read-only mode. Contact a manager for edit access."
    );
  }
  const elevated = access.role === "ADMIN" || access.role === "MANAGER";
  if (!elevated && !access.canWriteMasterData) {
    throw new AccommodationContractingError(
      403,
      "PERMISSION_DENIED",
      "You do not have write access for Master Data."
    );
  }
  return access.companyId;
}

async function ensureHotelOwned(companyId: string, hotelId: string) {
  const [row] = await db
    .select({ id: schema.hotel.id })
    .from(schema.hotel)
    .where(and(eq(schema.hotel.id, hotelId), eq(schema.hotel.companyId, companyId)))
    .limit(1);

  if (!row) {
    throw new AccommodationContractingError(404, "HOTEL_NOT_FOUND", "Hotel not found.");
  }
}

async function ensureRoomTypeOwnedByHotel(hotelId: string, roomTypeId: string) {
  const [row] = await db
    .select({ id: schema.roomType.id })
    .from(schema.roomType)
    .where(and(eq(schema.roomType.id, roomTypeId), eq(schema.roomType.hotelId, hotelId)))
    .limit(1);
  if (!row) {
    throw new AccommodationContractingError(
      400,
      "ROOM_TYPE_NOT_FOUND",
      "Room type does not belong to this hotel."
    );
  }
}

async function ensureContractOwned(companyId: string, contractId: string) {
  const [row] = await db
    .select({ id: schema.hotelContract.id, hotelId: schema.hotelContract.hotelId })
    .from(schema.hotelContract)
    .innerJoin(schema.hotel, eq(schema.hotel.id, schema.hotelContract.hotelId))
    .where(
      and(
        eq(schema.hotelContract.id, contractId),
        eq(schema.hotel.companyId, companyId)
      )
    )
    .limit(1);

  if (!row) {
    throw new AccommodationContractingError(
      404,
      "HOTEL_CONTRACT_NOT_FOUND",
      "Hotel contract not found."
    );
  }

  return row.hotelId;
}

async function ensureSupplierOwned(companyId: string, supplierOrgId: string | null | undefined) {
  if (!supplierOrgId) return;
  const [row] = await db
    .select({ id: schema.businessOrganization.id })
    .from(schema.businessOrganization)
    .where(
      and(
        eq(schema.businessOrganization.id, supplierOrgId),
        eq(schema.businessOrganization.companyId, companyId)
      )
    )
    .limit(1);
  if (!row) {
    throw new AccommodationContractingError(
      400,
      "SUPPLIER_NOT_FOUND",
      "Supplier organization not found."
    );
  }
}

async function ensureRatePlanOwned(companyId: string, ratePlanId: string) {
  const [row] = await db
    .select({
      id: schema.hotelRatePlan.id,
      hotelId: schema.hotelContract.hotelId,
    })
    .from(schema.hotelRatePlan)
    .innerJoin(schema.hotelContract, eq(schema.hotelContract.id, schema.hotelRatePlan.contractId))
    .innerJoin(schema.hotel, eq(schema.hotel.id, schema.hotelContract.hotelId))
    .where(and(eq(schema.hotelRatePlan.id, ratePlanId), eq(schema.hotel.companyId, companyId)))
    .limit(1);

  if (!row) {
    throw new AccommodationContractingError(
      404,
      "HOTEL_RATE_PLAN_NOT_FOUND",
      "Hotel rate plan not found."
    );
  }

  return row.hotelId;
}

async function ensureCancellationPolicyOwned(
  companyId: string,
  cancellationPolicyId: string | null | undefined,
  hotelId: string
) {
  if (!cancellationPolicyId) return;
  const [row] = await db
    .select({ id: schema.hotelCancellationPolicy.id })
    .from(schema.hotelCancellationPolicy)
    .innerJoin(schema.hotel, eq(schema.hotel.id, schema.hotelCancellationPolicy.hotelId))
    .where(
      and(
        eq(schema.hotelCancellationPolicy.id, cancellationPolicyId),
        eq(schema.hotelCancellationPolicy.hotelId, hotelId),
        eq(schema.hotel.companyId, companyId)
      )
    )
    .limit(1);
  if (!row) {
    throw new AccommodationContractingError(
      400,
      "CANCELLATION_POLICY_NOT_FOUND",
      "Cancellation policy not found."
    );
  }
}

async function ensureInventoryDayOwned(companyId: string, inventoryDayId: string) {
  const [row] = await db
    .select({
      id: schema.hotelInventoryDay.id,
      hotelId: schema.hotelInventoryDay.hotelId,
    })
    .from(schema.hotelInventoryDay)
    .innerJoin(schema.hotel, eq(schema.hotel.id, schema.hotelInventoryDay.hotelId))
    .where(and(eq(schema.hotelInventoryDay.id, inventoryDayId), eq(schema.hotel.companyId, companyId)))
    .limit(1);

  if (!row) {
    throw new AccommodationContractingError(
      404,
      "HOTEL_INVENTORY_DAY_NOT_FOUND",
      "Hotel inventory day not found."
    );
  }

  return row.hotelId;
}

function applyTextSearch(
  query: string | undefined,
  clauses: SQL[],
  columns: Array<Parameters<typeof ilike>[0]>
) {
  if (!query) return;
  const term = `%${query}%`;
  clauses.push(or(...columns.map((column) => ilike(column, term)))!);
}

function applyActiveFilter(
  raw: "true" | "false" | undefined,
  clauses: SQL[],
  column: Parameters<typeof eq>[0]
) {
  if (!raw) return;
  clauses.push(eq(column, raw === "true"));
}

export async function listHotelContracts(
  hotelId: string,
  searchParams: URLSearchParams,
  headers: Headers
): Promise<HotelContractRecord[]> {
  const parsed = contractingListQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    throw new AccommodationContractingError(
      400,
      "VALIDATION_ERROR",
      normalizeZodError(parsed.error)
    );
  }

  const companyId = await getCompanyId(headers);
  await ensureHotelOwned(companyId, hotelId);

  const cacheKey = masterDataListCacheKey(
    "accommodation-contracting",
    companyId,
    `hotel-contracts:${hotelId}`,
    parsed.data
  );

  return getOrSetMasterDataCache(cacheKey, async () => {
    const clauses: SQL[] = [eq(schema.hotelContract.hotelId, hotelId)];
    applyActiveFilter(parsed.data.isActive, clauses, schema.hotelContract.isActive);
    applyTextSearch(parsed.data.q, clauses, [
      schema.hotelContract.code,
      schema.hotelContract.contractRef,
      schema.hotelContract.marketScope,
      schema.hotelContract.remarks,
    ]);

    return db
      .select()
      .from(schema.hotelContract)
      .where(and(...clauses))
      .orderBy(asc(schema.hotelContract.validFrom), asc(schema.hotelContract.code))
      .limit(parsed.data.limit);
  });
}

export async function createHotelContract(
  hotelId: string,
  payload: unknown,
  headers: Headers
): Promise<HotelContractRecord> {
  const companyId = await ensureWritable(headers);
  const parsed = createHotelContractSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AccommodationContractingError(
      400,
      "VALIDATION_ERROR",
      normalizeZodError(parsed.error)
    );
  }

  await ensureHotelOwned(companyId, hotelId);
  await ensureSupplierOwned(companyId, parsed.data.supplierOrgId);

  try {
    const [created] = await db
      .insert(schema.hotelContract)
      .values({
        ...parsed.data,
        hotelId,
        companyId,
      })
      .returning();
    return created;
  } finally {
    await invalidateMasterDataCacheByPrefixes([
      masterDataCachePrefix("accommodation-contracting", companyId),
    ]);
  }
}

export async function updateHotelContract(
  contractId: string,
  payload: unknown,
  headers: Headers
): Promise<HotelContractRecord> {
  const companyId = await ensureWritable(headers);
  const parsed = updateHotelContractSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AccommodationContractingError(
      400,
      "VALIDATION_ERROR",
      normalizeZodError(parsed.error)
    );
  }

  const hotelId = await ensureContractOwned(companyId, contractId);
  await ensureSupplierOwned(companyId, parsed.data.supplierOrgId);

  try {
    const [updated] = await db
      .update(schema.hotelContract)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.hotelContract.id, contractId), eq(schema.hotelContract.hotelId, hotelId)))
      .returning();

    if (!updated) {
      throw new AccommodationContractingError(
        404,
        "HOTEL_CONTRACT_NOT_FOUND",
        "Hotel contract not found."
      );
    }
    return updated;
  } finally {
    await invalidateMasterDataCacheByPrefixes([
      masterDataCachePrefix("accommodation-contracting", companyId),
    ]);
  }
}

export async function deleteHotelContract(contractId: string, headers: Headers) {
  const companyId = await ensureWritable(headers);
  await ensureContractOwned(companyId, contractId);

  try {
    const [deleted] = await db
      .delete(schema.hotelContract)
      .where(eq(schema.hotelContract.id, contractId))
      .returning({ id: schema.hotelContract.id });
    if (!deleted) {
      throw new AccommodationContractingError(
        404,
        "HOTEL_CONTRACT_NOT_FOUND",
        "Hotel contract not found."
      );
    }
  } finally {
    await invalidateMasterDataCacheByPrefixes([
      masterDataCachePrefix("accommodation-contracting", companyId),
    ]);
  }
}

export async function listHotelCancellationPolicies(
  hotelId: string,
  searchParams: URLSearchParams,
  headers: Headers
): Promise<HotelCancellationPolicyRecord[]> {
  const parsed = contractingListQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    throw new AccommodationContractingError(
      400,
      "VALIDATION_ERROR",
      normalizeZodError(parsed.error)
    );
  }

  const companyId = await getCompanyId(headers);
  await ensureHotelOwned(companyId, hotelId);

  const cacheKey = masterDataListCacheKey(
    "accommodation-contracting",
    companyId,
    `hotel-cancellation-policies:${hotelId}`,
    parsed.data
  );

  return getOrSetMasterDataCache(cacheKey, async () => {
    const clauses: SQL[] = [eq(schema.hotelCancellationPolicy.hotelId, hotelId)];
    applyActiveFilter(parsed.data.isActive, clauses, schema.hotelCancellationPolicy.isActive);
    applyTextSearch(parsed.data.q, clauses, [
      schema.hotelCancellationPolicy.code,
      schema.hotelCancellationPolicy.name,
      schema.hotelCancellationPolicy.description,
    ]);

    return db
      .select()
      .from(schema.hotelCancellationPolicy)
      .where(and(...clauses))
      .orderBy(
        asc(schema.hotelCancellationPolicy.isDefault),
        asc(schema.hotelCancellationPolicy.name)
      )
      .limit(parsed.data.limit);
  });
}

export async function listHotelCancellationPolicyRules(
  policyId: string,
  searchParams: URLSearchParams,
  headers: Headers
): Promise<HotelCancellationPolicyRuleRecord[]> {
  const parsed = contractingListQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    throw new AccommodationContractingError(
      400,
      "VALIDATION_ERROR",
      normalizeZodError(parsed.error)
    );
  }

  const companyId = await getCompanyId(headers);
  const [policy] = await db
    .select({ hotelId: schema.hotelCancellationPolicy.hotelId })
    .from(schema.hotelCancellationPolicy)
    .innerJoin(schema.hotel, eq(schema.hotel.id, schema.hotelCancellationPolicy.hotelId))
    .where(
      and(
        eq(schema.hotelCancellationPolicy.id, policyId),
        eq(schema.hotel.companyId, companyId)
      )
    )
    .limit(1);

  if (!policy) {
    throw new AccommodationContractingError(
      404,
      "HOTEL_CANCELLATION_POLICY_NOT_FOUND",
      "Hotel cancellation policy not found."
    );
  }

  const cacheKey = masterDataListCacheKey(
    "accommodation-contracting",
    companyId,
    `hotel-cancellation-policy-rules:${policyId}`,
    parsed.data
  );

  return getOrSetMasterDataCache(cacheKey, async () => {
    const clauses: SQL[] = [eq(schema.hotelCancellationPolicyRule.policyId, policyId)];
    applyTextSearch(parsed.data.q, clauses, [
      schema.hotelCancellationPolicyRule.code,
      schema.hotelCancellationPolicyRule.penaltyType,
      schema.hotelCancellationPolicyRule.basis,
    ]);

    return db
      .select()
      .from(schema.hotelCancellationPolicyRule)
      .where(and(...clauses))
      .orderBy(
        asc(schema.hotelCancellationPolicyRule.fromDaysBefore),
        asc(schema.hotelCancellationPolicyRule.toDaysBefore),
        asc(schema.hotelCancellationPolicyRule.code)
      )
      .limit(parsed.data.limit);
  });
}

export async function createHotelCancellationPolicy(
  hotelId: string,
  payload: unknown,
  headers: Headers
): Promise<HotelCancellationPolicyRecord> {
  const companyId = await ensureWritable(headers);
  const parsed = createHotelCancellationPolicySchema.safeParse(payload);
  if (!parsed.success) {
    throw new AccommodationContractingError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }

  await ensureHotelOwned(companyId, hotelId);

  try {
    if (parsed.data.isDefault) {
      await db
        .update(schema.hotelCancellationPolicy)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(schema.hotelCancellationPolicy.hotelId, hotelId));
    }

    const [created] = await db
      .insert(schema.hotelCancellationPolicy)
      .values({
        ...parsed.data,
        hotelId,
      })
      .returning();
    return created;
  } finally {
    await invalidateMasterDataCacheByPrefixes([
      masterDataCachePrefix("accommodation-contracting", companyId),
    ]);
  }
}

export async function updateHotelCancellationPolicy(
  policyId: string,
  payload: unknown,
  headers: Headers
): Promise<HotelCancellationPolicyRecord> {
  const companyId = await ensureWritable(headers);
  const parsed = updateHotelCancellationPolicySchema.safeParse(payload);
  if (!parsed.success) {
    throw new AccommodationContractingError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }

  const [existing] = await db
    .select({
      id: schema.hotelCancellationPolicy.id,
      hotelId: schema.hotelCancellationPolicy.hotelId,
    })
    .from(schema.hotelCancellationPolicy)
    .innerJoin(schema.hotel, eq(schema.hotel.id, schema.hotelCancellationPolicy.hotelId))
    .where(and(eq(schema.hotelCancellationPolicy.id, policyId), eq(schema.hotel.companyId, companyId)))
    .limit(1);

  if (!existing) {
    throw new AccommodationContractingError(
      404,
      "HOTEL_CANCELLATION_POLICY_NOT_FOUND",
      "Hotel cancellation policy not found."
    );
  }

  try {
    if (parsed.data.isDefault) {
      await db
        .update(schema.hotelCancellationPolicy)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(
          and(
            eq(schema.hotelCancellationPolicy.hotelId, existing.hotelId),
            sql`${schema.hotelCancellationPolicy.id} <> ${policyId}`
          )
        );
    }

    const [updated] = await db
      .update(schema.hotelCancellationPolicy)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(eq(schema.hotelCancellationPolicy.id, policyId))
      .returning();

    if (!updated) {
      throw new AccommodationContractingError(
        404,
        "HOTEL_CANCELLATION_POLICY_NOT_FOUND",
        "Hotel cancellation policy not found."
      );
    }
    return updated;
  } finally {
    await invalidateMasterDataCacheByPrefixes([
      masterDataCachePrefix("accommodation-contracting", companyId),
    ]);
  }
}

export async function deleteHotelCancellationPolicy(policyId: string, headers: Headers) {
  const companyId = await ensureWritable(headers);
  const [existing] = await db
    .select({ id: schema.hotelCancellationPolicy.id })
    .from(schema.hotelCancellationPolicy)
    .innerJoin(schema.hotel, eq(schema.hotel.id, schema.hotelCancellationPolicy.hotelId))
    .where(and(eq(schema.hotelCancellationPolicy.id, policyId), eq(schema.hotel.companyId, companyId)))
    .limit(1);

  if (!existing) {
    throw new AccommodationContractingError(
      404,
      "HOTEL_CANCELLATION_POLICY_NOT_FOUND",
      "Hotel cancellation policy not found."
    );
  }

  try {
    await db.delete(schema.hotelCancellationPolicy).where(eq(schema.hotelCancellationPolicy.id, policyId));
  } finally {
    await invalidateMasterDataCacheByPrefixes([
      masterDataCachePrefix("accommodation-contracting", companyId),
    ]);
  }
}

export async function createHotelCancellationPolicyRule(
  policyId: string,
  payload: unknown,
  headers: Headers
): Promise<HotelCancellationPolicyRuleRecord> {
  const companyId = await ensureWritable(headers);
  const parsed = createHotelCancellationPolicyRuleSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AccommodationContractingError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }

  const [policy] = await db
    .select({ id: schema.hotelCancellationPolicy.id })
    .from(schema.hotelCancellationPolicy)
    .innerJoin(schema.hotel, eq(schema.hotel.id, schema.hotelCancellationPolicy.hotelId))
    .where(and(eq(schema.hotelCancellationPolicy.id, policyId), eq(schema.hotel.companyId, companyId)))
    .limit(1);

  if (!policy) {
    throw new AccommodationContractingError(
      404,
      "HOTEL_CANCELLATION_POLICY_NOT_FOUND",
      "Hotel cancellation policy not found."
    );
  }

  try {
    const [created] = await db
      .insert(schema.hotelCancellationPolicyRule)
      .values({
        ...parsed.data,
        policyId,
      })
      .returning();
    return created;
  } finally {
    await invalidateMasterDataCacheByPrefixes([
      masterDataCachePrefix("accommodation-contracting", companyId),
    ]);
  }
}

export async function updateHotelCancellationPolicyRule(
  ruleId: string,
  payload: unknown,
  headers: Headers
): Promise<HotelCancellationPolicyRuleRecord> {
  const companyId = await ensureWritable(headers);
  const parsed = updateHotelCancellationPolicyRuleSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AccommodationContractingError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }

  const [existing] = await db
    .select({ id: schema.hotelCancellationPolicyRule.id })
    .from(schema.hotelCancellationPolicyRule)
    .innerJoin(
      schema.hotelCancellationPolicy,
      eq(schema.hotelCancellationPolicy.id, schema.hotelCancellationPolicyRule.policyId)
    )
    .innerJoin(schema.hotel, eq(schema.hotel.id, schema.hotelCancellationPolicy.hotelId))
    .where(and(eq(schema.hotelCancellationPolicyRule.id, ruleId), eq(schema.hotel.companyId, companyId)))
    .limit(1);

  if (!existing) {
    throw new AccommodationContractingError(
      404,
      "HOTEL_CANCELLATION_POLICY_RULE_NOT_FOUND",
      "Hotel cancellation policy rule not found."
    );
  }

  try {
    const [updated] = await db
      .update(schema.hotelCancellationPolicyRule)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(eq(schema.hotelCancellationPolicyRule.id, ruleId))
      .returning();

    if (!updated) {
      throw new AccommodationContractingError(
        404,
        "HOTEL_CANCELLATION_POLICY_RULE_NOT_FOUND",
        "Hotel cancellation policy rule not found."
      );
    }
    return updated;
  } finally {
    await invalidateMasterDataCacheByPrefixes([
      masterDataCachePrefix("accommodation-contracting", companyId),
    ]);
  }
}

export async function deleteHotelCancellationPolicyRule(ruleId: string, headers: Headers) {
  const companyId = await ensureWritable(headers);
  const [existing] = await db
    .select({ id: schema.hotelCancellationPolicyRule.id })
    .from(schema.hotelCancellationPolicyRule)
    .innerJoin(
      schema.hotelCancellationPolicy,
      eq(schema.hotelCancellationPolicy.id, schema.hotelCancellationPolicyRule.policyId)
    )
    .innerJoin(schema.hotel, eq(schema.hotel.id, schema.hotelCancellationPolicy.hotelId))
    .where(and(eq(schema.hotelCancellationPolicyRule.id, ruleId), eq(schema.hotel.companyId, companyId)))
    .limit(1);

  if (!existing) {
    throw new AccommodationContractingError(
      404,
      "HOTEL_CANCELLATION_POLICY_RULE_NOT_FOUND",
      "Hotel cancellation policy rule not found."
    );
  }

  try {
    await db
      .delete(schema.hotelCancellationPolicyRule)
      .where(eq(schema.hotelCancellationPolicyRule.id, ruleId));
  } finally {
    await invalidateMasterDataCacheByPrefixes([
      masterDataCachePrefix("accommodation-contracting", companyId),
    ]);
  }
}

export async function listHotelRatePlans(
  contractId: string,
  searchParams: URLSearchParams,
  headers: Headers
): Promise<HotelRatePlanRecord[]> {
  const parsed = contractingListQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    throw new AccommodationContractingError(
      400,
      "VALIDATION_ERROR",
      normalizeZodError(parsed.error)
    );
  }

  const companyId = await getCompanyId(headers);
  await ensureContractOwned(companyId, contractId);

  const cacheKey = masterDataListCacheKey(
    "accommodation-contracting",
    companyId,
    `hotel-rate-plans:${contractId}`,
    parsed.data
  );

  return getOrSetMasterDataCache(cacheKey, async () => {
    const clauses: SQL[] = [eq(schema.hotelRatePlan.contractId, contractId)];
    applyActiveFilter(parsed.data.isActive, clauses, schema.hotelRatePlan.isActive);
    applyTextSearch(parsed.data.q, clauses, [
      schema.hotelRatePlan.code,
      schema.hotelRatePlan.name,
      schema.hotelRatePlan.boardBasis,
      schema.hotelRatePlan.marketCode,
    ]);

    return db
      .select()
      .from(schema.hotelRatePlan)
      .where(and(...clauses))
      .orderBy(asc(schema.hotelRatePlan.validFrom), asc(schema.hotelRatePlan.code))
      .limit(parsed.data.limit);
  });
}

export async function createHotelRatePlan(
  contractId: string,
  payload: unknown,
  headers: Headers
): Promise<HotelRatePlanRecord> {
  const companyId = await ensureWritable(headers);
  const parsed = createHotelRatePlanSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AccommodationContractingError(
      400,
      "VALIDATION_ERROR",
      normalizeZodError(parsed.error)
    );
  }

  const hotelId = await ensureContractOwned(companyId, contractId);
  await ensureCancellationPolicyOwned(companyId, parsed.data.cancellationPolicyId, hotelId);

  try {
    const [created] = await db
      .insert(schema.hotelRatePlan)
      .values({
        ...parsed.data,
        contractId,
      })
      .returning();
    return created;
  } finally {
    await invalidateMasterDataCacheByPrefixes([
      masterDataCachePrefix("accommodation-contracting", companyId),
    ]);
  }
}

export async function updateHotelRatePlan(
  ratePlanId: string,
  payload: unknown,
  headers: Headers
): Promise<HotelRatePlanRecord> {
  const companyId = await ensureWritable(headers);
  const parsed = updateHotelRatePlanSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AccommodationContractingError(
      400,
      "VALIDATION_ERROR",
      normalizeZodError(parsed.error)
    );
  }

  const hotelId = await ensureRatePlanOwned(companyId, ratePlanId);
  await ensureCancellationPolicyOwned(companyId, parsed.data.cancellationPolicyId, hotelId);

  try {
    const [updated] = await db
      .update(schema.hotelRatePlan)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(eq(schema.hotelRatePlan.id, ratePlanId))
      .returning();
    if (!updated) {
      throw new AccommodationContractingError(
        404,
        "HOTEL_RATE_PLAN_NOT_FOUND",
        "Hotel rate plan not found."
      );
    }
    return updated;
  } finally {
    await invalidateMasterDataCacheByPrefixes([
      masterDataCachePrefix("accommodation-contracting", companyId),
    ]);
  }
}

export async function deleteHotelRatePlan(ratePlanId: string, headers: Headers) {
  const companyId = await ensureWritable(headers);
  await ensureRatePlanOwned(companyId, ratePlanId);

  try {
    const [deleted] = await db
      .delete(schema.hotelRatePlan)
      .where(eq(schema.hotelRatePlan.id, ratePlanId))
      .returning({ id: schema.hotelRatePlan.id });
    if (!deleted) {
      throw new AccommodationContractingError(
        404,
        "HOTEL_RATE_PLAN_NOT_FOUND",
        "Hotel rate plan not found."
      );
    }
  } finally {
    await invalidateMasterDataCacheByPrefixes([
      masterDataCachePrefix("accommodation-contracting", companyId),
    ]);
  }
}

export async function listHotelRoomRates(
  ratePlanId: string,
  searchParams: URLSearchParams,
  headers: Headers
): Promise<HotelRoomRateRecord[]> {
  const parsed = contractingListQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    throw new AccommodationContractingError(
      400,
      "VALIDATION_ERROR",
      normalizeZodError(parsed.error)
    );
  }

  const companyId = await getCompanyId(headers);
  await ensureRatePlanOwned(companyId, ratePlanId);

  const cacheKey = masterDataListCacheKey(
    "accommodation-contracting",
    companyId,
    `hotel-room-rates:${ratePlanId}`,
    parsed.data
  );

  return getOrSetMasterDataCache(cacheKey, async () => {
    const clauses: SQL[] = [eq(schema.hotelRoomRate.ratePlanId, ratePlanId)];
    applyActiveFilter(parsed.data.isActive, clauses, schema.hotelRoomRate.isActive);
    applyTextSearch(parsed.data.q, clauses, [schema.hotelRoomRate.code]);

    return db
      .select()
      .from(schema.hotelRoomRate)
      .where(and(...clauses))
      .orderBy(
        asc(schema.hotelRoomRate.validFrom),
        asc(schema.hotelRoomRate.roomTypeId),
        asc(schema.hotelRoomRate.code)
      )
      .limit(parsed.data.limit);
  });
}

export async function createHotelRoomRate(
  ratePlanId: string,
  payload: unknown,
  headers: Headers
): Promise<HotelRoomRateRecord> {
  const companyId = await ensureWritable(headers);
  const parsed = createHotelRoomRateSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AccommodationContractingError(
      400,
      "VALIDATION_ERROR",
      normalizeZodError(parsed.error)
    );
  }

  const hotelId = await ensureRatePlanOwned(companyId, ratePlanId);
  await ensureRoomTypeOwnedByHotel(hotelId, parsed.data.roomTypeId);

  try {
    const [created] = await db
      .insert(schema.hotelRoomRate)
      .values({
        ...parsed.data,
        ratePlanId,
        hotelId,
      })
      .returning();
    return created;
  } finally {
    await invalidateMasterDataCacheByPrefixes([
      masterDataCachePrefix("accommodation-contracting", companyId),
    ]);
  }
}

export async function updateHotelRoomRate(
  roomRateId: string,
  payload: unknown,
  headers: Headers
): Promise<HotelRoomRateRecord> {
  const companyId = await ensureWritable(headers);
  const parsed = updateHotelRoomRateSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AccommodationContractingError(
      400,
      "VALIDATION_ERROR",
      normalizeZodError(parsed.error)
    );
  }

  const [existing] = await db
    .select({
      id: schema.hotelRoomRate.id,
      hotelId: schema.hotelRoomRate.hotelId,
    })
    .from(schema.hotelRoomRate)
    .innerJoin(schema.hotel, eq(schema.hotel.id, schema.hotelRoomRate.hotelId))
    .where(and(eq(schema.hotelRoomRate.id, roomRateId), eq(schema.hotel.companyId, companyId)))
    .limit(1);

  if (!existing) {
    throw new AccommodationContractingError(
      404,
      "HOTEL_ROOM_RATE_NOT_FOUND",
      "Hotel room rate not found."
    );
  }

  if (parsed.data.roomTypeId) {
    await ensureRoomTypeOwnedByHotel(existing.hotelId, parsed.data.roomTypeId);
  }

  try {
    const [updated] = await db
      .update(schema.hotelRoomRate)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(eq(schema.hotelRoomRate.id, roomRateId))
      .returning();
    if (!updated) {
      throw new AccommodationContractingError(
        404,
        "HOTEL_ROOM_RATE_NOT_FOUND",
        "Hotel room rate not found."
      );
    }
    return updated;
  } finally {
    await invalidateMasterDataCacheByPrefixes([
      masterDataCachePrefix("accommodation-contracting", companyId),
    ]);
  }
}

export async function deleteHotelRoomRate(roomRateId: string, headers: Headers) {
  const companyId = await ensureWritable(headers);
  const [existing] = await db
    .select({ id: schema.hotelRoomRate.id })
    .from(schema.hotelRoomRate)
    .innerJoin(schema.hotel, eq(schema.hotel.id, schema.hotelRoomRate.hotelId))
    .where(and(eq(schema.hotelRoomRate.id, roomRateId), eq(schema.hotel.companyId, companyId)))
    .limit(1);

  if (!existing) {
    throw new AccommodationContractingError(
      404,
      "HOTEL_ROOM_RATE_NOT_FOUND",
      "Hotel room rate not found."
    );
  }

  try {
    await db.delete(schema.hotelRoomRate).where(eq(schema.hotelRoomRate.id, roomRateId));
  } finally {
    await invalidateMasterDataCacheByPrefixes([
      masterDataCachePrefix("accommodation-contracting", companyId),
    ]);
  }
}

export async function listHotelRateRestrictions(
  ratePlanId: string,
  searchParams: URLSearchParams,
  headers: Headers
): Promise<HotelRateRestrictionRecord[]> {
  const parsed = contractingListQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    throw new AccommodationContractingError(
      400,
      "VALIDATION_ERROR",
      normalizeZodError(parsed.error)
    );
  }

  const companyId = await getCompanyId(headers);
  await ensureRatePlanOwned(companyId, ratePlanId);

  const cacheKey = masterDataListCacheKey(
    "accommodation-contracting",
    companyId,
    `hotel-rate-restrictions:${ratePlanId}`,
    parsed.data
  );

  return getOrSetMasterDataCache(cacheKey, async () => {
    const clauses: SQL[] = [eq(schema.hotelRateRestriction.ratePlanId, ratePlanId)];
    applyTextSearch(parsed.data.q, clauses, [
      schema.hotelRateRestriction.code,
      schema.hotelRateRestriction.notes,
    ]);

    return db
      .select()
      .from(schema.hotelRateRestriction)
      .where(and(...clauses))
      .orderBy(asc(schema.hotelRateRestriction.stayFrom), asc(schema.hotelRateRestriction.code))
      .limit(parsed.data.limit);
  });
}

export async function listHotelFeeRules(
  ratePlanId: string,
  searchParams: URLSearchParams,
  headers: Headers
): Promise<HotelFeeRuleRecord[]> {
  const parsed = contractingListQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    throw new AccommodationContractingError(
      400,
      "VALIDATION_ERROR",
      normalizeZodError(parsed.error)
    );
  }

  const companyId = await getCompanyId(headers);
  await ensureRatePlanOwned(companyId, ratePlanId);

  const cacheKey = masterDataListCacheKey(
    "accommodation-contracting",
    companyId,
    `hotel-fee-rules:${ratePlanId}`,
    parsed.data
  );

  return getOrSetMasterDataCache(cacheKey, async () => {
    const clauses: SQL[] = [eq(schema.hotelFeeRule.ratePlanId, ratePlanId)];
    applyActiveFilter(parsed.data.isActive, clauses, schema.hotelFeeRule.isActive);
    applyTextSearch(parsed.data.q, clauses, [
      schema.hotelFeeRule.code,
      schema.hotelFeeRule.name,
      schema.hotelFeeRule.feeType,
    ]);

    return db
      .select()
      .from(schema.hotelFeeRule)
      .where(and(...clauses))
      .orderBy(asc(schema.hotelFeeRule.feeType), asc(schema.hotelFeeRule.code))
      .limit(parsed.data.limit);
  });
}

export async function createHotelRateRestriction(
  ratePlanId: string,
  payload: unknown,
  headers: Headers
): Promise<HotelRateRestrictionRecord> {
  const companyId = await ensureWritable(headers);
  const parsed = createHotelRateRestrictionSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AccommodationContractingError(
      400,
      "VALIDATION_ERROR",
      normalizeZodError(parsed.error)
    );
  }

  const hotelId = await ensureRatePlanOwned(companyId, ratePlanId);
  if (parsed.data.roomTypeId) {
    await ensureRoomTypeOwnedByHotel(hotelId, parsed.data.roomTypeId);
  }

  try {
    const [created] = await db
      .insert(schema.hotelRateRestriction)
      .values({
        ...parsed.data,
        ratePlanId,
      })
      .returning();
    return created;
  } finally {
    await invalidateMasterDataCacheByPrefixes([
      masterDataCachePrefix("accommodation-contracting", companyId),
    ]);
  }
}

export async function updateHotelRateRestriction(
  restrictionId: string,
  payload: unknown,
  headers: Headers
): Promise<HotelRateRestrictionRecord> {
  const companyId = await ensureWritable(headers);
  const parsed = updateHotelRateRestrictionSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AccommodationContractingError(
      400,
      "VALIDATION_ERROR",
      normalizeZodError(parsed.error)
    );
  }

  const [existing] = await db
    .select({
      id: schema.hotelRateRestriction.id,
      roomTypeId: schema.hotelRateRestriction.roomTypeId,
      hotelId: schema.hotelContract.hotelId,
    })
    .from(schema.hotelRateRestriction)
    .innerJoin(schema.hotelRatePlan, eq(schema.hotelRatePlan.id, schema.hotelRateRestriction.ratePlanId))
    .innerJoin(schema.hotelContract, eq(schema.hotelContract.id, schema.hotelRatePlan.contractId))
    .innerJoin(schema.hotel, eq(schema.hotel.id, schema.hotelContract.hotelId))
    .where(and(eq(schema.hotelRateRestriction.id, restrictionId), eq(schema.hotel.companyId, companyId)))
    .limit(1);

  if (!existing) {
    throw new AccommodationContractingError(
      404,
      "HOTEL_RATE_RESTRICTION_NOT_FOUND",
      "Hotel rate restriction not found."
    );
  }

  if (parsed.data.roomTypeId) {
    await ensureRoomTypeOwnedByHotel(existing.hotelId, parsed.data.roomTypeId);
  }

  try {
    const [updated] = await db
      .update(schema.hotelRateRestriction)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(eq(schema.hotelRateRestriction.id, restrictionId))
      .returning();
    if (!updated) {
      throw new AccommodationContractingError(
        404,
        "HOTEL_RATE_RESTRICTION_NOT_FOUND",
        "Hotel rate restriction not found."
      );
    }
    return updated;
  } finally {
    await invalidateMasterDataCacheByPrefixes([
      masterDataCachePrefix("accommodation-contracting", companyId),
    ]);
  }
}

export async function deleteHotelRateRestriction(restrictionId: string, headers: Headers) {
  const companyId = await ensureWritable(headers);
  const [existing] = await db
    .select({ id: schema.hotelRateRestriction.id })
    .from(schema.hotelRateRestriction)
    .innerJoin(schema.hotelRatePlan, eq(schema.hotelRatePlan.id, schema.hotelRateRestriction.ratePlanId))
    .innerJoin(schema.hotelContract, eq(schema.hotelContract.id, schema.hotelRatePlan.contractId))
    .innerJoin(schema.hotel, eq(schema.hotel.id, schema.hotelContract.hotelId))
    .where(and(eq(schema.hotelRateRestriction.id, restrictionId), eq(schema.hotel.companyId, companyId)))
    .limit(1);

  if (!existing) {
    throw new AccommodationContractingError(
      404,
      "HOTEL_RATE_RESTRICTION_NOT_FOUND",
      "Hotel rate restriction not found."
    );
  }

  try {
    await db.delete(schema.hotelRateRestriction).where(eq(schema.hotelRateRestriction.id, restrictionId));
  } finally {
    await invalidateMasterDataCacheByPrefixes([
      masterDataCachePrefix("accommodation-contracting", companyId),
    ]);
  }
}

export async function createHotelFeeRule(
  ratePlanId: string,
  payload: unknown,
  headers: Headers
): Promise<HotelFeeRuleRecord> {
  const companyId = await ensureWritable(headers);
  const parsed = createHotelFeeRuleSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AccommodationContractingError(
      400,
      "VALIDATION_ERROR",
      normalizeZodError(parsed.error)
    );
  }

  await ensureRatePlanOwned(companyId, ratePlanId);

  try {
    const [created] = await db
      .insert(schema.hotelFeeRule)
      .values({
        ...parsed.data,
        ratePlanId,
      })
      .returning();
    return created;
  } finally {
    await invalidateMasterDataCacheByPrefixes([
      masterDataCachePrefix("accommodation-contracting", companyId),
    ]);
  }
}

export async function updateHotelFeeRule(
  feeRuleId: string,
  payload: unknown,
  headers: Headers
): Promise<HotelFeeRuleRecord> {
  const companyId = await ensureWritable(headers);
  const parsed = updateHotelFeeRuleSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AccommodationContractingError(
      400,
      "VALIDATION_ERROR",
      normalizeZodError(parsed.error)
    );
  }

  const [existing] = await db
    .select({ id: schema.hotelFeeRule.id })
    .from(schema.hotelFeeRule)
    .innerJoin(schema.hotelRatePlan, eq(schema.hotelRatePlan.id, schema.hotelFeeRule.ratePlanId))
    .innerJoin(schema.hotelContract, eq(schema.hotelContract.id, schema.hotelRatePlan.contractId))
    .innerJoin(schema.hotel, eq(schema.hotel.id, schema.hotelContract.hotelId))
    .where(and(eq(schema.hotelFeeRule.id, feeRuleId), eq(schema.hotel.companyId, companyId)))
    .limit(1);

  if (!existing) {
    throw new AccommodationContractingError(
      404,
      "HOTEL_FEE_RULE_NOT_FOUND",
      "Hotel fee rule not found."
    );
  }

  try {
    const [updated] = await db
      .update(schema.hotelFeeRule)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(eq(schema.hotelFeeRule.id, feeRuleId))
      .returning();
    if (!updated) {
      throw new AccommodationContractingError(
        404,
        "HOTEL_FEE_RULE_NOT_FOUND",
        "Hotel fee rule not found."
      );
    }
    return updated;
  } finally {
    await invalidateMasterDataCacheByPrefixes([
      masterDataCachePrefix("accommodation-contracting", companyId),
    ]);
  }
}

export async function deleteHotelFeeRule(feeRuleId: string, headers: Headers) {
  const companyId = await ensureWritable(headers);
  const [existing] = await db
    .select({ id: schema.hotelFeeRule.id })
    .from(schema.hotelFeeRule)
    .innerJoin(schema.hotelRatePlan, eq(schema.hotelRatePlan.id, schema.hotelFeeRule.ratePlanId))
    .innerJoin(schema.hotelContract, eq(schema.hotelContract.id, schema.hotelRatePlan.contractId))
    .innerJoin(schema.hotel, eq(schema.hotel.id, schema.hotelContract.hotelId))
    .where(and(eq(schema.hotelFeeRule.id, feeRuleId), eq(schema.hotel.companyId, companyId)))
    .limit(1);

  if (!existing) {
    throw new AccommodationContractingError(
      404,
      "HOTEL_FEE_RULE_NOT_FOUND",
      "Hotel fee rule not found."
    );
  }

  try {
    await db.delete(schema.hotelFeeRule).where(eq(schema.hotelFeeRule.id, feeRuleId));
  } finally {
    await invalidateMasterDataCacheByPrefixes([
      masterDataCachePrefix("accommodation-contracting", companyId),
    ]);
  }
}

export async function listHotelInventoryDays(
  hotelId: string,
  searchParams: URLSearchParams,
  headers: Headers
): Promise<HotelInventoryDayRecord[]> {
  const parsed = inventoryDayListQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    throw new AccommodationContractingError(
      400,
      "VALIDATION_ERROR",
      normalizeZodError(parsed.error)
    );
  }

  const companyId = await getCompanyId(headers);
  await ensureHotelOwned(companyId, hotelId);

  const cacheKey = masterDataListCacheKey(
    "accommodation-contracting",
    companyId,
    `hotel-inventory-days:${hotelId}`,
    parsed.data
  );

  return getOrSetMasterDataCache(cacheKey, async () => {
    const clauses: SQL[] = [eq(schema.hotelInventoryDay.hotelId, hotelId)];
    if (parsed.data.roomTypeId) {
      clauses.push(eq(schema.hotelInventoryDay.roomTypeId, parsed.data.roomTypeId));
    }
    if (parsed.data.dateFrom) {
      clauses.push(gte(schema.hotelInventoryDay.date, parsed.data.dateFrom));
    }
    if (parsed.data.dateTo) {
      clauses.push(lte(schema.hotelInventoryDay.date, parsed.data.dateTo));
    }
    applyTextSearch(parsed.data.q, clauses, [schema.hotelInventoryDay.code, schema.hotelInventoryDay.notes]);

    return db
      .select()
      .from(schema.hotelInventoryDay)
      .where(and(...clauses))
      .orderBy(asc(schema.hotelInventoryDay.date), asc(schema.hotelInventoryDay.roomTypeId))
      .limit(parsed.data.limit);
  });
}

export async function createHotelInventoryDay(
  hotelId: string,
  payload: unknown,
  headers: Headers
): Promise<HotelInventoryDayRecord> {
  const companyId = await ensureWritable(headers);
  const parsed = createHotelInventoryDaySchema.safeParse(payload);
  if (!parsed.success) {
    throw new AccommodationContractingError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }

  await ensureHotelOwned(companyId, hotelId);
  await ensureRoomTypeOwnedByHotel(hotelId, parsed.data.roomTypeId);

  try {
    const [created] = await db
      .insert(schema.hotelInventoryDay)
      .values({
        ...parsed.data,
        hotelId,
      })
      .returning();
    return created;
  } finally {
    await invalidateMasterDataCacheByPrefixes([
      masterDataCachePrefix("accommodation-contracting", companyId),
    ]);
  }
}

export async function updateHotelInventoryDay(
  inventoryDayId: string,
  payload: unknown,
  headers: Headers
): Promise<HotelInventoryDayRecord> {
  const companyId = await ensureWritable(headers);
  const parsed = updateHotelInventoryDaySchema.safeParse(payload);
  if (!parsed.success) {
    throw new AccommodationContractingError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }

  const hotelId = await ensureInventoryDayOwned(companyId, inventoryDayId);
  if (parsed.data.roomTypeId) {
    await ensureRoomTypeOwnedByHotel(hotelId, parsed.data.roomTypeId);
  }

  try {
    const [updated] = await db
      .update(schema.hotelInventoryDay)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(eq(schema.hotelInventoryDay.id, inventoryDayId))
      .returning();

    if (!updated) {
      throw new AccommodationContractingError(
        404,
        "HOTEL_INVENTORY_DAY_NOT_FOUND",
        "Hotel inventory day not found."
      );
    }
    return updated;
  } finally {
    await invalidateMasterDataCacheByPrefixes([
      masterDataCachePrefix("accommodation-contracting", companyId),
    ]);
  }
}

export async function deleteHotelInventoryDay(inventoryDayId: string, headers: Headers) {
  const companyId = await ensureWritable(headers);
  await ensureInventoryDayOwned(companyId, inventoryDayId);

  try {
    await db.delete(schema.hotelInventoryDay).where(eq(schema.hotelInventoryDay.id, inventoryDayId));
  } finally {
    await invalidateMasterDataCacheByPrefixes([
      masterDataCachePrefix("accommodation-contracting", companyId),
    ]);
  }
}

export async function loadHotelContractingBundle(
  hotelId: string,
  headers: Headers
): Promise<HotelContractingBundle> {
  const companyId = await getCompanyId(headers);
  await ensureHotelOwned(companyId, hotelId);

  const cacheKey = `${masterDataCachePrefix("accommodation-contracting", companyId)}bundle:hotel:${hotelId}`;

  return getOrSetMasterDataCache(cacheKey, async () => {
    const [contracts, cancellationPolicies, inventoryDays] = await Promise.all([
      listHotelContracts(hotelId, new URLSearchParams({ limit: "500" }), headers),
      listHotelCancellationPolicies(hotelId, new URLSearchParams({ limit: "500" }), headers),
      listHotelInventoryDays(hotelId, new URLSearchParams({ limit: "500" }), headers),
    ]);

    const contractIds = contracts.map((row) => row.id);
    const policyIds = cancellationPolicies.map((row) => row.id);

    const [ratePlans, restrictions, feeRules, roomRates, cancellationPolicyRules] =
      await Promise.all([
        contractIds.length === 0
          ? Promise.resolve([] as HotelRatePlanRecord[])
          : db
              .select()
              .from(schema.hotelRatePlan)
              .where(sql`${schema.hotelRatePlan.contractId} = ANY(${contractIds})`)
              .orderBy(asc(schema.hotelRatePlan.validFrom), asc(schema.hotelRatePlan.code)),
        contractIds.length === 0
          ? Promise.resolve([] as HotelRateRestrictionRecord[])
          : db
              .select()
              .from(schema.hotelRateRestriction)
              .innerJoin(
                schema.hotelRatePlan,
                eq(schema.hotelRatePlan.id, schema.hotelRateRestriction.ratePlanId)
              )
              .where(inArray(schema.hotelRatePlan.contractId, contractIds))
              .then((rows) => rows.map((row) => row.hotelRateRestriction)),
        contractIds.length === 0
          ? Promise.resolve([] as HotelFeeRuleRecord[])
          : db
              .select()
              .from(schema.hotelFeeRule)
              .innerJoin(
                schema.hotelRatePlan,
                eq(schema.hotelRatePlan.id, schema.hotelFeeRule.ratePlanId)
              )
              .where(inArray(schema.hotelRatePlan.contractId, contractIds))
              .then((rows) => rows.map((row) => row.hotelFeeRule)),
        contractIds.length === 0
          ? Promise.resolve([] as HotelRoomRateRecord[])
          : db
              .select()
              .from(schema.hotelRoomRate)
              .innerJoin(
                schema.hotelRatePlan,
                eq(schema.hotelRatePlan.id, schema.hotelRoomRate.ratePlanId)
              )
              .where(inArray(schema.hotelRatePlan.contractId, contractIds))
              .then((rows) => rows.map((row) => row.hotelRoomRate)),
        policyIds.length === 0
          ? Promise.resolve([] as HotelCancellationPolicyRuleRecord[])
          : db
              .select()
              .from(schema.hotelCancellationPolicyRule)
              .where(inArray(schema.hotelCancellationPolicyRule.policyId, policyIds))
              .orderBy(
                asc(schema.hotelCancellationPolicyRule.fromDaysBefore),
                asc(schema.hotelCancellationPolicyRule.toDaysBefore)
              ),
      ]);

    return {
      contracts,
      ratePlans,
      roomRates,
      restrictions,
      feeRules,
      cancellationPolicies,
      cancellationPolicyRules,
      inventoryDays,
    };
  });
}

export async function resolveHotelContractRates(
  input: unknown,
  headers: Headers
): Promise<HotelResolvedContractRateOption[]> {
  const parsed = hotelRateResolutionQuerySchema.safeParse(input);
  if (!parsed.success) {
    throw new AccommodationContractingError(
      400,
      "VALIDATION_ERROR",
      normalizeZodError(parsed.error)
    );
  }

  const companyId = await getCompanyId(headers);
  await ensureHotelOwned(companyId, parsed.data.hotelId);

  const stayDate = parsed.data.stayDate;
  const rows = await db
    .select({
      contractId: schema.hotelContract.id,
      contractCode: schema.hotelContract.code,
      ratePlanId: schema.hotelRatePlan.id,
      ratePlanCode: schema.hotelRatePlan.code,
      ratePlanName: schema.hotelRatePlan.name,
      boardBasis: schema.hotelRatePlan.boardBasis,
      roomRateId: schema.hotelRoomRate.id,
      roomRateCode: schema.hotelRoomRate.code,
      roomTypeId: schema.roomType.id,
      roomTypeCode: schema.roomType.code,
      roomTypeName: schema.roomType.name,
      maxAdults: schema.hotelRoomRate.maxAdults,
      maxChildren: schema.hotelRoomRate.maxChildren,
      singleUseRate: schema.hotelRoomRate.singleUseRate,
      doubleRate: schema.hotelRoomRate.doubleRate,
      tripleRate: schema.hotelRoomRate.tripleRate,
      quadRate: schema.hotelRoomRate.quadRate,
      extraAdultRate: schema.hotelRoomRate.extraAdultRate,
      childWithBedRate: schema.hotelRoomRate.childWithBedRate,
      childNoBedRate: schema.hotelRoomRate.childNoBedRate,
      infantRate: schema.hotelRoomRate.infantRate,
      singleSupplementRate: schema.hotelRoomRate.singleSupplementRate,
      currencyCode: schema.hotelRoomRate.currencyCode,
    })
    .from(schema.hotelRoomRate)
    .innerJoin(schema.hotelRatePlan, eq(schema.hotelRatePlan.id, schema.hotelRoomRate.ratePlanId))
    .innerJoin(schema.hotelContract, eq(schema.hotelContract.id, schema.hotelRatePlan.contractId))
    .innerJoin(schema.roomType, eq(schema.roomType.id, schema.hotelRoomRate.roomTypeId))
    .where(
      and(
        eq(schema.hotelContract.hotelId, parsed.data.hotelId),
        eq(schema.hotelContract.isActive, true),
        eq(schema.hotelRatePlan.isActive, true),
        eq(schema.hotelRoomRate.isActive, true),
        eq(schema.roomType.isActive, true),
        lte(schema.hotelContract.validFrom, stayDate),
        gte(schema.hotelContract.validTo, stayDate),
        lte(schema.hotelRatePlan.validFrom, stayDate),
        gte(schema.hotelRatePlan.validTo, stayDate),
        lte(schema.hotelRoomRate.validFrom, stayDate),
        gte(schema.hotelRoomRate.validTo, stayDate),
        parsed.data.roomTypeId
          ? eq(schema.hotelRoomRate.roomTypeId, parsed.data.roomTypeId)
          : undefined,
        parsed.data.boardBasis
          ? eq(schema.hotelRatePlan.boardBasis, parsed.data.boardBasis)
          : undefined,
        gte(schema.hotelRoomRate.maxAdults, parsed.data.adults),
        gte(schema.hotelRoomRate.maxChildren, parsed.data.children)
      )
    )
    .orderBy(
      asc(schema.hotelRatePlan.boardBasis),
      asc(schema.roomType.name),
      asc(schema.hotelRoomRate.validFrom),
      asc(schema.hotelContract.validFrom)
    );

  if (rows.length === 0) {
    return [];
  }

  const ratePlanIds = [...new Set(rows.map((row) => row.ratePlanId))];
  const [restrictions, feeRules] = await Promise.all([
    db
      .select()
      .from(schema.hotelRateRestriction)
      .where(
        and(
          inArray(schema.hotelRateRestriction.ratePlanId, ratePlanIds),
          lte(schema.hotelRateRestriction.stayFrom, stayDate),
          gte(schema.hotelRateRestriction.stayTo, stayDate)
        )
      ),
    db
      .select()
      .from(schema.hotelFeeRule)
      .where(
        and(
          inArray(schema.hotelFeeRule.ratePlanId, ratePlanIds),
          eq(schema.hotelFeeRule.isActive, true),
          or(
            and(
              isNull(schema.hotelFeeRule.validFrom),
              isNull(schema.hotelFeeRule.validTo)
            ),
            and(
              lte(schema.hotelFeeRule.validFrom, stayDate),
              gte(schema.hotelFeeRule.validTo, stayDate)
            ),
            and(
              lte(schema.hotelFeeRule.validFrom, stayDate),
              isNull(schema.hotelFeeRule.validTo)
            ),
            and(
              isNull(schema.hotelFeeRule.validFrom),
              gte(schema.hotelFeeRule.validTo, stayDate)
            )
          )
        )
      ),
  ]);

  return rows
    .map((row) => {
      const applicableRestrictions = restrictions.filter(
        (restriction) =>
          restriction.ratePlanId === row.ratePlanId &&
          (!restriction.roomTypeId || restriction.roomTypeId === row.roomTypeId)
      );
      const blocked = applicableRestrictions.some(
        (restriction) =>
          restriction.stopSell ||
          restriction.closedToArrival ||
          restriction.closedToDeparture
      );
      if (blocked) {
        return null;
      }

      const baseAmount =
        parsed.data.adults <= 1
          ? toPriceNumber(row.singleUseRate ?? row.doubleRate)
          : parsed.data.adults === 2
            ? toPriceNumber(row.doubleRate ?? row.singleUseRate)
            : parsed.data.adults === 3
              ? toPriceNumber(row.tripleRate ?? row.doubleRate)
              : toPriceNumber(row.quadRate ?? row.tripleRate ?? row.doubleRate);

      const extraAdultCount = Math.max(parsed.data.adults - Math.min(parsed.data.adults, 4), 0);
      const childCount = parsed.data.children;
      const feeRows = feeRules.filter((feeRule) => feeRule.ratePlanId === row.ratePlanId);
      const feeTotal = feeRows.reduce((sum, feeRule) => {
        const amount = toPriceNumber(feeRule.amount);
        switch (feeRule.chargeBasis) {
          case "PER_PAX_PER_NIGHT":
            return sum + amount * (parsed.data.adults + parsed.data.children);
          case "PER_STAY":
          case "FLAT":
          case "PER_ROOM_PER_NIGHT":
          default:
            return sum + amount;
        }
      }, 0);

      const buyBaseAmount =
        baseAmount +
        extraAdultCount * toPriceNumber(row.extraAdultRate) +
        childCount * toPriceNumber(row.childWithBedRate);
      const buyTaxAmount = feeTotal;

      return {
        contractId: row.contractId,
        contractCode: row.contractCode,
        ratePlanId: row.ratePlanId,
        ratePlanCode: row.ratePlanCode,
        ratePlanName: row.ratePlanName,
        boardBasis: row.boardBasis,
        roomRateId: row.roomRateId,
        roomRateCode: row.roomRateCode,
        roomTypeId: row.roomTypeId,
        roomTypeCode: row.roomTypeCode,
        roomTypeName: row.roomTypeName,
        stayDate,
        currencyCode: row.currencyCode,
        occupancy: {
          adults: parsed.data.adults,
          children: parsed.data.children,
          maxAdults: row.maxAdults,
          maxChildren: row.maxChildren,
        },
        buyBaseAmount,
        buyTaxAmount,
        buyTotalAmount: buyBaseAmount + buyTaxAmount,
        singleSupplementRate:
          row.singleSupplementRate === null ? null : toPriceNumber(row.singleSupplementRate),
        applicableFees: feeRows.map((feeRule) => ({
          feeRuleId: feeRule.id,
          code: feeRule.code,
          name: feeRule.name,
          feeType: feeRule.feeType,
          chargeBasis: feeRule.chargeBasis,
          amount: toPriceNumber(feeRule.amount),
          currencyCode: feeRule.currencyCode,
        })),
        applicableRestrictions: applicableRestrictions.map((restriction) => ({
          restrictionId: restriction.id,
          code: restriction.code,
          minStay: restriction.minStay,
          maxStay: restriction.maxStay,
          closedToArrival: restriction.closedToArrival,
          closedToDeparture: restriction.closedToDeparture,
          stopSell: restriction.stopSell,
          releaseDays: restriction.releaseDays,
        })),
      } satisfies HotelResolvedContractRateOption;
    })
    .filter((row): row is HotelResolvedContractRateOption => row !== null);
}

export function toAccommodationContractingErrorResponse(error: unknown) {
  if (error instanceof AccommodationContractingError) {
    return {
      status: error.status,
      body: { message: error.message, code: error.code },
    };
  }
  if (error instanceof AccessControlError) {
    return {
      status: error.status,
      body: { message: error.message, code: error.code },
    };
  }
  return {
    status: 500,
    body: {
      message: "Failed to process accommodation contracting request.",
      code: "INTERNAL_SERVER_ERROR",
    },
  };
}
