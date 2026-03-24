import type {
  PreTourAccommodationOccupancySummary,
  PreTourCostingScenario,
  PreTourCostingSectionBreakdown,
  PreTourCostingSheetSnapshot,
} from "@/modules/pre-tour/shared/pre-tour-costing-types";

type SnapshotPayload = Record<string, unknown>;

type CostingLine = {
  itemType: string;
  title?: string | null;
  description?: string | null;
  baseAmount?: unknown;
  taxAmount?: unknown;
  totalAmount?: unknown;
  pricingSnapshot?: unknown;
};

type BuildPreTourCostingSheetInput = {
  quotationCurrency: string;
  exchangeRate?: unknown;
  items: CostingLine[];
  addons: CostingLine[];
  guides: CostingLine[];
};

const COSTING_TEMPLATE_REFERENCE = "RF26PRO00001-1.docx";

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toNumber(value: unknown) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toRecord(value: unknown): SnapshotPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as SnapshotPayload;
}

function createEmptySectionBreakdown(): PreTourCostingSectionBreakdown {
  return {
    transportDirect: 0,
    transportRelated: 0,
    subsistence: 0,
    accommodation: 0,
    guide: 0,
    activitiesIndividual: 0,
    activitiesGroup: 0,
    activitiesSlab: 0,
    miscIndividual: 0,
    miscGroup: 0,
    miscSlab: 0,
    supplement: 0,
  };
}

function createScenario(paxCount: number): PreTourCostingScenario {
  return {
    paxCount,
    buyBasePerPax: 0,
    buyTaxPerPax: 0,
    buyTotalPerPax: 0,
    sellBasePerPax: 0,
    sellTaxPerPax: 0,
    sellTotalPerPax: 0,
    markupPerPax: 0,
    transportPerPax: 0,
    accommodationPerPax: 0,
    activityPerPax: 0,
    miscPerPax: 0,
    supplementPerPax: 0,
    guidePerPax: 0,
  };
}

function getPricingSnapshot(line: CostingLine) {
  return toRecord(line.pricingSnapshot);
}

function readBuyAmounts(snapshot: SnapshotPayload | null, line: CostingLine) {
  const buy = toRecord(snapshot?.buy);
  return {
    base: buy ? toNumber(buy.baseAmount) : toNumber(line.baseAmount),
    tax: buy ? toNumber(buy.taxAmount) : toNumber(line.taxAmount),
    total: buy ? toNumber(buy.totalAmount) : toNumber(line.totalAmount),
  };
}

function readSellAmounts(snapshot: SnapshotPayload | null, line: CostingLine) {
  const commercial = toRecord(snapshot?.commercial);
  const buy = toRecord(snapshot?.buy);
  const sellBase = toNumber(commercial?.sellBaseAmount);
  const sellTax =
    commercial && Object.prototype.hasOwnProperty.call(commercial, "sellTaxAmount")
      ? toNumber(commercial.sellTaxAmount)
      : toNumber(buy?.taxAmount);
  return {
    base: commercial ? sellBase : toNumber(line.baseAmount),
    tax: sellTax,
    total:
      commercial && Object.prototype.hasOwnProperty.call(commercial, "sellTotalAmount")
        ? toNumber(commercial.sellTotalAmount)
        : roundMoney(toNumber(line.totalAmount)),
    markupMode: String(commercial?.markupMode ?? "NONE").toUpperCase(),
    markupValue: toNumber(commercial?.markupValue),
  };
}

function readCommercial(snapshot: SnapshotPayload | null) {
  const commercial = toRecord(snapshot?.commercial);
  return {
    markupMode: String(commercial?.markupMode ?? "NONE").toUpperCase(),
    markupValue: toNumber(commercial?.markupValue),
  };
}

function calculateSellAmountsFromMarkup(
  buyBase: number,
  buyTax: number,
  markupMode: string,
  markupValue: number
) {
  const normalizedMode = markupMode.toUpperCase();
  const markupAmount =
    normalizedMode === "PERCENT"
      ? roundMoney((buyBase * markupValue) / 100)
      : normalizedMode === "FIXED"
        ? roundMoney(markupValue)
        : 0;
  const sellBase = roundMoney(buyBase + markupAmount);
  const sellTax = roundMoney(buyTax);
  return {
    base: sellBase,
    tax: sellTax,
    total: roundMoney(sellBase + sellTax),
  };
}

