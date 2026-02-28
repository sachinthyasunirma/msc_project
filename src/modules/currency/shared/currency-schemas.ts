import { z } from "zod";

export const currencyResourceSchema = z.enum([
  "currencies",
  "fx-providers",
  "exchange-rates",
  "money-settings",
]);

export const currencyListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  currencyId: z.string().trim().min(1).optional(),
});

const baseSchema = z.object({
  code: z.string().trim().toUpperCase().min(1).max(40),
});

export const createCurrencySchema = baseSchema.extend({
  name: z.string().trim().min(2).max(120),
  symbol: z.string().trim().max(10).optional().nullable(),
  numericCode: z.string().trim().max(3).optional().nullable(),
  minorUnit: z.coerce.number().int().min(0).max(6).default(2),
  roundingMode: z
    .enum(["HALF_UP", "HALF_DOWN", "UP", "DOWN", "BANKERS"])
    .default("HALF_UP"),
  roundingScale: z.coerce.number().int().min(0).max(8).default(2),
  isActive: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const updateCurrencySchema = createCurrencySchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one currency field is required.",
  });

export const createFxProviderSchema = baseSchema.extend({
  name: z.string().trim().min(2).max(120),
  isActive: z.boolean().default(true),
});

export const updateFxProviderSchema = createFxProviderSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one FX provider field is required.",
  });

const exchangeRateShape = baseSchema.extend({
  providerId: z.string().min(1).optional().nullable(),
  baseCurrencyId: z.string().min(1),
  quoteCurrencyId: z.string().min(1),
  rate: z.coerce.number().gt(0).max(999999999),
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().optional().nullable(),
  rateType: z.enum(["MID", "BUY", "SELL"]).default("MID"),
  isActive: z.boolean().default(true),
});

export const createExchangeRateSchema = exchangeRateShape.superRefine((data, ctx) => {
  if (data.effectiveTo) {
    const from = new Date(data.effectiveFrom);
    const to = new Date(data.effectiveTo);
    if (to < from) {
      ctx.addIssue({
        path: ["effectiveTo"],
        code: z.ZodIssueCode.custom,
        message: "Effective To must be greater than or equal to Effective From.",
      });
    }
  }
});

export const updateExchangeRateSchema = exchangeRateShape
  .partial()
  .superRefine((data, ctx) => {
    if (data.effectiveFrom && data.effectiveTo) {
      const from = new Date(data.effectiveFrom);
      const to = new Date(data.effectiveTo);
      if (to < from) {
        ctx.addIssue({
          path: ["effectiveTo"],
          code: z.ZodIssueCode.custom,
          message: "Effective To must be greater than or equal to Effective From.",
        });
      }
    }
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one exchange rate field is required.",
  });

export const createMoneySettingSchema = baseSchema.extend({
  baseCurrencyId: z.string().min(1),
  priceMode: z.enum(["EXCLUSIVE", "INCLUSIVE"]).default("EXCLUSIVE"),
  fxRateSource: z
    .enum(["LATEST", "DATE_OF_SERVICE", "DATE_OF_BOOKING"])
    .default("LATEST"),
});

export const updateMoneySettingSchema = createMoneySettingSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one money setting field is required.",
  });
