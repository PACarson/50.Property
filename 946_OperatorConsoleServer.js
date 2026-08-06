/**
 * ═══════════════════════════════════════════════════════════════════════
 * PROPERTY OS — 946_OperatorConsoleServer.js
 * Operator Console — server-side glue (ADR-P14)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Every console_* function below is a THIN wrapper: it calls an
 * existing Command or Query (912/913/910/922), catches whatever it
 * throws, and returns a consistent {success, data|error} shape the
 * client-side JS in 945_OperatorConsole.html can handle uniformly.
 * None of these write a Sheet directly — every write goes through the
 * real Command it wraps, with every validation/lock/state-machine rule
 * that Command already enforces. This file adds zero new business
 * logic; it only exists because google.script.run needs a clean
 * success/failure boundary at the call site.
 *
 * onOpen() is a Simple Trigger (fires only when a human opens this
 * spreadsheet) — not the kind of Trigger ADR-P02 prohibits. See
 * ADR-P14 for the full reasoning.
 * ═══════════════════════════════════════════════════════════════════════
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Property OS')
    .addItem('Open Operator Console', 'showOperatorConsole')
    .addToUi();
}

function showOperatorConsole() {
  var html = HtmlService.createHtmlOutputFromFile('945_OperatorConsole')
    .setTitle('Property OS')
    .setWidth(380);
  SpreadsheetApp.getUi().showSidebar(html);
}

function console_wrap_(fn) {
  try {
    return { success: true, data: fn() };
  } catch (e) {
    return { success: false, error: e.message, code: e.code || '' };
  }
}

// ─── Dashboard ─────────────────────────────────────────────────────

function console_getDashboardSnapshot(propertyId) {
  return console_wrap_(function () { return getDashboardSnapshot(propertyId || null); });
}

// ─── Properties ────────────────────────────────────────────────────

function console_listProperties() {
  return console_wrap_(function () { return listActiveProperties(); });
}

function console_createProperty(input) {
  return console_wrap_(function () { return createProperty(input); });
}

// ─── Obligations ───────────────────────────────────────────────────

function console_createObligation(input) {
  return console_wrap_(function () { return createObligation(input); });
}

// ─── Payments ──────────────────────────────────────────────────────

function console_recordPayment(occurrenceId, paidAmount, paidDate, note) {
  return console_wrap_(function () {
    return recordPayment({
      occurrenceId: occurrenceId,
      paidAmount: Number(paidAmount),
      paidDate: paidDate,
      note: note || ''
    });
  });
}

function console_getPaymentHistory(propertyId, searchText) {
  return console_wrap_(function () {
    var all = queryRecentPayments({ propertyId: propertyId || undefined, limit: 500 }).results;
    var enriched = all.map(enrichOccurrenceForDisplay_);
    if (searchText) {
      var needle = String(searchText).toLowerCase();
      enriched = enriched.filter(function (e) {
        return (e.payee || '').toLowerCase().indexOf(needle) !== -1 ||
          (e.category || '').toLowerCase().indexOf(needle) !== -1 ||
          (e.propertyName || '').toLowerCase().indexOf(needle) !== -1;
      });
    }
    return enriched;
  });
}

// ─── Dropdown data (static config, no wrapping needed — can't throw) ──

function console_getFormOptions() {
  return {
    categories: PROPERTY_CONFIG.OBLIGATION_CATEGORIES,
    frequencyTypes: PROPERTY_CONFIG.FREQUENCY_TYPES,
    propertyTypes: PROPERTY_CONFIG.PROPERTY_TYPES,
    freeholdLeaseholdOptions: PROPERTY_CONFIG.FREEHOLD_LEASEHOLD_OPTIONS
  };
}
