export const APP_PLANS = ["STARTER", "GROWTH", "ENTERPRISE"] as const;
export type AppPlan = (typeof APP_PLANS)[number];
export const PLAN_USER_LIMITS: Record<AppPlan, number> = {
  STARTER: 10,
  GROWTH: 25,
  ENTERPRISE: 40,
};

export const APP_PRIVILEGES = [
  "NAV_DASHBOARD",
  "NAV_MASTER_DATA",
  "NAV_TOURS",
  "NAV_CONFIGURATION",
  "NAV_BIN",
  "SCREEN_MASTER_ACCOMMODATIONS",
  "SCREEN_MASTER_SEASONS",
  "SCREEN_MASTER_ACTIVITIES",
  "SCREEN_MASTER_TRANSPORTS",
  "SCREEN_MASTER_GUIDES",
  "SCREEN_MASTER_CURRENCIES",
  "SCREEN_MASTER_TAXES",
  "SCREEN_MASTER_TOUR_CATEGORIES",
  "SCREEN_MASTER_BUSINESS_NETWORK",
  "SCREEN_PRE_TOURS",
  "PRE_TOUR_MAP",
  "PRE_TOUR_COSTING",
  "SCREEN_TECHNICAL_VISITS",
  "SCREEN_CONFIGURATION_COMPANY",
  "SCREEN_BIN",
  "MASTER_DATA_WRITE",
  "PRE_TOUR_WRITE",
  "COMPANY_SETTINGS_MANAGE",
  "COMPANY_USERS_MANAGE",
  "ROLE_MANAGE",
  "SUBSCRIPTION_MANAGE",
] as const;

export type AppPrivilegeCode = (typeof APP_PRIVILEGES)[number];

export type PrivilegeDefinition = {
  code: AppPrivilegeCode;
  name: string;
  description: string;
  minPlan: AppPlan;
};

export const PRIVILEGE_DEFINITIONS: PrivilegeDefinition[] = [
  {
    code: "NAV_DASHBOARD",
    name: "Dashboard Navigation",
    description: "Access the dashboard menu and home view.",
    minPlan: "STARTER",
  },
  {
    code: "NAV_MASTER_DATA",
    name: "Master Data Navigation",
    description: "Access the master data navigation section.",
    minPlan: "STARTER",
  },
  {
    code: "NAV_TOURS",
    name: "Tours Navigation",
    description: "Access the tours navigation section.",
    minPlan: "STARTER",
  },
  {
    code: "NAV_CONFIGURATION",
    name: "Configuration Navigation",
    description: "Access the configuration navigation section.",
    minPlan: "STARTER",
  },
  {
    code: "NAV_BIN",
    name: "Bin Navigation",
    description: "Access the bin navigation item.",
    minPlan: "STARTER",
  },
  {
    code: "SCREEN_MASTER_ACCOMMODATIONS",
    name: "Accommodations Screen",
    description: "View accommodations management screen.",
    minPlan: "STARTER",
  },
  {
    code: "SCREEN_MASTER_SEASONS",
    name: "Seasons Screen",
    description: "View seasons management screen.",
    minPlan: "STARTER",
  },
  {
    code: "SCREEN_MASTER_ACTIVITIES",
    name: "Activities Screen",
    description: "View activities management screen.",
    minPlan: "STARTER",
  },
  {
    code: "SCREEN_MASTER_TRANSPORTS",
    name: "Transport Screen",
    description: "View transport management screen.",
    minPlan: "STARTER",
  },
  {
    code: "SCREEN_MASTER_GUIDES",
    name: "Guides Screen",
    description: "View guides management screen.",
    minPlan: "STARTER",
  },
  {
    code: "SCREEN_MASTER_CURRENCIES",
    name: "Currency Screen",
    description: "View currencies and FX screen.",
    minPlan: "GROWTH",
  },
  {
    code: "SCREEN_MASTER_TAXES",
    name: "Tax Screen",
    description: "View tax management screen.",
    minPlan: "GROWTH",
  },
  {
    code: "SCREEN_MASTER_TOUR_CATEGORIES",
    name: "Tour Categories Screen",
    description: "View tour category screen.",
    minPlan: "STARTER",
  },
  {
    code: "SCREEN_MASTER_BUSINESS_NETWORK",
    name: "Operator & Market Screen",
    description: "View business network screen.",
    minPlan: "GROWTH",
  },
  {
    code: "SCREEN_PRE_TOURS",
    name: "Pre Tours Screen",
    description: "View pre-tour planning screen.",
    minPlan: "STARTER",
  },
  {
    code: "PRE_TOUR_MAP",
    name: "Pre Tour Route Map",
    description: "View pre-tour route map and route visualization features.",
    minPlan: "GROWTH",
  },
  {
    code: "PRE_TOUR_COSTING",
    name: "Pre Tour Costings",
    description: "View and manage pre-tour costing totals and pricing summaries.",
    minPlan: "ENTERPRISE",
  },
  {
    code: "SCREEN_TECHNICAL_VISITS",
    name: "Technical Visits Screen",
    description: "View technical visits screen.",
    minPlan: "STARTER",
  },
  {
    code: "SCREEN_CONFIGURATION_COMPANY",
    name: "Company Configuration Screen",
    description: "View company users and roles configuration screen.",
    minPlan: "STARTER",
  },
  {
    code: "SCREEN_BIN",
    name: "Bin Screen",
    description: "View bin screen.",
    minPlan: "STARTER",
  },
  {
    code: "MASTER_DATA_WRITE",
    name: "Master Data Write",
    description: "Create, update and delete master data.",
    minPlan: "STARTER",
  },
  {
    code: "PRE_TOUR_WRITE",
    name: "Pre Tour Write",
    description: "Create, update and delete pre-tour plans.",
    minPlan: "STARTER",
  },
  {
    code: "COMPANY_SETTINGS_MANAGE",
    name: "Company Settings Manage",
    description: "Update company setup details and security codes.",
    minPlan: "STARTER",
  },
  {
    code: "COMPANY_USERS_MANAGE",
    name: "Company Users Manage",
    description: "Manage users and assignments in the company.",
    minPlan: "STARTER",
  },
  {
    code: "ROLE_MANAGE",
    name: "Role Manage",
    description: "Create, update and assign custom roles.",
    minPlan: "STARTER",
  },
  {
    code: "SUBSCRIPTION_MANAGE",
    name: "Subscription Manage",
    description: "Change subscription plan and subscription settings.",
    minPlan: "STARTER",
  },
];

