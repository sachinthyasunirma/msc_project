# Transport Master Data User Manual

## Purpose

The Transport master data area is used to maintain all transport-related reference data required for:

- quotation and costing
- pre-tour planning
- route-based transport pricing
- passenger-based pricing
- baggage handling charges
- operational transport planning

This module is the source of truth for:

- transport locations
- vehicle categories
- vehicle types
- point-to-point transport rates
- location-based transport expenses
- pax-based transport pricing
- baggage pricing

## Where To Access

Open:

- `Master Data`
- `Transports`

The transport master-data screen is organized into tabs:

1. `Locations`
2. `Vehicle Categories`
3. `Vehicle Types`
4. `Location Rates`
5. `Location Expenses`
6. `Pax Vehicle Rates`
7. `Baggage Rates`

## Recommended Setup Sequence

For production-quality setup, use this order:

1. Create locations
2. Create vehicle categories
3. Create vehicle types
4. Confirm company transport rate basis
5. Create location rates
6. Create location expenses
7. Create pax vehicle rates
8. Create baggage rates
9. Add location media if required

This sequence reduces pricing errors and keeps lookup relationships clean.

## Core Business Concept: Rate Basis

The transport module supports two company-level pricing structures:

- `VEHICLE_CATEGORY`
- `VEHICLE_TYPE`

### What It Means

If the company rate basis is `VEHICLE_CATEGORY`:

- transport pricing must be maintained by category
- example: `Sedan`, `Van`, `Coach`
- vehicle type is not allowed in the pricing rows

If the company rate basis is `VEHICLE_TYPE`:

- transport pricing must be maintained by specific type
- example: `Toyota Premio`, `KDH Van`, `34-Seater Coach`
- vehicle category is not allowed in the pricing rows

### Why This Matters

This is one of the most important transport rules in the application.

If the pricing basis is inconsistent:

- rates become duplicated
- costing may pick the wrong transport rule
- batch upload becomes confusing
- pricing governance becomes weak

The business must decide one consistent transport rating strategy per company.

## 1. Locations

### Business Purpose

Locations are the transport pickup / drop / transfer points used by pricing and routing.

Examples:

- airport
- hotel
- city
- railway station
- tourist attraction

### Key Fields

- `Code`
- `Name`
- `Country`
- `Region`
- `Address`
- `Geo`
- `Tags`
- `Notes`
- `Is Active`

### Real-World Meaning

A transport location is not always only a city. It can represent a commercial pricing point.

Examples:

- `CMB-AIRPORT`
- `KANDY-CITY`
- `NUWARA-ELIYA-TOWN`
- `HIKKADUWA-BEACH-ZONE`

### Good Practice

- Create pricing locations at the level used in your rate contracts.
- Do not mix hotel-specific points and broad city points unless your pricing model requires both.
- Use clear codes because many downstream rate records depend on them.

## 2. Vehicle Categories

### Business Purpose

Vehicle categories define high-level commercial vehicle groups.

Examples:

- Sedan
- SUV
- Van
- Mini Coach
- Coach

### Key Fields

- `Code`
- `Name`
- `Description`
- `Sort Order`
- `Is Active`

### When To Use

Use categories when your transport rates are negotiated broadly by class of vehicle rather than by exact model.

Example:

- Airport to Kandy:
  - Sedan = `LKR 18,000`
  - Van = `LKR 24,000`
  - Coach = `LKR 45,000`

## 3. Vehicle Types

### Business Purpose

Vehicle types define the detailed operational / commercial vehicle units used by the company.

Examples:

- Toyota Premio
- Toyota Axio
- KDH Van
- Nissan Caravan
- 22 Seater Mini Coach
- 34 Seater Coach

### Key Fields

- `Code`
- `Name`
- `Category`
- `Pax Capacity`
- `Baggage Capacity`
- `Features`
- `Is Active`

### Real-World Meaning

Vehicle type is more detailed than category and is useful when:

- exact type matters operationally
- contracts are negotiated by model / class
- baggage capacity differs significantly
- cost differences inside the same category are important

## 4. Location Rates

### Business Purpose

Location rates are point-to-point transport prices between two transport locations.

This is the main route-based pricing screen.

### Key Fields

