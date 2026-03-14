"use client";

import type { MouseEvent, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardNavigationState } from "@/modules/dashboard/ui/components/dashboard-navigation-provider";

type DashboardSidebarNavLinkProps = {
  href: string;
  label: string;
  children: ReactNode;
  className?: string;
  onNavigate?: () => void;
};

function isModifiedEvent(event: MouseEvent<HTMLAnchorElement>) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

export function DashboardSidebarNavLink({
  href,
  label,
  children,
  className,
  onNavigate,
}: DashboardSidebarNavLinkProps) {
  const router = useRouter();
  const { beginNavigation, isPendingHref } = useDashboardNavigationState();
  const isPending = isPendingHref(href);

  return (
    <Link
      href={href}
      onMouseEnter={() => {
        router.prefetch(href);
      }}
      onFocus={() => {
        router.prefetch(href);
      }}
      aria-disabled={isPending}
      onClick={(event) => {
        if (event.defaultPrevented || isModifiedEvent(event)) return;
        beginNavigation(href, label);
        onNavigate?.();
      }}
      className={cn("flex min-w-0 items-center gap-2", className, isPending ? "pointer-events-none" : null)}
    >
      {children}
      {isPending ? <LoaderCircle className="ml-auto size-3.5 animate-spin text-primary" /> : null}
    </Link>
  );
}
