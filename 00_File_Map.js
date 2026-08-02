/**
 * ═══════════════════════════════════════════════════════════════════════
 * PROPERTY OS — 00_File_Map.js
 * 系统地图（开发导航 / File Responsibilities & Module Relationships）
 * ═══════════════════════════════════════════════════════════════════════
 *
 * 号段状态：Reserved 900-949（ADR-P03，非 Locked）。待未来 Ecosystem
 * Registry 统一确认后，再正式 Assign，不在此阶段强行核对。
 *
 * 详细程度分层原则：Phase 1-2 模块提供完整 Purpose/Input/Output/
 * Dependencies/Called By；Phase 3+ 模块仅列出 Purpose 与 Status
 * （避免 Speculative Design）。
 *
 * 关联文件（不属于本文件编号体系，皆为 Contract Design 阶段产出）：
 *   - 00_ADR_Log.js                       — ADR-P01~P07 正式记录
 *   - PropertyOS_DomainModel.md           — 跨 Engine 共用领域模型
 *   - ObligationEngine_VerticalSlice.md   — 912/913 完整 Vertical Slice
 *
 * Foundation 层（900-903）Runtime 已完成并批准（2026-07-19）。903 的
 * publishPropertyEvent_() 是 ADR-P07 的 Infrastructure Adapter，其
 * Logger 占位为刻意设计，非待办事项。
 *
 * 本文件不包含任何可执行逻辑，仅为治理文档。
 * ═══════════════════════════════════════════════════════════════════════
 */


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SYSTEM OVERVIEW
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
//   Property OS — AI Property Intelligence Platform
//   遵循 Universal Domain OS Blueprint：0 Governance / 1 Foundation /
//   2 Runtime / 3 Intelligence / 4 Integration / 5 Testing
//
//   号段规划（Reserved，非 Locked）：
//     0 Governance   — 00_（本地专属，非全局共用号段）
//     1 Foundation   — 900-909
//     2 Runtime      — 910-929
//     3 Intelligence — 930-939
//     4 Integration  — 940-949
//     5 Testing      — Node sandbox，独立于 GAS 文件编号


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 0. GOVERNANCE LAYER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// 00_Project_Constitution
// Purpose: 项目宪法，架构/编码/命名/依赖/安全/AI 规则
// Status: Active (v0.2)

// 00_Project_State
// Purpose: 项目状态中心，进度/问题/技术债/下一步
// Status: Active (v0.2)

// 00_File_Map
// Purpose: 本文件，文件索引与职责说明
// Status: Active (v0.2)

// 00_ADR_Log
// Purpose: 正式架构决策记录（ADR-P01~P10），含 Decision Matrix
//   （Question/Options/Evaluation/Trade-off/Decision）
// Status: Active — v0.2，含 Review Approval 与 ADR-P06/P07 追认

// 00_Review_History
// Purpose: UEF 5 份 Mandatory Document 最后一份，之前一直缺。审核/
//   Audit 记录，独立于 00_Project_State 的日常 changelog。REVIEW-001
//   （Obligation Engine Production Readiness Audit）含 addendum
// Status: Active — 本次建立

// 00_Business_Rules
// Purpose: UEF §0.3 Conditional Document（trigger 已满足）。Obligation
//   Engine 的付款/循环/逾期/提醒/终止政策，与 Constitution 的结构性
//   架构内容分开维护
// Status: Active — 本次建立（Audit REVIEW-001 GAP-3 的修复）


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. FOUNDATION LAYER  [900-909]
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// 900_PropertyConfig
// Purpose: 集中管理常量配置 — Obligation Category 列表（Mortgage/
//   Electricity/Water/Maintenance Fee/Sinking Fund/Quit Rent/
//   Assessment/Insurance/Internet/Subscription/Pest Control/Aircond
//   Service/Water Filter/Rental Collection/Lease Renewal/Warranty/
//   Defect Liability — ADR-P01 完整清单）、默认货币（Malaysia 场景，
//   默认 MYR）、默认 Reminder Offset 组合 (30/14/7/3/1/0/-1/-3/-7)、
//   Frequency 枚举
// Dependencies: 无
// Called By: 几乎所有 Runtime Engine
// Status: ✅ Runtime Complete — APPROVED (2026-07-19)

