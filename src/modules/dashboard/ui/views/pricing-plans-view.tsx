"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CircleDollarSign, Headset, Rocket, TrendingUp } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { notify } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ADDITIONAL_USER_PRICE_PER_MONTH,
  getDurationLabel,
  getDurationShortLabel,
  getDurationSuffix,
  getPlanPackageTotal,
  type PlanCode,
  PLAN_META,
  type SubscriptionDuration,
} from "@/modules/dashboard/lib/billing-pricing";
import { PRIVILEGE_DEFINITIONS } from "@/lib/security/privileges";

type CompanyProfile = {
  code: string;
  name: string;
  email: string;
  joinSecretCode: string | null;
  managerPrivilegeCode: string | null;
  baseCurrencyCode: string;
  transportRateBasis: "VEHICLE_CATEGORY" | "VEHICLE_TYPE";
  helpEnabled: boolean;
  country: string | null;
  image: string | null;
  subscriptionPlan: PlanCode | null;
  subscriptionStatus: "PENDING" | "ACTIVE" | "TRIAL" | "EXPIRED" | "CANCELED";
  subscriptionStartsAt: string | null;
  subscriptionEndsAt: string | null;
};


const PLAN_WEIGHT: Record<PlanCode, number> = {
  STARTER: 1,
  GROWTH: 2,
  ENTERPRISE: 3,
};

const MATRIX_CATEGORIES = [
  "Navigation",
  "Product Screens",
  "Write Permissions",
  "Administration",
  "Billing & Subscription",
] as const;

function getPrivilegeCategory(code: string) {
  if (code.startsWith("NAV_")) return "Navigation";
  if (code.startsWith("SCREEN_")) return "Product Screens";
  if (code.endsWith("_WRITE")) return "Write Permissions";
  if (code.includes("COMPANY") || code.includes("ROLE")) return "Administration";
  if (code.includes("SUBSCRIPTION")) return "Billing & Subscription";
  return "Other";
}

