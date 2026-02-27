import { SidebarProvider } from "@/components/ui/sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { DashboardNavbar } from "@/modules/dashboard/ui/components/dashboard-navbar";
import { CompanySetupGate } from "@/modules/dashboard/ui/components/company-setup-gate";
import { DashboardSidebar } from "@/modules/dashboard/ui/components/dashboard-sidebar";
import { ViewOnlyModeBadge } from "@/modules/dashboard/ui/components/view-only-mode-badge";

interface Props {
  children: React.ReactNode;
}

const layout = ({ children }: Props) => {
  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset className="min-h-svh bg-background">
        <DashboardNavbar />
        <CompanySetupGate />
        <ViewOnlyModeBadge />
        <div className="flex-1 bg-muted/35">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default layout;
