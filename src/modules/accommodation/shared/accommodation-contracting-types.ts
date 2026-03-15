export const HOTEL_CONTRACT_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
  "EXPIRED",
  "ARCHIVED",
] as const;

export const HOTEL_CONTRACT_TYPES = [
  "FIT",
  "GROUP",
  "SERIES",
  "CORPORATE",
  "WHOLESALE",
] as const;

export const HOTEL_BOARD_BASES = ["RO", "BB", "HB", "FB", "AI"] as const;

export const HOTEL_RATE_TYPES = [
  "CONTRACTED_BUY",
  "SELL_STATIC",
  "SELL_DERIVED",
] as const;

export const HOTEL_RATE_PRICING_MODELS = [
  "PER_ROOM_PER_NIGHT",
  "PER_PERSON_PER_NIGHT",
] as const;

export const HOTEL_TAX_MODES = [
  "EXCLUSIVE",
  "INCLUSIVE",
  "EXEMPT",
  "UNKNOWN",
] as const;

export const HOTEL_PENALTY_TYPES = ["PERCENT", "NIGHT", "FIXED", "FULL_STAY"] as const;

export const HOTEL_PENALTY_BASES = ["ROOM_ONLY", "TOTAL_STAY", "FIRST_NIGHT"] as const;

export const HOTEL_FEE_TYPES = [
  "TAX",
  "LEVY",
  "SERVICE_CHARGE",
  "GALA_DINNER",
  "RESORT_FEE",
  "SUPPLEMENT",
  "CITY_TAX",
] as const;

export const HOTEL_FEE_CHARGE_BASES = [
  "PER_ROOM_PER_NIGHT",
  "PER_PAX_PER_NIGHT",
  "PER_STAY",
  "FLAT",
  "PERCENT",
] as const;

export const HOTEL_GUEST_TYPES = [
  "ADULT",
  "CHILD",
  "CHILD_WITH_BED",
  "CHILD_NO_BED",
  "INFANT",
  "ROOM",
  "BOOKING",
] as const;

export const HOTEL_CHILD_POLICY_GUEST_TYPES = [
  "CHILD_WITH_BED",
  "CHILD_NO_BED",
  "INFANT",
] as const;

export const HOTEL_CHILD_POLICY_CHARGE_TYPES = [
  "FIXED",
  "PERCENT",
  "FREE",
] as const;

export const HOTEL_CHILD_POLICY_CHARGE_BASES = [
  "PER_CHILD_PER_NIGHT",
  "PER_CHILD_PER_STAY",
  "INCLUDED",
] as const;

export const HOTEL_ADJUSTMENT_TYPES = [
  "SINGLE_SUPPLEMENT",
  "MEAL_SUPPLEMENT",
  "GALA_DINNER",
  "REDUCTION",
  "DISCOUNT",
  "MARKUP",
  "EXTRA_ADULT",
] as const;

export const HOTEL_ADJUSTMENT_AMOUNT_TYPES = ["FIXED", "PERCENT"] as const;

export const HOTEL_ADJUSTMENT_CALCULATION_BASES = [
  "ROOM_RATE",
  "SUBTOTAL",
  "DOUBLE_RATE",
  "OCCUPANCY_RATE",
] as const;

export const HOTEL_SELL_RATE_CALCULATION_MODES = [
  "PERCENT_MARKUP",
  "FIXED_MARKUP",
  "FLAT_OVERRIDE",
] as const;

export const HOTEL_ROUNDING_MODES = [
  "NONE",
  "UP",
  "DOWN",
  "NEAREST",
] as const;

export const HOTEL_TRIP_MARKET_SCOPES = [
  "ALL_MARKETS",
  "SPECIFIC_MARKET",
  "SPECIFIC_COUNTRY",
] as const;

