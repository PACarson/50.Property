# Property OS — Node Test Sandbox

**This directory is a local Node.js tool. It does not run inside Google Apps Script, and nothing here should ever be pasted into the Apps Script editor.**

Run it from a terminal: `node runAllTests.js`

## Why this exists alongside GAS-native tests

Property OS ships **two** test suites on purpose, because they check different things:

| | This directory (`property-os-tests/`) | `property-os/990_TestKit.js` + `991_Tests_ObligationEngine.js` |
|---|---|---|
| Runs where | Your local machine, plain `node` | Pasted into the real Apps Script project, run from the Script Editor |
| Uses | `shim/GasShim.js` — a **mock** `SpreadsheetApp`/`LockService`/`CacheService`, built with Node's `vm` module | The **real** `SpreadsheetApp`/`LockService`/`CacheService` |
| Speed | Fast — everything is in-memory | Slower — real Sheets API calls |
| Risk | Zero — nothing ever touches a real spreadsheet | Writes real rows — **must** run against a dedicated `...TEST...`-named spreadsheet, never production (991 refuses to run otherwise) |
| Coverage | All 101 tests: every pure-logic path (date math, state machine, ID/event contract shape) plus a faithful *simulation* of the Sheets date-coercion bug | A smaller, curated set — specifically the things a simulation can only approximate: does this actually work against real Sheets/Lock/Cache, right now |
| What a failure here means | A logic bug in 900-903/912-913 itself | Either a logic bug, *or* a real-environment behavior the shim didn't predict (which is itself useful to know) |

Both are needed. The Node suite is what you run on every change, constantly, for free, before anything touches Google's servers. The GAS-native suite is what actually proves the real environment behaves the way the Node suite assumed it would — catching the gap between "the shim says this works" and "this actually works."

## Files

```
shim/GasShim.js   — the mock GAS environment (SpreadsheetApp, LockService, etc.)
shim/TestKit.js   — tiny assert/report utility, no external dependencies
tests/*.js        — the three suites (900/912/919, see file map below)
runAllTests.js    — aggregate runner: node runAllTests.js
```

| File | Tests | Covers |
|---|---|---|
| `tests/900_Tests_Foundation.js` | 19 | ID generation, date utilities, sheet schema init, the date-coercion bug fix (simulated), event envelope validation |
| `tests/912_Tests_ObligationEngine.js` | 40 | All 7 Commands, State Machine, both idempotency mechanisms, frequency date math, Overdue derivation, AI Query |
| `tests/919_Tests_ObligationIntegration.js` | 42 | Event Contract (all 9 types), Replay, Reminder/Finance Integration (contract-level), Migration |

`MANUAL_VERIFICATION_CHECKLIST.md` lists what even the GAS-native suite still can't automate (things like "does the frozen header actually look right in the Sheets UI").