// 901_PropertySchema
// Purpose: 定义所有 Truth Layer 表结构（Entity 清单）。Obligation 相关
//   三表完整栏位已于 ObligationEngine_VerticalSlice.md §2 定案，其余
//   Entity 栏位仍待各自 Phase 的 Contract Design。也承载所有 Engine
//   共用的 Truth Layer 存取工具：propertyError_、日期序列化/解析
//   （toIsoDate_/toIsoDateTime_/parseIsoDate_/coerceToIsoDateString_）、
//   Row I/O（readRowAsObject_/objectToRowArray_/findRowIndexByFirstColumn_/
//   updateRowFields_）。ensureSheetSchema_ 新建表时会把 dateColumns
//   强制设为纯文字格式，防止 Sheets 把 ISO 日期字串誤判成 Date 序列值
//   而破坏 (ObligationID, EffectiveDue) 的字串比对幂等键
// Dependencies: 900_PropertyConfig
// Called By: 所有写入 Truth Layer 的 Engine
// Status: ✅ Runtime Complete — APPROVED (2026-07-19)（Obligation 三表；
//   其余 Entity 栏位待各自 Phase 细化）

// 902_PropertyIdentity
// Purpose: 统一 ID 产生与格式校验（PROP-/LOAN-/OBL-/OCC-/HIST-/TEN-/
//   LEASE-/DOC-/MAINT-/DEFECT-/RENO-/INS-/TAX-）
// Dependencies: 900_PropertyConfig
// Called By: 所有 Runtime Engine（建立新 Entity 时）
// Status: ✅ Runtime Complete — APPROVED (2026-07-19)

// 903_PropertyEventDefinitions
// Purpose: 事件类型目录，UPPER_SNAKE_CASE（v0.2 命名修正，见
//   Constitution §6）：OBLIGATION_CREATED, OBLIGATION_UPDATED,
//   OBLIGATION_CANCELLED, OBLIGATION_PAUSED, OBLIGATION_RESUMED,
//   PAYMENT_COMPLETED, PAYMENT_REVERSED（ADR-P06 compensating event），
//   REMINDER_REQUESTED, UTILITY_BILL_RECEIVED。完整 Payload/Producer/
//   Consumer 定义见 ObligationEngine_VerticalSlice.md §4。其他 Engine
//   的事件（Property/Loan/Document/...）待各自 Phase 加入，未预先列出
//   （避免 Speculative Design）。内含 publishPropertyEvent_()：
//   ADR-P07 Infrastructure Adapter，唯一允许知道 EventBus 实作的函式，
//   目前维持 Logger 占位，属刻意设计
// Dependencies: 900_PropertyConfig, 902_PropertyIdentity
// Called By: 所有 Engine（emit，一律经 publishPropertyEvent_）；
//   Intelligence 层（subscribe）；Integration Adapters（subscribe）
// Status: ✅ Runtime Complete — APPROVED (2026-07-19)

// 904_PropertyPermissions
// Purpose: Owner-based 存取控制；单一使用者假设，Owner 字段预留多人扩充
// Status: Deferred — 轻量规格

// 905_PropertyVersioning
// Purpose: Schema/Contract 版本追踪；Migration Strategy 见
//   ObligationEngine_VerticalSlice.md §12
// Status: Planned — Phase 1


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. RUNTIME LAYER — ENGINES  [910-929]
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// 910_PropertyAssetEngine
// Purpose: 管理房产主档（PropertyID, PropertyName, Developer, Address,
//   GPS, PurchaseDate/Price, CurrentValue, LoanID, BuiltUp, LandSize,
//   FreeholdLeasehold, Parking, StoreRoom, CompletionDate, VPDate,
//   DefectExpiry, Status, Owner, PropertyType）
// Dependencies: 901, 902, 903
// Called By: 922_DashboardEngine, 914_FinanceEngine, 935_DecisionEngine,
//   Telegram Layer
// Status: Planned — Phase 1

