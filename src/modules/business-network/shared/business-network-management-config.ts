export const BUSINESS_NETWORK_RESOURCE_KEYS = [
  "organizations",
  "operator-profiles",
  "market-profiles",
  "org-members",
  "operator-market-contracts",
] as const;

export type BusinessNetworkResourceKey = (typeof BUSINESS_NETWORK_RESOURCE_KEYS)[number];
