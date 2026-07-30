# ADR-001: Canonical Financial Model Architecture & Provider Abstraction Layer

* **Status**: Accepted & Implemented (Phase 6A)
* **Date**: 2026-07-29
* **Authors**: Lead Staff Engineer & Principal Architect, FounderCFO
* **Domain**: `apps/backend/src/integrations/`

---

## 1. Context & Problem Statement

FounderCFO operates as a 24/7 Financial Operating System for Indian startups and SMEs. Downstream core engines (`LiveStateEngine`, `Cashflow OS`, `Decision Lab`, `Daily Brief`, `Action Center`, `AI RAG Vector Store`) require absolute consistency when evaluating financial runway, burn rates, tax exposure, and decision recommendations.

Prior to Phase 6A, external integrations (Razorpay, Zoho, Tally, Quickbooks, Account Aggregators) risk leaking vendor-specific payload structures (e.g. `vpa`, `payment_id`, `journal_entry_id`, `voucher_type`) into business logic.

---

## 2. Decision Outcomes & Guiding Principles

### 2.1 Why Canonical Models Exist
Every external financial provider is transient; vendor APIs, field names, and authentication methods change over time. The FounderCFO Canonical Financial Data Layer is permanent.
By introducing Zod-validated canonical structures (`CanonicalAccount`, `CanonicalTransaction`, `CanonicalInvoice`, `CanonicalVendorBill`, `CanonicalTaxEvent`, `CanonicalSettlement`), we ensure that every financial input is transformed into a single, immutable internal model before it reaches core engines.

### 2.2 Why Providers Are Isolated
Provider adapters encapsulate provider-specific SDKs, HTTP calls, OAuth flows, and payload mapping within `apps/backend/src/integrations/providers/*`.
Core FounderCFO services will never depend on vendor-specific types.

### 2.3 Why Prisma Remained the Persistence Target
Prisma and PostgreSQL already house production-hardened multi-tenant tables (`BankAccount`, `Transaction`, `Invoice`, `StatutoryLiability`, `IntegrationConnection`).
Creating duplicate database tables for canonical objects would introduce unnecessary schema migrations and breaking changes. Instead, Zod Canonical schemas validate in-memory transformations before saving into Prisma, preserving 100% database backwards compatibility.

### 2.4 Why Zod Was Chosen
Zod provides:
1. **Runtime Type Enforcement**: Validates raw payloads at the boundary before processing.
2. **Compile-Time Static Type Inference**: Exports zero-overhead TypeScript types (`z.infer<typeof Schema>`).
3. **Schema Versioning**: Embedded `schemaVersion: "1.0"` support for backwards-compatible evolution.

---

## 3. Architecture Overview & Provider Plug-in Model

```
┌───────────────────────────────────────────────────────────────────┐
│                     EXTERNAL PROVIDERS                            │
│  [ Account Aggregator ] [ Razorpay ] [ Zoho ] [ Tally ] [ Mock ]  │
└─────────────────────────────────┬─────────────────────────────────┘
                                  │ Implement BaseProviderAdapter
                                  ▼
┌───────────────────────────────────────────────────────────────────┐
│                  INTEGRATION REGISTRY SERVICE                     │
│  - NestJS Multi-Provider Injection (INTEGRATION_PROVIDER_TOKEN)   │
│  - Automatic Self-Registration & Health Monitoring                │
└─────────────────────────────────┬─────────────────────────────────┘
                                  │ Emits Canonical Objects
                                  ▼
┌───────────────────────────────────────────────────────────────────┐
│                     ZOD CANONICAL DOMAIN                          │
│  [ CanonicalAccount ] [ CanonicalTransaction ] [ CanonicalInvoice]│
└─────────────────────────────────┬─────────────────────────────────┘
                                  │ Persistence Target
                                  ▼
┌───────────────────────────────────────────────────────────────────┐
│                     PRISMA / POSTGRESQL SSOT                      │
└───────────────────────────────────────────────────────────────────┘
```

### How New Providers Plug Into FounderCFO:
To add a new integration provider (e.g., Stripe, SAP, Xero):
1. Create a new folder under `apps/backend/src/integrations/providers/<provider-name>/`.
2. Implement the `@Injectable()` class implementing `BaseProviderAdapter`.
3. Register the class in `IntegrationsModule` under `INTEGRATION_PROVIDER_TOKEN`.
4. No downstream service (`LiveState`, `Cashflow OS`, `AI`) requires code modification!

---

## 4. Future Roadmap (Phase 6B & Beyond)

- **Phase 6B**: Financial Normalization Layer (Deterministic Fee Extraction, Currency Conversion, Timezone Alignment).
- **Phase 6C**: 5-Tier Reconciliation Engine (Automated Bank vs Invoice vs Gateway Matching).
- **Phase 6D**: Cryptographic Idempotency Vault & Quarantine Subsystem.

---

## 5. Architectural Compliance & Definition of Done Verification

- [x] Zero Prisma DB migrations executed.
- [x] Zero breaking changes to existing endpoints or services.
- [x] Strict Zod schemas + TypeScript type inference established.
- [x] NestJS `IntegrationRegistryService` implemented with dynamic multi-provider discovery.
- [x] `MockProviderAdapter` registered and validated.
- [x] 100% TypeScript compilation pass.
