"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  totalItems?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  summaryText?: string;
  hidePageSize?: boolean;
  canPrevious?: boolean;
  canNext?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  className?: string;
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function TablePagination({
  totalItems,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  summaryText,
  hidePageSize = false,
  canPrevious,
  canNext,
  onPrevious,
  onNext,
  className,
}: Props) {
  if (
    summaryText !== undefined ||
    canPrevious !== undefined ||
    canNext !== undefined ||
    onPrevious !== undefined ||
    onNext !== undefined
  ) {
    return (
      <div className={`flex flex-wrap items-center justify-between gap-2 ${className ?? ""}`.trim()}>
        <p className="text-sm text-muted-foreground">{summaryText ?? "Page navigation"}</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onPrevious} disabled={!canPrevious}>
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={onNext} disabled={!canNext}>
            Next
          </Button>
        </div>
      </div>
    );
  }

  if (
    totalItems === undefined ||
    page === undefined ||
    pageSize === undefined ||
    onPageChange === undefined ||
    onPageSizeChange === undefined
  ) {
    return null;
  }

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const from = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = totalItems === 0 ? 0 : Math.min(totalItems, currentPage * pageSize);

  return (
    <div className={`flex flex-wrap items-center justify-between gap-2 ${className ?? ""}`.trim()}>
      <p className="text-sm text-muted-foreground">
        Showing {from}-{to} of {totalItems} | Page {currentPage} of {totalPages}
      </p>
      <div className="flex items-center gap-2">
        {!hidePageSize ? (
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              onPageSizeChange(Number(value));
              onPageChange(1);
            }}
          >
            <SelectTrigger className="w-[90px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