// 911_DocumentEngine
// Purpose: Document Library + Metadata；Evidence 附件来源
// Dependencies: 901, 902, 903；未来依赖 945_DocumentImportAdapter
// Called By: 912（Evidence）, 930_PropertyKnowledgeGraph（Future）
// Status: Planned — Phase 3

// 912_ObligationEngine  ★ 核心新模块 — Runtime Complete
// Purpose: ADR-P01 之 Single Source of Truth 实作。七个 Command
//   （Create/Update/RecordPayment/Cancel/Pause/Resume/Reverse）、State
//   Machine 强制、单层 Lock、ClientRequestID 幂等（Create/Update）、
//   OccurrenceID 天然幂等（RecordPayment）、AI Query（Upcoming/Overdue）
//   全部落地，严格依照已批准的 Vertical Slice
// Dependencies: 901, 902, 903, 913（scheduleNextOccurrence_/
//   buildReminderRequest_）
// Called By: 944_PropertyTelegramCommands（尚未建），922_DashboardEngine
//   （尚未建），914_FinanceEngine（订阅 PAYMENT_COMPLETED，尚未建）
// Status: ✅ Runtime Complete (2026-07-19)。910_PropertyAssetEngine 尚未
//   存在，故 PropertyID 存在性检查（propertyExists_）暂为 permissive
//   placeholder，比照 ADR-P07 Adapter 模式隔离，910 建成后只需改这一处。
//   2026-07-29 新增 logPartialFailure_：create/record/reverse Payment
//   在 Truth 写入之后的步骤失败时大声记录（UEF v1.6 §2/D9），不假装
//   原子性——Sheets 没有多语句事务，这是平台事实不是本文件的选择

// 913_ObligationScheduler  ★ 核心新模块 — Runtime Complete
// Purpose: Frequency-aware NextDue 计算（含月末 clamp，避免 1/31 +1月
//   溢出到 3 月）；Overdue 全为 Derived State，查询时即时算，不写入、
//   不排程；REMINDER_REQUESTED 建构与发布（经 903 的 Adapter）
// Dependencies: 912_ObligationEngine（createOccurrence_,
//   transitionRuleToCompleted_ — 直接呼叫，作为"订阅"PAYMENT_COMPLETED
//   的暂代方案，见档头说明）, 941_ReminderIntegrationAdapter（尚未建）
// Called By: 912_ObligationEngine（recordPayment, createObligation）
// Status: ✅ Runtime Complete (2026-07-19)
// ⚠ REMINDER_REQUESTED 的 payload 格式是需求规格；ReminderConnector
//   实际 API 是否满足仍待核实（00_Project_State TECH DEBT #1，未阻塞
//   本次 Runtime 完成——比照 ADR-P07 精神，Domain 逻辑先写完）

// 914_FinanceEngine
// Purpose: Ledger 与 Cashflow/ROI/Yield 计算。ADR-P01 明文禁止维护
//   任何 Due Date/Reminder Schedule/Payment Schedule，只能订阅
//   PAYMENT_COMPLETED 镜像写入
// Dependencies: 901, 902, 903, 910（订阅 912 事件，非直接依赖）
// Called By: 922_DashboardEngine, 932_CashflowForecastEngine,
//   942_InvestmentIntegrationAdapter
// Status: Planned — Phase 1

// 915_MortgageEngine
// Purpose: Mortgage Calculator — Amortization/Refinancing/Comparison/
//   Rate Simulation。与 912 的关系：Mortgage 类别 Obligation 之金额
//   来源参考；Mortgage 完全摊还时可触发 ObligationRule 之
//   Active→Completed（自然到期，非 Cancelled，见 Vertical Slice §9）
// Dependencies: 901, 902, 910
// Called By: 922_DashboardEngine, 935_DecisionEngine
// Status: Planned — Phase 2

// 916_RentalEngine
// Purpose: Tenant/Lease 生命周期
// Dependencies: 901, 902, 903, 910
// Called By: 922_DashboardEngine, 931_ObligationAnomalyDetector, 941
// Status: Planned — Phase 2

