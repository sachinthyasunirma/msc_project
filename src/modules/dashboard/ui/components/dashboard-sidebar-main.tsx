"use client"

import { usePathname } from "next/navigation"
import { ChevronRight, type LucideIcon } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { useDashboardNavigationState } from "@/modules/dashboard/ui/components/dashboard-navigation-provider"
import { DashboardSidebarNavLink } from "@/modules/dashboard/ui/components/dashboard-sidebar-nav-link"

export function DashboardSidebarMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon: LucideIcon
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  const pathname = usePathname()
  const { isPendingHref } = useDashboardNavigationState()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <Collapsible
            key={item.title}
            asChild
            defaultOpen={
              pathname === item.url ||
              Boolean(item.items?.some((subItem) => pathname === subItem.url)) ||
              item.isActive
            }
          >
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                isActive={
                  pathname === item.url ||
                  Boolean(item.items?.some((subItem) => pathname === subItem.url)) ||
                  isPendingHref(item.url)
                }
                className={isPendingHref(item.url) ? "ring-1 ring-sidebar-ring/70" : undefined}
              >
                <DashboardSidebarNavLink href={item.url} label={item.title}>
                  <item.icon />
                  <span>{item.title}</span>
                </DashboardSidebarNavLink>
              </SidebarMenuButton>
              {item.items?.length ? (
                <>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuAction className="data-[state=open]:rotate-90">
                      <ChevronRight />
                      <span className="sr-only">Toggle</span>
                    </SidebarMenuAction>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={pathname === subItem.url || isPendingHref(subItem.url)}
                            className={isPendingHref(subItem.url) ? "ring-1 ring-sidebar-ring/60" : undefined}
                          >
                            <DashboardSidebarNavLink href={subItem.url} label={subItem.title}>
                              <span>{subItem.title}</span>
                            </DashboardSidebarNavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </>
              ) : null}
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
