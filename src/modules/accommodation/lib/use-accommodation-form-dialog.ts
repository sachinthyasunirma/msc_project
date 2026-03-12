"use client";

import { useCallback, useState } from "react";
import type { DialogMode } from "@/modules/accommodation/lib/accommodation-view-helpers";

type DialogState<Row> = {
  open: boolean;
  mode: DialogMode;
  row: Row | null;
};

export function useAccommodationFormDialog<FormState, Row>(
  createInitialForm: (row?: Row | null) => FormState
) {
  const [dialog, setDialog] = useState<DialogState<Row>>({
    open: false,
    mode: "create",
    row: null,
  });
  const [form, setForm] = useState<FormState>(createInitialForm(null));

  const openDialog = useCallback(
    (mode: DialogMode, row: Row | null = null) => {
      setDialog({ open: true, mode, row });
      setForm(createInitialForm(row));
    },
    [createInitialForm]
  );

  const closeDialog = useCallback(() => {
    setDialog({ open: false, mode: "create", row: null });
    setForm(createInitialForm(null));
  }, [createInitialForm]);

  const setOpen = useCallback((open: boolean) => {
    setDialog((prev) => ({ ...prev, open }));
  }, []);

  return {
    dialog,
    form,
    setForm,
    openDialog,
    closeDialog,
    setOpen,
  };
}
