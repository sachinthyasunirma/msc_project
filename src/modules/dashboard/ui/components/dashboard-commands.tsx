import { Dispatch, SetStateAction } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Bus,
  CarFront,
  DollarSign,
  GaugeCircle,
  Home,
  Landmark,
  MapPin,
  Hotel,
  CalendarClock,
  Settings2,
  Users,
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
