export type CompanyRole = "ADMIN" | "MANAGER" | "USER";
export type CompanyPlan = "STARTER" | "GROWTH" | "ENTERPRISE";
export type TransportRateBasis = "VEHICLE_CATEGORY" | "VEHICLE_TYPE";

export type CurrencyOption = {
  code: string;
  name: string;
};

export type CompanyUsersResponse = {
  company: {
    id: string;
    code: string;
    name: string;
    email: string;
    baseCurrencyCode: string;
    transportRateBasis: TransportRateBasis;
    helpEnabled: boolean;
    joinSecretCode: string | null;
    managerPrivilegeCode: string | null;
    subscriptionPlan: CompanyPlan | null;
    subscriptionStatus: "PENDING" | "ACTIVE" | "TRIAL" | "EXPIRED" | "CANCELED";
  };
  userCount: number;
  userLimit: number;
  currentUserId: string;
  currentUserRole: CompanyRole;
  currentUserReadOnly: boolean;
  currentUserPrivileges: string[];
  users: Array<{
    id: string;
    name: string;
    email: string;
    image: string | null;
    role: CompanyRole;
    readOnly: boolean;
    canWriteMasterData: boolean;
    canWritePreTour: boolean;
    isActive: boolean;
    createdAt: string;
  }>;
  customRoles: Array<{
    id: string;
    code: string;
    name: string;
    description: string | null;
    isSystem: boolean;
    isActive: boolean;
  }>;
  userRoleAssignments: Array<{ userId: string; roleId: string }>;
  rolePrivileges: Array<{ roleId: string; privilegeCode: string }>;
  availablePrivileges: Array<{
    code: string;
    name: string;
    description: string;
    minPlan: CompanyPlan;
  }>;
};

export type CompanyConfigurationInitialData = {
  payload: CompanyUsersResponse;
  currencyOptions: CurrencyOption[];
};
