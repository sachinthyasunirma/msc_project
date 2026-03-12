"use client";

import { useMemo } from "react";
import { FileSpreadsheet, Pencil, Plus, ShieldAlert, Tags, Trash2, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAccommodationContractingTab } from "@/modules/accommodation/lib/hooks/use-accommodation-contracting-tab";
import type { HotelContractingBundle } from "@/modules/accommodation/shared/accommodation-contracting-types";
import type { RoomType } from "@/modules/accommodation/lib/accommodation-api";
import { AccommodationContractDialog } from "@/modules/accommodation/ui/components/dialogs/accommodation-contract-dialog";
import { AccommodationRatePlanDialog } from "@/modules/accommodation/ui/components/dialogs/accommodation-rate-plan-dialog";
import { AccommodationContractRoomRateDialog } from "@/modules/accommodation/ui/components/dialogs/accommodation-contract-room-rate-dialog";
import { AccommodationRateRestrictionDialog } from "@/modules/accommodation/ui/components/dialogs/accommodation-rate-restriction-dialog";
import { AccommodationFeeRuleDialog } from "@/modules/accommodation/ui/components/dialogs/accommodation-fee-rule-dialog";
import { AccommodationCancellationPolicyDialog } from "@/modules/accommodation/ui/components/dialogs/accommodation-cancellation-policy-dialog";
import { AccommodationCancellationPolicyRuleDialog } from "@/modules/accommodation/ui/components/dialogs/accommodation-cancellation-policy-rule-dialog";
import { AccommodationInventoryDayDialog } from "@/modules/accommodation/ui/components/dialogs/accommodation-inventory-day-dialog";

type ContractingTabProps = {
  hotelId: string;
  loadingDetails: boolean;
  contracting: HotelContractingBundle | null;
  roomTypes: RoomType[];
  isReadOnly: boolean;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "N/A";
  return value;
}

function formatMoney(value: string | number | null | undefined, currencyCode?: string | null) {
  if (value === null || value === undefined || value === "") return "N/A";
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return "N/A";
  return `${currencyCode || ""} ${numeric.toFixed(2)}`.trim();
}

