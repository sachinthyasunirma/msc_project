import { toast } from "sonner";

export function getErrorMessage(error: unknown, fallback = "Something went wrong.") {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

export const notify = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  warning: (message: string) => toast.warning(message),
  info: (message: string) => toast.info(message),
  loading: (message: string) => toast.loading(message),
  dismiss: (id?: string | number) => toast.dismiss(id),
  promise: toast.promise,
};

export function notifyApiError(error: unknown, fallback = "Request failed.") {
  const message = getErrorMessage(error, fallback);
  const normalized = message.toLowerCase();

  if (
    normalized.includes("read-only") ||
    normalized.includes("read only") ||
    normalized.includes("permission") ||
    normalized.includes("forbidden")
  ) {
    notify.warning(message);
    return;
  }

  notify.error(message);
}

