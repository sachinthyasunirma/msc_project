# Technical Visit Master Data User Manual

## Purpose

The Technical Visit master data area is used to record field inspections and follow-up observations for suppliers and service resources used by the business.

This module is the source of truth for:

- technical visit records
- inspection checklist items
- evidence media
- post-visit follow-up actions

In production, this module helps the company verify supplier quality before using a hotel, activity, vehicle, guide, or restaurant in quotation and operations.

## Where To Access

Open:

- `Master Data`
- `Technical Visits`

The screen is organized into four tabs:

1. `Technical Visits`
2. `Checklist`
3. `Media`
4. `Actions`

## Why This Module Matters

Technical visits are a quality-control process.

They help the business answer questions such as:

- Has this hotel actually been inspected?
- Is this vehicle in acceptable condition?
- Is this guide still professional and operationally reliable?
- Does this activity meet safety expectations?
- Did the restaurant inspection identify any issue that needs follow-up?

Without technical visit records:

- supplier approval becomes informal
- sales may sell services not checked by operations
- quality issues repeat because evidence is not stored
- follow-up actions get lost

## Recommended Setup Sequence

For clean production usage, use this order:

1. Confirm the supplier or resource already exists in its own master data
2. Create the `Technical Visit`
3. Add `Checklist` items
4. Attach `Media`
5. Create `Actions` for unresolved issues
6. Review follow-up status before using the supplier heavily

This sequence keeps the visit record complete and auditable.

## Core Business Concept

This module has four layers:

### 1. Technical Visit

This is the main inspection event.

It answers:

- what was visited
- when it was visited
- who visited it
- the overall result

### 2. Checklist

This stores the detailed inspection points under the visit.

It answers:

- what exactly was checked
- how each item was rated
- what remarks were observed

### 3. Media

This stores evidence related to the visit.

It answers:

- what proof supports the inspection
- what photos or files were captured

### 4. Actions

This stores what must happen after the visit.

It answers:

- what needs correction
- who owns the next step
- when it should be completed

## 1. Technical Visits

### Business Purpose

The `Technical Visits` tab stores the master inspection record.

Each visit must be linked to one real business reference.

### Supported Visit Types

The application supports technical visits for:

- `HOTEL`
- `ACTIVITY`
- `VEHICLE`
- `GUIDE`
- `RESTAURANT`

### What `Reference` Means

The `Reference` field changes based on the selected visit type:

- `HOTEL` links to a hotel record
- `ACTIVITY` links to an activity record
- `VEHICLE` links to a vehicle type
- `GUIDE` links to a guide profile
- `RESTAURANT` links to an organization record

This is important because the technical visit is not a free-text inspection. It is tied to a known supplier or service master record.

### Key Fields

- `Code`
- `Visit Type`
- `Reference`
- `Visit Date`
- `Visited By`
- `Overall Rating`
- `Status`
- `Summary`
- `Follow Up Required`
- `Next Visit Date`
- `Is Active`

### Visit Statuses

- `PLANNED`
- `COMPLETED`
- `FOLLOW_UP`

### Business Meaning Of Main Fields

#### `Overall Rating`

This is a quick inspection score, usually from `1` to `5`.

Example:

- `5` = excellent, approved standard
- `4` = good, acceptable
- `3` = usable with caution
- `2` = below expected standard
- `1` = unacceptable

#### `Status`

- `PLANNED`: visit has been scheduled but not yet performed
- `COMPLETED`: visit was done and findings were recorded
- `FOLLOW_UP`: visit found issues that need a follow-up cycle

#### `Follow Up Required`

This should be `Yes` when the visit found issues that the supplier or internal team must resolve.

#### `Next Visit Date`

This is useful for:

- periodic quality review
- re-inspection after corrective action
- seasonal supplier verification

### Good Practice

- Always link visits to an existing master record.
- Use a consistent code format such as `TV-HOTEL-0001`.
- Do not mark a visit as `COMPLETED` if checklist evidence has not been recorded.

## 2. Checklist

### Business Purpose

The `Checklist` tab stores detailed inspection points under a technical visit.

This is where the real quality assessment is documented.

### Key Fields

