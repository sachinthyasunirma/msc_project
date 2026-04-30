"use client";

import type { ItineraryWebSection } from "@/modules/itinerary/shared/itinerary-types";

function MediaPanel({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-[24px] sm:rounded-[28px] ${className}`}>
      <div
        role="img"
        aria-label={alt}
        className="h-full w-full bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url("${src}")` }}
      />
    </div>
  );
}

export function ItineraryWebRenderer({
  sections,
  showHidden = false,
}: {
  sections: ItineraryWebSection[];
  showHidden?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-[#d9d5cb] bg-[#f4f0e8] shadow-sm sm:rounded-[32px]">
      {(showHidden ? sections : sections.filter((section) => section.state?.isVisible !== false)).map((section) => {
        switch (section.family) {
          case "HERO":
            return (
              <section
                key={section.id}
                data-section-family={section.family}
                data-layout-variant={section.layoutVariant}
                className="grid gap-8 bg-[linear-gradient(160deg,#17343b_0%,#244b54_48%,#426870_100%)] px-5 py-6 text-white sm:px-6 sm:py-8 lg:px-8 lg:py-10 xl:grid-cols-[1.05fr_0.95fr] xl:px-10 xl:py-12"
              >
                <div className="space-y-5">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/70">Travel Microsite Draft</p>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/55">{section.anchorLabel}</p>
                  </div>
                  <div className="space-y-3">
                    <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl xl:text-6xl">
                      {section.title}
                    </h1>
                    <p className="max-w-2xl text-sm leading-7 text-white/80 lg:text-base">{section.subtitle}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {section.chips.map((chip) => (
                      <span
                        key={chip}
                        className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/90"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  {section.heroImage ? (
                    <MediaPanel src={section.heroImage.src} alt={section.heroImage.alt} className="h-[220px] sm:h-[280px] xl:h-[320px]" />
                  ) : (
                    <div className="flex h-[220px] items-end rounded-[24px] bg-[radial-gradient(circle_at_top,#88a3a9_0%,#3b5861_45%,#1b363d_100%)] p-5 sm:h-[280px] sm:rounded-[28px] sm:p-6 xl:h-[320px]">
                      <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
                        <p className="text-xs uppercase tracking-[0.2em] text-white/70">Hero media slot</p>
                        <p className="mt-1 text-sm text-white/90">
                          This web template is ready for destination or supplier imagery.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            );
          case "QUICK_FACTS":
            return (
              <section
                key={section.id}
                data-section-family={section.family}
                data-layout-variant={section.layoutVariant}
                className="space-y-6 bg-[#f9f7f2] px-5 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10"
              >
                <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-[#6e6659]">{section.title}</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {section.facts.map((fact) => (
                        <div key={fact.label} className="rounded-3xl border border-[#e2dbcf] bg-white px-4 py-4">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-[#8d836f]">{fact.label}</p>
                          <p className="mt-2 text-sm font-medium text-[#1d2c30]">{fact.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    {section.highlights.map((highlight) => (
                      <article key={highlight.title} className="overflow-hidden rounded-3xl border border-[#e2dbcf] bg-white">
                        {highlight.image ? (
                          <MediaPanel src={highlight.image.src} alt={highlight.image.alt} className="h-44 rounded-none" />
                        ) : null}
                        <div className="space-y-2 px-4 py-4">
                          {highlight.eyebrow ? (
                            <p className="text-[11px] uppercase tracking-[0.18em] text-[#8d836f]">
                              {highlight.eyebrow}
                            </p>
                          ) : null}
                          <h3 className="text-base font-semibold text-[#1d2c30]">{highlight.title}</h3>
                          <p className="text-sm leading-6 text-[#5a645f]">{highlight.description}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            );
          case "ROUTE":
            return (
              <section
                key={section.id}
                data-section-family={section.family}
                data-layout-variant={section.layoutVariant}
                className="bg-white px-5 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10"
              >
                <div className="grid gap-8 xl:grid-cols-[0.85fr_1.15fr]">
                  <div className="space-y-5">
                    <p className="text-xs uppercase tracking-[0.22em] text-[#6e6659]">{section.title}</p>
                    <div className="space-y-3">
                      {section.routeStops.map((stop, index) => (
                        <div key={`${section.id}-${stop}-${index}`} className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#17343b] text-sm font-semibold text-white">
                            {index + 1}
                          </span>
                          <span className="text-sm font-medium text-[#1d2c30]">{stop}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    {section.image ? (
                      <MediaPanel src={section.image.src} alt={section.image.alt} className="h-60" />
                    ) : null}
                    <p className="text-sm leading-7 text-[#5a645f]">{section.summary}</p>
                  </div>
                </div>
              </section>
            );
          case "TIMELINE":
            return (
              <section
                key={section.id}
                data-section-family={section.family}
                data-layout-variant={section.layoutVariant}
                className="space-y-6 bg-[#f1ece2] px-5 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10"
              >
                <p className="text-xs uppercase tracking-[0.22em] text-[#6e6659]">{section.title}</p>
                <div className="space-y-5">
                  {section.days.map((day) => (
                    <article key={day.id} className="rounded-[28px] border border-[#ddd4c7] bg-white p-5">
                      <div className="grid gap-5 xl:grid-cols-[180px_minmax(0,1fr)_280px]">
                        <div className="space-y-2">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-[#8d836f]">Day {day.dayNumber}</p>
                          <h3 className="text-xl font-semibold text-[#1d2c30]">{day.title}</h3>
                          <p className="text-sm text-[#5a645f]">{day.dateLabel}</p>
                          {day.routeLabel ? <p className="text-sm text-[#5a645f]">{day.routeLabel}</p> : null}
                        </div>
                        <div className="space-y-4">
                          <p className="text-sm leading-7 text-[#5a645f]">{day.narrative}</p>
                          <div className="space-y-3">
                            {day.items.map((item) => (
                              <div
                                key={item.id}
                                className="rounded-2xl border border-[#ece6db] bg-[#fbfaf7] px-4 py-4"
                              >
                                <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[#8d836f]">
                                  <span>{item.type}</span>
                                  {item.timeLabel ? <span>{item.timeLabel}</span> : null}
                                </div>
                                <h4 className="mt-2 text-base font-semibold text-[#1d2c30]">{item.title}</h4>
                                {item.summary ? <p className="mt-2 text-sm leading-6 text-[#5a645f]">{item.summary}</p> : null}
                                {item.amountLabel ? <p className="mt-2 text-sm font-medium text-[#17343b]">{item.amountLabel}</p> : null}
                              </div>
                            ))}
                          </div>
                        </div>
                        {day.heroImage ? (
                          <MediaPanel src={day.heroImage.src} alt={day.heroImage.alt} className="h-full min-h-[220px] sm:min-h-[260px]" />
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          case "STAYS":
            return (
              <section
                key={section.id}
                data-section-family={section.family}
                data-layout-variant={section.layoutVariant}
                className="bg-white px-5 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10"
              >
                <p className="text-xs uppercase tracking-[0.22em] text-[#6e6659]">{section.title}</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                  {section.stays.map((stay) => (
                    <article key={stay.id} className="overflow-hidden rounded-3xl border border-[#e2dbcf] bg-[#fbfaf7]">
                      {stay.image ? <MediaPanel src={stay.image.src} alt={stay.image.alt} className="h-44 rounded-none" /> : null}
                      <div className="space-y-2 px-4 py-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[#8d836f]">
                          {stay.starLabel || "Stay"}
                        </p>
                        <h3 className="text-lg font-semibold text-[#1d2c30]">{stay.name}</h3>
                        <p className="text-sm text-[#5a645f]">
                          {[stay.city, stay.country].filter(Boolean).join(", ") || "Destination pending"}
                        </p>
                        <p className="text-sm text-[#5a645f]">{stay.nights} night(s)</p>
                        {stay.mealPlan ? <p className="text-sm text-[#5a645f]">Meal plan: {stay.mealPlan}</p> : null}
                        {stay.roomSummary ? <p className="text-sm text-[#5a645f]">{stay.roomSummary}</p> : null}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          case "GALLERY":
            return (
              <section key={section.id} className="space-y-4 bg-[#17343b] px-5 py-6 text-white sm:px-6 sm:py-8 lg:px-8 xl:px-10">
                <p className="text-xs uppercase tracking-[0.22em] text-white/60">{section.title}</p>
                <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                  {section.items.map((item) => (
                    <article key={item.title} className="overflow-hidden rounded-3xl bg-white/8 backdrop-blur">
                      {item.image ? <MediaPanel src={item.image.src} alt={item.image.alt} className="h-44 rounded-none" /> : null}
                      <div className="space-y-2 px-4 py-4">
                        <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                        <p className="text-sm leading-6 text-white/75">{item.description}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          case "PRICING":
            return (
              <section key={section.id} className="bg-white px-5 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10">
                <p className="text-xs uppercase tracking-[0.22em] text-[#6e6659]">{section.title}</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
                  <div className="rounded-3xl border border-[#e2dbcf] bg-[#fbfaf7] px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#8d836f]">Base Total</p>
                    <p className="mt-2 text-xl font-semibold text-[#1d2c30]">
                      {section.pricing.currencyCode} {section.pricing.baseTotal}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-[#e2dbcf] bg-[#fbfaf7] px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#8d836f]">Tax Total</p>
                    <p className="mt-2 text-xl font-semibold text-[#1d2c30]">
                      {section.pricing.currencyCode} {section.pricing.taxTotal}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-[#e2dbcf] bg-[#fbfaf7] px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#8d836f]">Grand Total</p>
                    <p className="mt-2 text-xl font-semibold text-[#1d2c30]">
                      {section.pricing.currencyCode} {section.pricing.grandTotal}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-[#e2dbcf] bg-[#fbfaf7] px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#8d836f]">Estimated Per Guest</p>
                    <p className="mt-2 text-base font-semibold text-[#1d2c30]">
                      {section.pricing.currencyCode} {section.pricing.estimatedPerGuestLabel || "TBC"}
                    </p>
                  </div>
                </div>
              </section>
            );
          case "TRAVEL_NOTES":
            return (
              <section key={section.id} className="bg-[#f9f7f2] px-5 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10">
                <p className="text-xs uppercase tracking-[0.22em] text-[#6e6659]">{section.title}</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                  {section.blocks.map((block) => (
                    <article key={block.title} className="rounded-3xl border border-[#e2dbcf] bg-white px-4 py-4">
                      <h3 className="text-base font-semibold text-[#1d2c30]">{block.title}</h3>
                      <ul className="mt-3 space-y-2 text-sm leading-6 text-[#5a645f]">
                        {block.items.map((item) => (
                          <li key={item} className="flex gap-2">
                            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#8d836f]" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              </section>
            );
          case "SUPPORT_FOOTER":
            return (
              <footer key={section.id} className="bg-[#132b31] px-5 py-6 text-white sm:px-6 sm:py-8 lg:px-8 xl:px-10">
                <p className="text-xs uppercase tracking-[0.22em] text-white/60">{section.title}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                  {section.lines.map((line) => (
                    <div key={line} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/80">
                      {line}
                    </div>
                  ))}
                </div>
              </footer>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
