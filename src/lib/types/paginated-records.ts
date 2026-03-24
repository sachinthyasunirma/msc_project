export type PaginatedRecordsResponse = {
  rows: Array<Record<string, unknown>>;
  total: number;
  page: number;
  limit: number;
};
