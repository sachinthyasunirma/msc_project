"use client";

import { useEffect } from "react";
import { installClientApiFetchPatch } from "@/lib/http/client-api-fetch";
import { initClientErrorLogging } from "@/lib/logging/client";

export function ClientLogBootstrap() {
  useEffect(() => {
    installClientApiFetchPatch();
    initClientErrorLogging("app");
  }, []);
  return null;
}
