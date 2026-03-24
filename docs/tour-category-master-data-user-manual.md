# Tour Category Master Data User Manual

## Purpose

The Tour Category master data area is used to classify tour products and define the commercial and operational rules that should apply to each kind of tour.

This module is the source of truth for:

- tour classification dimensions
- reusable tour category values
- business rules tied to those categories
- default markup guidance
- accommodation and transport expectations
- planning requirements for itinerary, activities, guides, and ceremonies

In production, this module helps the business keep quotations and pre-tour planning aligned with the type of product being sold.

## Where To Access

Open:

- `Master Data`
- `Tour Categories`

The screen is organized into three tabs:

1. `Tour Category Types`
2. `Tour Categories`
3. `Tour Category Rules`

## Why This Module Matters

Tour Categories are not just labels for reporting.

In real operations, categories answer questions such as:

- Is this a `Luxury` tour or a `Budget` tour?
- Is this mainly `Wildlife`, `Culture`, or `Adventure`?
- Is this product for `Family`, `Honeymoon`, or `Wedding` travel?
- Must this kind of tour include transport?
- Must this kind of tour include hotel?
- Should this category always use a certified guide?
- Is there a default commercial markup expectation for this category?

Without proper category rules:

- quotations become inconsistent
- operations may miss required components
- different team members may build the same product differently
- pricing governance becomes weak

## Recommended Setup Sequence

For production-quality setup, use this order:

1. Create `Tour Category Types`
2. Create `Tour Categories` under each type
3. Decide which categories need operational rules
4. Create `Tour Category Rules`
5. Review the rules with sales and operations together

This sequence keeps the data model clean and avoids rule records being created against unclear category structures.

## Core Business Concept

This module has three layers:

### 1. Tour Category Type

A type is a classification dimension.

Examples:

- `Theme`
- `Travel Style`
- `Occasion`
- `Comfort Level`
- `Audience`

### 2. Tour Category

A category is a value inside a type.

Examples:

- Under `Theme`: `Wildlife`, `Culture`, `Adventure`
- Under `Travel Style`: `Luxury`, `Standard`, `Budget`
- Under `Occasion`: `Honeymoon`, `Wedding`

### 3. Tour Category Rule

A rule defines the business expectations for a specific category.

Examples:

- `Luxury` should require hotel, transport, and itinerary
- `Adventure` should require activity and certified guide
- `Wedding` should require ceremony

## 1. Tour Category Types

### Business Purpose

Tour Category Types define how the company organizes tour products.

They are the top-level grouping layer used before individual category values are added.

### Key Fields

- `Code`: unique code for the type
- `Name`: business label of the type
- `Allow Multiple`: whether more than one category from this type can be used together
- `Description`
- `Sort Order`
- `Is Active`

### Real-World Meaning Of `Allow Multiple`

This is one of the most important business settings.

If `Allow Multiple = No`:

- only one category from that type should be selected at a time
- example: a tour should normally have only one `Travel Style`, such as `Luxury` or `Budget`

If `Allow Multiple = Yes`:

- multiple categories from that type can be used together
- example: a tour can be both `Wildlife` and `Culture` under the `Theme` type

### Example Type Setup

| Code | Name | Allow Multiple | Business Meaning |
| --- | --- | --- | --- |
| `THEME` | Theme | Yes | A tour can combine more than one theme |
| `TRAVEL_STYLE` | Travel Style | No | A tour should usually have one main style |
| `OCCASION` | Occasion | Yes | Some tours can be both family and celebration-oriented |
| `COMFORT` | Comfort Level | No | A tour should normally have one comfort positioning |

### Best Practice

- Use stable, business-friendly codes.
- Keep the number of types small and meaningful.
- Avoid overlapping types that ask the same business question.

## 2. Tour Categories

### Business Purpose

Tour Categories are the actual reusable values selected by users when classifying a tour.

Each category must belong to one type.

### Key Fields

- `Code`
- `Type`
- `Name`
- `Description`
- `Parent Category`
- `Icon`
- `Color`
- `Sort Order`
- `Is Active`

### Parent Category

`Parent Category` is optional. It can be used when a company wants a hierarchy.

Example:

- `Adventure`
  - `Soft Adventure`
  - `Hard Adventure`

This is useful for organization and display, but the business should keep hierarchy simple.

### Real-World Examples

#### Theme Categories

- `WILDLIFE`
- `CULTURE`
- `ADVENTURE`
- `BEACH`
- `NATURE`

#### Travel Style Categories

- `LUXURY`
- `STANDARD`
- `BUDGET`

