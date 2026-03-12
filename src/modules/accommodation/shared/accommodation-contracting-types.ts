export const HOTEL_CONTRACT_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "SUSPENDED",
  "EXPIRED",
  "ARCHIVED",
] as const;

export const HOTEL_BOARD_BASES = ["RO", "BB", "HB", "FB", "AI"] as const;

export const HOTEL_RATE_PRICING_MODELS = ["PER_ROOM_PER_NIGHT"] as const;

export const HOTEL_TAX_MODES = ["EXCLUSIVE", "INCLUSIVE"] as const;

export const HOTEL_PENALTY_TYPES = ["PERCENT", "NIGHT", "FIXED", "FULL_STAY"] as const;

export const HOTEL_PENALTY_BASES = ["ROOM_ONLY", "TOTAL_STAY", "FIRST_NIGHT"] as const;

export const HOTEL_FEE_TYPES = [
  "TAX",
  "LEVY",
  "SERVICE_CHARGE",
  "GALA_DINNER",
  "RESORT_FEE",
  "SUPPLEMENT",
] as const;

export const HOTEL_FEE_CHARGE_BASES = [
  "PER_ROOM_PER_NIGHT",
  "PER_PAX_PER_NIGHT",
  "PER_STAY",
  "FLAT",
] as const;

export const HOTEL_TRIP_MARKET_SCOPES = [
  "ALL_MARKETS",
  "SPECIFIC_MARKET",
  "SPECIFIC_COUNTRY",
] as const;

export type HotelContractStatus = (typeof HOTEL_CONTRACT_STATUSES)[number];
export type HotelBoardBasis = (typeof HOTEL_BOARD_BASES)[number];
export type HotelRatePricingModel = (typeof HOTEL_RATE_PRICING_MODELS)[number];
export type HotelTaxMode = (typeof HOTEL_TAX_MODES)[number];
export type HotelPenaltyType = (typeof HOTEL_PENALTY_TYPES)[number];
export type HotelPenaltyBasis = (typeof HOTEL_PENALTY_BASES)[number];
export type HotelFeeType = (typeof HOTEL_FEE_TYPES)[number];
export type HotelFeeChargeBasis = (typeof HOTEL_FEE_CHARGE_BASES)[number];
export type HotelTripMarketScope = (typeof HOTEL_TRIP_MARKET_SCOPES)[number];

export type HotelContractRecord = {
  id: string;
  companyId: string;
  hotelId: string;
  code: string;
  supplierOrgId: string | null;
  contractRef: string | null;
  currencyCode: string;
  validFrom: string;
  validTo: string;
  releaseDaysDefault: number | null;
  marketScope: HotelTripMarketScope | string | null;
  remarks: string | null;
  status: HotelContractStatus | string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type HotelRatePlanRecord = {
  id: string;
  contractId: string;
  code: string;
  name: string;
  boardBasis: HotelBoardBasis | string;
  pricingModel: HotelRatePricingModel | string;
  cancellationPolicyId: string | null;
  validFrom: string;
  validTo: string;
  releaseDaysOverride: number | null;
  marketCode: string | null;
  guestNationalityScope: string | null;
  isRefundable: boolean;
  isCommissionable: boolean;
  isPackageOnly: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type HotelRoomRateRecord = {
  id: string;
  ratePlanId: string;
  hotelId: string;
  roomTypeId: string;
  code: string;
  validFrom: string;
  validTo: string;
  baseOccupancyAdults: number;
  maxAdults: number;
  maxChildren: number;
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
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
  minStay: number | null;
  maxStay: number | null;
  closedToArrival: boolean;
  closedToDeparture: boolean;
  stopSell: boolean;
  releaseDays: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type HotelFeeRuleRecord = {
  id: string;
  ratePlanId: string;
  code: string;
  name: string;
  feeType: HotelFeeType | string;
  chargeBasis: HotelFeeChargeBasis | string;
  amount: string;
  currencyCode: string | null;
  isMandatory: boolean;
  validFrom: string | null;
  validTo: string | null;
  remarks: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
  notes: string | null;
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
  updatedAt: string;
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
  feeRules: HotelFeeRuleRecord[];
  cancellationPolicies: HotelCancellationPolicyRecord[];
  cancellationPolicyRules: HotelCancellationPolicyRuleRecord[];
  inventoryDays: HotelInventoryDayRecord[];
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
