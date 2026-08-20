# DLP Mobile Console — UI Contract (Phase 9/10)

**Status: RUNTIME CODE COMPLETE, NOT PRODUCTION-READY (2026-08-19) — all §9 items resolved. 947/948/900/appsscript.json written and `node --check` syntax-clean only; zero real GAS or real-device verification performed. Production-Ready requires the 11-step real-device pass in §11 below — see that section before assuming any of this works.**
**Scope**: the standalone `doGet()` Mobile Web Console only. The Sidebar "DLP" Tab (945/946) is a Desktop management surface and is explicitly out of scope for this document — it gets its own design pass later.
**Governance**: builds on ADR-P14 (Console MVP principle — real usage feedback, not feature-complete; no per-UI-layer business rules) and Phase 0 Audit §7 "Web UI Structure." §9.1/§9.2 are deliberately kept as MVP Configuration in `900_PropertyConfig.js`, not Domain Model changes — 918 is untouched by this contract.
**Cross-reference**: `DlpDefectEngine_VerticalSlice.md` §11 (Phase 9-11 definition), `00_Project_State.js` IN PROGRESS section, `00_File_Map.js` 940-949 Integration band.

---

## 0. Scope and the Phase 9/10 Merge

Confirmed from the design discussion:

- Mobile Console is **UI layer only**. Every write goes through an existing 918/911 Command. `doGet()` is an entry point, not a Domain Layer — the same boundary 946 already respects for the Sidebar.
- Mobile Console does **not** duplicate Case / Defect Item / Correspondence / Secondary Damage management. Those stay exclusive to the Sidebar DLP Tab.
- Landing view is Daily Check, not Dashboard.

**Note on phase numbering**: the original split was Phase 9 = generic Web Console shell, Phase 10 = Daily Check speed optimization layered on top. Since Daily Check is now the *entire* landing experience rather than a feature bolted onto a generic shell afterward, this contract designs them as a single artifact. Once this is approved, `00_Project_State.js` / `DlpDefectEngine_VerticalSlice.md` §11 should be updated to say "Phase 9/10 merged" rather than silently drifting from the two-phase description they currently have.

---

## 1. What Mobile Console Shows

| Surface | Access | Purpose |
|---|---|---|
| Daily Check | read + write | default view, 30–60s form (§2.1) |
| Evidence capture | write only | photo upload, triggered post-save (§5) |
| Case Overview | **read-only** | Dashboard summary + Defect List + Timeline (§2.2) |

**Assumption flagged for confirmation**: Correspondence and Secondary Damage are not surfaced at all in Mobile, not even read-only, since only Dashboard/Defect List/Timeline were named as secondary entries. `getDlpCaseDashboard` already returns a `correspondence.overdue` count as part of its bundled response, so showing "2 correspondence overdue" on the Case Overview screen would cost nothing extra — I left it out by default rather than assume you wanted it. Say the word if you want that one number surfaced.

---

## 2. Page Structure

### 2.1 Daily Check (landing view, default at the Web App root)

```
┌───────────────────────────────┐
│ Est8 Seputeh · A-19-11      ☰ │  ← property/unit context (static text) + Case Overview entry
├───────────────────────────────┤
│  Daily Check                  │
│  Today, 3:42 PM  (tap to edit)│  ← defaults to now, hidden unless tapped
│                                │
│  [ ] Access Observed          │  ← large tap targets, not tiny checkboxes
│  [ ] Contractor Observed      │
│  [ ] Developer Rep Observed   │
│                                │
│  Work Observed (optional)     │
│  ┌──────────────────────────┐ │
│  └──────────────────────────┘ │
│                                │
│  General Status (optional)    │
│  ┌──────────────────────────┐ │
│  └──────────────────────────┘ │
│                                │
│  Notes (optional)             │
│  ┌──────────────────────────┐ │
│  └──────────────────────────┘ │
│                                │
│  ┌──────────────────────────┐ │
│  │      SAVE CHECK          │ │
│  └──────────────────────────┘ │
└───────────────────────────────┘
```

Post-save, the same screen switches to a saved state rather than navigating away (detailed in §5):

```
┌───────────────────────────────┐
│  ✓ Check Saved                │
│  Today, 3:42 PM                │
│                                │
│  ┌──────────────────────────┐ │
│  │  + Add Photo Evidence    │ │
│  └──────────────────────────┘ │
│  ┌──────────────────────────┐ │
│  │         Done             │ │
│  └──────────────────────────┘ │
└───────────────────────────────┘
```

