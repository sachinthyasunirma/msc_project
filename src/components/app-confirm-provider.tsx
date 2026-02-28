"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

type ConfirmOptions = {
  title?: string;
  description?: string;
  targetLabel?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
};

type ConfirmFn = (options?: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function AppConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({});
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const closeWith = useCallback((value: boolean) => {
    setOpen(false);
    const resolver = resolverRef.current;
    resolverRef.current = null;
    resolver?.(value);
  }, []);

  const confirm = useCallback<ConfirmFn>(async (nextOptions = {}) => {
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
    setOptions(nextOptions);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const value = useMemo(() => confirm, [confirm]);
  const resolvedDescription =
    options.description ||
    (options.targetLabel
      ? `You are about to delete "${options.targetLabel}". This action cannot be undone.`
      : "Are you sure you want to continue?");

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <AlertDialog open={open} onOpenChange={(nextOpen) => !nextOpen && closeWith(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{options.title ?? "Please Confirm"}</AlertDialogTitle>
            <AlertDialogDescription>{resolvedDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-w-24" onClick={() => closeWith(false)}>
              {options.cancelText ?? "No"}
            </AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                "min-w-24 font-semibold shadow-sm",
                options.destructive
                  ? buttonVariants({ variant: "destructive" })
                  : buttonVariants({ variant: "default" })
              )}
              onClick={() => closeWith(true)}
            >
              {options.confirmText ?? "Yes"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within AppConfirmProvider.");
  }
  return context;
}
