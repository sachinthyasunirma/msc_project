"use client";

import Link from "next/link";
import { Edit3, Settings2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CURRENCY_COLUMNS, type CurrencyResourceKey } from "./currency-management-config";
import { formatCurrencyCell } from "./currency-management-utils";

type Props = {
  resource: CurrencyResourceKey;
  records: Array<Record<string, unknown>>;
  loading: boolean;
  lookups: Record<string, string>;
  onEdit: (row: Record<string, unknown>) => void;
  onDelete: (row: Record<string, unknown>) => void;
};

export function CurrencyRecordsTable({
  resource,
  records,
  loading,
  lookups,
  onEdit,
  onDelete,
}: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {CURRENCY_COLUMNS[resource].map((column) => (
            <TableHead key={column.key}>{column.label}</TableHead>
          ))}
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={CURRENCY_COLUMNS[resource].length + 1} className="text-center text-muted-foreground">
              Loading...
            </TableCell>
          </TableRow>
        ) : records.length === 0 ? (
          <TableRow>
            <TableCell colSpan={CURRENCY_COLUMNS[resource].length + 1} className="text-center text-muted-foreground">
              No records found.
            </TableCell>
          </TableRow>
        ) : (
          records.map((row) => (
            <TableRow key={String(row.id)}>
              {CURRENCY_COLUMNS[resource].map((column) => (
                <TableCell key={column.key}>
                  {column.key === "isActive" ? (
                    <Badge variant={row.isActive ? "default" : "secondary"}>
                      {row.isActive ? "Active" : "Inactive"}
                    </Badge>
                  ) : (
                    formatCurrencyCell(row[column.key], lookups)
                  )}
                </TableCell>
              ))}
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {resource === "currencies" && row.id ? (
                    <Button size="sm" variant="outline" className="master-manage-btn" asChild>
                      <Link href={`/master-data/currencies/manage/${row.id}`}>
                        <Settings2 className="mr-1 size-4" />
                        Manage
                      </Link>
                    </Button>
                  ) : null}
                  <Button size="sm" variant="outline" onClick={() => onEdit(row)}>
                    <Edit3 className="size-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onDelete(row)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

