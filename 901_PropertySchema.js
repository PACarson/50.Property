/**
 * ═══════════════════════════════════════════════════════════════════════
 * PROPERTY OS — 901_PropertySchema.js
 * Foundation Layer — Schema
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Governs: ObligationEngine_VerticalSlice.md §2 (Truth Layer Schema)
 * Session 1, Part A (Foundation) — file 2 of 4.
 *
 * Only the three Obligation tables are defined here — they are the only
 * entities whose schema has passed Architecture Review. Other entities
 * (Property, Loan, Document, ...) are added when their own Phase begins.
 *
 * Depends on: 900_PropertyConfig.js
 * ═══════════════════════════════════════════════════════════════════════
 */

var PROPERTY_SCHEMA = Object.freeze({

  ObligationRule: Object.freeze({
    sheetName: PROPERTY_CONFIG.SHEET_NAMES.OBLIGATION_RULES,
    columns: Object.freeze([
      'ObligationID',        // string PK, OBL-...
      'PropertyID',          // string FK -> Properties (Phase 1 Asset Engine)
      'LoanID',               // string FK, optional (Category = Mortgage)
      'LeaseID',              // string FK, optional (Category = RentalCollection)
      'Category',             // enum, PROPERTY_CONFIG.OBLIGATION_CATEGORIES
      'Payee',                 // string
      'Amount',                // number
      'Currency',              // string, ISO 4217
      'FrequencyType',        // enum, PROPERTY_CONFIG.FREQUENCY_TYPES
      'CustomIntervalDays',   // number, required iff FrequencyType = 'Custom'
      'DueAnchor',             // ISO date string (yyyy-MM-dd)
      'ReminderOffsets',      // JSON string, e.g. "[30,14,7,3,1,0,-1,-3,-7]"
      'AutoGenerate',          // boolean
      'GraceDays',             // number, default 0
      'EndDate',               // ISO date string, optional (-> Completed)
      'Status',                // enum, PROPERTY_CONFIG.OBLIGATION_RULE_STATUSES
      'CreatedAt',             // ISO datetime string
      'UpdatedAt'              // ISO datetime string
    ]),
    // Forced to plain-text format on sheet creation (see ensureSheetSchema_)
    // so Sheets never silently reinterprets an ISO string as a Date serial.
    dateColumns: Object.freeze(['DueAnchor', 'EndDate', 'CreatedAt', 'UpdatedAt'])
  }),

  ObligationOccurrence: Object.freeze({
    sheetName: PROPERTY_CONFIG.SHEET_NAMES.OBLIGATION_OCCURRENCES,
    columns: Object.freeze([
      'OccurrenceID',    // string PK, OCC-...
      'ObligationID',    // string FK -> ObligationRule
      'EffectiveDue',    // ISO date string — idempotency key with ObligationID
      'Amount',          // number, snapshot at creation time
      'Currency',        // string
      'Status',          // enum, PROPERTY_CONFIG.OBLIGATION_OCCURRENCE_STATUSES
      'PaidDate',        // ISO date string, optional
      'PaidAmount',      // number, optional
      'PaidVia',         // enum, PROPERTY_CONFIG.PAID_VIA_OPTIONS, optional
      'Evidence',        // string, DocumentID, optional
      'ReversedAt',      // ISO datetime string, optional (ADR-P06)
      'ReversalReason',  // string, optional (ADR-P06)
      'CreatedAt',
      'UpdatedAt'
    ]),
    // EffectiveDue is the idempotency key (with ObligationID) — it MUST
    // stay a plain string on read, or the equality check in
    // findOccurrenceByRuleAndDue_ silently breaks.
    dateColumns: Object.freeze(
      ['EffectiveDue', 'PaidDate', 'ReversedAt', 'CreatedAt', 'UpdatedAt']
    )
  }),

  // Append-only. No function anywhere in Property OS should UPDATE or
  // DELETE a row in this sheet — see Constitution P10 / ADR-P06.
  ObligationHistory: Object.freeze({
    sheetName: PROPERTY_CONFIG.SHEET_NAMES.OBLIGATION_HISTORY,
    columns: Object.freeze([
      'HistoryID',     // string PK, HIST-...
      'OccurrenceID',  // string FK -> ObligationOccurrence
      'FromStatus',
      'ToStatus',
      'ChangedAt',     // ISO datetime string
      'TriggeredBy',   // Command or Event name
      'Note'           // string, optional
    ]),
    dateColumns: Object.freeze(['ChangedAt'])
  }),

  // 910_PropertyAssetEngine. Field list + Address VO decision:
  // PropertyAssetEngine_VerticalSlice.md §2 (Review Approval 2026-07-19).
  // DevelopmentName/UnitLabel added Phase 1 of the 918_DefectEngine
  // Vertical Slice (ADR-P17, Review Approval 2026-08-16) — see the
  // MIGRATION NOTE below initPropertySchema_() before deploying this.
  Property: Object.freeze({
    sheetName: PROPERTY_CONFIG.SHEET_NAMES.PROPERTIES,
    columns: Object.freeze([
      'PropertyID',        // string PK, PROP-...
      'PropertyName',
      'Developer',
      // Structured Address VO (Review Approval 2026-07-19) — six
      // columns, not one flat string. formattedAddress is NOT a column
      // here — it's derived on read via formatAddress_(), never stored.
      'AddressLine1',
      'AddressLine2',
      'AddressCity',
      'AddressState',
      'AddressPostcode',
      'AddressCountry',
      'GPS',                // 'lat,lng' string; not a GeoPoint VO (§3)
      'PurchaseDate',
      'PurchasePrice',
      'CurrentValue',        // defaults to PurchasePrice if omitted (§1)
      'LoanID',              // FK, format-checked only — 915 doesn't exist yet
      'BuiltUp',
      'LandSize',
      'FreeholdLeasehold',
      'Parking',
      'StoreRoom',
      'CompletionDate',
      'VPDate',
      'DefectExpiry',
      'Status',              // Active / Sold (§6)
      'SoldDate',             // set only via MarkPropertySold
      'SoldPrice',            // set only via MarkPropertySold
      'Owner',
      'PropertyType',         // UPPER_SNAKE_CASE — see PROPERTY_CONFIG note
      'CreatedAt',
      'UpdatedAt',
      // ── ADR-P17 additions (Phase 1, 2026-08-16) — MUST stay appended
      // at the end, never inserted earlier in this list. ensureSheetSchema_
      // does a positional match against the real sheet's existing header;
      // inserting mid-list would misalign every column after it and throw
      // a false "Schema drift" for the whole table, not just these two.
      'DevelopmentName',      // string, optional. Not required for non-strata
                               // PropertyTypes. No separate Development entity
                               // yet — only one real Property exists, so there
                               // is no second example to justify normalizing
                               // it out (Candidate Pattern discipline).
      'UnitLabel'              // string, optional, e.g. "A-19-11"
    ]),
    dateColumns: Object.freeze([
      'PurchaseDate', 'CompletionDate', 'VPDate', 'DefectExpiry',
      'SoldDate', 'CreatedAt', 'UpdatedAt'
    ])
  }),

  // 911_DocumentEngine Vertical Slice — Phase 1 (Review Approval
  // 2026-08-15/16, Phase0 Audit §3.2/§4.7). Deliberately minimal — not
  // the full future Document Library (PII handling, full-text search,
  // etc.), just what a PropertyCase needs. Reuses ID_PREFIXES.DOCUMENT
  // ('DOC'), not a new prefix.
  Evidence: Object.freeze({
    sheetName: PROPERTY_CONFIG.SHEET_NAMES.EVIDENCE,
    columns: Object.freeze([
      'EvidenceID',          // string PK, DOC-...
      'EvidenceType',         // enum, PROPERTY_CONFIG.EVIDENCE_TYPES
      'DriveFileID',           // string
      'CapturedAt',             // ISO datetime, optional
      'UploadedAt',              // ISO datetime
      'Source',                   // string
      'Description',               // string, optional
      'Phase',                      // enum, PROPERTY_CONFIG.EVIDENCE_PHASES
      'RelatedCaseID',                // string FK, required
      'RelatedDefectID',                // string FK, optional
      'RelatedEntityType',                // enum, PROPERTY_CONFIG.EVIDENCE_RELATED_ENTITY_TYPES, optional
      'RelatedEntityID',                    // string, optional
      'CreatedAt'
    ]),
    // Unidirectional — Evidence never knows which rows reference it back
    // (mirrors the planned Document -> Occurrence relationship already
    // in PropertyOS_DomainModel.md §4, "avoid reverse dependency").
    dateColumns: Object.freeze(['CapturedAt', 'UploadedAt', 'CreatedAt'])
  }),

  // 918_DefectEngine Vertical Slice — Phase 1 (Review Approval
  // 2026-08-15/16, Phase0 Audit §4.1). Aggregate Root. CaseType is
  // single-valued today ('DLP' only) — see PROPERTY_CONFIG.PROPERTY_CASE_TYPES.
  // Deliberately does NOT store Developer or a DLP end date — both are
  // read from the linked Property (Developer, DefectExpiry) at display
  // time via getProperty(propertyId), single source of truth.
  PropertyCase: Object.freeze({
    sheetName: PROPERTY_CONFIG.SHEET_NAMES.PROPERTY_CASES,
    columns: Object.freeze([
      'CaseID',                    // string PK, CASE-...
      'PropertyID',                 // string FK -> Property
      'CaseType',                    // enum, PROPERTY_CONFIG.PROPERTY_CASE_TYPES
      'CaseTitle',
      'ManagementOffice',             // string, optional
      'DlpStartDate',                  // ISO date
      'OriginalSubmissionDate',         // ISO date
      'OriginalSubmissionSource',        // string
      'OriginalDefectCount',              // number, static snapshot — NOT count(DefectItem)
      'Status',                            // enum, PROPERTY_CONFIG.PROPERTY_CASE_STATUSES
      'CreatedAt',
      'UpdatedAt'
    ]),
    dateColumns: Object.freeze(
      ['DlpStartDate', 'OriginalSubmissionDate', 'CreatedAt', 'UpdatedAt']
    )
  }),

  // Internal Entity of PropertyCase — created only via the Case's own
  // Commands (addDefectItem etc.), never standalone. Mirrors how
  // ObligationOccurrence relates to ObligationRule. DeveloperStatus and
  // OwnerVerificationStatus are INDEPENDENT — no Command may write both
  // (Phase0 Audit §4.2, CC Review Approval).
  DefectItem: Object.freeze({
    sheetName: PROPERTY_CONFIG.SHEET_NAMES.DEFECT_ITEMS,
    columns: Object.freeze([
      'DefectID',                        // string PK, reuses ID_PREFIXES.DEFECT
      'CaseID',                           // string FK -> PropertyCase
      'OriginalReference',                 // string, e.g. "88"
      'Category',                           // enum, PROPERTY_CONFIG.DEFECT_CATEGORIES
      'Location',                            // string
      'Description',                          // string
      'Priority',                              // enum, PROPERTY_CONFIG.DEFECT_PRIORITIES
      'Status',                                 // enum, PROPERTY_CONFIG.DEFECT_ITEM_STATUSES
      'DeveloperStatus',                         // enum, PROPERTY_CONFIG.DEVELOPER_STATUSES
      'OwnerVerificationStatus',                  // enum, PROPERTY_CONFIG.OWNER_VERIFICATION_STATUSES
      'SubmittedAt',                                // ISO date
      'RectificationStartDate',                      // ISO date, optional
      'DeveloperClaimedCompletedDate',                // ISO date, optional
      'OwnerVerifiedDate',                              // ISO date, optional
      'ClosedDate',                                      // ISO date, optional
      'CreatedAt',
      'UpdatedAt',
      // ── Pre-Import Gate additions (Phase 11 Real Data Onboarding, CC
      // decision 2026-08-24, Option B: migrate schema now rather than
      // wait for the real Defect Report) — MUST stay appended here,
      // never inserted earlier in this list. ensureSheetSchema_ does a
      // positional match against the real sheet's existing header
      // (same reasoning as Property/ADR-P17 above); inserting mid-list
      // would misalign every column after it. Not yet logged as a
      // formal ADR — flagged in the migration report for CC to decide
      // whether this warrants one (would be ADR-P18).
      'ItemID',        // string, optional. The item number as shown in
                        // the Developer App (the developer's own
                        // defect-tracking portal/system) — CC reads it
                        // off that app and keys it in manually; no
                        // automated extraction exists or is implied.
                        // AS DISTINCT FROM OriginalReference (also
                        // described as a "source item number" by its
                        // own comment above) — the two are
                        // deliberately NOT reconciled by this
                        // migration. ItemID does NOT replace
                        // OriginalReference, does NOT change the
                        // Importer's dedup key (still OriginalReference),
                        // and no backfill/merge is performed. See
                        // migration report.
      'SubCategory',   // string, optional, free text. No enum — unlike
                        // Category, not validated against a fixed list
                        // (avoid Speculative Design; not requested).
      'Remark'         // string, optional, free text.
    ]),
    dateColumns: Object.freeze([
      'SubmittedAt', 'RectificationStartDate', 'DeveloperClaimedCompletedDate',
      'OwnerVerifiedDate', 'ClosedDate', 'CreatedAt', 'UpdatedAt'
    ])
  }),

  DailyProgressCheck: Object.freeze({
    sheetName: PROPERTY_CONFIG.SHEET_NAMES.DAILY_PROGRESS_CHECKS,
    columns: Object.freeze([
      'CheckID',                          // string PK, CHECK-...
      'CaseID',                            // string FK -> PropertyCase
      'DateTime',                           // ISO datetime
      'CheckedBy',                           // string
      'AccessObserved',                       // boolean
      'ContractorObserved',                    // boolean
      'DeveloperRepresentativeObserved',        // boolean
      'WorkObserved',                            // string, optional, free text
      'GeneralStatus',                            // string, optional
      'Notes',                                     // string, optional
      'CreatedAt'
    ]),
    dateColumns: Object.freeze(['DateTime', 'CreatedAt'])
  }),

  Correspondence: Object.freeze({
    sheetName: PROPERTY_CONFIG.SHEET_NAMES.CORRESPONDENCES,
    columns: Object.freeze([
      'CorrespondenceID',        // string PK, CORR-...
      'CaseID',                   // string FK -> PropertyCase
      'Date',                      // ISO date
      'Direction',                  // enum, PROPERTY_CONFIG.CORRESPONDENCE_DIRECTIONS
      'Sender',                      // string
      'Recipient',                    // string
      'Subject',                       // string
      'ResponseStatus',                 // enum, PROPERTY_CONFIG.CORRESPONDENCE_RESPONSE_STATUSES
      'ResponseRequestedDate',           // ISO date, optional
      'ResponseDueDate',                  // ISO date, optional — see addWorkingDays_ (Phase 6)
      'ResponseReceivedDate',              // ISO date, optional
      'CreatedAt',
      'UpdatedAt'
    ]),
    dateColumns: Object.freeze([
      'Date', 'ResponseRequestedDate', 'ResponseDueDate', 'ResponseReceivedDate',
      'CreatedAt', 'UpdatedAt'
    ])
  }),

  // Append-only (Phase0 Audit §4.5, CC Review Approval 2026-08-15) — a
  // row is never updated after creation; each milestone is a new row,
  // distinguished by EventType. PropertyCaseTimeline below is a
  // separate, case-wide summary index that points back here — not a
  // duplicate; see the reconciliation note in the Phase0 Audit doc.
  RectificationEvent: Object.freeze({
    sheetName: PROPERTY_CONFIG.SHEET_NAMES.RECTIFICATION_EVENTS,
    columns: Object.freeze([
      'RectificationEventID',   // string PK, RECT-...
      'CaseID',                  // string FK -> PropertyCase
      'DefectID',                 // string FK, optional (null = case-level)
      'EventType',                 // enum, PROPERTY_CONFIG.RECTIFICATION_EVENT_TYPES
      'EventDate',                  // ISO date
      'EntryTime',                   // string, optional (HH:mm), mainly Access-type
      'ExitTime',                     // string, optional (HH:mm)
      'ContractorCompany',             // string, optional
      'ContractorPersonnel',            // string, optional
      'Notes',                           // string, optional
      'Source',                           // enum, PROPERTY_CONFIG.RECTIFICATION_SOURCES
      'CreatedAt'
    ]),
    dateColumns: Object.freeze(['EventDate', 'CreatedAt'])
  }),

  SecondaryDamage: Object.freeze({
    sheetName: PROPERTY_CONFIG.SHEET_NAMES.SECONDARY_DAMAGES,
    columns: Object.freeze([
      'DamageID',                          // string PK, DMG-...
      'CaseID',                             // string FK -> PropertyCase
      'ParentDefectID',                      // string FK, optional
      'RectificationEventID',                 // string FK, optional
      'DamageType',                            // enum, PROPERTY_CONFIG.SECONDARY_DAMAGE_TYPES
      'Description',                            // string
      'ObservedDate',                            // ISO date
      'ObservedBy',                                // string
      'ResponsibleParty',                           // string, optional — neutral record
                                                      // only, never a legal determination
      'Status',                                       // enum, PROPERTY_CONFIG.SECONDARY_DAMAGE_STATUSES
      'Resolution',                                     // string, optional
      'AdministrativeSubmissionRequired',                // boolean
      'SeparateSubmissionID',                              // string, optional
      'DlpPrejudiceStatus',                                  // string, optional — neutral tag only
      'ContractualBasis',                                      // string, optional — reference text only
      'CreatedAt',
      'UpdatedAt'
    ]),
    dateColumns: Object.freeze(['ObservedDate', 'CreatedAt', 'UpdatedAt'])
  }),

  // Append-only Case-wide summary index (Phase0 Audit §4.8) — the
  // durable substitute for "replaying the EventBus", since
  // publishPropertyEvent_ is a Logger-only placeholder today
  // (ADR-P07/P12) and cannot itself serve this purpose. Every Command
  // that writes to one of the tables above also appends exactly one
  // summary row here, in the same try block (mirrors 912's
  // appendObligationHistory_ pattern, generalized across entity types).
  PropertyCaseTimeline: Object.freeze({
    sheetName: PROPERTY_CONFIG.SHEET_NAMES.PROPERTY_CASE_TIMELINE,
    columns: Object.freeze([
      'TimelineEntryID',      // string PK, TLE-...
      'CaseID',                // string FK -> PropertyCase
      'EntryType',               // string, mirrors a PROPERTY_EVENTS type
      'OccurredAt',                // ISO datetime
      'Summary',                     // string, human-readable one-liner for UI
      'RelatedDefectID',               // string, optional
      'RelatedEntityType',               // string, optional
      'RelatedEntityID',                   // string, optional
      'TriggeredBy',                         // string — which Command produced this row
      'CreatedAt'
    ]),
    dateColumns: Object.freeze(['OccurredAt', 'CreatedAt'])
  })

});