function getLineText(line: CostingLine, snapshot: SnapshotPayload | null) {
  const dimensions = toRecord(snapshot?.dimensions);
  return [
    line.itemType,
    line.title,
    line.description,
    dimensions?.chargeMethod,
    dimensions?.unitBasis,
    dimensions?.paxSlab,
    dimensions?.chargeCategory,
    dimensions?.routeNotes,
  ]
    .filter(Boolean)
    .map((value) => String(value).trim().toUpperCase())
    .join(" ");
}

function classifyVariablePricing(text: string) {
  if (text.includes("SLAB") || text.includes("TIER")) return "SLAB" as const;
  if (text.includes("GROUP") || text.includes("PRIVATE") || text.includes("PER JEEP")) {
    return "GROUP" as const;
  }
  return "INDIVIDUAL" as const;
}

function addSectionValue(
  sections: PreTourCostingSectionBreakdown,
  key: keyof PreTourCostingSectionBreakdown,
  amount: number
) {
  sections[key] = roundMoney(sections[key] + amount);
}

function getAccommodationScenarioAmounts(
  snapshot: SnapshotPayload | null,
  scenarioPax: 1 | 2 | 3,
  fallback: { buyBase: number; buyTax: number; sellBase: number; sellTax: number }
) {
  const dimensions = toRecord(snapshot?.dimensions);
  const occupancyPricing = toRecord(dimensions?.occupancyPricing);
  const buyKey = scenarioPax === 1 ? "single" : scenarioPax === 2 ? "double" : "triple";
  const buyScenario = toRecord(occupancyPricing?.[buyKey]);
  const commercial = readCommercial(snapshot);

  const buyBase = buyScenario ? toNumber(buyScenario.baseAmount) : fallback.buyBase * scenarioPax;
  const buyTax = buyScenario ? toNumber(buyScenario.taxAmount) : fallback.buyTax * scenarioPax;
  const buyTotal = buyScenario ? toNumber(buyScenario.totalAmount) : roundMoney(buyBase + buyTax);
  const sellScenario = calculateSellAmountsFromMarkup(
    buyBase,
    buyTax,
    commercial.markupMode,
    commercial.markupValue
  );

  return {
    buyBasePerPax: roundMoney(buyBase / scenarioPax),
    buyTaxPerPax: roundMoney(buyTax / scenarioPax),
    buyTotalPerPax: roundMoney(buyTotal / scenarioPax),
    sellBasePerPax: roundMoney(sellScenario.base / scenarioPax),
    sellTaxPerPax: roundMoney(sellScenario.tax / scenarioPax),
    sellTotalPerPax: roundMoney(sellScenario.total / scenarioPax),
    singleRoomTotal: occupancyPricing ? toNumber(toRecord(occupancyPricing.single)?.totalAmount) : fallback.buyBase + fallback.buyTax,
    doubleRoomTotal: occupancyPricing ? toNumber(toRecord(occupancyPricing.double)?.totalAmount) : roundMoney((fallback.buyBase + fallback.buyTax) * 2),
    tripleRoomTotal: occupancyPricing ? toNumber(toRecord(occupancyPricing.triple)?.totalAmount) : roundMoney((fallback.buyBase + fallback.buyTax) * 3),
    singleSupplementRate: toNumber(dimensions?.singleSupplementRate),
  };
}

function addScenarioContribution(
  scenario: PreTourCostingScenario,
  category: "transport" | "accommodation" | "activity" | "misc" | "supplement" | "guide",
  input: {
    buyBasePerPax: number;
    buyTaxPerPax: number;
    buyTotalPerPax: number;
    sellBasePerPax: number;
    sellTaxPerPax: number;
    sellTotalPerPax: number;
  }
) {
  scenario.buyBasePerPax = roundMoney(scenario.buyBasePerPax + input.buyBasePerPax);
  scenario.buyTaxPerPax = roundMoney(scenario.buyTaxPerPax + input.buyTaxPerPax);
  scenario.buyTotalPerPax = roundMoney(scenario.buyTotalPerPax + input.buyTotalPerPax);
  scenario.sellBasePerPax = roundMoney(scenario.sellBasePerPax + input.sellBasePerPax);
  scenario.sellTaxPerPax = roundMoney(scenario.sellTaxPerPax + input.sellTaxPerPax);
  scenario.sellTotalPerPax = roundMoney(scenario.sellTotalPerPax + input.sellTotalPerPax);
  scenario.markupPerPax = roundMoney(
    scenario.markupPerPax + (input.sellBasePerPax - input.buyBasePerPax)
  );

  switch (category) {
    case "transport":
      scenario.transportPerPax = roundMoney(scenario.transportPerPax + input.buyTotalPerPax);
      return;
    case "accommodation":
      scenario.accommodationPerPax = roundMoney(
        scenario.accommodationPerPax + input.buyTotalPerPax
      );
      return;
    case "activity":
      scenario.activityPerPax = roundMoney(scenario.activityPerPax + input.buyTotalPerPax);
      return;
    case "misc":
      scenario.miscPerPax = roundMoney(scenario.miscPerPax + input.buyTotalPerPax);
      return;
    case "supplement":
      scenario.supplementPerPax = roundMoney(
        scenario.supplementPerPax + input.buyTotalPerPax
      );
      return;
    case "guide":
      scenario.guidePerPax = roundMoney(scenario.guidePerPax + input.buyTotalPerPax);
      return;
  }
}

