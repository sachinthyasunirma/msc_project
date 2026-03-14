import * as React from "react"
import { type LucideIcon } from "lucide-react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { DashboardSidebarNavLink } from "@/modules/dashboard/ui/components/dashboard-sidebar-nav-link"
import { useDashboardNavigationState } from "@/modules/dashboard/ui/components/dashboard-navigation-provider"

export function DashboardSidebarSecondary({
  items,
  ...props
}: {
  items: {
    title: string
    url: string
    icon: LucideIcon
  }[]
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const { isPendingHref } = useDashboardNavigationState()

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                size="sm"
                isActive={isPendingHref(item.url)}
                className={isPendingHref(item.url) ? "ring-1 ring-sidebar-ring/60" : undefined}
              >
                <DashboardSidebarNavLink href={item.url} label={item.title}>
                  <item.icon />
                  <span>{item.title}</span>
                </DashboardSidebarNavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
