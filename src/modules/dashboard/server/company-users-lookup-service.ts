import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { AccessControlError, resolveAccess } from "@/lib/security/access-control";

export async function listCompanyUsersLookup(headers: Headers) {
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
      .where(eq(user.companyId, access.companyId))
      .orderBy(asc(user.createdAt));
  } catch (error) {
    if (error instanceof AccessControlError) {
      return [];
    }
    throw error;
  }
}
