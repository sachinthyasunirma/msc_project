export type PreTourCostingSectionBreakdown = {
  transportDirect: number;
  transportRelated: number;
  subsistence: number;
  accommodation: number;
  guide: number;
  activitiesIndividual: number;
  activitiesGroup: number;
  activitiesSlab: number;
  miscIndividual: number;
  miscGroup: number;
  miscSlab: number;
  supplement: number;
};

export type PreTourCostingScenario = {
  paxCount: number;
  buyBasePerPax: number;
  buyTaxPerPax: number;
  buyTotalPerPax: number;
  sellBasePerPax: number;
  sellTaxPerPax: number;
  sellTotalPerPax: number;
  markupPerPax: number;
  transportPerPax: number;
  accommodationPerPax: number;
  activityPerPax: number;
  miscPerPax: number;
  supplementPerPax: number;
  guidePerPax: number;
};

export type PreTourAccommodationOccupancySummary = {
  singleTotal: number;
  doubleRoomTotal: number;
  tripleRoomTotal: number;
  halfDoublePerPax: number;
  singleSupplementTotal: number;
  tripleDiscountPerPax: number;
};

export type PreTourCostingSheetSnapshot = {
  costingSheetVersion: 1;
  referenceTemplate: string;
  quotationCurrency: string;
  exchangeRate: number | null;
  generatedAt: string;
  buy: {
    sections: PreTourCostingSectionBreakdown;
  };
  sell: {
    sections: PreTourCostingSectionBreakdown;
  };
  accommodation: PreTourAccommodationOccupancySummary;
  scenarios: {
    "1": PreTourCostingScenario;
    "2": PreTourCostingScenario;
    "3": PreTourCostingScenario;
  };
};
