"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PreTourCommercialPricing, PreTourRateCard } from "@/modules/pre-tour/shared/pre-tour-item-allocation-types";

type PreTourItemPricingSummaryProps = {
  currencyCode: string;
  buyBaseAmount: number;
  buyTaxAmount: number;
  buyTotalAmount: number;
  commercialPricing: PreTourCommercialPricing;
  priceMode: "EXCLUSIVE" | "INCLUSIVE";
  sourceRate: PreTourRateCard | null;
  overrideApplied: boolean;
};

function formatAmount(currencyCode: string, value: number) {
  return `${currencyCode} ${value.toFixed(2)}`;
}

export function PreTourItemPricingSummary({
  currencyCode,
  buyBaseAmount,
  buyTaxAmount,
  buyTotalAmount,
  commercialPricing,
  priceMode,
  sourceRate,
  overrideApplied,
}: PreTourItemPricingSummaryProps) {
  return (
    <Card className="border-border/70">
      <CardHeader className="space-y-2 pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Commercial Summary</CardTitle>
          <Badge variant="outline">{priceMode}</Badge>
        </div>
        {sourceRate ? (
          <p className="text-xs text-muted-foreground">
            Source: {sourceRate.sourceLabel}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Source: Manual pricing</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Buy base</span>
            <span>{formatAmount(currencyCode, buyBaseAmount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Buy tax</span>
            <span>{formatAmount(currencyCode, buyTaxAmount)}</span>
          </div>
          <div className="flex items-center justify-between font-medium">
            <span>Buy total</span>
            <span>{formatAmount(currencyCode, buyTotalAmount)}</span>
          </div>
        </div>

        <div className="h-px bg-border" />

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Markup</span>
            <span>
              {commercialPricing.markupMode === "NONE"
                ? "None"
                : commercialPricing.markupMode === "PERCENT"
                  ? `${commercialPricing.markupValue.toFixed(2)}%`
                  : formatAmount(currencyCode, commercialPricing.markupValue)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Sell base</span>
            <span>{formatAmount(currencyCode, commercialPricing.sellBaseAmount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Sell tax</span>
            <span>{formatAmount(currencyCode, commercialPricing.sellTaxAmount)}</span>
          </div>
          <div className="flex items-center justify-between font-medium">
            <span>Sell total</span>
            <span>{formatAmount(currencyCode, commercialPricing.sellTotalAmount)}</span>
          </div>
        </div>

        {overrideApplied ? (
          <Badge variant="secondary">Manual buy override applied</Badge>
        ) : null}
      </CardContent>
    </Card>
  );
}
