import { NextResponse } from "next/server";
import {
  createSeason,
  listSeasons,
  toSeasonErrorResponse,
} from "@/modules/season/server/season-service";

export async function GET(request: Request) {
  try {
    const seasons = await listSeasons(new URL(request.url).searchParams, request.headers);
    return NextResponse.json(seasons);
  } catch (error) {
    const formatted = toSeasonErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const season = await createSeason(payload, request.headers);
    return NextResponse.json(season, { status: 201 });
  } catch (error) {
    const formatted = toSeasonErrorResponse(error);
    return NextResponse.json(formatted.body, { status: formatted.status });
  }
}
