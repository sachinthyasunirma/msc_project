import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { companyRole, companyRolePrivilege, userCompanyRole } from "@/db/schema";
import { AccessControlError, resolveAccess } from "@/lib/security/access-control";
import { clampPrivilegesToPlan } from "@/lib/security/privileges";

const updateRoleSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(300).optional().nullable(),
  isActive: z.boolean().optional(),
  privilegeCodes: z.array(z.string().trim().min(1)).max(80).optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ roleId: string }> }
) {
  try {
    const access = await resolveAccess(request.headers, { requiredPrivilege: "ROLE_MANAGE" });
    const params = await context.params;
    const payload = await request.json();
    const parsed = updateRoleSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues[0]?.message || "Invalid role payload.",
        },
        { status: 400 }
      );
    }

    const [existing] = await db
      .select({
        id: companyRole.id,
        isSystem: companyRole.isSystem,
      })
      .from(companyRole)
      .where(and(eq(companyRole.id, params.roleId), eq(companyRole.companyId, access.companyId)))
      .limit(1);
    if (!existing) {
      return NextResponse.json(
        { code: "ROLE_NOT_FOUND", message: "Role not found in your company." },
        { status: 404 }
      );
    }
    if (existing.isSystem) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "System roles cannot be modified." },
        { status: 403 }
      );
    }

    if (parsed.data.name || parsed.data.description !== undefined || parsed.data.isActive !== undefined) {
      await db
        .update(companyRole)
        .set({
          name: parsed.data.name ?? undefined,
          description: parsed.data.description ?? undefined,
          isActive: parsed.data.isActive ?? undefined,
          updatedAt: new Date(),
        })
        .where(and(eq(companyRole.id, params.roleId), eq(companyRole.companyId, access.companyId)));
    }

    if (parsed.data.privilegeCodes) {
      const allowedPrivilegeCodes = clampPrivilegesToPlan(access.plan, parsed.data.privilegeCodes);
      await db
        .delete(companyRolePrivilege)
        .where(
          and(
            eq(companyRolePrivilege.companyId, access.companyId),
            eq(companyRolePrivilege.roleId, params.roleId)
          )
        );
      if (allowedPrivilegeCodes.length > 0) {
        await db.insert(companyRolePrivilege).values(
          allowedPrivilegeCodes.map((privilegeCode) => ({
            companyId: access.companyId,
            roleId: params.roleId,
            privilegeCode,
          }))
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AccessControlError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { code: "INTERNAL_SERVER_ERROR", message: "Failed to update role." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ roleId: string }> }
) {
  try {
    const access = await resolveAccess(request.headers, { requiredPrivilege: "ROLE_MANAGE" });
    const params = await context.params;
    const [existing] = await db
      .select({
        id: companyRole.id,
        isSystem: companyRole.isSystem,
      })
      .from(companyRole)
      .where(and(eq(companyRole.id, params.roleId), eq(companyRole.companyId, access.companyId)))
      .limit(1);
    if (!existing) {
      return NextResponse.json(
        { code: "ROLE_NOT_FOUND", message: "Role not found in your company." },
        { status: 404 }
      );
    }
    if (existing.isSystem) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "System roles cannot be deleted." },
        { status: 403 }
      );
    }

    const assignedUsers = await db
      .select({ userId: userCompanyRole.userId })
      .from(userCompanyRole)
      .where(and(eq(userCompanyRole.companyId, access.companyId), eq(userCompanyRole.roleId, params.roleId)))
      .limit(1);
    if (assignedUsers.length > 0) {
      return NextResponse.json(
        {
          code: "FORBIDDEN",
          message: "Role cannot be deleted while assigned to users.",
        },
        { status: 403 }
      );
    }

    await db
      .delete(companyRole)
      .where(and(eq(companyRole.id, params.roleId), eq(companyRole.companyId, access.companyId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AccessControlError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { code: "INTERNAL_SERVER_ERROR", message: "Failed to delete role." },
      { status: 500 }
    );
  }
}
