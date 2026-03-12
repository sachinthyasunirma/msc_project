# 🧾 Tax Module — README

## Tourism Management System Tax Engine

This module provides a **production-grade taxation system** designed for the **tourism industry** (DMCs, tour operators, travel agencies).

It supports:

- Multi-tenant taxation (per company)
- Country / Region / City jurisdiction taxes
- Time-effective tax rates
- Service-based taxation rules
- Customer and traveler classification
- Inclusive & exclusive pricing
- Compound taxes (tax-on-tax)
- Withholding taxes
- Snapshot locking for documents
- Audit-safe invoice calculations

---

# 📐 Architecture Overview
Tax Jurisdiction
↓
Tax Definition
↓
Tax Rate (time based)
↓
Tax Rule (when to apply)
↓
Tax Rule Tax (how to apply)
↓
Document Snapshots
↓
Invoices / Reports


---

# 1️⃣ Business Requirements

Tourism systems must support multiple taxation scenarios:

| Requirement | Supported |
|------------|------------|
| VAT | ✅ |
| Tourism Levy | ✅ |
| Service Charge | ✅ |
| City Tax | ✅ |
| Withholding Tax | ✅ |
| Zero-rated services | ✅ |
| Exempt services | ✅ |
| Multi-country operation | ✅ |
| Time-based rate changes | ✅ |
| Audit-safe invoicing | ✅ |

---

# 2️⃣ Core Concepts

## Tax Jurisdiction
Defines where tax applies.

Examples:

| Code | Country | Region | City |
|------|---------|--------|------|
| LK | LK | null | null |
| LK-WP | LK | Western Province | null |
| LK-WP-CMB | LK | Western Province | Colombo |

Used to determine applicable taxes based on service location.

---

## Tax
Defines the tax type.

Examples:

| Code | Name | Type | Scope |
|------|------|------|------|
| VAT15 | VAT 15% | VAT | OUTPUT |
| TL1 | Tourism Levy | LEVY | OUTPUT |
| SC10 | Service Charge | SERVICE | OUTPUT |
| WHT2 | Withholding | WITHHOLDING | WITHHOLDING |

### Fields

- `taxType`
  - VAT
  - LEVY
  - SERVICE
  - CITY
  - WITHHOLDING
  - OTHER

- `scope`
  - OUTPUT → collected from customer
  - INPUT → supplier tax
  - WITHHOLDING → deducted by client

- `isRecoverable`
  - true when tax becomes receivable (e.g., withholding)

---

## Tax Rate

Stores numeric values of taxes.

Supports:

### Percentage Tax
rateType = PERCENT
ratePercent = 15.0000


### Fixed Amount Tax
rateType = FIXED
rateAmount = 5.00
currencyId = USD


### Time Effectivity

Never modify existing records.

If VAT changes:
OLD: 15% effective 2024
NEW: 18% effective 2026


Create a new row instead.

---

## Tax Rule Set
Logical grouping of rules.

Example:
- DEFAULT_2026
- EU_RULES
- PRE_REFORM

Allows safe migration when tax laws change.

---

## Tax Rule

Defines **WHEN** taxes apply.

Matching criteria:

| Field | Meaning |
|------|---------|
| jurisdictionId | Service location |
| serviceType | TRANSPORT / ACTIVITY / HOTEL |
| customerType | B2C or B2B |
| travelerResidency | LOCAL / FOREIGNER |
| effective dates | validity |
| priority | conflict resolution |

---

## Tax Rule Tax

Defines **HOW** taxes are calculated.

| Field | Purpose |
|------|---------|
| priority | calculation order |
| applyOn | BASE or BASE_PLUS_PREVIOUS |
| isInclusive | tax included in price |
| roundingMode | rounding strategy |
| roundingScale | decimal precision |

---

# 3️⃣ Tax Calculation Logic

## Exclusive Pricing Example
Base Amount = 1000

Service Charge 10% = 100
VAT 15% on (1000 + 100) = 165

Total = 1265


---

## Inclusive Pricing Example
Gross Price = 1150
VAT 15%

Base = 1150 / 1.15 = 1000
VAT = 150


---

## Withholding Tax Example
Base = 100,000
VAT = 15,000
Invoice Total = 115,000

Client deducts WHT 2% = 2,000
Payment Received = 113,000


System records:

- Revenue = 100,000
- VAT Payable = 15,000
- WHT Receivable = 2,000

---

# 4️⃣ Snapshot System (Critical)

Tax rules change over time.  
Invoices must NEVER change.

Therefore snapshots are stored.

---

## document_fx_snapshot

Stores FX rate used during calculation.

Prevents historical recalculation.

---

## document_tax_snapshot

Stores final totals:

- taxableAmount
- taxAmount
- totalAmount
- jurisdiction
- priceMode

Used for invoices and audit.

---

## document_tax_line

Detailed tax breakdown.

Example:

| Tax | Base | Rate | Amount |
|-----|------|------|--------|
| VAT | 1000 | 15% | 150 |
| SC | 1000 | 10% | 100 |

---

# 5️⃣ Tax Application Flow

### Step 1 — Identify Jurisdiction
Based on:
- activity location
- hotel city
- transport origin

### Step 2 — Match Tax Rule
Filter by:
- jurisdiction
- serviceType
- customerType
- travelerResidency
- effective date

### Step 3 — Load Rule Taxes
Sort by priority.

### Step 4 — Load Applicable Tax Rate

Find valid record where:
effectiveFrom <= serviceDate
AND effectiveTo IS NULL OR > serviceDate


### Step 5 — Calculate Taxes
Apply:
- compound logic
- inclusive/exclusive logic
- rounding rules

### Step 6 — Save Snapshot

---

# 6️⃣ Supported Service Types

Recommended values:
TRANSPORT
ACTIVITY
ACCOMMODATION
GUIDE
SUPPLEMENT
MISC
PACKAGE


---

# 7️⃣ Best Practices

✅ Never hardcode tax percentages  
✅ Always use tax_rate table  
✅ Snapshot taxes on document creation  
✅ Calculate tax per line item (not only totals)  
✅ Create new rates instead of updating old ones  

---

# 8️⃣ Validation Rules

- ratePercent required when rateType = PERCENT
- rateAmount required when rateType = FIXED
- effectiveFrom < effectiveTo
- no overlapping tax rates for same jurisdiction
- rule priority must be deterministic

---

# 9️⃣ Example Setup (Sri Lanka)

### Jurisdiction
LK


### Taxes
VAT 15%
Tourism Levy 1%


### Rule
Service Type: ACTIVITY
Customer: B2C
Residency: ANY


### Rule Taxes
| Priority | Tax | Apply On |
|----------|-----|----------|
| 1 | Tourism Levy | BASE |
| 2 | VAT | BASE_PLUS_PREVIOUS |

---

# 🔟 Reporting Capabilities

Supports:

- VAT Output Report
- Zero-Rated Revenue
- Withholding Receivable
- Jurisdiction Tax Summary
- Historical Tax Tracking

---

# 11️⃣ Common Mistakes

❌ Updating tax rate instead of creating new version  
❌ Recalculating old invoices  
❌ Ignoring compound tax order  
❌ Applying tax only at document level  
❌ Forgetting rounding consistency  

---

# 12️⃣ Future Enhancements (Optional)

- Tax exemption certificates
- Supplier tax profiles
- Reverse charge VAT
- Per-service tax overrides
- Government VAT export files

---

# ✅ Summary

This tax engine provides:

- Multi-tenant support
- Jurisdiction-aware taxation
- Time-based compliance
- Compound tax capability
- Invoice-safe snapshots
- Audit readiness


---
