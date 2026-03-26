export type OnTourStatus =
  | "DRAFT"
  | "PENDING_CONFIRMATION"
  | "CONFIRMED"
  | "READY_TO_OPERATE"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CLOSED"
  | "CANCELED";

export type OnTourServiceConfirmationStatus =
  | "UNREQUESTED"
  | "REQUESTED"
  | "OPTIONED"
  | "PARTIALLY_CONFIRMED"
  | "CONFIRMED"
  | "WAITLISTED"
  | "AMENDED"
  | "REPLACED"
  | "CANCELED"
  | "REJECTED";

export type OnTourServiceType =
  | "TRANSPORT"
  | "ACCOMMODATION"
  | "ACTIVITY"
  | "GUIDE"
  | "SUPPLEMENT"
  | "MISC";

export type OnTourSubgroupType =
  | "MAIN"
  | "SPLIT"
  | "OPTIONAL_EXCURSION"
  | "PRIVATE_EXTENSION"
  | "ROOMING_ONLY";

export type OnTourTravelerType =
  | "ADULT"
  | "CHILD"
  | "INFANT"
  | "FOC"
  | "TOUR_LEADER"
  | "ESCORT";

export type OnTourChargeBasis =
  | "PER_PAX"
  | "PER_CHILD"
  | "PER_INFANT"
  | "PER_ROOM"
  | "PER_PERSON_PER_NIGHT"
  | "PER_UNIT"
  | "PER_VEHICLE"
  | "PER_DAY"
  | "PER_GROUP"
  | "FLAT";

export type OnTourTabKey =
  | "summary"
  | "travelers"
  | "groups"
  | "rooming"
  | "services"
  | "operations"
  | "finance"
  | "audit";

export type OnTourListFilters = {
  q?: string;
  status?: string;
  page?: number;
  limit?: number;
};

export type OnTourRecord = {
  id: string;
  code: string;
  bookingNo: string;
  departureCode: string;
  title: string;
  status: OnTourStatus;
  confirmedStartDate: string;
  confirmedEndDate: string;
  preferredLanguage?: string | null;
  marketOrgName?: string | null;
  operatorOrgName?: string | null;
  totalPax: number;
  adults: number;
  children: number;
  infants: number;
  foc: number;
  currencyCode: string;
  quotedGrandTotal: string;
  confirmedGrandTotal: string;
  actualGrandTotal: string;
  updatedAt?: string | null;
  isLocked?: boolean;
};

export type OnTourDashboardSummary = {
  statusCounts: Array<{ status: string; count: number }>;
  confirmationCounts: Array<{ status: string; count: number }>;
  pendingMetrics: {
    unassignedTravelers: number;
    unconfirmedServices: number;
    openRequisitions: number;
    missingRooming: number;
    pendingVehicles: number;
    pendingGuides: number;
  };
  financials: {
    quotedRevenue: string;
    confirmedCost: string;
    actualCost: string;
    actualMargin: string;
  };
};

export type OnTourTravelerRecord = {
  id: string;
  code: string;
  fullName: string;
  travelerType: OnTourTravelerType;
  nationality?: string | null;
  passportNo?: string | null;
  roomingGender?: string | null;
  dietaryNotes?: string | null;
  medicalNotes?: string | null;
  mobilityNotes?: string | null;
  isGroupLeader?: boolean;
  isTourLeader?: boolean;
  requiresChildSeat?: boolean;
  isActive?: boolean;
};

export type OnTourGroupRecord = {
  id: string;
  code: string;
  groupName: string;
  subgroupType: OnTourSubgroupType;
  startDate?: string | null;
  endDate?: string | null;
  travelerCount?: number;
  notes?: string | null;
  isPrimary?: boolean;
};

export type OnTourRoomAllocationRecord = {
  id: string;
  roomLabel: string;
  occupancyType: string;
  roomNumber?: string | null;
  mealPlan?: string | null;
  travelerNames?: string[];
  adultCount?: number;
  childCount?: number;
  extraBedCount?: number;
  isSingleSupplementApplied?: boolean;
};

