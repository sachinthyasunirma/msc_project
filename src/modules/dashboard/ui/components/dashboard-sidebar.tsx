"use client";

import * as React from "react";
import Link from "next/link";
import {
  CalendarRange,
  Command,
  LifeBuoy,
  Send,
  Settings2,
  ShieldCheck,
  SquareTerminal,
  Trash2,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NavUser } from "@/modules/dashboard/ui/components/nav-user";
import { DashboardSidebarSecondary } from "@/modules/dashboard/ui/components/dashboard-sidebar-secondary";
import { DashboardSidebarMain } from "./dashboard-sidebar-main";

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/",
      icon: SquareTerminal,
      isActive: true,
      items: [
        {
          title: "Overview",
          url: "/",
        },
      ],
    },
    {
      title: "Master Data",
      url: "/master-data/accommodations",
      icon: Settings2,
      items: [
        {
          title: "Accommodations",
          url: "/master-data/accommodations",
        },
        {
          title: "Seasons",
          url: "/master-data/seasons",
        },
        {
          title: "Activities",
          url: "/master-data/activities",
        },
        {
          title: "Transport",
          url: "/master-data/transports",
        },
        {
          title: "Guides",
          url: "/master-data/guides",
        },
        {
          title: "Currency",
          url: "/master-data/currencies",
        },
        {
          title: "Taxes",
          url: "/master-data/taxes",
        },
        {
          title: "Tour Categories",
          url: "/master-data/tour-categories",
        },
        {
          title: "Operator & Market",
          url: "/master-data/business-network",
        },
      ],
    },
    {
      title: "Tours",
      url: "/master-data/pre-tours",
      icon: CalendarRange,
      items: [
        {
          title: "Pre-Tours",
          url: "/master-data/pre-tours",
        },
        {
          title: "Field Visits",
          url: "/master-data/technical-visits",
        },
      ],
    },
    {
      title: "Configuration",
      url: "/configuration/company",
      icon: ShieldCheck,
      items: [
        {
          title: "Company & Users",
          url: "/configuration/company",
        },
        {
          title: "Plans & Billing",
          url: "/billing/plans",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Bin",
      url: "/bin",
      icon: Trash2,
    },
    {
      title: "Support",
      url: "/support/contact-us",
      icon: LifeBuoy,
    },
    {
      title: "Feedback",
      url: "#",
      icon: Send,
    },
  ],
};

export function DashboardSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const [privileges, setPrivileges] = React.useState<string[] | null>(null);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch("/api/companies/access-control", { cache: "no-store" });
        if (!response.ok) return;
        const body = (await response.json()) as { privileges?: string[] };
        if (!active) return;
        setPrivileges(Array.isArray(body.privileges) ? body.privileges : []);
      } catch {
        if (active) setPrivileges(null);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const has = (code: string) => privileges?.includes(code) ?? true;

  const navMain = data.navMain
    .filter((item) => {
      if (item.title === "Master Data") return has("NAV_MASTER_DATA");
      if (item.title === "Tours") return has("NAV_TOURS");
      if (item.title === "Configuration") return has("NAV_CONFIGURATION");
      return has("NAV_DASHBOARD");
    })
    .map((item) => {
      if (!item.items) return item;
      const filteredSubItems = item.items.filter((subItem) => {
        const byUrl: Record<string, string> = {
          "/master-data/accommodations": "SCREEN_MASTER_ACCOMMODATIONS",
          "/master-data/seasons": "SCREEN_MASTER_SEASONS",
          "/master-data/activities": "SCREEN_MASTER_ACTIVITIES",
          "/master-data/transports": "SCREEN_MASTER_TRANSPORTS",
          "/master-data/guides": "SCREEN_MASTER_GUIDES",
          "/master-data/currencies": "SCREEN_MASTER_CURRENCIES",
          "/master-data/taxes": "SCREEN_MASTER_TAXES",
          "/master-data/tour-categories": "SCREEN_MASTER_TOUR_CATEGORIES",
          "/master-data/business-network": "SCREEN_MASTER_BUSINESS_NETWORK",
          "/master-data/pre-tours": "SCREEN_PRE_TOURS",
          "/master-data/technical-visits": "SCREEN_TECHNICAL_VISITS",
          "/configuration/company": "SCREEN_CONFIGURATION_COMPANY",
          "/billing/plans": "SUBSCRIPTION_MANAGE",
        };
        return has(byUrl[subItem.url] ?? "NAV_DASHBOARD");
      });
      return {
        ...item,
        items: filteredSubItems,
      };
    })
    .filter((item) => !item.items || item.items.length > 0);

  const navSecondary = data.navSecondary.filter((item) =>
    item.url === "/bin" ? has("SCREEN_BIN") || has("NAV_BIN") : true
  );

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">MSC Project</span>
                  <span className="truncate text-xs">Travel Platform</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <DashboardSidebarMain items={navMain} />
        <DashboardSidebarSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
