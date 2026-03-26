"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OnTourEmptyState } from "@/modules/on-tour/ui/components/on-tour-empty-state";
import { OnTourStatusBadge } from "@/modules/on-tour/ui/components/on-tour-status-badge";
import type { OnTourDetailData, OnTourTabKey } from "@/modules/on-tour/shared/on-tour-management-types";

type Props = {
  data: OnTourDetailData;
  activeTab: OnTourTabKey;
  onTabChange: (tab: OnTourTabKey) => void;
  actions?: React.ReactNode;
};

function TabCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function OnTourDetailTabs({ data, activeTab, onTabChange, actions }: Props) {
  return (
    <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as OnTourTabKey)} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="master-tabs-scroll">
          <TabsList className="master-tabs-list">
            <TabsTrigger className="master-tab-trigger" value="summary">Summary</TabsTrigger>
            <TabsTrigger className="master-tab-trigger" value="travelers">Travelers</TabsTrigger>
            <TabsTrigger className="master-tab-trigger" value="groups">Subgroups</TabsTrigger>
            <TabsTrigger className="master-tab-trigger" value="rooming">Rooming</TabsTrigger>
            <TabsTrigger className="master-tab-trigger" value="services">Services</TabsTrigger>
            <TabsTrigger className="master-tab-trigger" value="operations">Operations</TabsTrigger>
            <TabsTrigger className="master-tab-trigger" value="finance">Finance</TabsTrigger>
            <TabsTrigger className="master-tab-trigger" value="audit">Audit</TabsTrigger>
          </TabsList>
        </div>
        {actions}
      </div>

      <TabsContent value="summary">
        <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
          <TabCard
            title="Operational Health"
            description="Prioritize today’s blockers before the departure moves into servicing."
          >
            <div className="grid gap-3 md:grid-cols-2">
              {data.dashboard.pendingMetrics.unconfirmedServices > -1 ? (
                <>
                  <div className="rounded-md border px-4 py-3">
                    <div className="text-xs text-muted-foreground">Unconfirmed Services</div>
                    <div className="text-2xl font-semibold">{data.dashboard.pendingMetrics.unconfirmedServices}</div>
                  </div>
                  <div className="rounded-md border px-4 py-3">
                    <div className="text-xs text-muted-foreground">Open Requisitions</div>
                    <div className="text-2xl font-semibold">{data.dashboard.pendingMetrics.openRequisitions}</div>
                  </div>
                  <div className="rounded-md border px-4 py-3">
                    <div className="text-xs text-muted-foreground">Missing Rooming</div>
                    <div className="text-2xl font-semibold">{data.dashboard.pendingMetrics.missingRooming}</div>
                  </div>
                  <div className="rounded-md border px-4 py-3">
                    <div className="text-xs text-muted-foreground">Pending Vehicles / Guides</div>
                    <div className="text-2xl font-semibold">
                      {data.dashboard.pendingMetrics.pendingVehicles} / {data.dashboard.pendingMetrics.pendingGuides}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </TabCard>
          <TabCard title="Commercial Snapshot" description="Frozen quote, current operational cost, and margin control.">
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Quoted Revenue</dt>
                <dd className="font-medium">{data.dashboard.financials.quotedRevenue}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Confirmed Cost</dt>
                <dd className="font-medium">{data.dashboard.financials.confirmedCost}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Actual Cost</dt>
                <dd className="font-medium">{data.dashboard.financials.actualCost}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Actual Margin</dt>
                <dd className="font-semibold">{data.dashboard.financials.actualMargin}</dd>
              </div>
            </dl>
          </TabCard>
        </div>
      </TabsContent>

      <TabsContent value="travelers">
        <TabCard
          title="Travelers"
          description="Named pax, operational notes, passport details, and child-seat flags."
        >
          {data.travelers.length === 0 ? (
            <OnTourEmptyState
              title="No travelers captured"
              description="Add confirmed pax as soon as names arrive so rooming, manifests, and supplier requests stay accurate."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Nationality</TableHead>
                  <TableHead>Passport</TableHead>
                  <TableHead>Operational Flags</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.travelers.map((traveler) => (
                  <TableRow key={traveler.id}>
                    <TableCell className="font-medium">{traveler.fullName}</TableCell>
                    <TableCell>{traveler.travelerType}</TableCell>
                    <TableCell>{traveler.nationality || "-"}</TableCell>
                    <TableCell>{traveler.passportNo || "-"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {traveler.isGroupLeader ? <OnTourStatusBadge status="GROUP_LEADER" /> : null}
                        {traveler.isTourLeader ? <OnTourStatusBadge status="TOUR_LEADER" /> : null}
                        {traveler.requiresChildSeat ? <OnTourStatusBadge status="CHILD_SEAT" /> : null}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-sm text-sm text-muted-foreground">
                      {[traveler.dietaryNotes, traveler.medicalNotes, traveler.mobilityNotes].filter(Boolean).join(" • ") || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabCard>
      </TabsContent>

      <TabsContent value="groups">
        <TabCard
          title="Subgroups"
          description="Operational branching for optional excursions, extensions, and split routing."
        >
          {data.groups.length === 0 ? (
            <OnTourEmptyState title="No subgroups" description="Use subgroups when part of the departure follows a different service path." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Travelers</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.groups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell className="font-medium">{group.groupName}</TableCell>
                    <TableCell>{group.subgroupType}</TableCell>
                    <TableCell>
                      {group.startDate ? new Date(group.startDate).toLocaleDateString() : "Full tour"}
                      {group.endDate ? ` - ${new Date(group.endDate).toLocaleDateString()}` : ""}
                    </TableCell>
                    <TableCell>{group.travelerCount ?? "-"}</TableCell>
                    <TableCell>{group.notes || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabCard>
      </TabsContent>

      <TabsContent value="rooming">
        <TabCard
          title="Rooming"
          description="Room allocations, single-supplement impact, child bed usage, and hotel readiness."
        >
          {data.rooming.length === 0 ? (
            <OnTourEmptyState
              title="Rooming not built yet"
              description="Generate room allocations once traveler names and hotel confirmations are ready."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Room</TableHead>
                  <TableHead>Occupancy</TableHead>
                  <TableHead>Meal Plan</TableHead>
                  <TableHead>Travelers</TableHead>
                  <TableHead>Supplement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rooming.map((room) => (
                  <TableRow key={room.id}>
                    <TableCell className="font-medium">
                      {room.roomLabel}
                      {room.roomNumber ? <div className="text-xs text-muted-foreground">#{room.roomNumber}</div> : null}
                    </TableCell>
                    <TableCell>{room.occupancyType}</TableCell>
                    <TableCell>{room.mealPlan || "-"}</TableCell>
                    <TableCell>{room.travelerNames?.join(", ") || "-"}</TableCell>
                    <TableCell>{room.isSingleSupplementApplied ? "Single supplement" : "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabCard>
      </TabsContent>

      <TabsContent value="services">
        <TabCard
          title="Operational Services"
          description="Service-by-service confirmation, supplier ownership, subgroup impact, and quoted vs actual cost."
        >
          {data.services.length === 0 ? (
            <OnTourEmptyState title="No services found" description="Converted services will appear here once the on-tour file is populated." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Day / Group</TableHead>
                  <TableHead>Confirmation</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Financials</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell>
                      <div className="font-medium">{service.title}</div>
                      <div className="text-xs text-muted-foreground">{service.code}</div>
                    </TableCell>
                    <TableCell>{service.serviceType}</TableCell>
                    <TableCell>
                      Day {service.dayNumber ?? "-"}
                      {service.groupName ? ` • ${service.groupName}` : ""}
                    </TableCell>
                    <TableCell>
                      <OnTourStatusBadge status={service.confirmationStatus} />
                    </TableCell>
                    <TableCell>{service.supplierOrgName || "Pending supplier"}</TableCell>
                    <TableCell className="text-sm">
                      <div>Quoted {service.quotedTotalAmount}</div>
                      <div className="text-muted-foreground">Confirmed {service.confirmedTotalAmount}</div>
                      <div className="text-muted-foreground">Actual {service.actualTotalAmount}</div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabCard>
      </TabsContent>

      <TabsContent value="operations">
        <div className="grid gap-4 xl:grid-cols-2">
          <TabCard title="Requisitions & Claims" description="Supplier fulfillment, acknowledgements, and amendment control.">
            {data.requisitions.length === 0 ? (
              <OnTourEmptyState title="No requisitions raised" description="Generate requisitions from confirmed services once suppliers are resolved." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Requisition</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.requisitions.map((requisition) => (
                    <TableRow key={requisition.id}>
                      <TableCell className="font-medium">{requisition.requisitionNo}</TableCell>
                      <TableCell>{requisition.supplierName || "-"}</TableCell>
                      <TableCell>{requisition.requisitionType}</TableCell>
                      <TableCell><OnTourStatusBadge status={requisition.status} /></TableCell>
                      <TableCell>{requisition.totalAmount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabCard>
          <TabCard title="Vouchers, Vehicles & Guides" description="Operational issue control for suppliers, transport, and guiding.">
            <div className="space-y-4">
              <div>
                <div className="mb-2 text-sm font-medium">Supplier Vouchers</div>
                {data.vouchers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No vouchers issued yet.</p>
                ) : (
                  <div className="space-y-2">
                    {data.vouchers.map((voucher) => (
                      <div key={voucher.id} className="rounded-md border px-3 py-2 text-sm">
                        <div className="font-medium">{voucher.voucherNo}</div>
                        <div className="text-muted-foreground">{voucher.supplierName || "Unassigned supplier"}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-2 text-sm font-medium">Vehicle Allocations</div>
                  {data.vehicleAllocations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No vehicles allocated yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {data.vehicleAllocations.map((vehicle) => (
                        <div key={vehicle.id} className="rounded-md border px-3 py-2 text-sm">
                          <div className="font-medium">{vehicle.vehicleTypeName || vehicle.vehicleCategoryName || "Vehicle pending"}</div>
                          <div className="text-muted-foreground">{vehicle.driverName || "Driver pending"}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <div className="mb-2 text-sm font-medium">Guide Allocations</div>
                  {data.guideAllocations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No guides allocated yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {data.guideAllocations.map((guide) => (
                        <div key={guide.id} className="rounded-md border px-3 py-2 text-sm">
                          <div className="font-medium">{guide.guideName || "Guide pending"}</div>
                          <div className="text-muted-foreground">{guide.languageName || "Language pending"}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabCard>
        </div>
      </TabsContent>

      <TabsContent value="finance">
        <div className="grid gap-4 xl:grid-cols-2">
          <TabCard title="Customer Invoices" description="Commercial receivables linked to the departure.">
            {data.finance.invoices.length === 0 ? (
              <OnTourEmptyState title="No customer invoices" description="Invoices will appear here when the commercial side is posted." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.finance.invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoiceNo}</TableCell>
                      <TableCell><OnTourStatusBadge status={invoice.status} /></TableCell>
                      <TableCell>{invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : "-"}</TableCell>
                      <TableCell>{invoice.totalAmount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabCard>
          <TabCard title="Supplier Bills & Reconciliation" description="Actual payables and margin tracking against the frozen quote.">
            {data.finance.supplierBills.length === 0 && !data.finance.reconciliation ? (
              <OnTourEmptyState title="No finance activity yet" description="Bills and reconciliation appear once supplier paperwork starts arriving." />
            ) : (
              <div className="space-y-4">
                {data.finance.reconciliation ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-md border px-3 py-2 text-sm">
                      <div className="text-muted-foreground">Quoted Margin</div>
                      <div className="text-lg font-semibold">{data.finance.reconciliation.quotedMargin}</div>
                    </div>
                    <div className="rounded-md border px-3 py-2 text-sm">
                      <div className="text-muted-foreground">Actual Margin</div>
                      <div className="text-lg font-semibold">{data.finance.reconciliation.actualMargin}</div>
                    </div>
                  </div>
                ) : null}
                {data.finance.supplierBills.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bill</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.finance.supplierBills.map((bill) => (
                        <TableRow key={bill.id}>
                          <TableCell className="font-medium">{bill.billNo}</TableCell>
                          <TableCell><OnTourStatusBadge status={bill.status} /></TableCell>
                          <TableCell>{bill.billDate ? new Date(bill.billDate).toLocaleDateString() : "-"}</TableCell>
                          <TableCell>{bill.totalAmount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : null}
              </div>
            )}
          </TabCard>
        </div>
      </TabsContent>

      <TabsContent value="audit">
        <TabCard title="Operational Timeline" description="Audit history, workflow checkpoints, and key operational changes.">
          {data.audit.length === 0 ? (
            <OnTourEmptyState title="No audit events yet" description="Operational events will appear here once workflows start posting updates." />
          ) : (
            <div className="space-y-3">
              {data.audit.map((entry) => (
                <div key={entry.id} className="rounded-md border px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium">{entry.action}</div>
                    <div className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">{entry.summary}</div>
                  {entry.actorName ? <div className="mt-2 text-xs text-muted-foreground">By {entry.actorName}</div> : null}
                </div>
              ))}
            </div>
          )}
        </TabCard>
      </TabsContent>
    </Tabs>
  );
}
