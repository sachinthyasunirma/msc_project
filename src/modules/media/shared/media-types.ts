export const MEDIA_ENTITY_TYPES = ["ACTIVITY", "TRANSPORT_LOCATION", "ACCOMMODATION_HOTEL"] as const;
export type MediaEntityType = (typeof MEDIA_ENTITY_TYPES)[number];

export const MEDIA_SOURCE_TYPES = [
  "OWNED",
  "SUPPLIER",
  "CREATIVE_COMMONS",
  "PUBLIC_DOMAIN",
  "LICENSED_STOCK",
  "OTHER",
] as const;
export type MediaSourceType = (typeof MEDIA_SOURCE_TYPES)[number];

export const MEDIA_REVIEW_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "NEEDS_CHANGES",
] as const;
export type MediaReviewStatus = (typeof MEDIA_REVIEW_STATUSES)[number];

export const CREATIVE_COMMONS_LICENSES = {
  "CC-BY-4.0": {
    label: "CC BY 4.0",
    url: "https://creativecommons.org/licenses/by/4.0/",
    commercialUseAllowed: true,
    derivativesAllowed: true,
  },
  "CC-BY-SA-4.0": {
    label: "CC BY-SA 4.0",
    url: "https://creativecommons.org/licenses/by-sa/4.0/",
    commercialUseAllowed: true,
    derivativesAllowed: true,
  },
  "CC-BY-ND-4.0": {
    label: "CC BY-ND 4.0",
    url: "https://creativecommons.org/licenses/by-nd/4.0/",
    commercialUseAllowed: true,
    derivativesAllowed: false,
  },
  "CC-BY-NC-4.0": {
    label: "CC BY-NC 4.0",
    url: "https://creativecommons.org/licenses/by-nc/4.0/",
    commercialUseAllowed: false,
    derivativesAllowed: true,
  },
  "CC-BY-NC-SA-4.0": {
    label: "CC BY-NC-SA 4.0",
    url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
    commercialUseAllowed: false,
    derivativesAllowed: true,
  },
  "CC-BY-NC-ND-4.0": {
    label: "CC BY-NC-ND 4.0",
    url: "https://creativecommons.org/licenses/by-nc-nd/4.0/",
    commercialUseAllowed: false,
    derivativesAllowed: false,
  },
  CC0: {
    label: "CC0",
    url: "https://creativecommons.org/publicdomain/zero/1.0/",
    commercialUseAllowed: true,
    derivativesAllowed: true,
  },
} as const;

export type CreativeCommonsLicenseCode = keyof typeof CREATIVE_COMMONS_LICENSES;

export type MediaAssetRecord = {
  id: string;
  entityType: MediaEntityType;
  entityId: string;
  storageKey: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  altText: string | null;
  caption: string | null;
  isPrimary: boolean;
  sourceType: MediaSourceType;
  copyrightOwner: string | null;
  creatorName: string | null;
  sourceUrl: string | null;
  licenseCode: string | null;
  licenseUrl: string | null;
  attributionText: string | null;
  commercialUseAllowed: boolean | null;
  derivativesAllowed: boolean | null;
  reviewStatus: MediaReviewStatus;
  reviewNotes: string | null;
  isActive: boolean;
  createdBy: string | null;
  reviewedBy: string | null;
  removedBy: string | null;
  reviewedAt: string | null;
  removedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MediaUploadPreset = {
  maxFileSizeBytes: number;
  allowedMimeTypes: string[];
};
