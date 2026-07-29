/**
 * ═══════════════════════════════════════════════════════════════════════
 * PROPERTY OS — 913_ObligationScheduler.js
 * Runtime Layer — Obligation Scheduler
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Governs: ObligationEngine_VerticalSlice.md §1 (Overdue Rule), §6
 * (Reminder Contract), Constitution §3.5 / P9 (ADR-P02).
 * Session 1, Part B — file 2 of 2.
 *
 * Two responsibilities only:
 *   1. Frequency-aware NextDue math (calendar-correct, not "+30 days").
 *   2. Building & publishing REMINDER_REQUESTED — never anything else.
 *      913 does not create Triggers, does not run on a schedule itself,
 *      and does not know or care how Reminder OS turns a
 *      REMINDER_REQUESTED into an actual notification (ADR-P02).
 *
 * Overdue is Derived State (Vertical Slice §1, Review Approval
 * 2026-07-19): isOccurrenceOverdue_() is a pure query-time computation.
 * Nothing in this file writes an "Overdue" value anywhere, ever — there
 * is no OBLIGATION_OCCURRENCE_STATUSES entry for it (see 900), and no
 * PAYMENT_OVERDUE event exists in 903's catalog on purpose.
 *
 * 913 is the other half of 912's Aggregate, not a separate OS (see
 * 912's file header) — so scheduleNextOccurrence_() calls back into
 * 912's createOccurrence_() directly. This direct call stands in for
 * "913 subscribes to 912's PAYMENT_COMPLETED" until a real EventBus
 * exists (ADR-P07); recordPayment() in 912 is the only caller.
 *
 * Depends on: 900_PropertyConfig.js, 901_PropertySchema.js,
 * 902_PropertyIdentity.js, 903_PropertyEventDefinitions.js,
 * 912_ObligationEngine.js (createOccurrence_, transitionRuleToCompleted_)
 * ═══════════════════════════════════════════════════════════════════════
 */


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Frequency date math
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Adds `monthsToAdd` calendar months to `date`, clamping the day-of-
 * month to the target month's actual length (e.g. Jan 31 + 1 month =
 * Feb 28/29, never "Mar 3"). Plain `setMonth()` arithmetic overflows in
 * exactly this case, which would silently push a due date into the
 * wrong month — unacceptable for something people's mortgage/bill
 * reminders depend on.
 * @param {Date} date
 * @param {number} monthsToAdd
 * @return {Date}
 */
function addMonthsClamped_(date, monthsToAdd) {
  var originalDay = date.getDate();
  var d = new Date(date.getTime());
  d.setDate(1); // avoid overflow while shifting the month itself
  d.setMonth(d.getMonth() + monthsToAdd);
  var daysInTargetMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(originalDay, daysInTargetMonth));
  return d;
}

/**
 * @param {Date} date
 * @param {string} frequencyType one of PROPERTY_CONFIG.FREQUENCY_TYPES
 * @param {number} [customIntervalDays] required iff frequencyType === 'Custom'
 * @return {Date}
 */
function addFrequencyToDate_(date, frequencyType, customIntervalDays) {
  switch (frequencyType) {
    case 'Weekly': {
      var d = new Date(date.getTime());
      d.setDate(d.getDate() + 7);
      return d;
    }
    case 'Monthly':
      return addMonthsClamped_(date, 1);
    case 'Quarterly':
      return addMonthsClamped_(date, 3);
    case 'HalfYearly':
      return addMonthsClamped_(date, 6);
    case 'Yearly':
      return addMonthsClamped_(date, 12);
    case 'Custom': {
      var days = Number(customIntervalDays);
      if (!(days > 0)) {
        throw propertyError_('INVALID_FREQUENCY', 'Custom frequency requires a positive customIntervalDays.');
      }
      var dc = new Date(date.getTime());
      dc.setDate(dc.getDate() + days);
      return dc;
    }
    default:
      throw propertyError_('INVALID_FREQUENCY', 'Unknown frequency type: ' + frequencyType);
  }
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Overdue — Derived State only, never stored (CONFIRMED, §1)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * @param {Object} occurrence must have Status, EffectiveDue (ISO string)
 * @param {Object} rule must have GraceDays
 * @return {boolean}
 */
function isOccurrenceOverdue_(occurrence, rule) {
  if (occurrence.Status !== 'Active') return false; // Paid/Cancelled/Draft are never "overdue"
  var graceDays = rule.GraceDays !== '' && rule.GraceDays != null ? Number(rule.GraceDays) : 0;
  var deadline = parseIsoDate_(coerceToIsoDateString_(occurrence.EffectiveDue));
  deadline.setDate(deadline.getDate() + graceDays);
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime() > deadline.getTime();
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Reminder Contract (Vertical Slice §6) — publish only, never schedule
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Builds the REMINDER_REQUESTED payload. Does not publish — callers
 * decide when (createObligation for the first cycle, scheduleNext
 * Occurrence_ below for every cycle after).
 * @param {Object} rule
 * @param {Object} occurrence
 * @return {Object}
 */
function buildReminderRequest_(rule, occurrence) {
  var offsets;
  try {
    offsets = JSON.parse(rule.ReminderOffsets);
  } catch (e) {
    offsets = PROPERTY_CONFIG.DEFAULT_REMINDER_OFFSETS;
  }
  return {
    obligationId: rule.ObligationID,
    occurrenceId: occurrence.OccurrenceID,
    effectiveDue: occurrence.EffectiveDue,
    offsets: offsets
  };
}

/**
 * Called by 912.recordPayment() after a payment is completed (direct-
 * call stand-in for event subscription — see file header). Computes
 * NextDue, and either:
 *   - creates the next Occurrence + publishes REMINDER_REQUESTED, or
 *   - if NextDue would fall after the Rule's EndDate, transitions the
 *     Rule to Completed instead (natural end of term — e.g. a Mortgage
 *     fully amortized) and creates nothing, or
 *   - does nothing if AutoGenerate is false or the Rule is no longer
 *     Active (Suspended/Cancelled/Completed) — a Suspended Rule simply
 *     stops rolling forward until Resumed.
 *
 * @param {Object} rule
 * @param {Object} fromOccurrence the Occurrence that was just paid
 * @return {Object|null} the new Occurrence, or null if none was created
 */
function scheduleNextOccurrence_(rule, fromOccurrence) {
  if (!rule.AutoGenerate) return null;
  if (rule.Status !== 'Active') return null;

  var nextDueDate = addFrequencyToDate_(
    parseIsoDate_(coerceToIsoDateString_(fromOccurrence.EffectiveDue)),
    rule.FrequencyType,
    rule.CustomIntervalDays
  );

  if (rule.EndDate) {
    var endDate = parseIsoDate_(coerceToIsoDateString_(rule.EndDate));
    if (nextDueDate.getTime() > endDate.getTime()) {
      transitionRuleToCompleted_(rule);
      return null;
    }
  }

  var nextOccurrence = createOccurrence_(rule, toIsoDate_(nextDueDate));

  publishPropertyEvent_(
    PROPERTY_EVENTS.REMINDER_REQUESTED,
    rule.PropertyID,
    rule.ObligationID,
    buildReminderRequest_(rule, nextOccurrence)
  );

  return nextOccurrence;
}
