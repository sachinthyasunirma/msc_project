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
    test: (pathname) => pathname.startsWith("/master-data/tour-categories"),
    doc: {
      title: "Tour Categories",
      summary:
        "Maintain classification in this order: Category Types -> Categories -> Category Rules.",
      steps: [
        "Create Category Types first (example: Theme, Comfort, Travel Style).",
        "Create Categories under each type and keep sort order business-friendly.",
        "Use Parent Category only when you need hierarchy inside the same type.",
        "Create Category Rules to define pricing and operational restrictions per category.",
      ],
      tabScenarios: [
        {
          tab: "Tour Category Types",
          purpose: "Defines the dimension of classification.",
          whenToUse: "Always first.",
          keyFields: ["Code", "Name", "Allow Multiple", "Sort Order", "Active"],
          validationNotes: [
            "Use stable code naming (e.g. THEME, COMFORT, STYLE).",
            "Enable Allow Multiple only when more than one category can be selected in same type.",
          ],
        },
        {
          tab: "Tour Categories",
          purpose: "Reusable values under each category type.",
          whenToUse: "After category types are ready.",
          keyFields: [
            "Code",
            "Type",
            "Name",
            "Parent (optional)",
            "Color/Icon (optional)",
            "Sort Order",
            "Active",
          ],
          validationNotes: [
            "Parent should be from the same type to keep hierarchy clean.",
            "Use color/icon only for UI meaning; do not encode business logic in those fields.",
          ],
        },
        {
          tab: "Tour Category Rules",
          purpose: "Business constraints and default commercial behavior per category.",
          whenToUse: "After categories are finalized.",
          keyFields: [
            "Code",
            "Category",
            "Default Markup %",
            "Hotel Star Min/Max",
            "Require Certified Guide",
            "Require Hotel/Transport/Itinerary/Activity/Ceremony",
            "Allow Multiple Hotels / Allow Without Hotel / Allow Without Transport",
            "Min/Max Nights and Min/Max Days",
            "Notes",
            "Active",
          ],
          validationNotes: [
            "Keep star range realistic and consistent with hotel master standards.",
            "If Require Hotel = true, Allow Without Hotel must be false.",
            "If Require Transport = true, Allow Without Transport must be false.",
            "Min values cannot be greater than Max values.",
            "Use notes to document why a rule exists for audit clarity.",
          ],
        },
      ],
      fields: [
        {
          field: "Type",
          required: true,
          instruction: "Select the category type first; this controls valid parent options.",
        },
        {
          field: "Parent Category",
          instruction: "Optional. Use only for hierarchical grouping within the same type.",
        },
        {
          field: "Default Markup %",
          instruction: "Optional baseline markup that downstream modules may reference.",
        },
        {
          field: "Structural Requirement Flags",
          instruction:
            "Use require/allow flags to define mandatory components by tour type (hotel/transport/itinerary/activity/ceremony).",
        },
      ],
      checklist: commonChecklist,
      tips: [
        "Keep category codes short and stable for reporting.",
        "Deactivate old categories instead of deleting if they were already used.",
      ],
    },
  },
  {
    test: (pathname) => pathname.startsWith("/master-data/business-network"),
    doc: {
      title: "Business Network",
      summary:
        "Set up operator and market data in sequence so Pre-Tour, pricing, and contracts work correctly.",
      steps: [
        "Start in Organizations tab and create business entities first.",
        "Create OPERATOR (or SUPPLIER) organizations for service providers and DMCs.",
        "Create MARKET organizations for agents/resellers/corporate demand channels.",
        "Open Operator Profiles and attach one profile to each operator organization.",
        "Open Market Profiles and attach one profile to each market organization.",
        "Open Organization Members and assign your internal users to each organization with correct role.",
        "Open Operator-Market Contracts and map operator <-> market with pricing and credit terms.",
        "After this setup, use these records in Pre-Tour header: Operator + Market.",
      ],
      tabScenarios: [
        {
          tab: "Organizations",
          purpose: "Create base business entities used by all other tabs.",
          whenToUse: "Always first.",
          keyFields: [
            "Type (OPERATOR / MARKET / SUPPLIER / PLATFORM)",
            "Code",
            "Name",
            "Base Currency",
            "Country/City",
            "Active",
          ],
          validationNotes: [
            "Use OPERATOR for DMC/provider, MARKET for selling partner/agent.",
            "Do not use same entity as both Operator and Market in contracts.",
          ],
        },
        {
          tab: "Operator Profiles",
          purpose: "Define how an operator works operationally and financially.",
          whenToUse: "After OPERATOR/SUPPLIER organizations exist.",
          keyFields: [
            "Organization (must be OPERATOR or SUPPLIER)",
            "Operator Kind",
            "Booking Mode",
            "Lead Time Hours",
            "Payout Mode / Payout Cycle",
            "Service Regions JSON / Languages JSON",
          ],
          validationNotes: [
            "If organization type is MARKET, it cannot be selected here.",
            "Use JSON arrays for regions/languages, e.g. [\"Sri Lanka\"], [\"en\",\"de\"].",
          ],
        },
        {
          tab: "Market Profiles",
          purpose: "Define commercial behavior for each market/agent.",
          whenToUse: "After MARKET organizations exist.",
          keyFields: [
            "Organization (must be MARKET)",
            "Agency Type",
            "Preferred Currency",
            "Credit Enabled / Credit Limit / Payment Term Days",
            "Default Markup Percent",
          ],
          validationNotes: [
            "If credit is enabled, maintain credit limit and payment terms.",
            "Default markup can be overridden by contract-level pricing terms.",
          ],
        },
        {
          tab: "Organization Members",
          purpose: "Map internal users to an organization with operational roles.",
          whenToUse: "After organizations and users are ready.",
          keyFields: ["Organization", "User", "Role", "Active"],
          validationNotes: [
            "Role list changes by organization type (operator roles, market roles, etc.).",
            "Assign only users from your company.",
          ],
        },
        {
          tab: "Operator-Market Contracts",
          purpose: "Commercial contract between one operator and one market.",
          whenToUse: "After operator profile and market profile setup.",
          keyFields: [
            "Operator Organization",
            "Market Organization",
            "Status",
            "Pricing Mode (MARKUP / COMMISSION / NET_ONLY)",
            "Default Markup/Commission",
            "Credit Enabled / Credit Limit / Payment Term Days",
            "Effective From / Effective To",
          ],
          validationNotes: [
            "Operator must be OPERATOR/SUPPLIER and Market must be MARKET.",
            "Use MARKUP for sell-up model, COMMISSION for payout model, NET_ONLY for pure net rates.",
          ],
        },
      ],
      fields: [
        {
          field: "Organization Type",
          required: true,
          example: "OPERATOR / MARKET / SUPPLIER / PLATFORM",
          instruction: "This controls where the organization can be used in profiles and contracts.",
        },
        {
          field: "Operator Organization",
          required: true,
          instruction: "Must be an OPERATOR or SUPPLIER organization.",
        },
        {
          field: "Market Organization",
          required: true,
          instruction: "Must be a MARKET organization.",
        },
        {
          field: "Pricing Mode",
          required: true,
          example: "MARKUP / COMMISSION / NET_ONLY",
          instruction: "Pick the commercial model used for this operator-market pair.",
        },
      ],
      checklist: [
        "Create at least one OPERATOR and one MARKET organization.",
        "Ensure each selected organization has its matching profile tab completed.",
        "Assign owner users in Organization Members before operational usage.",
        "Keep contract effective dates current and avoid conflicting active contracts.",
      ],
      tips: [
        "Use a naming convention for codes (e.g. OP-*, MK-*).",
        "Start with one operator-market contract and validate Pre-Tour flow before bulk entry.",
      ],
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
