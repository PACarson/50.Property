# DLP Sidebar Tab — UI Contract / Design Review (Phase 1 draft)

**Status: DRAFT — awaiting CC review/approval. No code written against this
document yet.**

This is the "own design pass later" that `DlpMobileConsole_UIContract.md`
§0 explicitly deferred: *"The Sidebar 'DLP' Tab (945/946) is a Desktop
management surface and is explicitly out of scope for this document."*
That document's boundary stands — this one is its sibling, not a revision
of it. Mobile Console's own scope (Daily Check + read-only Case Overview
+ Evidence attach) is unchanged by anything here.

Everything in this draft reflects decisions CC already made in the
2026-08-30 planning note, plus technical detail verified directly against
the current 918/911/900 code (not assumed). Points CC has not explicitly
settled are marked **OPEN**.

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

## 1. Phase 1 — Command Scope (this round, pending approval)

**In scope:**
- View Defect List (Active Case)
- View Defect Detail (full record)
- Update Developer Status (`recordDeveloperStatus`)
- Record Owner Verification (`recordOwnerVerification`)
- View + attach Evidence for a defect (`listEvidenceForDefect` /
  `attachEvidence`)
- View + log Secondary Damage for a defect (`listSecondaryDamageForDefect`
  / `logSecondaryDamage`)
- View Case-level Correspondence (`listCorrespondenceForCase` — see §9,
  this is NOT defect-scoped in the data model, unlike Evidence/Secondary
  Damage)

**Explicitly Phase 2 (§13), not this round:** Close Defect, Reopen
Defect, Close Case. CC's reasoning, verified against the actual code:
`closeDefectItem` hard-requires `OwnerVerificationStatus === 'Verified'`
first; `reopenDefectItem` hard-requires a `reason`. Both are state-machine
/ workflow decisions, not data entry — bundling them in "for completeness"
is exactly the scope creep this project has avoided elsewhere.

**Not mentioned in CC's note, flagging rather than assuming — OPEN:**
`logRectificationEvent` / `listRectificationEventsForDefect` also already
exist in 918 and are defect-scoped, same shape as Secondary Damage. CC's
list didn't include Rectification Event logging in Phase 1. Deliberate
omission, or an oversight? If real DLP correspondence with the developer
starts referencing scheduled rectification dates, this is the Command
that would record them.

---

## 2. Navigation Model — Case → Defect List → Defect Detail

New 5th tab in 945's existing `#tabs` nav (`Dashboard` / `Add Bill` /
`Properties` / `History` today) — `<button data-view="dlp">DLP</button>`,
a `<div id="view-dlp" class="view">` alongside the other four, same
`setupTabs()` mechanism, no new navigation framework.

Within that one tab, a **second navigation level** — List → Detail → back
to List — which is new for 945; its existing four tabs are each flat,
single-screen views. Worth naming explicitly as a new interaction pattern
being introduced here, not a silent extension of something that already
exists.

- **DLP tab default view**: Defect List for `PROPERTY_CONFIG.
  ACTIVE_DLP_CASE_ID` (same Case-scoping mechanism Mobile Console's
  bootstrap already uses — MVP Configuration, not Truth Layer, per
  Contract §9.1; this document inherits that same caveat rather than
  re-litigating it).
- **Row click** → Defect Detail for that DefectID.
- **Detail page** → back-link to List (no deep-link/URL-routing needed —
  945 doesn't do that today for its other tabs either).

---

## 3. Defect List — Fields and Layout

Per CC: **ItemID, Category, SubCategory, Description, Remark, Location,
Priority, Status, DeveloperStatus, OwnerVerificationStatus** — ten
columns. Wider than 948's compact card (which omits Description/
Priority) — reasonable given desktop's larger canvas; not a requirement
to mirror Mobile's exact field set.

**ItemID as the primary identifier** (CC's explicit instruction): the UI
leads with ItemID, not `DefectID`. Technical note for whoever implements
this — `DefectID` is still the actual key every Command below takes
(`recordDeveloperStatus`, `recordOwnerVerification`, `attachEvidence`'s
`relatedDefectId`, etc.); it has to travel with each row even though it's
never the thing shown to CC. Likely a data attribute on the row rather
than a visible column.

A likely table, not cards (945's existing `Properties`/`History` tabs are
already table-like — matches precedent over inventing a new list widget).

---

## 4. Defect Detail — Full Record + Actions

"查看完整资料" — proposing all 19 DefectItem schema fields are visible
somewhere on this page (the 10 from the List, plus SubmittedAt,
RectificationStartDate, DeveloperClaimedCompletedDate, OwnerVerifiedDate,
ClosedDate, CreatedAt, UpdatedAt) — genuinely complete, not a second copy
of the List's 10. **OPEN**: some of those (CreatedAt/UpdatedAt
especially) may be more audit-trail than something CC actually wants
staring back at them during real fieldwork — flag for trim once CC sees
a draft.

