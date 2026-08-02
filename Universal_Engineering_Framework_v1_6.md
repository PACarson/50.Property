# Universal Engineering Framework (UEF)
## v1.6 — Stable, 2026-07-29

**Status:** Ratified. MINOR bump from v1.5, same day. One addition: **§2 Architecture gains an explicit "Platform Constraints" subsection** — every section already assumed the ecosystem runs exclusively on Google Apps Script + Sheets, but nothing said so plainly, and nothing named the sharpest consequence of that: Sheets has no multi-statement transactions, so no project's Commands are actually atomic across several writes unless something was specifically built to make that true. This isn't a new architectural decision — it's naming a platform fact every project has been implicitly operating inside since v1.0. Four new Candidate Patterns table entries (Production Readiness Audit Template, the three named verification categories, and the partial-failure-visibility response pattern) — all proposed by Property OS's project owner in the same session that found a real, concrete instance of the no-transactions consequence in `recordPayment`. None promoted to ratified content; all single-project so far, per D7's own discipline, which this version applies to itself rather than making an exception for a good proposal.
**Property OS status:** unchanged from v1.5's note — Obligation Engine sub-system `pending` per §0.5, not yet Production-Ready; the new Failure Recovery finding is being addressed in Property OS's own files, not blocking further work given personal-project scale (see D9 below for the reasoning).
**Scope:** Personal AI Core, Rider OS, Reminder OS, Productivity OS, Property OS, and every future Domain OS project (Investment OS, News OS, Finance OS, Shopping OS, Vehicle OS, Health OS, Inventory OS, ...).
**Rollout:** Rider OS was the pilot (D5) — first project to complete a full Review + Production Readiness Audit under UEF. Property OS is the first project built with UEF and the Blueprint present from inception rather than retrofitted onto pre-existing code. Personal AI Core, then Reminder OS, retrofit next.

```
Personal AI Ecosystem
├── Universal Engineering Framework    (this document — governs HOW)
├── Universal Domain OS Blueprint      (existing — governs WHAT/runtime)
├── Personal AI Core
├── Rider OS
├── Reminder OS
├── Productivity OS
└── (future) Investment OS, News OS, Finance OS, Property OS,
    Shopping OS, Vehicle OS, Health OS, Inventory OS, ...
```
UEF **governs** every Domain OS project — an authority relationship, not a code dependency. No project "imports" UEF the way it imports a library; UEF sits alongside the Blueprint as a parallel, ecosystem-level layer that no single project's folder contains.

---

## How this was built, and what's verified vs. recalled

Rider OS's actual current files (`Rider-main.zip`) were read directly this session — `00_Project_Constitution.txt` v2.5, `00_Business_Rules.txt`, `00_Project_State.txt`, `00_File_Map.txt`, `P17_Schema_Migration_Plan.txt`. Everything attributed to Rider OS below is checked against that.

Everything attributed to **Personal AI Core** or **Reminder OS** comes from prior session records, not a fresh read this session. Per EP5 below, treat those claims (Reminder OS's ADR sequence, Personal AI Core's P7) as likely accurate but unverified today — worth confirming against their actual repos before they're retrofitted.

v1.0 also incorporates a second, independent review of the v0.1 draft. Evaluated on its merits rather than adopted outright (per standing practice): most of it held up and is folded in below; the one place it made an unverified claim (which specific projects currently need `00_Business_Rules`) is flagged rather than settled, since the conditional trigger in §0.3 resolves that empirically when each project is actually reviewed — it doesn't need to be argued in the abstract now.

### Headline finding (unchanged from v0.1)

You already had roughly 70% of a UEF before this document existed — informal, inconsistent between projects, not written down as a standalone standard. This document's job is mostly naming, standardizing, and closing gaps, not inventing a new methodology from nothing.

### Three real gaps found by reading the actual files

1. **Rider OS has no ADR file.** Closed by this rollout — see `00_ADR_Log.txt`.
2. **No project has a dedicated Review History file.** Still open — created at Rider OS's first UEF Review (next step, not yet done).
3. **Risk tiers disagreed** between established practice (3 tiers) and the original brief (4 tiers). Resolved below (D2).

### The one meta-decision everything below follows

Prevent over-engineering, premature optimization, and speculative design; prefer evolutionary architecture. Applied to the framework itself: every section is split into **Tier 1** (specified now, has real precedent), **Tier 2** (conditional, triggers on a defined condition), and **Tier 3** (named, deferred until something actually needs it). This keeps the framework from being the first thing that violates its own anti-speculative-design rule.

---

## Validation Status *(new in v1.2)*

Every section below is written the same regardless of whether it's been used yet. This table is the honest difference — what Rider OS's completed Review + Production Readiness Audit actually exercised, versus what's still exactly as untested as the day it was drafted.

