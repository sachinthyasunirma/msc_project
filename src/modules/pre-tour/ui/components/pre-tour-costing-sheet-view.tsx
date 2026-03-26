"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PreTourCostingSheetSnapshot } from "@/modules/pre-tour/shared/pre-tour-costing-types";

type Props = {
  snapshot: PreTourCostingSheetSnapshot;
};

function formatMoney(currencyCode: string, value: number) {
  return `${currencyCode} ${value.toFixed(2)}`;
}

function sectionRows(snapshot: PreTourCostingSheetSnapshot) {
  return [
    {
      label: "Transport Direct",
      buy: snapshot.buy.sections.transportDirect,
      sell: snapshot.sell.sections.transportDirect,
    },
    {
      label: "Transport Related",
      buy: snapshot.buy.sections.transportRelated,
      sell: snapshot.sell.sections.transportRelated,
    },
    {
      label: "Subsistence",
      buy: snapshot.buy.sections.subsistence,
      sell: snapshot.sell.sections.subsistence,
    },
    {
      label: "Accommodation",
      buy: snapshot.buy.sections.accommodation,
      sell: snapshot.sell.sections.accommodation,
    },
    {
      label: "Guide",
      buy: snapshot.buy.sections.guide,
      sell: snapshot.sell.sections.guide,
    },
    {
      label: "Activities Individual",
      buy: snapshot.buy.sections.activitiesIndividual,
      sell: snapshot.sell.sections.activitiesIndividual,
    },
    {
      label: "Activities Group",
      buy: snapshot.buy.sections.activitiesGroup,
      sell: snapshot.sell.sections.activitiesGroup,
    },
    {
      label: "Activities Slab",
      buy: snapshot.buy.sections.activitiesSlab,
      sell: snapshot.sell.sections.activitiesSlab,
    },
    {
      label: "Misc Individual",
      buy: snapshot.buy.sections.miscIndividual,
      sell: snapshot.sell.sections.miscIndividual,
    },
    {
      label: "Misc Group",
      buy: snapshot.buy.sections.miscGroup,
      sell: snapshot.sell.sections.miscGroup,
    },
    {
      label: "Misc Slab",
      buy: snapshot.buy.sections.miscSlab,
      sell: snapshot.sell.sections.miscSlab,
    },
    {
      label: "Supplement",
      buy: snapshot.buy.sections.supplement,
      sell: snapshot.sell.sections.supplement,
    },
  ];
}

export function PreTourCostingSheetView({ snapshot }: Props) {
  const scenarioEntries = [
    snapshot.scenarios["1"],
    snapshot.scenarios["2"],
    snapshot.scenarios["3"],
  ];

  return (
    <div className="space-y-3">
      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Costing Sheet Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-md border bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground">Reference Template</p>
            <p className="font-medium">{snapshot.referenceTemplate}</p>
          </div>
          <div className="rounded-md border bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground">Quotation Currency</p>
            <p className="font-medium">{snapshot.quotationCurrency}</p>
          </div>
          <div className="rounded-md border bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground">Exchange Rate</p>
            <p className="font-medium">
              {snapshot.exchangeRate === null ? "-" : snapshot.exchangeRate.toFixed(4)}
            </p>
          </div>
          <div className="rounded-md border bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground">Generated</p>
            <p className="font-medium">{new Date(snapshot.generatedAt).toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Section Totals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sectionRows(snapshot).map((row) => (
            <div key={row.label} className="grid grid-cols-[minmax(0,1fr)_120px_120px] gap-2 text-sm">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="text-right">{formatMoney(snapshot.quotationCurrency, row.buy)}</span>
              <span className="text-right">{formatMoney(snapshot.quotationCurrency, row.sell)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Accommodation Occupancy</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-md border bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground">Single Total</p>
            <p className="font-medium">{formatMoney(snapshot.quotationCurrency, snapshot.accommodation.singleTotal)}</p>
          </div>
          <div className="rounded-md border bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground">Double Room Total</p>
            <p className="font-medium">{formatMoney(snapshot.quotationCurrency, snapshot.accommodation.doubleRoomTotal)}</p>
          </div>
          <div className="rounded-md border bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground">Triple Room Total</p>
            <p className="font-medium">{formatMoney(snapshot.quotationCurrency, snapshot.accommodation.tripleRoomTotal)}</p>
          </div>
          <div className="rounded-md border bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground">Half Double Per Pax</p>
            <p className="font-medium">{formatMoney(snapshot.quotationCurrency, snapshot.accommodation.halfDoublePerPax)}</p>
          </div>
          <div className="rounded-md border bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground">Single Supplement Total</p>
            <p className="font-medium">{formatMoney(snapshot.quotationCurrency, snapshot.accommodation.singleSupplementTotal)}</p>
          </div>
          <div className="rounded-md border bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground">Triple Discount Per Pax</p>
            <p className="font-medium">{formatMoney(snapshot.quotationCurrency, snapshot.accommodation.tripleDiscountPerPax)}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pax Scenarios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {scenarioEntries.map((scenario) => (
            <div key={scenario.paxCount} className="rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="font-medium">{scenario.paxCount} Pax Scenario</p>
                <p className="text-xs text-muted-foreground">
                  Buy {formatMoney(snapshot.quotationCurrency, scenario.buyTotalPerPax)} • Sell{" "}
                  {formatMoney(snapshot.quotationCurrency, scenario.sellTotalPerPax)}
                </p>
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-md bg-muted/20 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Transport / Pax</p>
                  <p className="font-medium">{formatMoney(snapshot.quotationCurrency, scenario.transportPerPax)}</p>
                </div>
                <div className="rounded-md bg-muted/20 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Accommodation / Pax</p>
                  <p className="font-medium">{formatMoney(snapshot.quotationCurrency, scenario.accommodationPerPax)}</p>
                </div>
                <div className="rounded-md bg-muted/20 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Activities / Pax</p>
                  <p className="font-medium">{formatMoney(snapshot.quotationCurrency, scenario.activityPerPax)}</p>
                </div>
                <div className="rounded-md bg-muted/20 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Misc / Pax</p>
                  <p className="font-medium">{formatMoney(snapshot.quotationCurrency, scenario.miscPerPax)}</p>
                </div>
                <div className="rounded-md bg-muted/20 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Supplement / Pax</p>
                  <p className="font-medium">{formatMoney(snapshot.quotationCurrency, scenario.supplementPerPax)}</p>
                </div>
                <div className="rounded-md bg-muted/20 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Guide / Pax</p>
                  <p className="font-medium">{formatMoney(snapshot.quotationCurrency, scenario.guidePerPax)}</p>
                </div>
                <div className="rounded-md bg-muted/20 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Markup / Pax</p>
                  <p className="font-medium">{formatMoney(snapshot.quotationCurrency, scenario.markupPerPax)}</p>
                </div>
                <div className="rounded-md bg-muted/20 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Sell Tax / Pax</p>
                  <p className="font-medium">{formatMoney(snapshot.quotationCurrency, scenario.sellTaxPerPax)}</p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
