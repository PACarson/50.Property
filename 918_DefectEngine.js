/**
 * ═══════════════════════════════════════════════════════════════════════
 * PROPERTY OS — 918_DefectEngine.js
 * Runtime Layer — DLP Defect Case & Rectification Tracking
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Vertical Slice, Phase 2 + Phase 3 + Phase 4 (Review Approval
 * 2026-08-15/16 — see the standalone Phase0 Audit doc for the full
 * design rationale, and 00_ADR_Log.js ADR-P15 for the "single engine,
 * no separate generic Case Engine" decision this file embodies).
 *
 * This phase delivers:
 *   Phase 2 — shared infra (Lock, idempotency cache, partial-failure
 *             logger, sheet accessors, Timeline append helper). There is
 *             no separately-named "Repository" layer in Property OS
 *             (see 901_PropertySchema.js's shared row I/O utilities) —
 *             this section IS the Repository/Service layer for 918,
 *             exactly as 910/912 are for their own domains.
 *   Phase 3 — PropertyCase + DefectItem lifecycle Commands.
 *   Phase 4 — DailyProgressCheck (logDailyProgressCheck). Deployed and
 *             smoke-tested for real 2026-08-16 (141/141 regression-free,
 *             DeveloperStatus/OwnerVerificationStatus independence
 *             confirmed against real GAS — see MANUAL_VERIFICATION_
 *             CHECKLIST.md) before this phase started, per CC's explicit
 *             Deployment Verification gate.
 *   Phase 6 — Correspondence + addWorkingDays_ (Response Deadline).
 *             911_DocumentEngine.js (Phase 5, Evidence) deployed and
 *             smoke-tested for real against real Drive 2026-08-17
 *             before this phase started, same gate.
 *   Phase 7 — RectificationEvent (append-only, EventType-driven per CC
 *             Review Approval 2026-08-15) + SecondaryDamage. Phase 6
 *             confirmed 141/141 + smoke test before this phase started.
 *
 * NOT in this phase (later phases, per the agreed Implementation Order):
 *   Phase 8  Dashboard/Projection additions to 922_DashboardAdapter.js
 *
 * Two independent status dimensions on DefectItem (Phase0 Audit §4.2):
 *   DeveloperStatus            — set ONLY by recordDeveloperStatus
 *   OwnerVerificationStatus    — set ONLY by recordOwnerVerification
 * Neither Command may ever write the other's fields. This is what lets
 * "Developer: ClaimedCompleted" and "Owner: FailedVerification" be true
 * at the same time without either being silently overwritten — see the
 * inline comments on both Commands below, and 997_Tests_DefectEngine.js
 * scenario 9.
 *
 * DefectItem.Status (the third, overall roll-up field) is mostly
 * DERIVED (deriveDefectItemStatus_, Lazy Computation — same principle
 * as 913's isOccurrenceOverdue_) from the two fields above, EXCEPT the
 * Closed boundary, which only closeDefectItem / reopenDefectItem may
 * cross — mirrors 910's markPropertySold / reversePropertySale being
 * the only entry/exit points for Property's Sold state.
 *
 * PropertyCaseTimeline is a durable, append-only, case-wide summary
 * index (Phase0 Audit §4.8) — NOT "replaying the EventBus". Today
 * publishPropertyEvent_ (903) is a Logger-only placeholder (ADR-P07/
 * P12) and cannot serve as a queryable history, so every Command below
 * also calls appendCaseTimelineEntry_ in the same try block that calls
 * publishPropertyEvent_ — mirrors 912's appendObligationHistory_
 * pattern, generalized across several entity types into one shared
 * per-Case ledger.
 *
 * Depends on: 900_PropertyConfig.js, 901_PropertySchema.js,
 * 902_PropertyIdentity.js, 903_PropertyEventDefinitions.js,
 * 910_PropertyAssetEngine.js (getProperty, propertyExists_ — read-only,
 * Runtime→Runtime, same pattern 912 already uses).
 * ═══════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────
// Phase 2 — Shared infra (Lock / idempotency / partial-failure / sheets)
// ─────────────────────────────────────────────────────────────────────

/**
 * Single top-level script lock for every 918 Command. Never call this
 * from within another withXLock_ call — Constitution §5 forbids nested
 * lock acquisition.
 */
function withDefectEngineLock_(fn) {
  var lock = LockService.getScriptLock();
  var acquired = lock.tryLock(30000);
  if (!acquired) {
    throw propertyError_(
      'DEFECT_ENGINE_LOCK_TIMEOUT',
      'Could not acquire the script lock within 30s. Another Property OS ' +
      'operation is in progress — please try again shortly.'
    );
  }
  try {
    return fn();
  } finally {
    SpreadsheetApp.flush();
    lock.releaseLock();
  }
}

/**
 * Loud, structured log for the "Truth write succeeded, but the
 * Timeline/Event publish step after it failed" case. The Command
 * rethrows after calling this — we never silently swallow a partial
 * failure (Constitution §5 Coding Standards).
 */
function logDefectEnginePartialFailure_(commandName, truthDescription, originalError) {
  Logger.log(
    '[PropertyOS PARTIAL FAILURE] ' + commandName + ': ' + truthDescription +
    ' Original error: ' + (originalError && originalError.message ? originalError.message : originalError)
  );
}

function getCachedDefectEngineCommandResult_(clientRequestId) {
  var cached = CacheService.getScriptCache().get('propertyos_idem_defect_' + clientRequestId);
  return cached ? JSON.parse(cached) : null;
}

function cacheDefectEngineCommandResult_(clientRequestId, result) {
  CacheService.getScriptCache().put(
    'propertyos_idem_defect_' + clientRequestId,
    JSON.stringify(result),
    3600
  );
}

function propertyCaseSheet_() {
  ensureSheetSchema_(
    PROPERTY_SCHEMA.PropertyCase.sheetName,
    PROPERTY_SCHEMA.PropertyCase.columns,
    PROPERTY_SCHEMA.PropertyCase.dateColumns
  );
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PROPERTY_SCHEMA.PropertyCase.sheetName);
}

function defectItemSheet_() {
  ensureSheetSchema_(
    PROPERTY_SCHEMA.DefectItem.sheetName,
    PROPERTY_SCHEMA.DefectItem.columns,
    PROPERTY_SCHEMA.DefectItem.dateColumns
  );
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PROPERTY_SCHEMA.DefectItem.sheetName);
}

function propertyCaseTimelineSheet_() {
  ensureSheetSchema_(
    PROPERTY_SCHEMA.PropertyCaseTimeline.sheetName,
    PROPERTY_SCHEMA.PropertyCaseTimeline.columns,
    PROPERTY_SCHEMA.PropertyCaseTimeline.dateColumns
  );
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PROPERTY_SCHEMA.PropertyCaseTimeline.sheetName);
}

// Phase 4 (2026-08-16).
function dailyProgressCheckSheet_() {
  ensureSheetSchema_(
    PROPERTY_SCHEMA.DailyProgressCheck.sheetName,
    PROPERTY_SCHEMA.DailyProgressCheck.columns,
    PROPERTY_SCHEMA.DailyProgressCheck.dateColumns
  );
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PROPERTY_SCHEMA.DailyProgressCheck.sheetName);
}

// Phase 6 (2026-08-17).
function correspondenceSheet_() {
  ensureSheetSchema_(
    PROPERTY_SCHEMA.Correspondence.sheetName,
    PROPERTY_SCHEMA.Correspondence.columns,
    PROPERTY_SCHEMA.Correspondence.dateColumns
  );
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PROPERTY_SCHEMA.Correspondence.sheetName);
}

// Phase 7 (2026-08-17).
function rectificationEventSheet_() {
  ensureSheetSchema_(
    PROPERTY_SCHEMA.RectificationEvent.sheetName,
    PROPERTY_SCHEMA.RectificationEvent.columns,
    PROPERTY_SCHEMA.RectificationEvent.dateColumns
  );
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PROPERTY_SCHEMA.RectificationEvent.sheetName);
}

function secondaryDamageSheet_() {
  ensureSheetSchema_(
    PROPERTY_SCHEMA.SecondaryDamage.sheetName,
    PROPERTY_SCHEMA.SecondaryDamage.columns,
    PROPERTY_SCHEMA.SecondaryDamage.dateColumns
  );
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PROPERTY_SCHEMA.SecondaryDamage.sheetName);
}

/**
 * Appends exactly one row to PropertyCaseTimeline. Called by every
 * Command below, in the same try block as publishPropertyEvent_.
 *
 * @param {string} caseId
 * @param {string} entryType human-readable tag, mirrors a PROPERTY_EVENTS
 *   name but is NOT validated against it — this is a display log, not a
 *   second event registry.
 * @param {string} summary one-liner for the Timeline UI
 * @param {Object} [options] {relatedDefectId, relatedEntityType, relatedEntityId, triggeredBy}
 * @return {Object} the row written
 */
