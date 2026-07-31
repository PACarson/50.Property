# Property Asset Engine — Vertical Slice (Contract Design)

**Module:** `910_PropertyAssetEngine`
**Status:** Contract Design — **AWAITING REVIEW APPROVAL**, no Runtime code exists.
**Scope note:** Deliberately lighter than the Obligation Engine Vertical Slice — Property is a single Aggregate with no internal sub-entity (no Rule/Occurrence split), no recurring schedule, no Scheduler counterpart. Sections that would be near-duplicates of already-approved decisions (Lock/idempotency pattern, Adapter isolation, event envelope shape) are referenced, not re-derived.

---

## 1. Business Rules

- `PropertyName`, `Address` required, non-empty.
- `PurchasePrice > 0`.
- `CurrentValue` optional at creation; **defaults to `PurchasePrice`** if omitted (a property's value is its purchase price until someone records an update — never null, never a guess this module invents).
- `FreeholdLeasehold ∈ {Freehold, Leasehold}`.
- `PropertyType` — **[NEEDS CONFIRMATION]** doc1 lists the field but never enumerates values. Proposed: `{ResidentialCondo, ResidentialLanded, Commercial, Industrial, Land}`, matching Malaysian property categories used elsewhere in this spec (Quit Rent/Assessment context). Confirm or replace before Runtime.
- `LoanID` — optional FK. **915_MortgageEngine doesn't exist yet** (Phase 2). Same pattern as 912's `propertyExists_()`: format-only validation now, real existence check deferred, isolated so only one function changes later (see §8).
- A **Sold** Property is not deleted — historical Obligation/Maintenance/Document rows referencing it must stay queryable (P3, and simply good sense for tax records).

## 2. Truth Layer Schema

### Entity: `Property` (Aggregate Root, no internal sub-entities)

| Field | Type | Notes |
|---|---|---|
| PropertyID | string (PK) | `PROP-{ts36}-{rand4}` |
| PropertyName | string | required |
| Developer | string | optional |
| Address | Address (VO) | **[DEVIATION FROM doc1 — flagged]** doc1 lists a flat `Address` field; this uses the structured `Address` Value Object already defined in `PropertyOS_DomainModel.md` §4 (`{line1, line2, city, state, postcode, country}`) instead, so Property OS has exactly one addressing scheme, not two. Stored as columns `AddressLine1, AddressLine2, AddressCity, AddressState, AddressPostcode, AddressCountry` (Sheets has no nested-object cell type). Confirm or revert to a single flat string before Runtime. |
| GPS | string | `"lat,lng"`, optional |
| PurchaseDate | ISO date | required |
| PurchasePrice | number | required, > 0 |
| CurrentValue | number | defaults to PurchasePrice |
| LoanID | string, optional FK | format-checked only (see §1) |
| BuiltUp | number | sqft, optional |
| LandSize | number | sqft, optional |
| FreeholdLeasehold | enum | Freehold / Leasehold |
| Parking | number | optional |
| StoreRoom | boolean | optional |
| CompletionDate | ISO date, optional | for under-construction purchases |
| VPDate | ISO date, optional | Vacant Possession date |
| DefectExpiry | ISO date, optional | Defect Liability Period end — feeds 918 (Phase 3) |
| Status | enum | Active / Sold |
| SoldDate | ISO date, optional | set only via MarkPropertySold |
| SoldPrice | number, optional | set only via MarkPropertySold |
| Owner | string, optional | single string for now — Constitution already notes multi-owner is reserved, not built |
| PropertyType | enum | see §1 |
| CreatedAt / UpdatedAt | datetime | |

**Validation:** `PurchasePrice > 0`; `FreeholdLeasehold`/`PropertyType`/`Status` must be in their enums.
**Index:** Status, PropertyType.
**dateColumns (plain-text protection, same fix as Obligation's):** PurchaseDate, CompletionDate, VPDate, DefectExpiry, SoldDate, CreatedAt, UpdatedAt.

## 3. Domain Model

- **Aggregate Root:** `Property`. No internal Entity — simpler than Obligation's Rule+Occurrence split because there's no recurring-instance concept here.
- **Value Objects reused (no new ones needed):** `Money` (PurchasePrice/CurrentValue/SoldPrice), `Address` (see §2 deviation note), `GeoPoint` — **not used**; GPS stays a plain string per doc1 rather than adopting the `GeoPoint{lat,lng}` VO, since nothing yet needs to do math on it (avoid Speculative Design; revisit if that changes).
- **Invariant:** `Status = Sold` is reached only via `MarkPropertySold`, and is reversible **only** via `ReversePropertySale` — this directly mirrors the Obligation Occurrence's Paid⇄Active exception (ADR-P06/P10), because a property sale falling through before completion is exactly as real a "compensating event" scenario as a mis-recorded payment. Not treated as a new decision — this is P10 applied, not a new pattern.
- **Ownership:** `910_PropertyAssetEngine` is the sole writer (P3). Every other Engine that references `PropertyID` (912 already does; 915/916/917/918/919/920/921 will) treats it as a read-only foreign key.
- **Boundary:** Property's Aggregate boundary stops at the property record itself. Financial performance (ROI, cashflow) is Finance Engine's (914) territory, computed from Ledger + this Property's PurchasePrice/CurrentValue via Query, not stored here.

## 4. Event Contract

| Event | Payload | Producer | Consumer |
|---|---|---|---|
| `PROPERTY_CREATED` | `{propertyId, propertyName, status}` | 910 | 922(Dashboard), 930(Knowledge Graph, Phase 4) |
| `PROPERTY_UPDATED` | `{propertyId, changedFields}` | 910 | 922 |
| `PROPERTY_SOLD` | `{propertyId, soldDate, soldPrice}` | 910 | 922, 914(Finance — capital gain input, Phase 1 pending) |
| `PROPERTY_SALE_REVERSED` | `{propertyId, originalEventId, reason}` | 910 | 922 |

All four go through `publishPropertyEvent_()` — the same ADR-P07 Adapter 912/913 already use. No new infrastructure decision here.

## 5. Command Contract

| Command | Input | Validation | Error | Idempotency |
|---|---|---|---|---|
| `CreateProperty` | PropertyName, Address, PurchaseDate, PurchasePrice, FreeholdLeasehold, PropertyType, ... (optional fields per §2) | §1 | `INVALID_INPUT`, `INVALID_PROPERTY_TYPE` | `ClientRequestID` — same CacheService pattern as `createObligation` |
| `UpdateProperty` | PropertyID, changedFields | Cannot change PropertyID/Status/CreatedAt via this path (same denied-fields pattern as `updateObligation`); cannot update a Sold property | `PROPERTY_NOT_FOUND`, `PROPERTY_IMMUTABLE`, `INVALID_INPUT` | natural |
| `MarkPropertySold` | PropertyID, soldDate, soldPrice | Property must be Active | `PROPERTY_NOT_FOUND`, `ALREADY_SOLD` | natural (keyed on PropertyID + Status check) |
| `ReversePropertySale` | PropertyID, reason | Property must be Sold | `PROPERTY_NOT_FOUND`, `PROPERTY_NOT_SOLD` | natural |

## 6. State Machine

```
Active → Sold          [normal path]
Sold → Active           [ONLY via ReversePropertySale — mirrors Occurrence's
                          Paid→Active exception, ADR-P06/P10]
```
Forbidden: any other transition. No `Draft`/`Suspended`/`Completed` — Property doesn't need Obligation's richer lifecycle; adding states nothing currently needs would be Speculative Design.

## 7. Error Strategy

Same shape as Obligation Engine's (§11 there): Commands fail all-or-nothing, no partial writes; `MarkPropertySold` on an already-Sold property is a named error (`ALREADY_SOLD`), not a silent no-op, because — unlike a duplicate payment — a duplicate sale-recording is more likely a real mistake worth surfacing than a harmless retry.

## 8. Cross-Engine Placeholder — closes a loop from the Obligation Engine

`912_ObligationEngine.propertyExists_()` has been a permissive placeholder (`return true`) since Session 1, explicitly waiting for 910 to exist. **Once 910's Runtime lands, this is the one function that gets wired to a real lookup** — exactly the ADR-P07 promise. Flagging now so it's not forgotten once 910 code is written; not re-litigating the pattern itself.

## 9. Self-Review

| Check | Result |
|---|---|
| Follows Constitution/Blueprint/UEF | ✅ |
| Event Driven, no direct Truth writes | ✅ |
| ADR-P01 (Single Owner) | ✅ Property owns its own record; doesn't reach into Loan/Obligation |
| ADR-P06/P10 (Event Immutability) | ✅ Sold→Active only via compensating Command, same shape as ReversePayment |
| ADR-P07 (Adapter isolation) | ✅ Same `publishPropertyEvent_()`, no new infra decision; LoanID existence check isolated the same way PropertyID's was |
| Avoids Speculative Design | ✅ No GPS math, no multi-owner structure, no extra lifecycle states — all explicitly deferred with a reason, not silently added |

**Open items needing CC's confirmation before Runtime (all in §1/§2):**
1. `PropertyType` enum values (proposed above)
2. Structured `Address` VO vs. doc1's flat string field

---

*Two open items, both small and localized. Once confirmed, Runtime for 910 follows the same pattern as 912/913 — Command handlers, State Machine guards, Node sandbox tests, then GAS-native tests against the same dedicated test spreadsheet.*