export function PricingPlansView() {
  const router = useRouter();
  authClient.useSession();
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<PlanCode>("STARTER");
  const [activeTab, setActiveTab] = useState("plans");
  const [selectedDuration, setSelectedDuration] = useState<SubscriptionDuration>("YEARLY");

  const planFeatureMap = useMemo(() => {
    return PLAN_META.map((plan) => {
      const privileges = PRIVILEGE_DEFINITIONS.filter(
        (entry) => PLAN_WEIGHT[entry.minPlan as PlanCode] <= PLAN_WEIGHT[plan.code]
      );
      const byCategory = privileges.reduce<Record<string, string[]>>((acc, row) => {
        const category = getPrivilegeCategory(row.code);
        acc[category] = [...(acc[category] ?? []), row.name];
        return acc;
      }, {});
      return { plan, privileges, byCategory };
    });
  }, []);

  const selectedPlanMeta = planFeatureMap.find((row) => row.plan.code === selectedPlan);
  const currentCompanyPlanMeta = company?.subscriptionPlan
    ? planFeatureMap.find((row) => row.plan.code === company.subscriptionPlan)
    : null;
  const selectedPlanIncludedUsers = selectedPlanMeta?.plan.includedUsers ?? 0;
  const totalAccessUserPrice = getPlanPackageTotal(
    selectedPlan,
    selectedPlanIncludedUsers,
    selectedDuration
  );
  const durationLabel = getDurationLabel(selectedDuration);
  const durationShortLabel = getDurationShortLabel(selectedDuration);
  const durationSuffix = getDurationSuffix(selectedDuration);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch("/api/companies/me", { cache: "no-store" });
        const body = (await response.json()) as { company?: CompanyProfile | null; message?: string };
        if (!response.ok) throw new Error(body.message || "Failed to load company.");
        if (!active) return;
        const companyData = body.company ?? null;
        setCompany(companyData);
        if (companyData?.subscriptionPlan) setSelectedPlan(companyData.subscriptionPlan);
      } catch (error) {
        if (active) notify.error(error instanceof Error ? error.message : "Failed to load company.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const goToCheckout = (plan: PlanCode) => {
    const search = new URLSearchParams({
      plan,
      duration: selectedDuration,
    });
    router.push(`/billing/checkout?${search.toString()}`);
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4">
      <Card className="overflow-hidden border-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-300">Tourism SaaS Pricing</p>
            <h1 className="text-3xl font-semibold leading-tight">Plans That Convert Operations Into Revenue</h1>
            <p className="max-w-3xl text-sm text-slate-200">
              Choose the right operating model for your tourism business. Our annual plans are structured for
              profitability, governance, and scale.
            </p>
            <div className="flex flex-wrap gap-3">
              <span className="inline-flex items-center rounded-md border border-white/30 px-3 py-1 text-xs">
                <CircleDollarSign className="mr-1 size-3.5" />
                Flexible Billing (USD)
              </span>
              <span className="inline-flex items-center rounded-md border border-white/30 px-3 py-1 text-xs">
                <TrendingUp className="mr-1 size-3.5" />
                Built For Tour Operators, DMCs, and Travel Platforms
              </span>
            </div>
          </div>
          <div className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
            <p className="text-xs text-slate-300">Current Subscription</p>
            <p className="mt-1 text-xl font-semibold">{company?.subscriptionPlan ?? "-"}</p>
            <p className="text-sm text-slate-300">{company?.subscriptionStatus ?? "-"}</p>
            <p className="mt-3 text-xs text-slate-300">
              Ends: {company?.subscriptionEndsAt ? new Date(company.subscriptionEndsAt).toLocaleDateString() : "-"}
            </p>
            <Button className="mt-4 w-full" variant="secondary" onClick={() => router.push("/support/contact-us")}>
              <Headset className="mr-2 size-4" />
              Contact Sales
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 p-1 md:grid-cols-4">
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="matrix">Access Matrix</TabsTrigger>
          <TabsTrigger value="business">Business Guide</TabsTrigger>
          <TabsTrigger value="legal">FAQ & Legal</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Plan Duration & Access Users</CardTitle>
              <CardDescription>
                Select duration. Plan card values update for fixed tiers: 10, 25, and 40 users.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Duration</Label>
                <Select
                  value={selectedDuration}
                  onValueChange={(value) => setSelectedDuration(value as SubscriptionDuration)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="QUARTERLY">3 Months</SelectItem>
                    <SelectItem value="YEARLY">1 Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-md border bg-muted/30 p-2.5">
                <p className="text-xs text-muted-foreground">Package Users</p>
                <p className="mt-1 font-medium">{selectedPlanIncludedUsers}</p>
              </div>
              <div className="rounded-md border bg-primary/5 p-2.5">
                <p className="text-xs text-muted-foreground">
                  Total Package Value
                </p>
                <p className="mt-1 font-semibold">${totalAccessUserPrice.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-3">
            {planFeatureMap.map(({ plan, privileges }) => {
              const current = company?.subscriptionPlan === plan.code;
              const selected = selectedPlan === plan.code;
              const planPrice = getPlanPackageTotal(plan.code, plan.includedUsers, selectedDuration);
              return (
                <Card
                  key={plan.code}
                  className={`cursor-pointer transition ${
                    current ? "ring-2 ring-primary" : selected ? "border-primary/60" : ""
                  }`}
                  onClick={() => setSelectedPlan(plan.code)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{plan.name}</CardTitle>
                      <span className="rounded border px-2 py-0.5 text-[11px]">{plan.badge}</span>
                    </div>
                    <CardDescription>{plan.subtitle}</CardDescription>
                    <p className="pt-2 text-3xl font-semibold">
                      {plan.isFree ? "Free" : `$${planPrice.toLocaleString()}`}
                      {!plan.isFree ? (
                        <span className="ml-1 text-sm font-normal text-muted-foreground">{durationSuffix}</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Billing Model: Per Company ({durationLabel})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Includes up to {plan.includedUsers} company users
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Additional user: ${ADDITIONAL_USER_PRICE_PER_MONTH}/user/month
                    </p>
                    <p className="text-xs text-muted-foreground">Ideal for: {plan.idealFor}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {plan.outcomes.map((line) => (
                      <p key={`${plan.code}-${line}`} className="flex items-start text-sm">
                        <Check className="mr-2 mt-0.5 size-4 text-emerald-600" />
                        <span>{line}</span>
                      </p>
                    ))}
                    <div className="rounded-md border bg-muted/30 p-2 text-xs">
                      {privileges.length} access options included
                    </div>
                    <Button
                      className="w-full"
                      onClick={(event) => {
                        event.stopPropagation();
                        goToCheckout(plan.code);
                      }}
                      disabled={current || loading}
                    >
                      <Rocket className="mr-2 size-4" />
                      {current
                        ? "Current Plan"
                        : plan.isFree
                          ? "Start Free Plan"
                          : `Subscribe ${plan.name} (${durationShortLabel})`}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{selectedPlan} - Complete Included Access</CardTitle>
              <CardDescription>
                Billing: Per Company ({durationLabel}) | Includes {selectedPlanMeta?.plan.includedUsers ?? 0} users
                {" "} | Additional user ${ADDITIONAL_USER_PRICE_PER_MONTH}/user/month
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {Object.entries(selectedPlanMeta?.byCategory ?? {}).map(([category, names]) => (
                <div key={category} className="rounded-md border p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{category}</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {names.map((name) => (
                      <li key={`${category}-${name}`}>- {name}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Company User Plan</CardTitle>
              <CardDescription>
                Annual company plan with included user capacity.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Current Plan</p>
                <p className="mt-1 font-medium">{company?.subscriptionPlan ?? "Not Selected"}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Included Company Users</p>
                <p className="mt-1 font-medium">{currentCompanyPlanMeta?.plan.includedUsers ?? "-"}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Additional User Pricing</p>
                <p className="mt-1 font-medium">
                  {currentCompanyPlanMeta
                    ? `$${ADDITIONAL_USER_PRICE_PER_MONTH}/user/month`
                    : "-"}
                </p>
              </div>
              <div className="rounded-md border p-3 md:col-span-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Package Pricing Summary
                </p>
                <div className="mt-3 grid gap-3 md:grid-cols-4">
                  <div className="rounded-md border bg-muted/30 p-2.5 md:col-span-2">
                    <p className="text-xs text-muted-foreground">Duration</p>
                    <p className="mt-1 font-medium">{durationLabel}</p>
                  </div>
                  <div className="rounded-md border bg-muted/30 p-2.5">
                    <p className="text-xs text-muted-foreground">Package Users</p>
                    <p className="mt-1 font-medium">{selectedPlanIncludedUsers}</p>
                  </div>
                  <div className="rounded-md border bg-primary/5 p-2.5">
                    <p className="text-xs text-muted-foreground">Total Package Value</p>
                    <p className="mt-1 font-semibold">${totalAccessUserPrice.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matrix" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Complete Access Matrix</CardTitle>
              <CardDescription>Compare every capability by plan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {MATRIX_CATEGORIES.map((category) => (
                <div key={category} className="rounded-lg border">
                  <div className="border-b bg-muted/40 px-4 py-2 text-sm font-medium">{category}</div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="px-4 py-2 text-left">Capability</th>
                          <th className="px-4 py-2 text-center">Starter</th>
                          <th className="px-4 py-2 text-center">Growth</th>
                          <th className="px-4 py-2 text-center">Enterprise</th>
                        </tr>
                      </thead>
                      <tbody>
                        {PRIVILEGE_DEFINITIONS.filter(
                          (entry) => getPrivilegeCategory(entry.code) === category
                        ).map((entry) => (
                          <tr key={entry.code} className="border-b last:border-none">
                            <td className="px-4 py-2">
                              <p>{entry.name}</p>
                              <p className="text-xs text-muted-foreground">{entry.description}</p>
                            </td>
                            {(PLAN_META.map((plan) => plan.code) as PlanCode[]).map((plan) => (
                              <td key={`${entry.code}-${plan}`} className="px-4 py-2 text-center">
                                {PLAN_WEIGHT[entry.minPlan as PlanCode] <= PLAN_WEIGHT[plan] ? (
                                  <Check className="mx-auto size-4 text-emerald-600" />
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="business" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Commercial Guide For Tourism Industry SaaS</CardTitle>
              <CardDescription>
                Practical sales messaging to convert prospects and improve annual contract value.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-lg border p-4">
                <p className="font-medium">1. Sell Outcomes, Not Modules</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Focus on faster proposal turnaround, improved margin control, and fewer operational mistakes.
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="font-medium">2. Match Plan To Maturity</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Starter for setup discipline, Growth for market expansion, Enterprise for strict governance.
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="font-medium">3. Anchor Annual ROI</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Compare annual plan cost against one lost group booking due to pricing delays or data inconsistency.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="legal" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>Can we upgrade plans anytime?</AccordionTrigger>
                  <AccordionContent>Yes. Plan upgrades can be done immediately by ADMIN users.</AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-billing-model">
                  <AccordionTrigger>Is this per-user or per-company pricing?</AccordionTrigger>
                  <AccordionContent>
                    Plans are billed yearly per company. Each plan includes a user quota, and extra users are charged yearly per user.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>How are access permissions controlled?</AccordionTrigger>
                  <AccordionContent>
                    Through role profiles and privilege codes, enforced at the API level.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger>Do you support enterprise procurement requirements?</AccordionTrigger>
                  <AccordionContent>
                    Yes. Contact sales for procurement, legal review, and enterprise contracting.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Legal & Contact</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => router.push("/terms-and-conditions")}>
                Terms & Conditions
              </Button>
              <Button variant="outline" onClick={() => router.push("/support/contact-us")}>
                Contact Us
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