function appendCaseTimelineEntry_(caseId, entryType, summary, options) {
  options = options || {};
  var now = new Date().toISOString();
  var entry = {
    TimelineEntryID: generateTimelineEntryId_(),
    CaseID: caseId,
    EntryType: entryType,
    OccurredAt: now,
    Summary: summary,
    RelatedDefectID: options.relatedDefectId || '',
    RelatedEntityType: options.relatedEntityType || '',
    RelatedEntityID: options.relatedEntityId || '',
    TriggeredBy: options.triggeredBy || '',
    CreatedAt: now
  };
  propertyCaseTimelineSheet_().appendRow(
    objectToRowArray_(entry, PROPERTY_SCHEMA.PropertyCaseTimeline.columns)
  );
  return entry;
}

/**
 * Derives DefectItem.Status from its two independent sub-statuses.
 * Pure function, no Sheet access. Never returns 'Closed' — that
 * boundary is crossed only by closeDefectItem / reopenDefectItem.
 * Lazy Computation, same principle as 913's isOccurrenceOverdue_.
 *
 * Precedence matters here and was wrong in an earlier draft (caught by
 * 997_Tests_DefectEngine.js / the local pre-check test, not by
 * inspection): OwnerVerificationStatus's DEFINITE outcomes (Verified,
 * FailedVerification, PartiallyVerified) must be checked BEFORE
 * DeveloperStatus === 'ClaimedCompleted', or a real Owner failure gets
 * silently masked back to "PendingVerification" whenever DeveloperStatus
 * happens to also say ClaimedCompleted — which defeats the entire point
 * of keeping the two fields independent. Only when OwnerVerificationStatus
 * is still 'NotChecked' does DeveloperStatus drive the result.
 *
 * Known Domain Model limitation, decided and recorded — NOT an open
 * question anymore (ADR-P15, CC Review Approval 2026-08-16): after a
 * FailedVerification, if the Developer submits a FRESH 'ClaimedCompleted'
 * claim, this still returns 'InProgress' rather than 'PendingVerification'
 * — because recordDeveloperStatus deliberately never writes
 * OwnerVerificationStatus, and CC explicitly decided NOT to loosen that
 * independence for this case, even though it's well-motivated. The
 * correctly-scoped fix is a future Repair Cycle / Verification Cycle
 * concept (OwnerVerificationStatus scoped to a specific repair attempt,
 * not a permanent DefectItem field) — a genuine Domain Model change,
 * deferred, tracked in ADR-P15. Do not "fix" this by having
 * recordDeveloperStatus touch OwnerVerificationStatus, even to reset it
 * to a neutral value — that reopens exactly the boundary this ADR
 * confirms should stay closed.
 */
function deriveDefectItemStatus_(developerStatus, ownerVerificationStatus) {
  if (ownerVerificationStatus === 'Verified') return 'Verified';
  if (ownerVerificationStatus === 'FailedVerification' || ownerVerificationStatus === 'PartiallyVerified') {
    return 'InProgress';
  }
  // ownerVerificationStatus === 'NotChecked' from here on.
  if (developerStatus === 'ClaimedCompleted') return 'PendingVerification';
  if (developerStatus === 'Scheduled' || developerStatus === 'InProgress') return 'InProgress';
  return 'Open';
}

/**
 * Adds N working days (Mon-Fri, weekends skipped) to a date. Public
 * holidays are NOT accounted for — task's literal ask was "working
 * day", not "business day incl. holiday calendar"; adding holiday
 * awareness later is Additive, not a redesign, if it's ever needed.
 *
 * Only consumer today is logCorrespondence below — kept here rather
 * than promoted to 901's shared date utilities, per the project's own
 * two-independent-consumers bar before generalizing (Phase0 Audit §4.4).
 *
 * Uses parseIsoDate_/toIsoDate_ (901), the same local-midnight-safe
 * utilities every other date calc in this project uses — never
 * `new Date(isoString)` directly, which parses as UTC and is the
 * project's own documented off-by-one-day hazard.
 *
 * @param {string|Date} isoDateOrDate start date, 'yyyy-MM-dd' or Date
 * @param {number} numWorkingDays
 * @return {string} 'yyyy-MM-dd'
 */
function addWorkingDays_(isoDateOrDate, numWorkingDays) {
  var date = parseIsoDate_(coerceToIsoDateString_(isoDateOrDate));
  var added = 0;
  while (added < numWorkingDays) {
    date.setDate(date.getDate() + 1);
    var dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      added++;
    }
  }
  return toIsoDate_(date);
}

/**
 * Lazy Computation (never stored) — same principle as
 * deriveDefectItemStatus_ and 913's isOccurrenceOverdue_. 'NotedOnly'
 * is deliberately NOT treated as resolved — a "noted with thanks" reply
 * still leaves the real response outstanding (task's explicit ask,
 * Test Plan scenario 13).
 */
function isCorrespondenceOverdue_(correspondence) {
  if (!correspondence.ResponseDueDate) return false;
  var resolvedStatuses = ['Answered', 'Rejected'];
  if (resolvedStatuses.indexOf(correspondence.ResponseStatus) !== -1) return false;
  var due = parseIsoDate_(correspondence.ResponseDueDate);
  var today = parseIsoDate_(toIsoDate_(new Date()));
  return today > due;
}

/**
 * 'AccessGranted' -> 'Access Granted', 'DeveloperClaimedCompleted' ->
 * 'Developer Claimed Completed'. General PascalCase-to-spaced-words
 * transform so new RECTIFICATION_EVENT_TYPES values read naturally in
 * the Timeline without a manual lookup table needing upkeep.
 */
function humanizeEventType_(eventType) {
  return String(eventType).replace(/([A-Z])/g, ' $1').trim();
}

/**
 * Builds the human-readable Timeline one-liner for a RectificationEvent.
 * Pure function — no Sheet access.
 */
function buildRectificationEventSummary_(rectificationEvent) {
  var summary = humanizeEventType_(rectificationEvent.EventType);
  if (rectificationEvent.ContractorCompany) summary += ' — ' + rectificationEvent.ContractorCompany;
  if (rectificationEvent.Notes) summary += ': ' + rectificationEvent.Notes;
  return summary;
}

var PROPERTY_CASE_TRANSITIONS_ = Object.freeze({
  Open: ['InProgress', 'Closed'],
  InProgress: ['Closed'],
  Closed: []
});

function assertPropertyCaseTransition_(fromStatus, toStatus) {
  var allowed = PROPERTY_CASE_TRANSITIONS_[fromStatus] || [];
  if (allowed.indexOf(toStatus) === -1) {
    throw propertyError_(
      'DLP_CASE_INVALID_TRANSITION',
      'Cannot transition PropertyCase from "' + fromStatus + '" to "' + toStatus + '".'
    );
  }
}

function assertDefectItemNotClosed_(defectItem, commandName) {
  if (defectItem.Status === 'Closed') {
    throw propertyError_(
      'DEFECT_ITEM_CLOSED',
      commandName + ': DefectItem ' + defectItem.DefectID + ' is Closed. ' +
      'Call reopenDefectItem first if this needs further changes.'
    );
  }
}

// ─────────────────────────────────────────────────────────────────────
// Existence checks + reads
// ─────────────────────────────────────────────────────────────────────

function caseExists_(caseId) {
  return findRowIndexByFirstColumn_(propertyCaseSheet_(), caseId) !== -1;
}

function defectItemExists_(defectId) {
  return findRowIndexByFirstColumn_(defectItemSheet_(), defectId) !== -1;
}

function getPropertyCase(caseId) {
  var sheet = propertyCaseSheet_();
  var rowIndex = findRowIndexByFirstColumn_(sheet, caseId);
  if (rowIndex === -1) return null;
  return readRowAsObject_(sheet, rowIndex, PROPERTY_SCHEMA.PropertyCase.columns);
}

function getDefectItem(defectId) {
  var sheet = defectItemSheet_();
  var rowIndex = findRowIndexByFirstColumn_(sheet, defectId);
  if (rowIndex === -1) return null;
  return readRowAsObject_(sheet, rowIndex, PROPERTY_SCHEMA.DefectItem.columns);
}

function listDefectItemsForCase(caseId) {
  var sheet = defectItemSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var columns = PROPERTY_SCHEMA.DefectItem.columns;
  var values = sheet.getRange(2, 1, lastRow - 1, columns.length).getValues();
  var caseIdIndex = columns.indexOf('CaseID');
  return values
    .filter(function (row) { return row[caseIdIndex] === caseId; })
    .map(function (row) {
      var obj = {};
      columns.forEach(function (col, i) { obj[col] = row[i]; });
      return obj;
    });
}

// Phase 4 (2026-08-16).
function getDailyProgressCheck(checkId) {
  var sheet = dailyProgressCheckSheet_();
  var rowIndex = findRowIndexByFirstColumn_(sheet, checkId);
  if (rowIndex === -1) return null;
  return readRowAsObject_(sheet, rowIndex, PROPERTY_SCHEMA.DailyProgressCheck.columns);
}

