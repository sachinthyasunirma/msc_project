export type ScreenHelpField = {
  field: string;
  required?: boolean;
  example?: string;
  instruction: string;
};

export type ScreenHelpTabScenario = {
  tab: string;
  purpose: string;
  whenToUse: string;
  keyFields: string[];
  validationNotes?: string[];
};

export type ScreenHelpDoc = {
  title: string;
  summary: string;
  steps: string[];
  tabScenarios?: ScreenHelpTabScenario[];
  fields?: ScreenHelpField[];
  checklist?: string[];
  tips?: string[];
};

type HelpMatcher = {
  test: (pathname: string) => boolean;
  doc: ScreenHelpDoc;
};

const commonChecklist = [
  "Complete all mandatory fields before Save.",
  "Use unique codes (avoid duplicate code per company).",
  "Set Active status correctly (avoid deleting historical records).",
  "After Save, use Manage button to configure child records.",
];

const MATCHERS: HelpMatcher[] = [
  {
    test: (pathname) => pathname === "/",
    doc: {
      title: "Dashboard",
      summary: "Use this area to navigate quickly and verify access mode.",
      steps: [
        "Use Search Navigation (Cmd/Ctrl + K) to jump to any module.",
        "Check view-only badge at bottom-right before editing.",
        "Open master screens from sidebar and maintain records module by module.",
      ],
      checklist: commonChecklist,
    },
  },
  {
    test: (pathname) => pathname.startsWith("/master-data/accommodations"),
    doc: {
      title: "Accommodations",
      summary: "Create accommodation header first, then room configurations using Manage.",
      steps: [
        "Click Add Record and enter accommodation header details.",
        "Save header, then click Manage on that row.",
        "In Manage: maintain room types, seasons, and room rates.",
        "Add rate header first, then add rate lines under that header.",
      ],
      fields: [
        {
          field: "Code",
          required: true,
          example: "ACC_HILTON_COL",
          instruction: "Use stable unique code for identification and integrations.",
        },
        {
          field: "Name",
          required: true,
          instruction: "Use business-facing name shown in planning screens.",
        },
        {
          field: "Country / City",
          instruction: "Add consistent location naming to support filtering.",
        },
        {
          field: "Active",
          instruction: "Disable if no longer used; keep for reporting history.",
        },
      ],
      checklist: commonChecklist,
      tips: ["Create seasons before rate headers to avoid lookup errors."],
    },
  },
  {
    test: (pathname) => pathname.startsWith("/hotels"),
    doc: {
      title: "Hotels",
      summary: "Maintain hotel master first, then room structures in manage flow.",
      steps: [
        "Create hotel header with code, name, and base details.",
        "Open Manage to maintain room types, room rates, and availability.",
      ],
      fields: [
        {
          field: "Hotel Code",
          required: true,
          example: "HTL_KANDY_001",
          instruction: "Use unique code for integrations and reporting.",
        },
      ],
      checklist: commonChecklist,
    },
  },
  {
    test: (pathname) => pathname.startsWith("/master-data/seasons"),
    doc: {
      title: "Seasons",
      summary: "Seasons are reused by multiple rate modules.",
      steps: [
        "Create season code/name and effective period.",
        "Avoid overlapping season windows in same context.",
      ],
      fields: [
        {
          field: "Season Code",
          required: true,
          example: "PEAK_2026",
          instruction: "Use short stable code for referencing in rates.",
        },
      ],
      checklist: commonChecklist,
    },
  },
  {
    test: (pathname) => pathname.startsWith("/master-data/transports"),
    doc: {
      title: "Transport Master",
      summary:
        "Maintain transport in this order: Locations -> Vehicle Categories -> Vehicle Types -> Rates/Expenses tabs.",
      steps: [
        "Create locations, vehicle categories, and vehicle types.",
        "Add transport rates with pricing model and effective range.",
        "Use Manage flow for related expenses and passenger/baggage pricing.",
      ],
      tabScenarios: [
        {
          tab: "Locations",
          purpose: "Master list of pickup/drop points used by all transport pricing tabs.",
          whenToUse:
            "Use first before any rate/expense setup. Required for from/to/location references.",
          keyFields: ["Code", "Name", "Country", "Region", "Geo JSON", "Active"],
          validationNotes: [
            "Code should be unique and stable (e.g. CMB_AIRPORT).",
            "Keep location names consistent to avoid duplicate lookups.",
          ],
        },
        {
          tab: "Vehicle Categories",
          purpose: "High-level grouping for pricing and filtering (Sedan, Van, SUV, Coach).",
          whenToUse:
            "Use before Vehicle Types. Helps apply rates at category level when exact type is optional.",
          keyFields: ["Code", "Name", "Sort Order", "Active"],
        },
        {
          tab: "Vehicle Types",
          purpose: "Detailed vehicle records with capacity for operations and pricing.",
          whenToUse:
            "Use after categories are ready. Use when pricing needs specific vehicle mapping.",
          keyFields: [
            "Code",
            "Name",
            "Category",
            "Pax Capacity",
            "Baggage Capacity",
            "Features JSON",
            "Active",
          ],
          validationNotes: [
            "Category is mandatory.",
            "Pax capacity should reflect real booking constraints.",
          ],
        },
        {
          tab: "Location Rates",
          purpose: "Point-to-point transport selling price between two locations.",
          whenToUse:
            "Use for base route pricing. Supports FIXED, PER_KM, and SLAB models.",
          keyFields: [
            "From Location",
            "To Location",
            "Pricing Model",
            "Currency",
            "Fixed Rate/Per KM Rate/Slabs",
            "Effective From/To",
          ],
          validationNotes: [
            "From and To cannot be the same for normal routes.",
            "Fill only fields relevant to selected pricing model.",
            "Avoid overlapping effective dates for same route and context.",
          ],
        },
        {
          tab: "Location Expenses",
          purpose: "Operational cost items (parking, toll, permit, standby) by location.",
          whenToUse:
            "Use when transport costing needs location-level expense additions.",
          keyFields: [
            "Location",
            "Expense Name",
            "Expense Type",
            "Amount",
            "Currency",
            "Vehicle Category/Type (optional)",
            "Effective From/To",
          ],
          validationNotes: [
            "Amount is mandatory.",
            "Use effective ranges for period-based expense changes.",
          ],
        },
        {
          tab: "Pax Vehicle Rates",
          purpose: "Passenger-based pricing rules when amount varies by number of travelers.",
          whenToUse:
            "Use for PER_PAX or TIERED pricing where total depends on pax count.",
          keyFields: [
            "From Location",
            "To Location",
            "Pricing Model (PER_PAX/TIERED)",
            "Per Pax Rate/Tiers JSON",
            "Min Charge",
            "Effective From/To",
          ],
          validationNotes: [
            "Use Tiers JSON only when pricing model is TIERED.",
            "Set min charge to protect low-pax scenarios.",
          ],
        },
        {
          tab: "Baggage Rates",
          purpose: "Pricing for baggage movement by BAG/KG with unit, fixed, or tiered model.",
          whenToUse:
            "Use when baggage transport is sold separately from passenger rate.",
          keyFields: [
            "From Location",
            "To Location",
            "Unit (BAG/KG)",
            "Pricing Model",
            "Per Unit Rate/Fixed Rate/Tiers JSON",
            "Min Charge",
            "Effective From/To",
          ],
          validationNotes: [
            "Ensure unit matches operational handling (BAG vs KG).",
            "Avoid overlapping ranges for same route + unit + vehicle context.",
          ],
        },
      ],
      fields: [
        {
          field: "From / To Location",
          required: true,
          instruction: "Both must exist in active location master.",
        },
        {
          field: "Pricing Model",
          required: true,
          example: "FIXED / PER_KM / SLAB",
          instruction: "Select one model and fill relevant amount fields only.",
        },
        {
          field: "Effective From / To",
          instruction: "Avoid overlapping ranges for same route and vehicle context.",
        },
      ],
      checklist: commonChecklist,
    },
  },
  {
    test: (pathname) => pathname.startsWith("/master-data/activities"),
    doc: {
      title: "Activities",
      summary: "Add activity header first; maintain rates, availability, supplements in Manage.",
      steps: [
        "Create activity with basic details and location.",
        "Save and use Manage button for advanced setup.",
        "Configure rates and availability with effective date logic.",
      ],
      fields: [
        {
          field: "Type",
          required: true,
          example: "ACTIVITY / SUPPLEMENT / MISCELLANEOUS / OTHER",
          instruction: "Type is fixed business classification.",
        },
        {
          field: "Duration / Pax",
          instruction: "Use realistic defaults to support quotation calculations.",
        },
        {
          field: "Active",
          instruction: "Inactive records are hidden from planning selections.",
        },
      ],
      checklist: commonChecklist,
    },
  },
  {
    test: (pathname) => pathname.startsWith("/master-data/guides"),
    doc: {
      title: "Guides",
      summary: "Create guide profile then complete qualifications/rates from Manage.",
      steps: [
        "Add guide basic profile and contact details.",
        "Save and open Manage to configure languages, coverage, and rates.",
        "Set availability and blackout dates before assignments.",
      ],
      fields: [
        {
          field: "Guide Type",
          required: true,
          example: "INDIVIDUAL / COMPANY / INTERNAL",
          instruction: "Choose engagement model used for operations.",
        },
        {
          field: "Country Code",
          example: "LK",
          instruction: "Use 2-letter country code format.",
        },
        {
          field: "Base Currency",
          instruction: "Should match likely payout currency for the guide.",
        },
      ],
      checklist: commonChecklist,
    },
  },
  {
    test: (pathname) => pathname.startsWith("/master-data/currencies"),
    doc: {
      title: "Currency & FX",
      summary: "Create currencies/providers first; then maintain exchange rates and money settings.",
      steps: [
        "In list screen: add Currencies and FX Providers.",
        "Click Manage on currency row for exchange rates and money settings.",
        "Add exchange rates with effective date ranges.",
        "System blocks overlapping FX ranges for same pair/provider/rate type.",
      ],
      fields: [
        {
          field: "Currency Code",
          required: true,
          example: "USD / EUR / LKR",
          instruction: "Use ISO code in uppercase.",
        },
        {
          field: "Exchange Rate Effective From/To",
          required: true,
          instruction: "Date range is used by pre-tour start date to pick FX.",
        },
        {
          field: "Rate Type",
          example: "MID / BUY / SELL",
          instruction: "Use MID for planning unless treasury rules differ.",
        },
      ],
      checklist: commonChecklist,
      tips: [
        "If no FX exists for pre-tour start date, pre-tour uses 0 and allows manual rate.",
      ],
    },
  },
  {
    test: (pathname) => pathname.startsWith("/master-data/pre-tours"),
    doc: {
      title: "Pre-Tour Planning",
      summary: "Create header first, then configure day-wise items and pricing.",
      steps: [
        "Add pre-tour header (operator, market, date range, currency).",
        "Save and click Manage to open day-wise planning.",
        "Days are auto-generated from header date range.",
        "Add day items (transport/activity/accommodation/etc.) and order them.",
      ],
      fields: [
        {
          field: "Reference No",
          instruction: "Auto-generated for identification and version grouping.",
        },
        {
          field: "Operator / Market",
          required: true,
          instruction: "Both must be selected and cannot be the same organization.",
        },
        {
          field: "Currency",
          required: true,
          instruction: "Must exist in company active currency master.",
        },
        {
          field: "FX Mode / FX Rate",
          instruction:
            "AUTO picks date-range FX by start date; MANUAL lets user enter fixed rate.",
        },
      ],
      checklist: [
        "Header start date must be <= end date.",
        "Confirm day-wise item sequence for each day.",
        "Use version/copy options in list row for alternative quotations.",
      ],
    },
  },
  {
    test: (pathname) => pathname.startsWith("/master-data/taxes"),
    doc: {
      title: "Tax Master",
      summary:
        "Maintain tax setup in sequence: Jurisdictions -> Taxes -> Rule Sets -> Rules -> Tax Rates/Rule Taxes.",
      steps: [
        "Create jurisdictions and tax codes first.",
        "Maintain tax rates with effective date ranges.",
        "Create tax rules by service/customer context.",
      ],
      tabScenarios: [
        {
          tab: "Taxes",
          purpose: "Core tax definitions such as VAT, levy, service charge, withholding.",
          whenToUse: "Use early in setup before rates and rule-tax mappings.",
          keyFields: ["Code", "Name", "Tax Type", "Scope", "Recoverable", "Active"],
          validationNotes: [
            "Code should be unique and stable (e.g. VAT_LK).",
            "Scope should match accounting behavior (OUTPUT/INPUT/WITHHOLDING).",
          ],
        },
        {
          tab: "Tax Jurisdictions",
          purpose: "Geographic tax context (country/region/city).",
          whenToUse: "Create before tax rates and rules.",
          keyFields: ["Code", "Country Code", "Region", "City", "Name", "Active"],
          validationNotes: [
            "Country code should be ISO-2 format.",
            "Use clear jurisdiction code hierarchy (e.g. LK-WP-COLOMBO).",
          ],
        },
        {
          tab: "Tax Rule Sets",
          purpose: "Version/group container for tax rules.",
          whenToUse: "Use when you want release/version based tax logic.",
          keyFields: ["Code", "Name", "Active"],
        },
        {
          tab: "Tax Rules",
          purpose: "Determines which rule applies by service and customer context.",
          whenToUse:
            "Use after jurisdictions and optional rule sets are created.",
          keyFields: [
            "Rule Set (optional)",
            "Name",
            "Jurisdiction",
            "Service Type",
            "Customer Type",
            "Traveler Residency",
            "Tax Inclusion",
            "Effective From/To",
            "Priority",
          ],
          validationNotes: [
            "Higher-priority matching rules should use smaller priority number.",
            "Effective dates should not clash for same matching context.",
          ],
        },
        {
          tab: "Tax Rates (Manage)",
          purpose: "Stores actual rate % or fixed amount by jurisdiction and effective range.",
          whenToUse: "Open from Tax Manage screen to maintain rates for selected tax.",
          keyFields: [
            "Tax",
            "Jurisdiction",
            "Rate Type",
            "Rate Percent/Rate Amount",
            "Currency (for FIXED)",
            "Effective From/To",
          ],
          validationNotes: [
            "If Rate Type is FIXED, set rate amount and currency.",
            "If Rate Type is PERCENT, set rate percent.",
          ],
        },
        {
          tab: "Tax Rule Taxes (Manage)",
          purpose: "Maps taxes into a selected rule with apply order and inclusion flags.",
          whenToUse: "Open from Tax Manage screen after rules and taxes are ready.",
          keyFields: [
            "Rule",
            "Tax",
            "Priority",
            "Apply On",
            "Inclusive",
            "Rounding Mode/Scale",
          ],
          validationNotes: [
            "Priority controls tax application sequence.",
            "Inclusive flag must align with commercial price mode strategy.",
          ],
        },
        {
          tab: "Document FX Snapshots",
          purpose: "Freeze FX used in documents (quotation/booking/invoice).",
          whenToUse: "System/audit level records during document pricing.",
          keyFields: ["Document Type", "Document ID", "Base/Quote Currency", "Rate", "As Of"],
        },
        {
          tab: "Document Tax Snapshots",
          purpose: "Freeze summarized tax totals for a document.",
          whenToUse: "System/audit level records generated during tax calculation.",
          keyFields: [
            "Document Type",
            "Document ID",
            "Jurisdiction Code",
            "Price Mode",
            "Currency Code",
            "Taxable/Tax/Total Amount",
          ],
        },
        {
          tab: "Document Tax Lines",
          purpose: "Line-level breakdown of applied taxes from snapshot.",
          whenToUse: "System/audit detail for financial traceability.",
          keyFields: ["Snapshot", "Tax Code", "Rate Type", "Apply On", "Priority", "Tax Base", "Tax Amount"],
        },
      ],
      fields: [
        {
          field: "Tax Code",
          required: true,
          example: "VAT / TOUR_LEVY",
          instruction: "Keep code stable for finance and reporting mapping.",
        },
        {
          field: "Rate Type",
          example: "PERCENT / FIXED",
          instruction: "If FIXED, ensure currency is selected.",
        },
      ],
      checklist: commonChecklist,
    },
  },
  {
    test: (pathname) => pathname.startsWith("/master-data/business-network"),
    doc: {
      title: "Business Network",
      summary: "Maintain operator and market entities used in pre-tour and contracts.",
      steps: [
        "Create organization with correct type.",
        "Maintain membership/contracts on related screens.",
        "Use these records in pre-tour operator/market fields.",
      ],
      fields: [
        {
          field: "Organization Type",
          required: true,
          example: "OPERATOR / MARKET / SUPPLIER",
          instruction: "Select type carefully; it drives downstream validations.",
        },
      ],
      checklist: commonChecklist,
    },
  },
  {
    test: (pathname) => pathname.startsWith("/configuration/company"),
    doc: {
      title: "Company Configuration",
      summary: "Manage users, roles, and company-level controls.",
      steps: [
        "Review secret and manager privilege codes.",
        "Assign role and read-only permissions for each user.",
        "Set inactive to remove user from company access.",
        "Enable/disable screen help documentation for the whole company.",
      ],
      fields: [
        {
          field: "Role",
          required: true,
          example: "ADMIN / MANAGER / USER",
          instruction: "Only admin/manager can manage user access.",
        },
        {
          field: "Read Only",
          instruction: "Read-only users cannot create/update/delete records.",
        },
        {
          field: "Screen Help",
          instruction: "Company-level toggle to show/hide Help button on all screens.",
        },
      ],
      checklist: [
        "Never demote your own last admin account.",
        "Confirm inactive action because user loses company access.",
      ],
    },
  },
];

export function getScreenHelpDoc(pathname: string): ScreenHelpDoc | null {
  for (const matcher of MATCHERS) {
    if (matcher.test(pathname)) return matcher.doc;
  }
  return null;
}
