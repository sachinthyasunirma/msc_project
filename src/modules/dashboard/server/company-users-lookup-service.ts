import { and, asc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { AccessControlError, resolveAccess } from "@/lib/security/access-control";

export async function listCompanyUsersLookup(
  headers: Headers,
  options?: { limit?: number; q?: string }
) {
  try {
    const access = await resolveAccess(headers, {
      requiredPrivilege: "SCREEN_CONFIGURATION_COMPANY",
    });

    return db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(
        and(
          eq(user.companyId, access.companyId),
          options?.q
            ? or(
                ilike(user.name, `%${options.q}%`),
                ilike(user.email, `%${options.q}%`)
              )
            : undefined
        )
      )
      .orderBy(asc(user.createdAt))
      .limit(options?.limit ?? 100);
  } catch (error) {
    if (error instanceof AccessControlError) {
      return [];
    }
    throw error;
  }
}
