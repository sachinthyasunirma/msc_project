# Accommodation Master Data User Manual

## Purpose

The Accommodation master data area is used to maintain all hotel-related reference data needed for quotation, pre-tour costing, contracting, and operational planning.

This module is the source of truth for:

- hotel profiles
- room types
- contracted buying rates
- rate plans and restrictions
- hotel fee rules and cancellation policies
- day-level inventory and availability
- hotel images

## Where To Access

Open:

- `Master Data`
- `Accommodations`

There are two main working levels:

1. `Accommodation Hotels` list
2. individual `Hotel Details` management screen

## Recommended Setup Sequence

For clean production data, use this order:

1. Create the hotel
2. Add room types
3. Create hotel contract
4. Create rate plans under the contract
5. Add occupancy room rates
6. Add restrictions, fee rules, and cancellation policies
7. Maintain inventory / availability
8. Upload hotel images

This sequence prevents incomplete pricing and avoids downstream quoting issues.

## 1. Hotel Master

### Business Purpose

Hotel master stores the core identity of each property. Every other accommodation record is linked to a hotel.

### Main Screen Behavior

The hotel list supports:

- search by hotel name or text search
- filter by city
- filter by country
- filter by active / inactive
- batch upload
- cursor-based paging

### Key Fields

- `Code`: unique hotel code
- `Name`: hotel name
- `Description`: short property summary
- `Address`
- `City`
- `Country`
- `Star Rating`
- `Contact Email`
- `Contact Phone`
- `Is Active`

### User Guidance

- Use a stable code format because this code is referenced by operations and integrations.
- Keep city and country values consistent to avoid reporting duplicates.
- Inactivate a hotel instead of deleting it if it has already been used.

## 2. Room Types

### Business Purpose

Room Types define the sellable / contractable accommodation units under a hotel.

Examples:

- Standard Double
- Deluxe Twin
- Family Room
- Suite

### Key Fields

- `Code`
- `Name`
- `Description`
- `Max Occupancy`
- `Bed Type`
- `Size`
- `Amenities`
- `Total Rooms`
- `Available Rooms`
- `Is Active`

### Business Rules

- Room type must belong to one hotel only.
- Occupancy should reflect the true maximum physical occupancy.
- `Available Rooms` should not exceed `Total Rooms`.

### Best Practice

Create room types before setting rates, because contracted room rates require a room type.

## 3. Room Rates Tab

### Business Purpose

The `Room Rates` tab is a review screen for contracted occupancy pricing.

It shows:

- contract
- rate plan
- room type
- validity period
- occupancy prices such as single, double, triple, extra adult, child with bed, child no bed, infant, and single supplement
- tax mode

### Important Note

This screen is primarily for viewing and filtering contracted rates.

Rate maintenance should be done from the `Contracting` tab, not from the legacy rate grid.

### Typical User Flow

1. Select contract
2. Select rate plan
3. Review occupancy pricing by room type
4. Confirm validity and cancellation linkage

## 4. Contracting

### Business Purpose

The `Contracting` tab is the core commercial setup area for accommodation buying and structured hotel pricing.

This is where the system stores:

- hotel contracts
- rate plans
- occupancy room rates
- restrictions
- fee rules
- cancellation policies
- cancellation policy rules
- inventory day controls

### 4.1 Hotel Contracts

Contracts define the commercial agreement with the hotel or supplier.

Key fields include:

- `Code`
- `Name`
- `Supplier`
- `Contract Ref`
- `Contract Type`
  - `FIT`
  - `GROUP`
  - `SERIES`
  - `CORPORATE`
  - `WHOLESALE`
- `Currency Code`
- `Valid From / Valid To`
- `Booking From / Booking To`
- `Release Days Default`
- `Market Scope`
- `Guest Nationality Scope`
- `Remarks`
- `Status`
- `Is Active`

### Contract Business Meaning

- `Valid From / Valid To`: stay validity of the contract
- `Booking From / Booking To`: booking window when the contract can be sold / used
- `Release Days Default`: default deadline to release unsold rooms back to the hotel
- `Market Scope`: controls whether the contract applies to all markets or specific markets

### 4.2 Rate Plans

Rate plans define the commercial sell/buy conditions under a contract.

Examples:

- BB contracted buy
- HB wholesale buy
- refundable plan
- non-refundable promotion

Key fields include:

- `Code`
- `Name`
- `Rate Type`
  - `CONTRACTED_BUY`
  - `SELL_STATIC`
  - `SELL_DERIVED`
- `Board Basis`
  - `RO`
  - `BB`
  - `HB`
  - `FB`
  - `AI`
- `Pricing Model`
  - `PER_ROOM_PER_NIGHT`
  - `PER_PERSON_PER_NIGHT`
- linked `Cancellation Policy`
- `Validity`
- `Booking Window`
- `Release Days Override`
- `Market Code`
- `Guest Nationality Scope`
- `Refundable`
- `Commissionable`
- `Package Only`
- `Priority`
- `Status`

### 4.3 Occupancy Room Rates

This is the most important costing setup in accommodation.

Each room rate record stores occupancy-based contracted buying values for a room type under a rate plan.

Typical fields:

- `Room Type`
- `Validity`
- `Base Occupancy Adults`
- `Base Occupancy Children`
- `Max Adults`
- `Max Children`
- `Max Occupancy`
- `Single Use Rate`
- `Double Rate`
- `Triple Rate`
- `Quad Rate`
- `Extra Adult Rate`
- `Child With Bed Rate`
- `Child No Bed Rate`
- `Infant Rate`
- `Single Supplement Rate`
- `Currency`
- `Tax Mode`

### Pricing Meaning

- `Double Rate` is usually the main contracted rate for 2 adults
- `Single Supplement` is used when one guest occupies a double-oriented room alone
- `Extra Adult Rate` is used when occupancy exceeds the base contracted occupancy
- child rates are split by with-bed / no-bed logic for more accurate costing

### 4.4 Restrictions

Restrictions control how and when a rate plan can be sold.

Examples:

- minimum stay
- maximum stay
- closed to arrival
- closed to departure
- stop sell
- release override

Use restrictions carefully because they directly affect quoting and booking eligibility.

### 4.5 Fee Rules

Fee rules store extra charges linked to a rate plan or room type.

Examples:

- tax
- levy
- service charge
- gala dinner
- resort fee
- city tax
- supplement

Important dimensions:

- fee type
- guest type
- charge basis
- amount type
- tax mode
- valid stay / booking dates
- market scope

### 4.6 Cancellation Policies

Cancellation policies define the commercial cancellation framework for a rate plan.

Each policy can have:

- general policy name
- description
- no-show policy
- after check-in policy
- active / default flags

### 4.7 Cancellation Policy Rules

Rules define the actual penalty windows inside a cancellation policy.

Examples:

- 30 to 15 days before arrival: 25%
- 14 to 7 days before arrival: 50%
- 6 to 0 days before arrival: first night
- no-show: full stay

### 4.8 Inventory Day Controls

Inventory day records allow detailed operational control by room type and date.

Typical fields:

- date
- physical inventory
- contracted allotment
- sold rooms
- blocked rooms
- free sale
- stop sell
- release override
- closed flag

This is important when the hotel contract is allotment-based rather than purely free-sale.

## 5. Availability

### Business Purpose

The `Availability` tab is for date-level room availability maintenance at hotel level.

It stores:

- date
- room type
- available rooms
- booked rooms
- blocked flag
- block reason

### When To Use

Use this area when operations or contracting teams need a simplified availability view without opening full contract inventory structures.

### Good Practice

- Maintain availability only after room types exist.
- Use block reason whenever rooms are blocked for maintenance, group holds, or overbooking protection.

## 6. Images

### Business Purpose

The `Images` tab stores hotel media for sales and operational reference.

Use it for:

- cover image
- room images
- restaurant images
- public area images
- gallery ordering

### Good Practice

- mark one image as the primary image
- keep captions meaningful
- avoid duplicate or low-quality uploads

## Common Business Rules

- A hotel must exist before any room type, availability, or contract record can be created.
- A room type should exist before room rates or inventory-day entries are created.
- A contract should exist before rate plans are created.
- A rate plan should exist before occupancy room rates, restrictions, and fee rules are created.
- Date ranges must be logical. `From` dates cannot be after `To` dates.
- Occupancy values should never exceed physical room capacity.

## How Accommodation Rates Work In The Real World

This section is important for training. A user should understand that hotel pricing is not usually one flat amount.

In real hotel contracting, rates are commonly affected by:

