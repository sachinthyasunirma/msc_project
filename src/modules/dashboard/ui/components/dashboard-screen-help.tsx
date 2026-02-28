"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { authClient } from "@/lib/auth-client";
import { getScreenHelpDoc } from "@/modules/dashboard/shared/screen-help-docs";

type CompanySettingsResponse = {
  company?: {
    helpEnabled?: boolean | null;
  } | null;
};

export function DashboardScreenHelp() {
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const isReadOnly = Boolean(
    (session?.user as { readOnly?: boolean } | undefined)?.readOnly
  );
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch("/api/companies/me", { cache: "no-store" });
        if (!response.ok) return;
        const body = (await response.json()) as CompanySettingsResponse;
        if (!active) return;
        setEnabled(body.company?.helpEnabled !== false);
      } catch {
        if (active) setEnabled(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const doc = useMemo(() => getScreenHelpDoc(pathname), [pathname]);

  if (!enabled || !doc) return null;

  return (
    <>
      <div
        className={`fixed right-4 z-50 ${
          isReadOnly ? "bottom-16" : "bottom-4"
        }`}
      >
        <Button
          variant="outline"
          size="icon"
          className="size-10 rounded-full shadow-sm"
          onClick={() => setOpen(true)}
          title="Screen Help"
          aria-label="Open screen help"
        >
          <CircleHelp className="size-4" />
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{doc.title} Guide</DialogTitle>
            <DialogDescription>{doc.summary}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[62vh] space-y-4 overflow-y-auto pr-1">
            <div>
              <p className="mb-2 text-sm font-medium">Data Entry Steps</p>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                {doc.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
            {doc.tabScenarios && doc.tabScenarios.length > 0 ? (
              <div>
                <p className="mb-2 text-sm font-medium">Tab Scenarios</p>
                <div className="space-y-3">
                  {doc.tabScenarios.map((scenario) => (
                    <div key={scenario.tab} className="rounded-md border p-3">
                      <p className="text-sm font-medium">{scenario.tab}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Purpose:</span> {scenario.purpose}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">When to use:</span> {scenario.whenToUse}
                      </p>
                      <p className="mt-2 text-xs font-medium">Key Fields</p>
                      <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                        {scenario.keyFields.map((field) => (
                          <li key={`${scenario.tab}-${field}`}>{field}</li>
                        ))}
                      </ul>
                      {scenario.validationNotes && scenario.validationNotes.length > 0 ? (
                        <>
                          <p className="mt-2 text-xs font-medium">Validation Notes</p>
                          <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                            {scenario.validationNotes.map((note) => (
                              <li key={`${scenario.tab}-${note}`}>{note}</li>
                            ))}
                          </ul>
                        </>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {doc.fields && doc.fields.length > 0 ? (
              <div>
                <p className="mb-2 text-sm font-medium">Field Instructions</p>
                <div className="space-y-2">
                  {doc.fields.map((item) => (
                    <div key={`${item.field}-${item.instruction}`} className="rounded-md border p-3">
                      <p className="text-sm font-medium">
                        {item.field}
                        {item.required ? " (Required)" : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">{item.instruction}</p>
                      {item.example ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Example: <span className="font-mono">{item.example}</span>
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {doc.checklist && doc.checklist.length > 0 ? (
              <div>
                <p className="mb-2 text-sm font-medium">Before Save Checklist</p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {doc.checklist.map((rule) => (
                    <li key={rule}>{rule}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {doc.tips && doc.tips.length > 0 ? (
              <div>
                <p className="mb-2 text-sm font-medium">Tips</p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {doc.tips.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
