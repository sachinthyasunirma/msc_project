import { SidebarProvider } from "@/components/ui/sidebar";
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
      <main className="flex flex-col h-screen w-screen bg-muted">
        <DashboardNavbar />
        <CompanySetupGate />
        <ViewOnlyModeBadge />
        {children}
      </main>
    </SidebarProvider>
  );
};

export default layout;
