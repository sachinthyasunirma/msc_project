# Pre-Tour User Manual

## Purpose

The Pre-Tour area is used to build draft tour programs, allocate expected services, and generate sample costing before the booking becomes a confirmed operational tour.

This module is the working bridge between master data and quotation.

It brings together:

- operator and market setup
- tour categories
- locations
- hotels and room rates
- transport routes
- activities
- guides
- technical visit references
- pricing and markup rules

In production, Pre-Tour is where the business turns a travel request into a structured and costed draft program.

## Where To Access

Open:

- `Master Data`
- `Pre-Tours`

There are two working levels:

1. `Pre-Tour Plans` list
2. individual `Pre-Tour Plan Manage` workspace

## Why This Module Matters

Pre-Tour is not only a record-keeping screen.

It is the place where the business answers questions such as:

- what kind of tour is being prepared
- who is the market side and who is the operating side
- what days and services are included
- what transport, hotels, activities, and guides are planned
- what the sample buy and sell costing looks like
- whether the product is ready to be quoted or approved

Without a proper Pre-Tour process:

- quotations become inconsistent
- costing may be incomplete
- sales and operations may work from different assumptions
- version control becomes weak

## Core Business Concept

Pre-Tour is a draft planning and costing workspace.

It is not yet the final live operations record.

In practical business terms:

- `Pre-Tour` = product design + sample costing + quotation preparation
- `Confirmed Tour / Operations` = final execution stage

That means the Pre-Tour user should focus on:

- structuring the program
- choosing likely services
- estimating correct buy and sell costs
- preparing a reviewable quotation-ready plan

## Recommended Workflow

For production-quality use, follow this order:

1. Create the Pre-Tour plan header
2. Confirm market, operator, category, dates, currency, and pax basis
3. Sync or create the day plan structure
4. Add day-level service items
5. Add guide allocation if needed
6. Add plan categories if the tour needs multi-category classification
7. Link relevant technical visits where quality references matter
8. Review supplements and miscellaneous lines
9. Generate costing
10. Review the costing sheet and revise if needed
11. Move the plan to the next business status

## 1. Pre-Tour Plans List

### Business Purpose

The plan list is the entry screen for all draft programs.

It is where users create, search, edit, copy, version, and review pre-tour plans.

### Main Business Data On The Plan

- `Plan Code`
- `Title`
- `Tour Category`
- `Market`
- `Operator`
- `Status`
- `Start Date`
- `End Date`
- `Total Nights`
- `Adults`
- `Children`
- `Infants`
- `Currency`
- `FX Mode`
- `Price Mode`
- `Version`
- `Locked`

### Plan Statuses

The application supports:

- `DRAFT`
- `QUOTED`
- `APPROVED`
- `BOOKED`
- `IN_PROGRESS`
- `COMPLETED`
- `CANCELLED`

### Real-World Meaning Of Status

- `DRAFT`: still being designed or costed
- `QUOTED`: pricing has been prepared and shared commercially
- `APPROVED`: internally or commercially approved
- `BOOKED`: converted into a committed business case
- `IN_PROGRESS`: actual travel execution stage
- `COMPLETED`: travel finished
- `CANCELLED`: dropped or cancelled

### Good Practice

- Keep the plan in `DRAFT` until the structure and costing are reviewed.
- Use clear titles that sales and operations can both understand.
- Use versioning instead of overwriting major commercial revisions.

## 2. Plan Header

### Business Purpose

The plan header defines the commercial identity of the program.

It sets the context for all downstream pricing and planning.

### Key Fields

- `Plan Code`
- `Title`
- `Tour Category`
- `Market`
- `Operator`
- `Start Date`
- `End Date`
- `Total Nights`
- `Adults`
- `Children`
- `Infants`
- `Preferred Language`
- `Room Preference`
- `Meal Preference`
- `Currency`
- `Exchange Rate Mode`
- `Exchange Rate`
- `Price Mode`
- `Pricing Policy`
- `Version`
- `Locked`
- `Notes`

### Market And Operator

This is one of the most important commercial relationships.

- `Market` = the selling side, client-facing or market-facing organization
- `Operator` = the delivery side, local operator or supplier-facing execution organization

The application uses the operator-market relationship so plans stay commercially aligned.

### Tour Category

The main category helps set the product identity.

Examples:

- `Luxury`
- `Adventure`
- `Wildlife`
- `Honeymoon`

The additional category section inside the plan can be used when a tour combines several business classifications.

### Currency And FX

The plan can use:

