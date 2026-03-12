import type { Row } from "@/modules/pre-tour/shared/pre-tour-management-types";

export type PreTourDayInitializationResult = {
  planId: string;
  expectedDayCount: number;
  existingDayCount: number;
  createdCount: number;
  createdDayNumbers: number[];
  days: Row[];
};