- `Code`
- `Visit`
- `Category`
- `Checklist Item`
- `Rating`
- `Remarks`
- `Sort Order`
- `Is Active`

### Supported Checklist Categories

- `CLEANLINESS`
- `SAFETY`
- `SERVICE`
- `LOCATION`
- `VEHICLE_CONDITION`

### Real-World Meaning

Checklist items should be short, clear, and auditable.

Examples:

- room cleanliness acceptable
- staff greeting and professionalism
- life jackets available and usable
- driver grooming and punctuality
- restaurant kitchen hygiene
- vehicle tire condition

### Example Hotel Checklist

| Category | Item | Rating | Remarks |
| --- | --- | --- | --- |
| `CLEANLINESS` | Guest room cleanliness | 4 | Good overall, minor bathroom wear |
| `SERVICE` | Front office professionalism | 5 | Staff handled inspection very well |
| `LOCATION` | Access road condition | 3 | Narrow entrance for large vehicles |
| `SAFETY` | Fire safety signage | 2 | Improvement required on some floors |

### Example Vehicle Checklist

| Category | Item | Rating | Remarks |
| --- | --- | --- | --- |
| `VEHICLE_CONDITION` | Seat condition | 4 | Generally good |
| `VEHICLE_CONDITION` | AC performance | 3 | Cooling is acceptable but weak |
| `SAFETY` | Seat belts available | 2 | Missing on rear seats |
| `CLEANLINESS` | Interior cleanliness | 4 | Clean at time of inspection |

### Best Practice

- Keep checklist items specific.
- Use `Remarks` for evidence or exceptions.
- Use `Sort Order` to keep the checklist in a consistent sequence.

## 3. Media

### Business Purpose

The `Media` tab stores proof attached to a technical visit.

This usually means:

- inspection photos
- scanned notes
- supplier correction evidence
- location images

### Key Fields

- `Code`
- `Visit`
- `File URL`
- `Caption`
- `Is Active`

### Real-World Examples

- hotel room inspection photo
- restaurant kitchen photo
- vehicle front exterior image
- guide license or badge confirmation image
- activity safety equipment photo

### Why Media Matters

Media reduces argument and confusion later.

If a supplier says a condition was acceptable, the inspection team can review the evidence instead of relying only on memory.

### Good Practice

- Use clear captions such as `Bathroom condition - Room 205`.
- Do not upload random marketing images as technical evidence.
- Keep media tied to the correct visit.

## 4. Actions

### Business Purpose

The `Actions` tab stores follow-up work after a technical visit.

This is what turns an inspection into a managed quality process.

### Key Fields

- `Code`
- `Visit`
- `Action`
- `Assigned To`
- `Due Date`
- `Status`
- `Is Active`

### Action Statuses

- `OPEN`
- `IN_PROGRESS`
- `DONE`
- `CANCELLED`

### Real-World Examples

- supplier to replace damaged room linen
- transport team to re-check missing seat belts
- operations manager to confirm restaurant hygiene corrective action
- contracting team to pause usage until issue resolved

### Best Practice

- Every serious issue should have a clear owner.
- Use realistic due dates.
- Close an action only after verification, not only after verbal confirmation.

## Example Production Dataset

### Example 1: Technical Visit Records

| Code | Visit Type | Reference | Visit Date | Visited By | Rating | Status | Follow Up |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `TV-HOTEL-0001` | `HOTEL` | `HTL-CMB-001` | `2026-02-10` | Operations Executive | 4 | `COMPLETED` | No |
| `TV-VEH-0003` | `VEHICLE` | `VH-KDH-01` | `2026-02-18` | Transport Manager | 3 | `FOLLOW_UP` | Yes |
| `TV-ACT-0002` | `ACTIVITY` | `ACT-WHALE-01` | `2026-02-21` | Product Executive | 5 | `COMPLETED` | No |
| `TV-REST-0004` | `RESTAURANT` | `ORG-REST-009` | `2026-02-25` | Contracting Officer | 2 | `FOLLOW_UP` | Yes |

### Example 2: Checklist Rows