- `Code`
- `From Location`
- `To Location`
- `Vehicle Category` or `Vehicle Type`
- `Distance KM`
- `Duration Min`
- `Currency`
- `Pricing Model`
- `Fixed Rate`
- `Per KM Rate`
- `Slabs`
- `Min Charge`
- `Night Surcharge`
- `Effective From`
- `Effective To`
- `Notes`
- `Is Active`

### Pricing Models

#### `FIXED`

Use when a route has one agreed transport price.

Example:

- Airport to Colombo City Sedan = `LKR 9,500`

#### `PER_KM`

Use when pricing is calculated by distance.

Example:

- Van rate = `LKR 180 per km`
- distance = `115 km`
- transport charge = `115 x 180 = LKR 20,700`

#### `SLAB`

Use when pricing changes by distance band.

Example:

- 0 to 50 km = `LKR 9,000`
- 51 to 100 km = `LKR 14,000`
- 101 to 150 km = `LKR 19,500`

### Real-World Use Cases

Use location rates for:

- airport transfers
- hotel-to-city transfers
- city-to-city transfers
- excursion route pricing
- long-distance route costing

## 5. Location Expenses

### Business Purpose

Location expenses are additional charges linked to a specific location rather than the whole route itself.

Examples:

- parking fee
- highway toll estimate
- guide parking
- entry-zone surcharge
- waiting charge
- driver accommodation

### Key Fields

- `Code`
- `Location`
- `Name`
- `Expense Type`
- `Amount`
- `Currency`
- `Vehicle Category` or `Vehicle Type`
- `Effective From`
- `Effective To`
- `Notes`
- `Is Active`

### Expense Types

- `FIXED`
- `PER_DAY`
- `PER_HOUR`
- `PER_PAX`
- `PER_VEHICLE`

### Why This Screen Matters

Transport costing is often wrong when only the route price is maintained and local operational charges are ignored.

Location expenses allow the business to capture:

- destination surcharges
- seasonal fees
- local zone fees
- one-off handling charges

## 6. Pax Vehicle Rates

### Business Purpose

Pax vehicle rates are used when the business prices transport based on number of passengers instead of only route or vehicle movement.

### Key Fields

- `Code`
- `From Location`
- `To Location`
- `Vehicle Category` or `Vehicle Type`
- `Currency`
- `Pricing Model`
- `Per Pax Rate`
- `Tiers`
- `Min Charge`
- `Effective From`
- `Effective To`
- `Notes`
- `Is Active`

### Pricing Models

#### `PER_PAX`

Use one amount per passenger.

Example:

- Kandy City Tour = `LKR 1,500 per pax`

#### `TIERED`

Use different rates by passenger band.

Example:

- 1 to 3 pax = `LKR 4,500`
- 4 to 6 pax = `LKR 7,500`
- 7 to 10 pax = `LKR 11,000`

### When To Use

Use pax vehicle rates when transport is sold commercially as a guest-based service, especially for:

- shared excursions
- shuttle pricing
- SIC-style movement
- small sightseeing packages

## 7. Baggage Rates

### Business Purpose

Baggage rates capture luggage-related charges between locations.

Examples:

- extra bag movement
- overweight baggage handling
- porter-linked baggage transport
- baggage truck supplement

### Key Fields

- `Code`
- `From Location`
- `To Location`
- `Vehicle Category` or `Vehicle Type`
- `Currency`
- `Unit`
- `Pricing Model`
- `Per Unit Rate`
- `Fixed Rate`
- `Tiers`
- `Min Charge`
- `Effective From`
- `Effective To`
- `Notes`
- `Is Active`

### Units

- `BAG`
- `KG`

### Pricing Models

- `PER_UNIT`
- `TIERED`
- `FIXED`

## How Transport Pricing Works In The Real World

Transport pricing is usually driven by more than one factor.

In real operations, transport cost can depend on:

- route
- vehicle category or type
- passenger count
- distance
- duration
- road / toll condition
- baggage volume
- destination-specific surcharges
- season
- night driving surcharge
- waiting time

### Common Real-World Pricing Styles

1. Fixed route rate
2. Distance-based rate
3. Distance slab rate
4. Per passenger rate
5. Vehicle-day rate
6. Hourly hire rate
7. Baggage surcharge
8. Local expense add-ons

### How This Application Represents It

The transport master-data design separates those commercial concepts:

- `Location Rates`
  - main route price
- `Location Expenses`
  - local additional charges
- `Pax Vehicle Rates`
  - passenger-based pricing
- `Baggage Rates`
  - luggage-related pricing

