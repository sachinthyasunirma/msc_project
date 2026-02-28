import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth";

const updateUserAccessSchema = z.object({
  role: z.enum(["ADMIN", "MANAGER", "USER"]).optional(),
  readOnly: z.boolean().optional(),
  canWriteMasterData: z.boolean().optional(),
  canWritePreTour: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "You are not authenticated." },
        { status: 401 }
      );
    }

    const currentUser = session.user as {
      id: string;
      companyId?: string | null;
      role?: string | null;
    };
    const params = await context.params;

    if (!currentUser.companyId) {
      return NextResponse.json(
        { code: "COMPANY_REQUIRED", message: "User is not linked to a company." },
        { status: 403 }
      );
    }

    const canManageUsers =
      currentUser.role === "ADMIN" || currentUser.role === "MANAGER";
    if (!canManageUsers) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "Only managers can manage user access." },
        { status: 403 }
      );
    }

    if (params.userId === currentUser.id) {
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

    if (parsed.data.role === "ADMIN" && currentUser.role !== "ADMIN") {
      return NextResponse.json(
        {
          code: "FORBIDDEN",
          message: "Only admin users can assign admin role.",
        },
        { status: 403 }
      );
    }

    const [targetUser] = await db
      .select({
        id: user.id,
        role: user.role,
      })
      .from(user)
      .where(
        and(eq(user.id, params.userId), eq(user.companyId, currentUser.companyId))
      )
      .limit(1);

    if (!targetUser) {
      return NextResponse.json(
        { code: "USER_NOT_FOUND", message: "User not found in your company." },
        { status: 404 }
      );
    }

    if (targetUser.role === "ADMIN" && currentUser.role !== "ADMIN") {
      return NextResponse.json(
        {
          code: "FORBIDDEN",
          message: "Only admin users can modify another admin.",
        },
        { status: 403 }
      );
    }

    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "No changes provided." },
        { status: 400 }
      );
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

    const nextRole = parsed.data.role ?? targetUser.role;
    if (nextRole === "ADMIN" || nextRole === "MANAGER") {
      updatePayload.readOnly = false;
      updatePayload.canWriteMasterData = true;
      updatePayload.canWritePreTour = true;
    }

    if (parsed.data.isActive === false) {
      updatePayload.isActive = false;
      updatePayload.companyId = null;
      updatePayload.role = "USER";
      updatePayload.readOnly = true;
      updatePayload.canWriteMasterData = false;
      updatePayload.canWritePreTour = false;
    }

    const [updated] = await db
      .update(user)
      .set(updatePayload)
      .where(
        and(eq(user.id, params.userId), eq(user.companyId, currentUser.companyId))
      )
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

    return NextResponse.json({ success: true, user: updated });
  } catch {
    return NextResponse.json(
      { code: "INTERNAL_SERVER_ERROR", message: "Failed to update user access." },
      { status: 500 }
    );
  }
}