function listDailyChecksForCase(caseId) {
  var sheet = dailyProgressCheckSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var columns = PROPERTY_SCHEMA.DailyProgressCheck.columns;
  var values = sheet.getRange(2, 1, lastRow - 1, columns.length).getValues();
  var caseIdIndex = columns.indexOf('CaseID');
  return values
    .filter(function (row) { return row[caseIdIndex] === caseId; })
    .map(function (row) {
      var obj = {};
      columns.forEach(function (col, i) { obj[col] = row[i]; });
      return obj;
    });
}

/**
 * Builds the human-readable Timeline one-liner for a Daily Progress
 * Check. Pure function — no Sheet access.
 */
function buildDailyCheckSummary_(dailyCheck) {
  if (!dailyCheck.AccessObserved) {
    return 'Daily check — no access observed' + (dailyCheck.Notes ? ('. ' + dailyCheck.Notes) : '.');
  }
  var parts = [];
  if (dailyCheck.ContractorObserved) parts.push('contractor on site');
  if (dailyCheck.DeveloperRepresentativeObserved) parts.push('developer rep present');
  if (dailyCheck.WorkObserved) parts.push(dailyCheck.WorkObserved);
  return 'Daily check — access granted' + (parts.length ? ('; ' + parts.join(', ')) : '') +
    (dailyCheck.Notes ? ('. ' + dailyCheck.Notes) : '.');
}

// Phase 6 (2026-08-17).
function getCorrespondence(correspondenceId) {
  var sheet = correspondenceSheet_();
  var rowIndex = findRowIndexByFirstColumn_(sheet, correspondenceId);
  if (rowIndex === -1) return null;
  return readRowAsObject_(sheet, rowIndex, PROPERTY_SCHEMA.Correspondence.columns);
}

function listCorrespondenceForCase(caseId) {
  var sheet = correspondenceSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var columns = PROPERTY_SCHEMA.Correspondence.columns;
  var values = sheet.getRange(2, 1, lastRow - 1, columns.length).getValues();
  var caseIdIndex = columns.indexOf('CaseID');
  return values
    .filter(function (row) { return row[caseIdIndex] === caseId; })
    .map(function (row) {
      var obj = {};
      columns.forEach(function (col, i) { obj[col] = row[i]; });
      return obj;
    });
}

// Phase 7 (2026-08-17).
function getRectificationEvent(rectificationEventId) {
  var sheet = rectificationEventSheet_();
  var rowIndex = findRowIndexByFirstColumn_(sheet, rectificationEventId);
  if (rowIndex === -1) return null;
  return readRowAsObject_(sheet, rowIndex, PROPERTY_SCHEMA.RectificationEvent.columns);
}

function listRectificationEventsForCase(caseId) {
  var sheet = rectificationEventSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var columns = PROPERTY_SCHEMA.RectificationEvent.columns;
  var values = sheet.getRange(2, 1, lastRow - 1, columns.length).getValues();
  var caseIdIndex = columns.indexOf('CaseID');
  return values
    .filter(function (row) { return row[caseIdIndex] === caseId; })
    .map(function (row) {
      var obj = {};
      columns.forEach(function (col, i) { obj[col] = row[i]; });
      return obj;
    });
}

function listRectificationEventsForDefect(defectId) {
  var sheet = rectificationEventSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var columns = PROPERTY_SCHEMA.RectificationEvent.columns;
  var values = sheet.getRange(2, 1, lastRow - 1, columns.length).getValues();
  var defectIdIndex = columns.indexOf('DefectID');
  return values
    .filter(function (row) { return row[defectIdIndex] === defectId; })
    .map(function (row) {
      var obj = {};
      columns.forEach(function (col, i) { obj[col] = row[i]; });
      return obj;
    });
}

function getSecondaryDamage(damageId) {
  var sheet = secondaryDamageSheet_();
  var rowIndex = findRowIndexByFirstColumn_(sheet, damageId);
  if (rowIndex === -1) return null;
  return readRowAsObject_(sheet, rowIndex, PROPERTY_SCHEMA.SecondaryDamage.columns);
}

function listSecondaryDamageForCase(caseId) {
  var sheet = secondaryDamageSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var columns = PROPERTY_SCHEMA.SecondaryDamage.columns;
  var values = sheet.getRange(2, 1, lastRow - 1, columns.length).getValues();
  var caseIdIndex = columns.indexOf('CaseID');
  return values
    .filter(function (row) { return row[caseIdIndex] === caseId; })
    .map(function (row) {
      var obj = {};
      columns.forEach(function (col, i) { obj[col] = row[i]; });
      return obj;
    });
}

function listSecondaryDamageForDefect(defectId) {
  var sheet = secondaryDamageSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var columns = PROPERTY_SCHEMA.SecondaryDamage.columns;
  var values = sheet.getRange(2, 1, lastRow - 1, columns.length).getValues();
  var parentDefectIdIndex = columns.indexOf('ParentDefectID');
  return values
    .filter(function (row) { return row[parentDefectIdIndex] === defectId; })
    .map(function (row) {
      var obj = {};
      columns.forEach(function (col, i) { obj[col] = row[i]; });
      return obj;
    });
}

// ─────────────────────────────────────────────────────────────────────
// Phase 3 — PropertyCase + DefectItem lifecycle Commands
// ─────────────────────────────────────────────────────────────────────

/**
 * Creates a new PropertyCase. Does NOT store Developer or a DLP end
 * date — both are read from the linked Property (Developer,
 * DefectExpiry) at display time, single source of truth (Phase0 Audit
 * §4.1, CC Review Approval).
 *
 * @param {Object} input {propertyId, caseType, caseTitle, managementOffice,
 *   dlpStartDate, originalSubmissionDate, originalSubmissionSource,
 *   originalDefectCount, clientRequestId}
 */
function createPropertyCase(input) {
  return withDefectEngineLock_(function () {
    input = input || {};

    if (input.clientRequestId) {
      var cached = getCachedDefectEngineCommandResult_(input.clientRequestId);
      if (cached) return cached;
    }

    if (!input.propertyId) {
      throw propertyError_('DLP_CASE_INVALID_INPUT', 'propertyId is required.');
    }
    if (!propertyExists_(input.propertyId)) {
      throw propertyError_(
        'DLP_CASE_PROPERTY_NOT_FOUND', 'No Property found for propertyId ' + input.propertyId + '.'
      );
    }
    if (!input.originalSubmissionDate) {
      throw propertyError_('DLP_CASE_INVALID_INPUT', 'originalSubmissionDate is required.');
    }
    var caseType = input.caseType || 'DLP';
    if (PROPERTY_CONFIG.PROPERTY_CASE_TYPES.indexOf(caseType) === -1) {
      throw propertyError_('DLP_CASE_INVALID_CASE_TYPE', 'Unknown CaseType: ' + caseType + '.');
    }

    var property = getProperty(input.propertyId);
    var now = new Date().toISOString();
    var caseId = generateCaseId_();

    var propertyCase = {
      CaseID: caseId,
      PropertyID: input.propertyId,
      CaseType: caseType,
      CaseTitle: input.caseTitle || (property.PropertyName + ' — ' + caseType + ' Case'),
      ManagementOffice: input.managementOffice || '',
      DlpStartDate: coerceToIsoDateString_(input.dlpStartDate || input.originalSubmissionDate),
      OriginalSubmissionDate: coerceToIsoDateString_(input.originalSubmissionDate),
      OriginalSubmissionSource: input.originalSubmissionSource || '',
      OriginalDefectCount: input.originalDefectCount || 0,
      Status: 'Open',
      CreatedAt: now,
      UpdatedAt: now
    };

    propertyCaseSheet_().appendRow(objectToRowArray_(propertyCase, PROPERTY_SCHEMA.PropertyCase.columns));

    try {
      appendCaseTimelineEntry_(
        caseId, 'CASE_CREATED',
        'Case opened for ' + property.PropertyName + (property.UnitLabel ? (' ' + property.UnitLabel) : ''),
        { triggeredBy: 'createPropertyCase' }
      );
      publishPropertyEvent_(PROPERTY_EVENTS.CASE_CREATED, input.propertyId, null, {
        caseId: caseId, propertyId: input.propertyId, caseType: caseType, status: 'Open'
      });
    } catch (e) {
      logDefectEnginePartialFailure_(
        'createPropertyCase', 'PropertyCase ' + caseId + ' row was written; Timeline/Event publish failed.', e
      );
      throw e;
    }

    var result = { success: true, caseId: caseId, propertyCase: propertyCase };
    if (input.clientRequestId) cacheDefectEngineCommandResult_(input.clientRequestId, result);
    return result;
  });
}

