"use client";

import { FileText, WalletCards } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { PreTourSupplementAllocationState } from "@/modules/pre-tour/shared/pre-tour-item-allocation-types";

type SupplementAllocationTabProps = {
  value: PreTourSupplementAllocationState;
  disabled?: boolean;
  onChange: (patch: Partial<PreTourSupplementAllocationState>) => void;
};

export function SupplementAllocationTab({
  value,
  disabled = false,
  onChange,
}: SupplementAllocationTabProps) {
  return (
    <div className="space-y-4">
      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <WalletCards className="size-4" />
            Supplement / Misc Charge
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="grid gap-2">
            <Label>Charge category</Label>
            <Select
              value={value.chargeCategory}
              onValueChange={(chargeCategory) =>
                onChange({ chargeCategory: chargeCategory as PreTourSupplementAllocationState["chargeCategory"] })
              }
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SUPPLEMENT">Supplement</SelectItem>
                <SelectItem value="MISC">Miscellaneous</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label>Charge name</Label>
            <Input
              value={value.serviceLabel}
              onChange={(event) => onChange({ serviceLabel: event.target.value })}
              placeholder="Visa fee / porterage / early check-in / permit"
              disabled={disabled}
            />
          </div>
          <div className="grid gap-2">
            <Label>Amount basis</Label>
            <Input
              value={value.unitBasis}
              onChange={(event) => onChange({ unitBasis: event.target.value })}
              placeholder="Per pax / per room / flat charge"
              disabled={disabled}
            />
          </div>
          <div className="grid gap-2">
            <Label>Quantity</Label>
            <Input
              type="number"
              min="1"
              value={value.quantity}
              onChange={(event) => onChange({ quantity: event.target.value })}
              disabled={disabled}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="size-4" />
            Charge Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            <Label>Remarks / justification</Label>
            <Textarea
              value={value.remarks}
              onChange={(event) => onChange({ remarks: event.target.value })}
              placeholder="Explain what the charge covers and when it should be applied."
              disabled={disabled}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
