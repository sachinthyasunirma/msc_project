import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { companyRole, user, userCompanyRole } from "@/db/schema";
import {
  AccessControlError,
  assignSystemRoleToUser,
  resolveAccess,
} from "@/lib/security/access-control";

const updateUserAccessSchema = z.object({
  role: z.enum(["ADMIN", "MANAGER", "USER"]).optional(),
  roleIds: z.array(z.string().trim().min(1)).max(25).optional(),
  readOnly: z.boolean().optional(),
  canWriteMasterData: z.boolean().optional(),
  canWritePreTour: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

async function ensureRoleIdsBelongToCompany(companyId: string, roleIds: string[]) {
  if (roleIds.length === 0) return [];
  const rows = await db
    .select({
      id: companyRole.id,
      code: companyRole.code,
      isActive: companyRole.isActive,
    })
    .from(companyRole)
    .where(and(eq(companyRole.companyId, companyId), inArray(companyRole.id, roleIds)));
  if (rows.length !== roleIds.length) {
    throw new AccessControlError(
      400,
      "VALIDATION_ERROR",
      "One or more selected roles are invalid for this company."
    );
  }
  const inactive = rows.find((row) => !row.isActive);
  if (inactive) {
    throw new AccessControlError(400, "VALIDATION_ERROR", "Inactive roles cannot be assigned.");
  }
  return rows;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const access = await resolveAccess(request.headers, {
      requiredPrivilege: "COMPANY_USERS_MANAGE",
    });
    const params = await context.params;
    if (params.userId === access.userId) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "You cannot change your own access." },
        { status: 403 }
      );
    }

    const payload = await request.json();
    const parsed = updateUserAccessSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues[0]?.message || "Invalid user access payload.",
        },
        { status: 400 }
      );
    }
    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "No changes provided." },
        { status: 400 }
      );
    }

    const [targetUser] = await db
      .select({
        id: user.id,
        role: user.role,
        isActive: user.isActive,
      })
      .from(user)
      .where(and(eq(user.id, params.userId), eq(user.companyId, access.companyId)))
      .limit(1);

    if (!targetUser) {
      return NextResponse.json(
        { code: "USER_NOT_FOUND", message: "User not found in your company." },
        { status: 404 }
      );
    }

    if (targetUser.role === "ADMIN" && access.role !== "ADMIN") {
      return NextResponse.json(
        {
          code: "FORBIDDEN",
          message: "Only admin users can modify another admin.",
        },
        { status: 403 }
      );
    }
    if (parsed.data.role === "ADMIN" && access.role !== "ADMIN") {
      return NextResponse.json(
        {
          code: "FORBIDDEN",
          message: "Only admin users can assign admin role.",
        },
        { status: 403 }
      );
    }

    const nextRole = parsed.data.role ?? targetUser.role;
    const nextIsActive = parsed.data.isActive ?? targetUser.isActive;
    const demotingAdmin =
      targetUser.role === "ADMIN" && (!nextIsActive || nextRole !== "ADMIN");
    if (demotingAdmin) {
      const activeAdmins = await db
        .select({ id: user.id })
        .from(user)
        .where(
          and(eq(user.companyId, access.companyId), eq(user.role, "ADMIN"), eq(user.isActive, true))
        );
      if (activeAdmins.length <= 1) {
        return NextResponse.json(
          {
            code: "FORBIDDEN",
            message: "Cannot demote or deactivate the last active admin user.",
          },
          { status: 403 }
        );
      }
    }

    if (parsed.data.roleIds && parsed.data.roleIds.length > 0) {
      const selectedRoles = await ensureRoleIdsBelongToCompany(access.companyId, parsed.data.roleIds);
      if (
        selectedRoles.some((row) => row.code === "SYS_ADMIN") &&
        access.role !== "ADMIN"
      ) {
        return NextResponse.json(
          { code: "FORBIDDEN", message: "Only admin users can assign admin role." },
          { status: 403 }
        );
      }
    }

    const updatePayload: {
      role?: "ADMIN" | "MANAGER" | "USER";
      readOnly?: boolean;
      canWriteMasterData?: boolean;
      canWritePreTour?: boolean;
      isActive?: boolean;
      companyId?: string | null;
      updatedAt: Date;
    } = {
      ...parsed.data,
      updatedAt: new Date(),
    };

    if (nextRole === "ADMIN" || nextRole === "MANAGER") {
      updatePayload.readOnly = false;
      updatePayload.canWriteMasterData = true;
      updatePayload.canWritePreTour = true;
    }
    if (parsed.data.isActive === false) {
      updatePayload.isActive = false;
      updatePayload.role = "USER";
      updatePayload.readOnly = true;
      updatePayload.canWriteMasterData = false;
      updatePayload.canWritePreTour = false;
    }

    const [updated] = await db
      .update(user)
      .set(updatePayload)
      .where(and(eq(user.id, params.userId), eq(user.companyId, access.companyId)))
      .returning({
        id: user.id,
        role: user.role,
        readOnly: user.readOnly,
        canWriteMasterData: user.canWriteMasterData,
        canWritePreTour: user.canWritePreTour,
        isActive: user.isActive,
        companyId: user.companyId,
      });

    if (!updated) {
      return NextResponse.json(
        { code: "USER_NOT_FOUND", message: "User not found in your company." },
        { status: 404 }
      );
    }

    if (parsed.data.isActive === false) {
      await db
        .delete(userCompanyRole)
        .where(
          and(
            eq(userCompanyRole.companyId, access.companyId),
            eq(userCompanyRole.userId, params.userId)
          )
        );
    } else if (parsed.data.roleIds) {
      await db
        .delete(userCompanyRole)
        .where(
          and(
            eq(userCompanyRole.companyId, access.companyId),
            eq(userCompanyRole.userId, params.userId)
          )
        );
      if (parsed.data.roleIds.length > 0) {
        await db.insert(userCompanyRole).values(
          parsed.data.roleIds.map((roleId) => ({
            companyId: access.companyId,
            userId: params.userId,
            roleId,
          }))
        );
      }
    } else if (parsed.data.role) {
      await assignSystemRoleToUser(access.companyId, params.userId, parsed.data.role);
    }

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    if (error instanceof AccessControlError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { code: "INTERNAL_SERVER_ERROR", message: "Failed to update user access." },
      { status: 500 }
    );
  }
}
