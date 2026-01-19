"use client";

import * as React from "react";
import {
  BookOpen,
  Bot,
  Command,
  Frame,
  LifeBuoy,
  Map,
  PieChart,
  Send,
  Settings2,
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
import { DashboardSidebarMaster } from "./dashboard-sidebar-master";
import { DashboardSidebarMain } from "./dashboard-sidebar-main";

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashoboard",
      url: "#",
      icon: SquareTerminal,
      isActive: true,
      items: [
        {
          title: "Overview",
          url: "#",
        },
        {
          title: "Recent Activity",
          url: "#",
        },
        {
          title: "Performance Metrics",
          url: "#",
        },
      ],
    },
    {
      title: "Incoming Requests",
      url: "#",
      icon: Bot,
      items: [
        {
          title: "New Requests",
          url: "#",
        },
        {
          title: "Pending Review",
          url: "#",
        },
        {
          title: "In Negotiation",
          url: "#",
        },
        {
          title: "Sent to Partner",
          url: "#",
        },
      ],
    },
    {
      title: "Itinerary Management",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "Edit Itinerary",
          url: "#",
        },
        {
          title: "Approve/Reject",
          url: "#",
        },
        {
          title: "Version Control",
          url: "#",
        },
        {
          title: "Send to Partner",
          url: "#",
        },
      ],
    },
    {
      title: "Master Data",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "Accommodations",
          url: "#",
        },
        {
          title: "Activities",
          url: "#",
        },
        {
          title: "Transport",
          url: "#",
        },
      ],
    },
    {
      title: "Communication",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "Chat with Overseas Agent",
          url: "#",
        },
        {
          title: "Email Logs",
          url: "#",
        },
        {
          title: "Attachments",
          url: "#",
        },
      ],
    },
    {
      title: "Reports",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "Monthly Summary",
          url: "#",
        },
        {
          title: "Revenue by Partner",
          url: "#",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: LifeBuoy,
    },
    {
      title: "Feedback",
      url: "#",
      icon: Send,
    },
  ],
  projects: [
    // {
    //   name: "Design Engineering",
    //   url: "#",
    //   icon: Frame,
    // },
    // {
    //   name: "Sales & Marketing",
    //   url: "#",
    //   icon: PieChart,
    // },
    // {
    //   name: "Travel",
    //   url: "#",
    //   icon: Map,
    // },
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
              <a href="#">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Acme Inc</span>
                  <span className="truncate text-xs">Enterprise</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <DashboardSidebarMain items={data.navMain} />
        <DashboardSidebarMaster projects={data.projects} />
        <DashboardSidebarSecondary
          items={data.navSecondary}
          className="mt-auto"
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