**Field notes**:
- `CheckedBy` is not shown as an editable field. It auto-fills from `PROPERTY_CONFIG.OPERATOR_NAME` (§9.2 — Config today, swappable for a real Identity Provider later without this Contract changing).
- `GeneralStatus` is free text at the Domain layer (no enum in `logDailyProgressCheck`). **Proposed enhancement**: show 3–4 quick-tap presets (e.g. "On Track," "Delayed," "No Access") above the text box that just populate it — still ends up as a plain string, purely a typing-avoidance affordance. Optional, easy to skip for v1.
- Date/time defaults to now and is hidden by default (tap to reveal an editable control) — for the rare case you're logging a visit retroactively.

### 2.2 Case Overview (secondary, read-only)

Reached via the `☰` in the top bar. Not a separate app section with its own nav — one back-button gets you to Daily Check.

```
┌───────────────────────────────┐
│ ← Back          Case Overview  │
├───────────────────────────────┤
│ Status: InProgress             │
│                                 │
│ Defects                        │
│  12 open · 3 pending verify ·  │
│  8 verified · 40 closed        │
│                                 │
│ ── Defect List ──              │
│  [Living Room — Tiles]         │
│  Open · Dev: Acknowledged ·    │
│  Owner: Pending                │
│  [Bathroom 2 — Waterproofing]  │
│  ...                           │
│                                 │
│ ── Recent Timeline ──          │
│  • Daily check logged — today  │
│  • Evidence attached — 2d ago  │
│  ...                           │
└───────────────────────────────┘
```

Defect cards are read-only — tap expands to show full description/dates inline, no edit affordance. Status / DeveloperStatus / OwnerVerificationStatus are shown as three separate badges (never collapsed into one), consistent with how the Domain Model treats them as independent fields.

---

## 3. Navigation Model

Deliberately flat — no persistent tab bar like 945's `#tabs`, since Mobile has one primary task rather than four peer ones:

- Root (`/exec`) → Daily Check. Always the landing view, every visit.
- `☰` in the top bar → Case Overview. One level deep, one way in, one way back.
- Evidence capture is a state within Daily Check post-save, not a separate route (§5).
- No routing library — a single HTML file with a JS-driven view toggle (same pattern 945 already uses for `.view`/`.view.active`), not a real `doGet(e.parameter.page)` multi-page setup. Simpler, and there's only two views total.

---

## 4. Command Mapping

All calls go through `google.script.run`, same mechanism 946 already uses. Every row below is either an existing 918/911/922 function called as-is, or a thin wrapper proposed in §6 that does nothing but validate/shape input before delegating — no business logic lives in the wrapper, matching the 946 precedent.

| UI Action | Calls | Key Input | Notes |
|---|---|---|---|
| Load Daily Check screen | `dlp_getMobileBootstrap()` *(new, §6)* | — | Resolves case via `PROPERTY_CONFIG.ACTIVE_DLP_CASE_ID` (§9.1 — MVP Case Context config, not a Domain query) + returns today's date |
| Toggle observed checkboxes | — (client state only) | — | No server call until Save |
| Tap **Save Check** | `logDailyProgressCheck(input)` *(918, existing, unchanged)* | `caseId`, `checkedBy` *(auto)*, `accessObserved`, `contractorObserved`, `developerRepresentativeObserved`, `workObserved`, `generalStatus`, `notes`, `clientRequestId` *(client-generated, §8)* | Called via `dlp_logDailyCheck(input)` wrapper — just forwards + catches errors into `{success, data\|error}`, same shape 946 already returns |
| Tap **+ Add Photo Evidence** | `attachEvidence(input)` *(911, existing, unchanged)* | `relatedCaseId`, `relatedEntityType: 'DailyProgressCheck'`, `relatedEntityId: checkId`, `base64Data`/`fileName`/`mimeType`, `evidenceType: 'Photo'` *(default)*, `clientRequestId` | Called via `dlp_attachEvidence(input)` wrapper. `checkId` comes from the Save Check response, not re-entered |
| Open Case Overview | `getDlpCaseDashboard(caseId)` *(922, existing, unchanged)* | `caseId` | Read-only |
| Case Overview → Defect List | `listDefectItemsForDashboard(caseId)` *(922, existing, unchanged)* | `caseId` | Read-only, no per-row action |
| Case Overview → Timeline | `getCaseTimeline(caseId, limit)` *(922, existing, unchanged)* | `caseId`, `limit` *(propose 20)* | Read-only |

Nothing in this table is a new Domain function except the bootstrap query — every write and every read that matters already exists from Phases 1-8. That's the whole point of the UI-layer boundary in §0 holding up.

---

## 5. Evidence Flow