#### Occasion Categories

- `HONEYMOON`
- `WEDDING`
- `FAMILY`
- `CORPORATE`

### Good Practice

- Do not create duplicate meanings with different names.
- Keep names easy for sales and operations to understand.
- Use `Is Active = No` instead of deleting categories already used by tours.

## 3. Tour Category Rules

### Business Purpose

Tour Category Rules convert category labels into real business behavior.

This is the part that makes the module useful for production.

Instead of only saying a tour is `Luxury` or `Adventure`, the company can define what that means operationally and commercially.

### Key Fields

- `Code`
- `Category`
- `Default Markup Percent`
- `Restrict Hotel Star Min`
- `Restrict Hotel Star Max`
- `Require Certified Guide`
- `Require Hotel`
- `Require Transport`
- `Require Itinerary`
- `Require Activity`
- `Require Ceremony`
- `Allow Multiple Hotels`
- `Allow Without Hotel`
- `Allow Without Transport`
- `Min Nights`
- `Max Nights`
- `Min Days`
- `Max Days`
- `Notes`
- `Is Active`

### Real-World Meaning Of Main Rule Fields

#### `Default Markup Percent`

This is a commercial guidance rule.

Example:

- `Luxury` tours may target `20%`
- `Budget` tours may target `10%`
- `Wedding` tours may target `25%`

It does not replace full pricing logic, but it gives the business a standard expectation.

#### `Restrict Hotel Star Min / Max`

This is a product-positioning rule.

Examples:

- `Luxury`: min 4, max 5
- `Budget`: min 2, max 3
- `Standard`: min 3, max 4

This helps sales and operations keep hotel selection aligned with the promised product style.

#### `Require Certified Guide`

Useful for:

- adventure products
- specialist cultural interpretation
- protected-area tours
- regulated destinations

#### `Require Hotel`

If true, this category should not be planned as a hotel-free product.

Useful for:

- luxury round tours
- honeymoon programs
- multi-day leisure products

#### `Require Transport`

If true, the tour should not be quoted without transport planning.

Useful for:

- round tours
- airport transfer programs
- wedding or VIP movement handling

#### `Require Itinerary`

This is a planning quality rule.

Useful when the company wants all tours in that category to include a structured day-by-day plan.

#### `Require Activity`

Useful for:

- adventure
- wildlife
- experience-led products

#### `Require Ceremony`

Useful for:

- weddings
- blessings
- vow renewal
- special-event tours

#### `Allow Multiple Hotels`

If true, the category can reasonably use several hotels in one trip.

Example:

- round tours often use multiple hotels
- city breaks may use only one hotel

#### `Allow Without Hotel`

Useful for:

- day tours
- local excursions
- event transfers

If the category absolutely requires hotel, this should be `No`.

#### `Allow Without Transport`

Useful for:

- self-drive or walkable city packages
- hotel-only products

If the category requires transport, this should be `No`.

#### `Min / Max Nights` and `Min / Max Days`

These fields help control whether a category makes sense for short, medium, or long programs.

Examples:

- `Wedding`: minimum 2 nights
- `Luxury Round Tour`: minimum 4 nights
- `Day Excursion`: maximum 0 nights, maximum 1 day

## Validation Rules In This Application

The application already enforces some important rule logic:

- `Hotel Star Min` cannot be greater than `Hotel Star Max`
- `Min Nights` cannot be greater than `Max Nights`
- `Min Days` cannot be greater than `Max Days`
- if `Require Hotel = Yes`, `Allow Without Hotel` should not be used
- if `Require Transport = Yes`, `Allow Without Transport` should not be used

These validations help prevent contradictory configuration.

## Example Production Dataset

### Example 1: Tour Category Types

| Code | Name | Allow Multiple | Description |
| --- | --- | --- | --- |
| `THEME` | Theme | Yes | Main experience themes |
| `TRAVEL_STYLE` | Travel Style | No | Commercial positioning of the tour |
| `OCCASION` | Occasion | Yes | Special intent or event context |

### Example 2: Tour Categories

| Code | Type | Name | Parent | Description |
| --- | --- | --- | --- | --- |
| `WILDLIFE` | `THEME` | Wildlife | - | Safari, birding, nature viewing |
| `CULTURE` | `THEME` | Culture | - | Heritage, temples, museums |
| `ADVENTURE` | `THEME` | Adventure | - | Trekking, rafting, active experiences |
| `LUXURY` | `TRAVEL_STYLE` | Luxury | - | Premium hotels and premium service |
| `STANDARD` | `TRAVEL_STYLE` | Standard | - | Mid-market comfortable travel |
| `BUDGET` | `TRAVEL_STYLE` | Budget | - | Value-driven programs |
| `HONEYMOON` | `OCCASION` | Honeymoon | - | Romantic couple-focused travel |
| `WEDDING` | `OCCASION` | Wedding | - | Ceremony or vow-related travel |

