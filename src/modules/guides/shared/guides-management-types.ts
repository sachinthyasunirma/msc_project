import type { GuideResourceKey } from "@/modules/guides/shared/guides-management-config";

export type GuidesManagementInitialData = {
  resource: GuideResourceKey;
  records: Array<Record<string, unknown>>;
  guides: Array<Record<string, unknown>>;
  languages: Array<Record<string, unknown>>;
  locations: Array<Record<string, unknown>>;
  currencies: Array<Record<string, unknown>>;
};
