export type ItineraryStatus = "DRAFT" | "PUBLISHED" | "NEEDS_REVIEW";

export type WorkspaceMode = "BUILDER" | "PREVIEW" | "SPLIT";

export type PreviewDevice = "DESKTOP" | "MOBILE" | "PDF_SAFE";

export type ItinerarySectionType =
  | "overview"
  | "hero"
  | "tripSummary"
  | "destinations"
  | "dayPlan"
  | "stays"
  | "transfers"
  | "activities"
  | "dining"
  | "inclusionsExclusions"
  | "policies"
  | "gallery"
  | "notes"
  | "ctaFooter"
  | "custom";

export type MediaAssetType = "image" | "video";

export type GalleryTargetType = "hero" | "overview" | "day" | "stay" | "activity";

export type SaveState = "saved" | "dirty" | "saving";

export type TimelinePhase = "morning" | "afternoon" | "evening";

export type TimelineItemType = "activity" | "transfer" | "meal" | "check-in" | "note";

export interface ItinerarySection {
  id: string;
  type: ItinerarySectionType;
  title: string;
  description: string;
  visible: boolean;
  locked: boolean;
  customSectionId?: string;
}

export interface HeroSection {
  title: string;
  subtitle: string;
  destination: string;
  country: string;
  startDate: string;
  endDate: string;
  durationLabel: string;
  travelerLabel: string;
  coverMediaId: string | null;
  tags: string[];
}

export interface QuickFact {
  id: string;
  label: string;
  value: string;
}

export interface TripSummary {
  intro: string;
  highlights: string[];
  importantNotes: string[];
  quickFacts: QuickFact[];
  budgetRange: string;
  travelStyle: string;
}

export interface DestinationStop {
  id: string;
  city: string;
  country: string;
  nights: number;
  summary: string;
}

export interface TimelineItem {
  id: string;
  title: string;
  time: string;
  type: TimelineItemType;
  phase: TimelinePhase;
  location: string;
  description: string;
}

export interface DayPlan {
  id: string;
  dayNumber: number;
  title: string;
  date: string;
  summary: string;
  morning: string;
  afternoon: string;
  evening: string;
  activities: string[];
  transportation: string;
  meals: string[];
  accommodation: string;
  notes: string;
  expanded: boolean;
  timeline: TimelineItem[];
}

export interface Stay {
  id: string;
  propertyName: string;
  address: string;
  city: string;
  checkIn: string;
  checkOut: string;
  roomType: string;
  confirmation: string;
  amenities: string[];
  notes: string;
}

export interface Transfer {
  id: string;
  mode: string;
  from: string;
  to: string;
  departureTime: string;
  arrivalTime: string;
  confirmation: string;
  driverContact: string;
  notes: string;
}

export interface Activity {
  id: string;
  title: string;
  startTime: string;
  duration: string;
  location: string;
  bookingReference: string;
  included: boolean;
  notes: string;
}

export interface DiningReservation {
  id: string;
  restaurantName: string;
  reservationTime: string;
  cuisine: string;
  address: string;
  confirmation: string;
  notes: string;
}

export interface MediaAsset {
  id: string;
  type: MediaAssetType;
  title: string;
  url: string;
  thumbnailUrl: string;
  caption: string;
  altText: string;
  tags: string[];
  uploadProgress: number;
  status: "uploading" | "ready";
  durationLabel?: string;
}

export interface GalleryAssignment {
  id: string;
  mediaId: string;
  targetType: GalleryTargetType;
  targetId: string;
  featured: boolean;
}

export interface ContactInfo {
  conciergeName: string;
  supportPhone: string;
  emergencyPhone: string;
  supportEmail: string;
  notes: string;
}

export interface PolicySection {
  id: string;
  title: string;
  body: string;
}

export interface CustomSection {
  id: string;
  title: string;
  body: string;
  eyebrow: string;
}

export interface Itinerary {
  id: string;
  title: string;
  status: ItineraryStatus;
  destination: string;
  startDate: string;
  endDate: string;
  travelerLabel: string;
  sections: ItinerarySection[];
  hero: HeroSection;
  tripSummary: TripSummary;
  destinations: DestinationStop[];
  days: DayPlan[];
  stays: Stay[];
  transfers: Transfer[];
  activities: Activity[];
  dining: DiningReservation[];
  inclusions: string[];
  exclusions: string[];
  policies: PolicySection[];
  notes: string;
  footerCta: string;
  contact: ContactInfo;
  gallery: MediaAsset[];
  galleryAssignments: GalleryAssignment[];
  customSections: CustomSection[];
}

export interface ItineraryPreviewTarget {
  type: GalleryTargetType;
  id: string;
  label: string;
}
