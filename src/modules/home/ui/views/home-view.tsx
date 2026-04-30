"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ArrowRight,
  Bot,
  Building2,
  CalendarRange,
  CircleDollarSign,
  Lock,
  LogOut,
  Mail,
  PlaneTakeoff,
  Settings2,
  ShieldCheck,
  Sparkles,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { authClient } from "@/lib/auth-client";
import {
  useDashboardAccessState,
  useDashboardShell,
} from "@/modules/dashboard/ui/components/dashboard-shell-provider";

type BadgeVariant = "default" | "secondary" | "outline" | "destructive";

type DashboardRecord = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
};

type WorkflowLane = {
  title: string;
  description: string;
  recordLabel: string;
  recordValue: string;
  href: string;
  cta: string;
  icon: LucideIcon;
  status: string;
  statusVariant: BadgeVariant;
  available: boolean;
};

function humanizeConstant(value: string | null | undefined) {
  if (!value) return "Unknown";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatIsoDate(value: string | null | undefined) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function accessStatusVariant(
  available: boolean,
  limited = false,
): BadgeVariant {
  if (!available) return "destructive";
  if (limited) return "secondary";
  return "default";
}

export const HomeView = () => {
  const router = useRouter();
  const { company, viewer, access, needsSetup } = useDashboardShell();
  const {
    isAdmin,
    isReadOnly,
    canWriteMasterData,
    canWritePreTour,
    privileges,
  } = useDashboardAccessState();

  const canOpenPreTours = isAdmin || privileges.includes("SCREEN_PRE_TOURS");
  const canOpenConfig =
    isAdmin || privileges.includes("SCREEN_CONFIGURATION_COMPANY");
  const canOpenTechVisits =
    isAdmin || privileges.includes("SCREEN_TECHNICAL_VISITS");
  const canOpenBin = isAdmin || privileges.includes("SCREEN_BIN");
  const screenPrivilegeCount = privileges.filter((code) =>
    code.startsWith("SCREEN_"),
  ).length;

  const displayName =
    viewer?.name?.trim() ||
    viewer?.email?.split("@")[0] ||
    access?.role?.toLowerCase() ||
    "team";

  const workflowLanes = useMemo<WorkflowLane[]>(
    () => [
      {
        title: "Pre-Tour Planning",
        description:
          "Build quotation-stage plans, shape the day flow, and push approved drafts into costing.",
        recordLabel: "Current record",
        recordValue:
          canWritePreTour && !isReadOnly
            ? "Draft, apply, and costings enabled"
            : canOpenPreTours
              ? "Review and planning access available"
              : "Pre-tour screen is restricted",
        href: "/master-data/pre-tours",
        cta: canOpenPreTours ? "Open Pre-Tours" : "Locked",
        icon: CalendarRange,
        status:
          canWritePreTour && !isReadOnly
            ? "Ready to draft"
            : canOpenPreTours
              ? "Review access"
              : "Restricted",
        statusVariant: accessStatusVariant(
          canOpenPreTours,
          !canWritePreTour || isReadOnly,
        ),
        available: canOpenPreTours,
      },
      {
        title: "AI Evaluation Desk",
        description:
          "Audit prompt quality, review coverage scores, and validate how reliably drafts can be applied.",
        recordLabel: "Current record",
        recordValue: isAdmin
          ? "Admin review loop is open"
          : "Admin review is required for this dashboard",
        href: "/master-data/pre-tours/ai-evaluations",
        cta: isAdmin ? "Open AI Evaluations" : "Admin only",
        icon: Bot,
        status: isAdmin ? "Governance ready" : "Restricted",
        statusVariant: accessStatusVariant(isAdmin),
        available: isAdmin,
      },
      {
        title: "AI Email Intake",
        description:
          "Control mailbox-driven demand intake, normalize incoming requests, and tune prompt behavior.",
        recordLabel: "Current record",
        recordValue: canOpenConfig
          ? company?.helpEnabled
            ? "Guided setup and help prompts are enabled"
            : "Workspace is available with help prompts turned off"
          : "Configuration access is restricted",
        href: "/master-data/ai-email",
        cta: canOpenConfig ? "Open AI Email" : "Locked",
        icon: Mail,
        status: canOpenConfig
          ? company?.helpEnabled
            ? "Configured"
            : "Available"
          : "Restricted",
        statusVariant: accessStatusVariant(
          canOpenConfig,
          Boolean(canOpenConfig && !company?.helpEnabled),
        ),
        available: canOpenConfig,
      },
      {
        title: "Operations Handoff",
        description:
          "Carry approved plans into on-tour execution, field follow-up, and post-sales operational visibility.",
        recordLabel: "Current record",
        recordValue: canOpenPreTours
          ? canOpenTechVisits
            ? "On-tour flow and field visits are both reachable"
            : "On-tour operations are reachable from the tour lane"
          : "Operations handoff is blocked until tour access is granted",
        href: canOpenTechVisits
          ? "/master-data/technical-visits"
          : "/tours/on-tours",
        cta: canOpenPreTours
          ? canOpenTechVisits
            ? "Open Field Visits"
            : "Open On-Tours"
          : "Locked",
        icon: PlaneTakeoff,
        status: canOpenPreTours ? "Linked" : "Restricted",
        statusVariant: accessStatusVariant(canOpenPreTours),
        available: canOpenPreTours,
      },
    ],
    [
      canOpenConfig,
      canOpenPreTours,
      canOpenTechVisits,
      canWritePreTour,
      company?.helpEnabled,
      isAdmin,
      isReadOnly,
    ],
  );

  const dashboardRecords = useMemo<DashboardRecord[]>(
    () => [
      {
        label: "AI Lanes",
        value: `${workflowLanes.filter((lane) => lane.available).length}/${workflowLanes.length}`,
        detail: "Workflow spaces currently available in this workspace.",
        icon: WandSparkles,
      },
      {
        label: "Access Mode",
        value: isReadOnly
          ? "View Only"
          : canWritePreTour
            ? "Write Enabled"
            : "Managed Access",
        detail: `${humanizeConstant(access?.role)} access across ${screenPrivilegeCount} screen privileges.`,
        icon: ShieldCheck,
      },
      {
        label: "Subscription",
        value: access?.plan ?? "Unknown",
        detail: `${humanizeConstant(access?.subscriptionStatus)}${access?.subscriptionEndsAt ? ` until ${formatIsoDate(access.subscriptionEndsAt)}` : ""}.`,
        icon: Sparkles,
      },
      {
        label: "Commercial Base",
        value: company?.baseCurrencyCode ?? "N/A",
        detail: `Transport basis: ${humanizeConstant(company?.transportRateBasis)}.`,
        icon: CircleDollarSign,
      },
    ],
    [
      access?.plan,
      access?.role,
      access?.subscriptionEndsAt,
      access?.subscriptionStatus,
      canWritePreTour,
      company?.baseCurrencyCode,
      company?.transportRateBasis,
      isReadOnly,
      screenPrivilegeCount,
      workflowLanes,
    ],
  );

  const launchPads = useMemo(
    () =>
      [
        canOpenPreTours
          ? {
              title: "Pre-Tour workspace",
              href: "/master-data/pre-tours",
              description:
                "Open the planner, costing flow, and managed day editor.",
            }
          : null,
        isAdmin
          ? {
              title: "AI evaluation dashboard",
              href: "/master-data/pre-tours/ai-evaluations",
              description:
                "Review run accuracy, coverage, and human approvals.",
            }
          : null,
        canOpenConfig
          ? {
              title: "Company configuration",
              href: "/configuration/company",
              description:
                "Adjust company profile, AI mailbox access, and governance controls.",
            }
          : null,
        canOpenBin
          ? {
              title: "Recovery bin",
              href: "/bin",
              description:
                "Inspect recently removed records and recovery paths.",
            }
          : null,
      ].filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
    [canOpenBin, canOpenConfig, canOpenPreTours, isAdmin],
  );

  if (!viewer || !company || !access) {
    return (
      <div className="p-6">
        <LoadingState
          title="Preparing your workspace"
          description="Fetching your dashboard access, company context, and AI workflow lanes."
          size="lg"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-3">
      {/* <Card className="overflow-hidden border-border/70 bg-gradient-to-br from-background via-background to-muted/40 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{company.code}</Badge>
                <Badge variant={isReadOnly ? "secondary" : "default"}>
                  {isReadOnly ? "View only" : "Operational access"}
                </Badge>
                <Badge variant="outline">{access.plan} plan</Badge>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">AI Operations Dashboard</p>
                <h1 className="text-3xl font-semibold tracking-tight">
                  Welcome back, {displayName}
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                  This workspace brings together AI planning, pre-tour governance, email intake,
                  and operational handoff for {company.name}.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {canOpenPreTours ? (
                <Button asChild>
                  <Link href="/master-data/pre-tours">
                    Open Pre-Tours
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
              ) : null}
              {canOpenConfig ? (
                <Button variant="outline" asChild>
                  <Link href="/configuration/company">
                    Configure Workspace
                    <Settings2 className="ml-2 size-4" />
                  </Link>
                </Button>
              ) : null}
              <Button
                variant="destructive"
                onClick={() =>
                  authClient.signOut({
                    fetchOptions: {
                      onSuccess: () => router.push("/sign-in"),
                    },
                  })
                }
              >
                <LogOut className="mr-2 size-4" />
                Sign out
              </Button>
            </div>
          </div>
        </CardContent>
      </Card> */}

      {/* <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboardRecords.map((record) => (
          <Card key={record.label} className="border-border/70 shadow-sm">
            <CardContent className="flex h-full flex-col gap-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {record.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight">
                    {record.value}
                  </p>
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/50 p-2.5">
                  <record.icon className="size-4 text-muted-foreground" />
                </div>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                {record.detail}
              </p>
            </CardContent>
          </Card>
        ))}
      </div> */}

      <div className="grid gap-4 xl:grid-cols-[1.5fr_minmax(0,1fr)]">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2">
              <Bot className="size-5" />
              AI Workflow Board
            </CardTitle>
            <CardDescription>
              A quick view of the dashboard records that matter most for your
              planning and review cycle right now.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {workflowLanes.map((lane) => (
              <Card key={lane.title} className="border-border/70 bg-muted/20">
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="rounded-xl border border-border/70 bg-background p-2.5">
                      <lane.icon className="size-4 text-foreground" />
                    </div>
                    <Badge variant={lane.statusVariant}>{lane.status}</Badge>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-base font-semibold tracking-tight">
                      {lane.title}
                    </h3>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {lane.description}
                    </p>
                  </div>
                  <div className="rounded-xl border border-dashed border-border/70 bg-background/80 p-3">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      {lane.recordLabel}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-foreground">
                      {lane.recordValue}
                    </p>
                  </div>
                  {lane.available ? (
                    <Button asChild className="w-full">
                      <Link href={lane.href}>{lane.cta}</Link>
                    </Button>
                  ) : (
                    <Button className="w-full" variant="outline" disabled>
                      <Lock className="mr-2 size-4" />
                      {lane.cta}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="space-y-2">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="size-5" />
                Workspace Notes
              </CardTitle>
              <CardDescription>
                Key operational records and setup markers for this company
                environment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm">
                <div className="flex items-start justify-between gap-4 rounded-xl border border-border/70 p-3">
                  <div>
                    <p className="font-medium">Company</p>
                    <p className="text-muted-foreground">{company.name}</p>
                  </div>
                  <Badge variant="outline">{company.code}</Badge>
                </div>
                <div className="flex items-start justify-between gap-4 rounded-xl border border-border/70 p-3">
                  <div>
                    <p className="font-medium">Subscription status</p>
                    <p className="text-muted-foreground">
                      {humanizeConstant(access.subscriptionStatus)}
                    </p>
                  </div>
                  <span className="text-right text-muted-foreground">
                    {formatIsoDate(access.subscriptionEndsAt)}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-4 rounded-xl border border-border/70 p-3">
                  <div>
                    <p className="font-medium">Help mode</p>
                    <p className="text-muted-foreground">
                      Guided hints for setup and workflow support.
                    </p>
                  </div>
                  <Badge
                    variant={company.helpEnabled ? "default" : "secondary"}
                  >
                    {company.helpEnabled ? "Enabled" : "Off"}
                  </Badge>
                </div>
                <div className="flex items-start justify-between gap-4 rounded-xl border border-border/70 p-3">
                  <div>
                    <p className="font-medium">Workspace setup</p>
                    <p className="text-muted-foreground">
                      Company profile, access, and operational controls.
                    </p>
                  </div>
                  <Badge variant={needsSetup ? "secondary" : "outline"}>
                    {needsSetup ? "Needs attention" : "Ready"}
                  </Badge>
                </div>
                <div className="flex items-start justify-between gap-4 rounded-xl border border-border/70 p-3">
                  <div>
                    <p className="font-medium">Master-data access</p>
                    <p className="text-muted-foreground">
                      Controls master records and configuration surfaces.
                    </p>
                  </div>
                  <Badge
                    variant={
                      canWriteMasterData && !isReadOnly
                        ? "default"
                        : "secondary"
                    }
                  >
                    {canWriteMasterData && !isReadOnly
                      ? "Write enabled"
                      : "Controlled"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader className="space-y-2">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-5" />
                Launch Pads
              </CardTitle>
              <CardDescription>
                Jump directly into the spaces your current role can work with
                today.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {launchPads.map((pad) => (
                <Link
                  key={pad.href}
                  href={pad.href}
                  className="block rounded-xl border border-border/70 p-3 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{pad.title}</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {pad.description}
                      </p>
                    </div>
                    <ArrowRight className="mt-0.5 size-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
