"use client";

import Link from "next/link";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TAX_META, type TaxResourceKey } from "./tax-management-config";

type Props = {
  resource: TaxResourceKey;
  visibleResources: TaxResourceKey[];
  isTaxManageMode: boolean;
  managedTaxLabel: string;
  isReadOnly: boolean;
  onResourceChange: (resource: TaxResourceKey) => void;
  onRefresh: () => void;
  onAdd: () => void;
};

export function TaxManagementHeader({
  resource,
  visibleResources,
  isTaxManageMode,
  managedTaxLabel,
  isReadOnly,
  onResourceChange,
  onRefresh,
  onAdd,
}: Props) {
  return (
    <CardHeader className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>{TAX_META[resource].title}</CardTitle>
          <CardDescription>
            {TAX_META[resource].description}
            {isTaxManageMode && managedTaxLabel ? ` Managing: ${managedTaxLabel}` : ""}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {isTaxManageMode ? (
            <Button variant="outline" asChild>
              <Link href="/master-data/taxes">Back to Taxes</Link>
            </Button>
          ) : null}
          <Button variant="outline" onClick={onRefresh}>
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
          <Button
            onClick={onAdd}
            disabled={isReadOnly}
            title={isReadOnly ? "View only mode" : undefined}
            className="master-add-btn"
          >
            <Plus className="mr-2 size-4" />
            Add Record
          </Button>
        </div>
      </div>

      <Tabs value={resource} onValueChange={(value) => onResourceChange(value as TaxResourceKey)}>
        <div className="master-tabs-scroll">
          <TabsList className="master-tabs-list">
            {visibleResources.map((key) => (
              <TabsTrigger key={key} value={key} className="master-tab-trigger">
                {TAX_META[key].title}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>
    </CardHeader>
  );
}

