# Guides Master Data User Manual

## Purpose

The Guides master data area is used to maintain all guide-related reference and commercial data required for:

- guide profile management
- language capability tracking
- coverage area control
- license and certification compliance
- guide document reference
- availability planning
- blackout control
- guide costing and rate setup
- guide assignment tracking

This module is the source of truth for:

- guide profiles
- language master
- guide-language mapping
- guide coverage locations
- guide licenses
- guide certifications
- guide documents
- weekly availability
- blackout dates
- guide rates
- guide assignments

## Where To Access

Open:

- `Master Data`
- `Guides`

There are two working levels:

1. `Guides` main screen
2. `Manage Guide` detail workspace for one selected guide

### Main Screen Tabs

On the main guides screen, users can maintain:

- `Guides`
- `Languages`

### Manage Guide Tabs

Inside a selected guide’s manage screen, users can maintain:

- `Guide Languages`
- `Coverage Areas`
- `Licenses`
- `Certifications`
- `Documents`
- `Weekly Availability`
- `Blackout Dates`
- `Guide Rates`
- `Assignments`

## Recommended Setup Sequence

For clean production data, use this order:

1. Create languages
2. Create guide profile
3. Map guide languages
4. Add coverage areas
5. Add licenses
6. Add certifications
7. Add documents
8. Configure weekly availability
9. Add blackout dates
10. Define guide rates
11. Use assignments only when operational bookings exist

This keeps guide master data complete before the guide is used in costing or operations.

## 1. Guides

### Business Purpose

Guide records store the main professional identity of a guide or guide provider.

### Guide Types

The application supports:

- `INDIVIDUAL`
- `COMPANY`
- `INTERNAL`

### Key Fields

- `Code`
- `Guide Type`
- `Full Name`
- `Display Name`
- `Gender`
- `DOB`
- `Phone`
- `Email`
- `Address`
- `Country`
- `City`
- `Emergency Contact`
- `Bio`
- `Years Experience`
- `Rating`
- `Base Currency`
- `Is Active`

### Business Meaning

- `Full Name` is the official / legal or operational identity
- `Display Name` is the shorter saleable or public-facing name
- `Base Currency` is useful when guide rates are maintained commercially
- `Rating` is operational / commercial reference, not a legal credential

### Best Practice

- Use a stable code such as `G-0012`
- Store emergency contact properly for operational safety
- Keep phone and email current because guide communication failures directly affect tours

## 2. Languages

### Business Purpose

Languages are maintained as a master list so the same language values are reused consistently.

Examples:

- English
- German
- French
- Spanish
- Japanese

### Key Fields

- `Code`
- `Name`
- `Is Active`

### Best Practice

- maintain one clean version of each language
- avoid duplicates such as `English`, `ENGLISH`, `Eng`

## 3. Guide Languages

### Business Purpose

Guide Languages map a guide to one or more languages with proficiency.

### Key Fields

- `Guide`
- `Language`
- `Proficiency`

### Proficiency Levels

- `BASIC`
- `INTERMEDIATE`
- `FLUENT`
- `NATIVE`

### Real-World Meaning

This is critical because a guide may:

- speak English fluently
- know German at intermediate level
- be native in Sinhala

That affects:

- sales matching
- operational assignment
- customer satisfaction

## 4. Coverage Areas

### Business Purpose

Coverage Areas define where a guide can legally, practically, or commercially operate.

### Key Fields

- `Guide`
- `Location`
- `Coverage Type`

### Coverage Types

- `REGION`
- `CITY`
- `SITE`
- `COUNTRY`

### Real-World Examples

- Kandy Region
- Colombo City
- Sigiriya Site
- Sri Lanka Countrywide

### Why This Matters

Coverage areas help avoid assigning a guide to a destination they do not know or are not licensed to serve.

## 5. Licenses

### Business Purpose

Licenses store official or regulated permissions held by the guide.

### License Types

- `NATIONAL_GUIDE`
- `SITE_GUIDE`
- `DRIVER_GUIDE`
- `ADVENTURE_INSTRUCTOR`
- `OTHER`

### Key Fields

- `Guide`
- `License Type`
- `License Number`
- `Issued By`
- `Issued At`
- `Expires At`
- `Is Verified`
- `Notes`

### Business Meaning

Licenses are not only documents. They decide whether a guide is operationally valid for certain jobs.

