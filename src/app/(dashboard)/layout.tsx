import { SidebarProvider } from "@/components/ui/sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardNavbar } from "@/modules/dashboard/ui/components/dashboard-navbar";
import { CompanySetupGate } from "@/modules/dashboard/ui/components/company-setup-gate";
import { DashboardScreenHelp } from "@/modules/dashboard/ui/components/dashboard-screen-help";
import { DashboardSidebar } from "@/modules/dashboard/ui/components/dashboard-sidebar";
import { SubscriptionGate } from "@/modules/dashboard/ui/components/subscription-gate";
import { ViewOnlyModeBadge } from "@/modules/dashboard/ui/components/view-only-mode-badge";
import { auth } from "@/lib/auth";
import { ScreenAccessGate } from "@/modules/dashboard/ui/components/screen-access-gate";

interface Props {
  children: React.ReactNode;
}

const layout = async ({ children }: Props) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/sign-in");
  }

  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset className="min-h-svh bg-background">
        <DashboardNavbar />
        <CompanySetupGate />
        <SubscriptionGate />
        <ScreenAccessGate />
        <DashboardScreenHelp />
        <ViewOnlyModeBadge />
        <div className="flex-1 bg-muted/35">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default layout;
