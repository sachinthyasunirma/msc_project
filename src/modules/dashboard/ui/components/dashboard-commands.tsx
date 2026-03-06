import { Dispatch, SetStateAction } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CircleDollarSign,
  Bus,
  UserRound,
  BriefcaseBusiness,
  CarFront,
  DollarSign,
  FileText,
  GaugeCircle,
  Home,
  Landmark,
  LifeBuoy,
  MapPin,
  Hotel,
  CalendarClock,
  Settings2,
  ShieldCheck,
  Trash2,
  Users,
  CalendarRange,
  Bell,
} from "lucide-react";

import {
  CommandEmpty,
  CommandGroup,
  CommandResponsiveDialog,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";

interface Props {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
}

const navigationItems = [
  {
    title: "Dashboard Overview",
    href: "/",
    group: "General",
    icon: Home,
    keywords: "home overview dashboard main",
  },
  {
    title: "Accommodations",
    href: "/master-data/accommodations",
    group: "Master Data",
    icon: Hotel,
    keywords: "hotel accommodation room types rates",
  },
  {
    title: "Seasons",
    href: "/master-data/seasons",
    group: "Master Data",
    icon: CalendarClock,
    keywords: "season peak off-peak period",
  },
  {
    title: "Transport",
    href: "/master-data/transports",
    group: "Master Data",
    icon: Bus,
    keywords: "transport transfer rates vehicles transportrates transportmaster",
  },
  {
    title: "Activities",
    href: "/master-data/activities",
    group: "Master Data",
    icon: Building2,
    keywords: "activity activities supplements availability activity rates activityrates",
  },
  {
    title: "Guides",
    href: "/master-data/guides",
    group: "Master Data",
    icon: UserRound,
    keywords: "guides guide rates assignments certifications licenses availability",
  },
  {
    title: "Guide Rates",
    href: "/master-data/guides/guide-rates",
    group: "Guides",
    icon: DollarSign,
    keywords: "guide rates per day per pax pricing",
  },
  {
    title: "Guide Assignments",
    href: "/master-data/guides/guide-assignments",
    group: "Guides",
    icon: Users,
    keywords: "guide assignments booking schedule",
  },
  {
    title: "Currency",
    href: "/master-data/currencies",
    group: "Master Data",
    icon: CircleDollarSign,
    keywords: "currency exchange fx rates rounding money settings",
  },
  {
    title: "Currencies",
    href: "/master-data/currencies/currencies",
    group: "Currency",
    icon: CircleDollarSign,
    keywords: "currencies code symbol decimals rounding",
  },
  {
    title: "FX Providers",
    href: "/master-data/currencies/fx-providers",
    group: "Currency",
    icon: Landmark,
    keywords: "fx providers exchange source manual provider",
  },
  {
    title: "Exchange Rates",
    href: "/master-data/currencies/exchange-rates",
    group: "Currency",
    icon: DollarSign,
    keywords: "exchange rates fx rate pair buy sell mid",
  },
  {
    title: "Money Settings",
    href: "/master-data/currencies/money-settings",
    group: "Currency",
    icon: Settings2,
    keywords: "money settings price mode fx source",
  },
  {
    title: "Taxes",
    href: "/master-data/taxes",
    group: "Master Data",
    icon: Landmark,
    keywords: "tax taxes vat levy withholding jurisdiction rules rates",
  },
  {
    title: "Pre-Tours",
    href: "/master-data/pre-tours",
    group: "Tours",
    icon: CalendarRange,
    keywords:
      "pre tour pre-tour plan itinerary day plan items addons totals reference number versions on-tour",
  },
  {
    title: "Field Visits",
    href: "/master-data/technical-visits",
    group: "Tours",
    icon: CalendarClock,
    keywords: "field visits technical visits audits findings actions",
  },
  {
    title: "Technical Visits",
    href: "/master-data/technical-visits/technical-visits",
    group: "Tours",
    icon: CalendarClock,
    keywords: "technical visit records schedule",
  },
  {
    title: "Visit Findings",
    href: "/master-data/technical-visits/technical-visit-findings",
    group: "Tours",
    icon: GaugeCircle,
    keywords: "findings observations issues defects",
  },
  {
    title: "Visit Actions",
    href: "/master-data/technical-visits/technical-visit-actions",
    group: "Tours",
    icon: Settings2,
    keywords: "actions follow up tasks remediation",
  },
  {
    title: "Tax Jurisdictions",
    href: "/master-data/taxes/tax-jurisdictions",
    group: "Taxes",
    icon: MapPin,
    keywords: "tax jurisdiction country region city taxjurisdictions",
  },
  {
    title: "Tax Rates",
    href: "/master-data/taxes/tax-rates",
    group: "Taxes",
    icon: DollarSign,
    keywords: "tax rates vat rates fixed percent effective dates",
  },
  {
    title: "Tax Rules",
    href: "/master-data/taxes/tax-rules",
    group: "Taxes",
    icon: Settings2,
    keywords: "tax rules service type b2b b2c inclusion residency",
  },
  {
    title: "Operator & Market",
    href: "/master-data/business-network",
    group: "Master Data",
    icon: BriefcaseBusiness,
    keywords: "operator market agency travel agent contracts organization org network",
  },
  {
    title: "Organizations",
    href: "/master-data/business-network/organizations",
    group: "Operator & Market",
    icon: Building2,
    keywords: "organizations supplier market operator platform",
  },
  {
    title: "Operator Profiles",
    href: "/master-data/business-network/operator-profiles",
    group: "Operator & Market",
    icon: BriefcaseBusiness,
    keywords: "operator profiles dmc payout booking regions languages",
  },
  {
    title: "Market Profiles",
    href: "/master-data/business-network/market-profiles",
    group: "Operator & Market",
    icon: Users,
    keywords: "market profile travel agent credit markup",
  },
  {
    title: "Organization Members",
    href: "/master-data/business-network/org-members",
    group: "Operator & Market",
    icon: Users,
    keywords: "organization members roles users access",
  },
  {
    title: "Operator-Market Contracts",
    href: "/master-data/business-network/operator-market-contracts",
    group: "Operator & Market",
    icon: DollarSign,
    keywords: "contracts operator market pricing commission markup credit",
  },
  {
    title: "Transport Locations",
    href: "/master-data/transports/locations",
    group: "Transport",
    icon: MapPin,
    keywords: "transport locations pickup dropoff city airport transportlocations",
  },
  {
    title: "Transport Vehicle Categories",
    href: "/master-data/transports/vehicle-categories",
    group: "Transport",
    icon: CarFront,
    keywords: "vehicle category sedan van suv coach transportcategories vehiclecategories",
  },
  {
    title: "Transport Vehicle Types",
    href: "/master-data/transports/vehicle-types",
    group: "Transport",
    icon: GaugeCircle,
    keywords: "vehicle type capacity pax baggage vehicletypes transporttypes",
  },
  {
    title: "Transport Location Rates",
    href: "/master-data/transports/location-rates",
    group: "Transport",
    icon: DollarSign,
    keywords: "transport rates transfer rates location rates per km fixed slab transportrates locationrates",
  },
  {
    title: "Transport Location Expenses",
    href: "/master-data/transports/location-expenses",
    group: "Transport",
    icon: Landmark,
    keywords: "transport expenses extra charge fee locationexpenses transportexpenses",
  },
  {
    title: "Transport Pax Vehicle Rates",
    href: "/master-data/transports/pax-vehicle-rates",
    group: "Transport",
    icon: Users,
    keywords: "pax rates passenger rate tiered per pax paxvehiclerates passengerrates",
  },
  {
    title: "Transport Baggage Rates",
    href: "/master-data/transports/baggage-rates",
    group: "Transport",
    icon: Building2,
    keywords: "baggage rates bag kg transport baggagerates",
  },
  {
    title: "Company Configuration",
    href: "/configuration/company",
    group: "Configuration",
    icon: Settings2,
    keywords: "company configuration users roles privileges",
  },
  {
    title: "Plans & Billing",
    href: "/billing/plans",
    group: "Billing",
    icon: CircleDollarSign,
    keywords: "subscription plans billing pricing upgrade free starter growth enterprise",
  },
  {
    title: "Checkout",
    href: "/billing/checkout",
    group: "Billing",
    icon: CircleDollarSign,
    keywords: "checkout confirm subscription total",
  },
  {
    title: "Hotels",
    href: "/hotels",
    group: "Operations",
    icon: Hotel,
    keywords: "hotels operations inventory rates availability",
  },
  {
    title: "Notifications",
    href: "/notifications",
    group: "General",
    icon: Bell,
    keywords: "notifications inbox messages mentions username internal communication",
  },
  {
    title: "Recycle Bin",
    href: "/bin",
    group: "General",
    icon: Trash2,
    keywords: "recycle bin deleted records restore purge",
  },
  {
    title: "Contact Us",
    href: "/support/contact-us",
    group: "Support",
    icon: LifeBuoy,
    keywords: "support contact help sales assistance",
  },
  {
    title: "Terms & Conditions",
    href: "/terms-and-conditions",
    group: "Legal",
    icon: FileText,
    keywords: "terms conditions legal agreement",
  },
  {
    title: "Privacy Policy",
    href: "/privacy-policy",
    group: "Legal",
    icon: ShieldCheck,
    keywords: "privacy policy legal data protection",
  },
] as const;

export const DashboardCommands = ({ open, setOpen }: Props) => {
  const router = useRouter();

  const goTo = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const toSearchValue = (item: (typeof navigationItems)[number]) => {
    const compactTitle = item.title.replace(/\s+/g, "").toLowerCase();
    const compactKeywords = item.keywords.replace(/\s+/g, "").toLowerCase();
    return `${item.title} ${item.keywords} ${item.group} ${item.href} ${compactTitle} ${compactKeywords}`;
  };

  const groups = Array.from(
    navigationItems.reduce((map, item) => {
      if (!map.has(item.group)) {
        map.set(item.group, []);
      }
      map.get(item.group)!.push(item);
      return map;
    }, new Map<string, Array<(typeof navigationItems)[number]>>())
  );

  return (
    <CommandResponsiveDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search navigation... (e.g. transport rates)" />
      <CommandList>
        <CommandEmpty>No navigation found.</CommandEmpty>
        {groups.map(([groupName, items]) => (
          <CommandGroup key={groupName} heading={groupName}>
            {items.map((item) => (
              <CommandItem
                key={item.href}
                value={toSearchValue(item)}
                onSelect={() => goTo(item.href)}
              >
                <item.icon className="size-4" />
                <span>{item.title}</span>
                <CommandShortcut>{item.group}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandResponsiveDialog>
  );
};