Actions panel below the record: Update Developer Status, Record Owner
Verification, Evidence, Secondary Damage (§§5–8). No Close/Reopen
control at all in Phase 1 — proposing they're simply **absent** rather
than present-but-disabled, since a visible dead button invites "why can't
I click this" more than an absent one does. **OPEN** if CC would rather
see a disabled placeholder as a visible signpost for what's coming.

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

## 7. Evidence — View + Attach

`listEvidenceForDefect(defectId)` for the view; `attachEvidence({
relatedCaseId, relatedDefectId, evidenceType, phase, source, description,
capturedAt, driveFileId | (base64Data+fileName+mimeType), clientRequestId})`
for attaching (911, not 918 — a different Engine, same Lock discipline).
`relatedCaseId` is required by the Command regardless; `relatedDefectId`
set to the Detail page's DefectID is what scopes it to this one defect
rather than the whole Case.

Unlike Mobile Console — which hardcodes `evidenceType: 'Photo'` /
`phase: 'NotApplicable'` (Contract §5, deliberately simplified for a
30-second on-site capture) — proposing Sidebar exposes the **full**
choice sets, since this is the desktop/deliberate surface: `EVIDENCE_
TYPES` (10 values: Photo/Video/Email/PDF/WhatsAppScreenshot/
DeveloperReport/ContractorReport/InspectionReport/
MobileAppSubmissionProof/Other) and `EVIDENCE_PHASES` (Before/During/
After/NotApplicable). **OPEN**: confirm this reading — CC's note didn't
specify evidence-type granularity, this is Claude's inference from the
Mobile Contract's own "those distinctions matter more for ... a
Sidebar-only workflow" line, not something CC has stated directly for
Evidence specifically (that line was about RectificationEvent
documentation).

---

## 8. Secondary Damage — View + Log

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

---

## 9. Correspondence — Case-Level, Not Defect-Level (data-model correction)

