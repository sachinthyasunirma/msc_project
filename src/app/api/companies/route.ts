import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { company } from "@/db/schema";

const createCompanySchema = z.object({
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email(),
  country: z.string().trim().max(120).optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = createCompanySchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues[0]?.message || "Invalid company payload.",
        },
        { status: 400 }
      );
    }

    const [existing] = await db
      .select({ id: company.id })
      .from(company)
      .where(eq(company.email, parsed.data.email))
      .limit(1);

    if (existing) {
      return NextResponse.json(existing);
    }

    const [created] = await db
      .insert(company)
      .values({
        name: parsed.data.name,
        email: parsed.data.email,
        country: parsed.data.country ?? null,
      })
      .returning({ id: company.id });

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json(
      { code: "INTERNAL_SERVER_ERROR", message: "Failed to create company." },
      { status: 500 }
    );
  }
}
