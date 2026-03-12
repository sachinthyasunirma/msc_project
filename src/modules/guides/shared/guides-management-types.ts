import type { GuideResourceKey } from "@/modules/guides/ui/components/guides-management-section";

export type GuidesManagementInitialData = {
  resource: GuideResourceKey;
  records: Array<Record<string, unknown>>;
  guides: Array<Record<string, unknown>>;
  languages: Array<Record<string, unknown>>;
  locations: Array<Record<string, unknown>>;
  currencies: Array<Record<string, unknown>>;
};
