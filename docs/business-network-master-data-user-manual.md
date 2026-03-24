# Business Network Master Data User Manual

## Purpose

The Business Network master data area is used to maintain the business entities and commercial relationships that the application operates on.

This module is the source of truth for:

- organizations
- operator profiles
- market profiles
- organization members
- operator-market contracts

This is not only a contact database. It is the commercial network model of the business.

It defines:

- who the operator is
- who the market / sales partner is
- who the supplier is
- who belongs to each organization
- how operators and markets are commercially connected

## Where To Access

Open:

- `Master Data`
- `Business Network`

The module is organized into these tabs:

1. `Organizations`
2. `Operator Profiles`
3. `Market Profiles`
4. `Organization Members`
5. `Operator-Market Contracts`

## Recommended Setup Sequence

For production-quality data, use this order:

1. Create organizations
2. Create operator profiles for operator organizations
3. Create market profiles for market organizations
4. Assign organization members
5. Create operator-market contracts

This order keeps the business hierarchy and pricing relationships clean.

## 1. Organizations

### Business Purpose

Organizations are the master records for all business entities that participate in the platform ecosystem.

### Organization Types

The application supports:

- `PLATFORM`
- `OPERATOR`
- `MARKET`
- `SUPPLIER`

### What Each Type Means

#### `PLATFORM`

The internal platform or controlling company entity.

Use for:

- internal platform administration
- system-level oversight
- internal teams

#### `OPERATOR`

The company delivering the travel product or managing the tour operations.

Use for:

- DMCs
- tour operators
- local operators
- service consolidators

#### `MARKET`

The selling-side or demand-side business partner.

Use for:

- travel agents
- online agents
- wholesalers
- corporate buyers

#### `SUPPLIER`

The service provider organization.

Use for:

- hotels
- transport suppliers
- restaurants
- attraction operators
- other contracted vendors

### Key Fields

- `Code`
- `Type`
- `Name`
- `Legal Name`
- `Registration No`
- `Email`
- `Phone`
- `Website`
- `Country`
- `City`
- `Address`
- `Base Currency`
- `Timezone`
- `Verified`
- `Metadata`
- `Is Active`

### Business Meaning

- `Code` should be stable and unique for business reporting
- `Base Currency` influences commercial defaults and financial reference
- `Verified` indicates the organization has been reviewed and accepted operationally or commercially
- `Metadata` is for extra structured business details when needed

### Good Practice

- Create one organization per real legal or operational entity
- Do not duplicate the same company as both operator and supplier unless that is truly how the business is modeled
- Use clear naming such as `ABC Travel Germany` instead of only `ABC`

## 2. Operator Profiles

### Business Purpose

Operator Profiles extend operator organizations with commercial and operational behavior.

This tab is only meaningful for operator-type organizations.

### Key Fields

- `Organization`
- `Operator Kind`
- `Service Regions`
- `Languages`
- `Booking Mode`
- `Lead Time Hours`
- `Payout Mode`
- `Payout Cycle`
- `Is Active`

### Operator Kinds

- `DMC`
- `TOUR_OPERATOR`
- `TRANSPORT`
- `ACTIVITY_PROVIDER`
- `MIXED`

### Business Meaning

#### `Operator Kind`

Describes what kind of operator this entity is commercially.

#### `Service Regions`

Defines where the operator mainly provides services.

#### `Languages`

Defines business communication languages or service languages.

#### `Booking Mode`

- `ON_REQUEST`
- `INSTANT`

This indicates whether bookings need manual confirmation or can be treated as instantly confirmable.

#### `Lead Time Hours`

Defines the minimum expected preparation or confirmation lead time.

#### `Payout Mode`

- `POST_TRAVEL`
- `POST_CONFIRMATION`
- `MILESTONE`

Defines when operator settlement is expected.

#### `Payout Cycle`

- `WEEKLY`
- `BIWEEKLY`
- `MONTHLY`

Defines the expected finance cycle.

### Real-World Example

An inbound DMC in Sri Lanka may have:

- Operator Kind = `DMC`
- Service Regions = `["Sri Lanka", "Maldives Add-on"]`
- Languages = `["EN", "DE"]`
- Booking Mode = `ON_REQUEST`
- Lead Time Hours = `24`
- Payout Mode = `POST_TRAVEL`
- Payout Cycle = `MONTHLY`

## 3. Market Profiles

### Business Purpose

Market Profiles extend market organizations with sales and finance behavior.

This tab is used for the customer-facing or reseller-facing organizations that buy from operators.

### Key Fields

- `Organization`
- `Agency Type`
- `License No`
- `Preferred Currency`
- `Credit Enabled`
- `Credit Limit`
- `Payment Term Days`
- `Default Markup Percent`
- `Is Active`

### Agency Types

- `TRAVEL_AGENT`
- `ONLINE_AGENT`
- `CORPORATE`
- `WHOLESALER`