export type HotelContractStatus = (typeof HOTEL_CONTRACT_STATUSES)[number];
export type HotelContractType = (typeof HOTEL_CONTRACT_TYPES)[number];
export type HotelBoardBasis = (typeof HOTEL_BOARD_BASES)[number];
export type HotelRateType = (typeof HOTEL_RATE_TYPES)[number];
export type HotelRatePricingModel = (typeof HOTEL_RATE_PRICING_MODELS)[number];
export type HotelTaxMode = (typeof HOTEL_TAX_MODES)[number];
export type HotelPenaltyType = (typeof HOTEL_PENALTY_TYPES)[number];
export type HotelPenaltyBasis = (typeof HOTEL_PENALTY_BASES)[number];
export type HotelFeeType = (typeof HOTEL_FEE_TYPES)[number];
export type HotelFeeChargeBasis = (typeof HOTEL_FEE_CHARGE_BASES)[number];
export type HotelGuestType = (typeof HOTEL_GUEST_TYPES)[number];
export type HotelChildPolicyGuestType =
  (typeof HOTEL_CHILD_POLICY_GUEST_TYPES)[number];
export type HotelChildPolicyChargeType =
  (typeof HOTEL_CHILD_POLICY_CHARGE_TYPES)[number];
export type HotelChildPolicyChargeBasis =
  (typeof HOTEL_CHILD_POLICY_CHARGE_BASES)[number];
export type HotelAdjustmentType = (typeof HOTEL_ADJUSTMENT_TYPES)[number];
export type HotelAdjustmentAmountType =
  (typeof HOTEL_ADJUSTMENT_AMOUNT_TYPES)[number];
export type HotelAdjustmentCalculationBase =
  (typeof HOTEL_ADJUSTMENT_CALCULATION_BASES)[number];
export type HotelSellRateCalculationMode =
  (typeof HOTEL_SELL_RATE_CALCULATION_MODES)[number];
export type HotelRoundingMode = (typeof HOTEL_ROUNDING_MODES)[number];
export type HotelTripMarketScope = (typeof HOTEL_TRIP_MARKET_SCOPES)[number];

