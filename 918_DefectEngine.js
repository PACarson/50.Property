/**
 * ═══════════════════════════════════════════════════════════════════════
 * PROPERTY OS — 918_DefectEngine.js
 * Runtime Layer — DLP Defect Case & Rectification Tracking
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Vertical Slice, Phase 2 + Phase 3 (Review Approval 2026-08-15/16 — see
 * the standalone Phase0 Audit doc for the full design rationale, and
 * 00_ADR_Log.js ADR-P15 for the "single engine, no separate generic
 * Case Engine" decision this file embodies).
 *
 * This phase delivers:
 *   Phase 2 — shared infra (Lock, idempotency cache, partial-failure
 *             logger, sheet accessors, Timeline append helper). There is
 *             no separately-named "Repository" layer in Property OS
 *             (see 901_PropertySchema.js's shared row I/O utilities) —
 *             this section IS the Repository/Service layer for 918,
 *             exactly as 910/912 are for their own domains.
 *   Phase 3 — PropertyCase + DefectItem lifecycle Commands.
 *
 * NOT in this phase (later phases, per the agreed Implementation Order):
 *   Phase 4  DailyProgressCheck (logDailyProgressCheck)
 *   Phase 5  Evidence (911_DocumentEngine.js — separate file)
 *   Phase 6  Correspondence + addWorkingDays_
 *   Phase 7  RectificationEvent + SecondaryDamage
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
 * Open question flagged for review, NOT yet implemented: after a
 * FailedVerification, if the Developer submits a FRESH 'ClaimedCompleted'
 * claim, this still returns 'InProgress' (OwnerVerificationStatus is
 * untouched, still 'FailedVerification') rather than 'PendingVerification'
 * — because recordDeveloperStatus deliberately never writes
 * OwnerVerificationStatus, per the independence rule agreed for this
 * Vertical Slice. An alternative design would have recordDeveloperStatus
 * reset OwnerVerificationStatus back to 'NotChecked' on every fresh
 * ClaimedCompleted claim (arguably more intuitive — a new claim really
 * does need a fresh check) but that would mean the Developer Command
 * writes an Owner-side field, which is a bigger boundary change than
 * this phase's Review Approval covers. Left as-is until confirmed.
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
