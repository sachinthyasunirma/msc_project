# Activity Master Data User Manual

## Purpose

The Activity master data area is used to maintain all activity-related reference and pricing data required for:

- itinerary design
- pre-tour costing
- activity quoting
- operational planning
- supplement sales
- activity media management

This module is the source of truth for:

- activity master records
- activity availability rules
- activity pricing
- activity supplements
- activity media

## Where To Access

Open:

- `Master Data`
- `Activities`

There are two working levels:

1. `Activities` master list
2. activity manage view for a selected activity

### Main List Level

At list level, users maintain:

- `Activities`

### Activity Manage Level

Inside a selected activity, users maintain:

- `Rates`
- `Availability`
- `Supplements`
- `Images`

## Recommended Setup Sequence

For clean production data, use this order:

1. Create the activity
2. Confirm activity location
3. Define base pax / age rules
4. Add activity rates
5. Add availability windows
6. Link supplements if needed
7. Upload images

This keeps the commercial structure complete before the activity is used in costing or sales.

## 1. Activities

### Business Purpose

Activity records are the primary commercial and operational definitions for things the customer can do or buy as part of a tour.

Examples:

- temple visit
- jeep safari
- village experience
- train journey
- boat ride
- special dinner
- ticket-only supplement

### Activity Types

The application supports:

- `ACTIVITY`
- `SUPPLEMENT`
- `MISCELLANEOUS`
- `OTHER`

### Key Fields

- `Code`
- `Type`
- `Location`
- `Location Role`
- `Name`
- `Short Description`
- `Description`
- `Duration Min`
- `Min Pax`
- `Max Pax`
- `Min Age`
- `Max Age`
- `Inclusions`
- `Exclusions`
- `Notes`
- `Is Active`

### Business Meaning

- `Location` tells the system where the activity belongs commercially
- `Duration Min` supports planning and itinerary sequencing
- `Min Pax` and `Max Pax` help sales and operations understand feasibility
- `Inclusions` and `Exclusions` help quotation accuracy
- `Type` distinguishes main activities from add-ons and miscellaneous items

### Good Practice

- Keep activity names commercial and clear
- Use a stable activity code format such as `ACT-KDY-001`
- Do not create duplicate activities for the same commercial service without a real business reason

## 2. Activity Availability

### Business Purpose

Availability records define when an activity can operate.

### Key Fields

- `Activity`
- `Effective From`
- `Effective To`
- `Weekdays`
- `Start Time`
- `End Time`
- `Is Active`
- `Notes`

### Real-World Meaning

Availability is often limited by:

- opening days
- operating hours
- seasonal windows
- supplier schedules
- weather periods

### Example

A cultural dance show may operate:

- every Monday, Wednesday, Friday
- from `17:30` to `19:00`
- only between `2026-01-01` and `2026-10-31`

### Why This Matters

Without availability rules:

- users may quote non-operating services
- schedules become unrealistic
- customers can be promised impossible timings

## 3. Activity Rates

### Business Purpose

Activity rates store the commercial pricing model for the activity.

### Key Fields

- `Activity`
- `Code`
- `Label`
- `Currency`
- `Pricing Model`
- `Fixed Rate`
- `Per Pax Rate`
- `Per Hour Rate`
- `Per Unit Rate`
- `Pax Tiers`
- `Min Charge`
- `Effective From`
- `Effective To`
- `Is Active`
- `Notes`

### Pricing Models

- `FIXED`
- `PER_PAX`
- `TIERED_PAX`
- `PER_HOUR`
- `PER_UNIT`

### Real-World Meaning

Activities are priced in different ways depending on supplier contracts:

- one total price per booking
- one price per guest
- different rates by pax range
- hourly hire
- one price per ticket / seat / item

### How This Application Represents It

- `FIXED` for one total activity price
- `PER_PAX` for guest-based pricing
- `TIERED_PAX` for group-band pricing
- `PER_HOUR` for time-based services
- `PER_UNIT` for ticket/unit-based selling

This is a strong production structure because it matches common supplier pricing models.

## 4. Activity Supplements

### Business Purpose

Supplements define optional or required add-on activities linked to a parent activity.

Examples:

- safari activity with camera fee supplement
- dinner experience with mandatory gala supplement
- hiking activity with optional picnic add-on
- train ride with seat-upgrade supplement

### Key Fields

- `Parent Activity`
- `Supplement Activity`
- `Is Required`
- `Min Qty`
- `Max Qty`
- `Sort Order`
- `Is Active`