export type OnTourServiceRecord = {
  id: string;
  code: string;
  title: string;
  serviceType: OnTourServiceType;
  serviceMode: string;
  chargeBasis: OnTourChargeBasis;
  confirmationStatus: OnTourServiceConfirmationStatus;
  supplierOrgName?: string | null;
  dayNumber?: number | null;
  groupName?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  quotedTotalAmount: string;
  confirmedTotalAmount: string;
  actualTotalAmount: string;
};

export type OnTourRequisitionRecord = {
  id: string;
  requisitionNo: string;
  supplierName?: string | null;
  requisitionType: string;
  serviceType?: string | null;
  status: string;
  requestDate?: string | null;
  totalAmount: string;
};

export type OnTourVoucherRecord = {
  id: string;
  voucherNo: string;
  supplierName?: string | null;
  status: string;
  voucherDate?: string | null;
  serviceDate?: string | null;
};

export type OnTourVehicleAllocationRecord = {
  id: string;
  vehicleCategoryName?: string | null;
  vehicleTypeName?: string | null;
  vehicleRegNo?: string | null;
  driverName?: string | null;
  confirmationStatus: string;
  status: string;
};

export type OnTourGuideAllocationRecord = {
  id: string;
  guideName?: string | null;
  languageName?: string | null;
  supplierName?: string | null;
  confirmationStatus: string;
  status: string;
};

export type OnTourFinanceSummary = {
  invoices: Array<{
    id: string;
    invoiceNo: string;
    status: string;
    invoiceDate?: string | null;
    totalAmount: string;
  }>;
  supplierBills: Array<{
    id: string;
    billNo: string;
    status: string;
    billDate?: string | null;
    totalAmount: string;
  }>;
  reconciliation?: {
    quotedRevenue: string;
    invoicedRevenue: string;
    quotedCost: string;
    actualCost: string;
    quotedMargin: string;
    actualMargin: string;
  } | null;
};

export type OnTourAuditEntry = {
  id: string;
  action: string;
  actorName?: string | null;
  createdAt: string;
  summary: string;
};

export type OnTourDetailData = {
  onTour: OnTourRecord;
  dashboard: OnTourDashboardSummary;
  travelers: OnTourTravelerRecord[];
  groups: OnTourGroupRecord[];
  rooming: OnTourRoomAllocationRecord[];
  services: OnTourServiceRecord[];
  requisitions: OnTourRequisitionRecord[];
  vouchers: OnTourVoucherRecord[];
  vehicleAllocations: OnTourVehicleAllocationRecord[];
  guideAllocations: OnTourGuideAllocationRecord[];
  finance: OnTourFinanceSummary;
  audit: OnTourAuditEntry[];
};

export type OnTourListResponse = {
  rows: OnTourRecord[];
  total: number;
  page: number;
  limit: number;
};

export type CreateOnTourSubgroupInput = {
  onTourId: string;
  groupName: string;
  subgroupType: OnTourSubgroupType;
  startDate?: string;
  endDate?: string;
  preferredLanguage?: string;
  notes?: string;
};

export type CreateOnTourTravelerInput = {
  onTourId: string;
  travelerType: OnTourTravelerType;
  fullName: string;
  nationality?: string;
  passportNo?: string;
  dietaryNotes?: string;
  medicalNotes?: string;
  mobilityNotes?: string;
  roomingGender?: string;
  requiresChildSeat?: boolean;
  isGroupLeader?: boolean;
  isTourLeader?: boolean;
};

export type AssignTravelersToGroupInput = {
  onTourId: string;
  groupId: string;
  travelerIds: string[];
  effectiveFrom?: string;
  effectiveTo?: string;
};

export type ConvertPreTourToOnTourInput = {
  preTourPlanId: string;
};

export type ConvertPreTourToOnTourResponse = {
  onTourId: string;
  created: boolean;
};