/**
 * Ensures a sheet exists with the correct header row. Idempotent — safe
 * to call on every cold start. Never touches existing data rows, and
 * deliberately refuses to "fix" a mismatched header automatically: a
 * silent rewrite could desync existing row data from a changed column
 * order. A real mismatch must be resolved via Migration Strategy
 * (ObligationEngine_VerticalSlice.md §12), not auto-corrected.
 *
 * On first creation, columns listed in dateColumns are forced to plain
 * text format ('@'). Without this, Sheets can silently reinterpret an
 * ISO date string like "2026-07-19" as a Date serial value on write,
 * which would break string-equality idempotency checks such as
 * (ObligationID, EffectiveDue) in findOccurrenceByRuleAndDue_.
 *
 * Every call also freezes row 1 (header), whether the sheet is new or
 * already existed — cheap and idempotent, so existing sheets pick this
 * up automatically the next time anything calls this function.
 *
 * @param {string} sheetName
 * @param {string[]} columns
 * @param {string[]} [dateColumns] column names to force to plain text
 * @return {GoogleAppsScript.Spreadsheet.Sheet}
 */

// Per-execution cache: once a sheet's header has been verified and its
// rows frozen THIS execution, every later call in the same execution
// returns the cached reference instead of repeating those real Sheets
// API round-trips. GAS re-evaluates top-level `var` on every fresh
// execution (same reasoning as 991's TEST_ID_PATTERN_-style constants),
// so this correctly starts empty each run — it never masks a genuine
// schema drift that happens between separate executions, only skips
// re-checking the same, unchanged sheet repeatedly within one.
//
// Added 2026-07-29 after a real execution timeout: every Command in
// 910/912 touches a sheet via this function, and with ~140 tests each
// doing several Sheets operations, the getRange/getValues header check
// + unconditional setFrozenRows was happening hundreds of times when a
// handful (one per sheet) would do — see 00_Project_State.js changelog
// for the full diagnosis, and MANUAL_VERIFICATION_CHECKLIST.md's
// Runtime limits section, which had flagged the 6-minute ceiling as
// untested until this run hit it for real.
var SHEET_SCHEMA_CACHE_ = {};