CC's note grouped Correspondence with Evidence/Secondary Damage as
something the Defect Detail page shows. Verified directly against
`logCorrespondence`'s actual input — `{caseId, date, direction, sender,
recipient, subject, responseStatus, responseRequestedDate,
responseWorkingDays, responseDueDate, clientRequestId}` — **there is no
defectId field at all**, and no `listCorrespondenceForDefect` query
exists (only `listCorrespondenceForCase`). Correspondence in this Domain
Model is a Case-wide concern, not a per-defect one.

Proposing Correspondence move to the **Defect List screen** (a Case-wide
panel, e.g. alongside or above the list) rather than nest under one
Defect's Detail page — showing it on Detail would misrepresent it as
being "about" that specific defect when the data model makes no such
claim. **OPEN — asking CC to confirm or override**: is there a reason to
want it on Detail anyway (e.g. filtering by keyword/defect mention in
`subject` client-side)? That's presentation-layer filtering over
case-wide data, not a new Domain capability, so it's possible without
touching 918 if CC wants it — just flagging that it's not the same thing
as "this correspondence belongs to this defect."

---

## 10. Field Alignment — ItemID / SubCategory / Remark Across Both Surfaces

CC's explicit instruction, diverging from Claude's original "leave
`enrichDefectForDisplay_` untouched" boundary from the Mobile Console
round: since Sidebar work is starting now, align the full data model
across both UI surfaces in the same pass rather than let Mobile and
Sidebar drift into two different field sets that get reconciled later.

- **901 (Schema)**: unchanged — all three fields already exist, this is
  presentation, not schema design.
- **918 (Domain/Truth Layer)**: unchanged.
- **922 (Projection)**: `enrichDefectForDisplay_` gains `subCategory` /
  `remark` (it already has `itemId` from the earlier rename) — the same
  kind of additive, defaulted-to-`''` change already made to
  `buildCaseOverviewForMobile_` for Mobile Console. A **new** projection
  function is also needed for the Detail page's fuller bundle (defect +
  its Evidence + its Secondary Damage) — no such aggregation exists yet;
  proposing something like `buildDefectDetailForSidebar_`, same
  single-pass-read discipline `buildCaseOverviewForMobile_` already
  established, not a naive per-field round-trip.
- **UI (945/948)**: both present the same field set for what they each
  choose to show — Mobile Console's compact card and Sidebar's fuller
  List/Detail aren't required to show identical layouts, but neither
  should silently omit a field the other has just because nobody
  remembered to add it.

---

## 11. Layer Responsibilities

- **918** — Truth Layer. Every write in this document goes through an
  existing Command (§§5, 6, 7, 8) — zero new Domain logic, zero Schema
  change, zero dedup-logic change, matching CC's explicit boundary.
- **922** — Projection. New/extended presentation-only functions per §10.
  Reads only; never itself calls a 918 Command.
- **946 / 947** — thin `wrap_`-style glue, same discipline 946's own
  header comment already states and 947 already follows for Mobile:
  catches whatever a Command/Query throws, returns `{success, data|error,
  code}`. **OPEN**: new `dlp_*` functions added to 947 itself (947's own
  header comment already anticipated serving "the future Sidebar DLP Tab"
  too, so this is the more consistent home) vs a parallel `console_dlp_*`
  set in 946 — proposing 947, for the reason in its own comment, but this
  is a real fork CC should confirm rather than Claude picking silently.
- **945** — new `view-dlp` div + the List/Detail sub-navigation in §2.
  Zero business logic — same rule 948 already follows.

---

## 12. Reliability — `clientRequestId` Explicitly Deferred

Verified: **none** of `recordDeveloperStatus` / `recordOwnerVerification`
/ `closeDefectItem` / `reopenDefectItem` / `closeCase` have
`clientRequestId` idempotency support today, unlike every Command
currently reachable from Mobile Console (`createPropertyCase`,
`addDefectItem`, `logDailyProgressCheck`, `attachEvidence` — all have
it).

CC's explicit decision: **do not retrofit it for this Sidebar work.**
Sidebar is desktop + a relatively stable connection + a deliberate
management action, unlike Mobile's on-site + flaky-connection + needs-
retry-safety profile that motivated the pattern in the first place.
Mechanically adding idempotency to 918 just because its current absence
was noticed here would be exactly the "found a gap, so expand Domain
while we're at it" pattern this project keeps deliberately avoiding. If
real Sidebar usage later surfaces an actual duplicate-submission problem
on a *specific* Command, that Command gets it then — not all five,
speculatively, now.

---

## 13. Phase 2 — Explicitly Deferred (not this round)

Split into two distinct lifecycles per CC's instruction — the UI should
never present a single generic "Close" button that blurs them:

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
to feel like (matching CC's own stated rhythm: real usage → feedback →
next Contract slice, not Claude designing it speculatively now).

---

## 14. Error / Success / Concurrency Behavior

Proposing Sidebar reuses the same shape 946/947 already establish —
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

## 15. Explicitly NOT Doing (This Phase)

- Close Defect / Reopen Defect / Close Case UI (§13)
- `clientRequestId` retrofit on any of the five Commands (§12)
- Rectification Event logging UI (§1 — flagged as unmentioned, not
  assumed in scope)
- Any change to 901 (Schema), 918 (Domain logic/dedup), or existing
  Mobile Console (948) behavior
- A generalized "correspondence about this defect" capability — §9's
  proposal keeps Correspondence at the Case level, matching what the data
  model actually supports today

---

## 16. Open Questions — Needs CC Decision

1. Rectification Event logging — intentionally excluded from Phase 1, or
   an oversight in the original note? (§1)
2. Detail page: absent Close/Reopen entirely, or a visible-but-disabled
   placeholder as a signpost? (§4)
3. Evidence Type/Phase — full choice sets on Sidebar (Claude's proposal)
   or keep it simple like Mobile? (§7)
4. Correspondence — confirm moving it to the Case-level List screen
   rather than nested in Defect Detail, or is there a reason to want it
   on Detail anyway? (§9)
5. New `dlp_*` glue lives in 947 (Claude's proposal, matching 947's own
   stated intent) or a new `console_dlp_*` set in 946? (§11)

---

## 17. Next Steps

Per CC's instruction: **not coding.** This draft is for review — once CC
approves (with whatever changes come out of §16), the actual build order
would likely be 922's new/extended projection functions → 947 (or 946)
glue → 945 UI, mirroring how Mobile Console itself was built only after
its own Contract was settled. Stopping here.
