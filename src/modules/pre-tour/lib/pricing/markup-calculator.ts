import type { PreTourCommercialPricing, PreTourMarkupMode } from "@/modules/pre-tour/shared/pre-tour-item-allocation-types";

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function toMoney(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return 0;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? roundMoney(numeric) : 0;
}

export function calculateMarkupAmount(
  buyBaseAmount: number,
  markupMode: PreTourMarkupMode,
  markupValue: number
) {
  const base = toMoney(buyBaseAmount);
  const value = toMoney(markupValue);
  if (markupMode === "PERCENT") return roundMoney((base * value) / 100);
  if (markupMode === "FIXED") return value;
  return 0;
}

export function calculateCommercialPricing(input: {
  buyBaseAmount: number;
  buyTaxAmount: number;
  markupMode: PreTourMarkupMode;
  markupValue: number;
}): PreTourCommercialPricing {
  const buyBaseAmount = toMoney(input.buyBaseAmount);
  const buyTaxAmount = toMoney(input.buyTaxAmount);
  const markupAmount = calculateMarkupAmount(
    buyBaseAmount,
    input.markupMode,
    input.markupValue
  );
  const sellBaseAmount = roundMoney(buyBaseAmount + markupAmount);
  const sellTaxAmount = buyTaxAmount;
  return {
    markupMode: input.markupMode,
    markupValue: toMoney(input.markupValue),
    sellBaseAmount,
    sellTaxAmount,
    sellTotalAmount: roundMoney(sellBaseAmount + sellTaxAmount),
  };
}