| Visit | Category | Item | Rating | Remarks |
| --- | --- | --- | --- | --- |
| `TV-HOTEL-0001` | `CLEANLINESS` | Lobby and room cleanliness | 4 | Acceptable standard |
| `TV-HOTEL-0001` | `SAFETY` | Fire exit signage | 2 | Some areas need better visibility |
| `TV-VEH-0003` | `VEHICLE_CONDITION` | Tire wear | 2 | Rear tires need replacement soon |
| `TV-ACT-0002` | `SAFETY` | Safety briefing before activity | 5 | Team follows process correctly |

### Example 3: Media Rows

| Visit | Caption |
| --- | --- |
| `TV-HOTEL-0001` | Reception area and standard room photos |
| `TV-VEH-0003` | Rear tire and seat condition images |
| `TV-REST-0004` | Kitchen and storage area inspection photos |

### Example 4: Action Rows

| Visit | Action | Assigned To | Due Date | Status |
| --- | --- | --- | --- | --- |
| `TV-HOTEL-0001` | Improve fire exit signage | Operations Manager | `2026-03-05` | `OPEN` |
| `TV-VEH-0003` | Replace rear tires and confirm with photos | Transport Supervisor | `2026-02-28` | `IN_PROGRESS` |
| `TV-REST-0004` | Re-inspect hygiene condition before reuse | Product Manager | `2026-03-03` | `OPEN` |

## Real-World Inspection Scenarios

### Scenario 1: Hotel Technical Visit

The contracting or product team visits a new hotel before adding it confidently into sales programs.

What should be checked:

- cleanliness
- safety condition
- service attitude
- room standard
- access for tour vehicles

What should be recorded:

- one technical visit header
- several checklist lines
- room and public area photos
- follow-up action if issues exist

### Scenario 2: Vehicle Inspection

The transport team inspects a vehicle before it is used for VIP or tour work.

What should be checked:

- seating condition
- AC performance
- seat belts
- cleanliness
- exterior condition

If issues are found:

- mark follow-up required
- create action with an owner
- do not treat the vehicle as fully approved until corrected

### Scenario 3: Activity Site Inspection

The product team visits an excursion or experience supplier.

What should be checked:

- guest safety
- briefing quality
- site condition
- supplier professionalism

If the activity is risky, the inspection should be detailed and repeated periodically.

### Scenario 4: Restaurant Inspection

The business inspects a restaurant for group meal suitability.

What should be checked:

- hygiene
- service speed
- group handling capability
- washroom condition
- parking / coach access

## How This Should Be Used In The Business

### Contracting Team

Use technical visits before heavily promoting a new supplier.

### Product Team

Use technical visits to validate whether an experience or resource matches the product promise.

### Operations Team

Use visit findings to reduce guest complaints and operational failures.

### Management

Use action status and ratings to decide whether a supplier remains approved.

## Common Mistakes To Avoid

- creating a visit without linking it to a real master record
- using vague checklist items like `good` or `okay`
- storing no evidence media
- not assigning follow-up actions
- leaving poor-rated suppliers active without review
- confusing technical visit evidence with marketing content

## Recommended Governance

- Only authorized staff should complete technical visits.
- Ratings should follow a shared internal standard.
- Serious issues should always result in an action owner and due date.
- Repeat visits should be scheduled for suppliers with follow-up findings.

## Quick Training Summary

If a new team member reads only one summary, it should be this:

- `Technical Visits` record the inspection event
- `Checklist` records what was checked
- `Media` records evidence
- `Actions` records what must be fixed next

This module helps the company turn supplier inspections into a reliable quality-control process.

## Screen References

- [technical-visit-management-view-impl.tsx](/Users/sachinthyarathnavibushana/Documents/MSC%20Project/msc_project/src/modules/technical-visit/ui/views/technical-visit-management-view-impl.tsx)
- [technical-visit-schemas.ts](/Users/sachinthyarathnavibushana/Documents/MSC%20Project/msc_project/src/modules/technical-visit/shared/technical-visit-schemas.ts)
- [use-technical-visit-management.ts](/Users/sachinthyarathnavibushana/Documents/MSC%20Project/msc_project/src/modules/technical-visit/lib/use-technical-visit-management.ts)
