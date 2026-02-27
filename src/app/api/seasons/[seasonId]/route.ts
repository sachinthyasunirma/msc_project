import { NextResponse } from "next/server";
import {
  deleteSeason,
  toSeasonErrorResponse,
  updateSeason,
} from "@/modules/season/server/season-service";

type RouteContext = {
  params: Promise<{ seasonId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { seasonId } = await context.params;
    const payload = await request.json();
    const season = await updateSeason(seasonId, payload, request.headers);
    return NextResponse.json(season);
  } catch (error) {
    const formatted = toSeasonErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { seasonId } = await context.params;
    await deleteSeason(seasonId, request.headers);
    return NextResponse.json({ success: true });
  } catch (error) {
    const formatted = toSeasonErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}
