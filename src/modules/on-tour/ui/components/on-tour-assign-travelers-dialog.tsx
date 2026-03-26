"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assignTravelersToGroupSchema, type AssignTravelersToGroupFormValues } from "@/modules/on-tour/shared/on-tour-schemas";
import type { OnTourGroupRecord, OnTourTravelerRecord } from "@/modules/on-tour/shared/on-tour-management-types";

export function OnTourAssignTravelersDialog({
  open,
  saving,
  groups,
  travelers,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  saving: boolean;
  groups: OnTourGroupRecord[];
  travelers: OnTourTravelerRecord[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AssignTravelersToGroupFormValues) => Promise<void> | void;
}) {
  const form = useForm<AssignTravelersToGroupFormValues>({
    resolver: zodResolver(assignTravelersToGroupSchema),
    defaultValues: {
      groupId: groups.find((group) => !group.isPrimary)?.id ?? groups[0]?.id ?? "",
      travelerIds: [],
      effectiveFrom: "",
      effectiveTo: "",
    },
  });

  useEffect(() => {
    if (!open) form.reset();
  }, [form, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Assign Travelers to Subgroup</DialogTitle>
          <DialogDescription>
            Use date-ranged assignments when the split is temporary. Leave dates empty for full-tour membership.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="grid gap-4" onSubmit={form.handleSubmit(async (values) => onSubmit(values))}>
            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="groupId"
                render={({ field }) => (
                  <FormItem className="md:col-span-3">
                    <FormLabel>Subgroup</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select subgroup" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {groups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.groupName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="effectiveFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Effective From</FormLabel>
                    <FormControl>
                      <input
                        className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs"
                        type="datetime-local"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="effectiveTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Effective To</FormLabel>
                    <FormControl>
                      <input
                        className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs"
                        type="datetime-local"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="travelerIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Travelers</FormLabel>
                  <div className="grid max-h-72 gap-2 overflow-y-auto rounded-md border p-3">
                    {travelers.map((traveler) => {
                      const checked = field.value.includes(traveler.id);
                      return (
                        <label
                          key={traveler.id}
                          className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(nextChecked) => {
                              const next = nextChecked
                                ? [...field.value, traveler.id]
                                : field.value.filter((value) => value !== traveler.id);
                              field.onChange(next);
                            }}
                          />
                          <div className="min-w-0">
                            <div className="font-medium">{traveler.fullName}</div>
                            <div className="text-xs text-muted-foreground">
                              {traveler.travelerType}
                              {traveler.passportNo ? ` • ${traveler.passportNo}` : ""}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Assign Travelers"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
