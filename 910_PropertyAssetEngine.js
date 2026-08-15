/**
 * ═══════════════════════════════════════════════════════════════════════
 * PROPERTY OS — 910_PropertyAssetEngine.js
 * Runtime — Property Asset Engine
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Governs: PropertyAssetEngine_VerticalSlice.md (APPROVED 2026-07-29),
 * Constitution P1-P12, ADR-P01~P07/P10, UEF v1.6.
 *
 * Single Aggregate Root (Property), no internal sub-entity — simpler
 * than 912's Rule+Occurrence split by design (Vertical Slice §3).
 *
 * Same conventions as 912_ObligationEngine.js throughout: single
 * top-level lock per Command, ClientRequestID idempotency via
 * CacheService where creation could double-submit, State Machine guards
 * before any write, logPartialFailure_-style loud labeling for
 * post-Truth-write steps (UEF v1.6 §2/D9 — Sheets has no multi-statement
 * transactions, stated once there, applied here rather than re-derived).
 * ═══════════════════════════════════════════════════════════════════════
 */


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Lock (Constitution §5: single top-level lock, not nested)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Same underlying LockService.getScriptLock() as withObligationLock_ in
// 912 — GAS's script lock is script-scoped, not sheet-scoped, so this
// isn't providing extra parallelism protection beyond what already
// exists; it's a separately-named wrapper per Engine for readability,
// not a second independent lock.

function withPropertyLock_(fn) {
  var lock = LockService.getScriptLock();
  var acquired = lock.tryLock(30000);
  if (!acquired) {
    throw propertyError_(
      'LOCK_TIMEOUT',
      'Could not acquire PropertyAssetEngine lock within 30s — another operation is in progress.'
    );
  }
  try {
    return fn();
  } finally {
    // Added 2026-07-29 — real bug CC found: after createProperty(), a
    // SEPARATE execution's listActiveProperties() sometimes didn't see
    // the new row yet (Operator Console's property list/dropdown not
    // refreshing after Save). Cross-execution reads in GAS aren't
    // guaranteed to see a just-written row without an explicit flush —
    // within a single execution it's usually fine, but the Operator
    // Console's create-then-reload is deliberately two separate
    // executions (google.script.run calls). flush() forces every
    // pending Sheets write from fn() to actually commit before this
    // lock releases, so anything that runs after (any execution,
    // waiting on the same lock or not) sees a consistent state. Runs
    // on the throw path too, on purpose — a partial-failure write
    // (logPropertyPartialFailure_) should be immediately visible for
    // manual reconciliation, not left in limbo.
    SpreadsheetApp.flush();
    lock.releaseLock();
  }
}

