/**
 * ═══════════════════════════════════════════════════════════════════════
 * PROPERTY OS — 903_PropertyEventDefinitions.gs
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
 * Depends on: 900_PropertyConfig.gs, 902_PropertyIdentity.gs
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
  UTILITY_BILL_RECEIVED: 'UTILITY_BILL_RECEIVED'  // producer (945) not yet built
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
  m[PROPERTY_EVENTS.PAYMENT_COMPLETED] =
    ['obligationId', 'occurrenceId', 'effectiveDue', 'amount', 'paidDate', 'paidVia'];
  m[PROPERTY_EVENTS.PAYMENT_REVERSED] =
    ['obligationId', 'occurrenceId', 'originalEventId', 'reversedAmount', 'reason'];
  m[PROPERTY_EVENTS.REMINDER_REQUESTED] =
    ['obligationId', 'occurrenceId', 'effectiveDue', 'offsets'];
  m[PROPERTY_EVENTS.UTILITY_BILL_RECEIVED] =
    ['source', 'rawAmount', 'rawDueDate', 'category'];
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
