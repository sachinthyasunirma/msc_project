"use client";

import Link from "next/link";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CURRENCY_META, type CurrencyResourceKey } from "./currency-management-config";

type Props = {
  resource: CurrencyResourceKey;
  visibleResources: CurrencyResourceKey[];
  isCurrencyManageMode: boolean;
  managedCurrencyLabel: string;
  isReadOnly: boolean;
  onResourceChange: (resource: CurrencyResourceKey) => void;
  onRefresh: () => void;
  onAdd: () => void;
};

export function CurrencyManagementHeader({
  resource,
  visibleResources,
  isCurrencyManageMode,
  managedCurrencyLabel,
  isReadOnly,
  onResourceChange,
  onRefresh,
  onAdd,
}: Props) {
  return (
    <CardHeader className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>{CURRENCY_META[resource].title}</CardTitle>
          <CardDescription>
            {CURRENCY_META[resource].description}
            {isCurrencyManageMode && managedCurrencyLabel ? ` Managing: ${managedCurrencyLabel}` : ""}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {isCurrencyManageMode ? (
            <Button variant="outline" asChild>
              <Link href="/master-data/currencies">Back to Currencies</Link>
            </Button>
          ) : null}
          <Button variant="outline" className="master-refresh-btn" onClick={onRefresh}>
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

      <Tabs value={resource} onValueChange={(value) => onResourceChange(value as CurrencyResourceKey)}>
        <div className="master-tabs-scroll">
          <TabsList className="master-tabs-list">
            {visibleResources.map((key) => (
              <TabsTrigger key={key} value={key} className="master-tab-trigger">
                {CURRENCY_META[key].title}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>
    </CardHeader>
  );
}