- room type
- board basis
- season or validity period
- occupancy
- child policy
- extra adult supplements
- cancellation conditions
- mandatory fees and taxes
- market restrictions
- booking window

### Typical Real-World Example

A hotel may say:

- Standard Double on `BB` basis costs `USD 120` for 2 adults
- if only 1 adult stays in that room, charge `USD 95`
- if 3 adults stay, charge `USD 120 + USD 35 extra adult`
- child with bed costs `USD 30`
- child without bed costs `USD 15`
- infant is free
- city tax is `USD 5` per room per night
- gala dinner on `24-Dec` is mandatory at `USD 40` per adult

That means the final accommodation cost is not only the room rate. It is:

`base room rate + occupancy supplements + child charges + mandatory fee rules + applicable tax rules`

### How This Application Represents That

The application breaks that hotel pricing into structured master data:

- `Hotel`
  - who the property is
- `Room Type`
  - what kind of room is being sold
- `Contract`
  - which supplier agreement is active
- `Rate Plan`
  - which board basis / selling conditions apply
- `Occupancy Room Rate`
  - the contracted buy values for single, double, triple, extra adult, child, infant
- `Fee Rule`
  - taxes, city tax, gala dinner, supplements
- `Cancellation Policy`
  - penalty rules if canceled
- `Restriction`
  - stop sell, min stay, release rules
- `Inventory / Availability`
  - whether rooms can actually be sold on specific dates

### Why This Matters For Costing

If accommodation master data is wrong, every downstream process becomes wrong:

- pre-tour sample costing
- tour costing per pax
- supplier buy calculations
- markups and sell price calculations
- reservation confirmation checks

So accommodation master data is not just reference data. It is a pricing engine input.

## How Rates Should Be Entered In This Application

### Step 1: Create The Hotel

This is the property record only. Do not put pricing logic here.

### Step 2: Create Room Types

Create physical room categories first, for example:

- `STD-DBL` Standard Double
- `DLX-TWN` Deluxe Twin
- `FAM-TRP` Family Triple

### Step 3: Create The Contract

This defines the supplier agreement period and commercial scope.

Example:

- Contract code: `CNT-2026-001`
- Currency: `USD`
- Valid from: `2026-01-01`
- Valid to: `2026-12-31`

### Step 4: Create Rate Plans

Separate plans by board basis or commercial condition.

Examples:

- `BB-FIT-2026`
- `HB-FIT-2026`
- `NONREF-BB-2026`

Do not mix unrelated business logic into one rate plan.

### Step 5: Add Occupancy Room Rates

This is where the main contracted buy values are entered.

For one room type and one rate plan, you normally enter:

- single use rate
- double rate
- triple rate if allowed
- extra adult rate
- child with bed
- child without bed
- infant
- single supplement if used by the hotel

### Step 6: Add Fee Rules

Use fee rules for:

- city tax
- service charge
- resort fee
- gala dinner
- supplements

Do not hide these inside the room rate unless the hotel contract is explicitly inclusive.

### Step 7: Add Restrictions And Policy

Restrictions decide whether a rate can be sold.

Cancellation rules decide what happens if canceled.

### Step 8: Maintain Availability / Inventory

If rooms cannot be sold on a date, pricing alone is not enough. Inventory must also be correct.

## Example Data Set

Below is a realistic example dataset that can be used for training.

### A. Hotel Master Example

| Field | Example Value |
| --- | --- |
| Code | `H-KAN-001` |
| Name | `Kandy Lake Retreat` |
| Description | `4-star leisure hotel near Kandy Lake` |
| Address | `25 Lake Road` |
| City | `Kandy` |
| Country | `Sri Lanka` |
| Star Rating | `4` |
| Contact Email | `reservations@kandylakeretreat.com` |
| Contact Phone | `+94 81 555 1000` |
| Is Active | `Yes` |

### B. Room Types Example

| Code | Name | Max Occupancy | Bed Type | Total Rooms | Available Rooms |
| --- | --- | ---: | --- | ---: | ---: |
| `STD-DBL` | Standard Double | `2` | `1 Double Bed` | `20` | `20` |
| `DLX-TWN` | Deluxe Twin | `2` | `2 Single Beds` | `15` | `15` |
| `FAM-TRP` | Family Triple | `3` | `1 Double + 1 Single` | `8` | `8` |

### C. Contract Example

