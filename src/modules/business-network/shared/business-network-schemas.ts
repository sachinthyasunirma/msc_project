import { z } from "zod";
import { BUSINESS_NETWORK_RESOURCE_KEYS } from "@/modules/business-network/shared/business-network-management-config";

const businessOrgMemberRoleSchema = z.enum([
  "PLATFORM_ADMIN",
  "PLATFORM_OPERATIONS",
  "PLATFORM_FINANCE",
  "OPERATOR_ADMIN",
  "OPERATOR_CONTRACTS",
  "OPERATOR_RESERVATIONS",
  "OPERATOR_TICKETING",
  "OPERATOR_FINANCE",
  "MARKET_ADMIN",
  "MARKET_SALES",
  "MARKET_RESERVATIONS",
  "MARKET_FINANCE",
  "SUPPLIER_ADMIN",
  "SUPPLIER_OPERATIONS",
  "SUPPLIER_FINANCE",
]);

export const businessNetworkResourceSchema = z.enum(BUSINESS_NETWORK_RESOURCE_KEYS);

export const businessNetworkListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  organizationId: z.string().trim().min(1).optional(),
  operatorOrgId: z.string().trim().min(1).optional(),
  marketOrgId: z.string().trim().min(1).optional(),
});

const baseSchema = z.object({
  code: z.string().trim().toUpperCase().min(1).max(40),
  isActive: z.boolean().default(true),
});

export const createBusinessOrganizationSchema = baseSchema.extend({
  type: z.enum(["PLATFORM", "OPERATOR", "MARKET", "SUPPLIER"]),
  name: z.string().trim().min(2).max(200),
  legalName: z.string().trim().max(200).optional().nullable(),
  registrationNo: z.string().trim().max(80).optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().trim().max(80).optional().nullable(),
  website: z.string().url().optional().nullable(),
  country: z.string().trim().max(120).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  address: z.string().trim().max(255).optional().nullable(),
  baseCurrency: z
    .string()
    .trim()
    .toUpperCase()
    .min(3, "Base Currency must be at least 3 characters (e.g. LKR, USD).")
    .max(10)
    .default("LKR"),
  timezone: z.string().trim().min(2).max(80).default("Asia/Colombo"),
  isVerified: z.boolean().default(false),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const updateBusinessOrganizationSchema = createBusinessOrganizationSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one organization field is required.",
  });

export const createBusinessOperatorProfileSchema = baseSchema.extend({
  organizationId: z.string().min(1),
  operatorKind: z
    .enum(["DMC", "TOUR_OPERATOR", "TRANSPORT", "ACTIVITY_PROVIDER", "MIXED"])
    .default("DMC"),
  serviceRegions: z.array(z.string().trim().min(1).max(120)).optional().nullable(),
  languages: z.array(z.string().trim().min(1).max(20)).optional().nullable(),
  bookingMode: z.enum(["ON_REQUEST", "INSTANT"]).default("ON_REQUEST"),
  leadTimeHours: z.coerce.number().min(0).max(10000).default(0),
  payoutMode: z
    .enum(["POST_TRAVEL", "POST_CONFIRMATION", "MILESTONE"])
    .default("POST_TRAVEL"),
  payoutCycle: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY"]).default("MONTHLY"),
});

export const updateBusinessOperatorProfileSchema = createBusinessOperatorProfileSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one operator profile field is required.",
  });

export const createBusinessMarketProfileSchema = baseSchema.extend({
  organizationId: z.string().min(1),
  agencyType: z
    .enum(["TRAVEL_AGENT", "ONLINE_AGENT", "CORPORATE", "WHOLESALER"])
    .default("TRAVEL_AGENT"),
  licenseNo: z.string().trim().max(80).optional().nullable(),
  preferredCurrency: z
    .string()
    .trim()
    .toUpperCase()
    .min(3, "Preferred Currency must be at least 3 characters (e.g. LKR, USD).")
    .max(10)
    .optional()
    .nullable(),
  creditEnabled: z.boolean().default(false),
  creditLimit: z.coerce.number().min(0).max(999999999).optional().nullable(),
  paymentTermDays: z.coerce.number().int().min(0).max(365).optional().nullable(),
  defaultMarkupPercent: z.coerce.number().min(0).max(100).default(0),
});

export const updateBusinessMarketProfileSchema = createBusinessMarketProfileSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one market profile field is required.",
  });

export const createBusinessOrgMemberSchema = baseSchema.extend({
  organizationId: z.string().min(1),
  userId: z.string().min(1),
  role: businessOrgMemberRoleSchema,
});

export const updateBusinessOrgMemberSchema = createBusinessOrgMemberSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one member field is required.",
  });

export const createBusinessOperatorMarketContractSchema = baseSchema.extend({
  operatorOrgId: z.string().min(1),
  marketOrgId: z.string().min(1),
  status: z.enum(["ACTIVE", "SUSPENDED", "TERMINATED"]).default("ACTIVE"),
  pricingMode: z.enum(["MARKUP", "COMMISSION", "NET_ONLY"]).default("MARKUP"),
  defaultMarkupPercent: z.coerce.number().min(0).max(100).default(0),
  defaultCommissionPercent: z.coerce.number().min(0).max(100).default(0),
  creditEnabled: z.boolean().default(false),
  creditLimit: z.coerce.number().min(0).max(999999999).optional().nullable(),
  paymentTermDays: z.coerce.number().int().min(0).max(365).optional().nullable(),
  effectiveFrom: z.string().datetime().optional().nullable(),
  effectiveTo: z.string().datetime().optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const updateBusinessOperatorMarketContractSchema =
  createBusinessOperatorMarketContractSchema.partial().refine((value) => Object.keys(value).length > 0, {
    message: "At least one contract field is required.",
  });
