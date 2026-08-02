/**
 * ═══════════════════════════════════════════════════════════════════════
 * PROPERTY OS — 00_Project_Constitution.js
 * 项目宪法（永远有效 / Rarely Modified）
 * ═══════════════════════════════════════════════════════════════════════
 *
 * STATUS: v0.4 — ADR-P01~P07 已确认。2026-07-19 CC 批准 Architecture
 * Review（Obligation Engine Vertical Slice）与 Foundation 层 Runtime
 * （900-903）。Session 1 Part B（912/913）依 CC 明确要求留待下一轮，
 * 本轮专心完成 ADR-P07 治理同步。
 * 本文件中标记 [NEEDS CONFIRMATION] 的条目，凡已被 ADR 或 Review
 * Approval 拍板者，已更新为 [APPROVED]；尚未拍板者仍保留标记。
 *
 * 原则：本文件极少修改，记录不可轻易改变的规则。
 *       新 AI / 新开发者接手 Property OS，必须先读此文件。
 *
 * ★ Platform Constraint（2026-07-29 明文化，呼应 UEF v1.6 §2）：
 * Property OS 100% 运行于 Google Apps Script + Google Sheets（Truth
 * Layer）。不是"目前碰巧用 GAS"，是这整个系统唯一的目标平台——所有
 * 架构决策都是在这个前提下做的。具体含义：
 *   - Sheets 没有多语句事务；一个 Command 的多笔写入（Truth/History/
 *     Event）是各自独立的操作，不是原子的一整包。见 §5 Coding
 *     Standards 与 ADR-P10 相关记录（logPartialFailure_ 的做法）。
 *   - 除了 LockService，没有真正的跨执行并发原语；且 LockService
 *     只在同一个 GAS 专案内的多次执行之间生效，不同专案（例如
 *     Property OS 跟 Reminder OS）之间没有任何锁协调，只能透过共用
 *     Sheet 的资料本身去推断状态。
 *   - 任何未来考虑的技术（Firestore/SQLite/Cloud Run 等）都是"透过
 *     ADR-P07 Adapter 替换实作"的假设性讨论，不是目前路线图的一部分；
 *     不要因为讨论过这些可能性就以为系统正在往那个方向迁移。
 *
 * 上位框架（Property OS 不得重新设计，只能遵守）：
 *   - Personal AI Core Framework      — 整体架构，不可绕过
 *   - Universal Domain OS Blueprint   — 运行时分层标准（0~5）
 *   - Universal Engineering Framework — 工程方法论标准（UEF，0~9，
 *     目前 v1.6，含 §2 Platform Constraints／D9 与本文件呼应）
 *
 * 本文件不包含任何可执行逻辑（无 function），仅为治理文档。
 * ═══════════════════════════════════════════════════════════════════════
 */


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. PROJECT VISION 系统最终目标
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// Property OS 不是一个记录房产资料的软件，而是一个
// «AI Property Intelligence Platform»。
//
// 四大支柱：
//   Truth        — 房产 / 贷款 / 租赁 / 文件 / 义务 的单一真相来源
//   Automation   — 义务（obligation）与提醒事件全自动化，不需人工追踪到期日
//   Intelligence — 现金流 / ROI / 市场 / 买卖租融资 决策建议
//   Integration  — 与 Reminder OS、Investment OS、News OS 无缝联通
//
// 硬性约束：
//   - 必须是 Event Driven Architecture（所有资料经过 EventBus）
//   - AI 不允许直接修改 Truth Layer
//   - 必须可扩展至多物业、多贷款、多租客
//   - 不得重新设计 Personal AI Core Framework / Blueprint / UEF


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. CORE PRINCIPLES 核心原则
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// P1 — Event-Driven Everything
//      所有 Truth Layer 变更必须经过 EventBus，不存在绕过 EventBus 的捷径写入。
//
// P2 — Truth Layer Protection
//      AI 不得直接修改 Truth Layer。具 mutation 效果的操作，必须先经
//      User Confirmation gate 才能进入 Execution。
//      例外：使用者透过 Telegram 明确下达的指令（如 /property_paid mortgage
//      July）本身即构成 confirmation，不需二次确认；但 AI 主动推断/建议的
//      写入（例如从邮件猜测"你可能已经缴费"）一律需要显式确认。
//
// P3 — Single Owner per Entity
//      每个 Truth Entity 有且只有一个 owning Engine（见 §7）。
//      其他 Engine 需要该资料时，一律透过事件订阅或 Query，不得直写。
//
// P4 — Composition over Duplication
//      若能力已存在于其他 OS（例如 Reminder OS 的 Offset Reminder Engine），
//      Property OS 必须透过 Connector 复用，不得重新实作一套平行系统。
//
// P5 — Advisory AI, Authoritative Truth
//      Intelligence 层（分数 / 建议 / 预测 / Decision Engine 输出）永远是
//      advisory，不是 Truth；必须标注来源与可重算性，不因"AI 算出来的"而
//      自动获得写入 Truth 的权限。
//
// P6 — Documentation as Contract
//      00_Project_Constitution / 00_Project_State / 00_File_Map / ADR
//      与实际代码必须同步；不同步视为 Documentation Drift，须于 Review
//      中报告（§10）。
//
// P7 — Architecture-First
//      架构未确认前不进入 Implementation。本文件当前即是该原则的实践。
//
// P8 — Payment Is Always an Event（ADR-P04）
//      任何付款（Mortgage/Electricity/Water/Maintenance/Insurance/
//      Quit Rent/Assessment/Internet/Rental Deposit 等）不得直接修改
//      Truth Layer。必须：Payment Completed → Publish Event → Finance
//      Engine → Dashboard → Audit → Analytics。无例外。
//
// P9 — No Active Polling（ADR-P05）
//      Property OS 不主动轮询 Bank / TNB / Air Selangor / Management
//      Office / Government 等外部系统。所有外部资料摄入（Manual Input /
//      Email OCR / PDF OCR / API / Import）统一经由
//      UTILITY_BILL_RECEIVED 事件转换为 OBLIGATION_UPDATED，维持
//      Event-Driven 一致性。
//
// P10 — Event Immutability（ADR-P06）
//      所有 Domain Event 一旦发布，不可修改、覆盖或删除。业务修正
//      （例如缴费金额输入错误）必须以新的 Compensating Event 表示
//      （例：PAYMENT_REVERSED），不得回头改动原事件。这条原则适用于
//      Property OS 内所有 Engine，不限 Obligation Engine。
//
// P11 — Infrastructure Adapter Isolation（ADR-P07）
//      Domain Layer（Engine / Command / State Machine / Business
//      Rules）永远不直接知道底层基础设施（EventBus，以及未来任何
//      "实作细节可能被 Personal AI Core 整体替换"的依赖，例如 Sheet
//      存取方式、LockService 包装）的具体实现。所有此类依赖必须收敛
//      到单一 Adapter 函式（Port），Domain 只呼叫 Adapter。基础设施
//      本身如何实现或迁移，只影响 Adapter，不影响任何 Engine。在
//      上游 API 尚未定案前，Adapter 内部合理地维持占位实作（例如
//      Logger 记录），这是正确做法，不是技术债。


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. ARCHITECTURE RULES 架构规则
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// 3.1 强制遵循 Universal Domain OS Blueprint（0~5 结构），不得重新设计。
// 3.2 强制遵循 UEF 工程生命周期方法论，不得重新设计。
// 3.3 doc1 原始描述（Truth/State/Event/Service/Intelligence Layer）与
//     Blueprint 结构的对照，两者不冲突，只是粒度不同：
//
//     Personal AI Core 概念层     ↔  Blueprint 结构
//     ─────────────────────────────────────────────────────
//     Truth Layer                ↔  1. Foundation → Schema
//     Event Layer（EventBus）    ↔  贯穿全部，集中体现在 2. Runtime → Event
//     State Layer                ↔  2. Runtime → Projection
//     Service Layer               ↔  2. Runtime → Execution ＋ 各 Engine 本体
//     Intelligence Layer          ↔  3. Intelligence
//
// 3.4 Query 路径 与 Mutation 路径必须区分：
//     - 纯读取（Dashboard 查询 / Intelligence 分析）→ 只走 Query，
//       不需要 User Confirmation，也不产生 Event。
//     - 会改变 Truth 的操作 → 完整走
//       Request → Planner → Decision → User Confirmation → Execution
//       → Event → Projection → Query。
//
// 3.5 [ADR-P02] Property OS 不允许建立任何 GAS Trigger —— 不仅是
//     Reminder 相关，任何需要"定期扫描"的逻辑（例如 Overdue 判定、
//     异常侦测）一律改用 Lazy Computation（查询时即时计算）或依附于
//     其他既有的排程来源，不自建 time-based trigger。
//     [CONFIRMED by Review Approval 2026-07-19] Overdue 是 Derived
//     State，不写入 Truth Layer；Reminder OS 依 Derived State（它已
//     持有的 DueDate/offsets）自行产生逾期通知，不要求 Property OS
//     维护或宣告 Overdue 状态。详见 ObligationEngine_VerticalSlice.md
//     §1, §4, §9。


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. LAYER ARCHITECTURE 架构分层
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// Property OS（遵循 Universal Domain OS Blueprint，逐层落地）
//
// ├── 0. Governance
// │   ├── 00_Project_Constitution ← 本文件
// │   ├── 00_Project_State
// │   ├── 00_File_Map
// │   └── 00_ADR_Log（ADR-P01~P07，已正式记录）
// │
// ├── 1. Foundation
// │   ├── Configuration      → PropertyConfig
// │   ├── Schema             → PropertySchema（Property/Loan/Document/
// │   │                        Obligation/Ledger/Tenant/Lease/Maintenance/
// │   │                        Defect/Renovation/Insurance/Tax）
// │   ├── Identity            → PropertyIdentity（PROP-/LOAN-/OBL- 等）
// │   ├── Event Definitions   → PropertyEventDefinitions（UPPER_SNAKE_CASE，见 §6）
// │   ├── Permissions         → PropertyPermissions（单一使用者假设）
// │   └── Versioning          → PropertyVersioning
// │
// ├── 2. Runtime（每个 Engine 皆实作同一条 pipeline，见 §3.4）
// │   ├── Property Asset Engine
// │   ├── Document Engine
// │   ├── Obligation Engine ★           ← ADR-P01 确认为 single source of truth
// │   ├── Obligation Scheduler ★        ← 排程 + Publish ReminderRequest Event
// │   ├── Finance Engine（只订阅 Obligation 事件，禁止维护任何 Schedule）
// │   ├── Mortgage Engine
// │   ├── Rental Engine
// │   ├── Maintenance Engine
// │   ├── Defect (VP) Engine
// │   ├── Renovation Engine
// │   ├── Insurance Engine
// │   ├── Tax Engine
// │   └── Dashboard Engine（纯 Projection，不拥有任何 Truth 表）
// │
// ├── 3. Intelligence（全部输出 advisory-only，见 P5）
// │   ├── Knowledge      → Property Knowledge Graph
// │   ├── Analytics      → Obligation Anomaly Detector, Cashflow Forecast
// │   ├── Prediction     → Market Analytics Engine（Deferred，Phase 5）
// │   ├── Suggestions    → Decision Engine
// │   ├── Insights       → Investment Scoring Engine
// │   └── Learning       → 预留（OCR/RAG/Vector Search/Multi AI Voting）
// │
// ├── 4. Integration
// │   ├── Bridge/Connectors → PropertyConnector（对外）
// │   │                       ReminderIntegrationAdapter（只 Publish
// │   │                       ReminderRequest Event，不知道 Reminder OS
// │   │                       如何实现，见 ADR-P02）
// │   ├── APIs               → PropertyConnector 之 Standard Connector Interface
// │   ├── Import/Export      → DocumentImportAdapter（统一转为
// │   │                       UTILITY_BILL_RECEIVED 事件，见 ADR-P05）
// │   └── External Systems   → PropertyTelegramCommands
// │
// └── 5. Testing
//     └── Node sandbox（比照 Reminder OS 既有模式），Status: Not Started
//
//
// 范例端到端流程（ADR-P04 的具体落实，用来验证以上分层是否自洽）：
//   /property_paid mortgage July
//   → PropertyTelegramCommands  (Request，来自共用 Telegram Layer)
//   → ObligationEngine.recordPayment()  (Command: RecordPayment，
//     指令本身即 confirmation)
//   → Execution：ObligationOccurrences 更新 Status=Paid, LastPaid=today
//   → Event：publish PAYMENT_COMPLETED { ObligationID, effectiveDue,
//     amount... }
//   → ObligationScheduler 订阅 → 算出 NextDue → publish
//     REMINDER_REQUESTED（经 ReminderConnector 转交 Reminder OS，
//     Property OS 不知道其内部如何排程）
//   → FinanceEngine 订阅 PAYMENT_COMPLETED → 写入 Ledger
//   → DashboardEngine Projection 更新
//   → Audit：事件本身持久化于 EventBus Event Log ＋ ObligationHistory
//     （域内可重算稽核轨迹，对应 Test Plan 的 Replay Test）
//   → Analytics：931_ObligationAnomalyDetector 等 Intelligence 模块
//     消费历史数据（advisory-only）


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. CODING STANDARDS 编码规范
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// - Sheet 写入一律用 appendRow()，禁止 getLastRow()+setValues() 的
//   非原子写法（沿用 EventBus 既有教训）。
// - 涉及到期日 / 重复规则的幂等判断，一律用 snapshot 字段（如 effectiveDue）
//   而非重算值，理由与 Reminder OS 一致：重算值会因时区/执行时间漂移。
// - LockService：留意跨项目已知的 nested-lock hazard（Inventory OS 曾发现），
//   Obligation 缴费记录只能用单层 top-level lock，不可嵌套获取。
// - [ADR-P02 强化] Property OS 严禁建立任何 GAS Trigger（不限于
//   Reminder）；到期/异常检测一律用 Lazy Computation。
// - 批次更新多笔 Obligation/Occurrence 时，优先复用既有的
//   batchUpdateFieldsByKey_ 风格工具，不逐行写入。
// - 单次执行需注意 GAS 6 分钟执行上限；Intelligence 层的重计算
//   （市场分析、现金流预测）应设计为可分批 / 可由外部呼叫触发，不可在
//   单次请求中同步跑完全部。
// - [ADR-P07] 任何对外部基础设施的呼叫（EventBus、未来可能的其他
//   Infrastructure）一律收敛到单一 Adapter 函式，Domain Layer 代码
//   永远只呼叫 Adapter，不得直接呼叫底层 API。Adapter 内部允许在
//   上游 API 未定案前维持占位实作（如 Logger 记录），这不是需要
//   "赶快修好"的债务，是刻意的架构边界。


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 6. NAMING CONVENTION 命名规范
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// - 文件命名：<NNN>_<PascalCaseModuleName>.js
//   Property OS 号段：Reserved 900-949（ADR-P03，非 Locked，见 §11）
// - 私有 / 内部函式：结尾加底线，例如 functionName_()
// - Entity ID 前缀（[NEEDS CONFIRMATION] 具体格式，待与既有 ID 规则核对）：
//     PROP-   Property          LOAN-   Loan
//     OBL-    Obligation        TEN-    Tenant
//     LEASE-  Lease             DOC-    Document
//     MAINT-  Maintenance       DEFECT- Defect/VP
//     RENO-   Renovation        INS-    Insurance
//     TAX-    Tax Record        OCC-    Obligation Occurrence
//     HIST-   Obligation History
// - ★ Event 命名（v0.2 修正 — 由 PascalCase 改为 UPPER_SNAKE_CASE）：
//   v0.1 曾定为 PascalCase（如 ObligationPaid），但 CC 于 Vertical Slice
//   规格中明确以 UPPER_SNAKE_CASE 定义 Event Contract（OBLIGATION_CREATED,
//   PAYMENT_COMPLETED 等）。本文件采用后者为准，这是一次 Documentation
//   Drift 的即时修正案例（P6 的具体实践）。
//   规则：<ENTITY>_<PAST_TENSE_ACTION>，全大写、底线分隔
//   例：OBLIGATION_CREATED, OBLIGATION_UPDATED, OBLIGATION_CANCELLED,
//       PAYMENT_COMPLETED, PAYMENT_OVERDUE, REMINDER_REQUESTED,
//       UTILITY_BILL_RECEIVED, DOCUMENT_UPLOADED, LEASE_RENEWED
// - Sheet / Table 命名：PascalCase 复数
//   例：Properties, Loans, ObligationRules, ObligationOccurrences,
//       ObligationHistory, Ledger, Tenants, Leases, MaintenanceRecords,
//       Defects, RenovationProjects, InsurancePolicies, TaxRecords


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 7. DATA OWNERSHIP RULES 数据归属规则
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
//   Entity                        Owning Engine
//   ─────────────────────────────────────────────────────
//   Property                      Property Asset Engine
//   Loan / Mortgage 条款           Mortgage Engine
//   Document + Metadata           Document Engine
//   ObligationRules/Occurrences/  Obligation Engine（ADR-P01：唯一真相来源，
//     History                     含 Mortgage/Electricity/Water/Maintenance
//                                 Fee/Sinking Fund/Quit Rent/Assessment/
//                                 Insurance/Internet/Subscription/Pest
//                                 Control/Aircond Service/Water Filter/
//                                 Rental Collection/Lease Renewal/
//                                 Warranty/Defect Liability 之 Due Date
//                                 与 Schedule）
//   Ledger（实际收支交易）          Finance Engine（禁止维护任何 Due Date/
//                                 Reminder Schedule/Payment Schedule —
//                                 ADR-P01 明文禁止"第二份 Schedule"）
//   Tenant / Lease                Rental Engine
//   Maintenance Record            Maintenance Engine
//   Defect / VP Record            Defect Engine
//   Renovation Record             Renovation Engine
//   Insurance Policy              Insurance Engine
//   Tax Record                    Tax Engine
//   Dashboard 聚合视图              （无 Truth 表，纯 Projection）
//   Knowledge Graph                （无 Truth 表，由事件重建的索引）
//   AI Insight / Score / 建议      （无 Truth 表，advisory-only，见 P5）
//   Audit Trail                    EventBus 持久化事件日志 ＋
//                                 ObligationHistory（域内投影，append-only）
//
//   规则：一个 Entity 只能有一个 owning Engine 写入；其余 Engine
//   只能透过事件订阅或 Connector Query 读取，不得直写。


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 8. DEPENDENCY RULES 依赖规则
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// - 跨 OS 一律透过 Connector（ConnectorRegistry 既有模式），禁止
//   `OtherOS.function()` 直接调用（比照 ProductivityConnector 迁移先例）。
// - 同 OS 内：Runtime 可向下依赖 Foundation；Intelligence 可依赖
//   Runtime+Foundation；Integration 可依赖 Runtime+Intelligence。
//   反向依赖禁止（Foundation/Runtime 不可依赖 Intelligence/Integration）。
//
// - [APPROVED — ADR-P01] Obligation Engine ≠ Finance Engine 边界：
//   Obligation Engine 是所有 recurring obligation（完整清单见 §7）的
//   single source of truth（含排程与提醒触发）；Finance Engine 是总帐
//   （含一次性支出如 Renovation/Legal Fee）与 Cashflow/ROI 计算，只能
//   订阅 Obligation 事件镜像写入 recurring 部分，不得维护任何 Due
//   Date/Reminder Schedule/Payment Schedule。系统中不允许出现第二份
//   Schedule。
//
// - [APPROVED — ADR-P02] Reminder 委派机制：
//   Obligation Engine/Scheduler 只 Publish REMINDER_REQUESTED Event，
//   不建立任何 Trigger，不自行实现排程器。Reminder OS 负责 Offset
//   Reminder/Notification/Telegram/Email/Future Push/Future Calendar，
//   Property OS 不知道也不需要知道其内部实现。ReminderConnector 是
//   唯一接口。
//   [CONFIRMED by Review Approval 2026-07-19] Reminder Cancellation
//   责任归 Reminder OS：由其订阅 PAYMENT_COMPLETED 等事件自行取消
//   未来提醒；Property OS 不发布任何取消信号，不承担取消逻辑。
//   ⚠ 仍待核实（未被本次 Review Approval 涵盖，需另外核实）：
//   ReminderConnector 目前是否已支援"代表其他 OS 的 Entity 发布
//   ReminderRequest"这个具体操作——这是我（Claude）无法从这个对话
//   直接检查的事，早前"7/10 操作 BUSINESS_ERROR"的记录大概率已过时
//   （Reminder OS 近期完成了 Offset Reminder Engine）。本次 Vertical
//   Slice 中的 Reminder Contract 是「需求规格」：若 ReminderConnector
//   已满足，可直接对接；若未满足，这份 Contract 就是它需要新增的部分。
//
// - [APPROVED — ADR-P04] 任何付款一律 Event Driven（见 §4 范例流程、P8）。
//
// - [APPROVED — ADR-P05] Property OS 不主动轮询外部系统（P9）。未来
//   Bank/TNB/Air Selangor 等资料摄入，一律先转换为 UTILITY_BILL_RECEIVED
//   事件，再转 OBLIGATION_UPDATED，不建立任何 polling 排程。
//
// - [APPROVED — ADR-P06] Event Immutability：所有 Domain Event 不可
//   修改/覆盖/删除；修正一律用 Compensating Event（见 P10）。落地于
//   Obligation Engine 的具体设计（ReversePayment Command / 
//   PAYMENT_REVERSED Event）见 ObligationEngine_VerticalSlice.md。
//
// - Property OS ≠ Investment OS 边界（仍为草案判断，[NEEDS CONFIRMATION]）：
//   Property OS 拥有物业层级的财务真相与 ROI 计算；Investment OS 拥有
//   跨资产类别的组合层级聚合。Property OS 透过 PropertyConnector 推送
//   数据，不复制其组合层级评分逻辑。


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 9. SECURITY RULES 安全规范
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// - 任何密钥/凭证不得写入 Sheet，一律使用 PropertiesService/ScriptProperties
//   （比照 Investment OS 的 Yahoo Finance cookie/crumb 认证经验）。
// - Document Engine 会存放 PII 文件（身份证副本、SPA、Tenancy Agreement），
//   存取需限制范围；Telegram 回复不应直接广播完整文件内容。
// - AI 生成的 OCRText / Summary / AINotes / Evidence 等栏位：
//     - 不得捏造财务数字
//     - 必须可追溯来源（对应 Document 或 Occurrence 记录）
//     - OCR 结果在被使用者确认前，只是 Document Engine 的附属资料，
//       不可直接晋升为 Ledger 或 Obligation 的权威数值。
// - [ADR-P05] 未来银行对账 / Email 账单解析（UTILITY_BILL_RECEIVED 来源）
//   同样必须先落到"待确认"状态，经 User Confirmation 才能转为
//   OBLIGATION_UPDATED 写入 Truth。


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 10. AI DEVELOPMENT RULES AI 开发守则
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// - AI 不得直接修改 Truth Layer；具 mutation 效果的操作必须先经
//   User Confirmation gate（P2）。
// - AI Notes / Insights / Score 等输出必须标注 advisory，且可追溯来源
//   （Evidence）。
// - Decision Engine 与 Tax Engine 之输出，须标注"仅供参考，非专业法律/
//   财务/税务意见"。
// - 任何架构性 / contract 性变更前，AI 必须先完成 UEF 的
//   Change Impact Analysis（9 问，浓缩版）：
//     1) 影响哪些模块？ 2) 影响哪些 contract？ 3) 影响哪些测试？
//     4) 需同步哪些治理文件？ 5) 是否引入技术债？
//     6) 是否引入架构漂移？ 7) 是否需要 ADR？
//     8) 是否影响向后兼容？ 9) 是否需要 migration？
//   并在实作前明确报告分析结果。
// - 修改既有代码时，只需输出有变动的文件；未变动的文件不需重新输出。
// - ★ 文件同步规则（Documentation Drift Rule）：
//   凡是变更影响到 Architecture / Dependencies / Contracts / Interfaces /
//   Modules / Layers / Data Ownership / Responsibilities 任一项，AI 必须
//   判断 00_Project_Constitution、00_Project_State、00_File_Map、
//   00_ADR_Log 是否也需要同步更新。未同步视为 Documentation Drift，
//   须在下一次 Review 中报告。（本次 Event 命名从 PascalCase 改为
//   UPPER_SNAKE_CASE 即是一例：已同步更新 §6 与相关文件。）
// - ★ Vertical Slice 优先于 Runtime：完成 Contract Design 层级的
//   Vertical Slice 后，须停止并等待 Review Approval，不得自行进入
//   Runtime 实作，即使后续对话看似邀请也需先确认批准状态。
// - ★ Runtime 授权后的纪律（2026-07-19 Review Approval 新增）：
//   Session 1 Runtime 已获授权开始，但若批准当下同时新增了 ADR
//   （如本次 ADR-P06），AI 必须先把该 ADR 的影响同步进已批准的
//   Vertical Slice / Domain Model，确认规格本身已合规，才能开始写
//   Runtime 代码——不可用"已经批准了"为由，跳过尚未反映新 ADR 的
//   spec gap。Runtime 代码本身不得擅自调整已批准的架构；若实作中
//   发现规格有缺口或矛盾，须停下来报告，不能自行决定架构细节。
// - ★ 不猜测未确认的基础设施 API（ADR-P07，2026-07-19 追认）：
//   当 Runtime 实作需要呼叫一个尚未确认签名/行为的外部系统（例如
//   EventBus）时，AI 不得为了"能继续往下写"而猜测其具体调用方式。
//   正确做法是把该依赖收敛到一个 Adapter 函式，Domain 逻辑照常完整
//   写完并可独立审查/测试，Adapter 内部维持占位（如 Logger），待
//   确认后只改这一处。这不是暂停开发，是把不确定性隔离到最小范围。


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 11. ROADMAP OVERVIEW 长期规划蓝图
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
//   Phase 0  — Architecture & Governance ✓ 完成（Constitution/State/
//             File Map + ADR-P01~P07）
//   Phase 1a — Obligation Engine Vertical Slice ✓ APPROVED
//             (Review Approval 2026-07-19，基准规范)
//   Phase 1b — Obligation Engine + Scheduler Runtime（Session 1，
//             进行中）+ Foundation 层（900-903）+ Asset Engine +
//             Finance Engine 基础版
//   Phase 2 — Mortgage Engine + Rental Engine + Maintenance Engine
//             + Obligation Anomaly Detector
//   Phase 3 — Document Engine + Defect(VP) Engine + Renovation Engine
//             + Insurance Engine + Tax Engine
//   Phase 4 — Knowledge Graph + Cashflow Forecast + Investment Scoring
//             + Decision Engine
//   Phase 5 — 深化 Integration（News OS 整合、OCR/RAG/Semantic Search/
//             Vector Search/Multi AI Voting 等 Future AI Functions）
//
//   File 号段：Reserved 900-949（ADR-P03，非 Locked），待未来
//   Ecosystem Registry 统一确认后正式 Assign。
//
// ═══════════════════════════════════════════════════════════════════════
// END OF 00_Project_Constitution.js
// ═══════════════════════════════════════════════════════════════════════
