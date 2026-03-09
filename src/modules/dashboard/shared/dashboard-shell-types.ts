export type DashboardViewer = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: "ADMIN" | "MANAGER" | "USER" | null;
  readOnly: boolean;
  canWriteMasterData: boolean;
  canWritePreTour: boolean;
};

export type DashboardCompany = {
  id: string;
  code: string;
  joinSecretCode: string | null;
  managerPrivilegeCode: string | null;
  name: string;
  email: string;
  baseCurrencyCode: string;
  transportRateBasis: "VEHICLE_CATEGORY" | "VEHICLE_TYPE";
  helpEnabled: boolean;
  subscriptionPlan: "STARTER" | "GROWTH" | "ENTERPRISE" | null;
  subscriptionStatus: "PENDING" | "ACTIVE" | "TRIAL" | "EXPIRED" | "CANCELED";
  subscriptionStartsAt: string | null;
  subscriptionEndsAt: string | null;
  country: string | null;
  image: string | null;
};

export type DashboardAccess = {
  companyId: string;
  role: "ADMIN" | "MANAGER" | "USER";
  readOnly: boolean;
  canWriteMasterData: boolean;
  canWritePreTour: boolean;
  plan: "STARTER" | "GROWTH" | "ENTERPRISE";
  subscriptionStatus: "PENDING" | "ACTIVE" | "TRIAL" | "EXPIRED" | "CANCELED";
  subscriptionEndsAt: string | null;
  subscriptionLimited: boolean;
  privileges: string[];
};

export type DashboardShellData = {
  viewer: DashboardViewer | null;
  company: DashboardCompany | null;
  access: DashboardAccess | null;
  needsSetup: boolean;
  accessErrorCode: string | null;
  accessErrorMessage: string | null;
};
