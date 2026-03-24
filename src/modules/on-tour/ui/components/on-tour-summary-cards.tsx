"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SummaryCard = {
  label: string;
  value: string;
  hint: string;
};

export function OnTourSummaryCards({ cards }: { cards: SummaryCard[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className="border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{card.value}</div>
            <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
