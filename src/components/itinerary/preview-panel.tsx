"use client";

import { CalendarDays, MapPin, PlayCircle, Stars, UsersRound } from "lucide-react";
import { DevicePreviewToggle } from "@/components/itinerary/device-preview-toggle";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  GalleryTargetType,
  Itinerary,
  ItinerarySection,
  MediaAsset,
  PreviewDevice,
} from "@/lib/types/itinerary";

type PreviewPanelProps = {
  itinerary: Itinerary;
  selectedSection: ItinerarySection | null;
  device: PreviewDevice;
  showFullPreview: boolean;
  onDeviceChange: (device: PreviewDevice) => void;
};

function getAssignedMedia(
  itinerary: Itinerary,
  targetType: GalleryTargetType,
  targetId: string
) {
  return itinerary.galleryAssignments
    .filter((assignment) => assignment.targetType === targetType && assignment.targetId === targetId)
    .map((assignment) => itinerary.gallery.find((asset) => asset.id === assignment.mediaId))
    .filter((asset): asset is MediaAsset => Boolean(asset));
}

function getCoverAsset(itinerary: Itinerary) {
  return itinerary.gallery.find((asset) => asset.id === itinerary.hero.coverMediaId) || null;
}

function PreviewSurface({
  itinerary,
  selectedSection,
  showFullPreview,
}: {
  itinerary: Itinerary;
  selectedSection: ItinerarySection | null;
  showFullPreview: boolean;
}) {
  const coverAsset = getCoverAsset(itinerary);

  const visibleSections = itinerary.sections.filter((section) => section.visible);
  const sectionsToRender = showFullPreview
    ? visibleSections
    : selectedSection && selectedSection.visible
      ? [selectedSection]
      : [];

  return (
    <div className="space-y-6">
      {sectionsToRender.map((section) => {
        if (section.type === "overview") {
          return (
            <section key={section.id} className="space-y-4 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                <Stars className="size-4" />
                Overview
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {itinerary.tripSummary.quickFacts.map((fact) => (
                  <div key={fact.id} className="rounded-[22px] bg-slate-50 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{fact.label}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{fact.value}</p>
                  </div>
                ))}
              </div>
            </section>
          );
        }

        if (section.type === "hero") {
          return (
            <section key={section.id} className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <div className="relative aspect-[16/10] overflow-hidden">
                {coverAsset ? (
                  coverAsset.type === "video" ? (
                    <>
                      <video
                        src={coverAsset.url}
                        poster={coverAsset.thumbnailUrl || undefined}
                        className="h-full w-full object-cover"
                        muted
                        autoPlay
                        loop
                        playsInline
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-slate-950/5 to-transparent" />
                      <div className="absolute right-4 top-4 rounded-full bg-white/90 p-3">
                        <PlayCircle className="size-6 text-slate-900" />
                      </div>
                    </>
                  ) : (
                    <>
                      <img src={coverAsset.url} alt={coverAsset.altText} className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-slate-950/10 to-transparent" />
                    </>
                  )
                ) : (
                  <div className="h-full w-full bg-[linear-gradient(135deg,#d6e1e2_0%,#f3efe8_100%)]" />
                )}
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">{itinerary.hero.destination}</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">{itinerary.hero.title}</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">{itinerary.hero.subtitle}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {itinerary.hero.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-white/12 px-3 py-1 text-xs font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          );
        }

        if (section.type === "tripSummary") {
          return (
            <section key={section.id} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-950">Trip Summary</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{itinerary.tripSummary.intro}</p>
              <div className="mt-4 grid gap-3">
                {itinerary.tripSummary.highlights.map((highlight) => (
                  <div key={highlight} className="rounded-[20px] bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    {highlight}
                  </div>
                ))}
              </div>
            </section>
          );
        }

        if (section.type === "destinations") {
          return (
            <section key={section.id} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-950">Destination Flow</h3>
              <div className="mt-4 space-y-3">
                {itinerary.destinations.map((stop) => (
                  <div key={stop.id} className="rounded-[22px] border border-slate-200 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">
                          {stop.city}, {stop.country}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">{stop.summary}</p>
                      </div>
                      <Badge variant="outline">{stop.nights} nights</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        }

        if (section.type === "dayPlan") {
          return (
            <section key={section.id} className="space-y-4">
              {itinerary.days.map((day) => (
                <article key={day.id} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">Day {day.dayNumber}</Badge>
                    <Badge variant="outline">{day.date}</Badge>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-slate-950">{day.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{day.summary}</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-[20px] bg-slate-50 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Morning</p>
                      <p className="mt-2 text-sm text-slate-700">{day.morning}</p>
                    </div>
                    <div className="rounded-[20px] bg-slate-50 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Afternoon</p>
                      <p className="mt-2 text-sm text-slate-700">{day.afternoon}</p>
                    </div>
                    <div className="rounded-[20px] bg-slate-50 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Evening</p>
                      <p className="mt-2 text-sm text-slate-700">{day.evening}</p>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          );
        }

        if (section.type === "stays") {
          return (
            <section key={section.id} className="grid gap-4">
              {itinerary.stays.map((stay) => {
                const stayMedia = getAssignedMedia(itinerary, "stay", stay.id)[0];
                return (
                  <article key={stay.id} className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                    {stayMedia ? (
                      <div className="aspect-[16/8] overflow-hidden">
                        <img src={stayMedia.thumbnailUrl} alt={stayMedia.altText} className="h-full w-full object-cover" />
                      </div>
                    ) : null}
                    <div className="p-5">
                      <h3 className="text-lg font-semibold text-slate-950">{stay.propertyName}</h3>
                      <p className="mt-1 text-sm text-slate-500">{stay.address}</p>
                      <p className="mt-3 text-sm text-slate-700">{stay.notes}</p>
                    </div>
                  </article>
                );
              })}
            </section>
          );
        }

        if (section.type === "transfers") {
          return (
            <section key={section.id} className="grid gap-4">
              {itinerary.transfers.map((transfer) => (
                <article key={transfer.id} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-slate-950">{transfer.mode}</h3>
                    <Badge variant="outline">
                      {transfer.departureTime} - {transfer.arrivalTime}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {transfer.from} → {transfer.to}
                  </p>
                </article>
              ))}
            </section>
          );
        }

        if (section.type === "activities") {
          return (
            <section key={section.id} className="grid gap-4">
              {itinerary.activities.map((activity) => {
                const activityMedia = getAssignedMedia(itinerary, "activity", activity.id)[0];
                return (
                  <article key={activity.id} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-base font-semibold text-slate-950">{activity.title}</h3>
                      <Badge variant="outline">{activity.duration}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{activity.location}</p>
                    {activityMedia ? (
                      <div className="mt-4 aspect-[16/9] overflow-hidden rounded-[18px]">
                        <img src={activityMedia.thumbnailUrl} alt={activityMedia.altText} className="h-full w-full object-cover" />
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </section>
          );
        }

        if (section.type === "dining") {
          return (
            <section key={section.id} className="grid gap-4">
              {itinerary.dining.map((item) => (
                <article key={item.id} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-base font-semibold text-slate-950">{item.restaurantName}</h3>
                  <p className="mt-1 text-sm text-slate-500">{item.cuisine}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    {item.reservationTime} · {item.address}
                  </p>
                </article>
              ))}
            </section>
          );
        }

        if (section.type === "inclusionsExclusions") {
          return (
            <section key={section.id} className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-950">Inclusions</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  {itinerary.inclusions.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-950">Exclusions</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  {itinerary.exclusions.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            </section>
          );
        }

        if (section.type === "policies") {
          return (
            <section key={section.id} className="grid gap-4">
              {itinerary.policies.map((policy) => (
                <article key={policy.id} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-base font-semibold text-slate-950">{policy.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{policy.body}</p>
                </article>
              ))}
            </section>
          );
        }

        if (section.type === "gallery") {
          return (
            <section key={section.id} className="grid gap-4 sm:grid-cols-2">
              {itinerary.gallery.map((asset) => (
                  <article key={asset.id} className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                    <div className="relative aspect-[4/3] overflow-hidden">
                      {asset.type === "video" ? (
                        <>
                          <video
                            src={asset.url}
                            poster={asset.thumbnailUrl || undefined}
                            className="h-full w-full object-cover"
                            muted
                            playsInline
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="rounded-full bg-white/90 p-3">
                              <PlayCircle className="size-7 text-slate-950" />
                            </div>
                          </div>
                        </>
                      ) : (
                        <img src={asset.thumbnailUrl} alt={asset.altText} className="h-full w-full object-cover" />
                      )}
                    </div>
                  <div className="p-4">
                    <p className="text-sm font-semibold text-slate-950">{asset.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{asset.caption}</p>
                  </div>
                </article>
              ))}
            </section>
          );
        }

        if (section.type === "notes") {
          return (
            <section key={section.id} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-950">Internal Notes</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{itinerary.notes}</p>
            </section>
          );
        }

        if (section.type === "ctaFooter") {
          return (
            <section key={section.id} className="rounded-[28px] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
              <h3 className="text-xl font-semibold">{itinerary.footerCta}</h3>
              <div className="mt-4 grid gap-2 text-sm text-white/80">
                <p>{itinerary.contact.conciergeName}</p>
                <p>{itinerary.contact.supportEmail}</p>
                <p>{itinerary.contact.supportPhone}</p>
              </div>
            </section>
          );
        }

        if (section.type === "custom") {
          const custom = itinerary.customSections.find((entry) => entry.id === section.customSectionId);
          if (!custom) return null;
          return (
            <section key={section.id} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{custom.eyebrow}</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-950">{custom.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{custom.body}</p>
            </section>
          );
        }

        return null;
      })}
    </div>
  );
}

export function PreviewPanel({
  itinerary,
  selectedSection,
  device,
  showFullPreview,
  onDeviceChange,
}: PreviewPanelProps) {
  return (
    <div className="sticky top-[7.5rem] space-y-4">
      <div className="rounded-[30px] border border-slate-200/80 bg-white/88 p-4 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.28)] backdrop-blur">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Preview</p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">
                {showFullPreview ? "Live itinerary render" : selectedSection?.title || "Selected section"}
              </h2>
            </div>
            <DevicePreviewToggle value={device} onChange={onDeviceChange} />
          </div>

          <div className="grid gap-2 rounded-[22px] border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 sm:grid-cols-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-3.5" />
              {itinerary.startDate} - {itinerary.endDate}
            </div>
            <div className="flex items-center gap-2">
              <UsersRound className="size-3.5" />
              {itinerary.travelerLabel}
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="size-3.5" />
              {itinerary.destination}
            </div>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "mx-auto overflow-hidden rounded-[36px] border border-slate-200 bg-[#f8f4ee] p-3 shadow-[0_30px_90px_-48px_rgba(15,23,42,0.35)]",
          device === "DESKTOP"
            ? "w-full"
            : device === "MOBILE"
              ? "max-w-[390px]"
              : "max-w-[820px]"
        )}
      >
        <div
          className={cn(
            "overflow-hidden rounded-[28px] bg-[linear-gradient(180deg,#faf8f3_0%,#f5f2ec_100%)] p-4",
            device === "PDF_SAFE" ? "border border-slate-200" : ""
          )}
        >
          <PreviewSurface itinerary={itinerary} selectedSection={selectedSection} showFullPreview={showFullPreview} />
        </div>
      </div>
    </div>
  );
}
