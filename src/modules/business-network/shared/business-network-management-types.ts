import type { BusinessNetworkResourceKey } from "@/modules/business-network/ui/views/business-network-management-view-impl";

export type BusinessNetworkManagementInitialData = {
  resource: BusinessNetworkResourceKey;
  records: Array<Record<string, unknown>>;
  organizations: Array<Record<string, unknown>>;
  users: Array<Record<string, unknown>>;
  currencies: Array<Record<string, unknown>>;
};
