"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableLoadingRow } from "@/components/ui/table-loading-row";
import { TablePagination } from "@/components/ui/table-pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { RoomType } from "@/modules/accommodation/lib/accommodation-api";
import type { HotelContractingBundle } from "@/modules/accommodation/shared/accommodation-contracting-types";

type RoomRatesTabProps = {
  loadingDetails: boolean;
  contracting: HotelContractingBundle | null;
  roomTypes: RoomType[];
  isReadOnly: boolean;
};

type DisplayRateRow = {
  id: string;
  contractCode: string;
  contractCurrencyCode: string;
  contractValidity: string;
  ratePlanCode: string;
  ratePlanName: string;
  boardBasis: string;
  ratePlanValidity: string;
  cancellationPolicyName: string | null;
  roomTypeName: string;
  validFrom: string;
  validTo: string;
  currencyCode: string;
  singleUseRate: string | null;
  doubleRate: string | null;
  tripleRate: string | null;
  quadRate: string | null;
  extraAdultRate: string | null;
  childWithBedRate: string | null;
  childNoBedRate: string | null;
  infantRate: string | null;
  singleSupplementRate: string | null;
  taxMode: string;
  isActive: boolean;
};

function formatMoney(value: string | null | undefined, currencyCode: string) {
  if (!value) return "N/A";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "N/A";
  return `${currencyCode} ${numeric.toFixed(2)}`;
}

function formatRange(start: string | null | undefined, end: string | null | undefined) {
  if (!start && !end) return "N/A";
  if (!start) return `Until ${end}`;
  if (!end) return `From ${start}`;
  return `${start} to ${end}`;
}

