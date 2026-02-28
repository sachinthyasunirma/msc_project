import { and, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { auth } from "@/lib/auth";
import {
  businessNetworkListQuerySchema,
  businessNetworkResourceSchema,
  createBusinessMarketProfileSchema,
  createBusinessOperatorMarketContractSchema,
  createBusinessOperatorProfileSchema,
  createBusinessOrganizationSchema,
  createBusinessOrgMemberSchema,
  updateBusinessMarketProfileSchema,
  updateBusinessOperatorMarketContractSchema,
  updateBusinessOperatorProfileSchema,
  updateBusinessOrganizationSchema,
  updateBusinessOrgMemberSchema,
} from "@/modules/business-network/shared/business-network-schemas";

class BusinessNetworkError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

type BusinessNetworkResource = z.infer<typeof businessNetworkResourceSchema>;

function normalizeZodError(error: z.ZodError) {
  return error.issues[0]?.message || "Validation failed.";
}

function toDecimal(value: number | string | null | undefined) {
  if (value === null || value === undefined) return null;
  const numeric = typeof value === "number" ? value : Number(value);
  return numeric.toFixed(2);
}

function toDate(value: string | null | undefined) {
  if (!value) return null;
  return new Date(value);
}

async function getAccess(headers: Headers) {
  const session = await auth.api.getSession({ headers });
  if (!session?.user) {
    throw new BusinessNetworkError(401, "UNAUTHORIZED", "You are not authenticated.");
  }
  const user = session.user as { companyId?: string | null; readOnly?: boolean };
  if (!user.companyId) {
    throw new BusinessNetworkError(403, "COMPANY_REQUIRED", "User is not linked to a company.");
  }
  return { companyId: user.companyId, readOnly: Boolean(user.readOnly) };
}

async function ensureWritable(headers: Headers) {
  const access = await getAccess(headers);
  if (access.readOnly) {
    throw new BusinessNetworkError(
      403,
      "READ_ONLY_MODE",
      "You are in read-only mode. Contact a manager for edit access."
    );
  }
  return access;
}

function parseResource(input: string): BusinessNetworkResource {
  const parsed = businessNetworkResourceSchema.safeParse(input);
  if (!parsed.success) {
    throw new BusinessNetworkError(404, "RESOURCE_NOT_FOUND", "Business network resource not found.");
  }
  return parsed.data;
}

async function ensureOrganization(companyId: string, id: string) {
  const [record] = await db
    .select({ id: schema.businessOrganization.id, type: schema.businessOrganization.type })
    .from(schema.businessOrganization)
    .where(
      and(
        eq(schema.businessOrganization.id, id),
        eq(schema.businessOrganization.companyId, companyId)
      )
    )
    .limit(1);
  if (!record) {
    throw new BusinessNetworkError(400, "ORGANIZATION_NOT_FOUND", "Organization not found.");
  }
  return record;
}

async function ensureOrganizationType(
  companyId: string,
  id: string,
  types: Array<"OPERATOR" | "MARKET" | "PLATFORM" | "SUPPLIER">,
  code: string
) {
  const record = await ensureOrganization(companyId, id);
  if (!types.includes(record.type as (typeof types)[number])) {
    throw new BusinessNetworkError(400, code, `Organization type must be one of: ${types.join(", ")}.`);
  }
}

async function ensureUserInCompany(companyId: string, userId: string) {
  const [record] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(and(eq(schema.user.id, userId), eq(schema.user.companyId, companyId)))
    .limit(1);
  if (!record) {
    throw new BusinessNetworkError(400, "USER_NOT_FOUND", "User not found in this company.");
  }
}

export async function listBusinessNetworkRecords(
  resourceInput: string,
  searchParams: URLSearchParams,
  headers: Headers
) {
  const resource = parseResource(resourceInput);
  const parsed = businessNetworkListQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    throw new BusinessNetworkError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
  }
  const { companyId } = await getAccess(headers);
  const q = parsed.data.q ? `%${parsed.data.q}%` : null;
  const limit = parsed.data.limit;

  switch (resource) {
    case "organizations":
      return db
        .select()
        .from(schema.businessOrganization)
        .where(
          and(
            eq(schema.businessOrganization.companyId, companyId),
            q
              ? or(
                  ilike(schema.businessOrganization.code, q),
                  ilike(schema.businessOrganization.name, q),
                  ilike(schema.businessOrganization.type, q)
                )
              : undefined
          )
        )
        .orderBy(desc(schema.businessOrganization.createdAt))
        .limit(limit);
    case "operator-profiles":
      return db
        .select()
        .from(schema.businessOperatorProfile)
        .where(
          and(
            eq(schema.businessOperatorProfile.companyId, companyId),
            parsed.data.organizationId
              ? eq(schema.businessOperatorProfile.organizationId, parsed.data.organizationId)
              : undefined,
            q
              ? or(
                  ilike(schema.businessOperatorProfile.code, q),
                  ilike(schema.businessOperatorProfile.operatorKind, q),
                  ilike(schema.businessOperatorProfile.bookingMode, q)
                )
              : undefined
          )
        )
        .orderBy(desc(schema.businessOperatorProfile.createdAt))
        .limit(limit);
    case "market-profiles":
      return db
        .select()
        .from(schema.businessMarketProfile)
        .where(
          and(
            eq(schema.businessMarketProfile.companyId, companyId),
            parsed.data.organizationId
              ? eq(schema.businessMarketProfile.organizationId, parsed.data.organizationId)
              : undefined,
            q
              ? or(
                  ilike(schema.businessMarketProfile.code, q),
                  ilike(schema.businessMarketProfile.agencyType, q),
                  ilike(schema.businessMarketProfile.licenseNo, q)
                )
              : undefined
          )
        )
        .orderBy(desc(schema.businessMarketProfile.createdAt))
        .limit(limit);
    case "org-members":
      return db
        .select()
        .from(schema.businessOrgMember)
        .where(
          and(
            eq(schema.businessOrgMember.companyId, companyId),
            parsed.data.organizationId
              ? eq(schema.businessOrgMember.organizationId, parsed.data.organizationId)
              : undefined,
            q
              ? or(
                  ilike(schema.businessOrgMember.code, q),
                  ilike(schema.businessOrgMember.role, q)
                )
              : undefined
          )
        )
        .orderBy(desc(schema.businessOrgMember.createdAt))
        .limit(limit);
    case "operator-market-contracts":
      return db
        .select()
        .from(schema.businessOperatorMarketContract)
        .where(
          and(
            eq(schema.businessOperatorMarketContract.companyId, companyId),
            parsed.data.operatorOrgId
              ? eq(schema.businessOperatorMarketContract.operatorOrgId, parsed.data.operatorOrgId)
              : undefined,
            parsed.data.marketOrgId
              ? eq(schema.businessOperatorMarketContract.marketOrgId, parsed.data.marketOrgId)
              : undefined,
            q
              ? or(
                  ilike(schema.businessOperatorMarketContract.code, q),
                  ilike(schema.businessOperatorMarketContract.status, q),
                  ilike(schema.businessOperatorMarketContract.pricingMode, q)
                )
              : undefined
          )
        )
        .orderBy(desc(schema.businessOperatorMarketContract.createdAt))
        .limit(limit);
    default:
      throw new BusinessNetworkError(404, "RESOURCE_NOT_FOUND", "Business network resource not found.");
  }
}

