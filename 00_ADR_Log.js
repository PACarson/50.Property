/**
 * ═══════════════════════════════════════════════════════════════════════
 * PROPERTY OS — 00_ADR_Log.js
 * Architecture Decision Records
 * ═══════════════════════════════════════════════════════════════════════
 *
 * 每条 ADR 依 UEF Decision Matrix 格式：
 * Question → Options → Evaluation Criteria → Advantages → Disadvantages
 * → Trade-offs → Recommendation → Decision
 *
 * STATUS: Architecture Review Approval GRANTED (2026-07-19)。
 * ADR-P01/P02/P04/P05 APPROVED，ADR-P03 RESERVED，ADR-P06/P07 新增
 * APPROVED。Obligation Engine Vertical Slice 通过审核，作为 Session 1
 * Runtime 的基准规范。Foundation 层（900-903）APPROVED，含
 * publishPropertyEvent_() 作为 ADR-P07 的 Infrastructure Adapter。
 *
 * 本文件不包含任何可执行逻辑，仅为治理文档。
 * ═══════════════════════════════════════════════════════════════════════
 */


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADR-P01 — Obligation Engine 为唯一真相来源
// STATUS: APPROVED (2026-07-19)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// Question: Recurring Obligation（房贷/水电/管理费/地税/保险等）的
//   Due Date 与 Schedule 应该由谁拥有？
//
// Options:
//   A) 独立 Obligation Engine 拥有 Schedule；Finance Engine 只订阅事件
//   B) Finance Engine 直接拥有所有收支含 Schedule
//   C) 两者各自维护一份 Schedule（快取/冗余）
//
// Evaluation Criteria: 单一真相来源、未来扩充性、与 Reminder OS 整合
//   难易度、Anomaly Detection 所需资料完整性
//
// Advantages (A): 符合 P3 Single Owner；未来新增 Obligation 类别
//   不影响 Finance Engine；AI Anomaly Detection 可直接对 Obligation
//   领域建模，不需从 Ledger 反推
// Disadvantages (A): 多一层事件订阅的间接性；Finance Engine 的
//   Cashflow 计算需等待事件传播（非同步查询 Obligation 表）
//
// Trade-off: 接受些微的最终一致性延迟，换取长期可维护性与不重复造轮子
//
// Decision: 采用 Option A。
//   Obligation Engine 是所有 Recurring Obligation 的 Single Source of
//   Truth，范围包括：Mortgage, Electricity, Water, Maintenance Fee,
//   Sinking Fund, Quit Rent, Assessment, Insurance, Internet,
//   Subscription, Pest Control, Aircond Service, Water Filter,
//   Rental Collection, Lease Renewal, Warranty, Defect Liability。
//   Finance Engine 不允许维护 Due Date、Reminder Schedule 或 Payment
//   Schedule，只能订阅 Obligation Event 建立 Ledger。系统中不得出现
//   第二份 Schedule。


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADR-P02 — Reminder 全部委派 Reminder OS
// STATUS: APPROVED (2026-07-19) — Contract 待与实际 API 核实
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// Question: Property OS 如何为 Obligation 建立到期提醒？
//
// Options:
//   A) Property OS 自建 GAS Trigger 逐一排程
//   B) Property OS 只 Publish ReminderRequest Event，Reminder OS
//      负责所有排程/通知实现
//   C) Property OS 呼叫 ReminderConnector 的同步 API 直接建立提醒
//
// Evaluation Criteria: GAS 20-trigger 硬配额、P4 Composition over
//   Duplication、Reminder OS 既有 Offset Reminder Engine 的可复用性
//
// Advantages (B): 完全避开 trigger 配额问题；Property OS 不需要知道
//   通知渠道（Telegram/Email/Future Push/Future Calendar）如何实现；
//   Reminder OS 的 Offset Reminder Engine（30/14/7/3/1/Due/
//   Overdue+1/3/7）与本需求高度吻合，直接复用
// Disadvantages (B): Property OS 对"提醒是否真的送达"没有可见度；
//   需要额外确认 ReminderConnector 是否已支援跨 OS 的 Entity 注册
//
// Trade-off: 放弃对 Reminder 送达的直接控制权，换取零 Trigger 配额
//   风险与零重复实作
//
// Decision: 采用 Option B。
//   Property OS 不允许建立任何 Trigger，不允许自行实现 Reminder
//   Scheduler。Property OS 只 Publish ReminderRequest Event。Reminder
//   OS 负责 Offset Reminder、Notification、Telegram、Email、Future
//   Push、Future Calendar。Property OS 不知道 Reminder 如何实现。
//   ReminderConnector 作为唯一接口。
//
// ⚠ 未决事项（非本 ADR 范围，需另行核实）：
//   ReminderConnector 目前是否已满足"代表其他 OS 的 Entity 注册跨 OS
//   Reminder"这一具体能力，需 CC 对照 Reminder OS 实际代码核实。若
//   尚未满足，ObligationEngine_VerticalSlice.md §6 的 Reminder
//   Contract 即为需要新增的规格。
//
// ── ADR-P02 Addendum (2026-07-19, Review Approval) ──────────────────
// 两项由 Vertical Slice 设计阶段提出、原标记 [NEEDS CONFIRMATION] 的
// 延伸问题，本次一并拍板：
//
//   1. Overdue 判定 → CONFIRMED as Derived State。
//      Overdue 不写入 Truth Layer，不是存储状态；Reminder OS 依它
//      已持有的 DueDate/offsets 自行产生逾期通知，不要求 Property OS
//      维护或宣告 Overdue 状态。（这是 ADR-P02"不建任何 Trigger"原则
//      的直接延伸——若要求 Property OS 写入 Overdue 状态，就必须有
//      排程去侦测"现在是否该转 Overdue"，与 ADR-P02 矛盾。）
//
//   2. Reminder Cancellation 责任 → CONFIRMED 归 Reminder OS。
//      Occurrence 变成 Paid/Cancelled 后，"取消尚未触发的提醒"由
//      Reminder OS 自行订阅 PAYMENT_COMPLETED 等事件处理；Property OS
//      不发布额外的取消事件，不承担取消逻辑。


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADR-P03 — File Number Range
// STATUS: MODIFIED (2026-07-19) — Reserved，非 Locked
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// Question: Property OS 的 GAS 文件应使用哪个号段？
//
// Options:
//   A) 现在就精确核对全局 File Map registry 并正式锁定号段
//   B) 先标记 Reserved Range，待未来 Ecosystem Registry 统一确认时
//      再正式 Assign
//
// Decision: 采用 Option B（CC 明确指示不要正式锁定）。
//   Reserved Range：900-949。File Map 已更新反映此状态。正式 Assign
//   需等待跨 OS 的 Ecosystem Registry 统一盘点，不在 Property OS 自己
//   的范围内单方面决定。


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADR-P04 — Every Payment Must Generate Event
// STATUS: APPROVED (2026-07-19) — NEW
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// Question: 付款记录（任何 Obligation 类别）应如何写入系统？
//
// Decision: 任何付款（Mortgage/Electricity/Water/Maintenance/
//   Insurance/Quit Rent/Assessment/Internet/Rental Deposit 等）不得
//   直接修改 Truth Layer。必须遵循：
//     Payment Completed → Publish Event → Finance Engine → Dashboard
//     → Audit → Analytics
//   所有付款必须 Event Driven，无例外。
//
// 落地说明：Audit 阶段由 EventBus 的持久化事件日志 ＋ Obligation
//   Engine 自身的 ObligationHistory 表（append-only）共同实现，两者
//   皆已在 Vertical Slice 中定义，不需要额外新建 Audit 子系统。


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADR-P05 — Property OS 不主动 Poll 外部系统
// STATUS: APPROVED (2026-07-19) — NEW
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// Question: Property OS 如何取得银行/电力/水务等外部账单资讯？
//
// Decision: Property OS 不主动轮询 Bank、TNB、Air Selangor、
//   Management Office、Government 等外部系统。未来统一采用 Manual
//   Input、Email OCR、PDF OCR、API、Import 等被动摄入方式，统一转换为：
//     UTILITY_BILL_RECEIVED → OBLIGATION_UPDATED → Reminder → Finance
//     → Dashboard
//   保持 Event Driven 一致性。本 ADR 影响 945_DocumentImportAdapter 与
//   946_BankReconciliationAdapter（皆为 Phase 5 Deferred，仅预留接口）。
//
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADR-P06 — Event Immutability
// STATUS: APPROVED (2026-07-19) — NEW
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// Question: 当业务需要修正/撤销一笔已发布的 Domain Event 所代表的事实
//   （例如：RecordPayment 时金额输入错误），系统应该怎么处理？
//
// Options:
//   A) 直接修改/覆盖原 Event 的内容
//   B) 删除原 Event，重新发布一笔"正确"的
//   C) 原 Event 永久保留、不可变，另外发布新的 Compensating Event
//      表示修正（例：PAYMENT_REVERSED）
//
// Evaluation Criteria: Audit Trail 的可信度（ADR-P04 的 Audit 环节
//   依赖事件历史真实不可篡改）、Replay Test 的正确性、未来出现财务
//   纠纷时的可追溯性
//
// Advantages (C): 事件日志本身就是不可辩驳的历史记录；Replay 永远
//   得到与当时一致的结果；修正本身也留下痕迹（何时改、改了什么、
//   为何改），而非"事后让历史看起来从来没错过"
// Disadvantages (C): 需要额外设计 Compensating Event 与对应 Command；
//   查询"当前有效值"时需要考虑原始 Event + 后续 Compensating Event
//   的叠加效果，比直接读一个字段复杂
//
// Trade-off: 接受查询逻辑上的额外复杂度，换取 Audit Trail 的绝对
//   可信——这对一个会被用来做财务决策、税务记录的系统是必要的代价
//
// Decision: 采用 Option C。
//   所有 Domain Event 一旦发布，不可修改、覆盖或删除。业务修正必须
//   以新的 Compensating Event 表示。
//
// 落地影响（Obligation Engine 层级，已同步进
//   ObligationEngine_VerticalSlice.md）：
//   - 新增 Command：ReversePayment
//   - 新增 Event：PAYMENT_REVERSED（引用原 PAYMENT_COMPLETED 的
//     eventId，不删除、不修改原事件）
//   - State Machine 新增唯一例外：Paid → Active，且仅能透过
//     ReversePayment 这个明确、独立、留痕的 Command 触发，一般的
//     RecordPayment 流程仍不能逆转 Paid 状态
//   本原则（P10）适用于 Property OS 内所有 Engine，不限于 Obligation
//   Engine——未来任何 Engine 设计 Event 时都必须遵守。


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADR-P07 — Infrastructure Adapter Pattern (Port for EventBus)
// STATUS: APPROVED (2026-07-19) — NEW
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// Question: Property OS's Domain Layer needs to publish events, but
//   Personal AI Core's Shared EventBus API is not yet finalized, and the
//   underlying implementation may itself change over time (Google
//   Sheets → Firestore → SQLite → Cloud Run → Kafka). How should Domain
//   code depend on it?
//
// Options:
//   A) Each Engine (912, 913, 914, 915, ...) calls the EventBus directly
//      wherever it needs to publish
//   B) A single dedicated Adapter function is the only code in Property
//      OS allowed to know about the EventBus's concrete implementation;
//      every Domain-layer function (Engine/Command/State Machine/
//      Business Rules) calls only the Adapter, never the EventBus
//      directly
//
// Evaluation Criteria: coupling surface when the EventBus implementation
//   changes; ability to keep developing Property OS Domain logic before
//   the Shared EventBus API is finalized, without guessing; consistency
//   with Ports & Adapters (Hexagonal Architecture); blast radius of a
//   future storage/transport migration
//
// Advantages (B): Domain Layer is fully decoupled from the EventBus's
//   concrete implementation; a future migration touches exactly one
//   function; Property OS Runtime can be developed now even though the
//   Shared EventBus API isn't finalized, without risking a wrong guess
//   baked into a dozen call sites
// Disadvantages (B): one extra layer of indirection; the Adapter itself
//   still needs real wiring eventually — this defers that work, it
//   doesn't eliminate it
//
// Trade-off: accept a thin indirection layer now, in exchange for zero
//   coupling to an API that is explicitly still in flux at the Personal
//   AI Core level — this defers a real dependency risk rather than
//   papering over it with a guess
//
// Decision: 采用 Option B。
//   Domain Layer（Engine / Command / State Machine / Business Rules）
//   永远不知道 EventBus 的具体实现。唯一允许知道的地方是
//   `publishPropertyEvent_()`（903_PropertyEventDefinitions.js）。在
//   Personal AI Core 的 Shared EventBus API 最终固定之前，这个函式的
//   内部实作合理地维持为 Logger 占位——这是正确做法，不是未完成。
//   API 固定后，只需要改这一个函式的内部，912/913/914/915 及未来所有
//   Engine 完全不用动。
//
// 适用范围：本原则不限于 EventBus——未来任何"目前实作细节可能被
//   Personal AI Core 整体替换"的基础设施依赖（例如 Sheet 存取方式、
//   LockService 包装），都应比照同一模式：收敛到单一 Adapter，Domain
//   Layer 只呼叫 Adapter。
//
// Note: 本 ADR 是对既有设计的正式追认——`publishPropertyEvent_()` 在
//   Foundation 层 Runtime 交付时已经是这个形状，本 ADR 把它从"Claude
//   的判断"提升为"正式架构原则"，供未来所有 Engine 遵循。


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADR-P08 — File Extension: .gs → .js (adopts UEF D8)
// STATUS: APPROVED (2026-07-29) — NEW
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// Question: Property OS's governance and Runtime files were .gs from
//   Session 0 (CC's own explicit instruction). Reading UEF v1.3 surfaced
//   a conflict — UEF mandated .txt for all project-level governance
//   files, matching Rider OS/Reminder OS/Personal AI Core's existing
//   convention, contradicting Property OS's .gs. Which one moves?
//
// Decision: Neither, directly — UEF's own default changed instead. Per
//   UEF v1.5 D8, CC decided the ecosystem-wide default becomes .js (not
//   .txt, not .gs). Property OS adopts this immediately: all ten
//   existing files renamed .gs → .js this session, including every
//   internal cross-reference between them (Constitution/State/File Map/
//   ADR Log referencing each other by name, and the two Vertical Slice/
//   Domain Model .md companion docs' own references).
//
// Full reasoning lives in UEF's own D8 entry (Universal_Engineering_
// Framework, v1.5) — not duplicated here (EP4/P6: one source of truth).
// This entry exists so Property OS's own ADR Log has its own record of
// adopting an ecosystem-level decision, per UEF §0.7's stated pattern
// for project-level logs.
//
// Impact: File extension only — zero logic changes. Verified: all ten
//   .js files still parse as valid JavaScript after the rename (node
//   --check), and no stray .gs references remain anywhere in the
//   project directory, including inside file-header self-references and
//   the two .md companion docs.

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADR-P10 — Local Adoption of Three Platform Verification Categories
// STATUS: APPROVED (2026-07-29) — NEW
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// Question: CC proposed three verification categories as platform-level
//   (applicable to every Domain OS): Replay Verification, Migration
//   Verification, Failure Recovery Verification (Lock/Retry/Partial
//   Failure/Duplicate Command). Should Property OS adopt these now, and
//   should they go straight into UEF as binding on every project?
//
// Decision: Property OS adopts all three **locally, immediately** —
//   see `property-os-tests/tests/999_Tests_PlatformVerification.js`.
//   A single project doesn't need ecosystem-wide evidence to improve
//   its own practice. Promoting them into UEF itself as binding on
//   every Domain OS is a **separate** question, gated by UEF's own
//   D7/D8 evidence bar (two independent projects, or an explicit
//   Decision Matrix override) — not decided here. Recorded as a new
//   Candidate Pattern entry in UEF v1.5's own table instead of being
//   folded into ratified content, for the same reason D7 exists: good
//   ideas still need the evidence UEF itself requires before they bind
//   every current and future project.
//
// Evidence (2026-07-29, this session): Running these tests immediately
//   surfaced a real, previously-undocumented gap — see TECH DEBT and
//   00_Review_History.js REVIEW-001 addendum. Not a hypothetical
//   benefit; the Failure Recovery category found something on its
//   first run.
//
// Impact: `999_Tests_PlatformVerification.js` added to the Node
//   sandbox (7 tests). `property-os-tests/README.md`'s file table
//   should be updated to list it (see File Map). No Runtime code
//   changed by this ADR itself — the finding it surfaced is tracked
//   separately, fix/defer decision not bundled into this entry.
//
// Related ADRs: Same underlying discipline as ADR-P07/D7/D8 — good
//   proposals get a place to live (local adoption + UEF Candidate
//   entry) without silently lowering the evidence bar for what counts
//   as ratified, cross-project UEF content.
//
// Addendum (2026-07-29, later same day): the file this ADR references
//   (`999_Tests_PlatformVerification.js`) was a Node-sandbox file that
//   no longer exists — CC directed the whole project to pure GAS-native
//   code, and property-os-tests/ was removed entirely. The same test
//   coverage now lives in `994_Tests_ExtendedPlatform.js`. This ADR's
//   actual decision (local adoption of the three categories; Candidate
//   Pattern, not ratified UEF content) is unchanged — only the file
//   path is stale. Left as-is rather than edited, per this project's
//   own convention that ADR entries are a record of the decision made
//   at the time, not a living pointer kept in sync with every rename.


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADR-P11 — PropertyType Enum Naming: Deliberate UPPER_SNAKE_CASE Exception
// STATUS: APPROVED (2026-07-29) — NEW
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// Question: 910's PropertyType enum was approved (Review Approval,
//   2026-07-29) as UPPER_SNAKE_CASE (`RESIDENTIAL_CONDO`, `COMMERCIAL`,
//   ...). Every other enum in Property OS so far — Category, Status
//   (both Rule and Occurrence), FrequencyType, FreeholdLeasehold — is
//   PascalCase (`'Mortgage'`, `'Active'`, `'Monthly'`, `'Freehold'`).
//   Flag the inconsistency, or silently normalize PropertyType to match?
//
// Decision: Flag it, don't silently normalize. PropertyType stays
//   UPPER_SNAKE_CASE — CC's explicit instruction at Review Approval,
//   not something to second-guess or quietly "fix" into consistency.
//   Recorded here specifically so a future reader (human or AI) finds
//   the reason on purpose rather than assuming it's drift or an
//   oversight. This ADR does not retroactively change Category/Status/
//   FrequencyType/FreeholdLeasehold to match — those already have real
//   data in CC's live spreadsheet (912/913 have been running since
//   2026-07-19); changing an already-deployed enum's on-disk string
//   values would be a breaking data migration, not a naming preference,
//   and is out of scope for a brand-new Engine's design decision.
//
// Evidence: N/A — single, explicit instruction from the project owner,
//   not a pattern requiring cross-project evidence (unlike UEF-level
//   promotions, which is a different question this ADR isn't about).
//
// Impact: `900_PropertyConfig.js`'s `PROPERTY_TYPES` array is
//   UPPER_SNAKE_CASE; every other enum array in that file stays
//   PascalCase. `PropertyAssetEngine_VerticalSlice.md` §1 carries the
//   same flag inline.
//
// Related ADRs: None directly — this is a one-off naming decision, not
//   an architecture pattern in the ADR-P01~P10 sense.


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADR-P12 — Finance Engine Stays Event-Driven; EventBus Gap Is
// Infrastructure, Not Architecture (Review Decision)
// STATUS: APPROVED (2026-07-29) — NEW
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// Question: Claude flagged a genuine tension before starting 914's
//   Vertical Slice: ADR-P01 requires Finance Engine to only subscribe
//   to Domain Events, never poll or directly read another Engine's
//   Truth Layer — but the real EventBus (ADR-P07) is still a Logger
//   placeholder with no actual pub-sub dispatch. Does 914 (a) get built
//   assuming a real subscription mechanism that doesn't exist yet, (b)
//   get a temporary direct call from 912/910 into Finance as a
//   documented shortcut, or (c) something else?
//
// Decision: (a), explicitly — this is an Architecture Decision, not a
//   Runtime one. ADR-P01 is unchanged: Finance Engine subscribes to
//   Domain Events, builds the Ledger, computes Cashflow, provides
//   Analytics; it does not read/write other Engines' Truth Layers and
//   does not maintain its own schedule, regardless of EventBus's
//   current state. The missing piece (a real dispatch mechanism) is
//   Platform Infrastructure, governed by ADR-P07's existing Adapter
//   pattern — the same pattern already isolates `publishPropertyEvent_`
//   from EventBus's real implementation; a mirror-image
//   `subscribeFinanceEvent_()` Adapter is added for the consuming side,
//   equally permitted to be a placeholder for now. 914's actual
//   Runtime logic (the part that decides what a PAYMENT_COMPLETED event
//   *means* for the Ledger) is written against the event *shape*, not
//   against how it arrives — when the real Shared EventBus exists, only
//   the Adapter is replaced; Finance Engine's Runtime does not get
//   rewritten.
//
// Principle (stated directly by CC, kept verbatim as the clearest
//   summary): "Platform 未完成，不应改变 Domain。Infrastructure 可以
//   Placeholder。Architecture 不允许 Placeholder。" (An incomplete
//   Platform should not change Domain design. Infrastructure may be a
//   placeholder. Architecture may not be.)
//
// Ecosystem-level direction (recorded here, elaborated in UEF v1.7 —
//   see there for the full note): EventBus should eventually be an
//   independent Platform Capability shared by every Domain OS (Property,
//   Finance, Reminder, Investment, News, Health, ...), not something
//   each project builds its own version of. Every Domain OS talks to it
//   only through its own Adapter (`publishXEvent_`/`subscribeXEvent_`
//   pair), so a future swap of the underlying transport (Sheets →
//   Firestore → Pub/Sub → anything else) touches only Adapters, never
//   Domain Runtime. This is CC's stated direction for Personal AI
//   Core's architecture, not yet built — recorded as intent, not
//   claimed as already-proven the way a ratified UCR would be.
//
// Impact: 914_FinanceEngine's Vertical Slice proceeds on this basis —
//   full Contract Design (Business Rules through Architecture Review),
//   with `subscribeFinanceEvent_()` explicitly named as a permitted
//   placeholder Adapter, same tier as `publishPropertyEvent_()`. Real
//   EventBus wiring, real cross-OS subscription, and real Reminder
//   integration stay explicitly out of scope for 914's Runtime until
//   the Shared EventBus API is fixed.
//
// Related ADRs: ADR-P01 (unchanged, reaffirmed), ADR-P07 (pattern
//   extended to the consuming side via subscribeFinanceEvent_()).


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADR-P13 — Event Completeness Principle; Reversal Is Its Own
// TransactionType (Review Decision)
// STATUS: APPROVED (2026-07-29) — NEW
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// Question: Two related open items from 914's Vertical Slice §12.
//   (1) Finance Engine needs each Obligation payment's Category to
//   build a correct Ledger entry — does it get this via a read-only
//   `getObligation()` call into 912, or does the event itself carry it?
//   (2) A `PROPERTY_SALE_REVERSED` event's Ledger effect was originally
//   modeled as an `Expense` entry offsetting the original `Income` —
//   is that the right semantic, or does a reversal deserve its own
//   category distinct from ordinary Expense?
//
// Decision (1): The event carries `category` directly. `PAYMENT_
//   COMPLETED`/`PAYMENT_REVERSED` (903_PropertyEventDefinitions.js)
//   both now require it; 912's `recordPayment`/`reversePayment` supply
//   it from `rule.Category`, already in scope — no new lookup added
//   anywhere. Reasoning, stated as a named platform principle:
//
//   **Event Completeness Principle** — a Domain Event should carry the
//   stable business data its known consumers need to complete their
//   own work, rather than requiring them to call back into the
//   publisher's Truth Layer or read API. This is not just about one
//   fewer function call: a read-only query still couples the consumer
//   to the publisher's process. If Property OS's Engines are ever split
//   into separate GAS deployments — which is already how other Domain
//   OS projects in this ecosystem are structured — a direct call like
//   `getObligation()` from 914 into 912 wouldn't be possible at all,
//   while an event payload carrying `category` works identically either
//   way. Building against the event's complete shape now costs nothing
//   and avoids a real architectural dead-end later.
//
// Decision (2): `PROPERTY_SALE_REVERSED` (and `PAYMENT_REVERSED`) both
//   produce a Ledger entry with `TransactionType='Reversal'` — a fourth
//   enum value alongside `Income`/`Expense`/`Adjustment`, not an
//   `Expense`-tagged offset. A reversal is not a cost and not revenue;
//   it is its own kind of fact (an undone prior transaction). Collapsing
//   it into `Expense` would corrupt future RPGT/capital-gains analysis,
//   which needs "a sale happened" and "a sale was undone" as distinct,
//   separately visible events, not netted into a single cost line.
//   `queryCashflowSummary` (914's Query Contract) still nets correctly
//   by looking up what each `Reversal` entry reverses and adjusting
//   that entry's original bucket — precision in the Ledger's own
//   semantics didn't cost correctness in the aggregate query.
//
// Impact: `903_PropertyEventDefinitions.js` — `category` added to
//   `PAYMENT_COMPLETED`/`PAYMENT_REVERSED` required fields.
//   `912_ObligationEngine.js` — `recordPayment`/`reversePayment` both
//   updated to supply it. `FinanceEngine_VerticalSlice.md` — §1/§3/§4/
//   §5/§6/§7/§12 updated throughout (4-value `TransactionType`, no
//   separate `IsReversal` boolean, `findLedgerEntryToReverse_` lookup
//   mechanism specified). UEF gains a stated-direction note for the
//   Event Completeness Principle, same tier as the EventBus-as-
//   Platform-Capability note (D10) — CC's direction for this ecosystem,
//   not yet claimed as two-project-evidenced.
//
// Related ADRs: ADR-P12 (this decision strengthens it — Finance Engine
//   now has zero cross-Engine calls, not even read-only), ADR-P06/P10
//   (Reversal-as-new-Aggregate-instance is the same Event Immutability
//   pattern, now with a more precise TransactionType for it).


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADR-P14 — Pause 914, Build the Operator Console First
// (Development Order + onOpen()/Trigger Clarification + Dashboard
// Adapter Pattern — Review Decision)
// STATUS: APPROVED (2026-07-29) — NEW
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// Question: 912/913/910 are Runtime-complete and real-GAS-confirmed
//   (141/141). The only way to use any of it today is opening the
//   Script Editor and hand-writing a full input object literal per
//   Command call — real friction for genuine daily use. Continue
//   straight to 914_FinanceEngine Runtime (more Engine capability), or
//   pause and build a usable interface first (real usage feedback)?
//
// Decision: Pause 914. Build a lightweight, daily-usable UI — named
//   **"Operator Console"** (not "MVP UI"/"Sidebar" — CC's naming
//   direction: every future Domain OS will eventually have one of
//   these, e.g. Rider OS Operator Console, Finance OS Operator Console,
//   so a consistent name across the ecosystem matters more than a
//   one-off descriptive label). Built on GAS's native HtmlService +
//   Sidebar — no new framework, no architecture change. The Console
//   calls existing Commands via `google.script.run`; it never writes a
//   Sheet directly and never bypasses the Domain Layer. Explicitly not
//   held to Vertical Slice / full Governance rigor — CC's stated MVP
//   principle: "不是 Architecture。不是 Feature Complete。而是 Real
//   Usage Feedback" (not Architecture, not feature-complete, but real
//   usage feedback) — while still required to respect Constitution,
//   Truth Layer boundaries, and every existing ADR. Speed of *iteration*
//   is what's being optimized, not permission to bypass Domain Commands.
//
// onOpen() clarification (so this doesn't read as contradicting
//   ADR-P02 to a future reader): ADR-P02 prohibits **Time-based and
//   Installable Triggers** — autonomous, schedule-driven execution with
//   no human present, which is Reminder OS's territory, not Property
//   OS's. `onOpen(e)` is a **Simple Trigger** — it only fires when a
//   human is actively opening the spreadsheet in their browser, used
//   here solely to add a custom menu entry ("Property OS" → "Open
//   Operator Console"). This is UI Bootstrap bound to live user
//   interaction, categorically different from a Scheduler. Does not
//   violate ADR-P02.
//
// Dashboard Adapter pattern (Query-side counterpart to ADR-P07's
//   publish-side Adapter): the Operator Console's Dashboard view needs
//   a monthly-expense total, which doesn't exist as a real aggregate
//   yet (914's Ledger isn't built). Rather than have the Console query
//   `ObligationOccurrence` directly — which would need editing the moment
//   914 exists — a new function, `getMonthlyExpenseSummary()`
//   (`922_DashboardAdapter.js`), sits between them. MVP implementation:
//   aggregates `ObligationOccurrence.PaidAmount`/`PaidDate` directly
//   (Current Source, documented in the function's own header comment).
//   Once 914 exists: only this function's *internal* implementation
//   changes to query the Ledger instead (Target Source, same comment).
//   The Operator Console's calling code never changes — it only ever
//   knew about `getMonthlyExpenseSummary()`, never about where the
//   number actually came from. Same Adapter-isolation discipline as
//   ADR-P07, applied to a Query instead of a publish.
//
// Ecosystem-level direction (recorded here, elaborated in UEF — see
//   there for the full note): every future Domain OS should follow
//   **Governance → Vertical Slice → Runtime → Operator Console → 2-4
//   weeks real usage → next batch of Engines**, rather than building
//   every Engine before any UI exists. CC's stated reasoning: this is a
//   personally-used system, not software being shipped externally —
//   real usage surfaces which fields are unnecessary, which flows are
//   annoying, which reminders fire at the wrong time, far faster and
//   more reliably than continued design-and-build without anyone
//   actually touching it daily. Recorded as CC's direction for Personal
//   AI Core's development methodology, not claimed as externally
//   validated — same evidentiary tier as D10/D11's stated-direction
//   notes, not a ratified UCR.
//
// Impact: 914_FinanceEngine Runtime paused, resumes after 1-2 weeks of
//   real Operator Console usage. New files: `945_OperatorConsole.html`,
//   `946_OperatorConsoleServer.js`, `922_DashboardAdapter.js` (renamed
//   from the earlier-planned "922_DashboardEngine" placeholder — this
//   is deliberately lighter-weight than that name implied; may grow
//   into a fuller Dashboard Engine later, not built out that way now).
//
// Related ADRs: ADR-P02 (clarified, not contradicted), ADR-P07 (pattern
//   extended once more, this time to a Query rather than a publish).


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADR-P15 — 918_DefectEngine Vertical Slice: Case Module Scope,
// DeveloperStatus/OwnerVerificationStatus Independence, and the Repair
// Cycle Follow-up (Review Decision)
// STATUS: APPROVED (2026-08-15/16) — NEW
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// Question (1): The DLP Defect Case & Rectification Tracking Vertical
//   Slice needs a Case concept wrapping multiple DefectItems, Daily
//   Progress Checks, Correspondence, and RectificationEvents.
//   00_File_Map.js already reserves 918_DefectEngine specifically for
//   "Defect Liability Period 追踪" — does this Case concept get its own,
//   separate, more generic Engine (e.g. a new 906/907 PropertyCaseEngine),
//   or does it live inside 918 alongside DefectItem?
//
// Decision (1): Single file, 918_DefectEngine.js — no separate generic
//   Case Engine. PropertyCase carries a CaseType field (currently only
//   'DLP') so a genuinely different second Case type could reuse the same
//   table later without a rename, but that split is deferred until such a
//   type actually exists. Rationale: Property OS's own established
//   Candidate Pattern discipline (ADR-P10/P12/P13) requires two
//   independent examples before promoting a shared abstraction; DLP is
//   the only real Case type today, so a generic Case Engine now would be
//   Speculative Design against the project's own stated bar — same
//   "start concrete, generalize only once forced by evidence" precedent
//   as 912_ObligationEngine predating any generic Recurring Entity
//   framework.
//
// Question (2): DefectItem needs two independent status dimensions —
//   DeveloperStatus and OwnerVerificationStatus — so a Developer's
//   completion claim and an Owner's verification result can coexist and
//   contradict each other without either silently erasing the other
//   (this Vertical Slice's core requirement). Phase 3's local test suite
//   (61/61, local_precheck_test_918.js) surfaced a real edge case: after
//   OwnerVerificationStatus reaches 'FailedVerification', a fresh
//   Developer 'ClaimedCompleted' claim leaves the stale
//   'FailedVerification' sitting on the row, since recordDeveloperStatus
//   deliberately never writes OwnerVerificationStatus. The derived overall
//   Status correctly shows 'InProgress' (not a false 'PendingVerification'
//   — that was an actual precedence bug in deriveDefectItemStatus_,
//   caught by the same test run and fixed), but the Owner has no
//   field-level signal that "the Developer re-claimed completion since my
//   last failed check, go look again" — the failed check and the new
//   claim aren't scoped to distinguishable repair attempts.
//
// Decision (2): Do NOT have recordDeveloperStatus write or reset
//   OwnerVerificationStatus, even for this specific, well-motivated case.
//   The independence of the two fields is the guarantee this Vertical
//   Slice exists to provide, not a display nicety — letting one Command
//   implicitly touch the other's field, even by resetting to a neutral
//   value rather than forcing a positive one, erodes that guarantee for
//   convenience. The correctly-scoped fix is a future **Repair Cycle /
//   Verification Cycle** concept: OwnerVerificationStatus, DeveloperStatus,
//   and their dates would belong to a specific repair attempt, not sit as
//   permanent fields directly on DefectItem — e.g.
//     Repair Cycle 1: Developer -> ClaimedCompleted, Owner -> FailedVerification
//     Repair Cycle 2: Developer -> ClaimedCompleted, Owner -> NotChecked
//   with each cycle's verification independent of every other cycle's.
//   This is a genuine Domain Model change (a new Aggregate-internal
//   Entity, a new Schema, DefectItem's two status fields becoming derived
//   from "the latest cycle" rather than stored directly) and is
//   explicitly NOT implemented in this Vertical Slice — recorded here as
//   a known, accepted Domain Model limitation, not a bug, and not
//   silently patched around by loosening the independence rule this ADR
//   exists to protect. 918's Runtime is unchanged from Phase 3 as
//   reviewed and approved (CC, 2026-08-16).
//
// Impact: No Schema or Runtime change from this ADR by itself — it
//   formally records two decisions already reflected in
//   918_DefectEngine.js as delivered (Phase 3), and commits the Repair
//   Cycle concept to a future Domain Model enhancement rather than
//   Phase 4+ of this Vertical Slice. PropertyOS_DomainModel.md should
//   gain a Follow-ups note referencing this ADR at Phase 12 (Documentation).
//   MANUAL_VERIFICATION_CHECKLIST.md updated 2026-08-16 with the
//   accompanying "Known Domain Model limitation" note.
//
// Related ADRs: ADR-P10/P12/P13 (Candidate Pattern discipline, applied
//   here to justify not building a generic Case Engine yet); ADR-P06
//   (Event Immutability — the same "don't silently rewrite an existing
//   fact" spirit that makes even a neutral reset of OwnerVerificationStatus
//   feel wrong, though it's technically not an overwrite of a positive
//   claim).


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADR-P18 — DefectItem Schema Migration: ItemID / SubCategory / Remark,
// Reordered Column Layout, and Schema Freeze (Phase 11 Pre-Import Gate)
// STATUS: APPROVED (2026-08-24) — NEW
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// Question: Phase 11's real Defect Report onboarding surfaced a need for
//   three fields DefectItem didn't have: an item number as shown in the
//   Developer App's own defect-tracking portal (distinct from the
//   existing OriginalReference), a SubCategory finer-grained than the
//   existing Category enum, and a free-text Remark. Two questions needed
//   resolving together: (1) add these now, before any real data exists,
//   or wait until the real Defect Report is actually seen (handoff
//   2026-08-22 framed this as Option A/B); (2) given ADR-P17's
//   precedent of appending new columns at the end to keep
//   ensureSheetSchema_'s positional match trivially satisfied, should
//   these three follow that same append-only pattern, or does the
//   resulting column order matter enough to justify a real reorder
//   migration instead?
//
// Decision:
//   (1) Migrate now (CC decision 2026-08-24) — do not wait for the real
//   Defect Report.
//   (2) Reorder, not append. Final DefectItem.columns order:
//     DefectID, CaseID, ItemID, OriginalReference, Category,
//     SubCategory, Description, Remark, Location, Priority, Status,
//     DeveloperStatus, OwnerVerificationStatus, SubmittedAt,
//     RectificationStartDate, DeveloperClaimedCompletedDate,
//     OwnerVerifiedDate, ClosedDate, CreatedAt, UpdatedAt
//   ItemID sits next to OriginalReference, SubCategory next to Category,
//   Remark next to Description — CC judged this semantic grouping worth
//   the extra migration engineering an append would have avoided.
//   Because 901's three generic Sheet helpers
//   (readRowAsObject_/objectToRowArray_/updateRowFields_) already read
//   and write every row by column NAME via the columns array, not by
//   hardcoded position, a reorder is exactly as safe as an append FOR
//   ANY CODE THAT GOES THROUGH THOSE HELPERS — confirmed by inspection
//   to be 918/922/947/948's entire DefectItem read/write surface, zero
//   exceptions found (see migration report, 2026-08-24). The one place
//   position genuinely mattered — the Importer's own staging sheet, a
//   separate table — was already made position-independent
//   (phase11_colIndex_) earlier in this same session, before this
//   reorder decision was made.
//
//   Field semantics:
//   - ItemID: optional string. The item number as shown in the
//     Developer App, transcribed by CC — not auto-extracted, no such
//     integration exists. Editable via updateDefectItem (it is an
//     EXTERNAL reference, not a Property OS-owned identity — DefectID
//     remains the only immutable PK).
//   - OriginalReference: UNCHANGED. Remains the Importer's sole durable
//     dedup key. Deliberately NOT reconciled with ItemID even though
//     both are, by their own schema comments, "a source item number" —
//     CC's explicit instruction was to keep them independent, so no
//     merge, no backfill, no dedup-key change.
//   - SubCategory: optional string, no enum (Category already has one;
//     SubCategory does not, since none was requested — avoiding
//     Speculative Design over a fixed list CC hasn't defined).
//   - Remark: optional string, free text.
//
//   Migration mechanism: a real, from-scratch migration is REQUIRED —
//   ensureSheetSchema_ cannot do this itself (it only creates-fresh or
//   confirms-exact-match; a changed header with existing data to carry
//   forward is explicitly its "resolve via Migration Strategy, not
//   auto-corrected" case). ONETIME_Phase11_DefectItemSchemaReorderMigration.js
//   is that Migration Strategy: reads the real sheet's existing header +
//   all data rows, verifies the header matches the known pre-migration
//   17-column shape (aborts loudly, zero writes, if it doesn't), remaps
//   every row from old position to new position BY COLUMN NAME (never
//   by raw array index), writes the new header + remapped data, then
//   re-reads and verifies every pre-existing field is identical between
//   old and new before declaring success. Idempotent-safe: re-running
//   after a successful migration detects the header already matches the
//   new schema and no-ops.
//
//   Schema Freeze: once this migration has run for real and verified,
//   DefectItem's schema is frozen. New fields or requirements surfaced
//   during real Defect Report onboarding go to Feedback/Gap — not a
//   live Domain/Runtime edit — unless the issue is a data
//   integrity/safety bug.
//
// Impact: 901_PropertySchema.js (DefectItem.columns reordered and grown
//   from 17 to 20 columns; MIGRATION NOTE above initDefectEngineSchema_
//   rewritten to point at the new migration function instead of a
//   manual header-cell edit). 918_DefectEngine.js — NO business-logic
//   changes required by the reorder itself (name-driven helpers absorb
//   it transparently); addDefectItem/updateDefectItem already accept
//   itemId/subCategory/remark as of this same session.
//   ONETIME_Phase11_DefectImporter.js — NO changes required by the
//   reorder (interacts with DefectItem only via 918's named functions);
//   its own staging-sheet column layout is unaffected and independent.
//   New file: ONETIME_Phase11_DefectItemSchemaReorderMigration.js. The
//   real, already-deployed DefectItems sheet must have this migration
//   run against it before any updated 918/922/947 code (including the
//   Mobile Console) touches DefectItems again, or every such call
//   throws "Schema drift detected" by design.
//
// Related ADRs: ADR-P17 (Property's DevelopmentName/UnitLabel — same
//   underlying ensureSheetSchema_ positional-match constraint, opposite
//   resolution: appended rather than reordered, because that case had
//   no reason to prefer a specific position). ADR-P15 (DeveloperStatus/
//   OwnerVerificationStatus independence on this same DefectItem entity
//   — this ADR's "keep ItemID and OriginalReference independent, don't
//   merge for convenience" follows the same spirit).