/**
 * Adds a DefectItem to an existing, non-Closed PropertyCase. Only
 * caseId and description are required — everything else defaults
 * leniently, because this Case alone starts with 140+ real defects to
 * enter; friction here compounds in a way it doesn't for a Command
 * that only ever runs once (contrast with createProperty's stricter
 * validation).
 *
 * @param {Object} input {caseId, description, category, location,
 *   priority, originalReference, submittedAt, clientRequestId}
 */
function addDefectItem(input) {
  return withDefectEngineLock_(function () {
    input = input || {};

    if (input.clientRequestId) {
      var cachedResult = getCachedDefectEngineCommandResult_(input.clientRequestId);
      if (cachedResult) return cachedResult;
    }

    if (!input.caseId) {
      throw propertyError_('DEFECT_ITEM_INVALID_INPUT', 'caseId is required.');
    }
    var propertyCase = getPropertyCase(input.caseId);
    if (!propertyCase) {
      throw propertyError_('DEFECT_ITEM_CASE_NOT_FOUND', 'No PropertyCase found for caseId ' + input.caseId + '.');
    }
    if (propertyCase.Status === 'Closed') {
      throw propertyError_('DEFECT_ITEM_CASE_CLOSED', 'Cannot add a DefectItem to a Closed Case (' + input.caseId + ').');
    }
    if (!input.description) {
      throw propertyError_('DEFECT_ITEM_INVALID_INPUT', 'description is required.');
    }
    var category = input.category || 'Other';
    if (PROPERTY_CONFIG.DEFECT_CATEGORIES.indexOf(category) === -1) {
      throw propertyError_('DEFECT_ITEM_INVALID_CATEGORY', 'Unknown Category: ' + category + '.');
    }
    var priority = input.priority || 'Medium';
    if (PROPERTY_CONFIG.DEFECT_PRIORITIES.indexOf(priority) === -1) {
      throw propertyError_('DEFECT_ITEM_INVALID_PRIORITY', 'Unknown Priority: ' + priority + '.');
    }

    var now = new Date().toISOString();
    var defectId = generateDefectId_();
    var developerStatus = 'Pending';
    var ownerVerificationStatus = 'NotChecked';

    var defectItem = {
      DefectID: defectId,
      CaseID: input.caseId,
      OriginalReference: input.originalReference || '',
      Category: category,
      Location: input.location || '',
      Description: input.description,
      Priority: priority,
      Status: deriveDefectItemStatus_(developerStatus, ownerVerificationStatus),
      DeveloperStatus: developerStatus,
      OwnerVerificationStatus: ownerVerificationStatus,
      SubmittedAt: coerceToIsoDateString_(input.submittedAt || now),
      RectificationStartDate: '',
      DeveloperClaimedCompletedDate: '',
      OwnerVerifiedDate: '',
      ClosedDate: '',
      CreatedAt: now,
      UpdatedAt: now
    };

    defectItemSheet_().appendRow(objectToRowArray_(defectItem, PROPERTY_SCHEMA.DefectItem.columns));

    // Case auto-advances Open -> InProgress on its first recorded
    // DefectItem — a simple, real signal that the Case now has
    // substantive content, not just a bare creation.
    if (propertyCase.Status === 'Open') {
      assertPropertyCaseTransition_('Open', 'InProgress');
      var caseSheet = propertyCaseSheet_();
      var caseRowIndex = findRowIndexByFirstColumn_(caseSheet, input.caseId);
      updateRowFields_(caseSheet, caseRowIndex, PROPERTY_SCHEMA.PropertyCase.columns, {
        Status: 'InProgress', UpdatedAt: now
      });
    }

    try {
      appendCaseTimelineEntry_(
        input.caseId, 'DEFECT_ITEM_ADDED',
        'Defect added: ' + (input.location ? (input.location + ' — ') : '') + input.description,
        { relatedDefectId: defectId, triggeredBy: 'addDefectItem' }
      );
      publishPropertyEvent_(PROPERTY_EVENTS.DEFECT_ITEM_ADDED, propertyCase.PropertyID, null, {
        caseId: input.caseId, defectId: defectId, category: category, priority: priority,
        status: defectItem.Status
      });
    } catch (e) {
      logDefectEnginePartialFailure_(
        'addDefectItem', 'DefectItem ' + defectId + ' row was written; Timeline/Event publish failed.', e
      );
      throw e;
    }

    var result = { success: true, defectId: defectId, defectItem: defectItem };
    if (input.clientRequestId) cacheDefectEngineCommandResult_(input.clientRequestId, result);
    return result;
  });
}

/**
 * Generic field edit for a DefectItem — Category / Location /
 * Description / Priority / OriginalReference only. Status,
 * DeveloperStatus, OwnerVerificationStatus, and every timestamp field
 * have their own dedicated Commands and are denied here (denylist
 * pattern, same as 910's updateProperty).
 *
 * @param {Object} input {defectId, changedFields}
 */
function updateDefectItem(input) {
  return withDefectEngineLock_(function () {
    input = input || {};
    if (!input.defectId) {
      throw propertyError_('DEFECT_ITEM_INVALID_INPUT', 'defectId is required.');
    }

    var sheet = defectItemSheet_();
    var rowIndex = findRowIndexByFirstColumn_(sheet, input.defectId);
    if (rowIndex === -1) {
      throw propertyError_('DEFECT_ITEM_NOT_FOUND', 'No DefectItem found for defectId ' + input.defectId + '.');
    }
    var existing = readRowAsObject_(sheet, rowIndex, PROPERTY_SCHEMA.DefectItem.columns);
    assertDefectItemNotClosed_(existing, 'updateDefectItem');

    var changedFields = input.changedFields || {};
    var deniedFields = [
      'DefectID', 'CaseID', 'Status', 'DeveloperStatus', 'OwnerVerificationStatus',
      'SubmittedAt', 'DeveloperClaimedCompletedDate', 'OwnerVerifiedDate', 'ClosedDate', 'CreatedAt'
    ];
    var attemptedDenied = Object.keys(changedFields).filter(function (f) { return deniedFields.indexOf(f) !== -1; });
    if (attemptedDenied.length > 0) {
      throw propertyError_(
        'DEFECT_ITEM_FIELD_NOT_EDITABLE',
        'These fields have their own dedicated Command and cannot be set via updateDefectItem: ' +
        attemptedDenied.join(', ') + '.'
      );
    }
    if ('Category' in changedFields && PROPERTY_CONFIG.DEFECT_CATEGORIES.indexOf(changedFields.Category) === -1) {
      throw propertyError_('DEFECT_ITEM_INVALID_CATEGORY', 'Unknown Category: ' + changedFields.Category + '.');
    }
    if ('Priority' in changedFields && PROPERTY_CONFIG.DEFECT_PRIORITIES.indexOf(changedFields.Priority) === -1) {
      throw propertyError_('DEFECT_ITEM_INVALID_PRIORITY', 'Unknown Priority: ' + changedFields.Priority + '.');
    }

    var now = new Date().toISOString();
    var fieldUpdates = Object.assign({}, changedFields, { UpdatedAt: now });
    updateRowFields_(sheet, rowIndex, PROPERTY_SCHEMA.DefectItem.columns, fieldUpdates);

    try {
      appendCaseTimelineEntry_(
        existing.CaseID, 'DEFECT_ITEM_UPDATED', 'Defect updated: ' + Object.keys(changedFields).join(', '),
        { relatedDefectId: input.defectId, triggeredBy: 'updateDefectItem' }
      );
      publishPropertyEvent_(PROPERTY_EVENTS.DEFECT_ITEM_UPDATED, null, null, {
        caseId: existing.CaseID, defectId: input.defectId, changedFields: changedFields
      });
    } catch (e) {
      logDefectEnginePartialFailure_(
        'updateDefectItem', 'DefectItem ' + input.defectId + ' fields were updated; Timeline/Event publish failed.', e
      );
      throw e;
    }

    return { success: true, defectId: input.defectId };
  });
}

/**
 * Records the Developer's own claimed status. Touches ONLY
 * DeveloperStatus / DeveloperClaimedCompletedDate / Status(derived) /
 * UpdatedAt — NEVER OwnerVerificationStatus or OwnerVerifiedDate.
 *
 * @param {Object} input {defectId, developerStatus, claimedCompletedDate, note}
 */
