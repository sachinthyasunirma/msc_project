import { z } from "zod";

export const onTourSubgroupSchema = z
  .object({
    groupName: z.string().trim().min(2).max(120),
    subgroupType: z.enum(["MAIN", "SPLIT", "OPTIONAL_EXCURSION", "PRIVATE_EXTENSION", "ROOMING_ONLY"]),
    startDate: z.string().datetime().optional().or(z.literal("")),
    endDate: z.string().datetime().optional().or(z.literal("")),
    preferredLanguage: z.string().trim().max(40).optional(),
    notes: z.string().trim().max(1000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.startDate && value.endDate && value.startDate > value.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "End date must be on or after the start date.",
      });
    }
  });

export const onTourTravelerSchema = z.object({
  travelerType: z.enum(["ADULT", "CHILD", "INFANT", "FOC", "TOUR_LEADER", "ESCORT"]),
  fullName: z.string().trim().min(2).max(160),
  nationality: z.string().trim().max(80).optional(),
  passportNo: z.string().trim().max(80).optional(),
  dietaryNotes: z.string().trim().max(500).optional(),
  medicalNotes: z.string().trim().max(500).optional(),
  mobilityNotes: z.string().trim().max(500).optional(),
  roomingGender: z.string().trim().max(20).optional(),
  requiresChildSeat: z.boolean().default(false),
  isGroupLeader: z.boolean().default(false),
  isTourLeader: z.boolean().default(false),
});

export const assignTravelersToGroupSchema = z.object({
  groupId: z.string().trim().min(1),
  travelerIds: z.array(z.string().trim().min(1)).min(1, "Select at least one traveler."),
  effectiveFrom: z.string().datetime().optional().or(z.literal("")),
  effectiveTo: z.string().datetime().optional().or(z.literal("")),
});

export const convertPreTourToOnTourSchema = z.object({
  preTourPlanId: z.string().trim().min(1),
});

export type OnTourSubgroupFormValues = z.input<typeof onTourSubgroupSchema>;
export type OnTourTravelerFormValues = z.input<typeof onTourTravelerSchema>;
export type AssignTravelersToGroupFormValues = z.input<typeof assignTravelersToGroupSchema>;
export type ConvertPreTourToOnTourFormValues = z.input<typeof convertPreTourToOnTourSchema>;
