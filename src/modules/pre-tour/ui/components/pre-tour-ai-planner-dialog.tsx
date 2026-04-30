"use client";

import Link from "next/link";
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  CalendarDays,
  CheckCircle2,
  Compass,
  Mail,
  Search,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { listEmailAccounts, listEmailMessages } from "@/modules/email-integration/lib/email-integration-api";
import type {
  EmailIntegrationAccount,
  EmailIntegrationIntakeProfile,
  EmailIntegrationMessageSummary,
} from "@/modules/email-integration/shared/email-integration-schemas";
import { listPreTourCategoryLookups } from "@/modules/pre-tour/lib/pre-tour-category-lookups-api";
import {
  applyAIPreTourDraft,
  buildAIPreTourEmailContext,
  generateAIPreTourDraft,
} from "@/modules/pre-tour/lib/pre-tour-ai-api";
import { toIsoDateTime, toLocalDateTime, toNightCount } from "@/modules/pre-tour/lib/pre-tour-management-utils";
import type {
  PreTourAIGenerateResponse,
  PreTourAIEmailContext,
  PreTourAIInputSource,
  PreTourAIMode,
  PreTourAIRequest,
} from "@/modules/pre-tour/shared/pre-tour-ai-schemas";
import type { Row } from "@/modules/pre-tour/shared/pre-tour-management-types";

type AIPlannerFormState = {
  mode: PreTourAIMode;
  prompt: string;
  categoryId: string;
  operatorOrgId: string;
  marketOrgId: string;
  startDate: string;
  endDate: string;
  adults: number;
  children: number;
  infants: number;
  currencyCode: string;
  preferredLanguage: string;
  roomPreference: string;
  mealPreference: string;
  priceMode: "EXCLUSIVE" | "INCLUSIVE";
  exchangeRateMode: "AUTO" | "MANUAL";
  exchangeRate: number;
  exchangeRateDate: string;
};

type PlannerStep = "source" | "email" | "plan";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRequest?: Partial<PreTourAIRequest> | null;
  currencies: Row[];
  organizations: Row[];
  operatorMarketContracts: Row[];
  tourCategories: Row[];
  companyBaseCurrencyCode: string;
  sourcePlan?: {
    id: string;
    planCode?: string | null;
    title?: string | null;
  } | null;
  onApplied?: (result: { planId: string; planCode: string; title: string }) => void;
};

const EMPTY_OPTION = "__none__";
const CATEGORY_LOOKUP_LIMIT = 500;

function buildInitialState(
  initialRequest: Partial<PreTourAIRequest> | null | undefined,
  companyBaseCurrencyCode: string,
  sourcePlanId?: string | null
): AIPlannerFormState {
  return {
    mode: initialRequest?.mode ?? (sourcePlanId ? "REVISE" : "CREATE"),
    prompt: initialRequest?.prompt ?? "",
    categoryId: initialRequest?.categoryId ?? "",
    operatorOrgId: initialRequest?.operatorOrgId ?? "",
    marketOrgId: initialRequest?.marketOrgId ?? "",
    startDate: initialRequest?.startDate ? toLocalDateTime(initialRequest.startDate) : "",
    endDate: initialRequest?.endDate ? toLocalDateTime(initialRequest.endDate) : "",
    adults: Number(initialRequest?.adults ?? 2),
    children: Number(initialRequest?.children ?? 0),
    infants: Number(initialRequest?.infants ?? 0),
    currencyCode: initialRequest?.currencyCode ?? companyBaseCurrencyCode,
    preferredLanguage: initialRequest?.preferredLanguage ?? "",
    roomPreference: initialRequest?.roomPreference ?? "",
    mealPreference: initialRequest?.mealPreference ?? "",
    priceMode: initialRequest?.priceMode ?? "EXCLUSIVE",
    exchangeRateMode: initialRequest?.exchangeRateMode ?? "AUTO",
    exchangeRate: Number(initialRequest?.exchangeRate ?? 0),
    exchangeRateDate: initialRequest?.exchangeRateDate
      ? toLocalDateTime(initialRequest.exchangeRateDate)
      : "",
  };
}

function badgeVariantForSeverity(severity: "low" | "medium" | "high") {
  if (severity === "high") return "destructive" as const;
  if (severity === "medium") return "secondary" as const;
  return "outline" as const;
}

function badgeVariantForAccuracy(value: "high" | "medium" | "low") {
  if (value === "high") return "default" as const;
  if (value === "medium") return "secondary" as const;
  return "destructive" as const;
}

