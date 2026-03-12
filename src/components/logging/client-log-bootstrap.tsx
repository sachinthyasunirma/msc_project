"use client";

import { useEffect } from "react";
import { initClientErrorLogging } from "@/lib/logging/client";

export function ClientLogBootstrap() {
  useEffect(() => {
    initClientErrorLogging("app");
  }, []);
  return null;
}
