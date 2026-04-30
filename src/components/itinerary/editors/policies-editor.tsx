"use client";

import { Plus, Trash2 } from "lucide-react";
import { nanoid } from "nanoid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ContactInfo, PolicySection } from "@/lib/types/itinerary";

type PoliciesEditorProps = {
  policies: PolicySection[];
  contact: ContactInfo;
  onPoliciesChange: (policies: PolicySection[]) => void;
  onContactChange: (contact: ContactInfo) => void;
};

export function PoliciesEditor({
  policies,
  contact,
  onPoliciesChange,
  onContactChange,
}: PoliciesEditorProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h4 className="text-base font-semibold text-slate-950">Policy sections</h4>
            <p className="text-sm text-slate-500">Keep the operational fine print clean, trustworthy, and client-ready.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onPoliciesChange([
                ...policies,
                { id: nanoid(), title: "New policy", body: "Add a new important travel note." },
              ])
            }
          >
            <Plus className="size-4" />
            Add policy
          </Button>
        </div>

        <div className="space-y-4">
          {policies.map((policy) => (
            <div key={policy.id} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="grid flex-1 gap-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={policy.title}
                      onChange={(event) =>
                        onPoliciesChange(
                          policies.map((entry) =>
                            entry.id === policy.id ? { ...entry, title: event.target.value } : entry
                          )
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Body</Label>
                    <Textarea
                      rows={4}
                      value={policy.body}
                      onChange={(event) =>
                        onPoliciesChange(
                          policies.map((entry) =>
                            entry.id === policy.id ? { ...entry, body: event.target.value } : entry
                          )
                        )
                      }
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => onPoliciesChange(policies.filter((entry) => entry.id !== policy.id))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
        <h4 className="text-base font-semibold text-slate-950">Emergency and support</h4>
        <p className="mt-1 text-sm text-slate-500">Surface the operational contacts that make the itinerary feel dependable.</p>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <div className="space-y-2">
            <Label>Concierge name</Label>
            <Input value={contact.conciergeName} onChange={(event) => onContactChange({ ...contact, conciergeName: event.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Support email</Label>
            <Input value={contact.supportEmail} onChange={(event) => onContactChange({ ...contact, supportEmail: event.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Support phone</Label>
            <Input value={contact.supportPhone} onChange={(event) => onContactChange({ ...contact, supportPhone: event.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Emergency phone</Label>
            <Input value={contact.emergencyPhone} onChange={(event) => onContactChange({ ...contact, emergencyPhone: event.target.value })} />
          </div>
          <div className="space-y-2 xl:col-span-2">
            <Label>Support notes</Label>
            <Textarea rows={3} value={contact.notes} onChange={(event) => onContactChange({ ...contact, notes: event.target.value })} />
          </div>
        </div>
      </div>
    </div>
  );
}
