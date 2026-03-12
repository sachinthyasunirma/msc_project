import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { companyRole, companyRolePrivilege } from "@/db/schema";
import { AccessControlError, resolveAccess } from "@/lib/security/access-control";
import { clampPrivilegesToPlan } from "@/lib/security/privileges";

const createRoleSchema = z.object({
  code: z.string().trim().toUpperCase().min(2).max(40),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300).optional().nullable(),
  privilegeCodes: z.array(z.string().trim().min(1)).max(80).default([]),
});

export async function POST(request: Request) {
  try {
    const access = await resolveAccess(request.headers, { requiredPrivilege: "ROLE_MANAGE" });
    const payload = await request.json();
    const parsed = createRoleSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues[0]?.message || "Invalid role payload.",
        },
        { status: 400 }
      );
    }

    const allowedPrivilegeCodes = clampPrivilegesToPlan(access.plan, parsed.data.privilegeCodes);

    const [created] = await db
      .insert(companyRole)
      .values({
        companyId: access.companyId,
        code: parsed.data.code,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        isSystem: false,
      })
      .returning({
        id: companyRole.id,
        code: companyRole.code,
        name: companyRole.name,
      });

    if (allowedPrivilegeCodes.length > 0) {
      await db.insert(companyRolePrivilege).values(
        allowedPrivilegeCodes.map((privilegeCode) => ({
          companyId: access.companyId,
          roleId: created.id,
          privilegeCode,
        }))
      );
    }

    return NextResponse.json({ success: true, role: created }, { status: 201 });
  } catch (error) {
    if (error instanceof AccessControlError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: error.status }
      );
    }
    if (error instanceof Error && error.message.toLowerCase().includes("duplicate key")) {
      return NextResponse.json(
        {
          code: "DUPLICATE_RECORD",
          message: "Role code already exists in your company.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { code: "INTERNAL_SERVER_ERROR", message: "Failed to create company role." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const access = await resolveAccess(request.headers, {
      requiredPrivilege: "SCREEN_CONFIGURATION_COMPANY",
    });
    const roles = await db
      .select({
        id: companyRole.id,
        code: companyRole.code,
        name: companyRole.name,
        description: companyRole.description,
        isSystem: companyRole.isSystem,
        isActive: companyRole.isActive,
      })
      .from(companyRole)
      .where(eq(companyRole.companyId, access.companyId));

    const rolePrivileges = await db
      .select({
        roleId: companyRolePrivilege.roleId,
        privilegeCode: companyRolePrivilege.privilegeCode,
      })
      .from(companyRolePrivilege)
      .where(eq(companyRolePrivilege.companyId, access.companyId));

    return NextResponse.json({ roles, rolePrivileges });
  } catch (error) {
    if (error instanceof AccessControlError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { code: "INTERNAL_SERVER_ERROR", message: "Failed to load roles." },
      { status: 500 }
    );
  }
}