1. User fills the Daily Check form, taps **Save Check**.
2. Client calls `dlp_logDailyCheck` → on success gets back `checkId`.
3. Screen switches in place to the "✓ Check Saved" state (§2.1) — **not** a page navigation. The Daily Check is already durably saved at this point, independent of anything that happens next.
4. User taps **+ Add Photo Evidence** (optional — taps **Done** to skip entirely, flow ends, nothing further happens).
5. Native file picker opens (`<input type="file" accept="image/*" capture="environment">` triggers the phone camera directly). Client reads the file, encodes to base64.
6. Client calls `dlp_attachEvidence` with `relatedCaseId`, `relatedEntityType: 'DailyProgressCheck'`, `relatedEntityId: checkId`, the base64 payload, `evidenceType: 'Photo'`.
7. On success: brief confirmation, then either **Add another photo** (loop to step 5) or **Done**.
8. On failure: the error is scoped to the photo upload only — copy should read something like "Photo didn't upload, but your Check is saved. Retry?" — never implies the Daily Check itself failed, since it didn't. Retry re-attempts step 6 only.

`Phase` (Before/During/After/NotApplicable) and `EvidenceType` beyond Photo are not exposed as choices in this flow — hardcoded to `Photo` / `NotApplicable`. Those distinctions matter more for Rectification Event documentation, which is a Sidebar-only workflow.

---

## 6. New Files (approved)

Per `00_File_Map.js`, 940-949 is the Integration band and 947+ is free (945/946 already taken by the Sidebar Console):

