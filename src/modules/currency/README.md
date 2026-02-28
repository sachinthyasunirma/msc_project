# Money Module (Currency + FX) — Requirements & User Guide

This module provides:
- Currency master data per company (multi-tenant)
- FX providers (manual or external sources)
- Exchange rates (time-effective)
- Money settings (base currency, tax/price mode, FX selection strategy)

It supports pricing and billing for a tourism management system:
- Pre-tour plans / quotations
- Bookings and operations
- Invoices and payments
- Multi-currency reporting and supplier costing

---

## 1. Business Requirements (Tourism Industry)

### 1.1 Currency Master
The system must support multiple currencies because:
- Customers/agents request quotations in USD/EUR/GBP, etc.
- Suppliers may bill in a local currency while sales currency differs
- Financial reports require consistent base currency consolidation

Each company can maintain its own currency list and rounding rules.

**Key rules**
- Currency `code` must be ISO 4217 (e.g., USD, EUR, LKR)
- Code must be unique per company
- Store currency rounding behavior (minor units + rounding mode/scale)
- Allow deactivation of currencies (for historical preservation)

### 1.2 FX Providers
FX rates can come from:
- Manual entry (most common early stage)
- External providers (OpenExchangeRates, XE, Central Bank feed, etc.)
- Custom contracted bank rates

The system supports multiple providers per company.

### 1.3 Exchange Rates
The system must store exchange rates with:
- Base currency + quote currency pair
- Rate value with high precision (18,8)
- As-of timestamp (`asOf`) and optional `effectiveTo`
- Rate type (MID/BUY/SELL)

**Purpose**
- Use exchange rates to convert amounts from one currency to another for:
  - Quotations
  - Booking totals
  - Invoicing totals
  - Cost vs sell margin reports

### 1.4 Money Settings
A company must set:
- Base currency (for internal accounting and consolidated reporting)
- Price mode (EXCLUSIVE/INCLUSIVE) — whether prices stored are tax-inclusive
- FX rate source strategy (LATEST / DATE_OF_SERVICE / DATE_OF_BOOKING)

---

## 2. Database Entities (Drizzle Schemas)

### 2.1 currency
Stores master currency data per company.

Required fields:
- companyId
- code (ISO)
- name
- minorUnit (default 2)
- roundingMode (default HALF_UP)
- roundingScale (default 2)
- isActive (default true)

Optional:
- symbol
- numericCode (ISO numeric)
- metadata JSON

Uniqueness:
- `uq_currency_company_code (companyId, code)`

### 2.2 fx_provider
Stores FX providers (manual/external) per company.

Uniqueness:
- `uq_fx_provider_company_code (companyId, code)`

### 2.3 exchange_rate
Stores rates: 1 baseCurrency = rate quoteCurrency

Recommended meaning:
- If base=USD and quote=LKR and rate=300,
  then 1 USD = 300 LKR.

Key fields:
- baseCurrencyId
- quoteCurrencyId
- rate
- asOf (start of validity)
- effectiveTo (optional end of validity)
- rateType (MID default)

Uniqueness:
- Current schema: `uq_exchange_rate_company_code (companyId, code)`
  > NOTE: For production quality, also ensure uniqueness by pair+time+type (see section 9).

### 2.4 money_setting
Stores company-level financial defaults.

Key fields:
- baseCurrencyId
- priceMode (EXCLUSIVE default)
- fxRateSource (LATEST default)

Uniqueness:
- `uq_money_setting_company_code (companyId, code)`

---

## 3. UI / Data Entry Guide (How to Insert Correct Data)

### 3.1 Add Currency (Currency Master)
**Fields**
- Code: Use ISO 4217 (e.g., LKR, USD, EUR)
- Name: Full name (e.g., Sri Lankan Rupee)
- Symbol: Optional (e.g., Rs, $, €)
- Numeric Code: ISO numeric (optional)
- Minor Unit: Decimal places (USD=2, JPY=0)
- Rounding Mode: Use HALF_UP for most tourism invoicing
- Rounding Scale: Typically same as Minor Unit
- Metadata JSON: Optional, must be valid JSON
- Active: ON for selectable currencies

**Example: LKR**
- Code: LKR
- Name: Sri Lankan Rupee
- Symbol: Rs
- Numeric Code: 144
- Minor Unit: 2
- Rounding Mode: HALF_UP
- Rounding Scale: 2
- Active: true

**Common mistakes**
- Using country code instead of currency code (SL instead of LKR)
- Invalid JSON in metadata
- Using non-unique code within the same company

### 3.2 Add FX Provider
Create at least one provider:
- Code: MANUAL
- Name: Manual Rates

