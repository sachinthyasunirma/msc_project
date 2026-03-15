import { count, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { company, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import {
  AccessControlError,
  assignSystemRoleToUser,
  ensureCompanyDefaultRoles,
  resolveAccess,
} from "@/lib/security/access-control";
import { APP_PLANS, getPlanUserLimit } from "@/lib/security/privileges";

const SUBSCRIPTION_DURATIONS = ["QUARTERLY", "YEARLY"] as const;

const updateCompanySchema = z
  .object({
    joinExisting: z.boolean().optional().default(false),
    secretCode: z.string().trim().toUpperCase().min(1).max(40),
    privilegeCode: z
      .string()
      .trim()
      .toUpperCase()
      .min(1)
      .max(40)
      .optional()
      .nullable(),
    code: z.string().trim().toUpperCase().min(1).max(40).optional(),
    name: z.string().trim().min(2).max(160).optional(),
    email: z.string().trim().email().optional(),
    baseCurrencyCode: z.string().trim().toUpperCase().min(3).max(10).optional(),
    transportRateBasis: z.enum(["VEHICLE_CATEGORY", "VEHICLE_TYPE"]).optional(),
    helpEnabled: z.boolean().optional(),
    subscriptionPlan: z.enum(APP_PLANS).optional(),
    subscriptionDuration: z.enum(SUBSCRIPTION_DURATIONS).optional(),
    country: z.string().trim().max(120).optional().nullable(),
    image: z.string().trim().min(1).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.joinExisting) return;
    if (!data.code) {
      ctx.addIssue({
        path: ["code"],
        code: z.ZodIssueCode.custom,
        message: "Company code is required.",
      });
    }
    if (!data.name) {
      ctx.addIssue({
        path: ["name"],
        code: z.ZodIssueCode.custom,
        message: "Company name is required.",
      });
    }
    if (!data.email) {
      ctx.addIssue({
        path: ["email"],
        code: z.ZodIssueCode.custom,
        message: "Company email is required.",
      });
    }
  });

function isCompanyConfigured(record: {
  code: string | null;
  joinSecretCode: string | null;
  name: string | null;
  email: string | null;
  image: string | null;
}) {
  return Boolean(record.code && record.joinSecretCode && record.name && record.email);
}

function generateSecret(prefix: string) {
  const random = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `${prefix}-${random}`;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "You are not authenticated." },
        { status: 401 }
      );
    }

    const companyId = (session.user as { companyId?: string | null }).companyId;
    if (!companyId) {
      return NextResponse.json({ company: null, needsSetup: true });
    }

    const [record] = await db
      .select({
        id: company.id,
        code: company.code,
        joinSecretCode: company.joinSecretCode,
        managerPrivilegeCode: company.managerPrivilegeCode,
        name: company.name,
        email: company.email,
        baseCurrencyCode: company.baseCurrencyCode,
        transportRateBasis: company.transportRateBasis,
        helpEnabled: company.helpEnabled,
        subscriptionPlan: company.subscriptionPlan,
        subscriptionStatus: company.subscriptionStatus,
        subscriptionStartsAt: company.subscriptionStartsAt,
        subscriptionEndsAt: company.subscriptionEndsAt,
        country: company.country,
        image: company.image,
      })
      .from(company)
      .where(eq(company.id, companyId))
      .limit(1);

    if (!record) {
      return NextResponse.json({ company: null, needsSetup: true });
    }

    return NextResponse.json({
      company: record,
      needsSetup: !isCompanyConfigured(record),
    });
  } catch {
    return NextResponse.json(
      { code: "INTERNAL_SERVER_ERROR", message: "Failed to load company settings." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "You are not authenticated." },
        { status: 401 }
      );
    }

    const payload = await request.json();
    const parsed = updateCompanySchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues[0]?.message || "Invalid company payload.",
        },
        { status: 400 }
      );
    }

    const currentCompanyId = (session.user as { companyId?: string | null }).companyId;
    if (currentCompanyId) {
      const requiredPrivilege = parsed.data.subscriptionPlan
        ? "SUBSCRIPTION_MANAGE"
        : "COMPANY_SETTINGS_MANAGE";
      const access = await resolveAccess(request.headers, {
        requiredPrivilege,
      });
      if (!parsed.data.code || !parsed.data.name || !parsed.data.email) {
        return NextResponse.json(
          {
            code: "VALIDATION_ERROR",
            message: "Company code, name and email are required.",
          },
          { status: 400 }
        );
      }
      if (parsed.data.subscriptionPlan && access.role !== "ADMIN") {
        return NextResponse.json(
          { code: "FORBIDDEN", message: "Only admin users can change subscription plan." },
          { status: 403 }
        );
      }

      const selectedDuration = parsed.data.subscriptionDuration ?? "YEARLY";
      const durationDays = selectedDuration === "QUARTERLY" ? 90 : 365;
      const nextSubscriptionStart = parsed.data.subscriptionPlan ? new Date() : undefined;
      const nextSubscriptionEnd = parsed.data.subscriptionPlan
        ? addDays(nextSubscriptionStart!, durationDays)
        : undefined;

      const [updated] = await db
        .update(company)
        .set({
          code: parsed.data.code!,
          joinSecretCode: parsed.data.secretCode,
          managerPrivilegeCode: parsed.data.privilegeCode ?? null,
          name: parsed.data.name!,
          email: parsed.data.email!,
          baseCurrencyCode: parsed.data.baseCurrencyCode ?? "USD",
          transportRateBasis: parsed.data.transportRateBasis ?? undefined,
          helpEnabled: parsed.data.helpEnabled ?? true,
          subscriptionPlan: parsed.data.subscriptionPlan ?? undefined,
          subscriptionStatus: parsed.data.subscriptionPlan ? "ACTIVE" : undefined,
          subscriptionStartsAt: nextSubscriptionStart,
          subscriptionEndsAt: nextSubscriptionEnd,
          country: parsed.data.country ?? null,
          image: parsed.data.image ?? null,
          updatedAt: new Date(),
        })
        .where(eq(company.id, currentCompanyId))
        .returning({ id: company.id });

      if (!updated) {
        return NextResponse.json(
          { code: "COMPANY_NOT_FOUND", message: "Company not found." },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, companyId: updated.id });
    }

    if (parsed.data.joinExisting) {
      const [existingCompany] = await db
        .select({
          id: company.id,
          managerPrivilegeCode: company.managerPrivilegeCode,
          subscriptionPlan: company.subscriptionPlan,
          subscriptionStatus: company.subscriptionStatus,
          subscriptionEndsAt: company.subscriptionEndsAt,
        })
        .from(company)
        .where(eq(company.joinSecretCode, parsed.data.secretCode))
        .limit(1);

      if (!existingCompany) {
        return NextResponse.json(
          { code: "COMPANY_NOT_FOUND", message: "Secret code not found." },
          { status: 404 }
        );
      }

      const [companyUserCount] = await db
        .select({ count: count() })
        .from(user)
        .where(eq(user.companyId, existingCompany.id));
      const nextUserCount = Number(companyUserCount?.count ?? 0) + 1;
      const userLimit = getPlanUserLimit(existingCompany.subscriptionPlan);
      if (nextUserCount > userLimit) {
        return NextResponse.json(
          {
            code: "USER_LIMIT_REACHED",
            message: `This company has reached its subscription user limit (${userLimit}). Please upgrade the plan or remove a user.`,
          },
          { status: 409 }
        );
      }

      const canBeManager =
        parsed.data.privilegeCode &&
        existingCompany.managerPrivilegeCode &&
        parsed.data.privilegeCode === existingCompany.managerPrivilegeCode;

      await db
        .update(user)
        .set({
          companyId: existingCompany.id,
          role: canBeManager ? "MANAGER" : "USER",
          readOnly: canBeManager ? false : true,
          canWriteMasterData: canBeManager ? true : false,
          canWritePreTour: canBeManager ? true : false,
          updatedAt: new Date(),
        })
        .where(eq(user.id, session.user.id));
      await assignSystemRoleToUser(existingCompany.id, session.user.id, canBeManager ? "MANAGER" : "USER");

      return NextResponse.json({
        success: true,
        joined: true,
        companyId: existingCompany.id,
        role: canBeManager ? "MANAGER" : "USER",
      });
    }

    const managerPrivilegeCode = parsed.data.privilegeCode || generateSecret("MGR");
    const [created] = await db
      .insert(company)
      .values({
        code: parsed.data.code!,
        joinSecretCode: parsed.data.secretCode,
        managerPrivilegeCode,
        name: parsed.data.name!,
        email: parsed.data.email!,
        baseCurrencyCode: parsed.data.baseCurrencyCode ?? "USD",
        transportRateBasis: parsed.data.transportRateBasis ?? "VEHICLE_TYPE",
        helpEnabled: parsed.data.helpEnabled ?? true,
        country: parsed.data.country ?? null,
        image: parsed.data.image ?? null,
        subscriptionPlan: null,
        subscriptionStatus: "PENDING",
        subscriptionStartsAt: null,
        subscriptionEndsAt: null,
      })
      .returning({ id: company.id });

    await db
      .update(user)
      .set({
        companyId: created.id,
        role: "ADMIN",
        readOnly: false,
        canWriteMasterData: true,
        canWritePreTour: true,
        updatedAt: new Date(),
      })
      .where(eq(user.id, session.user.id));
    await ensureCompanyDefaultRoles(created.id);
    await assignSystemRoleToUser(created.id, session.user.id, "ADMIN");

    return NextResponse.json({ success: true, companyId: created.id });
  } catch (error) {
    if (error instanceof AccessControlError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: error.status }
      );
    }
    if (error instanceof Error && error.message.toLowerCase().includes("duplicate key")) {
      return NextResponse.json(
        { code: "DUPLICATE_RECORD", message: "Company code or email already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { code: "INTERNAL_SERVER_ERROR", message: "Failed to save company settings." },
      { status: 500 }
    );
  }
}