export async function createBusinessNetworkRecord(
  resourceInput: string,
  payload: unknown,
  headers: Headers
) {
  const resource = parseResource(resourceInput);
  const { companyId } = await ensureWritable(headers);

  switch (resource) {
    case "organizations": {
      const parsed = createBusinessOrganizationSchema.safeParse(payload);
      if (!parsed.success) {
        throw new BusinessNetworkError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      const [created] = await db
        .insert(schema.businessOrganization)
        .values({ ...parsed.data, companyId })
        .returning();
      return created;
    }
    case "operator-profiles": {
      const parsed = createBusinessOperatorProfileSchema.safeParse(payload);
      if (!parsed.success) {
        throw new BusinessNetworkError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      await ensureOrganizationType(companyId, parsed.data.organizationId, ["OPERATOR", "SUPPLIER"], "INVALID_OPERATOR_ORGANIZATION");
      const [created] = await db
        .insert(schema.businessOperatorProfile)
        .values({
          ...parsed.data,
          companyId,
          leadTimeHours: toDecimal(parsed.data.leadTimeHours) ?? "0.00",
        })
        .returning();
      return created;
    }
    case "market-profiles": {
      const parsed = createBusinessMarketProfileSchema.safeParse(payload);
      if (!parsed.success) {
        throw new BusinessNetworkError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      await ensureOrganizationType(companyId, parsed.data.organizationId, ["MARKET"], "INVALID_MARKET_ORGANIZATION");
      const [created] = await db
        .insert(schema.businessMarketProfile)
        .values({
          ...parsed.data,
          companyId,
          creditLimit: toDecimal(parsed.data.creditLimit),
          paymentTermDays: parsed.data.paymentTermDays?.toString(),
          defaultMarkupPercent: toDecimal(parsed.data.defaultMarkupPercent) ?? "0.00",
        })
        .returning();
      return created;
    }
    case "org-members": {
      const parsed = createBusinessOrgMemberSchema.safeParse(payload);
      if (!parsed.success) {
        throw new BusinessNetworkError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      await ensureOrganization(companyId, parsed.data.organizationId);
      await ensureUserInCompany(companyId, parsed.data.userId);
      const [created] = await db
        .insert(schema.businessOrgMember)
        .values({ ...parsed.data, companyId })
        .returning();
      return created;
    }
    case "operator-market-contracts": {
      const parsed = createBusinessOperatorMarketContractSchema.safeParse(payload);
      if (!parsed.success) {
        throw new BusinessNetworkError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      if (parsed.data.operatorOrgId === parsed.data.marketOrgId) {
        throw new BusinessNetworkError(
          400,
          "INVALID_CONTRACT",
          "Operator and market organizations must be different."
        );
      }
      await ensureOrganizationType(companyId, parsed.data.operatorOrgId, ["OPERATOR", "SUPPLIER"], "INVALID_OPERATOR_ORGANIZATION");
      await ensureOrganizationType(companyId, parsed.data.marketOrgId, ["MARKET"], "INVALID_MARKET_ORGANIZATION");
      const [created] = await db
        .insert(schema.businessOperatorMarketContract)
        .values({
          ...parsed.data,
          companyId,
          defaultMarkupPercent: toDecimal(parsed.data.defaultMarkupPercent) ?? "0.00",
          defaultCommissionPercent: toDecimal(parsed.data.defaultCommissionPercent) ?? "0.00",
          creditLimit: toDecimal(parsed.data.creditLimit),
          paymentTermDays: parsed.data.paymentTermDays?.toString(),
          effectiveFrom: toDate(parsed.data.effectiveFrom),
          effectiveTo: toDate(parsed.data.effectiveTo),
        })
        .returning();
      return created;
    }
    default:
      throw new BusinessNetworkError(404, "RESOURCE_NOT_FOUND", "Business network resource not found.");
  }
}

export async function updateBusinessNetworkRecord(
  resourceInput: string,
  id: string,
  payload: unknown,
  headers: Headers
) {
  const resource = parseResource(resourceInput);
  const { companyId } = await ensureWritable(headers);

  switch (resource) {
    case "organizations": {
      const parsed = updateBusinessOrganizationSchema.safeParse(payload);
      if (!parsed.success) {
        throw new BusinessNetworkError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      const [updated] = await db
        .update(schema.businessOrganization)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(
          and(
            eq(schema.businessOrganization.id, id),
            eq(schema.businessOrganization.companyId, companyId)
          )
        )
        .returning();
      if (!updated) throw new BusinessNetworkError(404, "RECORD_NOT_FOUND", "Organization not found.");
      return updated;
    }
    case "operator-profiles": {
      const parsed = updateBusinessOperatorProfileSchema.safeParse(payload);
      if (!parsed.success) {
        throw new BusinessNetworkError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      if (parsed.data.organizationId) {
        await ensureOrganizationType(companyId, parsed.data.organizationId, ["OPERATOR", "SUPPLIER"], "INVALID_OPERATOR_ORGANIZATION");
      }
      const [updated] = await db
        .update(schema.businessOperatorProfile)
        .set({
          ...parsed.data,
          leadTimeHours:
            parsed.data.leadTimeHours !== undefined
              ? toDecimal(parsed.data.leadTimeHours) ?? undefined
              : undefined,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.businessOperatorProfile.id, id),
            eq(schema.businessOperatorProfile.companyId, companyId)
          )
        )
        .returning();
      if (!updated) throw new BusinessNetworkError(404, "RECORD_NOT_FOUND", "Operator profile not found.");
      return updated;
    }
    case "market-profiles": {
      const parsed = updateBusinessMarketProfileSchema.safeParse(payload);
      if (!parsed.success) {
        throw new BusinessNetworkError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      if (parsed.data.organizationId) {
        await ensureOrganizationType(companyId, parsed.data.organizationId, ["MARKET"], "INVALID_MARKET_ORGANIZATION");
      }
      const [updated] = await db
        .update(schema.businessMarketProfile)
        .set({
          ...parsed.data,
          creditLimit:
            parsed.data.creditLimit !== undefined ? toDecimal(parsed.data.creditLimit) : undefined,
          paymentTermDays:
            parsed.data.paymentTermDays !== undefined
              ? parsed.data.paymentTermDays?.toString()
              : undefined,
          defaultMarkupPercent:
            parsed.data.defaultMarkupPercent !== undefined
              ? toDecimal(parsed.data.defaultMarkupPercent)
              : undefined,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.businessMarketProfile.id, id),
            eq(schema.businessMarketProfile.companyId, companyId)
          )
        )
        .returning();
      if (!updated) throw new BusinessNetworkError(404, "RECORD_NOT_FOUND", "Market profile not found.");
      return updated;
    }
    case "org-members": {
      const parsed = updateBusinessOrgMemberSchema.safeParse(payload);
      if (!parsed.success) {
        throw new BusinessNetworkError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }
      if (parsed.data.organizationId) await ensureOrganization(companyId, parsed.data.organizationId);
      if (parsed.data.userId) await ensureUserInCompany(companyId, parsed.data.userId);
      const [updated] = await db
        .update(schema.businessOrgMember)
        .set(parsed.data)
        .where(
          and(
            eq(schema.businessOrgMember.id, id),
            eq(schema.businessOrgMember.companyId, companyId)
          )
        )
        .returning();
      if (!updated) throw new BusinessNetworkError(404, "RECORD_NOT_FOUND", "Org member not found.");
      return updated;
    }
    case "operator-market-contracts": {
      const parsed = updateBusinessOperatorMarketContractSchema.safeParse(payload);
      if (!parsed.success) {
        throw new BusinessNetworkError(400, "VALIDATION_ERROR", normalizeZodError(parsed.error));
      }

      const [current] = await db
        .select({
          operatorOrgId: schema.businessOperatorMarketContract.operatorOrgId,
          marketOrgId: schema.businessOperatorMarketContract.marketOrgId,
        })
        .from(schema.businessOperatorMarketContract)
        .where(
          and(
            eq(schema.businessOperatorMarketContract.id, id),
            eq(schema.businessOperatorMarketContract.companyId, companyId)
          )
        )
        .limit(1);
      if (!current) throw new BusinessNetworkError(404, "RECORD_NOT_FOUND", "Contract not found.");

      const nextOperatorOrgId = parsed.data.operatorOrgId ?? current.operatorOrgId;
      const nextMarketOrgId = parsed.data.marketOrgId ?? current.marketOrgId;
      if (nextOperatorOrgId === nextMarketOrgId) {
        throw new BusinessNetworkError(
          400,
          "INVALID_CONTRACT",
          "Operator and market organizations must be different."
        );
      }

      if (parsed.data.operatorOrgId) {
        await ensureOrganizationType(companyId, parsed.data.operatorOrgId, ["OPERATOR", "SUPPLIER"], "INVALID_OPERATOR_ORGANIZATION");
      }
      if (parsed.data.marketOrgId) {
        await ensureOrganizationType(companyId, parsed.data.marketOrgId, ["MARKET"], "INVALID_MARKET_ORGANIZATION");
      }

      const [updated] = await db
        .update(schema.businessOperatorMarketContract)
        .set({
          ...parsed.data,
          defaultMarkupPercent:
            parsed.data.defaultMarkupPercent !== undefined
              ? toDecimal(parsed.data.defaultMarkupPercent)
              : undefined,
          defaultCommissionPercent:
            parsed.data.defaultCommissionPercent !== undefined
              ? toDecimal(parsed.data.defaultCommissionPercent)
              : undefined,
          creditLimit:
            parsed.data.creditLimit !== undefined ? toDecimal(parsed.data.creditLimit) : undefined,
          paymentTermDays:
            parsed.data.paymentTermDays !== undefined
              ? parsed.data.paymentTermDays?.toString()
              : undefined,
          effectiveFrom:
            parsed.data.effectiveFrom !== undefined
              ? toDate(parsed.data.effectiveFrom)
              : undefined,
          effectiveTo:
            parsed.data.effectiveTo !== undefined
              ? toDate(parsed.data.effectiveTo)
              : undefined,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.businessOperatorMarketContract.id, id),
            eq(schema.businessOperatorMarketContract.companyId, companyId)
          )
        )
        .returning();
      if (!updated) throw new BusinessNetworkError(404, "RECORD_NOT_FOUND", "Contract not found.");
      return updated;
    }
    default:
      throw new BusinessNetworkError(404, "RESOURCE_NOT_FOUND", "Business network resource not found.");
  }
}

export async function deleteBusinessNetworkRecord(
  resourceInput: string,
  id: string,
  headers: Headers
) {
  const resource = parseResource(resourceInput);
  const { companyId } = await ensureWritable(headers);

  switch (resource) {
    case "organizations": {
      const [deleted] = await db
        .delete(schema.businessOrganization)
        .where(
          and(
            eq(schema.businessOrganization.id, id),
            eq(schema.businessOrganization.companyId, companyId)
          )
        )
        .returning({ id: schema.businessOrganization.id });
      if (!deleted) throw new BusinessNetworkError(404, "RECORD_NOT_FOUND", "Organization not found.");
      return;
    }
    case "operator-profiles": {
      const [deleted] = await db
        .delete(schema.businessOperatorProfile)
        .where(
          and(
            eq(schema.businessOperatorProfile.id, id),
            eq(schema.businessOperatorProfile.companyId, companyId)
          )
        )
        .returning({ id: schema.businessOperatorProfile.id });
      if (!deleted) throw new BusinessNetworkError(404, "RECORD_NOT_FOUND", "Operator profile not found.");
      return;
    }
    case "market-profiles": {
      const [deleted] = await db
        .delete(schema.businessMarketProfile)
        .where(
          and(
            eq(schema.businessMarketProfile.id, id),
            eq(schema.businessMarketProfile.companyId, companyId)
          )
        )
        .returning({ id: schema.businessMarketProfile.id });
      if (!deleted) throw new BusinessNetworkError(404, "RECORD_NOT_FOUND", "Market profile not found.");
      return;
    }
    case "org-members": {
      const [deleted] = await db
        .delete(schema.businessOrgMember)
        .where(
          and(
            eq(schema.businessOrgMember.id, id),
            eq(schema.businessOrgMember.companyId, companyId)
          )
        )
        .returning({ id: schema.businessOrgMember.id });
      if (!deleted) throw new BusinessNetworkError(404, "RECORD_NOT_FOUND", "Org member not found.");
      return;
    }
    case "operator-market-contracts": {
      const [deleted] = await db
        .delete(schema.businessOperatorMarketContract)
        .where(
          and(
            eq(schema.businessOperatorMarketContract.id, id),
            eq(schema.businessOperatorMarketContract.companyId, companyId)
          )
        )
        .returning({ id: schema.businessOperatorMarketContract.id });
      if (!deleted) throw new BusinessNetworkError(404, "RECORD_NOT_FOUND", "Contract not found.");
      return;
    }
    default:
      throw new BusinessNetworkError(404, "RESOURCE_NOT_FOUND", "Business network resource not found.");
  }
}

export function toBusinessNetworkErrorResponse(error: unknown) {
  if (error instanceof BusinessNetworkError) {
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