### Example 3: Tour Category Rules

| Code | Category | Main Rule Setup |
| --- | --- | --- |
| `RULE-LUXURY` | `LUXURY` | Markup 20%, hotel required, transport required, itinerary required, hotel stars 4-5, multiple hotels allowed |
| `RULE-ADVENTURE` | `ADVENTURE` | Certified guide required, activity required, transport required, days 1-10 |
| `RULE-WEDDING` | `WEDDING` | Ceremony required, hotel required, transport required, min nights 2 |
| `RULE-BUDGET` | `BUDGET` | Markup 10%, hotel stars 2-3, allow without hotel yes, allow without transport yes |

## Real-World Scenarios

### Scenario 1: Luxury Honeymoon Tour

Selected categories:

- `Travel Style`: `Luxury`
- `Occasion`: `Honeymoon`
- `Theme`: `Culture`

What the business expects:

- premium hotels
- private transport
- full itinerary
- suitable markup level

Recommended rule outcome:

- hotel required
- transport required
- itinerary required
- hotel stars 4 to 5
- multiple hotels allowed for a round trip

### Scenario 2: Adventure Day Excursion

Selected categories:

- `Theme`: `Adventure`

What the business expects:

- at least one activity
- guide should be certified if the activity risk level requires it
- transport should normally exist

Recommended rule outcome:

- require activity = yes
- require certified guide = yes
- require transport = yes
- max nights = 0
- max days = 1

### Scenario 3: Wedding Destination Package

Selected categories:

- `Occasion`: `Wedding`
- `Travel Style`: `Luxury`

What the business expects:

- ceremony handling
- accommodation
- transport coordination
- strong markup control

Recommended rule outcome:

- require ceremony = yes
- require hotel = yes
- require transport = yes
- min nights = 2
- default markup = 25%

### Scenario 4: Budget City Break

Selected categories:

- `Travel Style`: `Budget`
- `Theme`: `Culture`

What the business expects:

- lower hotel requirement
- smaller markup
- simplified service pattern

Recommended rule outcome:

- default markup = 10%
- hotel stars 2 to 3
- allow without transport = yes
- allow without hotel = yes for local or excursion-only variants

## How This Should Be Used In The Business

### Sales Team

Sales should use categories to position the product correctly before building a quotation.

Example:

- if the client asks for a luxury honeymoon, sales should not classify it as `Budget`

### Product Team

Product and contracting teams should use category rules to standardize what a product must contain.

Example:

- if `Luxury` requires 4-5 star hotels, product design should not include 3-star hotels

### Operations Team

Operations should use the category meaning to understand service level expectations.

Example:

- `Wedding` and `Luxury` products normally need tighter transport and hotel coordination

### Management

Management can use these master records to reduce inconsistency across quotations and departments.

## Common Mistakes To Avoid

- creating too many category types with overlapping meaning
- mixing theme and travel-style concepts in the same type
- creating categories without agreeing business meaning first
- using rules that contradict each other
- setting `Require Hotel = Yes` but also allowing hotel-free use
- setting star restrictions that do not match the real product promise
- copying marketing labels into master data without operational value

## Recommended Governance

- Sales and Product teams should agree category meanings together.
- Commercial owners should approve default markup guidance.
- Operations should review any category that requires guide, transport, or ceremony.
- Do not let every user create new categories without governance.

## Quick Training Summary

If a new team member reads only one summary, it should be this:

- `Tour Category Types` define the classification questions
- `Tour Categories` define the selectable business answers
- `Tour Category Rules` define what those answers mean in pricing and operations

This module helps the company turn category labels into real business standards.

## Screen References

- [tour-category-management-view-impl.tsx](/Users/sachinthyarathnavibushana/Documents/MSC%20Project/msc_project/src/modules/tour-category/ui/views/tour-category-management-view-impl.tsx)
- [tour-category-schemas.ts](/Users/sachinthyarathnavibushana/Documents/MSC%20Project/msc_project/src/modules/tour-category/shared/tour-category-schemas.ts)
- [use-tour-category-management.ts](/Users/sachinthyarathnavibushana/Documents/MSC%20Project/msc_project/src/modules/tour-category/lib/use-tour-category-management.ts)