- **`947_DlpConsoleServer.js`** — shared thin wrappers (`dlp_*`) for all DLP server glue: `dlp_getMobileBootstrap`, `dlp_logDailyCheck`, `dlp_attachEvidence`, `dlp_getCaseOverview` (wraps the 3 §4 read calls into one round-trip so a slow on-site connection isn't paying for 3 separate `google.script.run` hops). Also holds `doGet()` for the Mobile Web App.
- **`948_MobileConsole.html`** — the Mobile Console page itself (HTML/CSS/JS in one file, same convention as 945).

**Approved 2026-08-19**: 947/948 numbering confirmed as-is. Putting `doGet()` in 947 rather than its own file keeps this at 2 new files instead of 3, consistent with how 945/946 itself only split when it actually got crowded rather than pre-emptively. 947 is intended to also serve the future Sidebar DLP Tab (shared wrappers across both surfaces, avoiding duplicate glue for the same Domain calls) — revisit the split only if that file actually gets crowded, not before.

One implementation note worth locking in now since it's easy to forget and breaks the whole "mobile-first" premise if missed: the `HtmlOutput` returned from `doGet()` needs `.addMetaTag('viewport', 'width=device-width, initial-scale=1')`, or the page renders at desktop width and looks zoomed-out on a phone.

---

## 7. Visual / Interaction Spec

Continues 945's palette and component language (white background, `#1a73e8` accents, card containers, the existing toast pattern for success/error) rather than a from-scratch visual system — but not a copy-paste of the Sidebar's density:

- Single-column layout throughout. No side-by-side `.field-row` pairs like 945 uses — everything full-width for one-handed thumb reach.
- Tap targets sized for on-site/gloved-hand use, not desktop mouse precision — **48px minimum height applies to the primary Action / Checkbox / Save Check elements only** (945's Sidebar buttons are noticeably smaller, which is fine there since it's mouse-driven). Not a blanket rule: secondary elements like the `☰` menu icon or the "tap to edit" date link stay normal-sized rather than being mechanically enlarged along with everything else.
- Save Check button is the single largest element on screen — no competing calls to action above the fold.
- Toast pattern reused as-is from 945 for both the "Check Saved" and any error state — it already does exactly what "explicit Success/Failure feedback" asked for.
- No charts, no animations, no dashboard widgets on the landing view — consistent with "don't add a complex Dashboard or animation for visual effect."

---

## 8. Reliability: Idempotency on Flaky On-Site Connections

Both `logDailyProgressCheck` and `attachEvidence` already accept an optional `clientRequestId` and cache the result for 3600 seconds (`CacheService.getScriptCache()`) — if the same ID is submitted twice, the second call returns the cached result instead of writing a duplicate row. This exists today and isn't a new capability, just previously unused by any UI.

Since the whole premise of Mobile Console is standing in a unit that may have weak signal, the client should generate one `clientRequestId` (e.g. `crypto.randomUUID()` or a timestamp+random fallback) per Save Check attempt and reuse the *same* ID across automatic or manual retries, rather than generating a new one each tap. Otherwise a slow request that the user re-taps out of impatience could still produce duplicate Daily Check rows despite the cache existing.

---

## 9. Configuration Decisions & Remaining Open Item

These aren't visual/UX questions — they're configuration-level gaps this analysis surfaced. §9.1 and §9.2 are resolved below; §9.3 is still open.

### 9.1 Case Context — RESOLVED 2026-08-19

Neither option originally offered here was taken. CC's decision is a third path: a **Current Active Case Context** concept sits between Property/Unit and Daily Check —

> Mobile Console → Current Property/Unit → Active DLP Case → Daily Check

Since the system can't yet auto-derive an Active Case from Property, this resolves for now as one temporary config value: `PROPERTY_CONFIG.ACTIVE_DLP_CASE_ID`. Five constraints on it, carried over verbatim since they're load-bearing for whoever implements this:

- It is **UI/Operator Context**, not Truth Layer.
- It is **not part of the Case Entity**.
- Domain Logic must **never** treat it as the canonical source of "the" Case — `caseId` still flows through every 918/911/922 call exactly as it does today; this config only supplies *which* `caseId` the bootstrap step uses.
- It's explicitly **MVP configuration**, not a permanent design.
- It gets **removed** once a real Case Selector / `listActiveCases()` exists.

Rationale for not building `listActiveCases()` now: there is exactly one real DLP Case today. A Query built for a selector with no second Case to select between would be shaped by a guess, not a real usage pattern — when a second Case genuinely shows up, that actual requirement will produce a better Query than one written speculatively now. That real second Case is also the removal trigger for `ACTIVE_DLP_CASE_ID` above — not a calendar date, a concrete condition.

### 9.2 Operator Identity — RESOLVED 2026-08-19

Approved: `PROPERTY_CONFIG.OPERATOR_NAME`, added as single-user MVP configuration — not written into `DailyProgressCheck` as Domain data.

The Contract-level commitment is "`CheckedBy` auto-fills from the current Operator identity source." Today that source is `OPERATOR_NAME` in Config. If this ever grows into Google Account identity / multi-user, only the source swaps (Config → Identity Provider) — this Contract, the `dlp_logDailyCheck` wrapper, and `CheckedBy` in the Truth Layer all stay exactly as specified here.

### 9.3 Web App deployment access — RESOLVED 2026-08-19

Approved as originally proposed: `executeAs: USER_DEPLOYING`, `access: MYSELF`, written into `appsscript.json`. Rationale (CC's): Mobile Console is a personal internal tool — no multi-user access need exists today, no reason to expose the Web App to other Google Accounts or anonymous users. Explicitly **not** added: `ANYONE`, `ANYONE_ANONYMOUS`, or any access level beyond `MYSELF`. Manifest-only change — does not touch 918/911/922 Domain or Integration architecture.

---

## 10. Runtime Code Status

`947_DlpConsoleServer.js`, `948_MobileConsole.html`, the `900_PropertyConfig.js` additions (§9.1/§9.2, now holding the real `ACTIVE_DLP_CASE_ID: 'CASE-msxyfkpi-zu4j'`), and the `appsscript.json` `webapp` block (§9.3) are all written. `node --check` confirms syntax validity on the three JS/HTML files; `appsscript.json` parses as valid JSON. **That is the entire extent of verification performed** — no real GAS execution, no real Sheets/Drive access, no real HtmlService rendering, no real phone.

**Runtime Complete ≠ Production-Ready.** Code that looks right is not the same claim as code proven right by running it. Status stays `pending` until §11 is done — not "probably fine," `pending`.

## 11. Production-Ready Gate (real-device verification required)

A binary gate, not something earned gradually through more code review. Required sequence:

1. `clasp push` to the real GAS project
2. Confirm the deployed `ACTIVE_DLP_CASE_ID` matches the real Case (already correct in this batch, but confirm post-push)
3. Deploy the Web App
4. Open the Web App URL on a real phone
5. Test `doGet()` loads at all
6. Test Mobile Bootstrap (top bar populates, form becomes usable)
7. Test Daily Check save
8. Test the Saved-state transition
9. Test Case Overview (Dashboard summary / Defect List / Timeline)
10. Test photo Evidence upload
11. Confirm no regression on existing 918/911/922 (Sidebar Console, existing 141 tests)

Only after all 11 pass does `MANUAL_VERIFICATION_CHECKLIST.md` get updated per UEF's Production-Ready definition — that update is evidence the verification happened, not a formality done ahead of it.

**Where the real bugs are likely hiding** — none of this is catchable by `node --check` or any amount of static review, which is the entire reason this gate exists rather than being waved through: mobile browser quirks, login/session state, `google.script.run` behavior under real network conditions, file upload handling, Drive permissions, the Web App deployment itself, degraded-connection UI states, double-tap-after-save behavior, date/timezone handling, and Blob/file handling for phone-camera-captured photos specifically.