function ensureSheetSchema_(sheetName, columns, dateColumns) {
  if (SHEET_SCHEMA_CACHE_[sheetName]) {
    return SHEET_SCHEMA_CACHE_[sheetName];
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  var isNewSheet = !sheet;

  if (isNewSheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(columns);
  } else {
    var existingHeader = sheet.getRange(1, 1, 1, columns.length).getValues()[0];
    var headerMatches = columns.every(function (col, i) {
      return existingHeader[i] === col;
    });
    if (!headerMatches) {
      throw new Error(
        'Schema drift detected on sheet "' + sheetName + '". Expected ' +
        'header: [' + columns.join(', ') + ']. Got: [' + existingHeader.join(', ') +
        ']. Resolve via Migration Strategy — do not auto-correct.'
      );
    }
  }

  if (isNewSheet && dateColumns && dateColumns.length > 0) {
    dateColumns.forEach(function (colName) {
      var colIndex = columns.indexOf(colName) + 1;
      if (colIndex > 0) {
        // Format header row + 1000 data rows as plain text. 1000 is a
        // generous ceiling for a personal system; revisit only if a
        // single Obligation table genuinely needs more rows than that.
        sheet.getRange(1, colIndex, 1000, 1).setNumberFormat('@');
      }
    });
  }

  // Every Property OS sheet keeps its header row visible while
  // scrolling. Runs at most once per sheet per execution now (the cache
  // above), but still unconditional-per-execution (not gated on
  // isNewSheet) so it also retroactively fixes any sheet that was
  // created before this existed — including the three Obligation sheets
  // already created via a live initObligationSchema_() run before this
  // fix landed. They pick it up automatically the next execution, no
  // manual step needed beyond that.
  sheet.setFrozenRows(1);

  SHEET_SCHEMA_CACHE_[sheetName] = sheet;
  return sheet;
}

/**
 * Initializes all Obligation-related sheets. Call once at project setup,
 * and defensively at the start of any 912/913 entry point so a fresh
 * spreadsheet self-heals its structure without a separate manual step.
 */
function initObligationSchema_() {
  ensureSheetSchema_(
    PROPERTY_SCHEMA.ObligationRule.sheetName,
    PROPERTY_SCHEMA.ObligationRule.columns,
    PROPERTY_SCHEMA.ObligationRule.dateColumns
  );
  ensureSheetSchema_(
    PROPERTY_SCHEMA.ObligationOccurrence.sheetName,
    PROPERTY_SCHEMA.ObligationOccurrence.columns,
    PROPERTY_SCHEMA.ObligationOccurrence.dateColumns
  );
  ensureSheetSchema_(
    PROPERTY_SCHEMA.ObligationHistory.sheetName,
    PROPERTY_SCHEMA.ObligationHistory.columns,
    PROPERTY_SCHEMA.ObligationHistory.dateColumns
  );
}

/**
 * Initializes the Properties sheet. Call once at project setup, and
 * defensively at the start of any 910 entry point — same self-healing
 * pattern as initObligationSchema_().
 *
 * ⚠ MIGRATION NOTE (ADR-P17, Phase 1, 2026-08-16) — read before deploying:
 * ensureSheetSchema_ does an exact positional match between this file's
 * `columns` array and the REAL sheet's row 1. It deliberately does NOT
 * auto-patch a header that's short columns (see that function's own
 * docstring: "refuses to fix a mismatched header automatically... must
 * be resolved via Migration Strategy, not auto-corrected"). Property.columns
 * now has two more entries (DevelopmentName, UnitLabel) than the real,
 * already-deployed Properties sheet's header row does. Concretely: your
 * real sheet's header row currently ends at column 29 (AC = UpdatedAt).
 * Before running this updated code against your real spreadsheet, add
 * two header cells by hand:
 *   AD1 = DevelopmentName
 *   AE1 = UnitLabel
 * Do this once, directly in Sheets — no formula, no data-row changes.
 * Skipping this step means the next call to any 910 function throws
 * "Schema drift detected on sheet Properties" (by design — see above).
 */
function initPropertySchema_() {
  ensureSheetSchema_(
    PROPERTY_SCHEMA.Property.sheetName,
    PROPERTY_SCHEMA.Property.columns,
    PROPERTY_SCHEMA.Property.dateColumns
  );
}

/**
 * Initializes the Evidence sheet (911_DocumentEngine). Brand-new sheet —
 * no existing header to migrate, ensureSheetSchema_ creates it fresh.
 */
function initDocumentEngineSchema_() {
  ensureSheetSchema_(
    PROPERTY_SCHEMA.Evidence.sheetName,
    PROPERTY_SCHEMA.Evidence.columns,
    PROPERTY_SCHEMA.Evidence.dateColumns
  );
}

/**
 * Initializes all seven 918_DefectEngine sheets. Six of the seven are
 * unchanged from their original creation — ensureSheetSchema_
 * creates/confirms each fresh, exactly as before.
 *
 * ⚠ MIGRATION NOTE (Phase 11 Pre-Import Gate, 2026-08-24) — read before
 * deploying this against the REAL spreadsheet:
 * ensureSheetSchema_ does an exact positional match between this
 * file's `columns` array and the REAL sheet's row 1 (see that
 * function's own docstring: "refuses to fix a mismatched header
 * automatically... must be resolved via Migration Strategy, not
 * auto-corrected"). DefectItem.columns now has three more entries
 * (ItemID, SubCategory, Remark) than the real, already-deployed
 * DefectItems sheet's header row does. Concretely, based on this
 * file's DefectItem column list BEFORE this change (17 columns,
 * ending at UpdatedAt = column Q) — confirm this still matches the
 * real sheet's current last column before proceeding, since this note
 * cannot see the real sheet directly. If it matches, add three header
 * cells by hand:
 *   R1 = ItemID
 *   S1 = SubCategory
 *   T1 = Remark
 * Do this once, directly in Sheets — no formula, no data-row changes.
 * Skipping this step means the next call to any 918 function that
 * touches DefectItems throws "Schema drift detected on sheet
 * DefectItems" (by design — see ensureSheetSchema_ above).
 */
function initDefectEngineSchema_() {
  ensureSheetSchema_(
    PROPERTY_SCHEMA.PropertyCase.sheetName,
    PROPERTY_SCHEMA.PropertyCase.columns,
    PROPERTY_SCHEMA.PropertyCase.dateColumns
  );
  ensureSheetSchema_(
    PROPERTY_SCHEMA.DefectItem.sheetName,
    PROPERTY_SCHEMA.DefectItem.columns,
    PROPERTY_SCHEMA.DefectItem.dateColumns
  );
  ensureSheetSchema_(
    PROPERTY_SCHEMA.DailyProgressCheck.sheetName,
    PROPERTY_SCHEMA.DailyProgressCheck.columns,
    PROPERTY_SCHEMA.DailyProgressCheck.dateColumns
  );
  ensureSheetSchema_(
    PROPERTY_SCHEMA.Correspondence.sheetName,
    PROPERTY_SCHEMA.Correspondence.columns,
    PROPERTY_SCHEMA.Correspondence.dateColumns
  );
  ensureSheetSchema_(
    PROPERTY_SCHEMA.RectificationEvent.sheetName,
    PROPERTY_SCHEMA.RectificationEvent.columns,
    PROPERTY_SCHEMA.RectificationEvent.dateColumns
  );
  ensureSheetSchema_(
    PROPERTY_SCHEMA.SecondaryDamage.sheetName,
    PROPERTY_SCHEMA.SecondaryDamage.columns,
    PROPERTY_SCHEMA.SecondaryDamage.dateColumns
  );
  ensureSheetSchema_(
    PROPERTY_SCHEMA.PropertyCaseTimeline.sheetName,
    PROPERTY_SCHEMA.PropertyCaseTimeline.columns,
    PROPERTY_SCHEMA.PropertyCaseTimeline.dateColumns
  );
}


/**
 * ═══════════════════════════════════════════════════════════════════════
 * Shared Truth Layer access utilities
 * ═══════════════════════════════════════════════════════════════════════
 * Generic row I/O and date handling used by every Engine that reads or
 * writes a Property OS sheet. Kept here (Foundation/Schema) rather than
 * duplicated per-Engine, since they're about how ANY Engine talks to its
 * Sheet-backed Truth Layer, not Obligation-specific business logic.
 */

/**
 * Constructs a coded error. Every Command across Property OS should
 * throw via this (not a bare `new Error(...)`) so callers (Telegram
 * handler, future UI, tests) can branch on `.code` instead of parsing
 * message strings.
 * @param {string} code
 * @param {string} [message]
 * @return {Error}
 */
function propertyError_(code, message) {
  var err = new Error(message || code);
  err.code = code;
  return err;
}

function toIsoDate_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function toIsoDateTime_(date) {
  return date.toISOString();
}

/**
 * Parses a 'yyyy-MM-dd' string as a LOCAL calendar date (midnight in the
 * script's timezone), not via `new Date(str)` — the latter parses as
 * UTC midnight, which is a well-known source of off-by-one-day bugs
 * once a timezone offset is involved. Property OS's due-date math must
 * never be off by a day.
 * @param {string} isoDateStr 'yyyy-MM-dd'
 * @return {Date}
 */
function parseIsoDate_(isoDateStr) {
  var parts = String(isoDateStr).split('-');
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

/**
 * Normalizes a value read back from a Sheet cell to a 'yyyy-MM-dd'
 * string, regardless of whether Sheets handed it back as a string (the
 * expected case, given the plain-text formatting in ensureSheetSchema_)
 * or, defensively, as a Date object (belt-and-suspenders in case that
 * formatting was ever bypassed, e.g. by a manual edit in the Sheets UI).
 * @param {*} value
 * @return {string}
 */
function coerceToIsoDateString_(value) {
  if (value instanceof Date) {
    return toIsoDate_(value);
  }
  return String(value);
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {number} rowIndex 1-indexed sheet row
 * @param {string[]} columns
 * @return {Object}
 */
function readRowAsObject_(sheet, rowIndex, columns) {
  var values = sheet.getRange(rowIndex, 1, 1, columns.length).getValues()[0];
  var obj = {};
  columns.forEach(function (col, i) {
    obj[col] = values[i];
  });
  return obj;
}

/**
 * @param {Object} obj
 * @param {string[]} columns
 * @return {Array}
 */
function objectToRowArray_(obj, columns) {
  return columns.map(function (col) {
    return (col in obj && obj[col] !== undefined && obj[col] !== null) ? obj[col] : '';
  });
}

/**
 * Linear scan for the row whose first column matches idValue. O(n) —
 * fine at personal-project scale (tens to low hundreds of rows per
 * table); revisit only if that assumption stops holding.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {string} idValue
 * @return {number} 1-indexed row number, or -1 if not found
 */
function findRowIndexByFirstColumn_(sheet, idValue) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0] === idValue) {
      return i + 2;
    }
  }
  return -1;
}

/**
 * Read-modify-write for a single row: reads the current row, overlays
 * fieldUpdates onto it, writes the merged result back in one call.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {number} rowIndex 1-indexed sheet row
 * @param {string[]} columns
 * @param {Object} fieldUpdates
 * @return {Object} the merged row object that was written
 */
function updateRowFields_(sheet, rowIndex, columns, fieldUpdates) {
  var current = readRowAsObject_(sheet, rowIndex, columns);
  Object.keys(fieldUpdates).forEach(function (key) {
    current[key] = fieldUpdates[key];
  });
  sheet.getRange(rowIndex, 1, 1, columns.length).setValues([objectToRowArray_(current, columns)]);
  return current;
}
