import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { AccessControlError, resolveAccess } from "@/lib/security/access-control";
import type { PreTourCategoryLookups } from "@/modules/pre-tour/shared/pre-tour-master-types";

class PreTourCategoryLookupError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

const preTourCategoryLookupQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(500),
});

function normalizeZodError(error: z.ZodError) {
  return error.issues[0]?.message || "Validation failed.";
}

async function getAccess(headers: Headers) {
  try {
    return await resolveAccess(headers, {
      requiredPrivilege: "SCREEN_PRE_TOURS",
    });
  } catch (error) {
    if (error instanceof AccessControlError) {
      throw new PreTourCategoryLookupError(error.status, error.code, error.message);
    }
    throw error;
  }
}

export async function listPreTourCategoryLookups(
  input: URLSearchParams | Record<string, unknown> | undefined,
  headers: Headers
): Promise<PreTourCategoryLookups> {
  const parsed = preTourCategoryLookupQuerySchema.safeParse(
    input instanceof URLSearchParams ? Object.fromEntries(input) : input ?? {}
  );
  if (!parsed.success) {
    throw new PreTourCategoryLookupError(
      400,
      "VALIDATION_ERROR",
      normalizeZodError(parsed.error)
    );
  }

  const { companyId } = await getAccess(headers);
  const { limit } = parsed.data;

  const [tourCategoryTypes, tourCategories, tourCategoryRules] = await Promise.all([
    db
      .select()
      .from(schema.tourCategoryType)
      .where(eq(schema.tourCategoryType.companyId, companyId))
      .orderBy(schema.tourCategoryType.sortOrder, desc(schema.tourCategoryType.createdAt))
      .limit(limit),
    db
      .select()
      .from(schema.tourCategory)
      .where(eq(schema.tourCategory.companyId, companyId))
      .orderBy(schema.tourCategory.sortOrder, desc(schema.tourCategory.createdAt))
      .limit(limit),
    db
      .select()
      .from(schema.tourCategoryRule)
      .where(eq(schema.tourCategoryRule.companyId, companyId))
      .orderBy(desc(schema.tourCategoryRule.createdAt))
      .limit(limit),
  ]);

  return {
    tourCategoryTypes,
    tourCategories,
    tourCategoryRules,
  };
}

export function toPreTourCategoryLookupErrorResponse(error: unknown) {
  if (error instanceof PreTourCategoryLookupError) {
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
      message: "Failed to load pre-tour category lookups.",
    },
  };
}
