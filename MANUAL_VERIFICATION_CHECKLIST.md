# Obligation Engine Test Plan — Manual Verification Checklist

Everything in `runAllTests.js` (101 tests, 3 suites) runs against a **simulated** GAS environment (`shim/GasShim.js`), not a real Apps Script project. The shim is faithful where it matters most — it reproduces the real Sheets date-coercion bug the fix targets — but it's still a model, not the real thing. Per UEF's convention, this is the checklist for the half automated tests structurally cannot cover. Check these against a real GAS project; don't assume the shim passing means these are also true.

## Sheets behavior
- [ ] `setNumberFormat('@')` on a fresh column, then writing an ISO date string via `appendRow`/`setValues`, actually keeps it a string when read back — confirm in the real spreadsheet, not just in this shim's simulation of that behavior.
- [ ] `setFrozenRows(1)` visibly freezes the header row in the real Sheets UI, on both a brand-new sheet and one of the three sheets that already existed before this fix landed.
- [ ] A genuine schema-drift scenario (manually add/reorder/rename a column header in the real sheet) actually throws from `ensureSheetSchema_` on the next run, rather than silently corrupting data.

## Concurrency
- [ ] `LockService.getScriptLock()` behaves correctly under **real concurrent execution** — e.g., two `/property_paid` requests for the same Occurrence arriving close together. The shim's fake lock always succeeds instantly and never models contention, so this path has zero real coverage yet.
- [ ] `LOCK_TIMEOUT` (30s) is a reasonable real-world value — this was picked without load-testing against actual GAS execution latency.

## Caching
- [ ] `CacheService`'s real 1-hour TTL for `ClientRequestID` idempotency actually expires as expected — the shim's fake cache never expires anything within a single test run, so TTL behavior itself is unverified.

## Timezone & date formatting
- [ ] `Utilities.formatDate` / `Session.getScriptTimeZone()` against the **real** configured script timezone (assumed `Asia/Kuala_Lumpur` in this shim) — if the real project's timezone setting differs, every `toIsoDate_` call shifts.

## Runtime limits
- [ ] GAS's 6-minute execution ceiling — untestable in Node by construction. `queryUpcomingPayments`/`queryOverdue`'s full-column linear scans are the most likely to matter here as row counts grow; no real data volume to check this against yet.
- [ ] GAS's 20-trigger hard quota — not exercised by this Test Plan since Property OS is designed to never create a trigger in the first place (ADR-P02/§3.5); worth a real-project sanity check that nothing here accidentally creates one.

## Not yet applicable (blocked on other Phases, not on this checklist)
- Real `publishPropertyEvent_()` wiring (ADR-P07 — deliberately still a placeholder)
- Real Reminder OS integration (`ReminderConnector` API coverage — TECH DEBT #1)
- Real Finance Engine subscription to `PAYMENT_COMPLETED` (914 not built yet)
- `propertyExists_()` against a real Properties table (910 not built yet)

---
*Run `node runAllTests.js` from `property-os-tests/` for the automated half. This file is the other half — check it against the real GAS project, then update it in place (check the boxes, don't just note "done" elsewhere) so it stays a source of truth.*
