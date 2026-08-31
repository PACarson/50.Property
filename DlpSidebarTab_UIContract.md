# DLP Sidebar Tab — UI Contract / Design Review (Phase 1)

**Status: Phase 1 design RESOLVED — CC approved 2026-08-30. Still not
coding.** This revision incorporates CC's five decisions on the draft's
open questions, plus two new disciplines CC added this round (§14, §18).
Implementation is a separate, later step CC will explicitly authorize —
approving this Contract is not that authorization.

This is the "own design pass later" that `DlpMobileConsole_UIContract.md`
§0 explicitly deferred: *"The Sidebar 'DLP' Tab (945/946) is a Desktop
management surface and is explicitly out of scope for this document."*
That document's boundary stands — this one is its sibling, not a revision
of it. Mobile Console's own scope (Daily Check + read-only Case Overview
+ Evidence attach) is unchanged by anything here.

---

## 0. Why This Exists

`enrichDefectForDisplay_` (922) already exists as the presentation
function 947's doc-comment always intended for this Tab, but it has sat
unused and under-built (no itemId/subCategory/remark, no consumer at
all) since Phase 8. This Contract turns "the future Sidebar DLP Tab" from
a placeholder comment into an actual, scoped design — driven by CC's real
EST8 defect-workflow usage rather than Claude's guess at what a defect
management UI should look like.

---

## 1. Phase 1 — Command Scope — RESOLVED 2026-08-30

**In scope:**
- View Defect List (Active Case)
- View Defect Detail (full record)
- Update Developer Status (`recordDeveloperStatus`)
- Record Owner Verification (`recordOwnerVerification`)
- View + Add Rectification Event (`logRectificationEvent`) — **added
  this round**, CC's reasoning: Rectification Events are defect-scoped
  and are the core record of the defect rectification lifecycle itself,
  belongs in Defect Management. Explicit constraint: uses the *existing*
  Command as-is — this is not licence to redesign the Repair Cycle
  Domain Model.
- View + attach Evidence for a defect
- View + log Secondary Damage for a defect
- View Case-level Correspondence — **moved out of Defect Detail this
  round**, see §2/§10.

**Explicitly Phase 2 (§15), not this round:** Close Defect, Reopen
Defect, Close Case. CC's reasoning, verified against the actual code:
`closeDefectItem` hard-requires `OwnerVerificationStatus === 'Verified'`
first; `reopenDefectItem` hard-requires a `reason`. Both are state-machine
/ workflow decisions, not data entry — bundling them in "for completeness"
is exactly the scope creep this project has avoided elsewhere.

---

## 2. Navigation Model — RESOLVED 2026-08-30

New 5th tab in 945's existing `#tabs` nav (`Dashboard` / `Add Bill` /
`Properties` / `History` today) — `<button data-view="dlp">DLP</button>`,
a `<div id="view-dlp" class="view">` alongside the other four, same
`setupTabs()` mechanism, no new navigation framework.

Within that tab, the Case is the root, with three siblings hanging off
it — not a single flat screen, and not everything nested under Defect
Detail either:

```
DLP Tab
└─ Case (ACTIVE_DLP_CASE_ID)
   ├─ Case Overview          (case-level summary)
   ├─ Correspondence          (case-level — §10)
   └─ Defect List             (default view)
       └─ Defect Detail       (on row click)
          ├─ Rectification Events (§7)
          ├─ Evidence              (§8)
          └─ Secondary Damage      (§9)
```

Defect List → Defect Detail is the one actual navigation *level change*
(back-link, no deep-link/URL-routing needed — 945 doesn't do that for its
other tabs either). Case Overview and Correspondence are peers of the
Defect List, reachable directly from the Case level, not nested under
any one Defect.

---

## 3. Defect List — Fields and Layout

Ten columns: **ItemID, Category, SubCategory, Description, Remark,
Location, Priority, Status, DeveloperStatus, OwnerVerificationStatus.**
Wider than 948's compact card (which omits Description/Priority) —
reasonable given desktop's larger canvas; not a requirement to mirror
Mobile's exact field set.