function SummaryStat({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number;
  icon: typeof FileSpreadsheet;
}) {
  return (
    <Card className="border-border/70">
      <CardContent className="flex items-center justify-between p-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
        <div className="rounded-full border border-border/70 bg-muted/40 p-3">
          <Icon className="size-4 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

export function ContractingTab({
  hotelId,
  loadingDetails,
  contracting: initialContracting,
  roomTypes,
  isReadOnly,
}: ContractingTabProps) {
  const contractingState = useAccommodationContractingTab({
    hotelId,
    initialContracting,
    isReadOnly,
  });
  const contracting = contractingState.contracting;
  const nextInventoryDays = useMemo(
    () =>
      [...(contracting?.inventoryDays ?? [])]
        .sort((left, right) => left.date.localeCompare(right.date))
        .slice(0, 12),
    [contracting]
  );
  const roomTypeNameById = useMemo(
    () => new Map(roomTypes.map((roomType) => [roomType.id, `${roomType.code} - ${roomType.name}`])),
    [roomTypes]
  );
  const roomTypeOptions = useMemo(
    () =>
      roomTypes.map((roomType) => ({
        value: roomType.id,
        label: `${roomType.code} - ${roomType.name}`,
      })),
    [roomTypes]
  );

  if (loadingDetails && !contracting) {
    return (
      <Card className="border-border/70">
        <CardContent className="py-8 text-sm text-muted-foreground">
          Loading contracts, rate plans, restrictions, and inventory controls.
        </CardContent>
      </Card>
    );
  }

  if (!contracting) {
    return (
      <Card className="border-border/70">
        <CardContent className="py-8 text-sm text-muted-foreground">
          Contracting data is not available for this hotel yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryStat title="Contracts" value={contracting.contracts.length} icon={FileSpreadsheet} />
        <SummaryStat title="Rate Plans" value={contracting.ratePlans.length} icon={Tags} />
        <SummaryStat title="Restrictions" value={contracting.restrictions.length} icon={ShieldAlert} />
        <SummaryStat title="Fee Rules" value={contracting.feeRules.length} icon={Wallet} />
      </div>

      <Accordion type="multiple" className="rounded-lg border border-border/70 bg-card px-4">
        <AccordionItem value="contracts">
          <AccordionTrigger>
            <div className="flex w-full items-center justify-between gap-3 pr-2">
              <span>Hotel Contracts</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  contractingState.openContractDialog("create");
                }}
                disabled={isReadOnly || contractingState.saving}
              >
                <Plus className="mr-2 size-4" />
                Add Contract
              </Button>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Validity</TableHead>
                  <TableHead>Release</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracting.contracts.length > 0 ? (
                  contracting.contracts.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={contractingState.selectedContractId === row.id ? "selected" : undefined}
                      onClick={() => contractingState.setSelectedContractId(row.id)}
                      className="cursor-pointer"
                    >
                      <TableCell className="font-medium">
                        <div>{row.code}</div>
                        <div className="text-xs text-muted-foreground">{row.contractRef || "No supplier ref"}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.isActive ? "secondary" : "outline"}>{row.status}</Badge>
                      </TableCell>
                      <TableCell>{row.currencyCode}</TableCell>
                      <TableCell>{formatDate(row.validFrom)} to {formatDate(row.validTo)}</TableCell>
                      <TableCell>{row.releaseDaysDefault ?? "Default"}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={(event) => {
                              event.stopPropagation();
                              contractingState.openContractDialog("edit", row);
                            }}
                            disabled={isReadOnly || contractingState.saving}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={(event) => {
                              event.stopPropagation();
                              void contractingState.deleteContract(row);
                            }}
                            disabled={isReadOnly || contractingState.saving}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground">
                      No contracts configured.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="rate-plans">
          <AccordionTrigger>
            <div className="flex w-full items-center justify-between gap-3 pr-2">
              <div>
                <div>Rate Plans & Occupancy Buying</div>
                <div className="text-xs font-normal text-muted-foreground">
                  {contractingState.selectedContract
                    ? `Selected contract: ${contractingState.selectedContract.code}`
                    : "Select a contract to manage its plans"}
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  contractingState.openRatePlanDialog("create");
                }}
                disabled={isReadOnly || contractingState.saving || !contractingState.selectedContractId}
              >
                <Plus className="mr-2 size-4" />
                Add Rate Plan
              </Button>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rate Plan</TableHead>
                  <TableHead>Board</TableHead>
                  <TableHead>Validity</TableHead>
                  <TableHead>Refundable</TableHead>
                  <TableHead>Package Only</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contractingState.selectedRatePlans.length > 0 ? (
                  contractingState.selectedRatePlans.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={contractingState.selectedRatePlanId === row.id ? "selected" : undefined}
                      onClick={() => contractingState.setSelectedRatePlanId(row.id)}
                      className="cursor-pointer"
                    >
                      <TableCell className="font-medium">
                        <div>{row.code}</div>
                        <div className="text-xs text-muted-foreground">{row.name}</div>
                      </TableCell>
                      <TableCell>{row.boardBasis}</TableCell>
                      <TableCell>{formatDate(row.validFrom)} to {formatDate(row.validTo)}</TableCell>
                      <TableCell>{row.isRefundable ? "Yes" : "No"}</TableCell>
                      <TableCell>{row.isPackageOnly ? "Yes" : "No"}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => contractingState.openRatePlanDialog("edit", row)}
                            disabled={isReadOnly || contractingState.saving}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => void contractingState.deleteRatePlan(row)}
                            disabled={isReadOnly || contractingState.saving}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground">
                      {contractingState.selectedContractId
                        ? "No rate plans configured for the selected contract."
                        : "Select a contract to view its rate plans."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/30 px-4 py-3">
              <div>
                <div className="font-medium">Occupancy Room Rates</div>
                <div className="text-xs text-muted-foreground">
                  {contractingState.selectedRatePlan
                    ? `Selected rate plan: ${contractingState.selectedRatePlan.code} - ${contractingState.selectedRatePlan.name}`
                    : "Select a rate plan to manage its contracted occupancy pricing."}
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => contractingState.openRoomRateDialog("create")}
                disabled={isReadOnly || contractingState.saving || !contractingState.selectedRatePlanId}
              >
                <Plus className="mr-2 size-4" />
                Add Room Rate
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rate Code</TableHead>
                  <TableHead>Room Type</TableHead>
                  <TableHead>Validity</TableHead>
                  <TableHead>Double</TableHead>
                  <TableHead>Extra Adult</TableHead>
                  <TableHead>Child WB</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contractingState.selectedRoomRates.length > 0 ? (
                  contractingState.selectedRoomRates.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.code}</TableCell>
                      <TableCell>{roomTypeNameById.get(row.roomTypeId) ?? row.roomTypeId}</TableCell>
                      <TableCell>{formatDate(row.validFrom)} to {formatDate(row.validTo)}</TableCell>
                      <TableCell>{formatMoney(row.doubleRate, row.currencyCode)}</TableCell>
                      <TableCell>{formatMoney(row.extraAdultRate, row.currencyCode)}</TableCell>
                      <TableCell>{formatMoney(row.childWithBedRate, row.currencyCode)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => contractingState.openRoomRateDialog("edit", row)}
                            disabled={isReadOnly || contractingState.saving}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => void contractingState.deleteRoomRate(row)}
                            disabled={isReadOnly || contractingState.saving}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted-foreground">
                      {contractingState.selectedRatePlanId
                        ? "No occupancy-based room rates configured for the selected rate plan."
                        : "Select a rate plan to manage occupancy room rates."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="controls">
          <AccordionTrigger>
            <div className="flex w-full items-center justify-between gap-3 pr-2">
              <div>
                <div>Restrictions, Cancellation & Fees</div>
                <div className="text-xs font-normal text-muted-foreground">
                  {contractingState.selectedRatePlan
                    ? `Managing controls for ${contractingState.selectedRatePlan.code}`
                    : "Select a rate plan to manage controls"}
                </div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => contractingState.openCancellationPolicyDialog("create")}
                disabled={isReadOnly || contractingState.saving}
              >
                <Plus className="mr-2 size-4" />
                Add Cancellation Policy
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => contractingState.openRestrictionDialog("create")}
                disabled={isReadOnly || contractingState.saving || !contractingState.selectedRatePlanId}
              >
                <Plus className="mr-2 size-4" />
                Add Restriction
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => contractingState.openFeeRuleDialog("create")}
                disabled={isReadOnly || contractingState.saving || !contractingState.selectedRatePlanId}
              >
                <Plus className="mr-2 size-4" />
                Add Fee Rule
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Restriction</TableHead>
                  <TableHead>Stay Window</TableHead>
                  <TableHead>Min/Max</TableHead>
                  <TableHead>CTA/CTD</TableHead>
                  <TableHead>Stop Sell</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contractingState.selectedRestrictions.length > 0 ? (
                  contractingState.selectedRestrictions.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.code}</TableCell>
                      <TableCell>{formatDate(row.stayFrom)} to {formatDate(row.stayTo)}</TableCell>
                      <TableCell>{row.minStay ?? "-"} / {row.maxStay ?? "-"}</TableCell>
                      <TableCell>{row.closedToArrival ? "CTA" : "-"} / {row.closedToDeparture ? "CTD" : "-"}</TableCell>
                      <TableCell>{row.stopSell ? "Yes" : "No"}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => contractingState.openRestrictionDialog("edit", row)}
                            disabled={isReadOnly || contractingState.saving}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => void contractingState.deleteRestriction(row)}
                            disabled={isReadOnly || contractingState.saving}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground">
                      {contractingState.selectedRatePlanId
                        ? "No restrictions configured for the selected rate plan."
                        : "Select a rate plan to manage restrictions."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cancellation Policy</TableHead>
                  <TableHead>Rule Count</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracting.cancellationPolicies.length > 0 ? (
                  contracting.cancellationPolicies.map((policy) => {
                    const ruleCount = contracting.cancellationPolicyRules.filter(
                      (rule) => rule.policyId === policy.id
                    ).length;
                    return (
                      <TableRow
                        key={policy.id}
                        data-state={contractingState.selectedCancellationPolicyId === policy.id ? "selected" : undefined}
                        onClick={() => contractingState.setSelectedCancellationPolicyId(policy.id)}
                        className="cursor-pointer"
                      >
                        <TableCell className="font-medium">
                          <div>{policy.code}</div>
                          <div className="text-xs text-muted-foreground">{policy.name}</div>
                        </TableCell>
                        <TableCell>{ruleCount}</TableCell>
                        <TableCell>{policy.isDefault ? "Yes" : "No"}</TableCell>
                        <TableCell>{policy.isActive ? "Active" : "Inactive"}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={(event) => {
                                event.stopPropagation();
                                contractingState.openCancellationPolicyDialog("edit", policy);
                              }}
                              disabled={isReadOnly || contractingState.saving}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={(event) => {
                                event.stopPropagation();
                                void contractingState.deleteCancellationPolicy(policy);
                              }}
                              disabled={isReadOnly || contractingState.saving}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground">
                      No cancellation policies configured.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/30 px-4 py-3">
              <div>
                <div className="font-medium">Cancellation Rules</div>
                <div className="text-xs text-muted-foreground">
                  {contractingState.selectedCancellationPolicy
                    ? `Selected policy: ${contractingState.selectedCancellationPolicy.code} - ${contractingState.selectedCancellationPolicy.name}`
                    : "Select a cancellation policy to manage its penalty rules."}
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => contractingState.openCancellationPolicyRuleDialog("create")}
                disabled={isReadOnly || contractingState.saving || !contractingState.selectedCancellationPolicyId}
              >
                <Plus className="mr-2 size-4" />
                Add Cancellation Rule
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule</TableHead>
                  <TableHead>Window</TableHead>
                  <TableHead>Penalty</TableHead>
                  <TableHead>Basis</TableHead>
                  <TableHead>No-show / After Check-in</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contractingState.selectedCancellationPolicyRules.length > 0 ? (
                  contractingState.selectedCancellationPolicyRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.code}</TableCell>
                      <TableCell>{rule.fromDaysBefore ?? "-"} to {rule.toDaysBefore ?? "-"}</TableCell>
                      <TableCell>{rule.penaltyType} {formatMoney(rule.penaltyValue, "")}</TableCell>
                      <TableCell>{rule.basis ?? "-"}</TableCell>
                      <TableCell>
                        {rule.appliesOnNoShow ? "No-show" : "-"} / {rule.appliesAfterCheckIn ? "After check-in" : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => contractingState.openCancellationPolicyRuleDialog("edit", rule)}
                            disabled={isReadOnly || contractingState.saving}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => void contractingState.deleteCancellationPolicyRule(rule)}
                            disabled={isReadOnly || contractingState.saving}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground">
                      {contractingState.selectedCancellationPolicyId
                        ? "No cancellation rules configured for the selected policy."
                        : "Select a cancellation policy to manage penalty rules."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fee Rule</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Basis</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Mandatory</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contractingState.selectedFeeRules.length > 0 ? (
                  contractingState.selectedFeeRules.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell>{row.feeType}</TableCell>
                      <TableCell>{row.chargeBasis}</TableCell>
                      <TableCell>{formatMoney(row.amount, row.currencyCode)}</TableCell>
                      <TableCell>{row.isMandatory ? "Yes" : "No"}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => contractingState.openFeeRuleDialog("edit", row)}
                            disabled={isReadOnly || contractingState.saving}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => void contractingState.deleteFeeRule(row)}
                            disabled={isReadOnly || contractingState.saving}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground">
                      {contractingState.selectedRatePlanId
                        ? "No fee rules configured for the selected rate plan."
                        : "Select a rate plan to manage fee rules."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="inventory">
          <AccordionTrigger>
            <div className="flex w-full items-center justify-between gap-3 pr-2">
              <span>Inventory Snapshot</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  contractingState.openInventoryDayDialog("create");
                }}
                disabled={isReadOnly || contractingState.saving}
              >
                <Plus className="mr-2 size-4" />
                Add Inventory Day
              </Button>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Room Type</TableHead>
                  <TableHead>Physical</TableHead>
                  <TableHead>Allotment</TableHead>
                  <TableHead>Sold</TableHead>
                  <TableHead>Blocked</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nextInventoryDays.length > 0 ? (
                  nextInventoryDays.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{formatDate(row.date)}</TableCell>
                      <TableCell>{roomTypeNameById.get(row.roomTypeId) ?? row.roomTypeId}</TableCell>
                      <TableCell>{row.physicalInventory}</TableCell>
                      <TableCell>{row.contractedAllotment ?? "-"}</TableCell>
                      <TableCell>{row.soldRooms}</TableCell>
                      <TableCell>{row.blockedRooms}</TableCell>
                      <TableCell>
                        {row.stopSell ? (
                          <Badge variant="destructive">Stop Sell</Badge>
                        ) : row.isClosed ? (
                          <Badge variant="outline">Closed</Badge>
                        ) : row.freeSale ? (
                          <Badge variant="secondary">Free Sale</Badge>
                        ) : (
                          <Badge variant="outline">Open</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => contractingState.openInventoryDayDialog("edit", row)}
                            disabled={isReadOnly || contractingState.saving}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => void contractingState.deleteInventoryDay(row)}
                            disabled={isReadOnly || contractingState.saving}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-muted-foreground">
                      No inventory snapshot available.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {contractDialogOpen(contractingState) ? (
        <AccommodationContractDialog
          open={contractingState.contractDialog.dialog.open}
          mode={contractingState.contractDialog.dialog.mode}
          saving={contractingState.saving}
          isReadOnly={isReadOnly}
          form={contractingState.contractDialog.form}
          setForm={contractingState.contractDialog.setForm}
          supplierOptions={contractingState.supplierOptions}
          onOpenChange={contractingState.contractDialog.setOpen}
          onCancel={contractingState.contractDialog.closeDialog}
          onSubmit={() => void contractingState.submitContract()}
        />
      ) : null}

      {ratePlanDialogOpen(contractingState) ? (
        <AccommodationRatePlanDialog
          open={contractingState.ratePlanDialog.dialog.open}
          mode={contractingState.ratePlanDialog.dialog.mode}
          saving={contractingState.saving}
          isReadOnly={isReadOnly}
          form={contractingState.ratePlanDialog.form}
          setForm={contractingState.ratePlanDialog.setForm}
          cancellationPolicyOptions={contractingState.cancellationPolicyOptions}
          onOpenChange={contractingState.ratePlanDialog.setOpen}
          onCancel={contractingState.ratePlanDialog.closeDialog}
          onSubmit={() => void contractingState.submitRatePlan()}
        />
      ) : null}

      {roomRateDialogOpen(contractingState) ? (
        <AccommodationContractRoomRateDialog
          open={contractingState.roomRateDialog.dialog.open}
          mode={contractingState.roomRateDialog.dialog.mode}
          saving={contractingState.saving}
          isReadOnly={isReadOnly}
          form={contractingState.roomRateDialog.form}
          setForm={contractingState.roomRateDialog.setForm}
          roomTypeOptions={roomTypeOptions}
          onOpenChange={contractingState.roomRateDialog.setOpen}
          onCancel={contractingState.roomRateDialog.closeDialog}
          onSubmit={() => void contractingState.submitRoomRate()}
        />
      ) : null}

      {restrictionDialogOpen(contractingState) ? (
        <AccommodationRateRestrictionDialog
          open={contractingState.restrictionDialog.dialog.open}
          mode={contractingState.restrictionDialog.dialog.mode}
          saving={contractingState.saving}
          isReadOnly={isReadOnly}
          form={contractingState.restrictionDialog.form}
          setForm={contractingState.restrictionDialog.setForm}
          roomTypeOptions={roomTypeOptions}
          onOpenChange={contractingState.restrictionDialog.setOpen}
          onCancel={contractingState.restrictionDialog.closeDialog}
          onSubmit={() => void contractingState.submitRestriction()}
        />
      ) : null}

      {feeRuleDialogOpen(contractingState) ? (
        <AccommodationFeeRuleDialog
          open={contractingState.feeRuleDialog.dialog.open}
          mode={contractingState.feeRuleDialog.dialog.mode}
          saving={contractingState.saving}
          isReadOnly={isReadOnly}
          form={contractingState.feeRuleDialog.form}
          setForm={contractingState.feeRuleDialog.setForm}
          onOpenChange={contractingState.feeRuleDialog.setOpen}
          onCancel={contractingState.feeRuleDialog.closeDialog}
          onSubmit={() => void contractingState.submitFeeRule()}
        />
      ) : null}

      {cancellationPolicyDialogOpen(contractingState) ? (
        <AccommodationCancellationPolicyDialog
          open={contractingState.cancellationPolicyDialog.dialog.open}
          mode={contractingState.cancellationPolicyDialog.dialog.mode}
          saving={contractingState.saving}
          isReadOnly={isReadOnly}
          form={contractingState.cancellationPolicyDialog.form}
          setForm={contractingState.cancellationPolicyDialog.setForm}
          onOpenChange={contractingState.cancellationPolicyDialog.setOpen}
          onCancel={contractingState.cancellationPolicyDialog.closeDialog}
          onSubmit={() => void contractingState.submitCancellationPolicy()}
        />
      ) : null}

      {cancellationPolicyRuleDialogOpen(contractingState) ? (
        <AccommodationCancellationPolicyRuleDialog
          open={contractingState.cancellationPolicyRuleDialog.dialog.open}
          mode={contractingState.cancellationPolicyRuleDialog.dialog.mode}
          saving={contractingState.saving}
          isReadOnly={isReadOnly}
          form={contractingState.cancellationPolicyRuleDialog.form}
          setForm={contractingState.cancellationPolicyRuleDialog.setForm}
          onOpenChange={contractingState.cancellationPolicyRuleDialog.setOpen}
          onCancel={contractingState.cancellationPolicyRuleDialog.closeDialog}
          onSubmit={() => void contractingState.submitCancellationPolicyRule()}
        />
      ) : null}

      {inventoryDayDialogOpen(contractingState) ? (
        <AccommodationInventoryDayDialog
          open={contractingState.inventoryDayDialog.dialog.open}
          mode={contractingState.inventoryDayDialog.dialog.mode}
          saving={contractingState.saving}
          isReadOnly={isReadOnly}
          form={contractingState.inventoryDayDialog.form}
          setForm={contractingState.inventoryDayDialog.setForm}
          roomTypeOptions={roomTypeOptions}
          onOpenChange={contractingState.inventoryDayDialog.setOpen}
          onCancel={contractingState.inventoryDayDialog.closeDialog}
          onSubmit={() => void contractingState.submitInventoryDay()}
        />
      ) : null}
    </div>
  );
}

function contractDialogOpen(
  state: ReturnType<typeof useAccommodationContractingTab>
) {
  return state.contractDialog.dialog.open;
}

function ratePlanDialogOpen(
  state: ReturnType<typeof useAccommodationContractingTab>
) {
  return state.ratePlanDialog.dialog.open;
}

function roomRateDialogOpen(
  state: ReturnType<typeof useAccommodationContractingTab>
) {
  return state.roomRateDialog.dialog.open;
}

function restrictionDialogOpen(
  state: ReturnType<typeof useAccommodationContractingTab>
) {
  return state.restrictionDialog.dialog.open;
}

function feeRuleDialogOpen(
  state: ReturnType<typeof useAccommodationContractingTab>
) {
  return state.feeRuleDialog.dialog.open;
}

function cancellationPolicyDialogOpen(
  state: ReturnType<typeof useAccommodationContractingTab>
) {
  return state.cancellationPolicyDialog.dialog.open;
}

function cancellationPolicyRuleDialogOpen(
  state: ReturnType<typeof useAccommodationContractingTab>
) {
  return state.cancellationPolicyRuleDialog.dialog.open;
}

function inventoryDayDialogOpen(
  state: ReturnType<typeof useAccommodationContractingTab>
) {
  return state.inventoryDayDialog.dialog.open;
}