- `AUTO` exchange rate mode
- `MANUAL` exchange rate mode

This matters when contracting and quotation currency differ.

### Price Mode

- `EXCLUSIVE`
- `INCLUSIVE`

This controls how users interpret the pricing basis when reviewing totals.

## 3. Day Plan Structure

### Business Purpose

The day plan structure turns the tour into a day-by-day framework.

Each day can hold:

- date
- title
- notes
- route movement
- allocated items

### Pre-Tour Days

The day structure stores:

- `Day Number`
- `Date`
- `Title`
- `Notes`
- `Start Location`
- `End Location`

### Real-World Meaning

Examples:

- `Day 1 - Arrival Colombo`
- `Day 2 - Colombo to Sigiriya`
- `Day 3 - Sigiriya and Minneriya`

### Sync Days From Date Range

The application supports generating or syncing days from the selected plan date range.

This is useful because:

- it reduces manual work
- it keeps dates aligned with the plan header
- it creates a clean structure before service allocation starts

## 4. Day Workspace And Item Allocation

### Business Purpose

The managed day workspace is where users allocate the expected services for each day.

This is the core planning area of Pre-Tour.

### Supported Item Types

The application supports:

- `TRANSPORT`
- `ACTIVITY`
- `ACCOMMODATION`
- `GUIDE`
- `CEREMONY`
- `SUPPLEMENT`
- `MISC`

### Common Item Fields

- `Day`
- `Item Type`
- `Service`
- `Title`
- `Description`
- `Start At`
- `End At`
- `Sort Order`
- `Pax`
- `Units`
- `Nights`
- `Location`
- `Rate Id`
- `Base Amount`
- `Tax Amount`
- `Total Amount`
- `Pricing Snapshot`
- `Status`
- `Notes`

### Item Statuses

- `PLANNED`
- `CONFIRMED`
- `CANCELLED`
- `COMPLETED`

## 5. Transport Allocation

### Current Business Approach In This Application

The transport tab in Pre-Tour is intentionally simplified for sample costing.

Current business behavior:

- transport is added as a route-based draft service
- transport charge method is fixed to `Per km`
- pax count is treated as `1 pax` sample costing basis
- route is the most important transport planning input

This matches the current quotation-stage process where Pre-Tour is used as a sample costing workspace, not a dispatch or fleet assignment screen.

### What Users Should Capture

- service day
- from location
- to location
- route note if needed
- pricing basis from the selected route/rate logic

### What Users Should Not Treat It As

Pre-Tour transport is not yet:

- vehicle dispatch
- final fleet assignment
- confirmed operational transport order

## 6. Accommodation Allocation

### Business Purpose

Accommodation allocation is used to place hotels into the day plan and pull room-based pricing logic into the tour draft.

### Real-World Inputs

Users typically care about:

- hotel
- rooming pattern
- nights
- meal basis
- occupancy basis

Because accommodation pricing is often the biggest part of a tour quotation, this section must be checked carefully.

## 7. Activity Allocation

### Business Purpose

Activity allocation adds excursions, entrances, and experiences into the day plan.

Examples:

- jeep safari
- temple visit
- dance show
- boat ride

Activity pricing may behave differently depending on whether it is:

- individual-based
- group-based
- slab-based

## 8. Guide Allocation

### Business Purpose

Guide allocation is maintained separately from ordinary day items because a guide may cover:

- the full tour
- a specific day range

### Key Guide Allocation Fields

- `Coverage Mode`
- `Start Day`
- `End Day`
- `Language`
- `Guide Basis`
- `Pax`
- `Units`
- `Rate Id`
- `Base Amount`
- `Tax Amount`
- `Total Amount`
- `Pricing Snapshot`

### Coverage Modes

- `FULL_TOUR`
- `DAY_RANGE`

### Real-World Use

Examples:

- one chauffeur guide for the full round tour
- one specialist guide only for Kandy and Sigiriya days

## 9. Addons, Supplements, And Miscellaneous

### Business Purpose

Item addons and extra cost lines are used to capture commercial items that do not fit into the main service allocation cleanly.

Examples:

- gala dinner
- peak period supplement
- compulsory supplement
- porterage
- special permit fees

### Addon Types

- `SUPPLEMENT`
- `MISC`

These are important because many quotations fail commercially when users include only the obvious hotel and transport lines but forget compulsory extras.

## 10. Plan Categories

### Business Purpose

The plan can carry more than one category relationship through the `Pre-Tour Categories` section.

This is useful when the program needs richer classification than the main header category alone.

Example:

- main category: `Luxury`
- additional categories: `Honeymoon`, `Culture`

This helps downstream commercial reporting and product positioning.

## 11. Pre-Tour Technical Visits

### Business Purpose

Technical visit references can be linked to a plan or specific day.

This is useful when:

- a hotel was inspected recently
- a restaurant or activity was approved through a field visit
- a vehicle or guide reference should support product quality confidence

This strengthens the connection between planning and supplier quality control.

## 12. Route Map

### Business Purpose

The route map gives a visual understanding of the expected movement path of the pre-tour.

This is useful for:

- validating route logic
- identifying unrealistic movement
- presenting the draft program more clearly

In commercial and operational review meetings, a route map often helps people spot planning mistakes faster than reading only table rows.

## 13. Copy, Versioning, Share, And Bin

### Copy

Use copy when a similar program needs to be reused quickly.

Example:

- converting a previous `7D6N Wildlife` program into a new quotation with small changes

### Versioning

Use new versions when the commercial basis changes materially.

Example:

- version 1 for standard hotels
- version 2 for luxury hotels

### Share

Use sharing when the plan needs to be reviewed outside the immediate creator.

### Bin

Deleted plans move to bin logic rather than being treated as if they never existed.

This is important for audit and recovery.

## 14. Generate Costing

### Business Purpose

`Generate Costing` is the main commercial output action in Pre-Tour.

It recomputes the totals and creates the costing-sheet snapshot for review.

### What It Produces

The costing output includes:

- totals by item type
- overall base, tax, and grand total
- section-level costing breakdown
- accommodation occupancy summary
- pax scenarios

### Costing Sections

The costing sheet structure includes sections such as:

- Transport Direct
- Transport Related
- Subsistence
- Accommodation
- Guide
- Activities Individual
- Activities Group
- Activities Slab
- Misc Individual
- Misc Group
- Misc Slab
- Supplement

### Accommodation Scenario Output

The costing sheet also summarizes:

- single total
- double room total
- triple room total
- half double per pax
- single supplement total
- triple discount per pax

### Pax Scenarios

The costing sheet supports scenario summaries for:

- `1 pax`
- `2 pax`
- `3 pax`

This matches the sample-costing style used by the business reference sheet.

## Real-World Costing Logic

### Buy Side

Buy side comes from expected supplier cost.

Examples:

- contracted hotel buy rate
- transport buy estimate
- guide fee
- activity buy rate

### Sell Side

Sell side comes from commercial markup or selling logic.

Examples:

- adding standard markup
- applying commercial policy by category
- converting costs into quotation currency

### Why The Costing Snapshot Matters

The costing snapshot gives the business a reviewable record of:

- what assumptions were used
- what pricing basis existed at the time
- what totals were generated

This is important because quotations can change over time.

## Example Production Dataset

### Example 1: Plan Header

| Field | Example |
| --- | --- |
| Plan Code | `PT-2026-0042` |
| Title | `7D6N Sri Lanka Wildlife and Culture` |
| Main Category | `Wildlife` |
| Market | `MK-UK-001 - UK Market` |
| Operator | `OP-SL-001 - Sri Lanka DMC` |
| Start Date | `2026-07-10` |
| End Date | `2026-07-16` |
| Total Nights | `6` |
| Adults | `2` |
| Children | `0` |
| Currency | `USD` |
| FX Mode | `AUTO` |
| Price Mode | `EXCLUSIVE` |
| Status | `DRAFT` |

### Example 2: Day Plan

| Day | Date | Title | Start | End |
| --- | --- | --- | --- | --- |
| 1 | `2026-07-10` | Arrival Colombo | Airport | Colombo |
| 2 | `2026-07-11` | Colombo to Sigiriya | Colombo | Sigiriya |
| 3 | `2026-07-12` | Sigiriya and Minneriya | Sigiriya | Sigiriya |
| 4 | `2026-07-13` | Sigiriya to Kandy | Sigiriya | Kandy |
| 5 | `2026-07-14` | Kandy sightseeing | Kandy | Kandy |
| 6 | `2026-07-15` | Kandy to Bentota | Kandy | Bentota |
| 7 | `2026-07-16` | Departure | Bentota | Airport |

### Example 3: Item Allocation

| Day | Item Type | Example |
| --- | --- | --- |
| 1 | `TRANSPORT` | Airport to Colombo |
| 1 | `ACCOMMODATION` | Colombo hotel |
| 2 | `TRANSPORT` | Colombo to Sigiriya |
| 2 | `ACCOMMODATION` | Sigiriya hotel |
| 3 | `ACTIVITY` | Minneriya jeep safari |
| 4 | `TRANSPORT` | Sigiriya to Kandy |
| 5 | `ACTIVITY` | Temple and city tour |
| 6 | `TRANSPORT` | Kandy to Bentota |
| 6 | `ACCOMMODATION` | Bentota beach hotel |