function itemBadgeVariant(itemType: string) {
  switch (itemType) {
    case "TRANSPORT":
      return "secondary" as const;
    case "ACCOMMODATION":
      return "outline" as const;
    case "ACTIVITY":
      return "default" as const;
    case "GUIDE":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function buildCategoryOptions(rows: Row[], selectedCategoryId: string) {
  const options = new Map<string, { value: string; label: string }>();

  rows.forEach((row) => {
    const categoryId = String(row.id || "");
    if (!categoryId) return;

    const isActive = Boolean(row.isActive ?? true);
    if (!isActive && categoryId !== selectedCategoryId) return;

    options.set(categoryId, {
      value: categoryId,
      label: `${String(row.code)} - ${String(row.name)}${isActive ? "" : " (inactive)"}`,
    });
  });

  return Array.from(options.values());
}

function normalizeComparable(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function matchOptionValueByHint(
  hint: string | null | undefined,
  options: Array<{ value: string; label: string }>
) {
  const normalizedHint = normalizeComparable(String(hint || ""));
  if (!normalizedHint) return "";

  const scored = options
    .map((option) => {
      const label = normalizeComparable(option.label);
      let score = 0;
      if (label === normalizedHint) score += 100;
      if (label.startsWith(normalizedHint)) score += 70;
      if (label.includes(normalizedHint)) score += 50;
      if (normalizedHint.includes(label)) score += 30;

      const hintTerms = normalizedHint.split(" ").filter(Boolean);
      for (const term of hintTerms) {
        if (term.length < 2) continue;
        if (label.startsWith(term)) score += 8;
        else if (label.includes(term)) score += 4;
      }

      return { option, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);

  if (scored.length === 0) return "";
  if (scored.length === 1) return scored[0]!.option.value;
  return scored[0]!.score >= scored[1]!.score + 8 ? scored[0]!.option.value : "";
}

function toRequestPayload(
  form: AIPlannerFormState,
  sourcePlanId: string | null | undefined,
  sourceType: PreTourAIInputSource,
  emailContext: PreTourAIEmailContext | null
): PreTourAIRequest {
  return {
    mode: form.mode,
    sourceType,
    sourcePlanId: form.mode === "REVISE" ? sourcePlanId ?? null : null,
    emailContext: sourceType === "PROMPT" ? null : emailContext,
    prompt: form.prompt.trim(),
    categoryId: form.categoryId,
    operatorOrgId: form.operatorOrgId,
    marketOrgId: form.marketOrgId,
    startDate: toIsoDateTime(form.startDate) ?? "",
    endDate: toIsoDateTime(form.endDate) ?? "",
    adults: Number(form.adults ?? 0),
    children: Number(form.children ?? 0),
    infants: Number(form.infants ?? 0),
    currencyCode: form.currencyCode,
    preferredLanguage: form.preferredLanguage.trim() || null,
    roomPreference:
      form.roomPreference === "" ? null : (form.roomPreference as "DOUBLE" | "TWIN" | "MIXED"),
    mealPreference:
      form.mealPreference === "" ? null : (form.mealPreference as "BB" | "HB" | "FB" | "AI"),
    priceMode: form.priceMode,
    exchangeRateMode: form.exchangeRateMode,
    exchangeRate: Number(form.exchangeRate ?? 0),
    exchangeRateDate: form.exchangeRateDate ? toIsoDateTime(form.exchangeRateDate) : null,
  };
}

export function PreTourAIPlannerDialog({
  open,
  onOpenChange,
  initialRequest = null,
  currencies,
  organizations,
  operatorMarketContracts,
  tourCategories,
  companyBaseCurrencyCode,
  sourcePlan = null,
  onApplied,
}: Props) {
  const [form, setForm] = useState<AIPlannerFormState>(() =>
    buildInitialState(initialRequest, companyBaseCurrencyCode, sourcePlan?.id)
  );
  const [plannerStep, setPlannerStep] = useState<PlannerStep>("source");
  const [sourceType, setSourceType] = useState<PreTourAIInputSource>(
    initialRequest?.sourceType ?? "PROMPT"
  );
  const [result, setResult] = useState<PreTourAIGenerateResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isPreparingEmailContext, setIsPreparingEmailContext] = useState(false);
  const [generateCosting, setGenerateCosting] = useState(true);
  const [mobileTab, setMobileTab] = useState<"setup" | "preview">("setup");
  const [fallbackTourCategories, setFallbackTourCategories] = useState<Row[]>(tourCategories);
  const [isCategoryLookupLoading, setIsCategoryLookupLoading] = useState(false);
  const [categoryLookupError, setCategoryLookupError] = useState("");
  const [aiEmailAccounts, setAiEmailAccounts] = useState<EmailIntegrationAccount[]>([]);
  const [isEmailAccountsLoading, setIsEmailAccountsLoading] = useState(false);
  const [emailAccountsError, setEmailAccountsError] = useState("");
  const [selectedEmailAccountId, setSelectedEmailAccountId] = useState("");
  const [emailMessages, setEmailMessages] = useState<EmailIntegrationMessageSummary[]>([]);
  const [emailIntakeProfile, setEmailIntakeProfile] = useState<EmailIntegrationIntakeProfile | null>(
    null
  );
  const [isEmailMessagesLoading, setIsEmailMessagesLoading] = useState(false);
  const [emailMessagesError, setEmailMessagesError] = useState("");
  const [emailSearchQuery, setEmailSearchQuery] = useState("");
  const deferredEmailSearchQuery = useDeferredValue(emailSearchQuery);
  const [selectedEmailMessageUid, setSelectedEmailMessageUid] = useState<number | null>(null);
  const [emailPromptSupplement, setEmailPromptSupplement] = useState("");
  const [emailContext, setEmailContext] = useState<PreTourAIEmailContext | null>(
    initialRequest?.emailContext ?? null
  );
  const [emailContextSummary, setEmailContextSummary] = useState("");
  const [emailContextWarnings, setEmailContextWarnings] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setForm(buildInitialState(initialRequest, companyBaseCurrencyCode, sourcePlan?.id));
    setPlannerStep("source");
    setSourceType(initialRequest?.sourceType ?? "PROMPT");
    setResult(null);
    setGenerateCosting(true);
    setMobileTab("setup");
    setSelectedEmailAccountId("");
    setEmailMessages([]);
    setEmailIntakeProfile(null);
    setEmailMessagesError("");
    setEmailSearchQuery("");
    setSelectedEmailMessageUid(null);
    setEmailPromptSupplement("");
    setEmailContext(initialRequest?.emailContext ?? null);
    setEmailContextSummary("");
    setEmailContextWarnings([]);
  }, [companyBaseCurrencyCode, initialRequest, open, sourcePlan?.id]);

  useEffect(() => {
    if (tourCategories.length === 0) return;
    setFallbackTourCategories(tourCategories);
    setCategoryLookupError("");
  }, [tourCategories]);

  useEffect(() => {
    if (!open) return;
    if (tourCategories.length > 0 || fallbackTourCategories.length > 0) {
      setIsCategoryLookupLoading(false);
      return;
    }

    let cancelled = false;
    setIsCategoryLookupLoading(true);
    setCategoryLookupError("");

    void listPreTourCategoryLookups({ limit: CATEGORY_LOOKUP_LIMIT })
      .then((lookupData) => {
        if (cancelled) return;
        setFallbackTourCategories(lookupData.tourCategories);
      })
      .catch((error) => {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : "Failed to load pre-tour categories.";
        setCategoryLookupError(message);
      })
      .finally(() => {
        if (cancelled) return;
        setIsCategoryLookupLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fallbackTourCategories.length, open, tourCategories]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setIsEmailAccountsLoading(true);
    setEmailAccountsError("");

    void listEmailAccounts({ aiOnly: true })
      .then((response) => {
        if (cancelled) return;
        setAiEmailAccounts(response.items);
        const defaultAccount =
          response.items.find((entry) => entry.isDefaultForPreTourAI) ?? response.items[0] ?? null;
        setSelectedEmailAccountId((current) =>
          current && response.items.some((entry) => entry.id === current)
            ? current
            : defaultAccount?.id ?? ""
        );
      })
      .catch((error) => {
        if (cancelled) return;
        setEmailAccountsError(
          error instanceof Error ? error.message : "Failed to load AI email accounts."
        );
        setAiEmailAccounts([]);
      })
      .finally(() => {
        if (cancelled) return;
        setIsEmailAccountsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || plannerStep !== "email" || !selectedEmailAccountId) {
      setEmailMessages([]);
      setEmailIntakeProfile(null);
      setSelectedEmailMessageUid(null);
      return;
    }

    let cancelled = false;
    setIsEmailMessagesLoading(true);
    setEmailMessagesError("");

    void listEmailMessages({
      accountId: selectedEmailAccountId,
      q: deferredEmailSearchQuery,
      limit: 10,
    })
      .then((response) => {
        if (cancelled) return;
        setEmailIntakeProfile(response.intakeProfile ?? null);
        setEmailMessages(response.items);
        setSelectedEmailMessageUid((current) =>
          current && response.items.some((item) => item.uid === current)
            ? current
            : response.items[0]?.uid ?? null
        );
      })
      .catch((error) => {
        if (cancelled) return;
        setEmailMessagesError(
          error instanceof Error ? error.message : "Failed to load email messages."
        );
        setEmailIntakeProfile(null);
        setEmailMessages([]);
        setSelectedEmailMessageUid(null);
      })
      .finally(() => {
        if (cancelled) return;
        setIsEmailMessagesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [deferredEmailSearchQuery, open, plannerStep, selectedEmailAccountId]);

  const currencyOptions = useMemo(
    () =>
      currencies
        .filter((row) => Boolean(row.isActive ?? true))
        .map((row) => ({
          value: String(row.code),
          label: `${String(row.code)} - ${String(row.name)}`,
        })),
    [currencies]
  );

  const marketOptions = useMemo(
    () =>
      organizations
        .filter((row) => {
          const type = String(row.type || "");
          return Boolean(row.isActive ?? true) && (type === "MARKET" || type === "MARKETING");
        })
        .map((row) => ({
          value: String(row.id),
          label: `${String(row.code)} - ${String(row.name)}`,
        })),
    [organizations]
  );

  const operatorOptions = useMemo(
    () =>
      organizations
        .filter((row) => {
          const type = String(row.type || "");
          return Boolean(row.isActive ?? true) && (type === "OPERATOR" || type === "SUPPLIER");
        })
        .map((row) => ({
          value: String(row.id),
          label: `${String(row.code)} - ${String(row.name)}`,
        })),
    [organizations]
  );

  const allowedOperatorIdsByMarket = useMemo(() => {
    const map = new Map<string, string[]>();
    operatorMarketContracts
      .filter(
        (row) =>
          Boolean(row.isActive ?? true) && String(row.status || "ACTIVE").toUpperCase() === "ACTIVE"
      )
      .forEach((row) => {
        const marketId = String(row.marketOrgId || "");
        const operatorId = String(row.operatorOrgId || "");
        if (!marketId || !operatorId) return;
        map.set(marketId, [...(map.get(marketId) ?? []), operatorId]);
      });
    return map;
  }, [operatorMarketContracts]);

  const availableOperatorOptions = useMemo(() => {
    if (!form.marketOrgId) return operatorOptions;
    const allowed = allowedOperatorIdsByMarket.get(form.marketOrgId) ?? [];
    if (allowed.length === 0) return operatorOptions;
    return operatorOptions.filter((option) => allowed.includes(option.value));
  }, [allowedOperatorIdsByMarket, form.marketOrgId, operatorOptions]);

  const resolvedTourCategories = tourCategories.length > 0 ? tourCategories : fallbackTourCategories;
  const categoryOptions = useMemo(() => {
    return buildCategoryOptions(resolvedTourCategories, form.categoryId.trim());
  }, [form.categoryId, resolvedTourCategories]);

  const selectedEmailAccount =
    aiEmailAccounts.find((entry) => entry.id === selectedEmailAccountId) ?? null;
  const hasActiveEmailIntakeProfile = Boolean(emailIntakeProfile?.isActive);
  const isCategorySelectLoading = isCategoryLookupLoading && resolvedTourCategories.length === 0;
  const categoryPlaceholder = isCategorySelectLoading
    ? "Loading tour categories..."
    : categoryOptions.length > 0
      ? "Select tour category"
      : categoryLookupError
        ? "Unable to load tour categories"
        : "No tour categories available";

  const totalNights = useMemo(
    () => toNightCount(form.startDate, form.endDate),
    [form.endDate, form.startDate]
  );
  const canReviseExistingPlan = Boolean(sourcePlan?.id);
  const dialogTitle = form.mode === "REVISE" ? "AI Pre-Tour Revision" : "AI Pre-Tour Planner";
  const dialogDescription =
    form.mode === "REVISE"
      ? "Choose the request source, prepare the planning brief, and generate a revised draft from the current Pre-Tour."
      : "Choose how the AI should receive the brief, prepare the planning inputs, and generate a reviewable Pre-Tour draft.";
  const generateLabel =
    form.mode === "REVISE"
      ? isGenerating
        ? "Generating Revision..."
        : "Generate Revision"
      : isGenerating
        ? "Generating..."
        : "Generate Draft";
  const applyLabel =
    form.mode === "REVISE"
      ? isApplying
        ? "Applying Revision..."
        : "Apply Revision"
      : isApplying
        ? "Applying..."
        : "Apply Draft";
  const canGenerate =
    form.prompt.trim().length >= 20 &&
    Boolean(form.categoryId) &&
    Boolean(form.operatorOrgId) &&
    Boolean(form.marketOrgId) &&
    Boolean(form.startDate) &&
    Boolean(form.endDate) &&
    Boolean(form.currencyCode) &&
    !isCategorySelectLoading;

  const handleFieldChange = <K extends keyof AIPlannerFormState>(
    key: K,
    value: AIPlannerFormState[K]
  ) => {
    setForm((previous) => {
      if (previous[key] === value) return previous;
      return { ...previous, [key]: value };
    });
    setResult((previous) => (previous ? null : previous));
  };

  const handleMarketChange = (value: string) => {
    setForm((previous) => {
      if (previous.marketOrgId === value && previous.operatorOrgId === "") return previous;
      return {
        ...previous,
        marketOrgId: value,
        operatorOrgId: "",
      };
    });
    setResult((previous) => (previous ? null : previous));
  };

  const handleSelectSource = (nextSourceType: PreTourAIInputSource) => {
    setSourceType(nextSourceType);
    setResult(null);
    setGenerateCosting(true);
    if (nextSourceType === "PROMPT") {
      setEmailContext(null);
      setEmailContextSummary("");
      setEmailContextWarnings([]);
      setPlannerStep("plan");
      setMobileTab("setup");
      return;
    }

    setPlannerStep("email");
  };

  const handlePrepareEmailContext = async () => {
    if (!selectedEmailAccountId || !selectedEmailMessageUid || sourceType === "PROMPT") return;

    try {
      setIsPreparingEmailContext(true);
      const prefill = await buildAIPreTourEmailContext({
        accountId: selectedEmailAccountId,
        messageUid: selectedEmailMessageUid,
        sourceType: sourceType === "EMAIL_AND_PROMPT" ? "EMAIL_AND_PROMPT" : "EMAIL",
        prompt: sourceType === "EMAIL_AND_PROMPT" ? emailPromptSupplement : "",
      });

      const matchedMarketId = matchOptionValueByHint(prefill.hints.marketHint, marketOptions);
      const matchedCategoryId = matchOptionValueByHint(prefill.hints.categoryHint, categoryOptions);
      const allowedForMatchedMarket = matchedMarketId
        ? allowedOperatorIdsByMarket.get(matchedMarketId) ?? []
        : [];
      const operatorScope =
        matchedMarketId && allowedForMatchedMarket.length > 0
          ? operatorOptions.filter((option) => allowedForMatchedMarket.includes(option.value))
          : operatorOptions;
      const matchedOperatorId = matchOptionValueByHint(prefill.hints.operatorHint, operatorScope);

      setForm((previous) => ({
        ...previous,
        prompt: prefill.promptDraft,
        categoryId: matchedCategoryId || previous.categoryId,
        marketOrgId: matchedMarketId || previous.marketOrgId,
        operatorOrgId: matchedOperatorId || previous.operatorOrgId,
        startDate: prefill.hints.startDate
          ? toLocalDateTime(prefill.hints.startDate)
          : previous.startDate,
        endDate: prefill.hints.endDate ? toLocalDateTime(prefill.hints.endDate) : previous.endDate,
        adults: prefill.hints.adults ?? previous.adults,
        children: prefill.hints.children ?? previous.children,
        infants: prefill.hints.infants ?? previous.infants,
        preferredLanguage: prefill.hints.preferredLanguage ?? previous.preferredLanguage,
        roomPreference: prefill.hints.roomPreference ?? previous.roomPreference,
        mealPreference: prefill.hints.mealPreference ?? previous.mealPreference,
      }));
      setEmailContext(prefill.source);
      setEmailContextSummary(prefill.summary);
      setEmailContextWarnings(prefill.warnings);
      setResult(null);
      startTransition(() => {
        setPlannerStep("plan");
        setMobileTab("setup");
      });
      notify.success("Email context loaded into the AI planner.");
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : "Failed to prepare AI context from email."
      );
    } finally {
      setIsPreparingEmailContext(false);
    }
  };

  const handleGenerate = async () => {
    try {
      const payload = toRequestPayload(form, sourcePlan?.id, sourceType, emailContext);
      setIsGenerating(true);
      const response = await generateAIPreTourDraft(payload);
      startTransition(() => {
        setResult(response);
        setMobileTab("preview");
      });
      notify.success(
        form.mode === "REVISE"
          ? "AI pre-tour revision draft generated."
          : "AI pre-tour draft generated."
      );
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to generate AI pre-tour draft.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = async () => {
    if (!result) return;
    try {
      const payload = toRequestPayload(form, sourcePlan?.id, sourceType, emailContext);
      setIsApplying(true);
      const applied = await applyAIPreTourDraft({
        runId: result.runId,
        request: payload,
        draft: result.draft,
        generateCosting,
      });
      notify.success(
        form.mode === "REVISE"
          ? `AI revision created as ${applied.planCode}.`
          : `AI pre-tour created as ${applied.planCode}.`
      );
      onOpenChange(false);
      onApplied?.(applied);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to apply AI draft.");
    } finally {
      setIsApplying(false);
    }
  };

  const validation = result?.validation ?? null;

  const sourcePanel = (
    <ScrollArea className="h-full min-h-0">
      <div className="space-y-5 p-4 sm:p-6">
        <Card className="border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <WandSparkles className="size-4" />
              Select AI Input Source
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-3">
            {[
              {
                key: "PROMPT" as const,
                title: "Prompt",
                description:
                  "Continue with the current manual planning brief and fill the AI header details yourself.",
                badge: "Current Flow",
              },
              {
                key: "EMAIL" as const,
                title: "Email",
                description:
                  "Pick a customer email, let AI prepare the planning brief, then review the prefilled header before generation.",
                badge: "IMAP Source",
              },
              {
                key: "EMAIL_AND_PROMPT" as const,
                title: "Email + Prompt",
                description:
                  "Start from a customer email, then add your own planner note to shape the final AI request before generation.",
                badge: "Best for Ops Review",
              },
            ].map((option) => {
              const disabled = false;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => handleSelectSource(option.key)}
                  disabled={disabled}
                  className={cn(
                    "rounded-xl border p-5 text-left transition hover:border-foreground/30 hover:bg-muted/20",
                    disabled && "cursor-not-allowed opacity-60",
                    sourceType === option.key && "border-foreground/50 bg-muted/30"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <p className="text-base font-semibold">{option.title}</p>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                    <Badge variant="outline">{option.badge}</Badge>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Alert>
          <Sparkles className="size-4" />
          <AlertTitle>Recommended production workflow</AlertTitle>
          <AlertDescription>
            For email-driven requests, the AI first prepares a structured planning brief from the selected
            mailbox message. You still review the header, prompt, and master-data selections before the
            final draft is generated.
          </AlertDescription>
        </Alert>

        {emailAccountsError ? (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertTitle>Email source is not ready</AlertTitle>
            <AlertDescription>{emailAccountsError}</AlertDescription>
          </Alert>
        ) : null}

        {!emailAccountsError && !isEmailAccountsLoading && aiEmailAccounts.length === 0 ? (
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">No AI email account configured</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Set up at least one IMAP mailbox in configuration before using Email or Email + Prompt.
              </p>
              <Button asChild variant="outline">
                <Link href="/master-data/ai-email" onClick={() => onOpenChange(false)}>
                  Open AI Email Master
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </ScrollArea>
  );

  const emailPanel = (
    <ScrollArea className="h-full min-h-0">
      <div className="space-y-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-medium">Email Intake</p>
            <p className="text-sm text-muted-foreground">
              Select the configured mailbox and choose the customer message to turn into AI planning context.
            </p>
          </div>
          <Button variant="outline" onClick={() => setPlannerStep("source")}>
            <ArrowLeft className="mr-2 size-4" />
            Back to Source
          </Button>
        </div>

        <Card className="border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="size-4" />
              Mailbox Selection
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">AI Email Account</label>
              <Select
                value={selectedEmailAccountId || undefined}
                onValueChange={(value) => {
                  setSelectedEmailAccountId(value);
                  setEmailIntakeProfile(null);
                  setEmailMessages([]);
                  setSelectedEmailMessageUid(null);
                  setResult(null);
                }}
                disabled={isEmailAccountsLoading || aiEmailAccounts.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select configured AI mailbox" />
                </SelectTrigger>
                <SelectContent>
                  {aiEmailAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.displayName} · {account.emailAddress}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedEmailAccount ? (
              <div className="rounded-lg border bg-muted/15 p-3 text-sm text-muted-foreground">
                {selectedEmailAccount.emailAddress} · {selectedEmailAccount.host}:{selectedEmailAccount.port} ·{" "}
                {selectedEmailAccount.mailbox}
              </div>
            ) : null}

            {selectedEmailAccountId ? (
              emailIntakeProfile ? (
                <Alert variant={emailIntakeProfile.isActive ? "default" : "destructive"}>
                  <Sparkles className="size-4" />
                  <AlertTitle>
                    {emailIntakeProfile.isActive
                      ? "Active intake filter applied"
                      : "Intake filter is inactive"}
                  </AlertTitle>
                  <AlertDescription className="space-y-2">
                    <p>
                      {emailIntakeProfile.emailAddresses.length} configured user email
                      {emailIntakeProfile.emailAddresses.length === 1 ? "" : "s"} and{" "}
                      {emailIntakeProfile.keywords.length} keyword
                      {emailIntakeProfile.keywords.length === 1 ? "" : "s"} are used to qualify
                      emails for the AI Draft picker.
                    </p>
                    {!emailIntakeProfile.isActive ? (
                      <p>
                        Activate this intake filter in AI Email Master before using this mailbox in
                        the planner.
                      </p>
                    ) : null}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertTriangle className="size-4" />
                  <AlertTitle>No intake filter configured</AlertTitle>
                  <AlertDescription>
                    Configure user email addresses and keywords for this mailbox in AI Email Master
                    before using Email or Email + Prompt.
                  </AlertDescription>
                </Alert>
              )
            ) : null}

            <div className="grid gap-2">
              <label className="text-sm font-medium">Search Within Filtered Emails</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={emailSearchQuery}
                  onChange={(event) => setEmailSearchQuery(event.target.value)}
                  className="pl-9"
                  placeholder="Search inside the rule-matched emails by subject, sender, or text"
                />
              </div>
            </div>

            {sourceType === "EMAIL_AND_PROMPT" ? (
              <div className="grid gap-2">
                <label className="text-sm font-medium">Planner Note</label>
                <Textarea
                  value={emailPromptSupplement}
                  onChange={(event) => setEmailPromptSupplement(event.target.value)}
                  className="min-h-32"
                  placeholder="Add your extra instruction here. Example: keep 2 hotel bases maximum, focus on culture + beach, avoid long day transfers, or upgrade the experience level."
                />
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Available Messages</CardTitle>
          </CardHeader>
          <CardContent>
            {emailMessagesError ? (
              <Alert variant="destructive">
                <AlertTriangle className="size-4" />
                <AlertTitle>Unable to load messages</AlertTitle>
                <AlertDescription>{emailMessagesError}</AlertDescription>
              </Alert>
            ) : isEmailMessagesLoading ? (
              <div className="py-8 text-sm text-muted-foreground">Loading messages...</div>
            ) : !emailIntakeProfile ? (
              <div className="py-8 text-sm text-muted-foreground">
                No intake filter is configured for the selected mailbox yet.
              </div>
            ) : !hasActiveEmailIntakeProfile ? (
              <div className="py-8 text-sm text-muted-foreground">
                The configured intake filter is inactive, so mailbox emails are hidden from the AI picker.
              </div>
            ) : emailMessages.length === 0 ? (
              <div className="py-8 text-sm text-muted-foreground">
                No emails matched the configured user email addresses and keywords for this mailbox.
              </div>
            ) : (
              <div className="space-y-3">
                {emailMessages.map((message) => (
                  <button
                    key={`${message.uid}-${message.messageId ?? message.subject ?? "message"}`}
                    type="button"
                    onClick={() => setSelectedEmailMessageUid(message.uid)}
                    className={cn(
                      "w-full rounded-xl border p-4 text-left transition hover:border-foreground/30 hover:bg-muted/20",
                      selectedEmailMessageUid === message.uid && "border-foreground/50 bg-muted/30"
                    )}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <p className="font-medium break-words">{message.subject || "(No subject)"}</p>
                        <p className="text-sm text-muted-foreground break-words">
                          {message.fromName || message.fromEmail || "Unknown sender"}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {message.matchedEmailAddress ? (
                            <Badge variant="outline">Matched email: {message.matchedEmailAddress}</Badge>
                          ) : null}
                          {message.matchedKeywords.slice(0, 3).map((keyword) => (
                            <Badge key={`${message.uid}-${keyword}`} variant="secondary">
                              {keyword}
                            </Badge>
                          ))}
                          {message.matchedKeywords.length > 3 ? (
                            <Badge variant="secondary">+{message.matchedKeywords.length - 3} keywords</Badge>
                          ) : null}
                        </div>
                        {message.preview ? (
                          <p className="text-sm text-muted-foreground break-words">{message.preview}</p>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-left text-xs text-muted-foreground sm:text-right">
                        <p>UID {message.uid}</p>
                        {message.receivedAt ? <p>{formatDate(message.receivedAt)}</p> : null}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );

  const setupPanel = (
    <ScrollArea className="h-full min-h-0">
      <div className="space-y-5 p-4 sm:p-6">
        {sourceType !== "PROMPT" && emailContext ? (
          <Alert>
            <Mail className="size-4" />
            <AlertTitle>
              Email context loaded from {emailContext.accountEmail}
            </AlertTitle>
            <AlertDescription className="space-y-2">
              <p className="break-words">
                {emailContext.subject || "Selected customer email"}{emailContext.receivedAt ? ` · ${formatDate(emailContext.receivedAt)}` : ""}
              </p>
              {emailContextSummary ? <p className="text-sm">{emailContextSummary}</p> : null}
              {emailContextWarnings.length > 0 ? (
                <div className="space-y-1">
                  {emailContextWarnings.map((warning) => (
                    <p key={warning} className="text-sm break-words">
                      - {warning}
                    </p>
                  ))}
                </div>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}

        <Card className="border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Compass className="size-4" />
              Header Context
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {canReviseExistingPlan ? (
              <>
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium">Workflow</label>
                  <Select
                    value={form.mode}
                    onValueChange={(value) => handleFieldChange("mode", value as PreTourAIMode)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="REVISE">Revise current pre-tour</SelectItem>
                      <SelectItem value="CREATE">Create a new plan instead</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.mode === "REVISE" ? (
                  <Alert>
                    <Sparkles className="size-4" />
                    <AlertTitle>Revision mode creates a new version</AlertTitle>
                    <AlertDescription>
                      The AI will use{" "}
                      <span className="font-medium text-foreground">
                        {sourcePlan?.planCode || "the current plan"}
                      </span>{" "}
                      as the baseline and apply the result as a new Pre-Tour version instead of
                      overwriting the existing plan.
                    </AlertDescription>
                  </Alert>
                ) : null}
              </>
            ) : null}

            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Tour Category</label>
              <Select
                value={form.categoryId || undefined}
                onValueChange={(value) => handleFieldChange("categoryId", value)}
                disabled={isCategorySelectLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={categoryPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.length > 0 ? (
                    categoryOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      {categoryPlaceholder}
                    </div>
                  )}
                </SelectContent>
              </Select>
              {categoryLookupError ? (
                <p className="text-xs text-destructive">{categoryLookupError}</p>
              ) : !isCategorySelectLoading && categoryOptions.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Create a tour category or check Pre-Tour lookup access.
                </p>
              ) : null}
            </div>

            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Market</label>
              <Select value={form.marketOrgId || undefined} onValueChange={handleMarketChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select market" />
                </SelectTrigger>
                <SelectContent>
                  {marketOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Operator</label>
              <Select
                value={form.operatorOrgId || undefined}
                onValueChange={(value) => handleFieldChange("operatorOrgId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select operator" />
                </SelectTrigger>
                <SelectContent>
                  {availableOperatorOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="datetime-local"
                  value={form.startDate}
                  onChange={(event) => handleFieldChange("startDate", event.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="datetime-local"
                  value={form.endDate}
                  onChange={(event) => handleFieldChange("endDate", event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Adults</label>
                <Input
                  type="number"
                  min={1}
                  value={form.adults}
                  onChange={(event) => handleFieldChange("adults", Number(event.target.value || 0))}
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Children</label>
                <Input
                  type="number"
                  min={0}
                  value={form.children}
                  onChange={(event) => handleFieldChange("children", Number(event.target.value || 0))}
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Infants</label>
                <Input
                  type="number"
                  min={0}
                  value={form.infants}
                  onChange={(event) => handleFieldChange("infants", Number(event.target.value || 0))}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Currency</label>
                <Select
                  value={form.currencyCode || undefined}
                  onValueChange={(value) => handleFieldChange("currencyCode", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencyOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Language</label>
                <Input
                  value={form.preferredLanguage}
                  onChange={(event) => handleFieldChange("preferredLanguage", event.target.value)}
                  placeholder="EN / DE / FR"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Room Preference</label>
                <Select
                  value={form.roomPreference || EMPTY_OPTION}
                  onValueChange={(value) =>
                    handleFieldChange("roomPreference", value === EMPTY_OPTION ? "" : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_OPTION}>No preference</SelectItem>
                    <SelectItem value="DOUBLE">DOUBLE</SelectItem>
                    <SelectItem value="TWIN">TWIN</SelectItem>
                    <SelectItem value="MIXED">MIXED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Meal Preference</label>
                <Select
                  value={form.mealPreference || EMPTY_OPTION}
                  onValueChange={(value) =>
                    handleFieldChange("mealPreference", value === EMPTY_OPTION ? "" : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_OPTION}>No preference</SelectItem>
                    <SelectItem value="BB">BB</SelectItem>
                    <SelectItem value="HB">HB</SelectItem>
                    <SelectItem value="FB">FB</SelectItem>
                    <SelectItem value="AI">AI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Price Mode</label>
                <Select
                  value={form.priceMode}
                  onValueChange={(value) =>
                    handleFieldChange("priceMode", value as "EXCLUSIVE" | "INCLUSIVE")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXCLUSIVE">EXCLUSIVE</SelectItem>
                    <SelectItem value="INCLUSIVE">INCLUSIVE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">FX Mode</label>
                <Select
                  value={form.exchangeRateMode}
                  onValueChange={(value) =>
                    handleFieldChange("exchangeRateMode", value as "AUTO" | "MANUAL")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AUTO">AUTO</SelectItem>
                    <SelectItem value="MANUAL">MANUAL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.exchangeRateMode === "MANUAL" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium">Exchange Rate</label>
                  <Input
                    type="number"
                    min={0}
                    step="0.0001"
                    value={form.exchangeRate}
                    onChange={(event) =>
                      handleFieldChange("exchangeRate", Number(event.target.value || 0))
                    }
                  />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium">FX Date</label>
                  <Input
                    type="datetime-local"
                    value={form.exchangeRateDate}
                    onChange={(event) => handleFieldChange("exchangeRateDate", event.target.value)}
                  />
                </div>
              </div>
            ) : null}

            <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              {form.startDate && form.endDate ? (
                <>
                  <span className="font-medium text-foreground">{totalNights}</span> nights across{" "}
                  <span className="font-medium text-foreground">{totalNights + 1}</span> planning days.
                </>
              ) : (
                "Select a date range to anchor the AI day structure."
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="size-4" />
              Planning Prompt
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={form.prompt}
              onChange={(event) => handleFieldChange("prompt", event.target.value)}
              className="min-h-48 sm:min-h-56"
              placeholder={
                form.mode === "REVISE"
                  ? "Describe what should change in the current plan: routing improvements, destination swaps, hotel level upgrades, added experiences, pacing changes, or operational constraints the revision must respect."
                  : sourceType === "PROMPT"
                    ? "Describe the travel style, destinations, must-have experiences, hotel level, transport expectations, operational constraints, and anything the AI should respect."
                    : "The prompt was prepared from the selected email. You can refine it here before generation."
              }
            />
            <Alert>
              <AlertTriangle className="size-4" />
              <AlertTitle>Accuracy guardrail</AlertTitle>
              <AlertDescription>
                The AI only drafts structure. Rates, taxes, and FX remain deterministic and should still
                be reviewed through the normal Pre-Tour costing flow.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );

  const previewPanel = (
    <ScrollArea className="h-full min-h-0">
      <div className="space-y-5 p-4 sm:p-6">
        {!result ? (
          <div className="flex min-h-[18rem] items-center justify-center rounded-xl border border-dashed bg-muted/10 p-6 text-center sm:min-h-[24rem] sm:p-8">
            <div className="max-w-md space-y-3">
              <Sparkles className="mx-auto size-8 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Generate a structured draft</h3>
              <p className="text-sm text-muted-foreground">
                The planner will map your brief against master data, produce a day-by-day Pre-Tour draft,
                and score how safely it can be applied.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Card className="border-border/70">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Accuracy</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant={badgeVariantForAccuracy(result.validation.overallAccuracy)}>
                      {result.validation.overallAccuracy.toUpperCase()}
                    </Badge>
                    <span className="text-sm font-medium">
                      {result.validation.masterCoveragePercent}% coverage
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/70">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Resolved References</p>
                  <p className="mt-2 text-lg font-semibold">
                    {result.validation.resolvedReferenceCount}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/70">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Unresolved References</p>
                  <p className="mt-2 text-lg font-semibold">
                    {result.validation.unresolvedReferenceCount}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/70">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Apply Status</p>
                  <div className="mt-2 flex items-center gap-2">
                    {result.validation.canApply ? (
                      <>
                        <CheckCircle2 className="size-4 text-emerald-600" />
                        <span className="font-medium">Ready to apply</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="size-4 text-destructive" />
                        <span className="font-medium">Needs fixes first</span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {validation?.issues.length ? (
              <Alert variant={validation.canApply ? "default" : "destructive"}>
                <AlertTriangle className="size-4" />
                <AlertTitle>
                  {validation.canApply
                    ? "Review these issues before approval"
                    : "High-severity issues are blocking apply"}
                </AlertTitle>
                <AlertDescription className="space-y-2">
                  {validation.issues.slice(0, 8).map((issue) => (
                    <div key={`${issue.path}-${issue.message}`} className="flex items-start gap-2">
                      <Badge variant={badgeVariantForSeverity(issue.severity)}>
                        {issue.severity.toUpperCase()}
                      </Badge>
                      <span>
                        {issue.message}
                        <span className="text-muted-foreground"> [{issue.path}]</span>
                      </span>
                    </div>
                  ))}
                  {validation.issues.length > 8 ? (
                    <p className="text-xs text-muted-foreground">
                      Showing 8 of {validation.issues.length} validation issues.
                    </p>
                  ) : null}
                </AlertDescription>
              </Alert>
            ) : null}

            <Card className="border-border/70">
              <CardHeader className="pb-3">
                <CardTitle className="text-base break-words">{result.draft.plan.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{result.draft.plan.summary}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    <CalendarDays className="size-3" />
                    {result.draft.days.length} days
                  </Badge>
                  {validation?.overlappingSeasons.map((season) => (
                    <Badge key={season} variant="outline">
                      {season}
                    </Badge>
                  ))}
                </div>
                {result.draft.assumptions.length ? (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Assumptions</p>
                    {result.draft.assumptions.map((assumption) => (
                      <p key={assumption} className="text-sm text-muted-foreground break-words">
                        - {assumption}
                      </p>
                    ))}
                  </div>
                ) : null}
                {result.draft.unresolvedQuestions.length ? (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Needs clarification</p>
                    {result.draft.unresolvedQuestions.map((question) => (
                      <p key={question} className="text-sm text-muted-foreground break-words">
                        - {question}
                      </p>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <div className="space-y-3">
              {result.draft.days.map((day) => (
                <Card key={`${day.dayNumber}-${day.title}`} className="border-border/70">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base break-words">
                      Day {day.dayNumber} • {day.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{formatDate(day.date)}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {day.notes ? (
                      <p className="text-sm text-muted-foreground">{day.notes}</p>
                    ) : null}
                    <div className="space-y-2">
                      {day.items.map((item, index) => (
                        <div
                          key={`${item.itemType}-${index}-${item.title}`}
                          className="rounded-lg border bg-muted/10 p-3"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={itemBadgeVariant(item.itemType)}>
                                  {item.itemType}
                                </Badge>
                                <span className="font-medium break-words">{item.title}</span>
                              </div>
                              <p className="mt-1 text-sm text-muted-foreground break-words">
                                {item.description || item.rationale}
                              </p>
                            </div>
                            <div className="text-left text-xs text-muted-foreground sm:text-right">
                              {item.serviceCode ? <p>Service: {item.serviceCode}</p> : null}
                              {item.fromLocationCode || item.toLocationCode ? (
                                <p className="break-words">
                                  {item.fromLocationCode || "?"} → {item.toLocationCode || "?"}
                                </p>
                              ) : item.locationCode ? (
                                <p>Location: {item.locationCode}</p>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  );

  const stepContent =
    plannerStep === "source" ? sourcePanel : plannerStep === "email" ? emailPanel : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid h-[100dvh] max-h-[100dvh] w-[100vw] max-w-[100vw] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-none border-0 p-0 sm:h-[94dvh] sm:max-h-[94dvh] sm:w-[min(1100px,calc(100vw-2rem))] sm:max-w-[1100px] sm:rounded-lg sm:border">
        <DialogHeader className="border-b px-4 py-4 pr-12 sm:px-6">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5" />
            {dialogTitle}
          </DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-hidden border-b px-3 py-3 sm:px-6">
          {plannerStep === "plan" ? (
            <Tabs
              value={mobileTab}
              onValueChange={(value) => setMobileTab(value as "setup" | "preview")}
              className="h-full min-h-0"
            >
              <TabsList className="grid h-auto w-full shrink-0 grid-cols-2">
                <TabsTrigger value="setup">Setup</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="setup" className="min-h-0 overflow-hidden">
                {setupPanel}
              </TabsContent>
              <TabsContent value="preview" className="min-h-0 overflow-hidden">
                {previewPanel}
              </TabsContent>
            </Tabs>
          ) : (
            stepContent
          )}
        </div>

        <DialogFooter className="border-t px-3 py-3 sm:px-6 sm:py-4">
          {plannerStep === "source" ? (
            <div className="flex w-full justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          ) : plannerStep === "email" ? (
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Button variant="outline" onClick={() => setPlannerStep("source")}>
                <ArrowLeft className="mr-2 size-4" />
                Back
              </Button>
              <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
                <Button
                  onClick={() => void handlePrepareEmailContext()}
                  disabled={
                    !selectedEmailAccountId ||
                    !selectedEmailMessageUid ||
                    isPreparingEmailContext ||
                    isEmailMessagesLoading
                  }
                >
                  {isPreparingEmailContext ? "Preparing..." : "Use Email Context"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex items-start gap-2 text-sm text-muted-foreground sm:items-center">
                <Checkbox
                  checked={generateCosting}
                  onCheckedChange={(checked) => setGenerateCosting(Boolean(checked))}
                  disabled={!result || !result.validation.canApply}
                />
                Generate costing after apply
              </label>

              <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
                {sourceType !== "PROMPT" ? (
                  <Button
                    variant="outline"
                    onClick={() => setPlannerStep("email")}
                    disabled={isGenerating || isApplying}
                    className="w-full sm:w-auto"
                  >
                    Back to Email
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isGenerating || isApplying}
                  className="w-full sm:w-auto"
                >
                  Close
                </Button>
                <Button
                  onClick={() => void handleGenerate()}
                  disabled={!canGenerate || isGenerating || isApplying}
                  className="w-full sm:w-auto"
                >
                  {generateLabel}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void handleApply()}
                  disabled={!result || !result.validation.canApply || isGenerating || isApplying}
                  className="w-full sm:w-auto"
                >
                  {applyLabel}
                </Button>
              </div>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