function recordDeveloperStatus(input) {
  return withDefectEngineLock_(function () {
    input = input || {};
    if (!input.defectId) {
      throw propertyError_('DEFECT_ITEM_INVALID_INPUT', 'defectId is required.');
    }
    if (!input.developerStatus || PROPERTY_CONFIG.DEVELOPER_STATUSES.indexOf(input.developerStatus) === -1) {
      throw propertyError_(
        'DEFECT_ITEM_INVALID_DEVELOPER_STATUS', 'Unknown DeveloperStatus: ' + input.developerStatus + '.'
      );
    }

    var sheet = defectItemSheet_();
    var rowIndex = findRowIndexByFirstColumn_(sheet, input.defectId);
    if (rowIndex === -1) {
      throw propertyError_('DEFECT_ITEM_NOT_FOUND', 'No DefectItem found for defectId ' + input.defectId + '.');
    }
    var existing = readRowAsObject_(sheet, rowIndex, PROPERTY_SCHEMA.DefectItem.columns);
    assertDefectItemNotClosed_(existing, 'recordDeveloperStatus');

    var now = new Date().toISOString();
    // Independence guarantee (Phase0 Audit §4.2): this fieldUpdates
    // object must NEVER include OwnerVerificationStatus / OwnerVerifiedDate.
    var fieldUpdates = {
      DeveloperStatus: input.developerStatus,
      Status: deriveDefectItemStatus_(input.developerStatus, existing.OwnerVerificationStatus),
      UpdatedAt: now
    };
    if (input.developerStatus === 'ClaimedCompleted') {
      fieldUpdates.DeveloperClaimedCompletedDate = coerceToIsoDateString_(input.claimedCompletedDate || now);
    }
    updateRowFields_(sheet, rowIndex, PROPERTY_SCHEMA.DefectItem.columns, fieldUpdates);

    try {
      appendCaseTimelineEntry_(
        existing.CaseID, 'DEVELOPER_STATUS_UPDATED',
        'Developer status: ' + input.developerStatus + (input.note ? (' — ' + input.note) : ''),
        { relatedDefectId: input.defectId, triggeredBy: 'recordDeveloperStatus' }
      );
      publishPropertyEvent_(PROPERTY_EVENTS.DEVELOPER_STATUS_UPDATED, null, null, {
        caseId: existing.CaseID, defectId: input.defectId, developerStatus: input.developerStatus
      });
    } catch (e) {
      logDefectEnginePartialFailure_(
        'recordDeveloperStatus',
        'DefectItem ' + input.defectId + ' DeveloperStatus was updated; Timeline/Event publish failed.', e
      );
      throw e;
    }

    return { success: true, defectId: input.defectId, developerStatus: input.developerStatus };
  });
}

/**
 * Records the Owner's own verification result. Touches ONLY
 * OwnerVerificationStatus / OwnerVerifiedDate / Status(derived) /
 * UpdatedAt — NEVER DeveloperStatus or DeveloperClaimedCompletedDate.
 * This is what makes "Developer: ClaimedCompleted" + "Owner:
 * FailedVerification" true at the same time, however many times
 * verification is re-recorded (see 997_Tests_DefectEngine.js scenario 9).
 *
 * @param {Object} input {defectId, ownerVerificationStatus, verifiedDate, reason}
 */
function recordOwnerVerification(input) {
  return withDefectEngineLock_(function () {
    input = input || {};
    if (!input.defectId) {
      throw propertyError_('DEFECT_ITEM_INVALID_INPUT', 'defectId is required.');
    }
    if (!input.ownerVerificationStatus ||
        PROPERTY_CONFIG.OWNER_VERIFICATION_STATUSES.indexOf(input.ownerVerificationStatus) === -1) {
      throw propertyError_(
        'DEFECT_ITEM_INVALID_OWNER_VERIFICATION_STATUS',
        'Unknown OwnerVerificationStatus: ' + input.ownerVerificationStatus + '.'
      );
    }

    var sheet = defectItemSheet_();
    var rowIndex = findRowIndexByFirstColumn_(sheet, input.defectId);
    if (rowIndex === -1) {
      throw propertyError_('DEFECT_ITEM_NOT_FOUND', 'No DefectItem found for defectId ' + input.defectId + '.');
    }
    var existing = readRowAsObject_(sheet, rowIndex, PROPERTY_SCHEMA.DefectItem.columns);
    assertDefectItemNotClosed_(existing, 'recordOwnerVerification');

    var now = new Date().toISOString();
    var fieldUpdates = {
      OwnerVerificationStatus: input.ownerVerificationStatus,
      OwnerVerifiedDate: coerceToIsoDateString_(input.verifiedDate || now),
      Status: deriveDefectItemStatus_(existing.DeveloperStatus, input.ownerVerificationStatus),
      UpdatedAt: now
    };
    updateRowFields_(sheet, rowIndex, PROPERTY_SCHEMA.DefectItem.columns, fieldUpdates);

    try {
      appendCaseTimelineEntry_(
        existing.CaseID, 'OWNER_VERIFICATION_RECORDED',
        'Owner verification: ' + input.ownerVerificationStatus + (input.reason ? (' — ' + input.reason) : ''),
        { relatedDefectId: input.defectId, triggeredBy: 'recordOwnerVerification' }
      );
      publishPropertyEvent_(PROPERTY_EVENTS.OWNER_VERIFICATION_RECORDED, null, null, {
        caseId: existing.CaseID, defectId: input.defectId, ownerVerificationStatus: input.ownerVerificationStatus
      });
    } catch (e) {
      logDefectEnginePartialFailure_(
        'recordOwnerVerification',
        'DefectItem ' + input.defectId + ' OwnerVerificationStatus was updated; Timeline/Event publish failed.', e
      );
      throw e;
    }

    return { success: true, defectId: input.defectId, ownerVerificationStatus: input.ownerVerificationStatus };
  });
}

/**
 * Terminal transition — only allowed once OwnerVerificationStatus is
 * 'Verified'. Mirrors markPropertySold being the only entry point for
 * Property's Sold state.
 *
 * @param {Object} input {defectId, closedDate}
 */
function closeDefectItem(input) {
  return withDefectEngineLock_(function () {
    input = input || {};
    if (!input.defectId) {
      throw propertyError_('DEFECT_ITEM_INVALID_INPUT', 'defectId is required.');
    }

    var sheet = defectItemSheet_();
    var rowIndex = findRowIndexByFirstColumn_(sheet, input.defectId);
    if (rowIndex === -1) {
      throw propertyError_('DEFECT_ITEM_NOT_FOUND', 'No DefectItem found for defectId ' + input.defectId + '.');
    }
    var existing = readRowAsObject_(sheet, rowIndex, PROPERTY_SCHEMA.DefectItem.columns);
    if (existing.Status === 'Closed') {
      throw propertyError_('DEFECT_ITEM_ALREADY_CLOSED', 'DefectItem ' + input.defectId + ' is already Closed.');
    }
    if (existing.OwnerVerificationStatus !== 'Verified') {
      throw propertyError_(
        'DEFECT_ITEM_NOT_VERIFIED',
        'Cannot close DefectItem ' + input.defectId + ': OwnerVerificationStatus is "' +
        existing.OwnerVerificationStatus + '", must be "Verified" first.'
      );
    }

    var now = new Date().toISOString();
    var closedDate = coerceToIsoDateString_(input.closedDate || now);
    updateRowFields_(sheet, rowIndex, PROPERTY_SCHEMA.DefectItem.columns, {
      Status: 'Closed', ClosedDate: closedDate, UpdatedAt: now
    });

    try {
      appendCaseTimelineEntry_(
        existing.CaseID, 'DEFECT_ITEM_CLOSED', 'Defect closed: ' + existing.Description,
        { relatedDefectId: input.defectId, triggeredBy: 'closeDefectItem' }
      );
      publishPropertyEvent_(PROPERTY_EVENTS.DEFECT_ITEM_CLOSED, null, null, {
        caseId: existing.CaseID, defectId: input.defectId, closedDate: closedDate
      });
    } catch (e) {
      logDefectEnginePartialFailure_(
        'closeDefectItem', 'DefectItem ' + input.defectId + ' was closed; Timeline/Event publish failed.', e
      );
      throw e;
    }

    return { success: true, defectId: input.defectId, closedDate: closedDate };
  });
}

/**
 * Reverses closeDefectItem. Re-derives Status from the CURRENT
 * (unchanged) sub-statuses — reopening does not itself change either
 * DeveloperStatus or OwnerVerificationStatus. A separate
 * recordOwnerVerification call follows if the person also wants to
 * record a new failed verification.
 *
 * @param {Object} input {defectId, reason} — reason is required.
 */
