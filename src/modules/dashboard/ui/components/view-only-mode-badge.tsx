"use client";

import { Eye } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { authClient } from "@/lib/auth-client";

export function ViewOnlyModeBadge() {
  const { data: session } = authClient.useSession();
  const [isReadOnly, setIsReadOnly] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) {
      setIsReadOnly(false);
      return;
    }
    let active = true;
    (async () => {
      try {
        const response = await fetch("/api/companies/access-control", { cache: "no-store" });
        if (!response.ok) {
          if (active) setIsReadOnly(false);
          return;
        }
        const body = (await response.json()) as { readOnly?: boolean };
        if (!active) return;
        setIsReadOnly(Boolean(body.readOnly));
      } catch {
        if (active) setIsReadOnly(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [session?.user?.id]);

  if (!session?.user || !isReadOnly) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-50">
      <Badge variant="secondary" className="px-3 py-1 text-xs font-medium shadow">
        <Eye className="mr-1 size-3.5" />
        View Only Mode
      </Badge>
    </div>
  );
}