Example:

- a site guide may only guide specific attractions
- a national guide may cover broader touring
- a driver guide may combine transport and guide roles

## 6. Certifications

### Business Purpose

Certifications store professional qualifications that are useful for safety, brand quality, or specialty tourism.

Examples:

- first aid
- birdwatching guide
- trekking certificate
- language diploma
- cultural interpretation course

### Key Fields

- `Guide`
- `Name`
- `Provider`
- `Issued At`
- `Expires At`
- `Certificate No`
- `Notes`

## 7. Documents

### Business Purpose

Documents store metadata and URLs for guide files.

### Document Types

- `ID`
- `PASSPORT`
- `LICENSE`
- `CERTIFICATE`
- `CONTRACT`
- `INSURANCE`
- `OTHER`

### Key Fields

- `Guide`
- `Doc Type`
- `File URL`
- `File Name`
- `MIME Type`
- `Is Active`

### Best Practice

- use clear filenames
- keep one current active version where needed
- ensure document links are accessible to authorized users only

## 8. Weekly Availability

### Business Purpose

Weekly availability defines a guide’s normal recurring availability pattern.

### Key Fields

- `Guide`
- `Weekday`
- `Start Time`
- `End Time`
- `Is Available`

### Real-World Meaning

This represents the normal weekly working pattern.

Examples:

- available Monday to Saturday
- available 07:00 to 19:00
- unavailable on Sunday

### Important Note

Weekly availability is the default pattern. It should be overridden by blackout dates when needed.

## 9. Blackout Dates

### Business Purpose

Blackout dates record temporary periods when a guide is unavailable.

Examples:

- personal leave
- already committed to another booking
- training program
- illness
- visa or documentation issue

### Key Fields

- `Guide`
- `Start`
- `End`
- `Reason`

### Why This Matters

This is critical for reliable operations. A guide can be available generally every week but still unavailable on specific dates.

## 10. Guide Rates

### Business Purpose

Guide Rates are the main commercial pricing records for guide services.

### Key Fields

- `Guide`
- `Location`
- `Rate Name`
- `Pricing Model`
- `Currency`
- `Fixed Rate`
- `Per Hour Rate`
- `Per Pax Rate`
- `Pax Tiers`
- `Min Charge`
- `Overtime After Hours`
- `Overtime Per Hour Rate`
- `Night Allowance`
- `Per Diem`
- `Effective From`
- `Effective To`
- `Notes`
- `Is Active`

### Pricing Models

- `PER_DAY`
- `HALF_DAY`
- `PER_HOUR`
- `PER_PAX`
- `FIXED`
- `TIERED_PAX`

## 11. Assignments

### Business Purpose

Assignments store booking-linked guide operational records.

### Key Fields

- `Booking ID`
- `Guide`
- `Service Type`
- `Service ID`
- `Start`
- `End`
- `Status`
- `Currency Code`
- `Base Amount`
- `Tax Amount`
- `Total Amount`
- `Rate Snapshot`
- `Notes`

### Service Types

- `DAY`
- `ACTIVITY`
- `TRANSPORT`
- `PACKAGE`

### Status Values

- `ASSIGNED`
- `CONFIRMED`
- `COMPLETED`
- `CANCELLED`

### Important Note

Assignments are operational and financial records. They should reflect confirmed or tracked services, not only draft ideas.

## How Guide Pricing Works In The Real World

Guide pricing is usually more complex than one flat amount.

In real operations, guide cost can depend on:

- full day or half day usage
- number of hours
- language skill
- location / destination
- guide seniority
- pax size
- guide specialty
- overtime
- night allowance
- per diem

### Common Real-World Guide Pricing Styles

1. full-day fixed rate
2. half-day rate
3. hourly rate
4. per-pax excursion guide fee
5. tiered pax guide fee
6. fixed site-guiding fee
7. base rate plus overtime
8. base rate plus night allowance and per diem

### How This Application Represents It

The application stores commercial guide pricing through `Guide Rates`:

- `PER_DAY` for standard full-day guide pricing
- `HALF_DAY` for short guide services
- `PER_HOUR` when billed by time
- `PER_PAX` when charged per guest
- `FIXED` for fixed service amount
- `TIERED_PAX` for grouped passenger bands

Additional commercial factors are stored separately:

