import { SidebarProvider } from "@/components/ui/sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardShellProvider } from "@/modules/dashboard/ui/components/dashboard-shell-provider";
import {
  DashboardNavigationContent,
  DashboardNavigationProvider,
} from "@/modules/dashboard/ui/components/dashboard-navigation-provider";
import { DashboardNavbar } from "@/modules/dashboard/ui/components/dashboard-navbar";
import { CompanySetupGate } from "@/modules/dashboard/ui/components/company-setup-gate";
import { DashboardScreenHelp } from "@/modules/dashboard/ui/components/dashboard-screen-help";
import { DashboardSidebar } from "@/modules/dashboard/ui/components/dashboard-sidebar";
import { SubscriptionGate } from "@/modules/dashboard/ui/components/subscription-gate";
import { ViewOnlyModeBadge } from "@/modules/dashboard/ui/components/view-only-mode-badge";
import { loadDashboardShellData } from "@/modules/dashboard/server/dashboard-shell-service";
import { ScreenAccessGate } from "@/modules/dashboard/ui/components/screen-access-gate";

interface Props {
  children: React.ReactNode;
}

const layout = async ({ children }: Props) => {
  const requestHeaders = await headers();
  let initialShellData;
  try {
    initialShellData = await loadDashboardShellData(requestHeaders);
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim()
        ? error.message
        : "The dashboard could not connect to required backend services.";

    return (
      <div className="flex min-h-svh items-center justify-center bg-background p-4 md:p-6">
        <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Dashboard temporarily unavailable</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {message}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Check database/auth connectivity and refresh the page.
          </p>
        </div>
      </div>
    );
  }

  if (!initialShellData.viewer) {
    redirect("/sign-in");
  }

  return (
    <DashboardShellProvider initialData={initialShellData}>
      <DashboardNavigationProvider>
        <SidebarProvider>
          <DashboardSidebar />
          <SidebarInset className="min-h-svh bg-background">
            <DashboardNavbar />
            <CompanySetupGate />
            <SubscriptionGate />
            <ScreenAccessGate />
            <DashboardScreenHelp />
            <ViewOnlyModeBadge />
            <DashboardNavigationContent>{children}</DashboardNavigationContent>
          </SidebarInset>
        </SidebarProvider>
      </DashboardNavigationProvider>
    </DashboardShellProvider>
  );
};

export default layout;
