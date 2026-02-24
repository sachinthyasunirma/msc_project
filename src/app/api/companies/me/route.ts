import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { company, user } from "@/db/schema";
import { auth } from "@/lib/auth";

const updateCompanySchema = z.object({
  code: z.string().trim().toUpperCase().min(1).max(40),
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email(),
  country: z.string().trim().max(120).optional().nullable(),
  image: z.string().trim().min(1).optional().nullable(),
});

function isCompanyConfigured(record: {
  code: string | null;
  name: string | null;
  email: string | null;
  image: string | null;
}) {
  return Boolean(record.code && record.name && record.email);
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
        name: company.name,
        email: company.email,
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
      const [updated] = await db
        .update(company)
        .set({
          code: parsed.data.code,
          name: parsed.data.name,
          email: parsed.data.email,
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

      return NextResponse.json({ success: true });
    }

    const [created] = await db
      .insert(company)
      .values({
        code: parsed.data.code,
        name: parsed.data.name,
        email: parsed.data.email,
        country: parsed.data.country ?? null,
        image: parsed.data.image ?? null,
      })
      .returning({ id: company.id });

    await db
      .update(user)
      .set({ companyId: created.id, updatedAt: new Date() })
      .where(eq(user.id, session.user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
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