| Field | Example Value |
| --- | --- |
| Code | `CNT-KLR-2026` |
| Name | `Kandy Lake Retreat FIT Contract 2026` |
| Supplier | `Kandy Lake Retreat Pvt Ltd` |
| Contract Type | `FIT` |
| Currency | `USD` |
| Valid From | `2026-01-01` |
| Valid To | `2026-12-31` |
| Booking From | `2025-11-01` |
| Booking To | `2026-12-31` |
| Release Days Default | `7` |
| Market Scope | `ALL_MARKETS` |
| Status | `ACTIVE` |

### D. Rate Plan Example

| Field | Example Value |
| --- | --- |
| Code | `BB-FIT-2026` |
| Name | `Bed and Breakfast FIT` |
| Rate Type | `CONTRACTED_BUY` |
| Board Basis | `BB` |
| Pricing Model | `PER_ROOM_PER_NIGHT` |
| Refundable | `Yes` |
| Commissionable | `No` |
| Package Only | `No` |
| Status | `ACTIVE` |

### E. Occupancy Room Rate Example

For `STD-DBL` under `BB-FIT-2026`:

| Field | Example Value |
| --- | --- |
| Base Occupancy Adults | `2` |
| Base Occupancy Children | `0` |
| Max Adults | `2` |
| Max Children | `1` |
| Max Occupancy | `3` |
| Single Use Rate | `95.00` |
| Double Rate | `120.00` |
| Triple Rate | `150.00` |
| Extra Adult Rate | `35.00` |
| Child With Bed Rate | `30.00` |
| Child No Bed Rate | `15.00` |
| Infant Rate | `0.00` |
| Single Supplement Rate | `25.00` |
| Currency | `USD` |
| Tax Mode | `EXCLUSIVE` |

### F. Fee Rule Example

| Fee Rule | Guest Type | Charge Basis | Amount Type | Amount | Currency |
| --- | --- | --- | --- | ---: | --- |
| City Tax | `ROOM` | `PER_ROOM_PER_NIGHT` | `FIXED` | `5.00` | `USD` |
| Gala Dinner 24-Dec | `ADULT` | `PER_PAX_PER_NIGHT` | `FIXED` | `40.00` | `USD` |
| Gala Dinner 24-Dec | `CHILD_WITH_BED` | `PER_PAX_PER_NIGHT` | `FIXED` | `20.00` | `USD` |

### G. Cancellation Policy Example

Policy name: `Standard FIT Refundable`

Rules:

| Window | Penalty Type | Penalty Value | Basis |
| --- | --- | ---: | --- |
| `30 to 15 days before` | `PERCENT` | `25` | `TOTAL_STAY` |
| `14 to 7 days before` | `PERCENT` | `50` | `TOTAL_STAY` |
| `6 to 0 days before` | `NIGHT` | `1` | `FIRST_NIGHT` |
| `No Show` | `FULL_STAY` | `100` | `TOTAL_STAY` |

### H. Availability Example

| Date | Room Type | Available | Booked | Blocked | Block Reason |
| --- | --- | ---: | ---: | --- | --- |
| `2026-07-10` | `STD-DBL` | `12` | `8` | `No` | `-` |
| `2026-07-10` | `DLX-TWN` | `10` | `5` | `No` | `-` |
| `2026-12-24` | `STD-DBL` | `0` | `18` | `Yes` | `Christmas peak hold` |

## Worked Costing Examples

These examples show how a user should think when entering data.

### Example 1: 2 Adults, 1 Night, Standard Double, BB

Use:

- Double Rate = `USD 120`
- City Tax = `USD 5 per room per night`

Calculation:

- Room rate: `USD 120`
- City tax: `USD 5`
- Total buy cost: `USD 125`

### Example 2: 1 Adult, 1 Night, Standard Double, BB

Use:

- Single Use Rate = `USD 95`
- City Tax = `USD 5`

Calculation:

- Room rate: `USD 95`
- City tax: `USD 5`
- Total buy cost: `USD 100`

### Example 3: 3 Adults, 1 Night, Standard Double, BB

Depending on the hotel contract, this may be priced by:

- `Triple Rate`, or
- `Double Rate + Extra Adult Rate`

If `Triple Rate` is maintained:

- Triple rate: `USD 150`
- City tax: `USD 5`
- Total buy cost: `USD 155`

If only `Double Rate + Extra Adult Rate` is used:

