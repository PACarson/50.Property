/**
 * ═══════════════════════════════════════════════════════════════════════
 * PROPERTY OS — 912_ObligationEngine.js
 * Runtime Layer — Obligation Engine (ADR-P01: single source of truth for
 * all Recurring Obligations)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Governs: ObligationEngine_VerticalSlice.md (approved baseline, incl.
 * ADR-P06 amendments), Domain Model §3.
 * Session 1, Part B — file 1 of 2.
 *
 * Owns Truth Layer writes for: ObligationRule, ObligationOccurrence,
 * ObligationHistory (append-only). No other Engine writes these sheets
 * (P3 Single Owner).
 *
 * Every mutating Command runs inside withObligationLock_() — exactly one
 * top-level lock per Command, never nested (Constitution §5). Internal
 * helpers below never acquire their own lock.
 *
 * Every event this file needs to publish goes through
 * publishPropertyEvent_() (903) — the ADR-P07 Infrastructure Adapter.
 * This file never touches EventBus directly, and never will, regardless
 * of what EventBus turns out to be.
 *
 * publishPropertyEvent_() only currently Logger.logs — see 903's header.
 * Because of that, 914_FinanceEngine (which doesn't exist yet) cannot
 * yet actually react to PAYMENT_COMPLETED. This file does NOT work
 * around that by calling into Finance Engine directly — that would
 * violate the event-only boundary ADR-P01 establishes, even though 914
 * isn't built. Publishing the event is 912's complete responsibility.
 *
 * 913_ObligationScheduler is different: it's the other half of this same
 * Aggregate's Runtime (not a separate OS), so direct calls between
 * 912 and 913 stand in for "subscription" until a real EventBus exists.
 * See 913's file header for the matching note.
 *
 * Depends on: 900_PropertyConfig.js, 901_PropertySchema.js,
 * 902_PropertyIdentity.js, 903_PropertyEventDefinitions.js,
 * 913_ObligationScheduler.js
 * ═══════════════════════════════════════════════════════════════════════
 */


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Locking
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Single top-level lock for every Obligation-mutating Command
 * (Constitution §5: "single top-level lock, not nested"). Internal
 * helpers called from within a locked Command must NEVER acquire their
 * own lock — none of them do, by construction: only the seven public
 * Command functions at the bottom of this file call this wrapper.
 * @param {function():*} fn
 * @return {*} fn's return value
 */
