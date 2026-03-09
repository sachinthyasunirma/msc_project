import type { ActivityResourceKey } from "@/modules/activity/shared/activity-management-types";

export const ACTIVITY_META: Record<ActivityResourceKey, { title: string; description: string }> = {
  activities: {
    title: "Activities",
    description:
      "Create and maintain activities. Cover image is managed inside the activity form.",
  },
  "activity-availability": {
    title: "Activity Availability",
    description: "Configure date windows, weekdays, and operating times for this activity.",
  },
  "activity-rates": {
    title: "Activity Rates",
    description: "Configure pricing lines for this activity.",
  },
  "activity-supplements": {
    title: "Activity Supplements",
    description: "Configure supplements linked to this activity.",
  },
};

export const ACTIVITY_TAB_LABELS: Record<ActivityResourceKey, string> = {
  activities: "Activities",
  "activity-availability": "Availability",
  "activity-rates": "Rates",
  "activity-supplements": "Supplements",
};

export const ACTIVITY_COLUMNS: Record<ActivityResourceKey, Array<{ key: string; label: string }>> = {
  activities: [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "type", label: "Type" },
    { key: "locationId", label: "Location" },
    { key: "coverImageUrl", label: "Cover Image" },
    { key: "isActive", label: "Status" },
  ],
  "activity-availability": [
    { key: "code", label: "Code" },
    { key: "startTime", label: "Start" },
    { key: "endTime", label: "End" },
    { key: "isActive", label: "Status" },
  ],
  "activity-rates": [
    { key: "code", label: "Code" },
    { key: "label", label: "Label" },
    { key: "pricingModel", label: "Model" },
    { key: "currency", label: "Currency" },
    { key: "isActive", label: "Status" },
  ],
  "activity-supplements": [
    { key: "code", label: "Code" },
    { key: "supplementActivityId", label: "Supplement" },
    { key: "isRequired", label: "Required" },
    { key: "isActive", label: "Status" },
  ],
};