// 917_MaintenanceEngine
// Purpose: 维修历史，供 AI 回答总成本/Warranty 到期/重复维修分析
// Dependencies: 901, 902, 903, 910
// Status: Planned — Phase 2

// 918_DefectEngine (VP/Defect)
// Purpose: Defect Liability Period 追踪
// Dependencies: 901, 902, 903, 910, 911
// Status: Planned — Phase 3

// 919_RenovationEngine
// Purpose: Quotation/Budget/Timeline/Progress
// Status: Planned — Phase 3

// 920_InsuranceEngine
// Purpose: MRTA/MLTA/Fire/House Insurance
// Status: Planned — Phase 3

// 921_TaxEngine
// Purpose: RPGT/Rental Income Tax/Tax Summary（输出须标注非专业税务意见）
// Status: Planned — Phase 3

// 922_DashboardEngine
// Purpose: 纯 Projection/Query 组合层，不拥有任何 Truth 表
// Dependencies: 910, 912, 914, 915, 916, 917
// Called By: Telegram Layer, 944_PropertyTelegramCommands
// Status: Planned — Phase 1（基础版）


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. INTELLIGENCE LAYER  [930-939]  — 全部输出 advisory-only
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// 930_PropertyKnowledgeGraph
// Purpose: 跨 Entity 关联索引，由 EventBus 事件建立，本身非 Truth
// Status: Planned — Phase 4

// 931_ObligationAnomalyDetector
// Purpose: 费用异常/利率变化/保险到期/欠缴/超均值/现金流为负 侦测；
//   Query Interface 见 ObligationEngine_VerticalSlice.md §8
// Dependencies: 912_ObligationEngine, 914_FinanceEngine, 916_RentalEngine
// Status: Planned — Phase 2（优先级较高）

// 932_CashflowForecastEngine
// Purpose: 未来一年现金流预测
// Dependencies: 914_FinanceEngine, 912_ObligationEngine
// Status: Planned — Phase 4

// 933_InvestmentScoringEngine
// Purpose: Investment/Risk/Growth Score
// Status: Planned — Phase 4

// 934_MarketAnalyticsEngine
// Purpose: 市场/成交/租金/Developer/Location 分析
// Status: Deferred — Phase 5

// 935_DecisionEngine
// Purpose: Should I Buy/Sell/Rent/Refinance/Renovate；纯 advisory
// Dependencies: 930, 931, 932, 933, 934, 914, 915
// Status: Deferred — Phase 4


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. INTEGRATION LAYER  [940-949]
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// 940_PropertyConnector
// Purpose: Property OS 对外统一入口（Standard Connector Interface）
// Dependencies: 922_DashboardEngine
// Called By: ConnectorRegistry；Investment OS
// Status: Planned — Phase 1（最小可用版本）

// 941_ReminderIntegrationAdapter
// Purpose: 只 Publish REMINDER_REQUESTED Event 予 ReminderConnector
//   （ADR-P02）；不建立 Trigger；不追踪 Reminder 送达状态
// Dependencies: ReminderConnector（外部）
// Status: Planned — Phase 1
// ⚠ 依赖风险：见 Constitution §8 与 913 条目

// 942_InvestmentIntegrationAdapter
// Purpose: 提供 Property ROI/Cashflow/Debt Ratio 予 Investment OS
// Dependencies: InvestmentConnector（是否已存在待核实）
// Status: Deferred — Phase 4

// 943_NewsIntegrationAdapter
// Purpose: 订阅 Interest Rate/OPR/Property Policy 等新闻
// Dependencies: NewsConnector（News OS 可能尚未建置）
// Status: Deferred

// 944_PropertyTelegramCommands
// Purpose: /property_due [week|month]、/property_paid <category>
//   <args> 指令解析与转发
// Dependencies: 912_ObligationEngine, 922_DashboardEngine
// Called By: Telegram Layer（共用路由器）
// Status: Planned — Phase 1