export function RoomRatesTab({
  loadingDetails,
  contracting,
  roomTypes,
  isReadOnly,
}: RoomRatesTabProps) {
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [selectedRatePlanId, setSelectedRatePlanId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const roomTypeNameById = useMemo(
    () => new Map(roomTypes.map((roomType) => [roomType.id, roomType.name])),
    [roomTypes]
  );

  const cancellationPolicyNameById = useMemo(
    () =>
      new Map(
        (contracting?.cancellationPolicies ?? []).map((policy) => [policy.id, policy.name])
      ),
    [contracting]
  );

  useEffect(() => {
    if (!contracting?.contracts.length) {
      setSelectedContractId(null);
      return;
    }

    setSelectedContractId((current) =>
      current && contracting.contracts.some((contract) => contract.id === current)
        ? current
        : contracting.contracts[0]?.id ?? null
    );
  }, [contracting]);

  const contractOptions = useMemo(() => contracting?.contracts ?? [], [contracting]);
  const ratePlansForContract = useMemo(
    () =>
      selectedContractId
        ? (contracting?.ratePlans ?? []).filter((ratePlan) => ratePlan.contractId === selectedContractId)
        : [],
    [contracting, selectedContractId]
  );

  useEffect(() => {
    if (!ratePlansForContract.length) {
      setSelectedRatePlanId(null);
      return;
    }

    setSelectedRatePlanId((current) =>
      current && ratePlansForContract.some((ratePlan) => ratePlan.id === current)
        ? current
        : ratePlansForContract[0]?.id ?? null
    );
  }, [ratePlansForContract]);

  const selectedContract = useMemo(
    () => contractOptions.find((contract) => contract.id === selectedContractId) ?? null,
    [contractOptions, selectedContractId]
  );

  const selectedRatePlan = useMemo(
    () => ratePlansForContract.find((ratePlan) => ratePlan.id === selectedRatePlanId) ?? null,
    [ratePlansForContract, selectedRatePlanId]
  );

  const displayRates = useMemo<DisplayRateRow[]>(() => {
    if (!contracting || !selectedRatePlanId) {
      return [];
    }

    return contracting.roomRates
      .filter((rate) => rate.ratePlanId === selectedRatePlanId)
      .map((rate) => ({
        id: rate.id,
        contractCode: selectedContract?.code ?? "N/A",
        contractCurrencyCode: selectedContract?.currencyCode ?? rate.currencyCode,
        contractValidity: formatRange(selectedContract?.validFrom, selectedContract?.validTo),
        ratePlanCode: selectedRatePlan?.code ?? "N/A",
        ratePlanName: selectedRatePlan?.name ?? "N/A",
        boardBasis: selectedRatePlan?.boardBasis ?? "N/A",
        ratePlanValidity: formatRange(selectedRatePlan?.validFrom, selectedRatePlan?.validTo),
        cancellationPolicyName: selectedRatePlan?.cancellationPolicyId
          ? (cancellationPolicyNameById.get(selectedRatePlan.cancellationPolicyId) ?? null)
          : null,
        roomTypeName: roomTypeNameById.get(rate.roomTypeId) ?? rate.roomTypeId,
        validFrom: rate.validFrom,
        validTo: rate.validTo,
        currencyCode: rate.currencyCode,
        singleUseRate: rate.singleUseRate,
        doubleRate: rate.doubleRate,
        tripleRate: rate.tripleRate,
        quadRate: rate.quadRate,
        extraAdultRate: rate.extraAdultRate,
        childWithBedRate: rate.childWithBedRate,
        childNoBedRate: rate.childNoBedRate,
        infantRate: rate.infantRate,
        singleSupplementRate: rate.singleSupplementRate,
        taxMode: rate.taxMode,
        isActive: rate.isActive,
      }))
      .sort((left, right) => {
        const roomTypeSort = left.roomTypeName.localeCompare(right.roomTypeName);
        if (roomTypeSort !== 0) return roomTypeSort;
        return left.validFrom.localeCompare(right.validFrom);
      });
  }, [
    cancellationPolicyNameById,
    contracting,
    roomTypeNameById,
    selectedContract,
    selectedRatePlan,
    selectedRatePlanId,
  ]);

  useEffect(() => {
    setPage(1);
  }, [selectedContractId, selectedRatePlanId]);

  const totalItems = displayRates.length;
  const pagedRates = useMemo(() => {
    const start = (page - 1) * pageSize;
    return displayRates.slice(start, start + pageSize);
  }, [displayRates, page]);

  if (loadingDetails && !contracting) {
    return (
      <Table>
        <TableBody>
          <TableLoadingRow
            colSpan={12}
            title="Loading contracted accommodation rates"
            description="Preparing hotel contracts, rate plans, occupancy pricing, and validity rules."
          />
        </TableBody>
      </Table>
    );
  }

  if (!contracting) {
    return (
      <Card className="border-border/70">
        <CardContent className="py-8 text-sm text-muted-foreground">
          Contracted room rates are not available for this hotel yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/70">
          <CardContent className="space-y-1 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Contract</p>
            <p className="font-semibold">{selectedContract?.code ?? "No contract"}</p>
            <p className="text-xs text-muted-foreground">
              {selectedContract ? formatRange(selectedContract.validFrom, selectedContract.validTo) : "Select a contract"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardContent className="space-y-1 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Rate Plan</p>
            <p className="font-semibold">{selectedRatePlan?.name ?? "No rate plan"}</p>
            <p className="text-xs text-muted-foreground">
              {selectedRatePlan
                ? `${selectedRatePlan.code} | ${selectedRatePlan.boardBasis}`
                : "Select a rate plan"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardContent className="space-y-1 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Policy</p>
            <p className="font-semibold">{selectedRatePlan?.cancellationPolicyId
              ? (cancellationPolicyNameById.get(selectedRatePlan.cancellationPolicyId) ?? "Linked policy")
              : "No linked policy"}</p>
            <p className="text-xs text-muted-foreground">
              {selectedRatePlan ? formatRange(selectedRatePlan.validFrom, selectedRatePlan.validTo) : "N/A"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardContent className="space-y-1 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Edit Source</p>
            <p className="font-semibold">Contracting Tab</p>
            <p className="text-xs text-muted-foreground">
              {isReadOnly ? "View-only mode active." : "Manage rates from Contracting, not the legacy rate grid."}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border p-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Contract</p>
            <Select
              value={selectedContractId ?? undefined}
              onValueChange={(value) => setSelectedContractId(value)}
              disabled={contractOptions.length === 0}
            >
              <SelectTrigger className="w-full md:w-[280px]">
                <SelectValue placeholder="Select contract" />
              </SelectTrigger>
              <SelectContent>
                {contractOptions.map((contract) => (
                  <SelectItem key={contract.id} value={contract.id}>
                    {contract.code} | {contract.currencyCode} | {formatRange(contract.validFrom, contract.validTo)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Rate Plan</p>
            <Select
              value={selectedRatePlanId ?? undefined}
              onValueChange={(value) => setSelectedRatePlanId(value)}
              disabled={ratePlansForContract.length === 0}
            >
              <SelectTrigger className="w-full md:w-[320px]">
                <SelectValue placeholder="Select rate plan" />
              </SelectTrigger>
              <SelectContent>
                {ratePlansForContract.map((ratePlan) => (
                  <SelectItem key={ratePlan.id} value={ratePlan.id}>
                    {ratePlan.code} | {ratePlan.name} | {ratePlan.boardBasis}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {selectedRatePlan
            ? `${displayRates.length} occupancy rates loaded for ${selectedRatePlan.name}.`
            : "Select a contract and rate plan to view contracted occupancy pricing."}
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Room Type</TableHead>
              <TableHead>Validity</TableHead>
              <TableHead>Single</TableHead>
              <TableHead>Double</TableHead>
              <TableHead>Triple</TableHead>
              <TableHead>Quad</TableHead>
              <TableHead>Extra Adult</TableHead>
              <TableHead>Child W/ Bed</TableHead>
              <TableHead>Child W/O Bed</TableHead>
              <TableHead>Infant</TableHead>
              <TableHead>Single Supp.</TableHead>
              <TableHead>Tax / Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingDetails && totalItems === 0 ? (
              <TableLoadingRow
                colSpan={12}
                title="Resolving contracted room rates"
                description="Loading room-type occupancy buying for the selected contract and rate plan."
              />
            ) : !selectedRatePlan ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center text-muted-foreground">
                  Select a contract and rate plan to inspect contracted room rates.
                </TableCell>
              </TableRow>
            ) : totalItems === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center text-muted-foreground">
                  No contracted room rates found for the selected rate plan.
                </TableCell>
              </TableRow>
            ) : (
              pagedRates.map((rate) => (
                <TableRow key={rate.id}>
                  <TableCell>
                    <div className="font-medium">{rate.roomTypeName}</div>
                    <div className="text-xs text-muted-foreground">{rate.ratePlanCode}</div>
                  </TableCell>
                  <TableCell>{formatRange(rate.validFrom, rate.validTo)}</TableCell>
                  <TableCell>{formatMoney(rate.singleUseRate, rate.currencyCode)}</TableCell>
                  <TableCell>{formatMoney(rate.doubleRate, rate.currencyCode)}</TableCell>
                  <TableCell>{formatMoney(rate.tripleRate, rate.currencyCode)}</TableCell>
                  <TableCell>{formatMoney(rate.quadRate, rate.currencyCode)}</TableCell>
                  <TableCell>{formatMoney(rate.extraAdultRate, rate.currencyCode)}</TableCell>
                  <TableCell>{formatMoney(rate.childWithBedRate, rate.currencyCode)}</TableCell>
                  <TableCell>{formatMoney(rate.childNoBedRate, rate.currencyCode)}</TableCell>
                  <TableCell>{formatMoney(rate.infantRate, rate.currencyCode)}</TableCell>
                  <TableCell>{formatMoney(rate.singleSupplementRate, rate.currencyCode)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">{rate.taxMode}</span>
                      <Badge variant={rate.isActive ? "default" : "secondary"}>
                        {rate.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedRatePlan ? (
        <TablePagination
          totalItems={totalItems}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={() => undefined}
          hidePageSize
          className="pt-1"
        />
      ) : null}
    </div>
  );
}
