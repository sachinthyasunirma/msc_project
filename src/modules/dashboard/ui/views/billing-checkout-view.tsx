"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, CreditCard } from "lucide-react";
import { notify } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ADDITIONAL_USER_PRICE_PER_MONTH,
  getDurationLabel,
  getDurationMonths,
  getDurationSuffix,
  getPerUserMonthlyRate,
  getPlanPackageTotal,
  type PlanCode,
  PLAN_META,
  type SubscriptionDuration,
} from "@/modules/dashboard/lib/billing-pricing";

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
};

function parsePlan(value: string | null): PlanCode {
  if (value === "GROWTH" || value === "ENTERPRISE") return value;
  return "STARTER";
}

function parseDuration(value: string | null): SubscriptionDuration {
  if (value === "QUARTERLY") return "QUARTERLY";
  return "YEARLY";
}

export function BillingCheckoutView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedPlan = parsePlan(searchParams.get("plan"));
  const selectedDuration = parseDuration(searchParams.get("duration"));

  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const selectedPlanMeta = useMemo(
    () => PLAN_META.find((entry) => entry.code === selectedPlan) ?? PLAN_META[0],
    [selectedPlan]
  );

  const pricingRows = useMemo(
    () =>
      PLAN_META.map((plan) => ({
        ...plan,
        total: getPlanPackageTotal(plan.code, plan.includedUsers, selectedDuration),
      })),
    [selectedDuration]
  );

  const durationLabel = getDurationLabel(selectedDuration);
  const durationSuffix = getDurationSuffix(selectedDuration);
  const durationMonths = getDurationMonths(selectedDuration);
  const monthlyRate = getPerUserMonthlyRate(selectedDuration);
  const selectedTotal = getPlanPackageTotal(
    selectedPlanMeta.code,
    selectedPlanMeta.includedUsers,
    selectedDuration
  );

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch("/api/companies/me", { cache: "no-store" });
        const body = (await response.json()) as { company?: CompanyProfile | null; message?: string };
        if (!response.ok) throw new Error(body.message || "Failed to load company.");
        if (!active) return;
        setCompany(body.company ?? null);
      } catch (error) {
        if (active) {
          notify.error(error instanceof Error ? error.message : "Failed to load checkout.");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const confirmSubscription = async () => {
    if (!company) {
      notify.error("Company details are not available.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/companies/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: company.code,
          name: company.name,
          email: company.email,
          secretCode: company.joinSecretCode || "",
          privilegeCode: company.managerPrivilegeCode || null,
          baseCurrencyCode: company.baseCurrencyCode,
          transportRateBasis: company.transportRateBasis,
          helpEnabled: company.helpEnabled,
          country: company.country,
          image: company.image,
          subscriptionPlan: selectedPlanMeta.code,
          subscriptionDuration: selectedDuration,
        }),
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(body.message || "Failed to confirm subscription.");

      notify.success("Subscription activated.");
      router.replace("/billing/plans");
      router.refresh();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to confirm subscription.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Checkout</CardTitle>
          <CardDescription>
            Review selected subscription, full plan details, and total before confirming.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Selected Plan Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">
              <span className="font-medium">Plan:</span> {selectedPlanMeta.name}
            </p>
            <p className="text-sm">
              <span className="font-medium">Duration:</span> {durationLabel} ({durationMonths} months)
            </p>
            <p className="text-sm">
              <span className="font-medium">Included Users:</span> {selectedPlanMeta.includedUsers}
            </p>
            <p className="text-sm">
              <span className="font-medium">Package Rule:</span>{" "}
              {selectedPlanMeta.isFree
                ? "Free mode (Starter)"
                : `${selectedPlanMeta.includedUsers} x $${monthlyRate}/user/month x ${durationMonths} months`}
            </p>
            <p className="text-sm">
              <span className="font-medium">Additional User:</span> $
              {ADDITIONAL_USER_PRICE_PER_MONTH}/user/month
            </p>
            <div className="rounded-md border bg-primary/5 p-3">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-2xl font-semibold">
                {selectedPlanMeta.isFree ? "Free" : `$${selectedTotal.toLocaleString()}`}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Confirm</CardTitle>
            <CardDescription>
              {company ? `${company.name} (${company.code})` : "Loading company..."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full"
              onClick={() => void confirmSubscription()}
              disabled={loading || submitting || !company}
            >
              <CreditCard className="mr-2 size-4" />
              {submitting ? "Processing..." : "Confirm Subscription"}
            </Button>
            <Button className="w-full" variant="outline" onClick={() => router.push("/billing/plans")}>
              Back To Plans
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Plan Details</CardTitle>
          <CardDescription>
            Duration: {durationLabel}. Additional users are billed at $
            {ADDITIONAL_USER_PRICE_PER_MONTH}/user/month.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {pricingRows.map((plan) => (
            <div
              key={plan.code}
              className={`rounded-md border p-3 ${plan.code === selectedPlanMeta.code ? "border-primary" : ""}`}
            >
              <p className="font-medium">{plan.name}</p>
              <p className="text-xs text-muted-foreground">{plan.subtitle}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Users: {plan.includedUsers} | Duration: {durationSuffix}
              </p>
              <p className="mt-1 text-lg font-semibold">
                {plan.isFree ? "Free" : `$${plan.total.toLocaleString()}`}
              </p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {plan.outcomes.map((line) => (
                  <li key={`${plan.code}-${line}`} className="flex items-start">
                    <Check className="mr-1 mt-0.5 size-3.5 text-emerald-600" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
