"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  onTourTravelerSchema,
  type OnTourTravelerFormValues,
} from "@/modules/on-tour/shared/on-tour-schemas";

export function OnTourTravelerDialog({
  open,
  saving,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: OnTourTravelerFormValues) => Promise<void> | void;
}) {
  const form = useForm<OnTourTravelerFormValues>({
    resolver: zodResolver(onTourTravelerSchema),
    defaultValues: {
      travelerType: "ADULT",
      fullName: "",
      nationality: "",
      passportNo: "",
      dietaryNotes: "",
      medicalNotes: "",
      mobilityNotes: "",
      roomingGender: "",
      requiresChildSeat: false,
      isGroupLeader: false,
      isTourLeader: false,
    },
  });

  useEffect(() => {
    if (!open) form.reset();
  }, [form, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-[96vw] sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Add Traveler</DialogTitle>
          <DialogDescription>
            Capture named pax early so rooming, manifests, child seats, and supplier coordination stay accurate.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="grid gap-4" onSubmit={form.handleSubmit(async (values) => onSubmit(values))}>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="travelerType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Traveler Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ADULT">Adult</SelectItem>
                        <SelectItem value="CHILD">Child</SelectItem>
                        <SelectItem value="INFANT">Infant</SelectItem>
                        <SelectItem value="FOC">FOC</SelectItem>
                        <SelectItem value="TOUR_LEADER">Tour Leader</SelectItem>
                        <SelectItem value="ESCORT">Escort</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nationality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nationality</FormLabel>
                    <FormControl>
                      <Input placeholder="German" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="passportNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Passport No</FormLabel>
                    <FormControl>
                      <Input placeholder="N12345678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="roomingGender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rooming Gender</FormLabel>
                    <FormControl>
                      <Input placeholder="Male" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="requiresChildSeat"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-md border p-3">
                    <FormLabel className="mb-0">Requires Child Seat</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isGroupLeader"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-md border p-3">
                    <FormLabel className="mb-0">Group Leader</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isTourLeader"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-md border p-3">
                    <FormLabel className="mb-0">Tour Leader</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="dietaryNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dietary Notes</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="medicalNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Medical Notes</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mobilityNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobility Notes</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Add Traveler"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