This is the correct production approach because each pricing style has different business meaning.

## How Users Should Decide Which Screen To Use

### Use `Location Rates` when:

- the main commercial rate is route-based
- you know the start and end point
- the rate is fixed, per km, or slab-based

### Use `Location Expenses` when:

- the charge is not the route itself
- it is a local surcharge or operational add-on

### Use `Pax Vehicle Rates` when:

- transport is sold per passenger
- group size changes the price structure

### Use `Baggage Rates` when:

- baggage needs separate commercial control
- luggage volume affects transport charge

## Example Data Set

Below is a realistic sample training dataset.

### A. Locations

| Code | Name | Country | Region |
| --- | --- | --- | --- |
| `CMB-AIRPORT` | Bandaranaike International Airport | Sri Lanka | Western |
| `COL-CITY` | Colombo City | Sri Lanka | Western |
| `KDY-CITY` | Kandy City | Sri Lanka | Central |
| `NUW-CITY` | Nuwara Eliya Town | Sri Lanka | Central |
| `GAL-CITY` | Galle City | Sri Lanka | Southern |

### B. Vehicle Categories

| Code | Name | Description |
| --- | --- | --- |
| `SEDAN` | Sedan | Standard car for 1-2 pax |
| `SUV` | SUV | Higher comfort for small groups |
| `VAN` | Van | Mid-size van for families / groups |
| `COACH` | Coach | Large group coach |

### C. Vehicle Types

| Code | Name | Category | Pax Capacity | Baggage Capacity |
| --- | --- | --- | ---: | ---: |
| `PREMIO` | Toyota Premio | Sedan | `2` | `2` |
| `KDH` | Toyota KDH Van | Van | `6` | `6` |
| `COACH-34` | 34 Seater Coach | Coach | `34` | `25` |

### D. Location Rate Example

Airport to Kandy by vehicle category:

| Field | Example Value |
| --- | --- |
| Code | `LR-CMB-KDY-SEDAN` |
| From | `CMB-AIRPORT` |
| To | `KDY-CITY` |
| Vehicle Category | `SEDAN` |
| Distance KM | `115` |
| Duration Min | `210` |
| Currency | `LKR` |
| Pricing Model | `FIXED` |
| Fixed Rate | `18500` |
| Min Charge | `0` |
| Night Surcharge | `2500` |

### E. Per KM Example

Colombo to Galle by van:

| Field | Example Value |
| --- | --- |
| Code | `LR-COL-GAL-VAN-PKM` |
| From | `COL-CITY` |
| To | `GAL-CITY` |
| Vehicle Category | `VAN` |
| Distance KM | `130` |
| Currency | `LKR` |
| Pricing Model | `PER_KM` |
| Per KM Rate | `185` |
| Min Charge | `18000` |

### F. Slab Example

General intercity coach pricing:

| Distance Range | Rate |
| --- | ---: |
| `0-50 km` | `15000` |
| `51-100 km` | `22000` |
| `101-150 km` | `28500` |

### G. Location Expense Example

| Code | Name | Location | Expense Type | Amount | Currency |
| --- | --- | --- | --- | ---: | --- |
| `LE-KDY-PARK` | Kandy Parking | `KDY-CITY` | `PER_VEHICLE` | `1000` | `LKR` |
| `LE-AIRPORT-WAIT` | Airport Waiting | `CMB-AIRPORT` | `PER_HOUR` | `2500` | `LKR` |
| `LE-NUW-DRIVER` | Driver Overnight | `NUW-CITY` | `PER_DAY` | `4500` | `LKR` |

### H. Pax Vehicle Rate Example

Kandy city excursion:

| Field | Example Value |
| --- | --- |
| Code | `PVR-KDY-CITYTOUR` |
| From | `KDY-CITY` |
| To | `KDY-CITY` |
| Vehicle Category | `VAN` |
| Pricing Model | `TIERED` |
| Tiers | `1-3 pax = 4500`, `4-6 pax = 7200` |
| Min Charge | `4500` |

### I. Baggage Rate Example

Airport to hotel extra baggage:

| Field | Example Value |
| --- | --- |
| Code | `BR-AIRPORT-EXTRA-BAG` |
| From | `CMB-AIRPORT` |
| To | `COL-CITY` |
| Vehicle Category | `SEDAN` |
| Currency | `LKR` |
| Unit | `BAG` |
| Pricing Model | `PER_UNIT` |
| Per Unit Rate | `1500` |
| Min Charge | `1500` |