// 945_DocumentImportAdapter
// Purpose: [ADR-P05] 未来 OCR/Email/PDF 账单摄入，统一转换为
//   UTILITY_BILL_RECEIVED 事件 → 912 消费转为 OBLIGATION_UPDATED；
//   不主动 Poll 任何外部系统（Manual Input/Email OCR/PDF OCR/API/
//   Import 皆汇入同一事件管道）
// Status: Deferred — Phase 5（预留接口，不实作）

// 946_BankReconciliationAdapter
// Purpose: [ADR-P05] 未来银行对账，同样汇入 UTILITY_BILL_RECEIVED
//   管道，不主动 Poll
// Status: Deferred — Phase 5


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. TESTING LAYER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
//   Two suites, on purpose — they check different things (full
//   rationale + comparison table: property-os-tests/README.md).
//
//   A) GAS-NATIVE (lives in THIS directory, part of the real project)
//
//   990_TestKit
//   Purpose: GAS-native assert/report utility. No require/module.exports
//     — those don't exist in Apps Script. Pure functions only.
//   Dependencies: 无
//   Status: ✅ Built (2026-07-29)
//
//   991_Tests_ObligationEngine
//   Purpose: Runs against REAL SpreadsheetApp/LockService/CacheService —
//     curated (9 tests, not all 101) to cover specifically what a
//     simulation can only approximate: the actual Sheets date-coercion
//     fix, actual freeze-header, actual Lock/Cache behavior, a real
//     end-to-end createObligation→recordPayment cycle. Refuses to run
//     unless the bound spreadsheet's name contains "TEST"
//     (assertRunningInTestSpreadsheet_) — must be run from a dedicated
//     test copy of the project, never production. cleanupTestData_()
//     cascades PropertyID-pattern-matched test rows through Rules →
//     Occurrences → History.
//   Dependencies: 900-903, 912-913, 990 (all same-project, same global
//     scope — no import mechanism exists or is needed)
//   Called By: run manually from the Script Editor
//   Status: ✅ Built (2026-07-29); logic self-verified by loading it into
//     the Node shim below with a "...TEST..." fake spreadsheet name
//     (9/9 passed there too) — but that only proves 991's OWN logic is
//     bug-free, not that real GAS behaves as assumed. Running it for
//     real, in a real dedicated test spreadsheet, is still outstanding
//     — see MANUAL_VERIFICATION_CHECKLIST.md and TECH DEBT.
//
//   B) NODE SANDBOX (property-os-tests/, a SEPARATE, non-GAS local tool
//      — do not paste any of this into the Apps Script editor)
//
//   property-os-tests/
//     README.md                          — Node-vs-GAS-native rationale
//     shim/GasShim.js                    — mocks SpreadsheetApp/
//       LockService/CacheService/Utilities/Session/Logger via Node's
//       vm module; faithfully reproduces the real Sheets date-coercion
//       bug so the fix itself is actually exercised, not just asserted
//     shim/TestKit.js                    — Node assert/report utility
//     tests/900_Tests_Foundation.js      — 19 tests (Unit)
//     tests/912_Tests_ObligationEngine.js — 40 tests (Unit + State
//       Transition + AI Query)
//     tests/919_Tests_ObligationIntegration.js — 42 tests (Contract +
//       Replay + Reminder/Finance Integration[contract-level] + Migration)
//     tests/999_Tests_PlatformVerification.js — 7 tests (Replay across
//       a longer sequence, Migration cross-reference, Retry, Duplicate
//       Command, ★ Partial Failure — found a real gap, see TECH DEBT,
//       Lock-releases-on-throw). Three categories proposed by CC
//       2026-07-29, adopted locally per ADR-P10 (UEF Candidate Pattern,
//       not yet ecosystem-ratified — see UEF v1.6)
//     runAllTests.js                     — aggregate runner
//     README.md                          — Node-vs-GAS-native rationale
//     MANUAL_VERIFICATION_CHECKLIST.md   — what's still unverified even
//       after BOTH suites (real-world edge cases neither can reach)
//   Status: ✅ 108/108 passing (2026-07-29: 101 original + 7 platform
//     verification), against the actual 900-903/912-913 source.
//
// ═══════════════════════════════════════════════════════════════════════
// END OF 00_File_Map.js
// ═══════════════════════════════════════════════════════════════════════
