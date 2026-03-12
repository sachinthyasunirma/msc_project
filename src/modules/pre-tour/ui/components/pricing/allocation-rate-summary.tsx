"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PreTourCommercialPricing, PreTourRateCard } from "@/modules/pre-tour/shared/pre-tour-item-allocation-types";

type AllocationRateSummaryProps = {
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

export function AllocationRateSummary({
  currencyCode,
  buyBaseAmount,
  buyTaxAmount,
  buyTotalAmount,
  commercialPricing,
  priceMode,
  sourceRate,
  overrideApplied,
}: AllocationRateSummaryProps) {
  return (
    <Card className="border-border/70">
      <CardHeader className="space-y-2 pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Costing Summary</CardTitle>
          <Badge variant="outline">{priceMode}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {sourceRate ? `Applied source: ${sourceRate.sourceLabel}` : "Applied source: manual buying entry"}
        </p>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Buying</p>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Base cost</span>
            <span>{formatAmount(currencyCode, buyBaseAmount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Tax / levy</span>
            <span>{formatAmount(currencyCode, buyTaxAmount)}</span>
          </div>
          <div className="flex items-center justify-between font-medium">
            <span>Net buy total</span>
            <span>{formatAmount(currencyCode, buyTotalAmount)}</span>
          </div>
        </div>

        <div className="h-px bg-border" />

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Selling</p>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Markup</span>
            <span>
              {commercialPricing.markupMode === "NONE"
                ? "No markup"
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
