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
