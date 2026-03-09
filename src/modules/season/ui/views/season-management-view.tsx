"use client";

import { useDashboardAccessState } from "@/modules/dashboard/ui/components/dashboard-shell-provider";
import type { SeasonListResponse } from "@/modules/season/lib/season-api";
import { SeasonManagementSection } from "@/modules/season/ui/components/season-management-section";

type Props = {
  initialSeasons?: SeasonListResponse | null;
};

export const SeasonManagementView = ({ initialSeasons = null }: Props) => {
  const { isReadOnly } = useDashboardAccessState();

  return <SeasonManagementSection isReadOnly={isReadOnly} initialSeasons={initialSeasons} />;
};
