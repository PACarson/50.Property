/**
 * ═══════════════════════════════════════════════════════════════════════
 * PROPERTY OS — 902_PropertyIdentity.js
 * Foundation Layer — Identity
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Session 1, Part A (Foundation) — file 3 of 4.
 *
 * ID format: <PREFIX>-<timestamp36>-<random4>
 *   timestamp36 = Date.now() in base36 (sortable, compact)
 *   random4     = 4 random base36 chars (collision guard within same ms)
 *
 * [NEEDS CONFIRMATION — Constitution §6] This format is Claude's
 * proposal, not yet cross-checked against Reminder OS / Inventory OS's
 * actual existing ID scheme. If those use a different format, this file
 * is the only place that needs to change — nothing else in Property OS
 * should construct IDs by hand instead of calling these functions.
 *
 * Depends on: 900_PropertyConfig.js, 901_PropertySchema.js (propertyError_)
 * ═══════════════════════════════════════════════════════════════════════
 */

/**
 * @param {string} prefix e.g. PROPERTY_CONFIG.ID_PREFIXES.OBLIGATION
 * @return {string}
 */
function generateId_(prefix) {
  var ts36 = Date.now().toString(36);
  var rand4 = Math.floor(Math.random() * Math.pow(36, 4))
    .toString(36)
    .padStart(4, '0');
  return prefix + '-' + ts36 + '-' + rand4;
}

function generateObligationId_() {
  return generateId_(PROPERTY_CONFIG.ID_PREFIXES.OBLIGATION);
}

function generateOccurrenceId_() {
  return generateId_(PROPERTY_CONFIG.ID_PREFIXES.OCCURRENCE);
}

function generateHistoryId_() {
  return generateId_(PROPERTY_CONFIG.ID_PREFIXES.HISTORY);
}

/**
 * Validates that an ID matches an expected prefix. Throws if not — used
 * at Command entry points to fail fast on caller mistakes (e.g. passing
 * an OccurrenceID where an ObligationID is expected).
 *
 * @param {string} id
 * @param {string} expectedPrefix
 */
function assertIdPrefix_(id, expectedPrefix) {
  if (typeof id !== 'string' || id.indexOf(expectedPrefix + '-') !== 0) {
    throw propertyError_(
      'INVALID_ID_FORMAT',
      'Invalid ID: expected prefix "' + expectedPrefix + '-", got "' + id + '"'
    );
  }
}
