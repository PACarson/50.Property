/**
 * ═══════════════════════════════════════════════════════════════════════
 * PROPERTY OS — 903_PropertyEventDefinitions.js
 * Foundation Layer — Event Definitions
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Session 1, Part A (Foundation) — file 4 of 4.
 *
 * Naming: UPPER_SNAKE_CASE, past-tense fact (Constitution §6).
 * Immutability: once published, an event's payload is never edited
 * (Constitution P10 / ADR-P06). Corrections are new events.
 *
 * Only events already finalized in the approved Vertical Slice are
 * listed here. Events for other Engines (Property Asset, Mortgage,
 * Rental, ...) are added when their own Phase begins.
 *
 * publishPropertyEvent_() at the bottom of this file is the
 * Infrastructure Adapter (Port) for the shared EventBus — ADR-P07.
 * This is a deliberate architectural boundary, not a temporary gap:
 * Domain Layer code (912/913/914/915 and every future Engine) must
 * NEVER call the EventBus directly, and must never need to change when
 * the underlying implementation does. Until Personal AI Core's Shared
 * EventBus API is finalized, this function's body correctly stays a
 * logging placeholder — that is the intended state, not unfinished
 * work. When the API stabilizes, only this one function changes.
 *
 * Depends on: 900_PropertyConfig.js, 902_PropertyIdentity.js
 * ═══════════════════════════════════════════════════════════════════════
 */

var PROPERTY_EVENTS = Object.freeze({
  OBLIGATION_CREATED: 'OBLIGATION_CREATED',
  OBLIGATION_UPDATED: 'OBLIGATION_UPDATED',
  OBLIGATION_CANCELLED: 'OBLIGATION_CANCELLED',
  OBLIGATION_PAUSED: 'OBLIGATION_PAUSED',
  OBLIGATION_RESUMED: 'OBLIGATION_RESUMED',
  PAYMENT_COMPLETED: 'PAYMENT_COMPLETED',
  PAYMENT_REVERSED: 'PAYMENT_REVERSED',           // ADR-P06 compensating event
  REMINDER_REQUESTED: 'REMINDER_REQUESTED',
  UTILITY_BILL_RECEIVED: 'UTILITY_BILL_RECEIVED',  // producer (945) not yet built
  // 910_PropertyAssetEngine (PropertyAssetEngine_VerticalSlice.md §4)
  PROPERTY_CREATED: 'PROPERTY_CREATED',
  PROPERTY_UPDATED: 'PROPERTY_UPDATED',
  PROPERTY_SOLD: 'PROPERTY_SOLD',
  PROPERTY_SALE_REVERSED: 'PROPERTY_SALE_REVERSED',  // ADR-P06 compensating event
  // 918_DefectEngine Vertical Slice — Phase 3 (Review Approval
  // 2026-08-15/16). Only the events Phase 3's Commands actually publish
  // are added here now — DAILY_CHECK_LOGGED / EVIDENCE_ATTACHED /
  // CORRESPONDENCE_LOGGED / RECTIFICATION_EVENT_LOGGED /
  // SECONDARY_DAMAGE_LOGGED are added when Phases 4-7 actually need
  // them, not speculatively now (same convention as this file's own
  // header comment above).
  CASE_CREATED: 'CASE_CREATED',
  DEFECT_ITEM_ADDED: 'DEFECT_ITEM_ADDED',
  DEFECT_ITEM_UPDATED: 'DEFECT_ITEM_UPDATED',
  DEVELOPER_STATUS_UPDATED: 'DEVELOPER_STATUS_UPDATED',
  OWNER_VERIFICATION_RECORDED: 'OWNER_VERIFICATION_RECORDED',
  DEFECT_ITEM_CLOSED: 'DEFECT_ITEM_CLOSED',
  DEFECT_ITEM_REOPENED: 'DEFECT_ITEM_REOPENED',       // compensating event, mirrors ADR-P06 spirit
  CASE_CLOSED: 'CASE_CLOSED'
});

