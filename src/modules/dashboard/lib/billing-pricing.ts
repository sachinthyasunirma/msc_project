export type PlanCode = "STARTER" | "GROWTH" | "ENTERPRISE";
export type SubscriptionDuration = "QUARTERLY" | "YEARLY";

export const ADDITIONAL_USER_PRICE_PER_MONTH = 45;

export const PLAN_META: Array<{
  code: PlanCode;
  name: string;
  billingModel: string;
  includedUsers: number;
  badge: string;
  subtitle: string;
  outcomes: string[];
  idealFor: string;
  isFree: boolean;
}> = [
  {
    code: "STARTER",
    name: "Starter",
    billingModel: "Per Company / Year",
    includedUsers: 10,
    badge: "Foundation",
    subtitle: "Operational foundation for tourism teams.",
    idealFor: "Small DMC teams building controlled operations",
    outcomes: [
      "Standardized master data governance",
      "Faster quote preparation with less manual work",
      "Role-based access and write controls",
    ],
    isFree: true,
  },
  {
    code: "GROWTH",
    name: "Growth",
    billingModel: "Per Company / Year",
    includedUsers: 25,
    badge: "Most Popular",
    subtitle: "Scale operations across markets and products.",
    idealFor: "Multi-market tour operators and scaling DMCs",
    outcomes: [
      "Advanced commercial workflows for tax/currency contexts",
      "Better margin control in complex itineraries",
      "Broader operational visibility for leaders",
    ],
    isFree: false,
  },
  {
    code: "ENTERPRISE",
    name: "Enterprise",
    billingModel: "Per Company / Year",
    includedUsers: 40,
    badge: "Strategic",
    subtitle: "Enterprise control and governance at scale.",
    idealFor: "Large organizations requiring strict governance",
    outcomes: [
      "Full operational and subscription governance",
      "Executive-level control over platform operations",
      "Priority path for strategic rollout support",
    ],
    isFree: false,
  },
];

export function getDurationMonths(duration: SubscriptionDuration) {
  return duration === "QUARTERLY" ? 3 : 12;
}

export function getPerUserMonthlyRate(duration: SubscriptionDuration) {
  return duration === "QUARTERLY" ? 40 : 38;
}

export function getDurationLabel(duration: SubscriptionDuration) {
  return duration === "QUARTERLY" ? "3 Months" : "1 Year";
}

export function getDurationShortLabel(duration: SubscriptionDuration) {
  return duration === "QUARTERLY" ? "3M" : "1Y";
}

export function getDurationSuffix(duration: SubscriptionDuration) {
  return duration === "QUARTERLY" ? "/3 months" : "/year";
}

export function getPlanPackageTotal(
  planCode: PlanCode,
  includedUsers: number,
  duration: SubscriptionDuration
) {
  const plan = PLAN_META.find((entry) => entry.code === planCode);
  if (!plan || plan.isFree) return 0;
  return includedUsers * getPerUserMonthlyRate(duration) * getDurationMonths(duration);
}
