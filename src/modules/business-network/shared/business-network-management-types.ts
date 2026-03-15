import type { BusinessNetworkResourceKey } from "@/modules/business-network/shared/business-network-management-config";

export type BusinessNetworkManagementInitialData = {
  resource: BusinessNetworkResourceKey;
  records: Array<Record<string, unknown>>;
  organizations: Array<Record<string, unknown>>;
  users: Array<Record<string, unknown>>;
  currencies: Array<Record<string, unknown>>;
};