function reopenDefectItem(input) {
  return withDefectEngineLock_(function () {
    input = input || {};
    if (!input.defectId) {
      throw propertyError_('DEFECT_ITEM_INVALID_INPUT', 'defectId is required.');
    }
    if (!input.reason) {
      throw propertyError_('DEFECT_ITEM_INVALID_INPUT', 'reason is required when reopening a closed DefectItem.');
    }

    var sheet = defectItemSheet_();
    var rowIndex = findRowIndexByFirstColumn_(sheet, input.defectId);
    if (rowIndex === -1) {
      throw propertyError_('DEFECT_ITEM_NOT_FOUND', 'No DefectItem found for defectId ' + input.defectId + '.');
    }
    var existing = readRowAsObject_(sheet, rowIndex, PROPERTY_SCHEMA.DefectItem.columns);
    if (existing.Status !== 'Closed') {
      throw propertyError_('DEFECT_ITEM_NOT_CLOSED', 'DefectItem ' + input.defectId + ' is not Closed, nothing to reopen.');
    }

    var now = new Date().toISOString();
    updateRowFields_(sheet, rowIndex, PROPERTY_SCHEMA.DefectItem.columns, {
      Status: deriveDefectItemStatus_(existing.DeveloperStatus, existing.OwnerVerificationStatus),
      ClosedDate: '',
      UpdatedAt: now
    });

    try {
      appendCaseTimelineEntry_(
        existing.CaseID, 'DEFECT_ITEM_REOPENED', 'Defect reopened — ' + input.reason,
        { relatedDefectId: input.defectId, triggeredBy: 'reopenDefectItem' }
      );
      publishPropertyEvent_(PROPERTY_EVENTS.DEFECT_ITEM_REOPENED, null, null, {
        caseId: existing.CaseID, defectId: input.defectId, reason: input.reason
      });
    } catch (e) {
      logDefectEnginePartialFailure_(
        'reopenDefectItem', 'DefectItem ' + input.defectId + ' was reopened; Timeline/Event publish failed.', e
      );
      throw e;
    }

    return { success: true, defectId: input.defectId };
  });
}

/**
 * Closes a PropertyCase. Refuses if any DefectItem under it is not yet
 * Closed (test scenario 17/18 — a Case can stay open with one defect
 * verified, and only closes once every defect is Closed).
 *
 * @param {Object} input {caseId, closedDate}
 */
function closeCase(input) {
  return withDefectEngineLock_(function () {
    input = input || {};
    if (!input.caseId) {
      throw propertyError_('DLP_CASE_INVALID_INPUT', 'caseId is required.');
    }

    var caseSheet = propertyCaseSheet_();
    var caseRowIndex = findRowIndexByFirstColumn_(caseSheet, input.caseId);
    if (caseRowIndex === -1) {
      throw propertyError_('DLP_CASE_NOT_FOUND', 'No PropertyCase found for caseId ' + input.caseId + '.');
    }
    var existingCase = readRowAsObject_(caseSheet, caseRowIndex, PROPERTY_SCHEMA.PropertyCase.columns);
    if (existingCase.Status === 'Closed') {
      throw propertyError_('DLP_CASE_ALREADY_CLOSED', 'PropertyCase ' + input.caseId + ' is already Closed.');
    }

    var openDefects = listDefectItemsForCase(input.caseId).filter(function (d) { return d.Status !== 'Closed'; });
    if (openDefects.length > 0) {
      throw propertyError_(
        'DLP_CASE_HAS_OPEN_DEFECTS',
        'Cannot close Case ' + input.caseId + ': ' + openDefects.length + ' DefectItem(s) are not yet Closed (' +
        openDefects.map(function (d) { return d.DefectID; }).join(', ') + ').'
      );
    }

    assertPropertyCaseTransition_(existingCase.Status, 'Closed');
    var now = new Date().toISOString();
    var closedDate = coerceToIsoDateString_(input.closedDate || now);
    updateRowFields_(caseSheet, caseRowIndex, PROPERTY_SCHEMA.PropertyCase.columns, {
      Status: 'Closed', UpdatedAt: now
    });

    try {
      appendCaseTimelineEntry_(
        input.caseId, 'CASE_CLOSED', 'Case closed — all defects verified and closed.',
        { triggeredBy: 'closeCase' }
      );
      publishPropertyEvent_(PROPERTY_EVENTS.CASE_CLOSED, existingCase.PropertyID, null, {
        caseId: input.caseId, closedDate: closedDate
      });
    } catch (e) {
      logDefectEnginePartialFailure_(
        'closeCase', 'PropertyCase ' + input.caseId + ' was closed; Timeline/Event publish failed.', e
      );
      throw e;
    }

    return { success: true, caseId: input.caseId, closedDate: closedDate };
  });
}

// ─────────────────────────────────────────────────────────────────────
// Phase 4 — Daily Progress Check (2026-08-16)
// ─────────────────────────────────────────────────────────────────────

/**
 * Logs one Daily Progress Check against a Case. Deliberately minimal —
 * only caseId is required, every observation field defaults to
 * false/blank — matching the task's own 30-60-second-on-a-phone design
 * goal (Phase0 Audit §7/§18): the person should be able to log "no
 * access observed today" in one tap without filling in anything else.
 *
 * @param {Object} input {caseId, checkedBy, dateTime, accessObserved,
 *   contractorObserved, developerRepresentativeObserved, workObserved,
 *   generalStatus, notes, clientRequestId}
 */
function logDailyProgressCheck(input) {
  return withDefectEngineLock_(function () {
    input = input || {};

    if (input.clientRequestId) {
      var cached = getCachedDefectEngineCommandResult_(input.clientRequestId);
      if (cached) return cached;
    }

    if (!input.caseId) {
      throw propertyError_('DAILY_CHECK_INVALID_INPUT', 'caseId is required.');
    }
    var propertyCase = getPropertyCase(input.caseId);
    if (!propertyCase) {
      throw propertyError_('DAILY_CHECK_CASE_NOT_FOUND', 'No PropertyCase found for caseId ' + input.caseId + '.');
    }
    if (propertyCase.Status === 'Closed') {
      throw propertyError_('DAILY_CHECK_CASE_CLOSED', 'Cannot log a Daily Check against a Closed Case (' + input.caseId + ').');
    }

    var now = new Date().toISOString();
    var checkId = generateProgressCheckId_();
    var dateTime = input.dateTime ? new Date(input.dateTime).toISOString() : now;

    var dailyCheck = {
      CheckID: checkId,
      CaseID: input.caseId,
      DateTime: dateTime,
      CheckedBy: input.checkedBy || '',
      AccessObserved: !!input.accessObserved,
      ContractorObserved: !!input.contractorObserved,
      DeveloperRepresentativeObserved: !!input.developerRepresentativeObserved,
      WorkObserved: input.workObserved || '',
      GeneralStatus: input.generalStatus || '',
      Notes: input.notes || '',
      CreatedAt: now
    };

    dailyProgressCheckSheet_().appendRow(
      objectToRowArray_(dailyCheck, PROPERTY_SCHEMA.DailyProgressCheck.columns)
    );

    try {
      appendCaseTimelineEntry_(
        input.caseId, 'DAILY_CHECK_LOGGED', buildDailyCheckSummary_(dailyCheck),
        { triggeredBy: 'logDailyProgressCheck' }
      );
      publishPropertyEvent_(PROPERTY_EVENTS.DAILY_CHECK_LOGGED, propertyCase.PropertyID, null, {
        caseId: input.caseId, checkId: checkId, dateTime: dateTime, accessObserved: !!input.accessObserved
      });
    } catch (e) {
      logDefectEnginePartialFailure_(
        'logDailyProgressCheck', 'DailyProgressCheck ' + checkId + ' row was written; Timeline/Event publish failed.', e
      );
      throw e;
    }

    var result = { success: true, checkId: checkId, dailyCheck: dailyCheck };
    if (input.clientRequestId) cacheDefectEngineCommandResult_(input.clientRequestId, result);
    return result;
  });
}

// ─────────────────────────────────────────────────────────────────────
// Phase 6 — Correspondence + Response Deadline (2026-08-17)
// ─────────────────────────────────────────────────────────────────────

/**
 * Logs a piece of correspondence (sent or received). ResponseDueDate is
 * computed via addWorkingDays_ if responseRequestedDate + responseWorkingDays
 * are given; can also be set directly via responseDueDate; left blank
 * otherwise. Neither path forces a value — a lot of correspondence
 * (e.g. a routine update, or something received with no reply expected)
 * has no deadline at all, and that's a legitimate, common case, not
 * something to paper over with a default.
 *
 * @param {Object} input {caseId, date, direction, sender, recipient,
 *   subject, responseStatus, responseRequestedDate, responseWorkingDays,
 *   responseDueDate, clientRequestId}
 */
