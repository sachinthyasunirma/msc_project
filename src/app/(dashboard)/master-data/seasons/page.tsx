import { headers } from "next/headers";
import { listSeasons as listSeasonRecords } from "@/modules/season/server/season-service";
import { SeasonManagementView } from "@/modules/season/ui/views/season-management-view";

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
        startDate:
          season.startDate instanceof Date ? season.startDate.toISOString().slice(0, 10) : season.startDate,
        endDate:
          season.endDate instanceof Date ? season.endDate.toISOString().slice(0, 10) : season.endDate,
        createdAt:
          season.createdAt instanceof Date ? season.createdAt.toISOString() : season.createdAt,
        updatedAt:
          season.updatedAt instanceof Date ? season.updatedAt.toISOString() : season.updatedAt,
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