// Required payload fields per event type (Vertical Slice §4). Publishing
// with a missing field throws rather than emitting an incomplete event.
var PROPERTY_EVENT_REQUIRED_FIELDS = (function () {
  var m = {};
  m[PROPERTY_EVENTS.OBLIGATION_CREATED] = ['obligationId', 'propertyId', 'category'];
  m[PROPERTY_EVENTS.OBLIGATION_UPDATED] = ['obligationId', 'changedFields'];
  m[PROPERTY_EVENTS.OBLIGATION_CANCELLED] = ['obligationId', 'reason'];
  m[PROPERTY_EVENTS.OBLIGATION_PAUSED] = ['obligationId'];
  m[PROPERTY_EVENTS.OBLIGATION_RESUMED] = ['obligationId'];
  // Event Completeness Principle (Review Decision, 2026-07-29 — see
  // 00_ADR_Log.js ADR-P13): a Domain Event carries the stable business
  // data its known consumers need to do their own work, rather than
  // requiring them to call back into the publisher's Truth Layer. Both
  // payment events below carry `category` for exactly this reason —
  // 914_FinanceEngine needs it to build a Ledger entry, and reaching
  // back into 912 via getObligation() would couple Finance Engine to
  // Obligation Engine's process (breaks the moment they're ever split
  // into separate GAS deployments, matching how other Domain OS
  // projects in this ecosystem already are).
  m[PROPERTY_EVENTS.PAYMENT_COMPLETED] =
    ['obligationId', 'occurrenceId', 'category', 'effectiveDue', 'amount', 'paidDate', 'paidVia'];
  m[PROPERTY_EVENTS.PAYMENT_REVERSED] =
    ['obligationId', 'occurrenceId', 'category', 'originalEventId', 'reversedAmount', 'reason'];
  m[PROPERTY_EVENTS.REMINDER_REQUESTED] =
    ['obligationId', 'occurrenceId', 'effectiveDue', 'offsets'];
  m[PROPERTY_EVENTS.UTILITY_BILL_RECEIVED] =
    ['source', 'rawAmount', 'rawDueDate', 'category'];
  m[PROPERTY_EVENTS.PROPERTY_CREATED] = ['propertyId', 'propertyName', 'status'];
  m[PROPERTY_EVENTS.PROPERTY_UPDATED] = ['propertyId', 'changedFields'];
  m[PROPERTY_EVENTS.PROPERTY_SOLD] = ['propertyId', 'soldDate', 'soldPrice'];
  m[PROPERTY_EVENTS.PROPERTY_SALE_REVERSED] = ['propertyId', 'originalEventId', 'reason'];
  // 918_DefectEngine Vertical Slice — Phase 3.
  m[PROPERTY_EVENTS.CASE_CREATED] = ['caseId', 'propertyId', 'caseType', 'status'];
  m[PROPERTY_EVENTS.DEFECT_ITEM_ADDED] = ['caseId', 'defectId', 'category', 'priority', 'status'];
  m[PROPERTY_EVENTS.DEFECT_ITEM_UPDATED] = ['caseId', 'defectId', 'changedFields'];
  m[PROPERTY_EVENTS.DEVELOPER_STATUS_UPDATED] = ['caseId', 'defectId', 'developerStatus'];
  m[PROPERTY_EVENTS.OWNER_VERIFICATION_RECORDED] = ['caseId', 'defectId', 'ownerVerificationStatus'];
  m[PROPERTY_EVENTS.DEFECT_ITEM_CLOSED] = ['caseId', 'defectId', 'closedDate'];
  m[PROPERTY_EVENTS.DEFECT_ITEM_REOPENED] = ['caseId', 'defectId', 'reason'];
  m[PROPERTY_EVENTS.CASE_CLOSED] = ['caseId', 'closedDate'];
  return Object.freeze(m);
})();

/**
 * Builds and validates the standard event envelope. Pure function — does
 * not publish anything.
 *
 * @param {string} eventType one of PROPERTY_EVENTS
 * @param {string} propertyId
 * @param {string} obligationId
 * @param {Object} payload
 * @return {Object} envelope
 */
function buildPropertyEvent_(eventType, propertyId, obligationId, payload) {
  var required = PROPERTY_EVENT_REQUIRED_FIELDS[eventType];
  if (!required) {
    throw new Error('Unknown Property OS event type: ' + eventType);
  }

  var missing = required.filter(function (field) {
    return !(field in payload) || payload[field] === undefined || payload[field] === null;
  });
  if (missing.length > 0) {
    throw new Error(
      'Cannot publish ' + eventType + ': missing required payload field(s) [' +
      missing.join(', ') + ']. Refusing to publish an incomplete event ' +
      '(Vertical Slice §4 validation rule).'
    );
  }

  return {
    eventId: generateId_(PROPERTY_CONFIG.ID_PREFIXES.EVENT),
    eventType: eventType,
    occurredAt: new Date().toISOString(),
    propertyId: propertyId,
    obligationId: obligationId,
    payload: payload,
    version: 1
  };
}

/**
 * Publishes a Property OS event to the shared EventBus.
 *
 * This is the ADR-P07 Infrastructure Adapter (Port): the only function
 * in Property OS allowed to know about the EventBus's concrete
 * implementation. Every Command in 912/913/914/915 (and every future
 * Engine) must call THIS function to publish — never the real EventBus
 * directly — so this is the only place that ever needs to change,
 * regardless of what the underlying transport/storage is or becomes
 * (Google Sheets / Firestore / SQLite / Cloud Run / Kafka / ...).
 *
 * @param {string} eventType
 * @param {string} propertyId
 * @param {string} obligationId
 * @param {Object} payload
 * @return {Object} the published envelope
 */
function publishPropertyEvent_(eventType, propertyId, obligationId, payload) {
  var envelope = buildPropertyEvent_(eventType, propertyId, obligationId, payload);

  // Deliberate placeholder (ADR-P07): Personal AI Core's Shared EventBus
  // API is not yet finalized. This is the correct state to be in, not a
  // TODO to rush — Domain logic above this line is complete and can be
  // reviewed/tested independently of when the real wiring lands.
  Logger.log('[PropertyOS EventBus Adapter — placeholder] ' + JSON.stringify(envelope));

  return envelope;
}
