"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { DashboardShellData } from "@/modules/dashboard/shared/dashboard-shell-types";

type DashboardShellContextValue = DashboardShellData & {
  updateShellData: (patch: Partial<DashboardShellData>) => void;
};

const DashboardShellContext = createContext<DashboardShellContextValue | null>(null);

type Props = {
  initialData: DashboardShellData;
  children: ReactNode;
};

export function DashboardShellProvider({ initialData, children }: Props) {
  const [state, setState] = useState(initialData);

  useEffect(() => {
    setState(initialData);
  }, [initialData]);

  const value = useMemo<DashboardShellContextValue>(
    () => ({
      ...state,
      updateShellData: (patch) => {
        setState((current) => ({ ...current, ...patch }));
      },
    }),
    [state]
  );

  return (
    <DashboardShellContext.Provider value={value}>
      {children}
    </DashboardShellContext.Provider>
  );
}

export function useDashboardShell() {
  const context = useContext(DashboardShellContext);
  if (!context) {
    throw new Error("useDashboardShell must be used within DashboardShellProvider.");
  }
  return context;
}

export function useDashboardAccessState() {
  const { access, viewer } = useDashboardShell();

  return useMemo(
    () => ({
      viewer,
      access,
      isReadOnly: access?.readOnly ?? true,
      isAdmin: access?.role === "ADMIN",
      canWriteMasterData: access?.canWriteMasterData ?? false,
      canWritePreTour: access?.canWritePreTour ?? false,
      privileges: access?.privileges ?? [],
    }),
    [access, viewer]
  );
}