function logCorrespondence(input) {
  return withDefectEngineLock_(function () {
    input = input || {};

    if (input.clientRequestId) {
      var cached = getCachedDefectEngineCommandResult_(input.clientRequestId);
      if (cached) return cached;
    }

    if (!input.caseId) {
      throw propertyError_('CORRESPONDENCE_INVALID_INPUT', 'caseId is required.');
    }
    var propertyCase = getPropertyCase(input.caseId);
    if (!propertyCase) {
      throw propertyError_('CORRESPONDENCE_CASE_NOT_FOUND', 'No PropertyCase found for caseId ' + input.caseId + '.');
    }
    if (propertyCase.Status === 'Closed') {
      throw propertyError_('CORRESPONDENCE_CASE_CLOSED', 'Cannot log Correspondence against a Closed Case (' + input.caseId + ').');
    }
    if (!input.direction || PROPERTY_CONFIG.CORRESPONDENCE_DIRECTIONS.indexOf(input.direction) === -1) {
      throw propertyError_('CORRESPONDENCE_INVALID_DIRECTION', 'Unknown Direction: ' + input.direction + '.');
    }
    if (!input.subject) {
      throw propertyError_('CORRESPONDENCE_INVALID_INPUT', 'subject is required.');
    }
    var responseStatus = input.responseStatus || 'Pending';
    if (PROPERTY_CONFIG.CORRESPONDENCE_RESPONSE_STATUSES.indexOf(responseStatus) === -1) {
      throw propertyError_('CORRESPONDENCE_INVALID_RESPONSE_STATUS', 'Unknown ResponseStatus: ' + responseStatus + '.');
    }

    var responseDueDate = '';
    if (input.responseDueDate) {
      responseDueDate = coerceToIsoDateString_(input.responseDueDate);
    } else if (input.responseRequestedDate && input.responseWorkingDays) {
      responseDueDate = addWorkingDays_(input.responseRequestedDate, input.responseWorkingDays);
    }

    var now = new Date().toISOString();
    var correspondenceId = generateCorrespondenceId_();
    var correspondence = {
      CorrespondenceID: correspondenceId,
      CaseID: input.caseId,
      Date: coerceToIsoDateString_(input.date || now),
      Direction: input.direction,
      Sender: input.sender || '',
      Recipient: input.recipient || '',
      Subject: input.subject,
      ResponseStatus: responseStatus,
      ResponseRequestedDate: input.responseRequestedDate ? coerceToIsoDateString_(input.responseRequestedDate) : '',
      ResponseDueDate: responseDueDate,
      ResponseReceivedDate: '',
      CreatedAt: now,
      UpdatedAt: now
    };

    correspondenceSheet_().appendRow(objectToRowArray_(correspondence, PROPERTY_SCHEMA.Correspondence.columns));

    try {
      appendCaseTimelineEntry_(
        input.caseId, 'CORRESPONDENCE_LOGGED',
        'Correspondence ' + input.direction.toLowerCase() + ': ' + input.subject +
        (responseDueDate ? (' (response due ' + responseDueDate + ')') : ''),
        { triggeredBy: 'logCorrespondence' }
      );
      publishPropertyEvent_(PROPERTY_EVENTS.CORRESPONDENCE_LOGGED, propertyCase.PropertyID, null, {
        caseId: input.caseId, correspondenceId: correspondenceId, direction: input.direction, subject: input.subject
      });
    } catch (e) {
      logDefectEnginePartialFailure_(
        'logCorrespondence', 'Correspondence ' + correspondenceId + ' row was written; Timeline/Event publish failed.', e
      );
      throw e;
    }

    var result = { success: true, correspondenceId: correspondenceId, correspondence: correspondence };
    if (input.clientRequestId) cacheDefectEngineCommandResult_(input.clientRequestId, result);
    return result;
  });
}

/**
 * Records a response outcome for an existing Correspondence. A
 * 'NotedOnly' outcome is recorded exactly as given — this Command never
 * infers or upgrades it to 'Answered' on its own; that distinction is
 * the entire point of the ResponseStatus enum (task's explicit ask,
 * Test Plan scenario 13).
 *
 * @param {Object} input {correspondenceId, responseStatus, responseReceivedDate, note}
 */
function recordCorrespondenceResponse(input) {
  return withDefectEngineLock_(function () {
    input = input || {};
    if (!input.correspondenceId) {
      throw propertyError_('CORRESPONDENCE_INVALID_INPUT', 'correspondenceId is required.');
    }
    if (!input.responseStatus || PROPERTY_CONFIG.CORRESPONDENCE_RESPONSE_STATUSES.indexOf(input.responseStatus) === -1) {
      throw propertyError_('CORRESPONDENCE_INVALID_RESPONSE_STATUS', 'Unknown ResponseStatus: ' + input.responseStatus + '.');
    }

    var sheet = correspondenceSheet_();
    var rowIndex = findRowIndexByFirstColumn_(sheet, input.correspondenceId);
    if (rowIndex === -1) {
      throw propertyError_(
        'CORRESPONDENCE_NOT_FOUND', 'No Correspondence found for correspondenceId ' + input.correspondenceId + '.'
      );
    }
    var existing = readRowAsObject_(sheet, rowIndex, PROPERTY_SCHEMA.Correspondence.columns);

    var now = new Date().toISOString();
    updateRowFields_(sheet, rowIndex, PROPERTY_SCHEMA.Correspondence.columns, {
      ResponseStatus: input.responseStatus,
      ResponseReceivedDate: coerceToIsoDateString_(input.responseReceivedDate || now),
      UpdatedAt: now
    });

    try {
      appendCaseTimelineEntry_(
        existing.CaseID, 'CORRESPONDENCE_RESPONSE_RECORDED',
        'Correspondence response (' + existing.Subject + '): ' + input.responseStatus +
        (input.note ? (' — ' + input.note) : ''),
        { triggeredBy: 'recordCorrespondenceResponse' }
      );
      publishPropertyEvent_(PROPERTY_EVENTS.CORRESPONDENCE_RESPONSE_RECORDED, null, null, {
        caseId: existing.CaseID, correspondenceId: input.correspondenceId, responseStatus: input.responseStatus
      });
    } catch (e) {
      logDefectEnginePartialFailure_(
        'recordCorrespondenceResponse',
        'Correspondence ' + input.correspondenceId + ' ResponseStatus was updated; Timeline/Event publish failed.', e
      );
      throw e;
    }

    return { success: true, correspondenceId: input.correspondenceId, responseStatus: input.responseStatus };
  });
}

// ─────────────────────────────────────────────────────────────────────
// Phase 7 — RectificationEvent + SecondaryDamage (2026-08-17)
// ─────────────────────────────────────────────────────────────────────

/**
 * Appends one milestone to a defect's (or the case's) rectification
 * history. Append-only by design (CC Review Approval 2026-08-15,
 * Phase0 Audit §4.5) — never call this to "correct" a past entry,
 * log a new one.
 *
 * Deliberately does NOT touch DefectItem.DeveloperStatus even when
 * eventType is 'DeveloperClaimedCompleted' — that's a separate,
 * explicit recordDeveloperStatus call. Coupling a free-text EventType
 * to an automatic mutation of a different entity's controlled enum
 * would be exactly the kind of implicit, surprising side effect this
 * Vertical Slice has avoided everywhere else (same reasoning as
 * reopenDefectItem not also accepting a new verification in one call).
 *
 * @param {Object} input {caseId, defectId, eventType, eventDate, entryTime,
 *   exitTime, contractorCompany, contractorPersonnel, notes, source, clientRequestId}
 */
function logRectificationEvent(input) {
  return withDefectEngineLock_(function () {
    input = input || {};

    if (input.clientRequestId) {
      var cached = getCachedDefectEngineCommandResult_(input.clientRequestId);
      if (cached) return cached;
    }

    if (!input.caseId) {
      throw propertyError_('RECTIFICATION_EVENT_INVALID_INPUT', 'caseId is required.');
    }
    var propertyCase = getPropertyCase(input.caseId);
    if (!propertyCase) {
      throw propertyError_('RECTIFICATION_EVENT_CASE_NOT_FOUND', 'No PropertyCase found for caseId ' + input.caseId + '.');
    }
    if (propertyCase.Status === 'Closed') {
      throw propertyError_('RECTIFICATION_EVENT_CASE_CLOSED', 'Cannot log a RectificationEvent against a Closed Case (' + input.caseId + ').');
    }
    if (!input.eventType || PROPERTY_CONFIG.RECTIFICATION_EVENT_TYPES.indexOf(input.eventType) === -1) {
      throw propertyError_('RECTIFICATION_EVENT_INVALID_TYPE', 'Unknown EventType: ' + input.eventType + '.');
    }
    if (input.defectId) {
      var defect = getDefectItem(input.defectId);
      if (!defect) {
        throw propertyError_('RECTIFICATION_EVENT_DEFECT_NOT_FOUND', 'No DefectItem found for defectId ' + input.defectId + '.');
      }
      if (defect.CaseID !== input.caseId) {
        throw propertyError_(
          'RECTIFICATION_EVENT_DEFECT_CASE_MISMATCH',
          'DefectItem ' + input.defectId + ' belongs to Case ' + defect.CaseID + ', not ' + input.caseId + '.'
        );
      }
    }
    var source = input.source || 'OwnerObserved';
    if (PROPERTY_CONFIG.RECTIFICATION_SOURCES.indexOf(source) === -1) {
      throw propertyError_('RECTIFICATION_EVENT_INVALID_SOURCE', 'Unknown Source: ' + source + '.');
    }

    var now = new Date().toISOString();
    var rectificationEventId = generateRectificationEventId_();
    var rectificationEvent = {
      RectificationEventID: rectificationEventId,
      CaseID: input.caseId,
      DefectID: input.defectId || '',
      EventType: input.eventType,
      EventDate: coerceToIsoDateString_(input.eventDate || now),
      EntryTime: input.entryTime || '',
      ExitTime: input.exitTime || '',
      ContractorCompany: input.contractorCompany || '',
      ContractorPersonnel: input.contractorPersonnel || '',
      Notes: input.notes || '',
      Source: source,
      CreatedAt: now
    };

    rectificationEventSheet_().appendRow(
      objectToRowArray_(rectificationEvent, PROPERTY_SCHEMA.RectificationEvent.columns)
    );

    try {
      appendCaseTimelineEntry_(
        input.caseId, 'RECTIFICATION_EVENT_LOGGED', buildRectificationEventSummary_(rectificationEvent),
        { relatedDefectId: input.defectId, triggeredBy: 'logRectificationEvent' }
      );
      publishPropertyEvent_(PROPERTY_EVENTS.RECTIFICATION_EVENT_LOGGED, propertyCase.PropertyID, null, {
        caseId: input.caseId, rectificationEventId: rectificationEventId,
        eventType: input.eventType, eventDate: rectificationEvent.EventDate
      });
    } catch (e) {
      logDefectEnginePartialFailure_(
        'logRectificationEvent',
        'RectificationEvent ' + rectificationEventId + ' row was written; Timeline/Event publish failed.', e
      );
      throw e;
    }

    var result = { success: true, rectificationEventId: rectificationEventId, rectificationEvent: rectificationEvent };
    if (input.clientRequestId) cacheDefectEngineCommandResult_(input.clientRequestId, result);
    return result;
  });
}