### Business Meaning

#### `Preferred Currency`

The expected commercial currency for the market partner.

#### `Credit Enabled`

Whether the market can book on credit terms.

#### `Credit Limit`

The maximum allowed credit exposure.

#### `Payment Term Days`

The number of days allowed before payment is due.

#### `Default Markup Percent`

The normal markup preference or commercial default when selling.

### Real-World Example

A German outbound agent may have:

- Agency Type = `TRAVEL_AGENT`
- Preferred Currency = `EUR`
- Credit Enabled = `Yes`
- Credit Limit = `25000`
- Payment Term Days = `30`
- Default Markup Percent = `12`

## 4. Organization Members

### Business Purpose

Organization Members map users to organizations and assign their business roles.

This is how the system knows who belongs to which business entity and what that user can do operationally.

### Key Fields

- `Organization`
- `User`
- `Role`
- `Is Active`

### Important Business Rule

Member roles are controlled by organization type.

That means:

- platform organizations can only use platform roles
- operator organizations can only use operator roles
- market organizations can only use market roles
- supplier organizations can only use supplier roles

### Role Families

#### Platform Roles

- `PLATFORM_ADMIN`
- `PLATFORM_OPERATIONS`
- `PLATFORM_FINANCE`

#### Operator Roles

- `OPERATOR_ADMIN`
- `OPERATOR_CONTRACTS`
- `OPERATOR_RESERVATIONS`
- `OPERATOR_TICKETING`
- `OPERATOR_FINANCE`

#### Market Roles

- `MARKET_ADMIN`
- `MARKET_SALES`
- `MARKET_RESERVATIONS`
- `MARKET_FINANCE`

#### Supplier Roles

- `SUPPLIER_ADMIN`
- `SUPPLIER_OPERATIONS`
- `SUPPLIER_FINANCE`

### Why This Matters

This protects the business structure from invalid assignments.

Example:

- a supplier organization should not have a market sales role
- an operator organization should not have a platform finance role

## 5. Operator-Market Contracts

### Business Purpose

Operator-Market Contracts define the commercial relationship between an operator organization and a market organization.

This is one of the most important B2B pricing structures in the platform.

### Key Fields

- `Operator Organization`
- `Market Organization`
- `Status`
- `Pricing Mode`
- `Default Markup Percent`
- `Default Commission Percent`
- `Credit Enabled`
- `Credit Limit`
- `Payment Term Days`
- `Effective From`
- `Effective To`
- `Notes`
- `Is Active`

### Status Values

- `ACTIVE`
- `SUSPENDED`
- `TERMINATED`

### Pricing Modes

- `MARKUP`
- `COMMISSION`
- `NET_ONLY`

### Business Meaning

#### `MARKUP`

The market buys net and adds markup to sell.

#### `COMMISSION`

The market may sell on public or agreed rate and earn commission.

#### `NET_ONLY`

The market only receives net rates with no separate markup / commission structure in this contract record.

#### `Credit Enabled`, `Credit Limit`, `Payment Term Days`

These define the finance relationship between the operator and market.

### Real-World Example

A Sri Lankan DMC may contract with a UK travel agent as:

- Pricing Mode = `MARKUP`
- Default Markup = `15%`
- Credit Enabled = `Yes`
- Credit Limit = `50000`
- Payment Terms = `30 days`

That means the market partner can book within the agreed credit window and apply the agreed selling structure.

## How Business Network Works In The Real World

In a destination management environment, there are usually multiple business layers:

- platform owner
- operator / DMC
- reseller / market / agent
- supplier

The system needs to know:

- which company plays which role
- which users belong to which company
- how companies sell to each other
- what finance rules apply between them

This module is the place where that business architecture is modeled.

Without it:

- contracting becomes unclear
- pricing responsibility becomes unclear
- permissions and member roles become weak
- operator-market commercial logic becomes inconsistent

## Example Data Set

Below is a realistic sample training dataset.

### A. Organization Examples

| Code | Type | Name | Base Currency | Country | Verified |
| --- | --- | --- | --- | --- | --- |
| `PLT-001` | `PLATFORM` | `TravelCore Platform` | `USD` | `Sri Lanka` | `Yes` |
| `OPR-001` | `OPERATOR` | `Lanka Trails DMC` | `USD` | `Sri Lanka` | `Yes` |
| `MKT-001` | `MARKET` | `Sunrise Travel Germany` | `EUR` | `Germany` | `Yes` |
| `SUP-001` | `SUPPLIER` | `Highland Hotels Group` | `LKR` | `Sri Lanka` | `Yes` |

### B. Operator Profile Example

| Field | Example Value |
| --- | --- |
| Code | `OPP-001` |
| Organization | `Lanka Trails DMC` |
| Operator Kind | `DMC` |
| Service Regions | `["Sri Lanka","Maldives"]` |
| Languages | `["EN","DE"]` |
| Booking Mode | `ON_REQUEST` |
| Lead Time Hours | `24` |
| Payout Mode | `POST_TRAVEL` |
| Payout Cycle | `MONTHLY` |

