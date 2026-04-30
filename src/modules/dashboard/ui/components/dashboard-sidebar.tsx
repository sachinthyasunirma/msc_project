"use client";

import * as React from "react";
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
import { DashboardSidebarNavLink } from "@/modules/dashboard/ui/components/dashboard-sidebar-nav-link";
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
        {
          title: "AI Email Intake",
          url: "/master-data/ai-email",
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
          title: "AI Evaluations",
          url: "/master-data/pre-tours/ai-evaluations",
        },
        {
          title: "On-Tours",
          url: "/tours/on-tours",
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
  const navMain = data.navMain;
  const navSecondary = data.navSecondary;

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <DashboardSidebarNavLink href="/" label="Dashboard">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Project</span>
                  <span className="truncate text-xs">Travel Platform</span>
                </div>
              </DashboardSidebarNavLink>
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
