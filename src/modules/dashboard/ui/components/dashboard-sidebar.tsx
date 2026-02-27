"use client";

import * as React from "react";
import Link from "next/link";
import {
  Command,
  LifeBuoy,
  Send,
  Settings2,
  ShieldCheck,
  SquareTerminal,
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
      title: "Support",
      url: "#",
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
        <DashboardSidebarMain items={data.navMain} />
        <DashboardSidebarSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