function withObligationLock_(fn) {
  var lock = LockService.getScriptLock();
  var acquired = lock.tryLock(30000);
  if (!acquired) {
    throw propertyError_(
      'LOCK_TIMEOUT',
      'Could not acquire ObligationEngine lock within 30s — another operation is in progress.'
    );
  }
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

/**
 * Per UEF v1.6 §2 "Platform Constraints" (D9): Sheets has no multi-
 * statement transactions, so a Command's several writes are NOT atomic.
 * This does not attempt to fix that — full saga/reconciliation
 * machinery is a disproportionate response at this project's scale
 * (D9's reasoning). It makes a failure AFTER a Truth write already
 * succeeded loud and specifically labeled, so a rare failure is a
 * findable, human-reconcilable event instead of a silent inconsistency.
 * Never swallows the error — always call this, then re-throw.
 * @param {string} commandName e.g. 'recordPayment'
 * @param {string} truthDescription exactly what already committed
 * @param {Error} originalError
 */
function logPartialFailure_(commandName, truthDescription, originalError) {
  Logger.log(
    '⚠ PARTIAL FAILURE in ' + commandName + ' — the following ' +
    'Truth Layer write ALREADY SUCCEEDED before a later step failed ' +
    '(UEF v1.6 §2 Platform Constraints, D9 — Sheets has no multi-' +
    'statement transactions): ' + truthDescription + '. Manual ' +
    'reconciliation may be needed. Underlying error: ' + originalError.message
  );
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Idempotency (ClientRequestID) — CreateObligation, UpdateObligation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RecordPayment/CancelObligation/PauseObligation/ResumeObligation/
// ReversePayment are idempotent on their own domain key (OccurrenceID /
// ObligationID + current Status) and don't need this — see each
// Command's own guard clauses below.

var IDEMPOTENCY_CACHE_TTL_SECONDS = 3600; // 1 hour: double-submission
// protection (e.g. a double-tapped Telegram button), not long-term
// dedup — CacheService (max TTL 6h) is the right-sized tool for that,
// not a persistent Sheet.

function getCachedCommandResult_(clientRequestId) {
  var cached = CacheService.getScriptCache().get('propertyos_idem_' + clientRequestId);
  return cached ? JSON.parse(cached) : null;
}

function cacheCommandResult_(clientRequestId, result) {
  CacheService.getScriptCache().put(
    'propertyos_idem_' + clientRequestId,
    JSON.stringify(result),
    IDEMPOTENCY_CACHE_TTL_SECONDS
  );
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// State Machine guards (Vertical Slice §9)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

var RULE_TRANSITIONS_ = {
  'Draft': ['Active'],
  'Active': ['Suspended', 'Cancelled', 'Completed'],
  'Suspended': ['Active', 'Cancelled', 'Completed'],
  'Cancelled': [],
  'Completed': []
};

function assertRuleTransition_(fromStatus, toStatus) {
  var allowed = RULE_TRANSITIONS_[fromStatus] || [];
  if (allowed.indexOf(toStatus) === -1) {
    throw propertyError_(
      'FORBIDDEN_TRANSITION',
      'ObligationRule cannot transition from ' + fromStatus + ' to ' + toStatus
    );
  }
}

// Paid is deliberately absent as a source here — the ONLY function
// allowed to move an Occurrence out of Paid is reversePayment(), via its
// own narrow, explicit write (ADR-P06). This map must never grow a
// 'Paid' key; that would silently reopen the exception to every caller.
var OCCURRENCE_TRANSITIONS_ = {
  'Draft': ['Active'],
  'Active': ['Paid', 'Cancelled']
};

function assertOccurrenceTransition_(fromStatus, toStatus) {
  var allowed = OCCURRENCE_TRANSITIONS_[fromStatus] || [];
  if (allowed.indexOf(toStatus) === -1) {
    throw propertyError_(
      'FORBIDDEN_TRANSITION',
      'ObligationOccurrence cannot transition from ' + fromStatus + ' to ' + toStatus
    );
  }
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Placeholder cross-Engine check (same pattern as ADR-P07's Adapter)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 910_PropertyAssetEngine now provides the real propertyExists_()
 * (defined there, not here — Vertical Slice §8 promise fulfilled
 * 2026-07-29). Nothing left to define in this file: GAS loads files in
 * filename order (910 before 912), so if a second `function
 * propertyExists_` were left here, it would load AFTER and silently
 * shadow 910's real check with the old permissive placeholder — a real
 * bug, not a hypothetical one, caught while wiring this up rather than
 * after. Every call site below (createObligation) already calls
 * propertyExists_() exactly as before; only its definition moved.
 */


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Row access helpers (Obligation-specific; generic I/O lives in 901)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ruleSheet_() {
  return ensureSheetSchema_(
    PROPERTY_SCHEMA.ObligationRule.sheetName,
    PROPERTY_SCHEMA.ObligationRule.columns,
    PROPERTY_SCHEMA.ObligationRule.dateColumns
  );
}

function occurrenceSheet_() {
  return ensureSheetSchema_(
    PROPERTY_SCHEMA.ObligationOccurrence.sheetName,
    PROPERTY_SCHEMA.ObligationOccurrence.columns,
    PROPERTY_SCHEMA.ObligationOccurrence.dateColumns
  );
}

function findObligationRuleRowIndex_(obligationId) {
  return findRowIndexByFirstColumn_(ruleSheet_(), obligationId);
}

function getObligationRuleById_(obligationId) {
  var row = findObligationRuleRowIndex_(obligationId);
  if (row === -1) return null;
  return readRowAsObject_(ruleSheet_(), row, PROPERTY_SCHEMA.ObligationRule.columns);
}

function updateObligationRuleFields_(obligationId, fieldUpdates) {
  var row = findObligationRuleRowIndex_(obligationId);
  if (row === -1) {
    throw propertyError_('OBLIGATION_NOT_FOUND', 'No ObligationRule found for ' + obligationId);
  }
  return updateRowFields_(ruleSheet_(), row, PROPERTY_SCHEMA.ObligationRule.columns, fieldUpdates);
}

function findOccurrenceRowIndex_(occurrenceId) {
  return findRowIndexByFirstColumn_(occurrenceSheet_(), occurrenceId);
}

function getOccurrenceById_(occurrenceId) {
  var row = findOccurrenceRowIndex_(occurrenceId);
  if (row === -1) return null;
  var obj = readRowAsObject_(occurrenceSheet_(), row, PROPERTY_SCHEMA.ObligationOccurrence.columns);
  obj.EffectiveDue = coerceToIsoDateString_(obj.EffectiveDue);
  return obj;
}

function updateOccurrenceFields_(rowIndex, fieldUpdates) {
  return updateRowFields_(occurrenceSheet_(), rowIndex, PROPERTY_SCHEMA.ObligationOccurrence.columns, fieldUpdates);
}

/**
 * @param {string} obligationId
 * @param {string} effectiveDueIsoDate
 * @return {Object|null}
 */
function findOccurrenceByRuleAndDue_(obligationId, effectiveDueIsoDate) {
  var sheet = occurrenceSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  var columns = PROPERTY_SCHEMA.ObligationOccurrence.columns;
  var data = sheet.getRange(2, 1, lastRow - 1, columns.length).getValues();
  var idCol = columns.indexOf('ObligationID');
  var dueCol = columns.indexOf('EffectiveDue');
  for (var i = 0; i < data.length; i++) {
    if (data[i][idCol] === obligationId &&
        coerceToIsoDateString_(data[i][dueCol]) === effectiveDueIsoDate) {
      var obj = {};
      columns.forEach(function (col, idx) { obj[col] = data[i][idx]; });
      obj.EffectiveDue = coerceToIsoDateString_(obj.EffectiveDue);
      return obj;
    }
  }
  return null;
}

function appendObligationHistory_(occurrenceId, fromStatus, toStatus, triggeredBy, note) {
  var sheet = ensureSheetSchema_(
    PROPERTY_SCHEMA.ObligationHistory.sheetName,
    PROPERTY_SCHEMA.ObligationHistory.columns,
    PROPERTY_SCHEMA.ObligationHistory.dateColumns
  );
  var row = {
    HistoryID: generateHistoryId_(),
    OccurrenceID: occurrenceId,
    FromStatus: fromStatus || '',
    ToStatus: toStatus,
    ChangedAt: toIsoDateTime_(new Date()),
    TriggeredBy: triggeredBy,
    Note: note || ''
  };
  sheet.appendRow(objectToRowArray_(row, PROPERTY_SCHEMA.ObligationHistory.columns));
}

/**
 * Creates the Occurrence for a given due date if one doesn't already
 * exist. Idempotent on (ObligationID, effectiveDue) — safe to call
 * more than once for the same cycle (Vertical Slice §2 validation rule).
 * @param {Object} rule
 * @param {string} effectiveDueIsoDate
 * @return {Object} the (possibly pre-existing) Occurrence
 */
function createOccurrence_(rule, effectiveDueIsoDate) {
  var existing = findOccurrenceByRuleAndDue_(rule.ObligationID, effectiveDueIsoDate);
  if (existing) return existing;

  var now = toIsoDateTime_(new Date());
  var occurrence = {
    OccurrenceID: generateOccurrenceId_(),
    ObligationID: rule.ObligationID,
    EffectiveDue: effectiveDueIsoDate,
    Amount: rule.Amount,
    Currency: rule.Currency,
    Status: 'Active',
    PaidDate: '', PaidAmount: '', PaidVia: '', Evidence: '',
    ReversedAt: '', ReversalReason: '',
    CreatedAt: now, UpdatedAt: now
  };
  occurrenceSheet_().appendRow(objectToRowArray_(occurrence, PROPERTY_SCHEMA.ObligationOccurrence.columns));
  appendObligationHistory_(occurrence.OccurrenceID, '', 'Active', 'CreateOccurrence', '');
  return occurrence;
}

/** Rule reached its natural end (EndDate) — see scheduleNextOccurrence_ in 913. */
function transitionRuleToCompleted_(rule) {
  assertRuleTransition_(rule.Status, 'Completed');
  updateObligationRuleFields_(rule.ObligationID, {
    Status: 'Completed',
    UpdatedAt: toIsoDateTime_(new Date())
  });
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Commands (Vertical Slice §5, + ReversePayment from ADR-P06)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * @param {Object} input {propertyId, category, payee?, amount, currency?,
 *   frequencyType, customIntervalDays?, dueAnchor, reminderOffsets?,
 *   autoGenerate?, graceDays?, endDate?, loanId?, leaseId?, clientRequestId?}
 */
function createObligation(input) {
  return withObligationLock_(function () {
    if (!input || typeof input !== 'object') {
      throw propertyError_('INVALID_INPUT', 'createObligation requires an input object.');
    }
    if (input.clientRequestId) {
      var cached = getCachedCommandResult_(input.clientRequestId);
      if (cached) return cached;
    }

    assertIdPrefix_(input.propertyId, PROPERTY_CONFIG.ID_PREFIXES.PROPERTY);
    if (!propertyExists_(input.propertyId)) {
      throw propertyError_('PROPERTY_NOT_FOUND', 'No Property found for ' + input.propertyId);
    }
    if (PROPERTY_CONFIG.OBLIGATION_CATEGORIES.indexOf(input.category) === -1) {
      throw propertyError_('INVALID_CATEGORY', 'Unknown category: ' + input.category);
    }
    if (PROPERTY_CONFIG.FREQUENCY_TYPES.indexOf(input.frequencyType) === -1) {
      throw propertyError_('INVALID_FREQUENCY', 'Unknown frequency type: ' + input.frequencyType);
    }
    if (input.frequencyType === 'Custom' && !(Number(input.customIntervalDays) > 0)) {
      throw propertyError_('INVALID_FREQUENCY', 'Custom frequency requires a positive customIntervalDays.');
    }
    if (!(Number(input.amount) > 0)) {
      throw propertyError_('INVALID_INPUT', 'Amount must be greater than 0.');
    }
    if (!input.dueAnchor) {
      throw propertyError_('INVALID_INPUT', 'dueAnchor (yyyy-MM-dd) is required.');
    }

    var now = toIsoDateTime_(new Date());
    var rule = {
      ObligationID: generateObligationId_(),
      PropertyID: input.propertyId,
      LoanID: input.loanId || '',
      LeaseID: input.leaseId || '',
      Category: input.category,
      Payee: input.payee || '',
      Amount: Number(input.amount),
      Currency: input.currency || PROPERTY_CONFIG.DEFAULT_CURRENCY,
      FrequencyType: input.frequencyType,
      CustomIntervalDays: input.customIntervalDays || '',
      DueAnchor: input.dueAnchor,
      ReminderOffsets: JSON.stringify(input.reminderOffsets || PROPERTY_CONFIG.DEFAULT_REMINDER_OFFSETS),
      AutoGenerate: input.autoGenerate !== false,
      GraceDays: input.graceDays != null ? input.graceDays : PROPERTY_CONFIG.DEFAULT_GRACE_DAYS,
      EndDate: input.endDate || '',
      Status: 'Active',
      CreatedAt: now,
      UpdatedAt: now
    };
    ruleSheet_().appendRow(objectToRowArray_(rule, PROPERTY_SCHEMA.ObligationRule.columns));

    var firstOccurrence = createOccurrence_(rule, input.dueAnchor);
    // ^ Rule + first Occurrence committed (both Truth writes). Per UEF
    // v1.6 §2/D9, the event publishes below are not guaranteed atomic
    // with either — a failure here is logged loudly and specifically,
    // then re-thrown. (The Rule-then-Occurrence boundary itself is a
    // narrower, separate partial-failure edge — not wrapped here; see
    // 00_Project_State.js TECH DEBT for the note rather than expanding
    // this fix indefinitely in one pass.)
    try {
      publishPropertyEvent_(
        PROPERTY_EVENTS.OBLIGATION_CREATED,
        rule.PropertyID,
        rule.ObligationID,
        { obligationId: rule.ObligationID, propertyId: rule.PropertyID, category: rule.Category, rule: rule }
      );
      publishPropertyEvent_(
        PROPERTY_EVENTS.REMINDER_REQUESTED,
        rule.PropertyID,
        rule.ObligationID,
        buildReminderRequest_(rule, firstOccurrence)
      );
    } catch (postWriteError) {
      logPartialFailure_(
        'createObligation',
        'ObligationRule ' + rule.ObligationID + ' and its first Occurrence ' +
        firstOccurrence.OccurrenceID + ' already created — event publish step(s) did not all complete',
        postWriteError
      );
      throw postWriteError;
    }

    var result = {
      success: true,
      obligationId: rule.ObligationID,
      occurrenceId: firstOccurrence.OccurrenceID,
      rule: rule
    };
    if (input.clientRequestId) cacheCommandResult_(input.clientRequestId, result);
    return result;
  });
}

/**
 * @param {Object} input {obligationId, changedFields, clientRequestId?}
 * Status changes are NOT allowed via changedFields — use Cancel/Pause/
 * Resume so the transition rules stay enforced in exactly one place.
 */
function updateObligation(input) {
  return withObligationLock_(function () {
    if (!input || !input.obligationId) {
      throw propertyError_('INVALID_INPUT', 'updateObligation requires obligationId.');
    }
    if (input.clientRequestId) {
      var cached = getCachedCommandResult_(input.clientRequestId);
      if (cached) return cached;
    }
    assertIdPrefix_(input.obligationId, PROPERTY_CONFIG.ID_PREFIXES.OBLIGATION);

    var row = findObligationRuleRowIndex_(input.obligationId);
    if (row === -1) {
      throw propertyError_('OBLIGATION_NOT_FOUND', 'No ObligationRule found for ' + input.obligationId);
    }
    var rule = readRowAsObject_(ruleSheet_(), row, PROPERTY_SCHEMA.ObligationRule.columns);
    if (rule.Status === 'Cancelled' || rule.Status === 'Completed') {
      throw propertyError_(
        'OBLIGATION_IMMUTABLE',
        'ObligationRule ' + rule.ObligationID + ' is ' + rule.Status + ' and cannot be updated.'
      );
    }

    var changedFields = input.changedFields || {};
    ['ObligationID', 'Status', 'CreatedAt'].forEach(function (f) {
      if (f in changedFields) {
        throw propertyError_(
          'INVALID_INPUT',
          'updateObligation cannot change "' + f + '" — use the dedicated command for status changes.'
        );
      }
    });
    if ('Category' in changedFields &&
        PROPERTY_CONFIG.OBLIGATION_CATEGORIES.indexOf(changedFields.Category) === -1) {
      throw propertyError_('INVALID_CATEGORY', 'Unknown category: ' + changedFields.Category);
    }

    changedFields.UpdatedAt = toIsoDateTime_(new Date());
    var updated = updateRowFields_(ruleSheet_(), row, PROPERTY_SCHEMA.ObligationRule.columns, changedFields);

    var event = publishPropertyEvent_(
      PROPERTY_EVENTS.OBLIGATION_UPDATED,
      rule.PropertyID,
      rule.ObligationID,
      { obligationId: rule.ObligationID, changedFields: changedFields }
    );

    var result = { success: true, obligationId: rule.ObligationID, rule: updated, event: event };
    if (input.clientRequestId) cacheCommandResult_(input.clientRequestId, result);
    return result;
  });
}

/**
 * @param {Object} input {occurrenceId, paidDate?, paidAmount?, paidVia?,
 *   evidence?, note?}
 * Idempotent on OccurrenceID: calling this again on an already-Paid
 * Occurrence returns the existing result rather than erroring.
 */
function recordPayment(input) {
  return withObligationLock_(function () {
    if (!input || !input.occurrenceId) {
      throw propertyError_('INVALID_INPUT', 'recordPayment requires occurrenceId.');
    }
    assertIdPrefix_(input.occurrenceId, PROPERTY_CONFIG.ID_PREFIXES.OCCURRENCE);

    var row = findOccurrenceRowIndex_(input.occurrenceId);
    if (row === -1) {
      throw propertyError_('OCCURRENCE_NOT_FOUND', 'No Occurrence found for ' + input.occurrenceId);
    }
    var occurrence = readRowAsObject_(occurrenceSheet_(), row, PROPERTY_SCHEMA.ObligationOccurrence.columns);
    occurrence.EffectiveDue = coerceToIsoDateString_(occurrence.EffectiveDue);

    if (occurrence.Status === 'Paid') {
      return {
        success: true,
        alreadyPaid: true,
        occurrenceId: occurrence.OccurrenceID,
        obligationId: occurrence.ObligationID,
        paidDate: occurrence.PaidDate,
        paidAmount: occurrence.PaidAmount
      };
    }

    var rule = getObligationRuleById_(occurrence.ObligationID);
    if (!rule) {
      throw propertyError_('OBLIGATION_NOT_FOUND', 'Parent ObligationRule not found for ' + occurrence.ObligationID);
    }
    if (rule.Status === 'Cancelled') {
      throw propertyError_(
        'OBLIGATION_CANCELLED',
        'Cannot record payment: ObligationRule ' + rule.ObligationID + ' is Cancelled.'
      );
    }
    // occurrence.Status is 'Active' here — Overdue is derived, never
    // stored (§1), so an overdue Occurrence is still Status='Active'
    // and this transition is valid the same as an on-time payment.
    assertOccurrenceTransition_(occurrence.Status, 'Paid');

    var paidDate = input.paidDate || toIsoDate_(new Date());
    var paidAmount = input.paidAmount != null ? Number(input.paidAmount) : Number(occurrence.Amount);
    var paidVia = input.paidVia || 'Manual';
    if (PROPERTY_CONFIG.PAID_VIA_OPTIONS.indexOf(paidVia) === -1) {
      throw propertyError_('INVALID_INPUT', 'Unknown paidVia: ' + paidVia);
    }

    updateOccurrenceFields_(row, {
      Status: 'Paid',
      PaidDate: paidDate,
      PaidAmount: paidAmount,
      PaidVia: paidVia,
      Evidence: input.evidence || '',
      // Clear any leftover reversal markers from a prior cycle on this
      // same Occurrence — see reversePayment()'s ALREADY_REVERSED note.
      ReversedAt: '',
      ReversalReason: '',
      UpdatedAt: toIsoDateTime_(new Date())
    });
    // ^ Truth write committed. Per UEF v1.6 §2 Platform Constraints
    // (D9): Sheets has no multi-statement transactions, so everything
    // below is NOT guaranteed atomic with the write above. Rather than
    // pretend otherwise, a failure past this point is logged loudly
    // and specifically (naming exactly what may now be orphaned), then
    // re-thrown — the caller still sees the error either way.
    var paymentEvent, nextOccurrence;
    try {
      appendObligationHistory_(occurrence.OccurrenceID, 'Active', 'Paid', 'RecordPayment', input.note || '');

      paymentEvent = publishPropertyEvent_(
        PROPERTY_EVENTS.PAYMENT_COMPLETED,
        rule.PropertyID,
        rule.ObligationID,
        {
          obligationId: rule.ObligationID,
          occurrenceId: occurrence.OccurrenceID,
          category: rule.Category, // Event Completeness Principle, ADR-P13 — already in scope, no extra lookup needed
          effectiveDue: occurrence.EffectiveDue,
          amount: paidAmount,
          paidDate: paidDate,
          paidVia: paidVia
        }
      );

      // 914_FinanceEngine doesn't exist yet — see file header. Not called
      // here, on purpose. 913 IS called here, on purpose (see file header).
      nextOccurrence = scheduleNextOccurrence_(rule, occurrence);
    } catch (postWriteError) {
      logPartialFailure_(
        'recordPayment',
        'Occurrence ' + occurrence.OccurrenceID + ' already set to Paid ' +
        '(PaidAmount=' + paidAmount + ', PaidDate=' + paidDate + ') — ' +
        'History/Event/next-cycle steps did not all complete',
        postWriteError
      );
      throw postWriteError;
    }

    return {
      success: true,
      alreadyPaid: false,
      occurrenceId: occurrence.OccurrenceID,
      obligationId: rule.ObligationID,
      paidDate: paidDate,
      paidAmount: paidAmount,
      event: paymentEvent,
      nextOccurrenceId: nextOccurrence ? nextOccurrence.OccurrenceID : null
    };
  });
}

/** @param {Object} input {obligationId, reason?} */
function cancelObligation(input) {
  return withObligationLock_(function () {
    if (!input || !input.obligationId) {
      throw propertyError_('INVALID_INPUT', 'cancelObligation requires obligationId.');
    }
    var rule = getObligationRuleById_(input.obligationId);
    if (!rule) {
      throw propertyError_('OBLIGATION_NOT_FOUND', 'No ObligationRule found for ' + input.obligationId);
    }
    if (rule.Status === 'Cancelled') {
      throw propertyError_('ALREADY_CANCELLED', 'ObligationRule ' + rule.ObligationID + ' is already Cancelled.');
    }
    assertRuleTransition_(rule.Status, 'Cancelled');

    updateObligationRuleFields_(rule.ObligationID, { Status: 'Cancelled', UpdatedAt: toIsoDateTime_(new Date()) });

    // Deliberately does not touch any open (Active) Occurrence — see
    // Vertical Slice §5: cancelling stops FUTURE cycles, it doesn't
    // discard a payment someone might still intend to make on an
    // already-generated one. Paid/History rows are untouched regardless
    // (P10/ADR-P06 — nothing here could touch them even if it tried).

    var event = publishPropertyEvent_(
      PROPERTY_EVENTS.OBLIGATION_CANCELLED,
      rule.PropertyID,
      rule.ObligationID,
      { obligationId: rule.ObligationID, reason: input.reason || '' }
    );
    return { success: true, obligationId: rule.ObligationID, event: event };
  });
}

/** @param {Object} input {obligationId, reason?} */
function pauseObligation(input) {
  return withObligationLock_(function () {
    if (!input || !input.obligationId) {
      throw propertyError_('INVALID_INPUT', 'pauseObligation requires obligationId.');
    }
    var rule = getObligationRuleById_(input.obligationId);
    if (!rule) {
      throw propertyError_('OBLIGATION_NOT_FOUND', 'No ObligationRule found for ' + input.obligationId);
    }
    if (rule.Status === 'Cancelled') {
      throw propertyError_('ALREADY_CANCELLED', 'ObligationRule ' + rule.ObligationID + ' is Cancelled, cannot pause.');
    }
    if (rule.Status === 'Suspended') {
      throw propertyError_('ALREADY_PAUSED', 'ObligationRule ' + rule.ObligationID + ' is already Suspended.');
    }
    assertRuleTransition_(rule.Status, 'Suspended');

    updateObligationRuleFields_(rule.ObligationID, { Status: 'Suspended', UpdatedAt: toIsoDateTime_(new Date()) });
    var event = publishPropertyEvent_(
      PROPERTY_EVENTS.OBLIGATION_PAUSED,
      rule.PropertyID,
      rule.ObligationID,
      { obligationId: rule.ObligationID, reason: input.reason || '' }
    );
    return { success: true, obligationId: rule.ObligationID, event: event };
  });
}

/** @param {Object} input {obligationId} */
function resumeObligation(input) {
  return withObligationLock_(function () {
    if (!input || !input.obligationId) {
      throw propertyError_('INVALID_INPUT', 'resumeObligation requires obligationId.');
    }
    var rule = getObligationRuleById_(input.obligationId);
    if (!rule) {
      throw propertyError_('OBLIGATION_NOT_FOUND', 'No ObligationRule found for ' + input.obligationId);
    }
    if (rule.Status !== 'Suspended') {
      throw propertyError_(
        'NOT_PAUSED',
        'ObligationRule ' + rule.ObligationID + ' is not Suspended (current status: ' + rule.Status + ').'
      );
    }
    assertRuleTransition_(rule.Status, 'Active');

    updateObligationRuleFields_(rule.ObligationID, { Status: 'Active', UpdatedAt: toIsoDateTime_(new Date()) });
    var event = publishPropertyEvent_(
      PROPERTY_EVENTS.OBLIGATION_RESUMED,
      rule.PropertyID,
      rule.ObligationID,
      { obligationId: rule.ObligationID }
    );
    return { success: true, obligationId: rule.ObligationID, event: event };
  });
}

/**
 * ADR-P06 Compensating Command. The ONLY way an Occurrence moves back
 * out of Paid. Never modifies or deletes the original PAYMENT_COMPLETED
 * event or the Occurrence's original paid fields' history — those stay
 * in ObligationHistory forever; this only changes current state and
 * appends a new history row plus a new PAYMENT_REVERSED event.
 * @param {Object} input {occurrenceId, reason?}
 */
function reversePayment(input) {
  return withObligationLock_(function () {
    if (!input || !input.occurrenceId) {
      throw propertyError_('INVALID_INPUT', 'reversePayment requires occurrenceId.');
    }
    assertIdPrefix_(input.occurrenceId, PROPERTY_CONFIG.ID_PREFIXES.OCCURRENCE);

    var row = findOccurrenceRowIndex_(input.occurrenceId);
    if (row === -1) {
      throw propertyError_('OCCURRENCE_NOT_FOUND', 'No Occurrence found for ' + input.occurrenceId);
    }
    var occurrence = readRowAsObject_(occurrenceSheet_(), row, PROPERTY_SCHEMA.ObligationOccurrence.columns);

    if (occurrence.Status !== 'Paid') {
      throw propertyError_(
        'OCCURRENCE_NOT_PAID',
        'Cannot reverse: Occurrence ' + occurrence.OccurrenceID + ' is not Paid (current status: ' + occurrence.Status + ').'
      );
    }
    // In practice unreachable given the guard above (ReversedAt is
    // always cleared by recordPayment on repayment, so Status=Paid and
    // ReversedAt-set can't co-occur) — kept anyway as a named, defensive
    // check because the approved Command Contract (Vertical Slice §5)
    // specifies ALREADY_REVERSED as its own error code, not folded into
    // OCCURRENCE_NOT_PAID.
    if (occurrence.ReversedAt) {
      throw propertyError_(
        'ALREADY_REVERSED',
        'Occurrence ' + occurrence.OccurrenceID + ' was already reversed at ' + occurrence.ReversedAt + '.'
      );
    }

    var rule = getObligationRuleById_(occurrence.ObligationID);
    if (!rule) {
      throw propertyError_('OBLIGATION_NOT_FOUND', 'Parent ObligationRule not found for ' + occurrence.ObligationID);
    }

    // No real EventBus/event store exists yet to look up the original
    // PAYMENT_COMPLETED event by ID (ADR-P07) — this composite is the
    // best available reference until one does.
    var originalEventId = occurrence.OccurrenceID + ':' + occurrence.PaidDate;
    var reversedAmount = Number(occurrence.PaidAmount);
    var now = toIsoDateTime_(new Date());

    updateOccurrenceFields_(row, {
      Status: 'Active',
      ReversedAt: now,
      ReversalReason: input.reason || '',
      UpdatedAt: now
    });
    // ^ Truth write committed — same UEF v1.6 §2/D9 caveat as
    // recordPayment: everything below is not guaranteed atomic with it.
    var event;
    try {
      appendObligationHistory_(occurrence.OccurrenceID, 'Paid', 'Active', 'ReversePayment', input.reason || '');

      event = publishPropertyEvent_(
        PROPERTY_EVENTS.PAYMENT_REVERSED,
        rule.PropertyID,
        rule.ObligationID,
        {
          obligationId: rule.ObligationID,
          occurrenceId: occurrence.OccurrenceID,
          category: rule.Category, // Event Completeness Principle, ADR-P13
          originalEventId: originalEventId,
          reversedAmount: reversedAmount,
          reason: input.reason || ''
        }
      );
    } catch (postWriteError) {
      logPartialFailure_(
        'reversePayment',
        'Occurrence ' + occurrence.OccurrenceID + ' already set back to Active ' +
        '(reversedAmount=' + reversedAmount + ') — History/Event steps did not all complete',
        postWriteError
      );
      throw postWriteError;
    }

    return {
      success: true,
      occurrenceId: occurrence.OccurrenceID,
      obligationId: rule.ObligationID,
      reversedAmount: reversedAmount,
      event: event
    };
  });
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Queries (Vertical Slice §8) — read-only, no lock, no Event
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// queryCashflowForecast / queryAnomalies are NOT here — they depend on
// 932/931, which don't exist yet (Phase 4/2). Not stubbed speculatively.

function getObligation(obligationId) {
  var rule = getObligationRuleById_(obligationId);
  if (!rule) throw propertyError_('OBLIGATION_NOT_FOUND', 'No ObligationRule found for ' + obligationId);
  return rule;
}

function getOccurrence(occurrenceId) {
  var occ = getOccurrenceById_(occurrenceId);
  if (!occ) throw propertyError_('OCCURRENCE_NOT_FOUND', 'No Occurrence found for ' + occurrenceId);
  return occ;
}

/** @param {Object} [params] {propertyId?, from?, to?} ISO dates */
function queryUpcomingPayments(params) {
  params = params || {};
  var columns = PROPERTY_SCHEMA.ObligationOccurrence.columns;
  var sheet = occurrenceSheet_();
  var lastRow = sheet.getLastRow();
  var results = [];

  if (lastRow >= 2) {
    var data = sheet.getRange(2, 1, lastRow - 1, columns.length).getValues();
    var fromDate = params.from ? parseIsoDate_(params.from) : new Date(0);
    var toDate = params.to ? parseIsoDate_(params.to) : new Date(8640000000000000);

    data.forEach(function (rowValues) {
      var obj = {};
      columns.forEach(function (col, i) { obj[col] = rowValues[i]; });
      if (obj.Status !== 'Active') return;
      var due = parseIsoDate_(coerceToIsoDateString_(obj.EffectiveDue));
      if (due.getTime() < fromDate.getTime() || due.getTime() > toDate.getTime()) return;
      if (params.propertyId) {
        var rule = getObligationRuleById_(obj.ObligationID);
        if (!rule || rule.PropertyID !== params.propertyId) return;
      }
      obj.EffectiveDue = coerceToIsoDateString_(obj.EffectiveDue);
      results.push(obj);
    });

    results.sort(function (a, b) {
      return parseIsoDate_(a.EffectiveDue).getTime() - parseIsoDate_(b.EffectiveDue).getTime();
    });
  }

  return { dataAsOf: toIsoDateTime_(new Date()), kind: 'authoritative', results: results };
}

/** @param {Object} [params] {propertyId?} — Overdue is Derived State (§1). */
function queryOverdue(params) {
  params = params || {};
  var columns = PROPERTY_SCHEMA.ObligationOccurrence.columns;
  var sheet = occurrenceSheet_();
  var lastRow = sheet.getLastRow();
  var results = [];

  if (lastRow >= 2) {
    var data = sheet.getRange(2, 1, lastRow - 1, columns.length).getValues();
    data.forEach(function (rowValues) {
      var obj = {};
      columns.forEach(function (col, i) { obj[col] = rowValues[i]; });
      if (obj.Status !== 'Active') return;
      var rule = getObligationRuleById_(obj.ObligationID);
      if (!rule) return;
      if (params.propertyId && rule.PropertyID !== params.propertyId) return;
      obj.EffectiveDue = coerceToIsoDateString_(obj.EffectiveDue);
      if (isOccurrenceOverdue_(obj, rule)) results.push(obj);
    });
  }

  return { dataAsOf: toIsoDateTime_(new Date()), kind: 'authoritative', results: results };
}

/**
 * @param {Object} [params] {propertyId?, limit?, from?, to?} — limit
 *   defaults to 20 (acts as a generous safety cap when from/to are
 *   given, or as the primary "how many" constraint when they're not).
 *   Added 2026-07-29 for the Operator Console's Dashboard "recent
 *   payments" view — queryUpcomingPayments/queryOverdue both
 *   deliberately exclude Paid occurrences (each function's own scope),
 *   so nothing existing could answer "what did I just pay." from/to
 *   added the same day for 922_DashboardAdapter.js's monthly-total
 *   use, which needs "everything paid in this date range," not just
 *   "the most recent N."
 */
function queryRecentPayments(params) {
  params = params || {};
  var limit = params.limit || (params.from || params.to ? 10000 : 20);
  var fromDate = params.from ? parseIsoDate_(params.from) : null;
  var toDate = params.to ? parseIsoDate_(params.to) : null;
  var columns = PROPERTY_SCHEMA.ObligationOccurrence.columns;
  var sheet = occurrenceSheet_();
  var lastRow = sheet.getLastRow();
  var results = [];

  if (lastRow >= 2) {
    var data = sheet.getRange(2, 1, lastRow - 1, columns.length).getValues();
    data.forEach(function (rowValues) {
      var obj = {};
      columns.forEach(function (col, i) { obj[col] = rowValues[i]; });
      if (obj.Status !== 'Paid') return;
      if (params.propertyId) {
        var rule = getObligationRuleById_(obj.ObligationID);
        if (!rule || rule.PropertyID !== params.propertyId) return;
      }
      obj.EffectiveDue = coerceToIsoDateString_(obj.EffectiveDue);
      obj.PaidDate = coerceToIsoDateString_(obj.PaidDate);
      var paidDateObj = parseIsoDate_(obj.PaidDate);
      if (fromDate && paidDateObj.getTime() < fromDate.getTime()) return;
      if (toDate && paidDateObj.getTime() > toDate.getTime()) return;
      results.push(obj);
    });

    results.sort(function (a, b) {
      return parseIsoDate_(b.PaidDate).getTime() - parseIsoDate_(a.PaidDate).getTime();
    });
    results = results.slice(0, limit);
  }

  return { dataAsOf: toIsoDateTime_(new Date()), kind: 'authoritative', results: results };
}