| Section | Status | Basis |
|---|---|---|
| §0.1 Engineering Principles (EP1-6) | **VALIDATED** | Applied throughout — EP5 specifically caught the ADR-003/ADR-004 bugs before they shipped |
| §0.2 Mandatory Documents | **VALIDATED** | All five exist and were actively read/written for Rider OS this whole cycle |
| §0.3 Conditional Documents | PILOT | Business_Rules confirmed necessary in practice; the Schema/Migration template wasn't freshly exercised (P17's plan predates UEF) |
| §0.5 Definitions (Ready/Done/Production-Ready) | **VALIDATED** | The exact vocabulary organized the whole audit — "pending manual verification" → "Production-Ready" was the tracking model end to end |
| §0.6 AI Engineering Protocol | **VALIDATED** | Followed every session this cycle |
| §0.7 ADR Record Structure | **VALIDATED** | Five real ADRs written against it (UEF-ADR-001, Rider ADR-001-004); no field proved missing or unused |
| §0.8 Version Governance | **VALIDATED** | Actually exercised three times (v1.0→v1.1→v1.2), MINOR-bump-no-ADR rule applied correctly each time |
| §0.9 Blueprint Change Policy | DRAFT — unexercised | Written this version; no actual Blueprint change request has tested the two-project bar yet |
| §1 Initiation | DRAFT — unexercised | No new project or new feature was initiated under UEF this cycle; every P-item predates it |
| §2 Architecture | DRAFT — unexercised | Architecture Gates were never triggered — no layer, ownership, or cross-project dependency changed |
| §3 Contract Design | PILOT | Matches P17's actual pre-UEF pattern; no fresh contract change was made under UEF's own gate this cycle |
| §4 Implementation (UCR1-7) | PILOT | UCR1-6: already-established codebase conventions, continued through this cycle's edits. UCR7 *(v1.4)*: promoted from cross-project pattern-matching, not yet exercised by any project's formal Review |
| §5 Validation | **VALIDATED, heavily** | The two-tier split is exactly what the whole audit ran on: 53 automated + 30 manual checks |
| §6 Release (versioning) | **VALIDATED** | v2.5.7→.8→.9 incremented correctly under the stated PATCH rule; Migration/Rollback template not freshly exercised |
| §7 Evolution | PARTIALLY VALIDATED | BUG-07's deletion is a real instance of "delete only once zero-callers is confirmed"; module split/merge unexercised |
| §8 Review Framework | **VALIDATED, heavily** | Full Audit Review ran twice for real; Risk Matrix classified real findings (F1-F7) |
| §9 Audit Framework | **VALIDATED, heavily** | Source of this version's own additions — the Audit Workflow was written FROM this cycle, not before it |
| Knowledge Base | **VALIDATED, growing** | Three new Failure Catalog entries in the v1.2 cycle, each from a real, fixed bug. One more in v1.4 (Property OS, Sheets date coercion) — caught proactively before shipping, not from a live bug; noted as such in its own entry rather than blended into the same description. Candidate Patterns table is new in v1.4 and, by design, holds nothing "validated" yet. |

Nothing here changes what any section *says* — PILOT/DRAFT tags mean "not yet tested against reality," not "wrong." The tags should update as Personal AI Core and Reminder OS get their own retrofits and initiation/architecture-gate scenarios actually happen.

---

## The 10-part lifecycle

Unchanged from the original brief.

```
0. Engineering Governance   — the constitution: principles, mandatory docs, drift rules
     ↓
1. Initiation               — why a project/feature exists before design starts
     ↓
2. Architecture             — process for architecture work (not the architecture itself)
     ↓
3. Contract Design          — schemas, commands, events as versioned contracts
     ↓
4. Implementation           — coding standards, file/test conventions, AI coding rules
     ↓
5. Validation                — proving correctness (broader than "tests")
     ↓
6. Release                   — versioning, migration, rollback, changelog
     ↓
7. Evolution                 — deprecation, tech debt, module split/merge
     ↓
8. Review Framework           — reusable review workflow + decision matrix
     ↓
9. Audit Framework             — periodic evidence-based health checks
     ↓
Engineering Knowledge Base      — failure catalog, reference architecture, glossary
```

---

## 0. Engineering Governance

### 0.1 — Engineering Principles

