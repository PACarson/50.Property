/**
 * ═══════════════════════════════════════════════════════════════════════
 * PROPERTY OS — 900_PropertyConfig.js
 * Foundation Layer — Configuration
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Governs: 00_Project_Constitution.js §6/§7, ADR-P01 (category list)
 * Session 1, Part A (Foundation) — file 1 of 4.
 *
 * Load-order note: GAS loads .js files in filename order in the absence
 * of a bundler, which is why every Property OS file carries a numeric
 * prefix. 901/902/903 reference PROPERTY_CONFIG at their own top level,
 * so this file (900) must continue to sort before them. Do not rename.
 *
 * Pure constants only. No Sheet access, no EventBus calls, no triggers.
 * ═══════════════════════════════════════════════════════════════════════
 */

var PROPERTY_CONFIG = Object.freeze({

  // ADR-P01: complete Obligation category list. Obligation Engine is the
  // single source of truth for all of these — do not duplicate this
  // list anywhere else; reference PROPERTY_CONFIG.OBLIGATION_CATEGORIES.
  OBLIGATION_CATEGORIES: Object.freeze([
    'Mortgage',
    'Electricity',
    'Water',
    'MaintenanceFee',
    'SinkingFund',
    'QuitRent',
    'Assessment',
    'Insurance',
    'Internet',
    'Subscription',
    'PestControl',
    'AircondService',
    'WaterFilter',
    'RentalCollection',
    'LeaseRenewal',
    'Warranty',
    'DefectLiability'
  ]),

  DEFAULT_CURRENCY: 'MYR',

  // Positive = days before DueDate, 0 = Due Today, negative = days after
  // (overdue). Property OS never *acts* on these — they only ever travel
  // inside a REMINDER_REQUESTED event payload for Reminder OS to
  // interpret (ADR-P02). Property OS does not schedule anything itself.
  DEFAULT_REMINDER_OFFSETS: Object.freeze([30, 14, 7, 3, 1, 0, -1, -3, -7]),

  FREQUENCY_TYPES: Object.freeze(
    ['Weekly', 'Monthly', 'Quarterly', 'HalfYearly', 'Yearly', 'Custom']
  ),

  DEFAULT_GRACE_DAYS: 0,

  OBLIGATION_RULE_STATUSES: Object.freeze(
    ['Draft', 'Active', 'Suspended', 'Cancelled', 'Completed']
  ),

  // Overdue is deliberately absent — it is a Derived State, never
  // stored (Vertical Slice §1, Review Approval 2026-07-19).
  OBLIGATION_OCCURRENCE_STATUSES: Object.freeze(
    ['Draft', 'Active', 'Paid', 'Cancelled']
  ),

  PAID_VIA_OPTIONS: Object.freeze(['Manual', 'Import', 'API']),

  // 910_PropertyAssetEngine. UPPER_SNAKE_CASE is a deliberate, documented
  // exception to every other enum in this file (PascalCase) — CC's
  // explicit instruction at Review Approval (2026-07-29), not a drift.
  // See 00_ADR_Log.js for the pointer. OTHER exists so a genuinely new
  // property type doesn't force a Schema Migration; MIXED_USE is
  // reserved for future combined-use property.
  PROPERTY_TYPES: Object.freeze([
    'RESIDENTIAL_CONDO',
    'RESIDENTIAL_LANDED',
    'COMMERCIAL',
    'INDUSTRIAL',
    'LAND',
    'MIXED_USE',
    'OTHER'
  ]),

  FREEHOLD_LEASEHOLD_OPTIONS: Object.freeze(['Freehold', 'Leasehold']),

  // No Draft/Archived — see Vertical Slice §6: Sold is reversible only
  // via ReversePropertySale (ADR-P06/P10 applied), no other states are
  // needed yet (avoid Speculative Design).
  PROPERTY_STATUSES: Object.freeze(['Active', 'Sold']),

  // ─────────────────────────────────────────────────────────────────
  // 918_DefectEngine / 911_DocumentEngine Vertical Slice — Phase 1
  // (Review Approval 2026-08-15/16, see 00_ADR_Log.js ADR-P15/P16/P17
  // and the standalone Phase0 Audit doc for full rationale.)
  // ─────────────────────────────────────────────────────────────────

  // Only 'DLP' exists today. Single-value on purpose — a generic
  // multi-type Case system is not built until a second real Case type
  // exists (Candidate Pattern discipline, ADR-P10/P12/P13).
  PROPERTY_CASE_TYPES: Object.freeze(['DLP']),

  PROPERTY_CASE_STATUSES: Object.freeze(['Open', 'InProgress', 'Closed']),

  // Starter list — extend additively as real defects don't fit; not
  // exhaustive by design (avoid Speculative Design).
  DEFECT_CATEGORIES: Object.freeze([
    'Structural',
    'Waterproofing',
    'Plumbing',
    'Electrical',
    'AirConditioning',
    'Carpentry',
    'Painting',
    'Ironmongery',
    'Appliance',
    'Flooring',
    'Other'
  ]),

  DEFECT_PRIORITIES: Object.freeze(['Critical', 'High', 'Medium', 'Low']),

  // Overall roll-up status — distinct from DEVELOPER_STATUSES and
  // OWNER_VERIFICATION_STATUSES below (Phase0 Audit §4.2). Only a
  // closeDefectItem_-style transition may reach 'Closed'; only an
  // explicit reopenDefectItem may leave it, mirroring 910's
  // markPropertySold/reversePropertySale asymmetric-transition pattern.
  DEFECT_ITEM_STATUSES: Object.freeze([
    'Open', 'InProgress', 'PendingVerification', 'Verified', 'Closed'
  ]),

  // Independent of OWNER_VERIFICATION_STATUSES — see Phase0 Audit §4.2.
  // The Command that writes this must never also write
  // OWNER_VERIFICATION_STATUSES, and vice versa.
  DEVELOPER_STATUSES: Object.freeze([
    'Pending', 'Scheduled', 'InProgress', 'ClaimedCompleted'
  ]),

  // NOT a one-way terminal-state machine like most Property OS status
  // fields — 'FailedVerification' can be reassessed again after a
  // further Developer attempt. Deliberate, documented departure from
  // Constitution §5 Global Invariant #4 for this one field; see
  // Phase0 Audit §4.2 / §9.
  OWNER_VERIFICATION_STATUSES: Object.freeze([
    'NotChecked', 'Verified', 'FailedVerification', 'PartiallyVerified'
  ]),

  CORRESPONDENCE_DIRECTIONS: Object.freeze(['Sent', 'Received']),

  // 'NotedOnly' exists specifically so a "noted with thanks" reply is
  // never mistaken for a substantive one — see Phase0 Audit Test Plan
  // scenario 13.
  CORRESPONDENCE_RESPONSE_STATUSES: Object.freeze([
    'Pending', 'PartiallyAnswered', 'Answered', 'Rejected', 'NotedOnly'
  ]),

  // Append-only log values (Phase0 Audit §4.5, CC Review Approval
  // 2026-08-15) — a RectificationEvent row is never updated after
  // creation; each milestone is a new row.
  RECTIFICATION_EVENT_TYPES: Object.freeze([
    'AccessRequested',
    'AccessGranted',
    'RectificationStarted',
    'RectificationCompleted',
    'RectificationRejected',
    'ReinspectionRequired',
    'DeveloperClaimedCompleted'
  ]),

  RECTIFICATION_SOURCES: Object.freeze(['DeveloperProvided', 'OwnerObserved']),

  SECONDARY_DAMAGE_TYPES: Object.freeze([
    'Cabinet', 'Flooring', 'Wall', 'Door', 'Ironmongery', 'Appliance', 'Other'
  ]),

  SECONDARY_DAMAGE_STATUSES: Object.freeze([
    'Reported', 'Acknowledged', 'Rectified', 'Disputed'
  ]),

  EVIDENCE_TYPES: Object.freeze([
    'Photo', 'Video', 'Email', 'PDF', 'WhatsAppScreenshot',
    'DeveloperReport', 'ContractorReport', 'InspectionReport',
    'MobileAppSubmissionProof', 'Other'
  ]),

  EVIDENCE_PHASES: Object.freeze(['Before', 'During', 'After', 'NotApplicable']),

  // Polymorphic pointer pair (Phase0 Audit §4.7) — which OTHER row (if
  // any) a piece of Evidence was captured for, beyond RelatedCaseID /
  // RelatedDefectID which are always plain FKs.
  EVIDENCE_RELATED_ENTITY_TYPES: Object.freeze([
    'DailyProgressCheck', 'Correspondence', 'RectificationEvent',
    'SecondaryDamage', 'CaseLevel'
  ]),

  SHEET_NAMES: Object.freeze({
    OBLIGATION_RULES: 'ObligationRules',
    OBLIGATION_OCCURRENCES: 'ObligationOccurrences',
    OBLIGATION_HISTORY: 'ObligationHistory',
    PROPERTIES: 'Properties',
    // 918_DefectEngine / 911_DocumentEngine Vertical Slice — Phase 1:
    PROPERTY_CASES: 'PropertyCases',
    DEFECT_ITEMS: 'DefectItems',
    DAILY_PROGRESS_CHECKS: 'DailyProgressChecks',
    CORRESPONDENCES: 'Correspondences',
    RECTIFICATION_EVENTS: 'RectificationEvents',
    SECONDARY_DAMAGES: 'SecondaryDamages',
    PROPERTY_CASE_TIMELINE: 'PropertyCaseTimeline',
    EVIDENCE: 'Evidence'
    // Other Engines' sheet names (Loans, Ledger, ...) are added here
    // when their own Phase begins — not stubbed out speculatively now
    // (Constitution: avoid Speculative Design).
  }),

  ID_PREFIXES: Object.freeze({
    PROPERTY: 'PROP',
    LOAN: 'LOAN',
    OBLIGATION: 'OBL',
    OCCURRENCE: 'OCC',
    HISTORY: 'HIST',
    TENANT: 'TEN',
    LEASE: 'LEASE',
    DOCUMENT: 'DOC',
    MAINTENANCE: 'MAINT',
    DEFECT: 'DEFECT',
    RENOVATION: 'RENO',
    INSURANCE: 'INS',
    TAX: 'TAX',
    EVENT: 'EVT',
    // 918_DefectEngine Vertical Slice — Phase 1. EVIDENCE deliberately
    // reuses DOCUMENT above rather than getting its own prefix — see
    // Phase0 Audit §3.2 / §4.7.
    CASE: 'CASE',
    PROGRESS_CHECK: 'CHECK',
    CORRESPONDENCE: 'CORR',
    RECTIFICATION_EVENT: 'RECT',
    SECONDARY_DAMAGE: 'DMG',
    TIMELINE_ENTRY: 'TLE'
    // [NEEDS CONFIRMATION — Constitution §6] format not yet cross-checked
    // against Reminder OS / Inventory OS's actual existing ID scheme.
  })

});
