/**
 * ═══════════════════════════════════════════════════════════════════════
 * PROPERTY OS — 922_DashboardAdapter.js
 * Dashboard Adapter (ADR-P14)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Lighter-weight than the earlier-planned "922_DashboardEngine" name
 * implied — this is deliberately just a couple of aggregation/join
 * functions, not a formally Vertical-Sliced Engine. May grow into a
 * fuller Dashboard Engine later; not built out that way now, per
 * ADR-P14's MVP principle.
 *
 * Purpose: sit between the Operator Console (945/946) and wherever
 * dashboard numbers actually come from, so the Console never needs to
 * know or care. `getMonthlyExpenseSummary()` is the concrete instance
 * ADR-P14 called out: today it aggregates ObligationOccurrence directly
 * (Current Source — no 914_FinanceEngine yet); once 914 exists, only
 * this function's internals change to query the Ledger instead (Target
 * Source). The Operator Console's calling code never changes.
 * ═══════════════════════════════════════════════════════════════════════
 */

/**
 * Current Source: ObligationOccurrence (MVP — 914_FinanceEngine's
 * Ledger doesn't exist yet). Target Source: Finance Ledger (914_
 * FinanceEngine.queryLedgerEntries, once built) — swap the body of
 * this function only; every caller (945/946) stays untouched.
 *
 * @param {string} [propertyId] omit for all properties combined
 * @param {string} [yearMonth] 'YYYY-MM', defaults to the current month
 * @return {{yearMonth: string, total: number, byCategory: Object}}
 */
function getMonthlyExpenseSummary(propertyId, yearMonth) {
  var ym = yearMonth || toIsoDate_(new Date()).slice(0, 7);
  var monthStart = ym + '-01';
  var monthEndDate = new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0); // day 0 of next month = last day of this one
  var monthEnd = toIsoDate_(monthEndDate);

  var payments = queryRecentPayments({
    propertyId: propertyId || undefined,
    from: monthStart,
    to: monthEnd
  }).results;

  var total = 0;
  var byCategory = {};
  payments.forEach(function (occ) {
    var rule = getObligationRuleById_(occ.ObligationID);
    var category = rule ? rule.Category : 'Unknown';
    var amount = Number(occ.PaidAmount) || 0;
    total += amount;
    byCategory[category] = (byCategory[category] || 0) + amount;
  });

  return { yearMonth: ym, total: total, byCategory: byCategory };
}

/**
 * One bundled call for the Operator Console's Dashboard view, to avoid
 * five separate google.script.run round-trips on every load. Each
 * Occurrence is enriched with its Rule's Category/Payee/PropertyID and
 * the Property's PropertyName, since raw IDs aren't useful for display.
 *
 * @param {string} [propertyId] omit for all properties combined
 * @return {Object} {overdue, dueThisWeek, dueUpcoming, monthlyExpense,
 *   recentPayments} — every array entry pre-enriched for direct display
 */
function getDashboardSnapshot(propertyId) {
  var today = new Date();
  var todayIso = toIsoDate_(today);
  var weekEnd = new Date(today); weekEnd.setDate(weekEnd.getDate() + 7);
  var upcomingEnd = new Date(today); upcomingEnd.setDate(upcomingEnd.getDate() + 30);

  var overdue = queryOverdue({ propertyId: propertyId || undefined }).results;
  var dueThisWeek = queryUpcomingPayments({
    propertyId: propertyId || undefined, from: todayIso, to: toIsoDate_(weekEnd)
  }).results;
  var dueUpcoming = queryUpcomingPayments({
    propertyId: propertyId || undefined, from: toIsoDate_(weekEnd), to: toIsoDate_(upcomingEnd)
  }).results;
  var recentPayments = queryRecentPayments({ propertyId: propertyId || undefined, limit: 10 }).results;

  return {
    overdue: overdue.map(enrichOccurrenceForDisplay_),
    dueThisWeek: dueThisWeek.map(enrichOccurrenceForDisplay_),
    dueUpcoming: dueUpcoming.map(enrichOccurrenceForDisplay_),
    monthlyExpense: getMonthlyExpenseSummary(propertyId),
    recentPayments: recentPayments.map(enrichOccurrenceForDisplay_)
  };
}

/**
 * Joins an Occurrence with its Rule (Category/Payee/PropertyID) and
 * Property (PropertyName), for display purposes only — never used by
 * any Command, never written back anywhere. Read-only join within
 * 912/910's own public Query functions, not a Truth Layer write.
 */
function enrichOccurrenceForDisplay_(occurrence) {
  var rule = getObligationRuleById_(occurrence.ObligationID);
  var property = rule ? getProperty(rule.PropertyID) : null;
  return {
    occurrenceId: occurrence.OccurrenceID,
    obligationId: occurrence.ObligationID,
    effectiveDue: occurrence.EffectiveDue,
    status: occurrence.Status,
    paidDate: occurrence.PaidDate || '',
    paidAmount: occurrence.PaidAmount || '',
    category: rule ? rule.Category : 'Unknown',
    payee: rule ? rule.Payee : '',
    expectedAmount: rule ? rule.Amount : '',
    propertyId: rule ? rule.PropertyID : '',
    propertyName: property ? property.PropertyName : ''
  };
}