- `Min Charge`
- `Overtime After Hours`
- `Overtime Per Hour Rate`
- `Night Allowance`
- `Per Diem`

This structure is strong for production because it separates the base guide model from operational add-ons.

## How Users Should Decide Which Rate Model To Use

### `PER_DAY`

Use when the guide is contracted for one full operational day.

Example:

- airport pickup + sightseeing + hotel drop over a normal day

### `HALF_DAY`

Use when the guide works only part of the day, usually 4-5 hours depending on company policy.

### `PER_HOUR`

Use when the contract is time-based and short services must be priced precisely.

### `PER_PAX`

Use when guide cost is sold by guest count.

### `FIXED`

Use when one service has one total agreed guide fee regardless of pax or time.

### `TIERED_PAX`

Use when the rate changes by passenger band.

## Example Data Set

Below is a realistic training dataset.

### A. Languages

| Code | Name |
| --- | --- |
| `EN` | English |
| `DE` | German |
| `FR` | French |
| `JA` | Japanese |
| `SI` | Sinhala |

### B. Guide Example

| Field | Example Value |
| --- | --- |
| Code | `G-0007` |
| Guide Type | `INDIVIDUAL` |
| Full Name | `Nimal Perera` |
| Display Name | `Nimal` |
| Gender | `MALE` |
| Phone | `+94 77 123 4567` |
| Email | `nimal.guide@example.com` |
| Country | `Sri Lanka` |
| City | `Kandy` |
| Years Experience | `11` |
| Rating | `4.8` |
| Base Currency | `USD` |
| Is Active | `Yes` |

### C. Guide Languages Example

| Guide | Language | Proficiency |
| --- | --- | --- |
| `G-0007` | `English` | `FLUENT` |
| `G-0007` | `German` | `INTERMEDIATE` |
| `G-0007` | `Sinhala` | `NATIVE` |

### D. Coverage Area Example

| Guide | Location | Coverage Type |
| --- | --- | --- |
| `G-0007` | `Kandy City` | `CITY` |
| `G-0007` | `Sigiriya` | `SITE` |
| `G-0007` | `Central Province` | `REGION` |

### E. License Example

| Field | Example Value |
| --- | --- |
| Guide | `G-0007` |
| License Type | `NATIONAL_GUIDE` |
| License Number | `NG-45872` |
| Issued By | `Sri Lanka Tourism` |
| Issued At | `2024-01-15` |
| Expires At | `2027-01-14` |
| Verified | `Yes` |

### F. Certification Example

| Field | Example Value |
| --- | --- |
| Guide | `G-0007` |
| Name | `First Aid Certificate` |
| Provider | `Red Cross Sri Lanka` |
| Issued At | `2025-03-01` |
| Expires At | `2027-03-01` |

### G. Weekly Availability Example

| Weekday | Start | End | Available |
| --- | --- | --- | --- |
| Monday | `07:00` | `19:00` | `Yes` |
| Tuesday | `07:00` | `19:00` | `Yes` |
| Wednesday | `07:00` | `19:00` | `Yes` |
| Thursday | `07:00` | `19:00` | `Yes` |
| Friday | `07:00` | `19:00` | `Yes` |
| Saturday | `07:00` | `17:00` | `Yes` |
| Sunday | `-` | `-` | `No` |

### H. Blackout Example

| Guide | Start | End | Reason |
| --- | --- | --- | --- |
| `G-0007` | `2026-08-10 00:00` | `2026-08-15 23:59` | `Annual leave` |

### I. Guide Rate Example

| Field | Example Value |
| --- | --- |
| Guide | `G-0007` |
| Location | `Kandy City` |
| Rate Name | `Kandy Full Day English Guide` |
| Pricing Model | `PER_DAY` |
| Currency | `USD` |
| Fixed Rate | `85.00` |
| Min Charge | `85.00` |
| Overtime After Hours | `8` |
| Overtime Per Hour Rate | `10.00` |
| Night Allowance | `20.00` |
| Per Diem | `15.00` |
| Effective From | `2026-01-01` |

### J. Tiered Pax Rate Example

| Field | Example Value |
| --- | --- |
| Rate Name | `German Cultural Tour Tiered Rate` |
| Pricing Model | `TIERED_PAX` |
| Pax Tiers | `1-4 = 90`, `5-8 = 110`, `9-15 = 140` |
| Currency | `USD` |

