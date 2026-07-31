# Obligation Engine Test Plan — Manual Verification Checklist

Everything in `runAllTests.js` (101 tests, 3 suites) runs against a **simulated** GAS environment (`shim/GasShim.js`), not a real Apps Script project. The shim is faithful where it matters most — it reproduces the real Sheets date-coercion bug the fix targets — but it's still a model, not the real thing. Per UEF's convention, this is the checklist for the half automated tests structurally cannot cover. Check these against a real GAS project; don't assume the shim passing means these are also true.

## Sheets behavior
- [x] `setNumberFormat('@')` on a fresh column, then writing an ISO date string via `appendRow`/`setValues`, actually keeps it a string when read back — **confirmed 2026-07-29**, `991_Tests_ObligationEngine.js` run against a real dedicated test spreadsheet, all 9 tests passing including this one.
- [x] `setFrozenRows(1)` visibly freezes the header row in the real Sheets UI, on both a brand-new sheet and one of the three sheets that already existed before this fix landed — **confirmed 2026-07-29**, same run (`getFrozenRows()` checked programmatically; CC additionally has visual access to the real sheet to eyeball it).
- [ ] A genuine schema-drift scenario (manually add/reorder/rename a column header in the real sheet) actually throws from `ensureSheetSchema_` on the next run, rather than silently corrupting data. **Not covered by 991's 9 tests** — the Node sandbox's `900_Tests_Foundation.js` proves this in simulation only.

## Concurrency
- [ ] `LockService.getScriptLock()` behaves correctly under **real concurrent execution** — e.g., two `/property_paid` requests for the same Occurrence arriving close together. 991's real-GAS run confirms the lock doesn't *break* normal, non-contended execution, but genuine concurrent contention still has zero real coverage — that needs two overlapping executions, which a single manual test run doesn't produce.
- [ ] `LOCK_TIMEOUT` (30s) is a reasonable real-world value — still unverified either way.

## Caching
- [ ] `CacheService`'s real 1-hour TTL for `ClientRequestID` idempotency actually expires as expected. 991 confirms idempotency **works within a run** (real cache, real hit); it does not confirm the TTL **expires** correctly, since that needs waiting an hour mid-test.

## Timezone & date formatting
- [x] `Utilities.formatDate` / `Session.getScriptTimeZone()` against the real configured script timezone — **implicitly confirmed 2026-07-29**: 991's date-math assertions (e.g. the Jan 31 → Feb 28 month-end clamp) passed against whatever timezone CC's actual test project is configured for, not an assumed one.

## Runtime limits
- [ ] GAS's 6-minute execution ceiling — still untestable without real data volume; `queryUpcomingPayments`/`queryOverdue`'s linear scans remain the most likely concern as row counts grow.
- [ ] GAS's 20-trigger hard quota — not exercised; still just "the design never creates one," not empirically confirmed nothing else in the project already does.

## Not yet applicable (blocked on other Phases, not on this checklist)
- Real `publishPropertyEvent_()` wiring (ADR-P07 — deliberately still a placeholder)
- Real Reminder OS integration (`ReminderConnector` API coverage — TECH DEBT #1)
- Real Finance Engine subscription to `PAYMENT_COMPLETED` (914 not built yet)
- `propertyExists_()` against a real Properties table (910 not built yet)

---
*Run `node runAllTests.js` from `property-os-tests/` for the automated half. This file is the other half — check it against the real GAS project, then update it in place (check the boxes, don't just note "done" elsewhere) so it stays a source of truth.*
