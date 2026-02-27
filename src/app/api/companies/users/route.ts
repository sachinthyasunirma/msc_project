import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { company, user } from "@/db/schema";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
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
      readOnly?: boolean;
    };

    if (!currentUser.companyId) {
      return NextResponse.json(
        { code: "COMPANY_REQUIRED", message: "User is not linked to a company." },
        { status: 403 }
      );
    }

    const [companyRecord] = await db
      .select({
        id: company.id,
        code: company.code,
        name: company.name,
        joinSecretCode: company.joinSecretCode,
        managerPrivilegeCode: company.managerPrivilegeCode,
      })
      .from(company)
      .where(eq(company.id, currentUser.companyId))
      .limit(1);

    if (!companyRecord) {
      return NextResponse.json(
        { code: "COMPANY_NOT_FOUND", message: "Company not found." },
        { status: 404 }
      );
    }

    const users = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        readOnly: user.readOnly,
        isActive: user.isActive,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(eq(user.companyId, currentUser.companyId))
      .orderBy(user.createdAt);

    return NextResponse.json({
      company: companyRecord,
      currentUserId: currentUser.id,
      currentUserRole: currentUser.role ?? "USER",
      currentUserReadOnly: Boolean(currentUser.readOnly),
      users,
      roles: ["ADMIN", "MANAGER", "USER"] as const,
    });
  } catch {
    return NextResponse.json(
      { code: "INTERNAL_SERVER_ERROR", message: "Failed to load company users." },
      { status: 500 }
    );
  }
}
