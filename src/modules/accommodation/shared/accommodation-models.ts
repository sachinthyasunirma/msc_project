export type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
  hasNext: boolean;
  limit: number;
};

export type ApiErrorBody = {
  code: string;
  message: string;
};