/**
 * Logs a new Secondary Damage record. The system deliberately never
 * infers legal responsibility — responsibleParty / dlpPrejudiceStatus /
 * contractualBasis are all plain, neutral free-text fields, never
 * computed or judged by this Command (task §六, Phase0 Audit §4.6).
 *
 * @param {Object} input {caseId, parentDefectId, rectificationEventId,
 *   damageType, description, observedDate, observedBy, responsibleParty,
 *   administrativeSubmissionRequired, separateSubmissionId,
 *   dlpPrejudiceStatus, contractualBasis, clientRequestId}
 */
function logSecondaryDamage(input) {
  return withDefectEngineLock_(function () {
    input = input || {};

    if (input.clientRequestId) {
      var cached = getCachedDefectEngineCommandResult_(input.clientRequestId);
      if (cached) return cached;
    }

    if (!input.caseId) {
      throw propertyError_('SECONDARY_DAMAGE_INVALID_INPUT', 'caseId is required.');
    }
    var propertyCase = getPropertyCase(input.caseId);
    if (!propertyCase) {
      throw propertyError_('SECONDARY_DAMAGE_CASE_NOT_FOUND', 'No PropertyCase found for caseId ' + input.caseId + '.');
    }
    if (propertyCase.Status === 'Closed') {
      throw propertyError_('SECONDARY_DAMAGE_CASE_CLOSED', 'Cannot log SecondaryDamage against a Closed Case (' + input.caseId + ').');
    }
    if (!input.description) {
      throw propertyError_('SECONDARY_DAMAGE_INVALID_INPUT', 'description is required.');
    }
    var damageType = input.damageType || 'Other';
    if (PROPERTY_CONFIG.SECONDARY_DAMAGE_TYPES.indexOf(damageType) === -1) {
      throw propertyError_('SECONDARY_DAMAGE_INVALID_TYPE', 'Unknown DamageType: ' + damageType + '.');
    }
    if (input.parentDefectId) {
      var defect = getDefectItem(input.parentDefectId);
      if (!defect) {
        throw propertyError_('SECONDARY_DAMAGE_DEFECT_NOT_FOUND', 'No DefectItem found for parentDefectId ' + input.parentDefectId + '.');
      }
      if (defect.CaseID !== input.caseId) {
        throw propertyError_(
          'SECONDARY_DAMAGE_DEFECT_CASE_MISMATCH',
          'DefectItem ' + input.parentDefectId + ' belongs to Case ' + defect.CaseID + ', not ' + input.caseId + '.'
        );
      }
    }
    if (input.rectificationEventId && !getRectificationEvent(input.rectificationEventId)) {
      throw propertyError_(
        'SECONDARY_DAMAGE_RECTIFICATION_EVENT_NOT_FOUND',
        'No RectificationEvent found for rectificationEventId ' + input.rectificationEventId + '.'
      );
    }

    var now = new Date().toISOString();
    var damageId = generateSecondaryDamageId_();
    var damage = {
      DamageID: damageId,
      CaseID: input.caseId,
      ParentDefectID: input.parentDefectId || '',
      RectificationEventID: input.rectificationEventId || '',
      DamageType: damageType,
      Description: input.description,
      ObservedDate: coerceToIsoDateString_(input.observedDate || now),
      ObservedBy: input.observedBy || '',
      ResponsibleParty: input.responsibleParty || '',
      Status: 'Reported',
      Resolution: '',
      AdministrativeSubmissionRequired: !!input.administrativeSubmissionRequired,
      SeparateSubmissionID: input.separateSubmissionId || '',
      DlpPrejudiceStatus: input.dlpPrejudiceStatus || '',
      ContractualBasis: input.contractualBasis || '',
      CreatedAt: now,
      UpdatedAt: now
    };

    secondaryDamageSheet_().appendRow(objectToRowArray_(damage, PROPERTY_SCHEMA.SecondaryDamage.columns));

    try {
      appendCaseTimelineEntry_(
        input.caseId, 'SECONDARY_DAMAGE_LOGGED', 'Secondary damage (' + damageType + '): ' + input.description,
        { relatedDefectId: input.parentDefectId, triggeredBy: 'logSecondaryDamage' }
      );
      publishPropertyEvent_(PROPERTY_EVENTS.SECONDARY_DAMAGE_LOGGED, propertyCase.PropertyID, null, {
        caseId: input.caseId, damageId: damageId, damageType: damageType
      });
    } catch (e) {
      logDefectEnginePartialFailure_(
        'logSecondaryDamage', 'SecondaryDamage ' + damageId + ' row was written; Timeline/Event publish failed.', e
      );
      throw e;
    }

    var result = { success: true, damageId: damageId, damage: damage };
    if (input.clientRequestId) cacheDefectEngineCommandResult_(input.clientRequestId, result);
    return result;
  });
}

/**
 * Updates a SecondaryDamage's Status (and optionally Resolution). No
 * transition guard — Reported/Acknowledged/Rectified/Disputed can
 * legitimately move in more than one direction (e.g. Disputed back to
 * Acknowledged if the developer later accepts responsibility), same
 * reasoning as DeveloperStatus/OwnerVerificationStatus not having a
 * strict transition map.
 *
 * @param {Object} input {damageId, status, resolution}
 */
function updateSecondaryDamageStatus(input) {
  return withDefectEngineLock_(function () {
    input = input || {};
    if (!input.damageId) {
      throw propertyError_('SECONDARY_DAMAGE_INVALID_INPUT', 'damageId is required.');
    }
    if (!input.status || PROPERTY_CONFIG.SECONDARY_DAMAGE_STATUSES.indexOf(input.status) === -1) {
      throw propertyError_('SECONDARY_DAMAGE_INVALID_STATUS', 'Unknown Status: ' + input.status + '.');
    }

    var sheet = secondaryDamageSheet_();
    var rowIndex = findRowIndexByFirstColumn_(sheet, input.damageId);
    if (rowIndex === -1) {
      throw propertyError_('SECONDARY_DAMAGE_NOT_FOUND', 'No SecondaryDamage found for damageId ' + input.damageId + '.');
    }
    var existing = readRowAsObject_(sheet, rowIndex, PROPERTY_SCHEMA.SecondaryDamage.columns);

    var now = new Date().toISOString();
    var fieldUpdates = { Status: input.status, UpdatedAt: now };
    if (input.resolution !== undefined) {
      fieldUpdates.Resolution = input.resolution;
    }
    updateRowFields_(sheet, rowIndex, PROPERTY_SCHEMA.SecondaryDamage.columns, fieldUpdates);

    try {
      appendCaseTimelineEntry_(
        existing.CaseID, 'SECONDARY_DAMAGE_STATUS_UPDATED',
        'Secondary damage status: ' + input.status + (input.resolution ? (' — ' + input.resolution) : ''),
        { relatedDefectId: existing.ParentDefectID, triggeredBy: 'updateSecondaryDamageStatus' }
      );
      publishPropertyEvent_(PROPERTY_EVENTS.SECONDARY_DAMAGE_STATUS_UPDATED, null, null, {
        caseId: existing.CaseID, damageId: input.damageId, status: input.status
      });
    } catch (e) {
      logDefectEnginePartialFailure_(
        'updateSecondaryDamageStatus',
        'SecondaryDamage ' + input.damageId + ' Status was updated; Timeline/Event publish failed.', e
      );
      throw e;
    }

    return { success: true, damageId: input.damageId, status: input.status };
  });
}