## Worked Pricing Examples

### Example 1: Fixed Route Rate

Route:

- `CMB-AIRPORT` to `KDY-CITY`
- Vehicle: `SEDAN`
- Pricing model: `FIXED`
- Fixed rate: `LKR 18,500`

Calculation:

- Base transport cost = `LKR 18,500`

If night surcharge applies:

- Night surcharge = `LKR 2,500`
- Final cost = `LKR 21,000`

### Example 2: Per KM Rate

Route:

- `COL-CITY` to `GAL-CITY`
- Vehicle: `VAN`
- Distance = `130 km`
- Rate = `LKR 185 / km`
- Min charge = `LKR 18,000`

Calculation:

- Distance cost = `130 x 185 = LKR 24,050`
- Compare with min charge = `LKR 18,000`
- Final cost = `LKR 24,050`

### Example 3: Slab Rate

Route distance:

- `92 km`

Slabs:

- `0-50 = 15,000`
- `51-100 = 22,000`
- `101-150 = 28,500`

Calculation:

- 92 km falls into `51-100`
- Final cost = `LKR 22,000`

### Example 4: Location Expense Added

Base route:

- Airport to Kandy sedan = `LKR 18,500`

Additional expense:

- Kandy parking = `LKR 1,000 per vehicle`

Calculation:

- Base route = `LKR 18,500`
- Location expense = `LKR 1,000`
- Final transport cost = `LKR 19,500`

### Example 5: Pax Vehicle Rate

Excursion:

- Kandy city excursion
- 5 pax
- Tiered pax pricing
- 4-6 pax tier = `LKR 7,200`

Calculation:

- Final cost = `LKR 7,200`

### Example 6: Baggage Charge

Transfer:

- Airport to Colombo
- Extra baggage count = `3 bags`
- Per bag rate = `LKR 1,500`

Calculation:

- `3 x 1,500 = LKR 4,500`

If min charge is `LKR 1,500`, final remains `LKR 4,500`

## Real-World Scenarios This Application Supports

The transport structure is designed to support:

- airport transfers
- hotel transfers
- intercity transfers
- day excursion pricing
- category-based transport contracts
- type-based transport contracts
- distance-based pricing
- slab pricing
- passenger tier pricing
- baggage pricing
- location surcharges

For most destination management company workflows, this is a strong production master-data model.

## Common Business Rules

- A route cannot be priced until both locations exist.
- Vehicle category or vehicle type must follow the company transport rate basis.
- Use one transport basis consistently.
- Effective date windows should not overlap carelessly for the same commercial rule.
- `From` and `To` locations should match the real pricing contract structure.
- Use `Location Expenses` for add-ons, not to replace the route rate.

## Common Mistakes To Avoid

- mixing vehicle category pricing and vehicle type pricing for the same company
- creating duplicate routes with unclear code standards
- using city names inconsistently
- storing toll or parking inside the route when it should be a location expense
- using pax rates when the business really prices per vehicle
- forgetting min charge for low-distance per-km pricing
- not maintaining night surcharge where operationally required

## Quick Training Summary

If a new user needs the shortest explanation, teach them this:

1. `Locations` are transport pricing points
2. `Vehicle Categories` are high-level commercial classes
3. `Vehicle Types` are detailed vehicle definitions
4. `Location Rates` are the main route prices
5. `Location Expenses` are additional local charges
6. `Pax Vehicle Rates` are for passenger-based pricing
7. `Baggage Rates` are for luggage-related pricing

## Screen References

Main transport screen:

- [transport-management-section.tsx](/Users/sachinthyarathnavibushana/Documents/MSC%20Project/msc_project/src/modules/transport/ui/components/transport-management-section.tsx)

Transport resource definitions:

- [transport-management-constants.ts](/Users/sachinthyarathnavibushana/Documents/MSC%20Project/msc_project/src/modules/transport/shared/transport-management-constants.ts)

Core schemas:

- [transport-schemas.ts](/Users/sachinthyarathnavibushana/Documents/MSC%20Project/msc_project/src/modules/transport/shared/transport-schemas.ts)

Core business enforcement:

- [transport-service.ts](/Users/sachinthyarathnavibushana/Documents/MSC%20Project/msc_project/src/modules/transport/server/transport-service.ts)