export function buildPreTourCostingSheet({
  quotationCurrency,
  exchangeRate,
  items,
  addons,
  guides,
}: BuildPreTourCostingSheetInput): PreTourCostingSheetSnapshot {
  const buySections = createEmptySectionBreakdown();
  const sellSections = createEmptySectionBreakdown();
  const scenarios = {
    "1": createScenario(1),
    "2": createScenario(2),
    "3": createScenario(3),
  };
  const accommodation: PreTourAccommodationOccupancySummary = {
    singleTotal: 0,
    doubleRoomTotal: 0,
    tripleRoomTotal: 0,
    halfDoublePerPax: 0,
    singleSupplementTotal: 0,
    tripleDiscountPerPax: 0,
  };

  const lines: CostingLine[] = [
    ...items,
    ...addons.map((addon) => ({
      ...addon,
      itemType: addon.itemType || "SUPPLEMENT",
    })),
    ...guides.map((guide) => ({
      ...guide,
      itemType: "GUIDE",
    })),
  ];

  lines.forEach((line) => {
    const snapshot = getPricingSnapshot(line);
    const buy = readBuyAmounts(snapshot, line);
    const sell = readSellAmounts(snapshot, line);
    const text = getLineText(line, snapshot);
    const normalizedType = String(line.itemType || "").trim().toUpperCase();

    if (normalizedType === "ACCOMMODATION") {
      addSectionValue(buySections, "accommodation", buy.total);
      addSectionValue(sellSections, "accommodation", sell.total);

      const singleScenario = getAccommodationScenarioAmounts(snapshot, 1, {
        buyBase: buy.base,
        buyTax: buy.tax,
        sellBase: sell.base,
        sellTax: sell.tax,
      });
      const doubleScenario = getAccommodationScenarioAmounts(snapshot, 2, {
        buyBase: buy.base,
        buyTax: buy.tax,
        sellBase: sell.base,
        sellTax: sell.tax,
      });
      const tripleScenario = getAccommodationScenarioAmounts(snapshot, 3, {
        buyBase: buy.base,
        buyTax: buy.tax,
        sellBase: sell.base,
        sellTax: sell.tax,
      });

      accommodation.singleTotal = roundMoney(
        accommodation.singleTotal + singleScenario.singleRoomTotal
      );
      accommodation.doubleRoomTotal = roundMoney(
        accommodation.doubleRoomTotal + doubleScenario.doubleRoomTotal
      );
      accommodation.tripleRoomTotal = roundMoney(
        accommodation.tripleRoomTotal + tripleScenario.tripleRoomTotal
      );
      accommodation.singleSupplementTotal = roundMoney(
        accommodation.singleSupplementTotal + singleScenario.singleSupplementRate
      );

      addScenarioContribution(scenarios["1"], "accommodation", singleScenario);
      addScenarioContribution(scenarios["2"], "accommodation", doubleScenario);
      addScenarioContribution(scenarios["3"], "accommodation", tripleScenario);
      return;
    }

    if (normalizedType === "TRANSPORT") {
      addSectionValue(buySections, "transportDirect", buy.total);
      addSectionValue(sellSections, "transportDirect", sell.total);
      (["1", "2", "3"] as const).forEach((key) => {
        const paxCount = Number(key);
        addScenarioContribution(scenarios[key], "transport", {
          buyBasePerPax: roundMoney(buy.base / paxCount),
          buyTaxPerPax: roundMoney(buy.tax / paxCount),
          buyTotalPerPax: roundMoney(buy.total / paxCount),
          sellBasePerPax: roundMoney(sell.base / paxCount),
          sellTaxPerPax: roundMoney(sell.tax / paxCount),
          sellTotalPerPax: roundMoney(sell.total / paxCount),
        });
      });
      return;
    }

    if (normalizedType === "GUIDE") {
      addSectionValue(buySections, "guide", buy.total);
      addSectionValue(sellSections, "guide", sell.total);
      (["1", "2", "3"] as const).forEach((key) => {
        const paxCount = Number(key);
        addScenarioContribution(scenarios[key], "guide", {
          buyBasePerPax: roundMoney(buy.base / paxCount),
          buyTaxPerPax: roundMoney(buy.tax / paxCount),
          buyTotalPerPax: roundMoney(buy.total / paxCount),
          sellBasePerPax: roundMoney(sell.base / paxCount),
          sellTaxPerPax: roundMoney(sell.tax / paxCount),
          sellTotalPerPax: roundMoney(sell.total / paxCount),
        });
      });
      return;
    }

    if (normalizedType === "ACTIVITY") {
      const model = classifyVariablePricing(text);
      const buyKey =
        model === "SLAB"
          ? "activitiesSlab"
          : model === "GROUP"
            ? "activitiesGroup"
            : "activitiesIndividual";
      addSectionValue(buySections, buyKey, buy.total);
      addSectionValue(sellSections, buyKey, sell.total);
      (["1", "2", "3"] as const).forEach((key) => {
        const paxCount = Number(key);
        const perPax = model === "INDIVIDUAL";
        addScenarioContribution(scenarios[key], "activity", {
          buyBasePerPax: perPax ? buy.base : roundMoney(buy.base / paxCount),
          buyTaxPerPax: perPax ? buy.tax : roundMoney(buy.tax / paxCount),
          buyTotalPerPax: perPax ? buy.total : roundMoney(buy.total / paxCount),
          sellBasePerPax: perPax ? sell.base : roundMoney(sell.base / paxCount),
          sellTaxPerPax: perPax ? sell.tax : roundMoney(sell.tax / paxCount),
          sellTotalPerPax: perPax ? sell.total : roundMoney(sell.total / paxCount),
        });
      });
      return;
    }

    if (normalizedType === "MISC") {
      const model = classifyVariablePricing(text);
      const buyKey =
        model === "SLAB" ? "miscSlab" : model === "GROUP" ? "miscGroup" : "miscIndividual";
      addSectionValue(buySections, buyKey, buy.total);
      addSectionValue(sellSections, buyKey, sell.total);
      (["1", "2", "3"] as const).forEach((key) => {
        const paxCount = Number(key);
        const perPax = model === "INDIVIDUAL";
        addScenarioContribution(scenarios[key], "misc", {
          buyBasePerPax: perPax ? buy.base : roundMoney(buy.base / paxCount),
          buyTaxPerPax: perPax ? buy.tax : roundMoney(buy.tax / paxCount),
          buyTotalPerPax: perPax ? buy.total : roundMoney(buy.total / paxCount),
          sellBasePerPax: perPax ? sell.base : roundMoney(sell.base / paxCount),
          sellTaxPerPax: perPax ? sell.tax : roundMoney(sell.tax / paxCount),
          sellTotalPerPax: perPax ? sell.total : roundMoney(sell.total / paxCount),
        });
      });
      return;
    }

    addSectionValue(buySections, "supplement", buy.total);
    addSectionValue(sellSections, "supplement", sell.total);
    (["1", "2", "3"] as const).forEach((key) => {
      const paxCount = Number(key);
      const perPax = text.includes("PER PAX") || text.includes("PER PERSON");
      addScenarioContribution(scenarios[key], "supplement", {
        buyBasePerPax: perPax ? buy.base : roundMoney(buy.base / paxCount),
        buyTaxPerPax: perPax ? buy.tax : roundMoney(buy.tax / paxCount),
        buyTotalPerPax: perPax ? buy.total : roundMoney(buy.total / paxCount),
        sellBasePerPax: perPax ? sell.base : roundMoney(sell.base / paxCount),
        sellTaxPerPax: perPax ? sell.tax : roundMoney(sell.tax / paxCount),
        sellTotalPerPax: perPax ? sell.total : roundMoney(sell.total / paxCount),
      });
    });
  });

  accommodation.halfDoublePerPax = roundMoney(accommodation.doubleRoomTotal / 2);
  accommodation.tripleDiscountPerPax = roundMoney(
    accommodation.halfDoublePerPax - accommodation.tripleRoomTotal / 3
  );

  return {
    costingSheetVersion: 1,
    referenceTemplate: COSTING_TEMPLATE_REFERENCE,
    quotationCurrency,
    exchangeRate:
      exchangeRate === null || exchangeRate === undefined ? null : toNumber(exchangeRate),
    generatedAt: new Date().toISOString(),
    buy: { sections: buySections },
    sell: { sections: sellSections },
    accommodation,
    scenarios,
  };
}