### Business Meaning

Supplements allow the business to model:

- optional upsells
- required add-ons
- quantity-controlled extras

### Why This Matters

Without supplements, users often mix optional extras into the base activity price, which reduces pricing transparency.

## 5. Images

### Business Purpose

Images store sales and presentation media for the activity.

Use them for:

- cover image
- attraction visuals
- experience photos
- activity gallery

### Good Practice

- choose one strong cover image
- use clear alt text
- avoid outdated photos that no longer represent the real product

## How Activity Pricing Works In The Real World

Activity pricing is usually negotiated based on the operational nature of the experience.

In real operations, activity cost can depend on:

- number of guests
- operating time
- ticket count
- group size
- season
- local supplier rules
- mandatory add-ons
- child / adult differences

### Common Real-World Pricing Styles

1. fixed booking amount
2. per guest amount
3. tiered pax amount
4. hourly amount
5. per unit or per ticket amount

### How This Application Supports That

The activity module stores the base commercial logic in `Activity Rates` and handles extras through `Activity Supplements`.

This means the business can separate:

- the core activity price
- optional add-ons
- required extra charges
- operational availability

That is the right structure for production pricing and itinerary planning.

## How Users Should Decide Which Pricing Model To Use

### `FIXED`

Use when one booking has one price regardless of pax.

Example:

- private village cooking demo = `USD 60 per booking`

### `PER_PAX`

Use when the supplier charges per guest.

Example:

- museum entry = `USD 12 per pax`

### `TIERED_PAX`

Use when the supplier price changes by group size.

Example:

- boat excursion
  - 1-4 pax = `USD 80`
  - 5-8 pax = `USD 120`

### `PER_HOUR`

Use when the service is time-based.

Example:

- private equipment hire with instructor = `USD 25 per hour`

### `PER_UNIT`

Use when the service is priced by ticket, seat, or item quantity.

Example:

- train ticket = `USD 18 per seat`

## Example Data Set

Below is a realistic sample training dataset.

### A. Activity Example

| Field | Example Value |
| --- | --- |
| Code | `ACT-KDY-001` |
| Type | `ACTIVITY` |
| Location | `Kandy City` |
| Location Role | `ACTIVITY_LOCATION` |
| Name | `Kandy Cultural Dance Show` |
| Short Description | `Evening cultural performance in Kandy` |
| Duration Min | `90` |
| Min Pax | `1` |
| Max Pax | `40` |
| Min Age | `0` |
| Max Age | `-` |
| Inclusions | `["show entry"]` |
| Exclusions | `["transfers","dinner"]` |
| Is Active | `Yes` |

### B. Availability Example

| Field | Example Value |
| --- | --- |
| Code | `AVA-KDY-001` |
| Activity | `ACT-KDY-001` |
| Effective From | `2026-01-01 00:00` |
| Effective To | `2026-12-31 23:59` |
| Weekdays | `[1,2,3,4,5,6]` |
| Start Time | `17:30` |
| End Time | `19:00` |
| Is Active | `Yes` |

### C. Fixed Rate Example

| Field | Example Value |
| --- | --- |
| Code | `AR-KDY-DANCE-PRIVATE` |
| Activity | `ACT-KDY-001` |
| Label | `Private Group Entry` |
| Currency | `USD` |
| Pricing Model | `FIXED` |
| Fixed Rate | `75.00` |
| Min Charge | `75.00` |
| Effective From | `2026-01-01 00:00` |

### D. Per Pax Rate Example

| Field | Example Value |
| --- | --- |
| Code | `AR-KDY-DANCE-PAX` |
| Activity | `ACT-KDY-001` |
| Label | `Seat Rate` |
| Currency | `USD` |
| Pricing Model | `PER_PAX` |
| Per Pax Rate | `8.00` |
| Min Charge | `8.00` |

### E. Tiered Pax Example

| Field | Example Value |
| --- | --- |
| Code | `AR-SAFARI-TIER` |
| Activity | `Yala Jeep Safari` |
| Label | `Shared Safari Group Rate` |
| Currency | `USD` |
| Pricing Model | `TIERED_PAX` |
| Pax Tiers | `1-2 = 70`, `3-4 = 110`, `5-6 = 150` |
| Min Charge | `70.00` |

### F. Per Hour Example

| Field | Example Value |
| --- | --- |
| Code | `AR-CYCLE-HR` |
| Activity | `Village Cycling Tour` |
| Currency | `USD` |
| Pricing Model | `PER_HOUR` |
| Per Hour Rate | `20.00` |
| Min Charge | `40.00` |

