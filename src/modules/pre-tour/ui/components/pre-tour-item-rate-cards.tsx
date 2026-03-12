"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { PreTourRateCard } from "@/modules/pre-tour/shared/pre-tour-item-allocation-types";

type PreTourItemRateCardsProps<T extends PreTourRateCard> = {
  rates: T[];
  selectedRateId: string;
  disabled?: boolean;
  emptyMessage: string;
  renderMeta?: (rate: T) => string;
  onSelect: (rateId: string) => void;
};

export function PreTourItemRateCards<T extends PreTourRateCard>({
  rates,
  selectedRateId,
  disabled = false,
  emptyMessage,
  renderMeta,
  onSelect,
}: PreTourItemRateCardsProps<T>) {
  if (rates.length === 0) {
    return (
      <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {rates.map((rate) => {
        const isSelected = rate.sourceRateId === selectedRateId;
        return (
          <Card
            key={rate.sourceRateId}
            className={isSelected ? "border-primary shadow-sm" : "border-border/70"}
          >
            <CardContent className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{rate.sourceLabel}</p>
                  <Badge variant={rate.locked ? "secondary" : "outline"}>
                    {rate.locked ? "Contracted rate" : "Manual rate"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {rate.currencyCode} {rate.buyTotalAmount.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Valid {rate.validFrom || "-"} to {rate.validTo || "-"}
                </p>
                {renderMeta ? (
                  <p className="text-xs text-muted-foreground">{renderMeta(rate)}</p>
                ) : null}
              </div>
              <Button
                type="button"
                variant={isSelected ? "default" : "outline"}
                onClick={() => onSelect(rate.sourceRateId)}
                disabled={disabled}
              >
                {isSelected ? "Selected" : "Use rate"}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
