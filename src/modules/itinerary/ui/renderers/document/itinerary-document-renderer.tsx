"use client";

import type { ItineraryDocumentPage } from "@/modules/itinerary/shared/itinerary-types";

function MediaFrame({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-2xl bg-muted ${className}`}>
      <div
        role="img"
        aria-label={alt}
        className="h-full w-full bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url("${src}")` }}
      />
    </div>
  );
}

function CoverPage({ page }: { page: Extract<ItineraryDocumentPage, { family: "COVER" }> }) {
  return (
    <section
      data-page-family={page.family}
      data-layout-variant={page.layoutVariant}
      className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm sm:rounded-[28px]"
    >
      <div className="grid gap-0 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6 bg-[linear-gradient(160deg,#f7f4ee_0%,#ffffff_62%,#eef4f7_100%)] px-5 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
              Curated Itinerary Draft
            </p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{page.anchorLabel}</p>
          </div>
          <div className="space-y-3">
            <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-slate-900 lg:text-5xl">
              {page.title}
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-600 lg:text-base">{page.subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {page.meta.map((item) => (
              <span
                key={item}
                className="rounded-full border border-slate-300 bg-white/80 px-3 py-1 text-xs font-medium text-slate-700"
              >
                {item}
              </span>
            ))}
          </div>
          {page.routeLabel ? (
            <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Route</p>
              <p className="mt-1 text-sm font-medium text-slate-800">{page.routeLabel}</p>
            </div>
          ) : null}
        </div>
        <div className="min-h-[220px] bg-slate-100 sm:min-h-[260px]">
          {page.heroImage ? (
            <MediaFrame src={page.heroImage.src} alt={page.heroImage.alt} className="h-full rounded-none" />
          ) : (
            <div className="flex h-full items-end bg-[radial-gradient(circle_at_top,#dbe7ee_0%,#f3f6f8_46%,#eef0ef_100%)] p-5 sm:p-8">
              <div className="rounded-2xl bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Ready for media</p>
                <p className="mt-1 text-sm text-slate-700">
                  Primary hotel, activity, or location media will appear here once available.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function SummaryPage({
  page,
}: {
  page: Extract<ItineraryDocumentPage, { family: "TRIP_SUMMARY" }>;
}) {
  return (
    <section
      data-page-family={page.family}
      data-layout-variant={page.layoutVariant}
      className="rounded-[24px] border border-slate-200 bg-white px-5 py-6 shadow-sm sm:rounded-[28px] sm:px-6 sm:py-7 lg:px-8 lg:py-8"
    >
      <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{page.title}</p>
          <div className="mt-4 grid gap-3">
            {page.facts.map((fact) => (
              <div key={fact.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{fact.label}</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{fact.value}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Highlights</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {page.highlights.map((highlight) => (
              <article key={highlight.title} className="overflow-hidden rounded-2xl border border-slate-200">
                {highlight.image ? (
                  <MediaFrame src={highlight.image.src} alt={highlight.image.alt} className="h-36 rounded-none" />
                ) : null}
                <div className="space-y-2 px-4 py-4">
                  {highlight.eyebrow ? (
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                      {highlight.eyebrow}
                    </p>
                  ) : null}
                  <h3 className="text-base font-semibold text-slate-900">{highlight.title}</h3>
                  <p className="text-sm leading-6 text-slate-600">{highlight.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function DayPage({ page }: { page: Extract<ItineraryDocumentPage, { family: "DAY_DETAIL" }> }) {
  return (
    <section
      data-page-family={page.family}
      data-layout-variant={page.layoutVariant}
      className="rounded-[24px] border border-slate-200 bg-white px-5 py-6 shadow-sm sm:rounded-[28px] sm:px-6 sm:py-7 lg:px-8 lg:py-8"
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{page.title}</p>
          <h2 className="text-2xl font-semibold text-slate-900">{page.day.title}</h2>
          <p className="text-sm text-slate-600">
            {page.day.dateLabel}
            {page.day.routeLabel ? ` • ${page.day.routeLabel}` : ""}
          </p>
        </div>
        {page.day.heroImage ? (
          <MediaFrame
            src={page.day.heroImage.src}
            alt={page.day.heroImage.alt}
            className="h-40 w-full max-w-md shrink-0 sm:h-48"
          />
        ) : null}
      </div>
      <p className="mt-5 max-w-4xl text-sm leading-7 text-slate-600">{page.day.narrative}</p>
      <div className="mt-6 grid gap-4">
        {page.day.items.map((item) => (
          <article
            key={item.id}
            className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-4 xl:grid-cols-[160px_minmax(0,1fr)_140px]"
          >
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{item.type}</p>
              <p className="text-sm font-medium text-slate-900">{item.timeLabel || "Scheduled"}</p>
              {item.routeLabel ? <p className="text-xs text-slate-500">{item.routeLabel}</p> : null}
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
              {item.summary ? <p className="text-sm leading-6 text-slate-600">{item.summary}</p> : null}
            </div>
            <div className="flex items-start justify-between gap-3 lg:flex-col lg:items-end">
              {item.image ? (
                <MediaFrame src={item.image.src} alt={item.image.alt} className="h-24 w-24 shrink-0" />
              ) : null}
              {item.amountLabel ? (
                <p className="text-sm font-medium text-slate-700">{item.amountLabel}</p>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function MatrixPage({
  title,
  rows,
  columns,
}: {
  title: string;
  rows: Array<Record<string, string | number | null | undefined>>;
  columns: Array<{ key: string; label: string }>;
}) {
  return (
    <section
      data-layout-variant="MATRIX_TABLE"
      className="rounded-[24px] border border-slate-200 bg-white px-5 py-6 shadow-sm sm:rounded-[28px] sm:px-6 sm:py-7 lg:px-8 lg:py-8"
    >
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{title}</p>
      <div className="-mx-5 mt-5 overflow-x-auto sm:mx-0">
        <div className="min-w-[680px] overflow-hidden rounded-2xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-left">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {rows.map((row, index) => (
              <tr key={`${title}-${index}`}>
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 text-sm text-slate-700">
                    {String(row[column.key] ?? "-")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </section>
  );
}

function PricingPage({
  page,
}: {
  page: Extract<ItineraryDocumentPage, { family: "PRICING_SUMMARY" }>;
}) {
  return (
    <section
      data-page-family={page.family}
      data-layout-variant={page.layoutVariant}
      className="rounded-[24px] border border-slate-200 bg-white px-5 py-6 shadow-sm sm:rounded-[28px] sm:px-6 sm:py-7 lg:px-8 lg:py-8"
    >
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{page.title}</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Base Total</p>
          <p className="mt-2 text-xl font-semibold text-slate-900">
            {page.pricing.currencyCode} {page.pricing.baseTotal}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Tax Total</p>
          <p className="mt-2 text-xl font-semibold text-slate-900">
            {page.pricing.currencyCode} {page.pricing.taxTotal}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Grand Total</p>
          <p className="mt-2 text-xl font-semibold text-slate-900">
            {page.pricing.currencyCode} {page.pricing.grandTotal}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Estimated Per Guest</p>
          <p className="mt-2 text-base font-semibold text-slate-900">
            {page.pricing.currencyCode} {page.pricing.estimatedPerGuestLabel || "TBC"}
          </p>
        </div>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
        {page.pricing.totalsByType.map((bucket) => (
          <div key={bucket.type} className="rounded-2xl border border-slate-200 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{bucket.type}</p>
            <div className="mt-3 grid gap-2 text-sm text-slate-700">
              <p>Base: {bucket.base}</p>
              <p>Tax: {bucket.tax}</p>
              <p className="font-medium text-slate-900">Total: {bucket.total}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PolicyPage({
  page,
}: {
  page: Extract<ItineraryDocumentPage, { family: "POLICY_NOTES" }>;
}) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white px-5 py-6 shadow-sm sm:rounded-[28px] sm:px-6 sm:py-7 lg:px-8 lg:py-8">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{page.title}</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
        {page.blocks.map((block) => (
          <article key={block.title} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <h3 className="text-sm font-semibold text-slate-900">{block.title}</h3>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
              {block.items.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ItineraryDocumentRenderer({
  pages,
  showHidden = false,
}: {
  pages: ItineraryDocumentPage[];
  showHidden?: boolean;
}) {
  return (
    <div className="space-y-4 md:space-y-6">
      {(showHidden ? pages : pages.filter((page) => page.state?.isVisible !== false)).map((page) => {
        switch (page.family) {
          case "COVER":
            return <CoverPage key={page.id} page={page} />;
          case "TRIP_SUMMARY":
            return <SummaryPage key={page.id} page={page} />;
          case "ROUTE_OVERVIEW":
            return (
              <section key={page.id} className="rounded-[24px] border border-slate-200 bg-white px-5 py-6 shadow-sm sm:rounded-[28px] sm:px-6 sm:py-7 lg:px-8 lg:py-8">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{page.title}</p>
                <div className="mt-5 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                  <div className="space-y-3">
                    {page.routeStops.map((stop, index) => (
                      <div key={`${page.id}-${stop}-${index}`} className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700">
                          {index + 1}
                        </span>
                        <span className="text-sm font-medium text-slate-900">{stop}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-4">
                    {page.image ? (
                      <MediaFrame src={page.image.src} alt={page.image.alt} className="h-52" />
                    ) : null}
                    <p className="text-sm leading-7 text-slate-600">{page.summary}</p>
                  </div>
                </div>
              </section>
            );
          case "HIGHLIGHTS":
            return (
              <section key={page.id} className="rounded-[24px] border border-slate-200 bg-white px-5 py-6 shadow-sm sm:rounded-[28px] sm:px-6 sm:py-7 lg:px-8 lg:py-8">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{page.title}</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                  {page.items.map((item) => (
                    <article key={item.title} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                      {item.image ? (
                        <MediaFrame src={item.image.src} alt={item.image.alt} className="h-40 rounded-none" />
                      ) : null}
                      <div className="space-y-2 px-4 py-4">
                        {item.eyebrow ? (
                          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{item.eyebrow}</p>
                        ) : null}
                        <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
                        <p className="text-sm leading-6 text-slate-600">{item.description}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          case "DAY_DETAIL":
            return <DayPage key={page.id} page={page} />;
          case "ACCOMMODATION_SUMMARY":
            return (
              <MatrixPage
                key={page.id}
                title={page.title}
                rows={page.stays.map((stay) => ({
                  hotel: stay.name,
                  destination: [stay.city, stay.country].filter(Boolean).join(", "),
                  nights: stay.nights,
                  mealPlan: stay.mealPlan || "-",
                  room: stay.roomSummary || "-",
                }))}
                columns={[
                  { key: "hotel", label: "Hotel" },
                  { key: "destination", label: "Destination" },
                  { key: "nights", label: "Nights" },
                  { key: "mealPlan", label: "Meal Plan" },
                  { key: "room", label: "Room Summary" },
                ]}
              />
            );
          case "TRANSPORT_SUMMARY":
            return (
              <MatrixPage
                key={page.id}
                title={page.title}
                rows={page.transfers.map((transfer) => ({
                  sector: transfer.title,
                  route: [transfer.fromLabel, transfer.toLabel].filter(Boolean).join(" -> "),
                  vehicle: transfer.vehicleLabel || "-",
                  timing: [transfer.startLabel, transfer.endLabel].filter(Boolean).join(" / ") || "-",
                  notes: transfer.notes || "-",
                }))}
                columns={[
                  { key: "sector", label: "Sector" },
                  { key: "route", label: "Route" },
                  { key: "vehicle", label: "Vehicle" },
                  { key: "timing", label: "Timing" },
                  { key: "notes", label: "Notes" },
                ]}
              />
            );
          case "PRICING_SUMMARY":
            return <PricingPage key={page.id} page={page} />;
          case "POLICY_NOTES":
            return <PolicyPage key={page.id} page={page} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