### G. Per Unit Example

| Field | Example Value |
| --- | --- |
| Code | `AR-TRAIN-SEAT` |
| Activity | `Scenic Train Ticket` |
| Currency | `USD` |
| Pricing Model | `PER_UNIT` |
| Per Unit Rate | `18.00` |
| Min Charge | `18.00` |

### H. Supplement Example

Parent activity:

- `ACT-SAFARI-001` Yala Jeep Safari

Supplement activity:

- `SUP-CAM-001` Camera Fee

Supplement link:

| Field | Example Value |
| --- | --- |
| Code | `AS-SAFARI-CAMERA` |
| Parent Activity | `ACT-SAFARI-001` |
| Supplement Activity | `SUP-CAM-001` |
| Is Required | `No` |
| Min Qty | `0` |
| Max Qty | `5` |
| Sort Order | `1` |

## Worked Pricing Examples

### Example 1: Fixed Activity Price

Activity:

- private dance show booking
- fixed rate = `USD 75`

Calculation:

- total activity cost = `USD 75`

### Example 2: Per Pax Activity

Activity:

- seat-based cultural show
- per pax = `USD 8`
- pax = `6`

Calculation:

- `6 x 8 = USD 48`

### Example 3: Tiered Pax Activity

Activity:

- shared safari
- pax tiers:
  - 1-2 = `USD 70`
  - 3-4 = `USD 110`
  - 5-6 = `USD 150`

Pax:

- `4`

Calculation:

- falls into 3-4 tier
- total = `USD 110`

### Example 4: Per Hour Activity

Activity:

- cycling tour
- `USD 20 per hour`
- minimum charge = `USD 40`
- duration = `3 hours`

Calculation:

- `3 x 20 = USD 60`
- compare with min charge `USD 40`
- total = `USD 60`

### Example 5: Per Unit Activity

Activity:

- train tickets
- `USD 18 per seat`
- seats = `5`

Calculation:

- `5 x 18 = USD 90`

### Example 6: Activity With Supplement

Parent activity:

- Yala Jeep Safari = `USD 110`

Optional supplement:

- camera fee = `USD 15 per unit`
- quantity = `2`

Calculation:

- base activity = `USD 110`
- supplement = `2 x 15 = USD 30`
- total = `USD 140`

This is why supplements should not be mixed into the base activity rate.

## Real-World Scenarios This Application Supports

The activity structure is designed to support:

- sightseeing activities
- ticketed entries
- experience products
- optional extras
- private and shared activities
- time-based services
- group-tier pricing
- supplement-driven upsells
- schedule-limited activities

For a destination management company, this is a strong production activity master-data model.

## Common Business Rules

- An activity must exist before availability, rates, supplements, or images are maintained.
- Location should reflect the true commercial or operational activity point.
- Effective dates should be controlled carefully for active rate lines.
- Use supplements for optional or required extras instead of inflating the base activity rate.
- Availability should reflect real operating schedule, not only sales assumptions.

## Common Mistakes To Avoid

- creating duplicate activities for the same service
- mixing optional extras into the base activity price
- using `PER_PAX` when the supplier actually charges fixed group rates
- forgetting min charge for hourly activities
- not maintaining activity schedule windows
- using unclear supplement links
- leaving inactive historical price lines active

## Quick Training Summary

If a new user needs the shortest explanation, teach them this:

1. `Activities` define what the customer can do or buy
2. `Availability` defines when it operates
3. `Rates` define how it is priced
4. `Supplements` define optional or required add-ons
5. `Images` support presentation and sales quality

## Screen References

Main activity screen:

- [activity-management-section.tsx](/Users/sachinthyarathnavibushana/Documents/MSC%20Project/msc_project/src/modules/activity/ui/components/activity-management-section.tsx)

Activity management behavior:

- [use-activity-management.ts](/Users/sachinthyarathnavibushana/Documents/MSC%20Project/msc_project/src/modules/activity/lib/use-activity-management.ts)

Activity definitions:

- [activity-management-constants.ts](/Users/sachinthyarathnavibushana/Documents/MSC%20Project/msc_project/src/modules/activity/shared/activity-management-constants.ts)

Core schemas:

- [activity-schemas.ts](/Users/sachinthyarathnavibushana/Documents/MSC%20Project/msc_project/src/modules/activity/shared/activity-schemas.ts)