- **EP1 — Code → Verify → Governance, never the reverse.** A suggestion, an external AI's proposal, an old doc, or last week's own governance file is a reason to re-check the live code — never a reason to update a governance doc directly.
- **EP2 — Documentation Drift is a defect, not a formality.** Any change to Architecture, Dependencies, Contracts, Interfaces, Modules, Layers, Data Ownership, or Responsibilities MUST trigger a check of whether Constitution / State / File_Map / Business_Rules / ADR / Review History need updating — same session as the code change.
- **EP3 — Anti-premature-engineering.** Build for the requirement in front of you; "might need this later" isn't justification on its own — it earns its own evaluation when that future arrives.
- **EP4 — Single source of truth for every derived calculation.** Two engines independently computing the same number is a defect waiting to happen, not two implementations to keep in sync. *(Example added in v1.4, illustration only — not a new principle)*: Property OS's Obligation Engine takes this one step further than "compute it in one place" — for its Overdue status, it doesn't store a computed value anywhere at all. "Overdue" is fully derivable from an Occurrence's due date, its grace period, and the current time, so materializing it as a written field would itself become a second, driftable source of truth the moment "now" moves on without a write happening. It stays a pure query-time computation instead. Worth generalizing: when a status is fully derivable from already-stored fields plus the current moment, prefer computing it at query time over writing and maintaining it — this also sidesteps needing a scheduled job to keep it current, which matters doubly on a platform with hard trigger-count limits.
- **EP5 — Empirical verification over inherited authority.** Applies to Claude as much as any external source — a claim's origin doesn't grant it truth. Re-derive from the live sheet/live code before accepting. (Applied to this very document's own Personal-AI-Core/Reminder-OS claims, and to the second review folded in above.)
- **EP6 — No engineering decision by opinion alone.** Non-trivial decisions use the Decision Matrix (§8). "I think X is better" is a hypothesis, not a decision.

### 0.2 — Mandatory Project Documents (Tier 1 — every project, no exceptions)

| Document | Purpose | Currently exists? |
|---|---|---|
| `00_Project_Constitution.js` | Architecture + coding rules only | ✅ all 3 projects *(as `.txt` — not yet migrated, see §0.2 note)* |
| `00_Project_State.js` | Living changelog: version, in-progress, bugs, next steps | ✅ all 3 projects *(as `.txt`)* |
| `00_File_Map.js` | Module index + common-edit-scenario runbook | ✅ all 3 projects *(as `.txt`)* |
| `00_ADR_Log.js` | One record per architecture-affecting decision | ✅ Reminder OS · Rider OS *(both as `.txt`)* · ✅ Property OS *(already `.js`, see below)* · ❌ Personal AI Core |
| `00_Review_History.js` | Log of review/audit sessions, separate from the routine changelog | ❌ missing everywhere — created at each project's first UEF Review |

**File extension — `.js`, decided v1.5 (D8).** Every project-level governance file, and any other file this framework produces for a specific project, uses **`.js`**, not `.txt`. This reverses v1.0-v1.3's `.txt` default. Property OS is the first project built under this default (it started on `.js`'s spiritual predecessor, `.gs`, before this decision — see D8 for how that got reconciled) and is fully migrated as of this version. **Rider OS, Reminder OS, and Personal AI Core's existing `.txt` files are not automatically renamed by this document** — each migrates on its own schedule; until then, "currently exists?" above accurately says `.txt` for them. Historical references elsewhere in this document to a specific project's actual current filename (e.g. Rider OS's real, currently-`.txt` files) are left as `.txt` on purpose — see EP5: this document doesn't misstate what a file is actually currently named just because the going-forward default changed.

### 0.3 — Conditional Documents (Tier 2 — required only when the trigger condition is met)

| Document | Required when... | Precedent |
|---|---|---|
| `00_Business_Rules.js` | Project has non-trivial domain/business logic distinct from architecture | Rider OS split this out 2026-07-14 (as `00_Business_Rules.txt`, its actual current name) |
| Schema/Migration/Rollback/Compatibility Plan | A change touches a live Sheet schema already holding production data | `P17_Schema_Migration_Plan.txt` — Rider OS's actual file, the origin of the universal template (§3, §6); new instances of this template use `.js` |

Whether any *specific* project (e.g. Reminder OS) currently meets the `00_Business_Rules` trigger isn't decided here — it's checked against that project's actual current code when it's reviewed, not argued about in the abstract.

### 0.4 — Documentation Drift Trigger List
**Architecture · Dependencies · Contracts · Interfaces · Modules · Layers · Data Ownership · Responsibilities.**

### 0.5 — Definitions

- **Definition of Ready** (before implementation starts): governing Constitution/Business_Rules principle exists, or is being written alongside this change · if a live schema is touched, a signed-off Schema/Migration Plan exists first.
- **Definition of Done** (implementation complete): code implemented · pure-logic unit tests pass · governance docs updated same session (EP2) · Change Impact Analysis reported (§0.6).
- **Definition of Production-Ready** (safe to close): Done, plus the manual verification checklist run once against the live deployment. Until then, status stays `pending`.

### 0.6 — AI Engineering Protocol

1. **Session bootstrap** — before proposing any change, read the project's full Constitution + State + File_Map (+ Business_Rules if present).
2. **Before implementing** — report a Change Impact Analysis: modules affected, contracts affected, tests affected, which governance docs need sync, technical debt introduced, architecture drift, ADR needed?, backward compatibility, migration needed?
3. **Process** — implement → self-check → surface what was found → fix → resubmit.
4. **After implementing** — sync governance docs the same session, never a deferred pass.

### 0.7 — ADR Record Structure *(refined in v1.1 after review — see UEF-ADR-001 / ADR-001 for the applied example)*

Every ADR entry, at either level, uses this shape:

| Field | Notes |
|---|---|
| ID | Sequential per log — `UEF-ADR-001` (ecosystem log) or `ADR-001` (project-local log) |
| Title | One line |
| Status | Proposed / Accepted / Superseded (by ADR-NNN) / Rejected |
| Date | |
| Context | Why this decision was needed. States the problem — doesn't restate detailed history already in State/Review History (EP4, one source of truth) |
| Question | The specific question being decided |
| Options Considered | Listed briefly — full Advantages/Disadvantages/Trade-offs reasoning (§8's Decision Matrix) is supporting material for non-trivial decisions, not boilerplate in every ADR |
| Decision | What was chosen |
| Evidence | What was verified before deciding, and at what confidence — directly verified this session vs. recalled from prior ones (EP5). Specific enough to be falsifiable later; an ADR that goes vague to "age well" loses the thing that makes it trustworthy — that job belongs to Context, not Evidence |
| Impact | What changes as a direct result of the decision. For a foundational/high-stakes entry this can include a short positive-effects/trade-offs note — not a separate mandatory section, since most ADRs are too small to need one (EP3) |
| Next Steps | What happens after, that this decision doesn't itself resolve |
| Related ADRs | Cross-references to ADRs this one follows from, supersedes, or is followed by. Often thin or empty on early entries — becomes valuable as the log grows |
| Review Trigger | The *condition* that should prompt re-evaluating this decision, not a calendar date — e.g. "after the pilot completes," "if UEF governance changes materially" |

Two ADR levels exist: an **ecosystem-level log** (lives in UEF's own directory — decisions about UEF itself, or cross-project matters) and a **project-level log** (`00_ADR_Log.js` in each project — that project's own architectural decisions, including its own "we adopted UEF" entry).

### 0.8 — UEF Version Governance *(new in v1.0 — Decision D6)*

UEF versions itself the same way §6 versions project releases:
- **PATCH** — wording/clarity fixes, no semantic change
- **MINOR** — new checklist item, a Tier-3 Review Profile or Validation tier activated into Tier 1, a new template — no ADR required, just a note in the ecosystem changelog
- **MAJOR** — a change to the lifecycle itself, a core Engineering Principle, or a Mandatory/Conditional document tier — requires an ecosystem-level ADR

This v0.1 → v1.0 transition is itself the first Version Governance event: several additions (full Risk Matrix, ADR structure, this section) plus D1-D6, but no lifecycle change and no principle removed — so it's the initial ratification, covered by `UEF-ADR-001`, rather than a MAJOR change needing a separate ADR beyond that.

### 0.9 — Blueprint Change Policy *(new in v1.3)*

The Universal Domain OS Blueprint is Stable as of v1.2, ratified through Rider OS's complete Review + Production Readiness Audit and its own architecture mapping. Its own §0.8-equivalent:

- Changes are not made based on a single project.
- A Blueprint modification requires evidence from at least two independent projects, or a demonstrated ecosystem-wide benefit — not a design preference, however reasonable it sounds in the abstract.
- Blueprint evolution stays conservative and evidence-driven, same as this document's own EP5/EP3.

This is stricter than UEF's own MINOR bar (§0.8), deliberately — UEF changes based on lessons from running the process; Blueprint changes reshape what every current and future Domain OS project is built out of, which is a higher bar to clear before touching again.

---

## 1. Initiation

**1a. New Domain OS project**
- Vision/Purpose (one paragraph — matches the existing "SYSTEM IDENTITY" block style)
- Requirements, Constraints, Assumptions, Non-functional Requirements, Success Criteria, Out of Scope
- **ADR-000**: why this is a separate GAS project rather than a module inside an existing one (Domain Ownership, P7-style)
- A lightweight roadmap — bullet points, not a Gantt chart

**1b. New feature inside an existing project (the common case)**
- Maps onto the P-numbering convention proven in Rider OS's `00_Business_Rules.txt` (P15-P25): a new feature gets a principle number, a one-line rule, a status tag (§0.5, §8)
- No separate Initiation document — the P-entry itself, tagged `[PROPOSED]` before acceptance, *is* the initiation artifact

---

## 2. Architecture

Process for architecture work — not the architecture itself. That's the Blueprint's job; each project's Constitution "ARCHITECTURE LAYERS" section is where the Blueprint gets instantiated per-project. CQRS/Event Sourcing/EventBus/layer-naming stay out of this document deliberately.

- **Architecture Gates** — adding/removing a layer, moving module ownership, or changing cross-project dependency direction requires an ADR *before* implementation.
- **Dependency Rules** — since these are independent GAS deployments sharing only a Sheet, a "dependency" means *Project A assumes Project B populates Sheet X*. Every such assumption gets one line in both projects' File_Maps.
- **Ownership check** — before writing a new module, confirm which project owns that domain (Domain Ownership, Personal AI Core's P7). Default: new capability = new file in the project that already owns that domain, unless Initiation says otherwise.

**Platform Constraints** *(new in v1.5)* — stated explicitly rather than left implicit, since every section above already assumes it without saying so: **every project in scope runs exclusively on Google Apps Script, with Google Sheets as the Truth Layer.** Not a preference — every architecture decision in this document is made inside that box. Two consequences worth naming directly rather than rediscovering per-project:

1. **No multi-statement transactions.** Sheets has no equivalent of `BEGIN`/`COMMIT`/`ROLLBACK` across several `appendRow`/`setValues` calls. A Command that writes Truth, then an audit/history row, then publishes an event, is **three independent operations**, not one atomic unit — if the second or third fails after the first succeeds, the first has already happened and stays happened. "All-or-nothing" language in any project's Error Strategy is aspirational unless the project has actually built something (a pending-marker + reconciliation pattern, at minimum) to back it up — don't claim atomicity a Sheets-backed system doesn't structurally have. Property OS's Obligation Engine found this concretely (`999_Tests_PlatformVerification.js`, Failure Recovery category — a Command that writes Truth successfully but fails on the following History/Event step leaves the Truth write standing) — see Candidate Patterns below for the proposed response, not yet promoted to a binding rule here.
2. **No real concurrency primitives beyond `LockService`.** `LockService` serializes access within a script's own executions; it does nothing for two *different* GAS projects racing on the same shared Sheet (the Dependency Rules bullet above already implies this — a "dependency" on another project's Sheet has no locking coordination between the two projects at all, only within each one's own executions).

---

## 3. Contract Design

The real "public API" here is **Google Sheet schemas**, **Telegram command syntax**, and **`CONFIG.EVENT`** values.

**Schema Contracts**
- Append-only by default. New fields go at the end; a column position, once assigned, is never reused.
- Any schema change requires: **Schema Proposal → Migration Plan → Rollback Plan → Backward Compatibility Review** — the shape already proven for P17, now the required universal template whenever §0.3's trigger fires.
- Blank/undefined in a new column always means "no data for this record," never silently coerced to 0.

**Command Contracts**
- New commands are additive; new *arguments* to existing commands prefer optional `key:value` tokens over new required positional params (P17's `shop:`/`parts:`/`labour:`/`total:` pattern).
- Command routing order (longer prefixes before shorter) is a Contract-Design-level rule for any project with a text-command router.

**Event Contracts**
- `CONFIG.EVENT` values are append-only; a removed event is marked `[REMOVED]` in File_Map rather than deleted from the historical record.

**Cross-Project Contracts**
- Where two independently-deployed projects read/write the same sheet (Reminder OS polling a shared Tasks sheet), that sheet's schema gets the *strictest* version of this section.

---

## 4. Implementation

**Universal Coding Rules (UCR)** — the subset of Rider OS's CR1-CR13 that isn't Rider-OS-specific. Each project keeps its own locally-numbered CR series for domain-specific rules (RON95-only fuel, per-bike KM isolation stay in Rider OS's own Constitution).

- **UCR1** — IIFE module pattern for every file
- **UCR2** — Private functions prefixed `_`
- **UCR3** — Every public function wraps in try/catch → `AlertService.log(level, module, func, input, msg)` → user-facing error message
- **UCR4** — Date handling: always check `instanceof Date`; never `new Date(timeString)` or `` new Date(`${d}T${t}`) `` alone. (Directly traceable to Rider OS's BUG-2 — the "1899 date" / `NaN:31 AM` failure mode.)
- **UCR5** — Single calculation source (EP4 at implementation level)
- **UCR6** — Sheet appends go through the project's TruthEngine-equivalent, never a raw `sheet.appendRow()`
- **UCR7** *(new in v1.4 — promoted from two-project evidence, see Status above)* — **Infrastructure Adapter / Port isolation.** Domain-layer code (business logic, Commands, State Machines) never calls an external or shared infrastructure dependency directly — not the EventBus, not another project's connector, not a not-yet-finalized shared API. Every such dependency is collapsed into exactly one Adapter function that Domain code calls instead; the Adapter is the only code allowed to know the dependency's concrete shape. Two independent instances: Rider OS's TruthEngine (UCR6, Sheet writes) and Property OS's `publishPropertyEvent_()` (ADR-P07, EventBus). Consequence worth stating plainly: this is *also* the correct move when the dependency's real API simply isn't confirmed yet — write the Adapter, let its body be a logged placeholder, and keep the Domain logic behind it moving. Don't guess a signature to unblock development; isolate the unknown instead. When the real dependency is confirmed or changes shape later (including a full storage/transport swap), only the Adapter changes.

**File & Test Organization**
- Numbered-prefix-by-layer file naming, all `.js`
- Test files: `NN_Tests_<FeatureId>.js`, exposing `runAllXTests()`, each carrying its own **MANUAL VERIFICATION CHECKLIST** for the I/O-dependent half.

**AI Coding Rules**
- One feature fully closes (Implementation → Regression Test → Governance Update → Documentation Update) before the next starts — no parallel development of multiple large features.
- Every edit gets grep/read-verified against its own diff before being called done.

---

## 5. Validation

| Generic tier | Status | Where it lives |
|---|---|---|
| Unit Tests | ✅ Active | Pure-logic functions, `NN_Tests_<FeatureId>.js` |
| Regression Tests | ✅ Active | Explicit re-verification after every fix |
| Contract Tests | ✅ Active | Backward Compatibility Review (§3) |
| Migration Tests | ✅ Active | Migration Plan step 4 (§3, §6) |
| Scenario / Boundary / Acceptance | ~ Folded in | Manual verification checklist |
| Integration Tests | ❌ Deferred | Sheet/Telegram I/O verified manually — no heavy-mocking suite chasing 100% automated coverage |
| Performance / Security / Recovery Tests | ❌ Deferred | No current trigger on a single-user personal system — revisit if a real need appears (EP3) |

---

## 6. Release

**Versioning:**
- **MAJOR** — Constitution-level architecture change
- **MINOR** — a new Business_Rules principle/feature ships
- **PATCH** — same-day bug fix or sub-feature within a MINOR batch

**Migration/Rollback/Compatibility** = the P17 four-part template, required whenever §0.3's trigger fires.
**Release Checklist** = Definition of Production-Ready (§0.5).
**Change Log** = `00_Project_State.js`'s versioned `CHANGES` sections — required, not just habit.

---

## 7. Evolution

- **Deprecation, not deletion** — a deprecated function stays as a thin, tagged alias until an ecosystem-wide audit confirms zero remaining callers.
- **Tech debt register** — folds into `00_Project_State.js`'s `KNOWN BUGS` section, renamed `KNOWN BUGS + TECH DEBT`.
- **Module split/merge** — already happened once (Personal AI Core → Rider OS / Reminder OS / Productivity OS). `92_ReminderEngine.txt` (Reminder OS's actual current filename — not yet migrated to `.js`), flagged as possibly stale post-split, is a currently-open Evolution item worth closing under this framework.
- **Long-term roadmap** — per-project roadmap in each State file's `NEXT STEPS`; ecosystem-level roadmap in the Knowledge Base.

---

## 8. Review Framework

**Review Profiles (Tier 1 — defined now, real precedent):**

| Profile | Real precedent |
|---|---|
| Feature Review | Each P-numbered feature (P16, P20, P15, P17, P23-25) |
| Schema/Migration Review | P17 — the only sheet-schema-touching change so far |
| Full Audit Review | Personal AI Core's multi-round security/quality audit |
| Cross-AI Proposal Review | Recurring pattern of evaluating another AI's suggestions against actual code — including this document's own D1-D6 review |

Platform/Connector/Infrastructure/Storage/API/Security-as-its-own-profile etc.: **Tier 3, named, deferred** — zero precedent yet in a 3-project ecosystem. Defined for real the first time a review actually needs one.

**Checklist Library:** Separation of Concerns · Dependencies/Ownership · Contracts · Single-Source-of-Truth (DRY) · Documentation Drift · Architecture Drift · KISS/YAGNI · *(added)* "does this Constitution now contain business rules that should move to `00_Business_Rules.js`?"

**Review Workflow:**
```
Review Request → Profile Selection → Evidence Collection (empirical
code check, EP5) → Findings → Risk Assessment → Decision Matrix →
Disposition → Gate Decision → ADR (when disposition changes
architecture/contracts/dependencies) → Review History entry
```

**Risk Matrix v1** *(finalized in v1.0 — Decision D2)*

| Tier | Meaning | Criteria | Examples |
|---|---|---|---|
| **CRITICAL** | Stop immediately | Data loss · security breach · irreversible corruption · production failure · an incorrect financial/consequential transaction | A permanent core-data delete · a wrong trade in a future Investment OS · a wrong payment in a future Finance OS |
| **HIGH** | Must fix before continuing | Broken contract · wrong architecture dependency · backward-compat failure · migration with no rollback | P17-style schema change shipped without a rollback plan |
| **MEDIUM** | Can continue, must be logged | Technical debt · missing tests · documentation drift · performance concern | The `92_ReminderEngine.txt` stale-file question |
| **LOW** | Observe | Style issue · minor optimization | — |

CRITICAL is defined narrowly on purpose — if it's used for "big problems" generally, HIGH stops meaning anything.

**Decision Matrix** — Question → Options → Evaluation Criteria → Advantages → Disadvantages → Trade-offs → Recommendation → Decision → ADR. Required shape for any non-trivial call. D3 in the Decision Log below is the worked example.

---

## 9. Audit Framework

**Fields per finding**: Evidence · Risk Level (§8) · Recommendation · Priority · Owner (always Steven, solo dev — trivial today, kept for template consistency) · Verification (re-check after fix).

**Audit types actually used**: Security + Code Quality (Personal AI Core). Production Readiness (Rider OS, new — see below). Architecture / Governance / Data / AI / Compliance / Performance audits are named, available — not yet triggered.

**Production Readiness Audit Workflow** *(new in v1.2 — validated through Rider OS's first full run, not designed ahead of the evidence)*:
```
Per pending item: Automated tier check (already passing, confirmed
  once at audit start) → Manual checklist run → Bug found?
    → yes: ADR (Evidence/Impact per §0.7) + fix → re-verify the
      SAME item against the fix → clean? → item closes
    → no: item closes
  → next item → all items closed → Audit complete, Review History
    entry records the whole run
```
Ran for real across five items (Rider OS, 2026-07-20): 53 automated + 30 manual checks, three real bugs found this way and fixed (ADR-002, ADR-003, ADR-004) — each one in how a function was *called* against live state, not in logic the automated tier already covered. That gap is exactly why both tiers stay mandatory (§5) rather than treating passing unit tests as sufficient.

---

## Engineering Knowledge Base

**Failure Catalog**

| Lesson | Source |
|---|---|
| Never `new Date(timeString)` or `` new Date(`${d}T${t}`) `` alone in GAS | BUG-2, Rider OS — "1899 date" / `NaN:31 AM` |
| A module-local "last known X" lookup that only checks its own sheet will eventually be wrong | BUG-11, Rider OS — 622km false gap |
| Read the override source (e.g. a per-entity profile sheet) before the global config fallback | BUG-4, Rider OS |
| An append-key operation needs duplicate-key protection at the batch level, not just per-row | `batchUpsertRowsByKey_`, Personal AI Core |
| A checkpoint bypass on one status branch can silently skip validation other branches get | `_syncDailyShifts_`, Personal AI Core |
| A private helper used only internally still needs to be in the module's export list, or external callers (incl. test files) can't see it | `_getSessionRemainingMins`, Rider OS |
| A function meant to fire on one specific day via an automatic trigger, but also manually testable on any day, needs date math computed relative to whatever day it actually runs on — not a fixed offset that assumes the trigger day | ADR-003, Rider OS — P20's WeekStart showed the wrong date when manually tested on a non-trigger day |
| A "current record" selector that filters by a status flag needs that flag actively closed out on the superseded record when a new one is written, or more than one record can satisfy "current" at once | ADR-003, Rider OS — old weekly reward configs stayed marked active indefinitely |
| A rolling aggregate used to derive a smaller-scope target must exclude that smaller scope's own still-accumulating data, or progress-in-the-small silently shrinks the target-in-the-small | ADR-004, Rider OS — logging today's own orders was shrinking today's own daily target |
| Writing an ISO date string (`"2026-07-19"`) to a Sheet cell doesn't guarantee it reads back as that same string — Sheets can silently reinterpret it as a Date serial value, which breaks any string-equality check built on it (e.g. a `(parentId, dueDate)` idempotency key). Force the column to plain-text format (`'@'`) at sheet creation, and coerce defensively on read regardless | `ensureSheetSchema_`, Property OS — found before shipping, not from a live bug, while implementing `(ObligationID, EffectiveDue)` idempotency |

**Reference Architecture** — the proven layer stack (Truth → State → Event → Service → Observability → Operational Intelligence → Reminder → Intelligence-stub) is the default starting template for a new Domain OS project, unless Initiation documents a reason to deviate.

**Glossary** — *Truth Layer*, *Single Calculation Source*, *Domain Ownership*, *Documentation Drift*, *Append-only Contract* — defined once at ecosystem level, referenced from each project.

**Candidate Patterns** *(new in v1.4)* — patterns observed in exactly one project so far. Not ratified, not a UCR/EP, not binding on any other project. Held here on purpose rather than either silently folded into ratified content or silently dropped, per **D7**. Each promotes to ratified content the same way UCR7 just did — a second, independent project reaching the same conclusion on its own — or gets removed from this list if a second project's experience contradicts it instead.

| Candidate | Source | What would confirm it |
|---|---|---|
| **Event Immutability + Compensating Events** — a published domain event is never edited, overwritten, or deleted; a business correction (wrong amount recorded, etc.) is represented as a new event referencing the original, never a rewrite of it. Property OS's ADR-P06: a Paid→Active state transition exists *only* via a dedicated `ReversePayment` command that publishes a `PAYMENT_REVERSED` event — the general RecordPayment path can't reach it. | ADR-P06, Property OS — adopted proactively (Contract Design), not from a bug | Another project needing to correct a mistake in already-published event history, and reaching for the same shape independently |
| **Derived-state-over-scheduled-write for time-based status** (see EP4's new Property OS example above) — treated as a Candidate for whether it deserves to be a UCR of its own, not just an EP4 illustration; right now it's folded into EP4 rather than promoted separately | Property OS — Obligation Engine's Overdue status | A second project independently choosing query-time computation over a scheduled status-flip job for the same reason (avoiding a trigger, avoiding a second source of truth) |
| **Production Readiness Audit Template** — generalizing a project's Manual Verification Checklist into a reusable, ecosystem-wide starting template (copy it, swap in domain-specific rows) instead of every new Domain OS inventing its own from scratch | Proposed by Property OS's project owner, 2026-07-29, generalizing `property-os-tests/MANUAL_VERIFICATION_CHECKLIST.md` | A second project actually copying Property OS's template for its own audit, rather than writing an unrelated one independently |
| **Three named verification categories** — Replay Verification (post-replay state matches live state), Migration Verification (a migration is actually exercised, not just planned), Failure Recovery Verification (Lock/Retry/Partial Failure/Duplicate Command) — proposed as belonging in every Domain OS's audit, not just Property OS's | Proposed by Property OS's project owner, 2026-07-29; adopted locally immediately (ADR-P10) since a single project doesn't need ecosystem evidence to improve its own practice — only *binding every project* needs it | A second project's own audit independently reaching for the same three categories |
| **Partial-failure visibility (not full atomicity)** — given Platform Constraints above, a Command can't be made truly atomic on Sheets without real saga/reconciliation machinery, which is disproportionate at personal-project scale; the proposed middle ground is: order writes so the most-authoritative one lands first, and make every subsequent step's failure **loud and specifically labeled** (which Truth write is now possibly orphaned) rather than a generic error, so a human can reconcile a rare failure instead of it being either silently wrong or expensively engineered away | Property OS — the actual gap `999_Tests_PlatformVerification.js` found in `recordPayment` (2026-07-29) | A second project hitting the same gap and independently choosing loud-and-labeled over building full saga machinery (or choosing the opposite, which would be equally useful evidence) |

---

## Decision Log — D1-D6 (ratified 2026-07-18)

### D1 — Where does UEF physically live?
**Decision:** Independent docs-only directory, no GAS deployment, no project "imports" it — UEF governs, projects don't depend on it as code. Each project's Constitution gets a one-line pointer to it.

### D2 — Risk tiers
**Decision:** 4 tiers (CRITICAL/HIGH/MEDIUM/LOW) — full definition in §8. CRITICAL kept deliberately narrow so it doesn't dilute HIGH.

### D3 — Is `00_Business_Rules` mandatory or conditional? *(worked example, per §8's Decision Matrix)*
**Question:** Should every project be required to have `00_Business_Rules`, even nearly empty?
**Options:** (a) Mandatory everywhere · (b) Conditional — created once a project accumulates non-trivial domain/business logic distinct from architecture
**Advantages of (a):** every project looks identical on day one
**Disadvantages of (a):** an empty mandatory file on an infrastructure-shaped project is the exact speculative-design smell EP3 exists to prevent
**Advantages of (b):** matches what actually happened — Rider OS split it out organically, the moment it needed it
**Disadvantages of (b):** a project could accumulate business-shaped logic inside its Constitution for a while before anyone notices — mitigated by the new Checklist Library item (§8)
**Decision:** (b), conditional. Which project needs it, right now, isn't argued in the abstract — it's checked against actual code at that project's review.

### D4 — Retrofit history, or only enforce going forward?
**Decision:** Forward only. Rider OS's `00_ADR_Log.txt` starts at ADR-001 ("Adopt UEF"), not a reconstruction of past decisions. Backfilling a fake decision trail (e.g. writing "ADR-001: we decided to use EventBus" today, when no such formal process existed at the time) would pollute the governance record rather than document it. The 2026-07-14 governance review is well-documented enough in State's changelog to be worth copying into Review History as a first retroactive entry once that file is created; older history generally isn't.

### D5 — Rollout order
**Decision:** Pilot on Rider OS. Richest, most recent governance activity to validate against — event architecture, schema migration, business rules, testing, a live command interface, maintenance history. Personal AI Core and Reminder OS retrofit once it proves out.

### D6 — UEF Version Governance *(added this round)*
**Decision:** PATCH/MINOR/MAJOR scheme per §0.8. MAJOR changes require an ecosystem-level ADR; MINOR/PATCH don't.

### D7 — What to do with a new project's evidence that doesn't clear the promotion bar *(added in v1.4, per §8's Decision Matrix)*
**Question:** Property OS (first new project since the Rider OS pilot) surfaced several patterns during real Contract Design + Runtime work. One (Infrastructure Adapter) independently matches an existing Rider OS pattern — genuine two-project evidence. The rest (Event Immutability chief among them) are Property-OS-only. What happens to the ones that don't clear the bar?
**Options:** (a) Ratify everything now — Property OS is real, careful work, not a guess · (b) Ignore everything that isn't yet two-project-corroborated — stay strictly literal about v1.3's "Stable" commitment · (c) Record single-project patterns in a new, explicitly-not-ratified holding area, promote individually as each clears its own bar
**Advantages of (a):** nothing useful gets lost or delayed
**Disadvantages of (a):** exactly the failure mode v1.3's own headline said it was done repeating — one project's experience quietly becoming ecosystem doctrine
**Advantages of (b):** perfectly literal adherence to the stated bar
**Disadvantages of (b):** discards real, specific, well-reasoned engineering information (e.g. ADR-P06's reasoning) for no benefit — nothing is served by forgetting it happened
**Advantages of (c):** keeps ratified content's evidence bar meaningful while still writing the observation down somewhere findable; promotion path is identical to how UCR7 itself was just justified, so the mechanism is self-consistent
**Disadvantages of (c):** one more section to maintain; a candidate could sit unpromoted indefinitely if no second project ever exercises that code path
**Decision:** (c). New "Candidate Patterns" table in the Knowledge Base (above). A candidate is removed from the list the moment it either promotes (two-project match, folded into a UCR/EP like UCR7) or gets contradicted by a second project's different experience — it doesn't accumulate indefinitely as dead weight.

### D8 — `.txt` vs `.gs`: resolved same-day as v1.4 flagged it, not left open *(added in v1.5)*
**Question:** v1.4 surfaced a real conflict — this document's `.txt` default vs. Property OS's actual `.gs` files, both legitimate (one an ecosystem convention, one that project's owner's explicit instruction) — and deliberately didn't pick a side, per §8's own "no engineering decision by opinion alone" (EP6) and the Decision Matrix requirement it flagged for whoever *did* decide.
**Options considered:** (a) Property OS migrates to `.txt`, matching the existing ecosystem default · (b) UEF grants `.gs` an explicit, argued exception · (c) UEF's own default changes to something else entirely, and every project (including Property OS) eventually moves toward that
**Decision:** (c) — and specifically `.js`, not `.txt` or `.gs`. Made directly by Property OS's project owner, not derived by Claude from the options above — recorded here as the decision that was made, with the reasoning available being: `.js` gets native editor/tooling support (syntax highlighting, linting) that Google Apps Script's own `.gs` extension doesn't get outside the Apps Script Script Editor itself, while still being distinguishable from real ecosystem business logic by the numbered-prefix + `.js` convention rather than by extension alone. Whether this depends on a specific local-development pipeline (e.g. clasp, which conventionally works with local `.js` mapped to remote `.gs`) wasn't stated and isn't assumed here — that's an implementation detail of *how* `.js` gets into each live GAS project, orthogonal to *that* it's now the convention.
**Evidence:** Property OS's ten existing `.gs` files (already confirmed running against a live GAS project) were renamed to `.js` the same session as this decision — see that project's own `00_ADR_Log.js` and `00_Project_State.js` for the applied instance.
**Impact:** `.txt` was the default from UEF's first version; this is the first time it's changed. §0.2, §0.3, §4, §6, §7's file-naming mentions all updated. Rider OS / Reminder OS / Personal AI Core's real files are unaffected until each migrates on its own schedule (tracked under Evolution, §7) — this is a going-forward default, not a mass rename ordered from outside those projects.
**Next Steps:** Rider OS, Reminder OS, Personal AI Core each get a `.txt`→`.js` migration as an Evolution-tracked item, on their own timeline, not bundled into this document's version history further.
**Related ADRs:** Resolves the open item v1.4 surfaced hours earlier in the same day (a sibling conflict to D7, not a continuation of it).
**Review Trigger:** If a second project's actual tooling turns out to be incompatible with `.js` as a local/pushed file extension for Apps Script, revisit — this decision assumed compatibility rather than verifying it project-by-project.

### D9 — Platform Constraints: state it, don't just assume it; and how much to fix now *(added in v1.6)*
**Question:** Two related questions surfaced together. (1) Should "this ecosystem runs exclusively on GAS+Sheets, which has no multi-statement transactions" be written down explicitly, or left as the implicit assumption every section already makes? (2) Now that Property OS found a concrete instance (a Command whose Truth write can succeed while its History/Event steps fail, per `999_Tests_PlatformVerification.js`), how much engineering effort is warranted to address it?
**Options for (1):** (a) leave implicit — every section already behaves as if this is true · (b) state it explicitly once, in §2, so a future project doesn't have to independently rediscover it
**Options for (2):** (a) build real saga/reconciliation machinery for true atomicity · (b) do nothing, treat it as an accepted risk · (c) a middle response: order writes so the most-authoritative one lands first, make subsequent failures loud and specifically labeled (which record is now possibly orphaned), so a rare failure is a five-minute manual reconciliation instead of either a silent inconsistency or a disproportionate amount of saga-pattern engineering for a personal-scale project
**Decision:** (1b) — stated explicitly, §2 Platform Constraints. (2c) — proportionate response, not full atomicity machinery. Reasoning for (2c) specifically: the failure mode requires a transient Sheets API error landing in a narrow window between two specific calls, on a personal-scale, low-request-volume project — genuinely rare. Building real saga/compensating-transaction machinery for that is a worse trade than making the rare case loud and manually recoverable. This is the same "Deferred — no current trigger on a single-user personal system" reasoning already used for Performance/Security/Recovery Tests in §5's Validation table, applied consistently rather than invented fresh for this case.
**Impact:** §2 Architecture gains the Platform Constraints subsection. Property OS's own fix (loud, labeled logging on post-Truth-write failure) is tracked in its own governance, not specified here — UEF states the constraint and the general shape of a reasonable response; the actual code is each project's own.
**Review Trigger:** If this failure mode is ever observed for real (not just in an injected-fault test), revisit whether (2c) is still sufficient or whether real transaction-like machinery has become worth it.

---

## Format note

This document is Markdown, not the `.js`-comment-block style project-level meta docs use. Deliberate, not drift: `00_Project_Constitution.js` etc. live inside each GAS project, wrapped in `/* */` so they sit alongside real code inside the Script Editor. UEF doesn't need to — governance docs only, no runtime code — so it doesn't inherit that constraint. All project-level governance files, and any other file this framework produces for a specific project, use `.js`, never `.txt`, as of v1.5 (D8) — reversing v1.0-v1.3's `.txt` default.

## What this rollout did and did not do

- Did not touch the Universal Domain OS Blueprint's content — §2 is process-only.
- Did not write any implementation code, migration script, or module file.
- Did not retroactively rewrite any existing governance file.
- Did not fully specify the deferred Review Profiles or Validation tiers — zero real precedent yet, so they stay named and available (EP3).
- Did produce two adoption ADRs (`UEF_ADR_Log.md`, `00_ADR_Log.txt`) as the concrete first application of §0.7, then refined the template itself (Impact/Next Steps split, Review Date → Review Trigger, Related ADRs added) after review, before treating either as locked — a same-day v1.0 → v1.1 MINOR bump.
- Did not yet run Rider OS's first UEF Review, backfill its Review History, or start its Production Readiness Audit — proposed as the next step, not started here.

### v1.4 pass (2026-07-29)

- Did promote one pattern (Infrastructure Adapter / Port isolation) to UCR7, on genuine two-independent-project evidence (Rider OS's TruthEngine + Property OS's ADR-P07).
- Did add one Knowledge Base Failure Catalog entry (Sheets date-to-serial coercion) and one EP4 illustration (derived-state-over-scheduled-write), both from Property OS.
- Did create the Candidate Patterns mechanism (D7) specifically so single-project evidence has somewhere honest to go that is neither silent promotion nor silent loss.
- Did **not** resolve — as of the v1.4 pass — the `.txt` vs `.gs` conflict it surfaced. Resolved the same day, in v1.5: see D8. §0.2, §0.3, §4, §6, §7's file-naming mentions all updated to `.js`; the format note above updated to match.
- Did not run any project's Review or Audit this pass — Property OS is nowhere near ready for one (no Test Plan executed yet), and Rider OS's first Review is still the standing next step from v1.0.

### v1.5 pass (2026-07-29, same day as v1.4)

- Did resolve D8 (`.txt` → `.js` as the ecosystem default) directly on its project owner's decision, hours after v1.4 flagged it as open. Updated every going-forward template/convention reference in this document accordingly; left specific, already-existing files' actual current names alone (Rider OS's and Reminder OS's real files are still `.txt` until each separately migrates — EP5, don't misstate what a file is currently named).
- Did confirm Property OS's own ten files renamed `.gs` → `.js` the same session, including internal cross-references between them.
- Did not touch Rider OS, Reminder OS, or Personal AI Core's actual files — their migration is a separate, each-on-its-own-schedule Evolution item, not something this document does on their behalf.

---

Next, unchanged from before this pass:

Rider OS's first full UEF Review (Review Framework, §8) — evidence collection against the live project, findings, risk assessment, disposition, then backfilling Review History and starting the Production Readiness Audit that closes out P16/P20/P15/P17's `pending` status. Still the standing next step from v1.0, still not started, still substantive enough to be its own pass.

Property OS's own next step (Test Plan → 910 → 914, per its own project owner) lives in its project-level State file, not here — this document tracks the ecosystem-level threads only.