### Example 4: Guide Allocation

| Field | Example |
| --- | --- |
| Coverage Mode | `FULL_TOUR` |
| Language | `English` |
| Guide Basis | `Chauffeur Guide` |
| Amount | `USD 420.00` |

### Example 5: Technical Visit Link

| Day | Linked Visit | Purpose |
| --- | --- | --- |
| 3 | Safari operator visit | supports activity quality confidence |
| 6 | Bentota hotel visit | supports hotel quality reference |

## Real-World Business Scenarios

### Scenario 1: Quick Sample Costing For A Sales Enquiry

The sales team receives a request for a round tour.

What they do:

1. create a Pre-Tour
2. set market, operator, dates, and category
3. sync the day plan
4. add route transport, hotels, activities, and guide
5. generate costing

Outcome:

- a commercial draft can be reviewed quickly

### Scenario 2: Revised Version For Higher Category Hotels

The client asks for a higher-end variant.

What the team should do:

1. copy the plan or create a new version
2. replace hotels and revise relevant activities or supplements
3. regenerate costing

Outcome:

- old version remains auditable
- new version can be priced separately

### Scenario 3: Operational Sanity Check Before Approval

Before moving the plan forward:

- route map is checked
- technical visits are reviewed where needed
- missing supplements are added
- guide allocation is confirmed
- costing is regenerated

Outcome:

- fewer surprises later in confirmed operations

## How This Should Be Used By Different Teams

### Sales Team

Sales should use Pre-Tour to prepare commercially valid draft programs and compare versions quickly.

### Product Team

Product users should use it to design the structure of the tour and ensure master-data selections match the promised product level.

### Contracting Team

Contracting supports the quality of Pre-Tour by maintaining correct hotel, activity, transport, and guide data behind the scenes.

### Operations Team

Operations should review route logic, realism, and supplier readiness before a draft becomes committed.

### Management

Management can use Pre-Tour costing outputs to review consistency, markup quality, and quotation discipline.

## Common Mistakes To Avoid

- creating a plan without confirmed operator and market context
- forgetting to sync or verify day dates
- adding hotel and activity lines but missing transport
- forgetting supplements and misc costs
- overwriting a major commercial change instead of using versioning
- treating Pre-Tour as if it were final confirmed operations
- generating costing before the service structure is complete

## Recommended Governance

- Keep master data clean before relying on Pre-Tour costing.
- Use versioning for major commercial changes.
- Lock plans that should no longer be casually edited.
- Review route, accommodation, and supplements before sharing prices externally.
- Treat generated costing as a controlled output, not just an estimate on screen.

## Quick Training Summary

If a new team member reads only one summary, it should be this:

- `Pre-Tour` is the draft planning and costing workspace
- the header sets the commercial context
- days structure the itinerary
- items allocate the expected services
- guide, categories, and technical visits add business depth
- `Generate Costing` turns the draft into a structured costing output

This module is where master data becomes a usable quotation-ready program.

## Screen References

- [pre-tour-plans-view.tsx](/Users/sachinthyarathnavibushana/Documents/MSC%20Project/msc_project/src/modules/pre-tour/ui/views/pre-tour-plans-view.tsx)
- [pre-tour-plan-manage-view.tsx](/Users/sachinthyarathnavibushana/Documents/MSC%20Project/msc_project/src/modules/pre-tour/ui/views/pre-tour-plan-manage-view.tsx)
- [pre-tour-schemas.ts](/Users/sachinthyarathnavibushana/Documents/MSC%20Project/msc_project/src/modules/pre-tour/shared/pre-tour-schemas.ts)
- [pre-tour-form-config.ts](/Users/sachinthyarathnavibushana/Documents/MSC%20Project/msc_project/src/modules/pre-tour/ui/lib/pre-tour-form-config.ts)
- [costing-sheet.ts](/Users/sachinthyarathnavibushana/Documents/MSC%20Project/msc_project/src/modules/pre-tour/lib/pricing/costing-sheet.ts)
- [pre-tour-costing-sheet-view.tsx](/Users/sachinthyarathnavibushana/Documents/MSC%20Project/msc_project/src/modules/pre-tour/ui/components/pre-tour-costing-sheet-view.tsx)