### C. Market Profile Example

| Field | Example Value |
| --- | --- |
| Code | `MKP-001` |
| Organization | `Sunrise Travel Germany` |
| Agency Type | `TRAVEL_AGENT` |
| License No | `DE-TA-7742` |
| Preferred Currency | `EUR` |
| Credit Enabled | `Yes` |
| Credit Limit | `25000` |
| Payment Term Days | `30` |
| Default Markup Percent | `12` |

### D. Organization Member Example

| Field | Example Value |
| --- | --- |
| Code | `MEM-001` |
| Organization | `Lanka Trails DMC` |
| User | `operations@lankatrails.com` |
| Role | `OPERATOR_RESERVATIONS` |
| Is Active | `Yes` |

### E. Operator-Market Contract Example

| Field | Example Value |
| --- | --- |
| Code | `OMC-001` |
| Operator Organization | `Lanka Trails DMC` |
| Market Organization | `Sunrise Travel Germany` |
| Status | `ACTIVE` |
| Pricing Mode | `MARKUP` |
| Default Markup Percent | `15` |
| Default Commission Percent | `0` |
| Credit Enabled | `Yes` |
| Credit Limit | `50000` |
| Payment Term Days | `30` |
| Effective From | `2026-01-01 00:00` |
| Effective To | `2026-12-31 23:59` |

## Worked Commercial Examples

### Example 1: Markup Contract

Operator net price:

- `USD 1,000`

Contract:

- Pricing Mode = `MARKUP`
- Default Markup = `15%`

Calculation:

- Markup = `1000 x 15% = 150`
- Market sell indication = `USD 1,150`

### Example 2: Commission Contract

Operator rate:

- `USD 1,200`

Contract:

- Pricing Mode = `COMMISSION`
- Default Commission = `10%`

Calculation:

- Commission = `1200 x 10% = 120`

This means the market’s earning model is commission-based rather than markup-based.

### Example 3: Credit Control

Market profile:

- Credit enabled = `Yes`
- Credit limit = `25,000`

Operator-market contract:

- Credit enabled = `Yes`
- Credit limit = `50,000`
- Payment terms = `30 days`

Business interpretation:

- the commercial relationship supports credit
- finance teams must still monitor real exposure and due aging

### Example 4: Role Governance

Organization type:

- `MARKET`

Allowed roles:

- `MARKET_ADMIN`
- `MARKET_SALES`
- `MARKET_RESERVATIONS`
- `MARKET_FINANCE`

If a user is assigned `SUPPLIER_FINANCE` under a market organization, that is invalid by business rule.

The application correctly prevents this mismatch.

## Real-World Scenarios This Application Supports

The business-network structure is designed to support:

- platform-owned travel operations
- one or more DMC / operator entities
- market-side travel agents and wholesalers
- supplier organizations
- internal user membership by organization
- operator to market pricing and finance terms

For a B2B travel operations platform, this is a strong production structure.

## Common Business Rules

- Organizations must exist before profiles or members can be created.
- Operator profiles should be used only for operator-type organizations.
- Market profiles should be used only for market-type organizations.
- Organization-member roles must match organization type.
- Operator-market contracts should only connect valid operator and market organizations.
- Effective date windows should be maintained carefully for contract validity.

## Common Mistakes To Avoid

- creating duplicate organizations for the same company
- using the wrong organization type
- assigning invalid roles to organization members
- mixing supplier organizations into market relationships incorrectly
- leaving expired operator-market contracts active
- using markup and commission logic inconsistently without clear commercial policy

## Quick Training Summary

If a new user needs the shortest explanation, teach them this:

1. `Organizations` define the companies in the ecosystem
2. `Operator Profiles` define how operators work commercially
3. `Market Profiles` define how market partners work commercially
4. `Organization Members` define who belongs to each company
5. `Operator-Market Contracts` define how operators and markets trade with each other

## Screen References

Main business-network screen:

- [business-network-management-view-impl.tsx](/Users/sachinthyarathnavibushana/Documents/MSC%20Project/msc_project/src/modules/business-network/ui/views/business-network-management-view-impl.tsx)

Business-network behavior:

- [use-business-network-management.ts](/Users/sachinthyarathnavibushana/Documents/MSC%20Project/msc_project/src/modules/business-network/lib/use-business-network-management.ts)

Core schemas:

- [business-network-schemas.ts](/Users/sachinthyarathnavibushana/Documents/MSC%20Project/msc_project/src/modules/business-network/shared/business-network-schemas.ts)

Resource list:

- [business-network-management-config.ts](/Users/sachinthyarathnavibushana/Documents/MSC%20Project/msc_project/src/modules/business-network/shared/business-network-management-config.ts)