const PLAN_WEIGHT: Record<AppPlan, number> = {
  STARTER: 1,
  GROWTH: 2,
  ENTERPRISE: 3,
};

export function isKnownPrivilegeCode(value: string): value is AppPrivilegeCode {
  return (APP_PRIVILEGES as readonly string[]).includes(value);
}

export function getPrivilegesForPlan(plan: AppPlan): AppPrivilegeCode[] {
  return PRIVILEGE_DEFINITIONS.filter(
    (entry) => PLAN_WEIGHT[entry.minPlan] <= PLAN_WEIGHT[plan]
  ).map((entry) => entry.code);
}

export function clampPrivilegesToPlan(
  plan: AppPlan,
  privilegeCodes: readonly string[]
): AppPrivilegeCode[] {
  const allowed = new Set(getPrivilegesForPlan(plan));
  return privilegeCodes.filter(
    (code): code is AppPrivilegeCode => isKnownPrivilegeCode(code) && allowed.has(code)
  );
}

export function getPlanUserLimit(plan: AppPlan | null | undefined): number {
  if (!plan) return PLAN_USER_LIMITS.STARTER;
  return PLAN_USER_LIMITS[plan];
}

export function getDefaultRolePrivilegeCodes(
  role: "ADMIN" | "MANAGER" | "USER"
): AppPrivilegeCode[] {
  const readOnlyBase: AppPrivilegeCode[] = [
    "NAV_DASHBOARD",
    "NAV_MASTER_DATA",
    "NAV_TOURS",
    "NAV_CONFIGURATION",
    "NAV_BIN",
    "SCREEN_MASTER_ACCOMMODATIONS",
    "SCREEN_MASTER_SEASONS",
    "SCREEN_MASTER_ACTIVITIES",
    "SCREEN_MASTER_TRANSPORTS",
    "SCREEN_MASTER_GUIDES",
    "SCREEN_MASTER_CURRENCIES",
    "SCREEN_MASTER_TAXES",
    "SCREEN_MASTER_TOUR_CATEGORIES",
    "SCREEN_MASTER_BUSINESS_NETWORK",
    "SCREEN_PRE_TOURS",
    "SCREEN_TECHNICAL_VISITS",
    "PRE_TOUR_MAP",
    "PRE_TOUR_COSTING",
    "SCREEN_CONFIGURATION_COMPANY",
    "SCREEN_BIN",
  ];

  if (role === "USER") return readOnlyBase;
  if (role === "MANAGER") {
    return [
      ...readOnlyBase,
      "MASTER_DATA_WRITE",
      "PRE_TOUR_WRITE",
      "COMPANY_SETTINGS_MANAGE",
      "COMPANY_USERS_MANAGE",
      "ROLE_MANAGE",
    ];
  }

  return [
    ...readOnlyBase,
    "MASTER_DATA_WRITE",
    "PRE_TOUR_WRITE",
    "COMPANY_SETTINGS_MANAGE",
    "COMPANY_USERS_MANAGE",
    "ROLE_MANAGE",
    "SUBSCRIPTION_MANAGE",
  ];
}