Later you can add:
- Code: OXR
- Name: OpenExchangeRates

### 3.3 Add Exchange Rate
**Rate meaning**
- base -> quote
- 1 base = rate quote

Example: USD -> LKR
- Base Currency: USD
- Quote Currency: LKR
- Rate: 300.00000000
- Rate Type: MID
- As Of: 2026-02-28 00:00
- Effective To: null (optional)

**Best practice**
- Insert new rate daily (or hourly) with new `asOf`.
- Optionally close old rate by setting `effectiveTo` to new rate's `asOf`.

### 3.4 Money Setting
For each company, create one active money setting:
- Code: DEFAULT
- Base Currency: LKR (or your accounting currency)
- Price Mode: EXCLUSIVE (recommended)
- FX Rate Source:
  - LATEST (simple)
  - DATE_OF_SERVICE (most accurate for travel)
  - DATE_OF_BOOKING (common for invoice locking)

---

## 4. Production Flow (How system uses money data)

### 4.1 Quotation / Pre-tour plan
Inputs:
- customer currency (e.g., USD)
- company base currency (e.g., LKR)
- service date or booking date

Steps:
1. Build itinerary items (activity/transport/hotel/guide/misc)
2. Price each item in its native currency (supplier or base)
3. Convert to quotation currency using FX strategy
4. Round using target currency rounding settings
5. Store FX snapshot (rate used and asOf) on the plan/quote

### 4.2 Booking (Locking)
Once customer approves:
- Freeze totals and FX snapshot
- Later rate changes must NOT change the booking totals

### 4.3 Invoice
Invoice must use:
- Stored snapshot FX rate
- Stored tax snapshot rules
So invoices remain legally consistent.

---

## 5. Rounding Rules (Very important)
Rounding must be applied consistently:
- Use `currency.roundingMode` and `currency.roundingScale` on final amounts
- Avoid rounding every intermediate step (round at line total and document total)

Recommended practice:
- Keep calculations in high precision
- Round only:
  - per line item totals
  - invoice grand totals
  - tax lines as per invoice rules

---

## 6. FX Selection Strategy (fxRateSource)
`money_setting.fxRateSource` determines which exchange rate to use:

- LATEST:
  - Use most recent active rate for pair
  - Easiest for sales quoting

- DATE_OF_SERVICE:
  - Use rate closest to service date (tour date)
  - Most accurate for travel companies with future-dated services

- DATE_OF_BOOKING:
  - Use rate valid at the time booking is confirmed
  - Aligns with booking locking policies

---

## 7. Recommended Seed Data (per company)

### 7.1 Currencies
- LKR, USD, EUR, GBP, AUD (depending on market)

### 7.2 FX Provider
- MANUAL

### 7.3 Money Setting
- DEFAULT, baseCurrency = LKR, priceMode = EXCLUSIVE, fxRateSource = DATE_OF_BOOKING or DATE_OF_SERVICE

---

## 8. Data Validation Requirements (API Layer)
Enforce these validations in service layer:
- currency.code must be uppercase ISO 4217, length=3
- minorUnit >= 0 and <= 6
- roundingScale >= 0 and <= 6
- exchangeRate.rate > 0
- baseCurrencyId != quoteCurrencyId
- asOf < effectiveTo (if effectiveTo provided)
- isActive only one DEFAULT setting per company (recommended)

---

## 9. Production Improvements (Strongly Recommended)
Your current `exchange_rate` unique key is `(companyId, code)`.
For real-world correctness, add uniqueness for rate time series:

**Recommended unique index**
- (companyId, providerId, baseCurrencyId, quoteCurrencyId, rateType, asOf)

This prevents duplicates for the same timestamp and pair.

Also consider generating `exchange_rate.code` automatically:
- e.g., `${baseCode}_${quoteCode}_${rateType}_${asOfISO}`

---

## 10. Example: How to Quote USD for a LKR-based Company
Company base currency: LKR  
Quote currency: USD  
Service item priced in LKR: 150,000.00  
FX: 1 USD = 300 LKR

Convert:
- USD = 150,000 / 300 = 500.00
Round to USD scale 2 => 500.00

Store snapshot:
- base=LKR quote=USD rate=0.00333333 OR store USD->LKR and invert at runtime
- asOf=2026-02-28
- provider=MANUAL

---

## 11. Troubleshooting

### Currency not visible in dropdown
- isActive must be true
- currency must belong to same companyId as current user

### Exchange rate not found
- Ensure base/quote pair exists
- Ensure asOf date is before requested date and not expired (effectiveTo)
- Ensure isActive = true

### Totals differ due to rounding
- Confirm roundingScale for the target currency
- Ensure rounding applied only at intended steps