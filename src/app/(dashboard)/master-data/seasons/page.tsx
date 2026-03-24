import { headers } from "next/headers";
import { listSeasons as listSeasonRecords } from "@/modules/season/server/season-service";
import { SeasonManagementView } from "@/modules/season/ui/views/season-management-view";

function serializeDateValue(
  value: unknown,
  mode: "date" | "datetime",
  fallback?: string
) {
  if (value instanceof Date) {
    return mode === "date" ? value.toISOString().slice(0, 10) : value.toISOString();
  }
  if (typeof value === "string") {
    return value;
  }
  return fallback ?? "";
}

async function loadInitialSeasons() {
  try {
    const requestHeaders = await headers();
    const result = await listSeasonRecords(
      new URLSearchParams({ limit: "20" }),
      requestHeaders
    );
    return {
      ...result,
      items: result.items.map((season) => ({
        ...season,
        startDate: serializeDateValue(season.startDate, "date"),
        endDate: serializeDateValue(season.endDate, "date"),
        createdAt: serializeDateValue(season.createdAt, "datetime", undefined),
        updatedAt: serializeDateValue(season.updatedAt, "datetime", undefined),
      })),
    };
  } catch {
    return null;
  }
}

const SeasonsPage = async () => {
  const initialSeasons = await loadInitialSeasons();

  return (
    <div className="p-4 md:p-6">
      <SeasonManagementView initialSeasons={initialSeasons} />
    </div>
  );
};

export default SeasonsPage;
