# Obligation Engine Test Plan — Manual Verification Checklist

`995_RunAllTests.js` (99 tests across 990-995) runs on the real Apps Script runtime — real `SpreadsheetApp`/`LockService`/`CacheService`, not a simulation (the project's Node sandbox that used to sit alongside this was removed 2026-07-29; everything is GAS-native now). **Confirmed 2026-07-29: CC ran `runAllPropertyOSTests()` for real, against a dedicated TEST-named spreadsheet — 99/99 passing** (992: 56/56, 991: 9/9, 993: 27/27, 994: 7/7). This closes out most of what this checklist used to track as "shim vs. real" gaps — what's left below is specifically what 99 passing tests *still* can't tell you, not a residual doubt about whether the tests themselves are trustworthy.

## Platform-level verification (proposed by CC 2026-07-29; adopted locally per ADR-P10; automated in `994_Tests_ExtendedPlatform.js`)
- [x] **Replay Verification** — post-replay state matches live state, across a messy multi-cycle sequence (create/pay/reverse/pay/roll-forward). **Confirmed against real Sheets 2026-07-29.**
- [x] **Migration Verification** — the mechanism that forces a real source edit (OBLIGATION_CATEGORIES is frozen) confirmed against real GAS 2026-07-29. A full "add a category, use it" migration still means CC actually editing 900's source and redeploying — that half is inherently CC's to do, not something any test run (real or simulated) can perform on its own.
- [x] **Failure Recovery Verification** (Lock/Retry/Partial Failure/Duplicate Command) — **all four confirmed against real Sheets/LockService 2026-07-29.** Lock-releases-on-throw ✓, Retry-is-idempotent ✓, Duplicate-command-without-ClientRequestID-creates-two-Rules ✓ (documented as intended behavior, not a bug), **Partial Failure ✓ — the real gap is real**: a Command's Truth write can succeed while its later History/Event steps fail, since Sheets has no multi-statement transactions (UEF v1.6 §2, D9), and `logPartialFailure_()` really does fire and log it clearly on real Sheets, not just in simulation. This does **not** mean Commands are now atomic — they aren't, deliberately (D9's proportionality reasoning) — it means the rare case is now a findable, five-minute manual reconciliation instead of a silent inconsistency, and that claim itself has been checked, not assumed.


## Sheets behavior
- [x] `setNumberFormat('@')` on a fresh column, then writing an ISO date string via `appendRow`/`setValues`, actually keeps it a string when read back — **confirmed 2026-07-29**, `991_Tests_ObligationEngine.js` run against a real dedicated test spreadsheet, all 9 tests passing including this one.
- [x] `setFrozenRows(1)` visibly freezes the header row in the real Sheets UI, on both a brand-new sheet and one of the three sheets that already existed before this fix landed — **confirmed 2026-07-29**, same run (`getFrozenRows()` checked programmatically; CC additionally has visual access to the real sheet to eyeball it).
- [ ] A genuine schema-drift scenario (manually add/reorder/rename a column header in the real sheet) actually throws from `ensureSheetSchema_` on the next run, rather than silently corrupting data. **Not automated in any of 990-995** — would need a test that deliberately corrupts a real sheet's header first, which the other tests intentionally don't do.

## Concurrency
- [ ] `LockService.getScriptLock()` behaves correctly under **real concurrent execution** — e.g., two `/property_paid` requests for the same Occurrence arriving close together. The full 99/99 real run (2026-07-29) confirms the lock doesn't *break* normal, sequential, non-contended execution — including 994's throw-during-lock scenario — but genuine concurrent contention (two overlapping executions) still has zero real coverage. A sequential test run, however many tests it contains, structurally cannot produce this.
- [ ] `LOCK_TIMEOUT` (30s) is a reasonable real-world value — still unverified either way.

## Caching
- [ ] `CacheService`'s real 1-hour TTL for `ClientRequestID` idempotency actually expires as expected. Confirmed (2026-07-29, real run): idempotency **works within a run** (real cache, real hit — 991 and 993 both exercise this). Still not confirmed: the TTL **expires** correctly, since that needs the test itself to wait an hour mid-run, which none of 990-995 do.

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
*Run `runAllPropertyOSTests()` from the Script Editor (995_RunAllTests.js) for the automated half, against a dedicated TEST-named spreadsheet. This file is the other half — check it against the real GAS project, then update it in place (check the boxes, don't just note "done" elsewhere) so it stays a source of truth.*
