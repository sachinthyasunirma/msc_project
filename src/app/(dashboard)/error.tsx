"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The dashboard could not finish loading this screen. Try the request again.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <Button onClick={reset}>Try Again</Button>
        </div>
      </div>
    </div>
  );
}
