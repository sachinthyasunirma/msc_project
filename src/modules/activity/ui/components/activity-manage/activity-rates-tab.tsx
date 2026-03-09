"use client";

import { ActivityRecordTableCard } from "@/modules/activity/ui/components/activity-record-table-card";

type ActivityTabProps = {
  query: string;
  loading: boolean;
  records: Array<Record<string, unknown>>;
  pagedRecords: Array<Record<string, unknown>>;
  currentPage: number;
  pageSize: number;
  lookups: Record<string, string>;
  isReadOnly: boolean;
  onQueryChange: (value: string) => void;
  onRefresh: () => void;
  onBatchOpen: () => void;
  onCreate: () => void;
  onEdit: (row: Record<string, unknown>) => void;
  onDelete: (row: Record<string, unknown>) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

export function ActivityRatesTab(props: ActivityTabProps) {
  return (
    <ActivityRecordTableCard
      resource="activity-rates"
      resourceTabs={["activity-rates"]}
      showActivityList={false}
      selectedActivityLabel=""
      totalItems={props.records.length}
      {...props}
    />
  );
}
