import type {
  PreTourPriceMode,
  PreTourPricingSnapshot,
  PreTourRateCard,
} from "@/modules/pre-tour/shared/pre-tour-item-allocation-types";

export function buildPreTourPricingSnapshot(input: {
  sourceRate: PreTourRateCard | null;
  currencyCode: string;
  buyBaseAmount: number;
  buyTaxAmount: number;
  buyTotalAmount: number;
  markupMode: PreTourPricingSnapshot["commercial"]["markupMode"];
  markupValue: number;
  sellBaseAmount: number;
  sellTaxAmount: number;
  sellTotalAmount: number;
  priceMode: PreTourPriceMode;
  overrideApplied: boolean;
  overrideReason?: string | null;
  dimensions?: Record<string, unknown>;
}) : PreTourPricingSnapshot {
  return {
    snapshotVersion: 1,
    source: {
      sourceRateType: input.sourceRate?.sourceType ?? "MANUAL",
      sourceRateId: input.sourceRate?.sourceRateId ?? null,
      sourceLabel: input.sourceRate?.sourceLabel ?? null,
      serviceId: input.sourceRate?.serviceId ?? null,
      serviceLabel: input.sourceRate?.serviceLabel ?? null,
      effectiveDate: input.sourceRate?.effectiveDate ?? null,
      validFrom: input.sourceRate?.validFrom ?? null,
      validTo: input.sourceRate?.validTo ?? null,
      locked: input.sourceRate?.locked ?? false,
    },
    dimensions: input.dimensions ?? {},
    buy: {
      currencyCode: input.currencyCode,
      baseAmount: input.buyBaseAmount,
      taxAmount: input.buyTaxAmount,
      totalAmount: input.buyTotalAmount,
    },
    commercial: {
      markupMode: input.markupMode,
      markupValue: input.markupValue,
      sellBaseAmount: input.sellBaseAmount,
      sellTaxAmount: input.sellTaxAmount,
      sellTotalAmount: input.sellTotalAmount,
    },
    override: {
      applied: input.overrideApplied,
      reason: input.overrideReason?.trim() || null,
    },
    priceMode: input.priceMode,
    generatedAt: new Date().toISOString(),
  };
}