/** Same UEF v1.6 §2/D9 pattern as 912's logPartialFailure_ — see there for full rationale. */
function logPropertyPartialFailure_(commandName, truthDescription, originalError) {
  Logger.log(
    '⚠ PARTIAL FAILURE in ' + commandName + ' — the following ' +
    'Truth Layer write ALREADY SUCCEEDED before a later step failed ' +
    '(UEF v1.6 §2 Platform Constraints, D9 — Sheets has no multi-' +
    'statement transactions): ' + truthDescription + '. Manual ' +
    'reconciliation may be needed. Underlying error: ' + originalError.message
  );
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Idempotency (CreateProperty only — same reasoning as 912's comment:
// Update/MarkSold/ReverseSale are idempotent on their own domain key)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getCachedPropertyCommandResult_(clientRequestId) {
  var cached = CacheService.getScriptCache().get('propertyos_idem_prop_' + clientRequestId);
  return cached ? JSON.parse(cached) : null;
}

function cachePropertyCommandResult_(clientRequestId, result) {
  CacheService.getScriptCache().put(
    'propertyos_idem_prop_' + clientRequestId,
    JSON.stringify(result),
    IDEMPOTENCY_CACHE_TTL_SECONDS // shared constant, defined in 912
  );
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// State Machine guard (Vertical Slice §6)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Sold -> Active exists ONLY via reversePropertySale() — mirrors 912's
// OCCURRENCE_TRANSITIONS_ comment: this map must never silently grow to
// make the reversal path implicit or automatic elsewhere.
var PROPERTY_TRANSITIONS_ = {
  'Active': ['Sold']
};

function assertPropertyTransition_(fromStatus, toStatus) {
  var allowed = PROPERTY_TRANSITIONS_[fromStatus] || [];
  if (allowed.indexOf(toStatus) === -1) {
    throw propertyError_(
      'FORBIDDEN_TRANSITION',
      'Property cannot transition from ' + fromStatus + ' to ' + toStatus
    );
  }
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Placeholder cross-Engine check (same ADR-P07 pattern as 912's
// propertyExists_ was before this file existed)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 915_MortgageEngine (Loan) doesn't exist yet (Phase 2), so there is no
 * real Loans table to check LoanID against. Permissive placeholder,
 * isolated the same way propertyExists_ was — when 915 exists, this is
 * the only place that needs to change.
 * @param {string} loanId
 * @return {boolean}
 */
function loanExists_(loanId) {
  return true; // placeholder — see comment above
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Address — derived formatting only (Review Approval 2026-07-29:
// formattedAddress is a Derived Field, never a stored column)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * @param {Object} property a row object with the six Address* columns
 * @return {string} human-readable single-line address, computed fresh
 *   every call — never stored, never a Truth Source (§2).
 */
function formatAddress_(property) {
  var parts = [
    property.AddressLine1,
    property.AddressLine2,
    property.AddressCity,
    property.AddressState,
    property.AddressPostcode,
    property.AddressCountry
  ].filter(function (p) { return p && String(p).trim() !== ''; });
  return parts.join(', ');
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Row access helpers (Property-specific; generic I/O lives in 901)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function propertySheet_() {
  return ensureSheetSchema_(
    PROPERTY_SCHEMA.Property.sheetName,
    PROPERTY_SCHEMA.Property.columns,
    PROPERTY_SCHEMA.Property.dateColumns
  );
}

/**
 * @param {string} propertyId
 * @return {Object|null} row object, or null if not found
 */
function getProperty(propertyId) {
  var sheet = propertySheet_();
  var rowIndex = findRowIndexByFirstColumn_(sheet, propertyId);
  if (rowIndex === -1) return null;
  return readRowAsObject_(sheet, rowIndex, PROPERTY_SCHEMA.Property.columns);
}

/**
 * @return {Object[]} all Active Properties (Sold ones excluded — not
 *   useful in a "which property is this bill for" dropdown). Added
 *   2026-07-29 for the Operator Console's selector dropdowns.
 */
function listActiveProperties() {
  var sheet = propertySheet_();
  var columns = PROPERTY_SCHEMA.Property.columns;
  var lastRow = sheet.getLastRow();
  var results = [];
  if (lastRow >= 2) {
    var data = sheet.getRange(2, 1, lastRow - 1, columns.length).getValues();
    data.forEach(function (rowValues) {
      var obj = {};
      columns.forEach(function (col, i) { obj[col] = rowValues[i]; });
      if (obj.Status === 'Active') results.push(obj);
    });
  }
  results.sort(function (a, b) { return String(a.PropertyName).localeCompare(String(b.PropertyName)); });
  return results;
}

/** Real implementation for 912's propertyExists_ placeholder — see there. */
function propertyExists_(propertyId) {
  return getProperty(propertyId) !== null;
}

function updatePropertyFields_(propertyId, fieldUpdates) {
  var sheet = propertySheet_();
  var rowIndex = findRowIndexByFirstColumn_(sheet, propertyId);
  if (rowIndex === -1) {
    throw propertyError_('PROPERTY_NOT_FOUND', 'No Property found for ' + propertyId);
  }
  updateRowFields_(sheet, rowIndex, PROPERTY_SCHEMA.Property.columns, fieldUpdates);
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Commands (Vertical Slice §5)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * @param {Object} input {propertyName, developer?, addressLine1,
 *   addressLine2?, addressCity, addressState, addressPostcode,
 *   addressCountry, gps?, purchaseDate, purchasePrice, currentValue?,
 *   loanId?, builtUp?, landSize?, freeholdLeasehold, parking?,
 *   storeRoom?, completionDate?, vpDate?, defectExpiry?, owner?,
 *   propertyType, clientRequestId?}
 */
function createProperty(input) {
  return withPropertyLock_(function () {
    if (!input || typeof input !== 'object') {
      throw propertyError_('INVALID_INPUT', 'createProperty requires an input object.');
    }
    if (input.clientRequestId) {
      var cached = getCachedPropertyCommandResult_(input.clientRequestId);
      if (cached) return cached;
    }

    if (!input.propertyName || String(input.propertyName).trim() === '') {
      throw propertyError_('INVALID_INPUT', 'propertyName is required.');
    }
    if (!input.addressLine1 || String(input.addressLine1).trim() === '') {
      throw propertyError_('INVALID_INPUT', 'addressLine1 is required.');
    }
    if (!(Number(input.purchasePrice) > 0)) {
      throw propertyError_('INVALID_INPUT', 'purchasePrice must be a positive number.');
    }
    if (PROPERTY_CONFIG.FREEHOLD_LEASEHOLD_OPTIONS.indexOf(input.freeholdLeasehold) === -1) {
      throw propertyError_('INVALID_INPUT', 'Unknown freeholdLeasehold: ' + input.freeholdLeasehold);
    }
    if (PROPERTY_CONFIG.PROPERTY_TYPES.indexOf(input.propertyType) === -1) {
      throw propertyError_('INVALID_PROPERTY_TYPE', 'Unknown propertyType: ' + input.propertyType);
    }
    if (input.loanId && !loanExists_(input.loanId)) {
      throw propertyError_('LOAN_NOT_FOUND', 'No Loan found for ' + input.loanId);
    }

    var now = toIsoDateTime_(new Date());
    var property = {
      PropertyID: generatePropertyId_(),
      PropertyName: input.propertyName,
      Developer: input.developer || '',
      AddressLine1: input.addressLine1,
      AddressLine2: input.addressLine2 || '',
      AddressCity: input.addressCity || '',
      AddressState: input.addressState || '',
      AddressPostcode: input.addressPostcode || '',
      AddressCountry: input.addressCountry || '',
      GPS: input.gps || '',
      PurchaseDate: coerceToIsoDateString_(input.purchaseDate),
      PurchasePrice: Number(input.purchasePrice),
      // Defaults to PurchasePrice if omitted (Vertical Slice §1) — never
      // null, never a guess this Engine invents beyond that one rule.
      CurrentValue: input.currentValue != null ? Number(input.currentValue) : Number(input.purchasePrice),
      LoanID: input.loanId || '',
      BuiltUp: input.builtUp != null ? Number(input.builtUp) : '',
      LandSize: input.landSize != null ? Number(input.landSize) : '',
      FreeholdLeasehold: input.freeholdLeasehold,
      Parking: input.parking != null ? Number(input.parking) : '',
      StoreRoom: !!input.storeRoom,
      CompletionDate: input.completionDate ? coerceToIsoDateString_(input.completionDate) : '',
      VPDate: input.vpDate ? coerceToIsoDateString_(input.vpDate) : '',
      DefectExpiry: input.defectExpiry ? coerceToIsoDateString_(input.defectExpiry) : '',
      Status: 'Active',
      SoldDate: '',
      SoldPrice: '',
      Owner: input.owner || '',
      PropertyType: input.propertyType,
      CreatedAt: now,
      UpdatedAt: now,
      // ADR-P17 (Phase 1, 2026-08-16) — both optional, both blank by
      // default; no PropertyType is required to fill these in.
      DevelopmentName: input.developmentName || '',
      UnitLabel: input.unitLabel || ''
    };

    propertySheet_().appendRow(objectToRowArray_(property, PROPERTY_SCHEMA.Property.columns));
    // ^ Truth write committed. Per UEF v1.6 §2/D9, the event publish
    // below is not guaranteed atomic with it — same pattern as 912.
    try {
      publishPropertyEvent_(
        PROPERTY_EVENTS.PROPERTY_CREATED,
        property.PropertyID,
        null,
        { propertyId: property.PropertyID, propertyName: property.PropertyName, status: property.Status }
      );
    } catch (postWriteError) {
      logPropertyPartialFailure_(
        'createProperty',
        'Property ' + property.PropertyID + ' already created — event publish did not complete',
        postWriteError
      );
      throw postWriteError;
    }

    var result = { success: true, propertyId: property.PropertyID, property: property };
    if (input.clientRequestId) cachePropertyCommandResult_(input.clientRequestId, result);
    return result;
  });
}

/**
 * @param {Object} input {propertyId, changedFields}
 */
function updateProperty(input) {
  return withPropertyLock_(function () {
    if (!input || !input.propertyId) {
      throw propertyError_('INVALID_INPUT', 'updateProperty requires propertyId.');
    }
    var property = getProperty(input.propertyId);
    if (!property) {
      throw propertyError_('PROPERTY_NOT_FOUND', 'No Property found for ' + input.propertyId);
    }
    if (property.Status !== 'Active') {
      throw propertyError_('PROPERTY_IMMUTABLE', 'Property ' + input.propertyId + ' is ' + property.Status + ' and cannot be updated.');
    }
    var changedFields = input.changedFields || {};
    // deniedFields is a denylist, not an allowlist — DevelopmentName and
    // UnitLabel (ADR-P17, Phase 1, 2026-08-16) are therefore already
    // updatable through this Command with no code change needed here.
    // Verified, not assumed — see Phase0 Audit / 997 tests.
    var deniedFields = ['PropertyID', 'Status', 'CreatedAt', 'SoldDate', 'SoldPrice'];
    for (var i = 0; i < deniedFields.length; i++) {
      if (Object.prototype.hasOwnProperty.call(changedFields, deniedFields[i])) {
        throw propertyError_('INVALID_INPUT', deniedFields[i] + ' cannot be changed via updateProperty.');
      }
    }
    if (changedFields.PropertyType && PROPERTY_CONFIG.PROPERTY_TYPES.indexOf(changedFields.PropertyType) === -1) {
      throw propertyError_('INVALID_PROPERTY_TYPE', 'Unknown propertyType: ' + changedFields.PropertyType);
    }

    var fieldUpdates = {};
    for (var key in changedFields) fieldUpdates[key] = changedFields[key];
    fieldUpdates.UpdatedAt = toIsoDateTime_(new Date());

    updatePropertyFields_(input.propertyId, fieldUpdates);
    var event;
    try {
      event = publishPropertyEvent_(
        PROPERTY_EVENTS.PROPERTY_UPDATED,
        input.propertyId,
        null,
        { propertyId: input.propertyId, changedFields: changedFields }
      );
    } catch (postWriteError) {
      logPropertyPartialFailure_(
        'updateProperty',
        'Property ' + input.propertyId + ' fields already updated (' + Object.keys(changedFields).join(', ') + ') — event publish did not complete',
        postWriteError
      );
      throw postWriteError;
    }

    return { success: true, propertyId: input.propertyId, event: event };
  });
}

/**
 * @param {Object} input {propertyId, soldDate, soldPrice}
 */
function markPropertySold(input) {
  return withPropertyLock_(function () {
    if (!input || !input.propertyId) {
      throw propertyError_('INVALID_INPUT', 'markPropertySold requires propertyId.');
    }
    var property = getProperty(input.propertyId);
    if (!property) {
      throw propertyError_('PROPERTY_NOT_FOUND', 'No Property found for ' + input.propertyId);
    }
    if (property.Status === 'Sold') {
      throw propertyError_('ALREADY_SOLD', 'Property ' + input.propertyId + ' is already Sold.');
    }
    assertPropertyTransition_(property.Status, 'Sold');
    if (!(Number(input.soldPrice) > 0)) {
      throw propertyError_('INVALID_INPUT', 'soldPrice must be a positive number.');
    }

    var soldDate = coerceToIsoDateString_(input.soldDate || new Date());
    updatePropertyFields_(input.propertyId, {
      Status: 'Sold',
      SoldDate: soldDate,
      SoldPrice: Number(input.soldPrice),
      UpdatedAt: toIsoDateTime_(new Date())
    });
    var event;
    try {
      event = publishPropertyEvent_(
        PROPERTY_EVENTS.PROPERTY_SOLD,
        input.propertyId,
        null,
        { propertyId: input.propertyId, soldDate: soldDate, soldPrice: Number(input.soldPrice) }
      );
    } catch (postWriteError) {
      logPropertyPartialFailure_(
        'markPropertySold',
        'Property ' + input.propertyId + ' already set to Sold (soldPrice=' + input.soldPrice + ') — event publish did not complete',
        postWriteError
      );
      throw postWriteError;
    }

    return { success: true, propertyId: input.propertyId, soldDate: soldDate, event: event };
  });
}

/**
 * ADR-P06/P10 compensating Command — mirrors 912's reversePayment().
 * @param {Object} input {propertyId, reason?}
 */
function reversePropertySale(input) {
  return withPropertyLock_(function () {
    if (!input || !input.propertyId) {
      throw propertyError_('INVALID_INPUT', 'reversePropertySale requires propertyId.');
    }
    var property = getProperty(input.propertyId);
    if (!property) {
      throw propertyError_('PROPERTY_NOT_FOUND', 'No Property found for ' + input.propertyId);
    }
    if (property.Status !== 'Sold') {
      throw propertyError_('PROPERTY_NOT_SOLD', 'Property ' + input.propertyId + ' is not Sold.');
    }
    // No assertPropertyTransition_ call here, on purpose — PROPERTY_
    // TRANSITIONS_ deliberately has no 'Sold' key (same reasoning as
    // 912's OCCURRENCE_TRANSITIONS_ omitting 'Paid': the ONLY function
    // allowed to move a Property out of Sold is this one, via its own
    // narrow, explicit check above, not the generic map). Caught by
    // 996_Tests_PropertyAssetEngine.js on first run — the generic guard
    // correctly has no Sold entry, so calling it here would always
    // throw; the fix is not calling it, not adding the entry.

    var originalEventId = input.propertyId + ':' + property.SoldDate;
    updatePropertyFields_(input.propertyId, {
      Status: 'Active',
      SoldDate: '',
      SoldPrice: '',
      UpdatedAt: toIsoDateTime_(new Date())
    });
    var event;
    try {
      event = publishPropertyEvent_(
        PROPERTY_EVENTS.PROPERTY_SALE_REVERSED,
        input.propertyId,
        null,
        { propertyId: input.propertyId, originalEventId: originalEventId, reason: input.reason || '' }
      );
    } catch (postWriteError) {
      logPropertyPartialFailure_(
        'reversePropertySale',
        'Property ' + input.propertyId + ' already set back to Active — event publish did not complete',
        postWriteError
      );
      throw postWriteError;
    }

    return { success: true, propertyId: input.propertyId, event: event };
  });
}