**ItemID as the primary identifier**: the UI leads with ItemID, not
`DefectID`. Technical note for whoever implements this — `DefectID` is
still the actual key every Command below takes (`recordDeveloperStatus`,
`recordOwnerVerification`, `attachEvidence`'s `relatedDefectId`, etc.);
it has to travel with each row even though it's never the thing shown to
CC. Likely a data attribute on the row rather than a visible column.

A likely table, not cards (945's existing `Properties`/`History` tabs
are already table-like — matches precedent over inventing a new list
widget).

---

## 4. Defect Detail — Full Record + Actions — RESOLVED 2026-08-30

Shows the full DefectItem record (the List's 10 fields plus
SubmittedAt/RectificationStartDate/DeveloperClaimedCompletedDate/
OwnerVerifiedDate/ClosedDate/CreatedAt/UpdatedAt), **plus** — per CC's
final structure — its Rectification Events (§7), Evidence (§8), and
Secondary Damage (§9), each shown as its own list scoped to this
DefectID.

**Actions panel** — exactly five, per CC:
- Update Developer Status (§5)
- Record Owner Verification (§6)
- Add Rectification Event (§7)
- Add Evidence (§8)
- Add Secondary Damage (§9)

**Close/Reopen — RESOLVED: absent entirely, not even disabled.** CC's
explicit reasoning: a disabled/"Coming Soon" placeholder implies the
feature is just "temporarily off," which is its own kind of misleading UI
signal. Phase 1 simply doesn't show it. It appears only once Phase 2
actually designs the lifecycle.

---

## 5. Action: Update Developer Status

`recordDeveloperStatus({defectId, developerStatus, claimedCompletedDate?,
note?})`. Four choices — `Pending` / `Scheduled` / `InProgress` /
`ClaimedCompleted` (900's `DEVELOPER_STATUSES`, verified). Proposing a
dropdown or radio group over free text, matching how Daily Check already
treats fixed-vocabulary fields.

- `claimedCompletedDate` only matters when `ClaimedCompleted` is picked;
  defaults to "now" if omitted — proposing the UI defaults silently
  (matching Daily Check's minimal-friction philosophy) with an optional
  date override, not a required field every time.
- `note` — optional free text, appended to the Case Timeline entry this
  Command already auto-generates.
- Blocked entirely if the defect's `Status` is already `Closed`
  (`assertDefectItemNotClosed_`) — surfaces as an error from the Command
  itself; the UI doesn't need to pre-check this, just needs to render
  whatever error comes back.

---

## 6. Action: Record Owner Verification

`recordOwnerVerification({defectId, ownerVerificationStatus,
verifiedDate?, reason?})`. Four choices — `NotChecked` / `Verified` /
`FailedVerification` / `PartiallyVerified` (900's
`OWNER_VERIFICATION_STATUSES`, verified).

Load-bearing detail worth stating explicitly in the UI, not just in this
Contract: this field is **deliberately not one-way** — `FailedVerification`
can be reassessed again after a further Developer attempt (900's own
comment cites this as an intentional departure from the project's usual
terminal-state-machine convention). The UI should let this be re-recorded
freely, not lock the control after a first verification the way a
one-shot approval flow would.

`verifiedDate` defaults to now if omitted, same pattern as §5. `reason` —
optional free text, appended to Timeline. Same Closed-defect block as §5.

---

## 7. Action: Add Rectification Event — NEW 2026-08-30 (CC-added)

`logRectificationEvent({caseId, defectId, eventType, eventDate,
entryTime, exitTime, contractorCompany, contractorPersonnel, notes,
source, clientRequestId})` — `caseId` required, `defectId` optional at
the Command level but always supplied here since this Action lives on
one specific Defect's Detail page.

- `eventType` — required, one of 900's `RECTIFICATION_EVENT_TYPES`:
  `AccessRequested` / `AccessGranted` / `RectificationStarted` /
  `RectificationCompleted` / `RectificationRejected` /
  `ReinspectionRequired` / `DeveloperClaimedCompleted` (7 values).
- `source` — one of `RECTIFICATION_SOURCES`: `DeveloperProvided` /
  `OwnerObserved` (2 values), defaults to `OwnerObserved` if omitted.
- `entryTime`/`exitTime`/`contractorCompany`/`contractorPersonnel`/
  `notes` — all optional detail.
- Blocked if the *Case* is Closed (not defect-level — verified in the
  Command itself).
- **Already has full `clientRequestId` idempotency support today** —
  unlike the five Commands in §13, this one doesn't need any reliability
  decision; it already matches the same pattern `addDefectItem` /
  `logDailyProgressCheck` / `attachEvidence` use.
- Append-only by design (918's own doc-comment, CC Review Approval
  2026-08-15) — never a "correct the last entry" affordance, only ever
  "log a new one." The UI shouldn't offer an edit/delete on existing
  Rectification Event rows.
- Explicit constraint per CC: Phase 1 uses this Command exactly as it
  exists. No new EventType, no new field, no Repair Cycle redesign —
  see §14.

---

## 8. Evidence — View + Attach — RESOLVED 2026-08-30 (full enum)

`listEvidenceForDefect(defectId)` for the view; `attachEvidence({
relatedCaseId, relatedDefectId, evidenceType, phase, source, description,
capturedAt, driveFileId | (base64Data+fileName+mimeType), clientRequestId})`
for attaching (911, not 918 — a different Engine, same Lock discipline).
`relatedCaseId` is required by the Command regardless; `relatedDefectId`
set to the Detail page's DefectID is what scopes it to this one defect
rather than the whole Case.

**RESOLVED**: Sidebar exposes the full choice sets, not Mobile's
simplified capture. CC's reasoning: Sidebar is the management surface and
should record accurate, complete Evidence metadata; Mobile Console stays
optimized for fast on-site capture. The two are complementary, not
required to match: `EVIDENCE_TYPES` (10 values: Photo/Video/Email/PDF/
WhatsAppScreenshot/DeveloperReport/ContractorReport/InspectionReport/
MobileAppSubmissionProof/Other) and `EVIDENCE_PHASES` (Before/During/
After/NotApplicable), both exposed as real choices here.

---

## 9. Secondary Damage — View + Log

`listSecondaryDamageForDefect(defectId)` for the view; `logSecondaryDamage
({caseId, parentDefectId, rectificationEventId?, damageType, description,
observedDate, observedBy, responsibleParty,
administrativeSubmissionRequired, separateSubmissionId,
dlpPrejudiceStatus, contractualBasis, clientRequestId})` for logging.
`damageType` has a fixed vocabulary — 900's `SECONDARY_DAMAGE_TYPES`
(Cabinet/Flooring/Wall/Door/Ironmongery/Appliance/Other); its own status
(`SECONDARY_DAMAGE_STATUSES`: Reported/Acknowledged/Rectified/Disputed)
isn't set by `logSecondaryDamage` itself, so it's display-only in Phase 1
unless CC wants a status-update action added here too — not requested,
not adding it speculatively.

`responsibleParty` / `dlpPrejudiceStatus` / `contractualBasis` are plain
neutral free-text by design (918's own doc-comment: the system never
infers legal responsibility) — the UI shouldn't add any validation logic
that implies otherwise.

`rectificationEventId` is an optional cross-link to §7's records — Phase
1 doesn't need to build a picker for this; leaving it unset is a valid,
common case.

---

## 10. Correspondence — Case-Level — RESOLVED 2026-08-30 (CC approved)

Verified directly against `logCorrespondence`'s actual input —
`{caseId, date, direction, sender, recipient, subject, responseStatus,
responseRequestedDate, responseWorkingDays, responseDueDate,
clientRequestId}` — **no defectId field at all**, and no
`listCorrespondenceForDefect` query exists (only `listCorrespondenceForCase`).
Correspondence in this Domain Model is a Case-wide concern, not a
per-defect one.

CC's ruling: the Domain is explicitly `Case → Correspondence`, not
`Case → Defect → Correspondence` — the UI must not invent an association
the data model doesn't have. Correspondence lives at the **Case level**
(§2's diagram — a sibling of Defect List, not nested under any Defect
Detail).

---

## 11. Field Alignment — ItemID / SubCategory / Remark Across Both Surfaces

Since Sidebar work is starting now, the full data model is aligned across
both UI surfaces in the same pass rather than left to drift into two
different field sets that get reconciled later.

- **901 (Schema)**: unchanged — all three fields already exist, this is
  presentation, not schema design.
- **918 (Domain/Truth Layer)**: unchanged.
- **922 (Projection)**: `enrichDefectForDisplay_` gains `subCategory` /
  `remark` (it already has `itemId` from the earlier rename) — the same
  kind of additive, defaulted-to-`''` change already made to
  `buildCaseOverviewForMobile_` for Mobile Console. A **new** Detail-page
  aggregation function is also needed — see §18 for its explicit
  constraints.
- **UI (945/948)**: both present the same field set for what they each
  choose to show — Mobile Console's compact card and Sidebar's fuller
  List/Detail aren't required to show identical layouts, but neither
  should silently omit a field the other has just because nobody
  remembered to add it.

---

## 12. Layer Responsibilities — RESOLVED 2026-08-30

- **918** — Truth Layer. Every write in this document goes through an
  existing Command (§§5–9) — zero new Domain logic, zero Schema change,
  zero dedup-logic change.
- **922** — Projection. New/extended presentation-only functions per
  §11/§18. Reads only; never itself calls a 918 Command.
- **947** — **all** DLP server-side glue, for both surfaces. CC's ruling:

  ```
  948 Mobile Console  ──┐
                         ├──▶ 947 DlpConsoleServer  ──▶ 918/911/922 (DLP)
  945 Sidebar (DLP tab) ─┘

  945 Sidebar (other tabs: Dashboard/Add Bill/
  Properties/History)   ───▶ 946 OperatorConsoleServer ──▶ Property/
                                                            Obligation Engines
  ```

  945 therefore calls into **two different server files** depending on
  which of its own tabs is active — its existing four tabs keep going
  through 946 exactly as today; only the new DLP tab's `google.script.run`
  calls go to 947 instead. CC's reasoning: 947 already states its own
  intent to serve "the future Sidebar DLP Tab" in its header comment, and
  this keeps 946 from becoming an ever-growing catch-all for every
  Engine's wrappers.
- **945** — new `view-dlp` div + the List/Detail sub-navigation in §2.
  Zero business logic — same rule 948 already follows.

---

## 13. Reliability — `clientRequestId`

Verified: **none** of `recordDeveloperStatus` / `recordOwnerVerification`
/ `closeDefectItem` / `reopenDefectItem` / `closeCase` have
`clientRequestId` idempotency support today, unlike every Command
currently reachable from Mobile Console — and unlike `logRectificationEvent`
(§7), which already has it.

CC's explicit decision: **do not retrofit it onto those five for this
Sidebar work.** Sidebar is desktop + a relatively stable connection + a
deliberate management action, unlike Mobile's on-site + flaky-connection
+ needs-retry-safety profile that motivated the pattern in the first
place. Mechanically adding idempotency to 918 just because its current
absence was noticed here would be exactly the "found a gap, so expand
Domain while we're at it" pattern this project keeps deliberately
avoiding. If real Sidebar usage later surfaces an actual
duplicate-submission problem on a *specific* Command, that Command gets
it then — not all five, speculatively, now.

---

## 14. Phase 1 Domain/Schema Freeze + Feedback/Gap Log — NEW 2026-08-30 (CC-added)

**Phase 1 does not modify Domain Model or Schema.** Every write in this
document is an existing 918/911 Command, used as-is (§7's explicit
constraint on `logRectificationEvent` generalizes to all of them).

CC's reasoning: real defect data is now running through the system via
Mobile Console. Two independent streams of feedback are about to start
arriving at once — CC's own real-workflow usage ("I need a new field,"
"this workflow isn't enough," "this status isn't enough") and whatever
Claude notices while actually building the Sidebar UI against these
Commands. Both go into a **Feedback/Gap log first** — the same
`00_Product_Backlog.js` convention BL-4/BL-5/BL-6 already established —
**not** a same-session "saw a problem, fixed it" edit to 918. This keeps
both streams landing in the same place so they can be reviewed together
in one future round, rather than Sidebar-development gaps getting
silently patched ad hoc while real-usage gaps wait in the backlog.

This is a Phase 1 rule, not a permanent one — a genuine data-integrity or
safety bug found during Sidebar work is still handled immediately, same
standing exception CC has stated throughout this project. Everything
short of that: log it, don't fix it in the moment.

---

## 15. Phase 2 — Explicitly Deferred (not this round)

Split into two distinct lifecycles — the UI must never present a single
generic "Close" button that blurs them:

- **Defect-level**: Close Defect (`closeDefectItem` — hard-gated on
  `OwnerVerificationStatus === 'Verified'`), Reopen Defect
  (`reopenDefectItem` — hard-gated on a required `reason`, only valid
  from `Closed`).
- **Case-level**: Close Case (`closeCase` — hard-gated on *every*
  DefectItem under the Case already being `Closed`; verified directly —
  it filters `listDefectItemsForCase` for anything `!== 'Closed'` and
  refuses if that list is non-empty). One Defect being Verified never
  implies the Case can close.

Not designed in this document at all — genuinely next-phase, once Phase 1
is live and real usage informs what the Close/Reopen UX actually needs
to feel like.

---

## 16. Error / Success / Concurrency Behavior

Sidebar reuses the same shape 946/947 already establish —
`{success, data|error, code}` from `console_wrap_`/`dlp_wrap_`, rendered
as 945's existing toast pattern (945's own visual language, not a new
one). Every write Command above already throws a specific `code` (e.g.
`DEFECT_ITEM_INVALID_DEVELOPER_STATUS`, `DEFECT_ITEM_NOT_FOUND`) — the UI
doesn't need bespoke validation logic duplicating what 918 already
enforces, just needs to surface whatever message comes back. Concurrency:
`withDefectEngineLock_` already serializes writes at the Domain layer
(same lock every other DLP Command uses) — nothing new for the UI layer
to build here, this isn't a gap the way idempotency is.

---

## 17. Explicitly NOT Doing (This Phase)

- Close Defect / Reopen Defect / Close Case UI, in any form — not even a
  disabled placeholder (§4, §15)
- `clientRequestId` retrofit on the five Commands in §13
- Any redesign of the Repair Cycle Domain Model — `logRectificationEvent`
  used exactly as it exists (§7)
- Any change to 901 (Schema), 918 (Domain logic/dedup), or existing
  Mobile Console (948) behavior (§14)
- A generalized "correspondence about this defect" capability —
  Correspondence stays Case-level (§10), matching what the data model
  actually supports
- Turning `buildCaseOverviewForMobile_` into a shared/universal function
  for both surfaces (§18) — a separate, purpose-built Sidebar function
  instead

---

## 18. Architecture Constraint — the New 922 Function — RESOLVED 2026-08-30

CC approved a new 922 aggregation function for the Detail page (defect +
its Rectification Events + Evidence + Secondary Damage), with two
explicit constraints:

1. **Single-pass discipline**: read what's needed once, build the
   projection, return it — the same discipline `buildCaseOverviewForMobile_`
   already established for Mobile Console's N+1 fix. Not a naive
   per-field round-trip to the Sheet.
2. **Sidebar-specific, not a shared "universal" function.** CC's explicit
   ruling: do not generalize or merge this into `buildCaseOverviewForMobile_`
   to avoid writing two functions. Mobile Console's function stays
   exactly what it is — Mobile-specific, and this new one is a separate,
   purpose-built Sidebar function, even though both ultimately read
   overlapping DefectItem data. Precedent already in this codebase for
   *not* prematurely generalizing shared-looking code across the two UI
   surfaces (922's own docblock makes the same call for
   `getDlpCaseDashboard`/`listDefectItemsForDashboard` staying untouched
   when `buildCaseOverviewForMobile_` was added).

---

## 19. Next Steps

Contract is now resolved for Phase 1 design. Per CC's explicit
instruction: **still not coding.** Approving this document is not
authorization to start implementation — that's a separate go-ahead CC
will give explicitly, at which point the likely build order is 922's new
projection functions → 947 glue (§12) → 945 UI, mirroring how Mobile
Console itself was only built after its own Contract was settled.
Stopping here.