- Double rate: `USD 120`
- Extra adult: `USD 35`
- City tax: `USD 5`
- Total buy cost: `USD 160`

Your contracting team must follow the actual hotel agreement and keep one consistent method.

### Example 4: 2 Adults + 1 Child No Bed, 1 Night

Use:

- Double Rate = `USD 120`
- Child No Bed = `USD 15`
- City Tax = `USD 5`

Calculation:

- Room rate: `USD 120`
- Child no bed: `USD 15`
- City tax: `USD 5`
- Total buy cost: `USD 140`

### Example 5: Christmas Night With Gala Dinner

Stay date: `2026-12-24`

Use:

- Double Rate = `USD 120`
- City Tax = `USD 5`
- Gala Dinner Adult x 2 = `USD 40 x 2 = USD 80`

Calculation:

- Room rate: `USD 120`
- City tax: `USD 5`
- Gala dinner: `USD 80`
- Total buy cost: `USD 205`

This is why fee rules are critical. If gala dinner is not entered, costing will be wrong.

## How Users Should Decide Which Rate Field To Use

### Single Use Rate

Use when one guest stays alone in a room that is normally sold as a double-type room.

### Double Rate

Use as the standard contracted rate for two adults, unless the hotel contract says otherwise.

### Triple Rate

Use only when the hotel provides a specific triple occupancy rate.

### Extra Adult Rate

Use when occupancy exceeds the base included occupancy and the hotel charges a supplement per extra adult.

### Child With Bed

Use when the child is given a bed and meal / occupancy treatment according to hotel policy.

### Child No Bed

Use when the child shares existing bedding and usually pays a lower supplement.

### Infant Rate

Usually free, but maintain it explicitly if the hotel contract charges infants.

### Single Supplement

Use when the hotel defines the single occupancy difference as a supplement on top of a base double-oriented rate structure.

In practice, your team should decide whether they use:

- `Single Use Rate`
- or `Double Rate + Single Supplement`

Do not use both methods for the same room / plan unless the hotel contract explicitly requires that.

## Real-World Accommodation Scenarios This Application Supports

The current accommodation structure is designed to support:

- FIT contracts
- group contracts
- seasonal validity
- occupancy-based buying
- per-room and per-person pricing models
- children with bed / no bed logic
- fee-rule driven taxes and supplements
- cancellation rules by date window
- restrictions such as stop-sell and minimum stay
- inventory / allotment style controls

For most destination management company workflows, this is the correct production structure for hotel master data.

## Recommended Operational Ownership

- `Hotel Master`: master data / product team
- `Room Types`: product team with hotel contracting confirmation
- `Contracting`: contracting / commercial team
- `Occupancy Rates`: contracting / pricing team
- `Restrictions and Fee Rules`: contracting / revenue team
- `Availability / Inventory`: operations / reservations team
- `Images`: product / sales support team

## Common Mistakes To Avoid

- creating room rates before room types are finalized
- mixing different board bases inside one wrong rate plan
- keeping expired contracts active
- entering child rates without confirming with-bed / no-bed rules
- forgetting release days for allotment contracts
- using different city or country spellings for the same destination

## Quick Training Summary

If a new user needs the shortest explanation, teach them this:

1. `Hotels` are the property master
2. `Room Types` define what can be sold
3. `Contracting` defines what was commercially agreed with the supplier
4. `Room Rates` show occupancy pricing from contracting
5. `Availability` controls date-based room stock
6. `Images` support sales presentation and product quality

## Screen References

Main accommodation entry:

- [accommodation-management-view.tsx](/Users/sachinthyarathnavibushana/Documents/MSC%20Project/msc_project/src/modules/accommodation/ui/views/accommodation-management-view.tsx)

Hotel detail tabs:

- [accommodation-hotel-detail-card.tsx](/Users/sachinthyarathnavibushana/Documents/MSC%20Project/msc_project/src/modules/accommodation/ui/components/accommodation-hotel-detail-card.tsx)

Core schemas:

- [accommodation-schemas.ts](/Users/sachinthyarathnavibushana/Documents/MSC%20Project/msc_project/src/modules/accommodation/shared/accommodation-schemas.ts)
- [accommodation-contracting-schemas.ts](/Users/sachinthyarathnavibushana/Documents/MSC%20Project/msc_project/src/modules/accommodation/shared/accommodation-contracting-schemas.ts)