export type HotelContractRecord = {
  id: string;
  companyId: string;
  hotelId: string;
  code: string;
  name?: string | null;
  supplierOrgId: string | null;
  contractRef: string | null;
  contractType?: HotelContractType | string;
  currencyCode: string;
  validFrom: string;
  validTo: string;
  bookingFrom?: string | null;
  bookingTo?: string | null;
  releaseDaysDefault: number | null;
  marketScope: HotelTripMarketScope | string | null;
  guestNationalityScope?: string | null;
  remarks: string | null;
  revisionNo?: number;
  status: HotelContractStatus | string;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type HotelRatePlanRecord = {
  id: string;
  contractId: string;
  code: string;
  name: string;
  description?: string | null;
  rateType?: HotelRateType | string;
  boardBasis: HotelBoardBasis | string;
  pricingModel: HotelRatePricingModel | string;
  cancellationPolicyId: string | null;
  validFrom: string;
  validTo: string;
  bookingFrom?: string | null;
  bookingTo?: string | null;
  releaseDaysOverride: number | null;
  marketCode: string | null;
  guestNationalityScope: string | null;
  isRefundable: boolean;
  isCommissionable: boolean;
  isPackageOnly: boolean;
  priority?: number;
  status?: HotelContractStatus | string;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type HotelRoomRateRecord = {
  id: string;
  ratePlanId: string;
  hotelId: string;
  roomTypeId: string;
  code: string;
  validFrom: string;
  validTo: string;
  bookingFrom?: string | null;
  bookingTo?: string | null;
  marketCode?: string | null;
  guestNationalityScope?: string | null;
  baseOccupancyAdults: number;
  baseOccupancyChildren?: number;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy?: number | null;
  singleUseRate: string | null;
  doubleRate: string | null;
  tripleRate: string | null;
  quadRate: string | null;
  extraAdultRate: string | null;
  childWithBedRate: string | null;
  childNoBedRate: string | null;
  infantRate: string | null;
  singleSupplementRate: string | null;
  currencyCode: string;
  taxMode: HotelTaxMode | string;
  remarks?: string | null;
  status?: HotelContractStatus | string;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type HotelRateRestrictionRecord = {
  id: string;
  ratePlanId: string;
  roomTypeId: string | null;
  code: string;
  stayFrom: string;
  stayTo: string;
  bookingFrom: string | null;
  bookingTo: string | null;
  dayOfWeekMask?: string | null;
  minStay: number | null;
  maxStay: number | null;
  closedToArrival: boolean;
  closedToDeparture: boolean;
  stopSell: boolean;
  releaseDays: number | null;
  marketCode?: string | null;
  guestNationalityScope?: string | null;
  notes: string | null;
  status?: HotelContractStatus | string;
  isActive?: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type HotelFeeRuleRecord = {
  id: string;
  ratePlanId: string;
  roomTypeId?: string | null;
  code: string;
  name: string;
  description?: string | null;
  feeType: HotelFeeType | string;
  guestType?: HotelGuestType | string | null;
  chargeBasis: HotelFeeChargeBasis | string;
  amountType?: "FIXED" | "PERCENT";
  amount: string;
  currencyCode: string | null;
  taxMode?: HotelTaxMode | string;
  isMandatory: boolean;
  isIncludedInRate?: boolean;
  validFrom: string | null;
  validTo: string | null;
  bookingFrom?: string | null;
  bookingTo?: string | null;
  marketCode?: string | null;
  guestNationalityScope?: string | null;
  remarks: string | null;
  status?: HotelContractStatus | string;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type HotelInventoryDayRecord = {
  id: string;
  hotelId: string;
  roomTypeId: string;
  code: string;
  date: string;
  physicalInventory: number;
  contractedAllotment: number | null;
  soldRooms: number;
  blockedRooms: number;
  freeSale: boolean;
  stopSell: boolean;
  releaseDaysOverride: number | null;
  isClosed: boolean;
  status?: "ACTIVE" | "INACTIVE" | string;
  notes: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type HotelRateBlackoutRecord = {
  id: string;
  ratePlanId: string;
  roomTypeId: string | null;
  code: string;
  stayFrom: string;
  stayTo: string;
  bookingFrom: string | null;
  bookingTo: string | null;
  marketCode: string | null;
  guestNationalityScope: string | null;
  reason: string | null;
  status: HotelContractStatus | string;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type HotelRateChildPolicyRecord = {
  id: string;
  roomRateId: string;
  code: string;
  name: string;
  guestType: HotelChildPolicyGuestType | string;
  minAge: number;
  maxAge: number;
  chargeType: HotelChildPolicyChargeType | string;
  chargeBasis: HotelChildPolicyChargeBasis | string;
  amount: string;
  currencyCode: string | null;
  withBed: boolean;
  countsTowardOccupancy: boolean;
  freeChildrenPerRoom: number;
  maxChargeableChildren: number | null;
  status: HotelContractStatus | string;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type HotelRateAdjustmentRecord = {
  id: string;
  ratePlanId: string;
  roomRateId: string | null;
  roomTypeId: string | null;
  code: string;
  name: string;
  description: string | null;
  adjustmentType: HotelAdjustmentType | string;
  guestType: HotelGuestType | string | null;
  chargeBasis: HotelFeeChargeBasis | string;
  amountType: HotelAdjustmentAmountType | string;
  calculationBase: HotelAdjustmentCalculationBase | string | null;
  amount: string;
  currencyCode: string | null;
  occupancyFrom: number | null;
  occupancyTo: number | null;
  bookingFrom: string | null;
  bookingTo: string | null;
  validFrom: string | null;
  validTo: string | null;
  marketCode: string | null;
  guestNationalityScope: string | null;
  boardBasisScope: string | null;
  isMandatory: boolean;
  isCombinable: boolean;
  priority: number;
  status: HotelContractStatus | string;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type HotelSellRateRuleRecord = {
  id: string;
  sellRatePlanId: string;
  sourceRatePlanId: string;
  roomTypeId: string | null;
  code: string;
  name: string;
  calculationMode: HotelSellRateCalculationMode | string;
  amount: string;
  currencyCode: string | null;
  roundingMode: HotelRoundingMode | string;
  roundingTo: string | null;
  minSellAmount: string | null;
  maxSellAmount: string | null;
  validFrom: string | null;
  validTo: string | null;
  bookingFrom: string | null;
  bookingTo: string | null;
  marketCode: string | null;
  guestNationalityScope: string | null;
  status: HotelContractStatus | string;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type HotelContractInventoryDayRecord = {
  id: string;
  contractId: string;
  hotelId: string;
  roomTypeId: string;
  code: string;
  date: string;
  allottedRooms: number;
  soldRooms: number;
  blockedRooms: number;
  freeSale: boolean;
  stopSell: boolean;
  releaseDaysOverride: number | null;
  isClosed: boolean;
  status: "ACTIVE" | "INACTIVE" | string;
  notes: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type HotelCancellationPolicyRecord = {
  id: string;
  hotelId: string;
  code: string;
  name: string;
  description: string | null;
  noShowPolicy: string | null;
  afterCheckInPolicy: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type HotelCancellationPolicyRuleRecord = {
  id: string;
  policyId: string;
  code: string;
  fromDaysBefore: number | null;
  toDaysBefore: number | null;
  penaltyType: HotelPenaltyType | string;
  penaltyValue: string;
  basis: HotelPenaltyBasis | string | null;
  appliesOnNoShow: boolean;
  appliesAfterCheckIn: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type HotelResolvedContractRateOption = {
  contractId: string;
  contractCode: string;
  ratePlanId: string;
  ratePlanCode: string;
  ratePlanName: string;
  boardBasis: HotelBoardBasis | string;
  roomRateId: string;
  roomRateCode: string;
  roomTypeId: string;
  roomTypeCode: string;
  roomTypeName: string;
  stayDate: string;
  currencyCode: string;
  occupancy: {
    adults: number;
    children: number;
    maxAdults: number;
    maxChildren: number;
  };
  buyBaseAmount: number;
  buyTaxAmount: number;
  buyTotalAmount: number;
  singleSupplementRate: number | null;
  applicableFees: Array<{
    feeRuleId: string;
    code: string;
    name: string;
    feeType: HotelFeeType | string;
    chargeBasis: HotelFeeChargeBasis | string;
    amount: number;
    currencyCode: string | null;
  }>;
  applicableRestrictions: Array<{
    restrictionId: string;
    code: string;
    minStay: number | null;
    maxStay: number | null;
    closedToArrival: boolean;
    closedToDeparture: boolean;
    stopSell: boolean;
    releaseDays: number | null;
  }>;
};

export type HotelContractingBundle = {
  contracts: HotelContractRecord[];
  ratePlans: HotelRatePlanRecord[];
  roomRates: HotelRoomRateRecord[];
  restrictions: HotelRateRestrictionRecord[];
  blackouts: HotelRateBlackoutRecord[];
  childPolicies: HotelRateChildPolicyRecord[];
  adjustments: HotelRateAdjustmentRecord[];
  sellRateRules: HotelSellRateRuleRecord[];
  feeRules: HotelFeeRuleRecord[];
  cancellationPolicies: HotelCancellationPolicyRecord[];
  cancellationPolicyRules: HotelCancellationPolicyRuleRecord[];
  inventoryDays: HotelInventoryDayRecord[];
  contractInventoryDays: HotelContractInventoryDayRecord[];
};

export type AccommodationContractingViewData = {
  selectedHotel: {
    id: string;
    code: string;
    name: string;
    city: string;
    country: string;
    isActive: boolean;
  } | null;
  roomTypes: Array<{
    id: string;
    code: string;
    name: string;
    maxOccupancy: number;
    totalRooms: number;
    isActive: boolean;
  }>;
  contracting: HotelContractingBundle;
};
