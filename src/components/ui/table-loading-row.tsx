"use client";

import { TableCell, TableRow } from "@/components/ui/table";
import { LoadingState } from "@/components/ui/loading-state";

type TableLoadingRowProps = {
  colSpan: number;
  title?: string;
  description?: string;
};

export function TableLoadingRow({
  colSpan,
  title = "Preparing your route",
  description = "Pulling the latest tour data into view.",
}: TableLoadingRowProps) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-6">
        <LoadingState
          compact
          size="sm"
          title={title}
          description={description}
          className="justify-center"
        />
      </TableCell>
    </TableRow>
  );
}