### K. Assignment Example

| Field | Example Value |
| --- | --- |
| Code | `GA-2026-0091` |
| Booking ID | `BK-2026-00452` |
| Guide | `G-0007` |
| Service Type | `DAY` |
| Start | `2026-07-10 08:00` |
| End | `2026-07-10 18:00` |
| Status | `CONFIRMED` |
| Currency Code | `USD` |
| Base Amount | `85.00` |
| Tax Amount | `0.00` |
| Total Amount | `85.00` |

## Worked Pricing Examples

### Example 1: Full Day Guide

Guide rate:

- `PER_DAY`
- fixed rate = `USD 85`

Calculation:

- guide cost = `USD 85`

### Example 2: Full Day With Overtime

Guide rate:

- full day rate = `USD 85`
- overtime after `8 hours`
- overtime per hour = `USD 10`

Service duration:

- `10 hours`

Calculation:

- base day rate = `USD 85`
- overtime = `2 x 10 = USD 20`
- total = `USD 105`

### Example 3: Full Day With Night Allowance

Guide rate:

- base day = `USD 85`
- night allowance = `USD 20`

Calculation:

- base day = `USD 85`
- night allowance = `USD 20`
- total = `USD 105`

### Example 4: Per Pax Guide Rate

Guide rate:

- `PER_PAX`
- per pax = `USD 8`
- group size = `12 pax`

Calculation:

- `12 x 8 = USD 96`

### Example 5: Tiered Pax Guide Rate

Guide rate:

- 1-4 pax = `USD 90`
- 5-8 pax = `USD 110`
- 9-15 pax = `USD 140`

Group size:

- `7 pax`

Calculation:

- falls into `5-8 pax`
- total = `USD 110`

### Example 6: Guide Assignment Snapshot

When a guide is assigned, the assignment can store:

- selected guide rate
- base amount
- tax amount
- total amount
- rate snapshot

This is important because future master-rate changes should not silently change old confirmed assignments.

## Real-World Scenarios This Application Supports

The guide structure is designed to support:

- freelance guides
- internal guides
- guide companies
- multilingual guides
- regional or site-specific coverage
- legal license management
- specialty certifications
- recurring weekly availability
- temporary blackout periods
- day / hour / pax / tiered commercial pricing
- booking-linked guide assignments

For a destination management company, this is a strong production guide master-data model.

## Common Business Rules

- A guide must exist before guide-language, coverage, license, certification, rate, or assignment records are created.
- Language values should come from the language master only.
- Weekly availability is the normal pattern; blackout dates override reality for specific periods.
- Licenses and certifications should be monitored for expiry.
- Guide rates should always have clear effective dates.
- Assignments should use confirmed rate snapshots whenever possible.

## Common Mistakes To Avoid

- creating guide rates before the guide profile is complete
- not mapping language proficiency correctly
- assigning guides outside coverage area
- ignoring expired licenses
- forgetting blackout dates for unavailable guides
- mixing operational assignment data with draft planning data
- changing live guide rates without controlling effective date windows

## Quick Training Summary

If a new user needs the shortest explanation, teach them this:

1. `Guides` are the main professional profiles
2. `Languages` define the shared language master
3. `Guide Languages` show what each guide speaks
4. `Coverage Areas` show where each guide can serve
5. `Licenses / Certifications / Documents` support compliance and quality
6. `Availability / Blackouts` control scheduling reality
7. `Guide Rates` control costing
8. `Assignments` are the booking-level operational records

## Screen References

Main guides screen:

- [guides-management-section.tsx](/Users/sachinthyarathnavibushana/Documents/MSC%20Project/msc_project/src/modules/guides/ui/components/guides-management-section.tsx)

Guide management behavior:

- [use-guides-management.ts](/Users/sachinthyarathnavibushana/Documents/MSC%20Project/msc_project/src/modules/guides/lib/use-guides-management.ts)

Core schemas:

- [guides-schemas.ts](/Users/sachinthyarathnavibushana/Documents/MSC%20Project/msc_project/src/modules/guides/shared/guides-schemas.ts)

Resource list:

- [guides-management-config.ts](/Users/sachinthyarathnavibushana/Documents/MSC%20Project/msc_project/src/modules/guides/shared/guides-management-config.ts)
