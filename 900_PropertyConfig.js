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

  SHEET_NAMES: Object.freeze({
    OBLIGATION_RULES: 'ObligationRules',
    OBLIGATION_OCCURRENCES: 'ObligationOccurrences',
    OBLIGATION_HISTORY: 'ObligationHistory',
    PROPERTIES: 'Properties'
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
    EVENT: 'EVT'
    // [NEEDS CONFIRMATION — Constitution §6] format not yet cross-checked
    // against Reminder OS / Inventory OS's actual existing ID scheme.
  })

});
