# DLP Defect Case & Rectification Tracking — Vertical Slice (Runtime Complete, Phase 1-8)

**Status: Phase 0-8 DONE and deployed to real GAS, confirmed phase-by-phase. Phase 9-11 (Mobile Web Console, Sidebar DLP Tab, formal GAS-native tests) NOT started.**
**Real-world origin**: CC's own Est8 Seputeh A-19-11 unit, real DLP process (140+ defects originally submitted 13 Aug 2026), not a practice exercise.
**Full audit + design rationale**: see the standalone Phase0 Audit doc (already delivered as a file earlier in the build) for the complete decision-by-decision writeup — this document is the settled, current-state reference; that one is the historical record of *how* each decision got made.
**Governance**: ADR-P15 (Case module scope; DeveloperStatus/OwnerVerificationStatus independence + Repair Cycle follow-up), ADR-P16 (Evidence/911 pulled forward), ADR-P17 (Property DevelopmentName/UnitLabel split) — all in `00_ADR_Log.js`. Data Ownership updated in `00_Project_Constitution.js` §7. Aggregates + ERD updated in `PropertyOS_DomainModel.md` §2/§3.

---

## 1. Business Rules

- **DeveloperStatus and OwnerVerificationStatus are independent, full stop.** No Command may ever write both. `recordDeveloperStatus` touches only `DeveloperStatus`/`DeveloperClaimedCompletedDate`; `recordOwnerVerification` touches only `OwnerVerificationStatus`/`OwnerVerifiedDate`. This is what lets "Developer: ClaimedCompleted" and "Owner: FailedVerification" be simultaneously true and durable — confirmed against real GAS execution logs, not just local tests.
- **`DefectItem.Status` is mostly derived, never independently settable to a non-Closed value.** `deriveDefectItemStatus_(developerStatus, ownerVerificationStatus)` computes Open/InProgress/PendingVerification/Verified from the two sub-statuses (Owner's definite outcomes — Verified, FailedVerification, PartiallyVerified — take precedence over Developer's ClaimedCompleted; only when Owner is still NotChecked does Developer's status drive the result). `Closed` is reachable only via `closeDefectItem` (requires `OwnerVerificationStatus === 'Verified'` first) and reversible only via `reopenDefectItem` (requires a `reason`).
- **`NotedOnly` is never auto-upgraded.** A "noted with thanks" correspondence response stays `NotedOnly` until someone explicitly calls `recordCorrespondenceResponse` again with a different status. It also still counts as *overdue* if past its due date — `isCorrespondenceOverdue_` treats only `Answered`/`Rejected` as resolved.
- **A Case only closes when every DefectItem under it is Closed.** `closeCase` throws `DLP_CASE_HAS_OPEN_DEFECTS` listing exactly which ones, otherwise.
- **The system never judges legal responsibility.** `SecondaryDamage.ResponsibleParty`/`DlpPrejudiceStatus`/`ContractualBasis` are plain neutral text fields, never computed, never a system-generated conclusion.
- **`RectificationEvent` is append-only.** Every milestone (access, start, completion claim, rejection, reinspection-required) is a new row, distinguished by `EventType`, never an update to a past one. Deliberately does NOT auto-update `DefectItem.DeveloperStatus` even when `EventType === 'DeveloperClaimedCompleted'` — that's a separate, explicit `recordDeveloperStatus` call, avoiding an implicit cross-entity side effect from a free-text field.
- **Working-day deadline math skips weekends only**, no public-holiday calendar (task's literal ask; Additive to extend later if needed).
- **Additive-only, always.** Every schema change across all 8 phases appended new columns/sheets/enum values; nothing existing was renamed, reordered, or removed. The one place this actually bit: `Property.columns` gained two fields that had to be appended at the very end, never inserted mid-list, because `ensureSheetSchema_` does a positional header match against the real, already-deployed sheet — inserting earlier would have false-positived a schema drift error across every column after the insertion point. Real Properties sheet required a one-time manual header patch (columns AD/AE) before deployment; done, confirmed 2026-08-16.

---

## 2. Truth Layer Schema

All in `901_PropertySchema.js`, `PROPERTY_SCHEMA` object. Enums live in `900_PropertyConfig.js`, `PROPERTY_CONFIG`. Date columns use the project's existing `parseIsoDate_`/`toIsoDate_`/`coerceToIsoDateString_` (never `new Date(isoString)` directly — UTC-parse hazard).

### `Property` (existing Aggregate, Property Asset Engine — 910) — 2 new columns, ADR-P17
Appended at the very end of the existing 29-column list: `DevelopmentName` (string, optional), `UnitLabel` (string, optional). `PropertyName` untouched. Real record (`PROP-mshs0wca-skrq`): `PropertyName='Est8 Seputeh'`, `DevelopmentName='Est8 Seputeh'`, `UnitLabel='A-19-11'`, `VPDate='2026-07-18'`. `DefectExpiry` still blank on the real record as of Phase 8 — see §9.

### `Evidence` (new Aggregate Root, Document Engine — 911, minimal scope)
`EvidenceID` (PK, `DOC-`, reuses the Document prefix, not a new one) · `EvidenceType` (enum) · `DriveFileID` · `CapturedAt` (optional) · `UploadedAt` · `Source` · `Description` (optional) · `Phase` (Before/During/After/NotApplicable) · `RelatedCaseID` (required FK) · `RelatedDefectID` (optional FK) · `RelatedEntityType`/`RelatedEntityID` (optional polymorphic pointer to a DailyProgressCheck/Correspondence/RectificationEvent/SecondaryDamage row) · `CreatedAt`. Unidirectional — Evidence never knows what references it back (same principle as the pre-existing planned `Document → Occurrence` relationship).

### `PropertyCase` (new Aggregate Root, Defect Engine — 918)
`CaseID` (PK, `CASE-`) · `PropertyID` (FK) · `CaseType` (enum, only `'DLP'` today) · `CaseTitle` · `ManagementOffice` (optional) · `DlpStartDate` · `OriginalSubmissionDate` · `OriginalSubmissionSource` · `OriginalDefectCount` (static snapshot, not a live count) · `Status` (Open/InProgress/Closed) · `CreatedAt`/`UpdatedAt`. Does **not** store `Developer` or a DLP end date — both read from the linked `Property` at display time (single source of truth).

### `DefectItem` (internal Entity of PropertyCase)
`DefectID` (PK, reuses the pre-reserved `DEFECT-` prefix) · `CaseID` (FK) · `OriginalReference` · `Category` (enum, extensible starter list) · `Location` · `Description` · `Priority` (Critical/High/Medium/Low) · `Status` (derived, see §1) · `DeveloperStatus` (Pending/Scheduled/InProgress/ClaimedCompleted) · `OwnerVerificationStatus` (NotChecked/Verified/FailedVerification/PartiallyVerified) · `SubmittedAt` · `RectificationStartDate` (optional) · `DeveloperClaimedCompletedDate` (optional) · `OwnerVerifiedDate` (optional) · `ClosedDate` (optional) · `CreatedAt`/`UpdatedAt`.

### `DailyProgressCheck` (internal Entity of PropertyCase)
`CheckID` (PK, `CHECK-`) · `CaseID` (FK) · `DateTime` · `CheckedBy` · `AccessObserved`/`ContractorObserved`/`DeveloperRepresentativeObserved` (booleans, all default false) · `WorkObserved` (optional) · `GeneralStatus` (optional) · `Notes` (optional) · `CreatedAt`. No `DefectID` — this is a Case-level fact, not per-defect (matters for dashboard design, §5).

### `Correspondence` (internal Entity of PropertyCase)
`CorrespondenceID` (PK, `CORR-`) · `CaseID` (FK) · `Date` · `Direction` (Sent/Received) · `Sender`/`Recipient` · `Subject` · `ResponseStatus` (Pending/PartiallyAnswered/Answered/Rejected/NotedOnly) · `ResponseRequestedDate` (optional) · `ResponseDueDate` (optional, via `addWorkingDays_` or explicit override) · `ResponseReceivedDate` (optional) · `CreatedAt`/`UpdatedAt`.

### `RectificationEvent` (internal Entity of PropertyCase, append-only — CC Review Approval 2026-08-15)
`RectificationEventID` (PK, `RECT-`) · `CaseID` (FK) · `DefectID` (optional FK, null = case-level) · `EventType` (AccessRequested/AccessGranted/RectificationStarted/RectificationCompleted/RectificationRejected/ReinspectionRequired/DeveloperClaimedCompleted) · `EventDate` · `EntryTime`/`ExitTime` (optional) · `ContractorCompany`/`ContractorPersonnel` (optional) · `Notes` (optional) · `Source` (DeveloperProvided/OwnerObserved) · `CreatedAt`.

### `SecondaryDamage` (internal Entity of PropertyCase)
`DamageID` (PK, `DMG-`) · `CaseID` (FK) · `ParentDefectID`/`RectificationEventID` (optional FKs) · `DamageType` (enum) · `Description` · `ObservedDate`/`ObservedBy` · `ResponsibleParty` (optional, neutral text) · `Status` (Reported/Acknowledged/Rectified/Disputed, no transition guard) · `Resolution` (optional) · `AdministrativeSubmissionRequired` (boolean) · `SeparateSubmissionID`/`DlpPrejudiceStatus`/`ContractualBasis` (optional, neutral text) · `CreatedAt`/`UpdatedAt`.

### `PropertyCaseTimeline` (read-side projection of the five entities above, append-only)
`TimelineEntryID` (PK, `TLE-`) · `CaseID` (FK) · `EntryType` (mirrors a PROPERTY_EVENTS name) · `OccurredAt` · `Summary` (human-readable, built per-Command — see `buildDailyCheckSummary_`/`buildRectificationEventSummary_`/`humanizeEventType_` in 918) · `RelatedDefectID`/`RelatedEntityType`/`RelatedEntityID` (optional) · `TriggeredBy` (which Command wrote it) · `CreatedAt`. The durable substitute for "replaying the EventBus" — `publishPropertyEvent_` (903) is a Logger-only placeholder (ADR-P07/P12), not a queryable store, so this table is genuinely necessary, not redundant with it.

---

## 3. Domain Model

`PropertyCase` is the Aggregate Root; `DefectItem`/`DailyProgressCheck`/`Correspondence`/`RectificationEvent`/`SecondaryDamage` are internal Entities — created only through PropertyCase's own Commands, never standalone (same rule `ObligationOccurrence` already follows relative to `ObligationRule`). `Evidence` is a separate, lightweight Aggregate Root (Document Engine) referenced by ID only, unidirectionally. Full ERD in `PropertyOS_DomainModel.md` §3 (updated 2026-08-17).

**Deliberate non-decision**: no generic `PropertyCaseEngine`/Case abstraction — `CaseType` is the only extension point, and it stays single-valued until a second real Case type exists (ADR-P15, Candidate Pattern discipline already established elsewhere in this project).

**Documented Domain Model limitation** (ADR-P15, not a bug): `OwnerVerificationStatus` lives directly on `DefectItem`, not scoped to a specific repair attempt. After a `FailedVerification`, a fresh Developer `ClaimedCompleted` claim doesn't reset it (keeping the two fields independent was judged more important than this convenience). Correct long-term fix: a **Repair Cycle / Verification Cycle** internal Entity, each cycle owning its own Developer claim + Owner verification. Not implemented — deferred until a real second example of the same shape justifies it.

---

## 4. Event Contract

All in `903_PropertyEventDefinitions.js`, `PROPERTY_EVENTS` + `PROPERTY_EVENT_REQUIRED_FIELDS`. Added incrementally, one Phase at a time, only when the Command publishing them actually existed — never spec'd ahead of need. All published via the unmodified `publishPropertyEvent_(eventType, propertyId, null, payload)` — `obligationId` position is always `null` for these, exactly like `910`'s `PROPERTY_CREATED`/`PROPERTY_SOLD` already do.

| Event | Required fields | Published by |
|---|---|---|
| `CASE_CREATED` | caseId, propertyId, caseType, status | createPropertyCase |
| `DEFECT_ITEM_ADDED` | caseId, defectId, category, priority, status | addDefectItem |
| `DEFECT_ITEM_UPDATED` | caseId, defectId, changedFields | updateDefectItem |
| `DEVELOPER_STATUS_UPDATED` | caseId, defectId, developerStatus | recordDeveloperStatus |
| `OWNER_VERIFICATION_RECORDED` | caseId, defectId, ownerVerificationStatus | recordOwnerVerification |
| `DEFECT_ITEM_CLOSED` | caseId, defectId, closedDate | closeDefectItem |
| `DEFECT_ITEM_REOPENED` | caseId, defectId, reason | reopenDefectItem |
| `CASE_CLOSED` | caseId, closedDate | closeCase |
| `DAILY_CHECK_LOGGED` | caseId, checkId, dateTime, accessObserved | logDailyProgressCheck |
| `EVIDENCE_ATTACHED` | evidenceId, evidenceType, relatedCaseId | attachEvidence (911) |
| `CORRESPONDENCE_LOGGED` | caseId, correspondenceId, direction, subject | logCorrespondence |
| `CORRESPONDENCE_RESPONSE_RECORDED` | caseId, correspondenceId, responseStatus | recordCorrespondenceResponse |
| `RECTIFICATION_EVENT_LOGGED` | caseId, rectificationEventId, eventType, eventDate | logRectificationEvent |
| `SECONDARY_DAMAGE_LOGGED` | caseId, damageId, damageType | logSecondaryDamage |
| `SECONDARY_DAMAGE_STATUS_UPDATED` | caseId, damageId, status | updateSecondaryDamageStatus |

All real-GAS-confirmed to publish with correctly shaped payloads (execution logs showed clean completion with no required-field errors, across every phase).

---

## 5. Command Contract

**918_DefectEngine.js** — infra: `withDefectEngineLock_`, `logDefectEnginePartialFailure_`, `getCachedDefectEngineCommandResult_`/`cacheDefectEngineCommandResult_` (namespace `propertyos_idem_defect_`), 7 sheet accessors, `appendCaseTimelineEntry_`, `deriveDefectItemStatus_`, `addWorkingDays_`, `isCorrespondenceOverdue_`, `humanizeEventType_`, `buildDailyCheckSummary_`/`buildRectificationEventSummary_`, `assertPropertyCaseTransition_`, `assertDefectItemNotClosed_`.

Commands (all Lock-wrapped, all support optional `clientRequestId` idempotency): `createPropertyCase`, `addDefectItem`, `updateDefectItem`, `recordDeveloperStatus`, `recordOwnerVerification`, `closeDefectItem`, `reopenDefectItem`, `closeCase`, `logDailyProgressCheck`, `logCorrespondence`, `recordCorrespondenceResponse`, `logRectificationEvent`, `logSecondaryDamage`, `updateSecondaryDamageStatus`.

Reads: `getPropertyCase`, `getDefectItem`, `listDefectItemsForCase`, `getDailyProgressCheck`, `listDailyChecksForCase`, `getCorrespondence`, `listCorrespondenceForCase`, `getRectificationEvent`, `listRectificationEventsForCase`, `listRectificationEventsForDefect`, `getSecondaryDamage`, `listSecondaryDamageForCase`, `listSecondaryDamageForDefect`, `caseExists_`, `defectItemExists_`.

**911_DocumentEngine.js** — infra: `withDocumentEngineLock_`, `logDocumentEnginePartialFailure_`, cache pair (namespace `propertyos_idem_doc_`), `evidenceSheet_`. Drive Adapter (ADR-P07/P11, the only functions touching `DriveApp`): `getEvidenceRootFolder_`, `getOrCreateCaseEvidenceFolder_`, `saveEvidenceFile_`. Command: `attachEvidence` (either an existing `driveFileId`, or `base64Data`+`fileName`+`mimeType` to upload fresh). Reads: `getEvidence`, `listEvidenceForCase`, `listEvidenceForDefect`.

**922_DashboardAdapter.js additions** — all read-only, own no Truth tables: `enrichPropertyCaseForDisplay_` (incl. the `DlpEndDate` estimate fallback), `enrichDefectForDisplay_`, `isRectificationEventUpcoming_`, `getCaseTimeline(caseId, limit)`, `listDefectItemsForDashboard(caseId)`, `getDlpCaseDashboard(caseId)` (the one bundled call — defect counts across all three independent status dimensions, secondary damage counts, correspondence incl. overdue, upcoming rectification/reinspection, last-checked, recent timeline).

Every non-generic input field has a documented denylist or allowlist; every FK gets an existence check; cross-entity pairs (`relatedDefectId` vs `caseId`, `parentDefectId` vs `caseId`) get a mismatch check (`*_CASE_MISMATCH` error codes) — copy-paste-wrong-ID mistakes fail loudly, not silently.

---

## 6. State Machines

**PropertyCase.Status**: `Open → InProgress → Closed`, plus `Open → Closed` directly (edge case, zero-defect case). `InProgress` triggered automatically by the first `addDefectItem` call — not a separate Command. `Closed` only via `closeCase`, gated on every DefectItem being Closed.

**DefectItem.Status**: mostly *derived* (§1), not a conventional state machine. `Closed` is the only genuinely guarded boundary — `closeDefectItem` requires `OwnerVerificationStatus === 'Verified'`; `reopenDefectItem` requires currently `Closed` + a `reason`.

**DefectItem.DeveloperStatus / OwnerVerificationStatus**: no transition graph at all, just enum-membership validation. Deliberate — real-world DLP messiness (contractor no-shows, repeated verification attempts) doesn't fit a clean forward-only graph, and the audit trail (Timeline + RectificationEvent) carries the history instead of a state machine trying to police it.

**SecondaryDamage.Status**: same — no transition graph, `Disputed` can legitimately return to `Acknowledged`.

---

## 7. Error Strategy

Every validation failure throws via the existing `propertyError_(code, message)` with a specific, greppable code — `DLP_CASE_*`, `DEFECT_ITEM_*`, `CORRESPONDENCE_*`, `RECTIFICATION_EVENT_*`, `SECONDARY_DAMAGE_*`, `EVIDENCE_*`, `DOCUMENT_ENGINE_*`/`DEFECT_ENGINE_LOCK_TIMEOUT`. No generic catch-all errors. Every Command's Truth-write-succeeded-but-Timeline/Event-publish-failed path is caught, logged via the engine's own `logXPartialFailure_`, then rethrown — never silently swallowed.

---

## 8. Cross-Engine Dependencies

`918 → 910` (propertyExists_/getProperty, read-only). `911 → 918` (caseExists_/defectItemExists_/getDefectItem/appendCaseTimelineEntry_ — one-directional; 918's own Commands never call into 911). `922 → 918` (getCaseTimeline calls 918's private `propertyCaseTimelineSheet_` directly — same cross-file private-helper reuse this file already used on 912's `getObligationRuleById_`). No cycles.

---

## 9. Known Limitations / Follow-ups (not blocking, all consciously deferred)

1. **Repair Cycle / Verification Cycle** (ADR-P15) — see §3. The one real Domain Model gap found during this build.
2. **"Upcoming Rectification/Reinspection" relies on a convention**, not a dedicated field — a `RectificationEvent` with `EventDate >= today` is treated as scheduled. Works, but if Phase 9/10's UI makes this feel unnatural, may need a real "scheduled" field.
3. **`DefectExpiry` is still blank on the real Property record** as of Phase 8 (`VPDate='2026-07-18'` is set; the 24-month DLP end date, `2028-07-18` per standard Schedule H, has not been explicitly confirmed/entered — `922`'s dashboard shows it as an *estimate* until it is).
4. **A real Case exists from the Phase 4 smoke test** (`CASE-mswhunuc-j26l` or similar, against the real Property, with 2 real DailyProgressCheck rows) — CC has not yet said whether to keep this as the actual start of real tracking or clear it before real use begins.
5. **Working-day calculation has no public-holiday calendar** (§1) — Additive to add if it turns out to matter.
6. **`RectificationEvent`/`SecondaryDamage` don't currently get their own `997_Tests_DefectEngine.js` GAS-native regression coverage** — only local GasShim pre-checks + manual smoke tests so far. That's Phase 11, not started.

---

## 10. Verification Summary

Every phase: local GasShim pre-check first (cumulative 210+ local checks across 918/911/922's test files, including one real logic bug caught and fixed — `deriveDefectItemStatus_`'s precedence, see ADR-P15), then CC deployed to real GAS and ran `runAllPropertyOSTests` (stayed 141/141 throughout, zero regressions in the pre-existing Obligation/Property engines) plus a phase-specific smoke test with a real execution log reviewed line-by-line (not just "it passed"). Phase 5 (Evidence) is independently confirmed against real Google Drive — real folder/file URLs captured in `MANUAL_VERIFICATION_CHECKLIST.md`. Full detail, including what's *still* unconfirmed (genuine concurrent Lock contention, Cache TTL expiry, Drive sharing scope), is tracked there, not here — that file is the living checklist, this one is the settled design record.

---

## 11. Explicitly NOT Done Yet — Phase 9-11

- **Phase 9**: standalone `doGet()` Mobile Web Console. Today there is still zero Web App entry point in this project — the only UI is the Sidebar, which requires opening the actual Google Sheet first. Needs a design conversation with CC before implementation (UI/layout decisions, unlike Phases 1-8 which were largely derivable directly from the task spec).
- **Phase 10**: Mobile-optimized fast Daily Check UX (30-60 second target) built on top of Phase 9.
- **Phase 11**: `997_Tests_DefectEngine.js`, formal GAS-native regression suite matching the `990`-style conventions, to fold DLP coverage into the same tier of confidence the Obligation/Property engines already have (currently 141/141 doesn't include any dedicated DLP assertions — it's clean because nothing DLP-related broke anything else, not because DLP itself has formal GAS-native tests yet).
- Sidebar (`945`/`946`) DLP Tab — same backend, new UI surface, not yet added.
