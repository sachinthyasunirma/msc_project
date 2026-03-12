"use client";

import { Toaster } from "@/components/ui/sonner";

export function AppToaster() {
  return (
    <Toaster
      position="bottom-right"
      closeButton
      richColors
      toastOptions={{
        duration: 4000,
      }}
    />
  );
}

