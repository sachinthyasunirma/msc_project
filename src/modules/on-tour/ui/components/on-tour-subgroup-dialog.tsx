"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  onTourSubgroupSchema,
  type OnTourSubgroupFormValues,
} from "@/modules/on-tour/shared/on-tour-schemas";

export function OnTourSubgroupDialog({
  open,
  saving,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: OnTourSubgroupFormValues) => Promise<void> | void;
}) {
  const form = useForm<OnTourSubgroupFormValues>({
    resolver: zodResolver(onTourSubgroupSchema),
    defaultValues: {
      groupName: "",
      subgroupType: "SPLIT",
      startDate: "",
      endDate: "",
      preferredLanguage: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (!open) form.reset();
  }, [form, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Subgroup</DialogTitle>
          <DialogDescription>
            Split the operational file into a subgroup for excursions, extensions, or partial routing.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="grid gap-4" onSubmit={form.handleSubmit(async (values) => onSubmit(values))}>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="groupName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Beach Extension" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subgroupType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subgroup Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select subgroup type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="SPLIT">Split</SelectItem>
                        <SelectItem value="OPTIONAL_EXCURSION">Optional Excursion</SelectItem>
                        <SelectItem value="PRIVATE_EXTENSION">Private Extension</SelectItem>
                        <SelectItem value="ROOMING_ONLY">Rooming Only</SelectItem>
                        <SelectItem value="MAIN">Main</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Effective From</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormDescription>Optional for full-tour subgroups.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Effective To</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="preferredLanguage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Language</FormLabel>
                  <FormControl>
                    <Input placeholder="English" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Operational Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={4}
                      placeholder="Explain why this split exists and what services it affects."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Create Subgroup"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
