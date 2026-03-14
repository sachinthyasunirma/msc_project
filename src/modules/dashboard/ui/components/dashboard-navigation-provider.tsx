"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { LoadingState } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";

type PendingNavigation = {
  href: string;
  label: string;
};

type DashboardNavigationContextValue = {
  beginNavigation: (href: string, label: string) => void;
  isPendingHref: (href: string) => boolean;
  pendingNavigation: PendingNavigation | null;
};

const DashboardNavigationContext = createContext<DashboardNavigationContextValue | null>(null);

function normalizePath(path: string | null | undefined) {
  if (!path) return "/";
  const [pathname] = path.split(/[?#]/, 1);
  if (!pathname || pathname === "/") return "/";
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function pathMatches(currentPath: string, targetPath: string) {
  const current = normalizePath(currentPath);
  const target = normalizePath(targetPath);
  if (target === "/") return current === "/";
  return current === target || current.startsWith(`${target}/`);
}

export function DashboardNavigationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [pendingNavigation, setPendingNavigation] = useState<PendingNavigation | null>(null);
  const clearTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (clearTimeoutRef.current !== null) {
        window.clearTimeout(clearTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!pendingNavigation) return;
    if (!pathMatches(pathname, pendingNavigation.href)) return;

    clearTimeoutRef.current = window.setTimeout(() => {
      setPendingNavigation(null);
      clearTimeoutRef.current = null;
    }, 180);

    return () => {
      if (clearTimeoutRef.current !== null) {
        window.clearTimeout(clearTimeoutRef.current);
        clearTimeoutRef.current = null;
      }
    };
  }, [pathname, pendingNavigation]);

  const beginNavigation = useCallback(
    (href: string, label: string) => {
      if (!href.startsWith("/")) return;
      if (pathMatches(pathname, href)) return;
      if (clearTimeoutRef.current !== null) {
        window.clearTimeout(clearTimeoutRef.current);
        clearTimeoutRef.current = null;
      }
      setPendingNavigation({
        href,
        label,
      });
    },
    [pathname]
  );

  const isPendingHref = useCallback(
    (href: string) => {
      if (!pendingNavigation) return false;
      return pathMatches(pendingNavigation.href, href);
    },
    [pendingNavigation]
  );

  const value = useMemo<DashboardNavigationContextValue>(
    () => ({
      beginNavigation,
      isPendingHref,
      pendingNavigation,
    }),
    [beginNavigation, isPendingHref, pendingNavigation]
  );

  return (
    <DashboardNavigationContext.Provider value={value}>
      {children}
    </DashboardNavigationContext.Provider>
  );
}

export function useDashboardNavigationState() {
  const context = useContext(DashboardNavigationContext);
  if (!context) {
    throw new Error("useDashboardNavigationState must be used within DashboardNavigationProvider.");
  }
  return context;
}

export function DashboardNavigationContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { pendingNavigation } = useDashboardNavigationState();
  const label = pendingNavigation?.label ?? "Screen";

  return (
    <div
      aria-busy={pendingNavigation ? true : undefined}
      className={cn("relative flex-1 bg-muted/35", className)}
    >
      {children}
      {pendingNavigation ? (
        <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-background/68 px-4 py-6 backdrop-blur-[1.5px]">
          <div className="w-full max-w-md rounded-2xl border border-border/70 bg-background/95 p-4 shadow-xl shadow-black/5">
            <div className="mb-4 h-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-2/5 animate-pulse rounded-full bg-primary" />
            </div>
            <LoadingState
              compact
              size="sm"
              className="justify-start border-none bg-transparent px-0 py-0"
              title={`Loading ${label}...`}
              description="Fetching the next workspace from the server."
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
