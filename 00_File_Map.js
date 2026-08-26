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
 *   - 00_ADR_Log.js                       — ADR-P01~P13 正式记录
 *   - PropertyOS_DomainModel.md           — 跨 Engine 共用领域模型
 *   - ObligationEngine_VerticalSlice.md   — 912/913 完整 Vertical Slice
 *
 * ★ CURRENT DEPLOYMENT MANIFEST（2026-08-17，每次同步真实 GAS 项目时
 * 核对这份清单，逐一比对——散落在各次对话记录里的"这个文件改了"很
 * 容易漏掉，这份清单才是当下应该存在于 GAS 项目里的完整文件集）：
 *
 *   实际推送到 GAS 的文件（.claspignore 排除治理 .js/.md 与 Node-only
 *   测试文件，见该文件本身）：
 *   900_PropertyConfig.js            ← 含全部 DLP/Evidence 枚举、8 张
 *                                       新表 SHEET_NAMES、8 个新
 *                                       ID_PREFIXES（DEFECT 复用既有
 *                                       保留前缀，Evidence 复用
 *                                       DOCUMENT 前缀）
 *   901_PropertySchema.js            ← ensureSheetSchema_ 现有
 *                                       per-execution 缓存；Property
 *                                       新增 DevelopmentName/UnitLabel
 *                                       （ADR-P17，Additive 追加在
 *                                       columns 最后）；8 张 DLP/
 *                                       Evidence 新表 Schema +
 *                                       initDefectEngineSchema_/
 *                                       initDocumentEngineSchema_
 *                                       ★ DefectItem 新增 ItemID/
 *                                       SubCategory/Remark，20 栏
 *                                       reorder（非 append，与
 *                                       Property 的 ADR-P17 模式不同）
 *                                       ——ADR-P18，2026-08-24～26
 *   902_PropertyIdentity.js          ← 含 generatePropertyId_（910）+
 *                                       8 个 DLP/Evidence 用途的
 *                                       generateXId_
 *   903_PropertyEventDefinitions.js  ← 含 Property/Obligation 既有
 *                                       事件 + 12 个 DLP/Evidence 新
 *                                       事件（逐 Phase 新增，非一次性
 *                                       预先列出）
 *   910_PropertyAssetEngine.js       ← createProperty/updateProperty
 *                                       开放 DevelopmentName/UnitLabel
 *                                       （ADR-P17；updateProperty 本身
 *                                       用 denylist 不用 allowlist，
 *                                       不需要改逻辑）
 *   911_DocumentEngine.js            ← 新文件（Phase 5，2026-08-17）。
 *                                       Evidence 最小范围，非完整
 *                                       Document Library。Drive
 *                                       Adapter 隔离在
 *                                       saveEvidenceFile_ 一处
 *   912_ObligationEngine.js          ← recordPayment/reversePayment 的
 *                                       Event Payload 含 category
 *   913_ObligationScheduler.js
 *   918_DefectEngine.js              ← 新文件（Phase 2-3-4-6-7，
 *                                       2026-08-17）。PropertyCase +
 *                                       DefectItem + DailyProgressCheck
 *                                       + Correspondence +
 *                                       RectificationEvent +
 *                                       SecondaryDamage +
 *                                       PropertyCaseTimeline 全部
 *                                       Command/Query
 *   922_DashboardAdapter.js          ← Phase 8（2026-08-17）新增
 *                                       getDlpCaseDashboard/
 *                                       getCaseTimeline/
 *                                       listDefectItemsForDashboard，
 *                                       既有 Obligation 相关函式未动
 *   945_OperatorConsole.html
 *   946_OperatorConsoleServer.js
 *   990_TestKit.js
 *   991_Tests_ObligationEngine.js
 *   992_Tests_PureLogic.js
 *   993_Tests_FullLifecycle.js
 *   994_Tests_ExtendedPlatform.js
 *   995_RunAllTests.js
 *   996_Tests_PropertyAssetEngine.js
 *
 *   （共 19 个 .js/.html 文件推送到真实 GAS。997_Tests_DefectEngine.js
 *   ——DLP 新增部分的正式 GAS-native 测试——尚未建立，Phase 11，未开始；
 *   目前 DLP 相关验证是本地 GasShim 预检 + CC 逐 Phase 真实部署 smoke
 *   test，非正式测试套件的一部分，见 MANUAL_VERIFICATION_CHECKLIST.md。
 *   若真实 GAS 专案的文件数量或任一文件内容与此不符，先同步再跑
 *   测试——大部分"莫名其妙的 undefined"报错都是这里没对齐，不是逻辑
 *   真的错了。）
 *
 *   ★ ADDENDUM（2026-08-24～26，Phase 11 对话窗口新增，不改上面
 *   2026-08-17 原文）——上面清单在两轮真实部署后已经过时，本次只补
 *   本窗口有把握、直接核实过的部分，不假装把整份 manifest 全部
 *   重新对过：
 *
 *   本窗口新增并已部署到真实 GAS 的文件（CC 已确认部署 (a)(b)(c) 三步
 *   成功，见 00_Project_State.js CHANGELOG 2026-08-24～26 / ADR-P18）：
 *     ONETIME_Phase11_DefectImporter.js — 上一个对话窗口新建（Phase
 *       11 一开始），当时就没有补进这份 File Map，本窗口发现这个既有
 *       缺口一并补上。真实 Defect Report 批次汇入用的一次性工具，
 *       staging 表 + dry-run/real-run 两阶段、以 OriginalReference
 *       为 durable dedup key。本窗口新增 ItemID/SubCategory/Remark 三
 *       个 staging 欄位支援。Phase 11 DefectItem onboarding 验证完成
 *       後可删除（见档案自己的开头说明）。
 *     ONETIME_Phase11_DefectItemSchemaReorderMigration.js — 本窗口
 *       新建。把真实 DefectItems 表从 migration 前的 17 栏 schema
 *       转成 CC 指定顺序的新 20 栏 schema，以栏位名字逐列重新映射
 *       既有资料，非按位置搬移。CC 已在真实 GAS 项目手动执行一次，
 *       Logger 回报 MIGRATION SUCCESS。同样是一次性工具，语意上跟
 *       Importer 同类——是否比照 Importer 保留到 Phase 11 完全结束
 *       再删，还是现在就可以删，未问过 CC，留待下次确认。
 *
 *   ★ 已知落差，本窗口未处理（如实记录，不是修好了）：上面
 *   2026-08-17 原文清单也没有 947_DlpConsoleServer.js /
 *   948_MobileConsole.html（Phase 9/10，2026-08-19 才建立，比这份
 *   manifest 原文晚两天）——这是本窗口之前就存在的落差，不是这次造成
 *   的，但本窗口没有去核实/补齐这两个文件的条目（不在这次 CC 交代
 *   的范围内，也没有重新核实这两个文件目前真实内容的证据）。整份
 *   manifest 建议找一次机会重新完整核对一遍，而不是继续用这种
 *   一次补一点的方式维护。
 *
 *   纯治理文件（.claspignore 排除，不推送到 GAS，仅供参考/审计）：
 *   00_ADR_Log.js / 00_Business_Rules.js / 00_File_Map.js（本文件）/
 *   00_Product_Backlog.js / 00_Project_Constitution.js /
 *   00_Project_State.js / 00_Review_History.js /
 *   DlpDefectEngine_VerticalSlice.md（新，Phase 0-8 完整设计记录）/
 *   MANUAL_VERIFICATION_CHECKLIST.md / ObligationEngine_VerticalSlice.md /
 *   PropertyAssetEngine_VerticalSlice.md / PropertyOS_DomainModel.md
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

// 910_PropertyAssetEngine  ★ 核心新模块 — Runtime Complete
// Purpose: 管理房产主档。四个 Command（Create/Update/MarkSold/
//   ReverseSale）、State Machine 强制（Active⇄Sold，仅经
//   reversePropertySale 可逆，比照 912 的 Paid⇄Active）、单层 Lock、
//   ClientRequestID 幂等（Create）、结构化 Address VO（六栏位）+
//   formatAddress_ 衍生字段（不落库）、PropertyType 用 UPPER_SNAKE_CASE
//   （本系统唯一例外，CC 于 Review Approval 明确指示，见 00_ADR_Log.js）
// Dependencies: 901, 902, 903
// Called By: 912（propertyExists_ 现已真实接上，取代原本的 permissive
//   placeholder）, 922_DashboardEngine（尚未建）, 914_FinanceEngine
//   （尚未建）, 935_DecisionEngine（尚未建）, Telegram Layer（尚未建）
// Status: ✅ Runtime Complete (2026-07-29)。996_Tests_PropertyAssetEngine.js
//   （21 tests）+ 992 扩充（Event Contract/State Machine/formatAddress_，
//   19 tests）逻辑已自我检查全数通过，过程中真的抓到一个 bug：
//   reversePropertySale 原本误呼叫了通用的 assertPropertyTransition_
//   ('Sold','Active')，但 PROPERTY_TRANSITIONS_ 故意没有 'Sold' 这个
//   key（比照 912 的 OCCURRENCE_TRANSITIONS_ 不放 'Paid' 的原因——
//   唯一允许离开 Sold 的路径就是这个 Command 自己的明确检查，不是
//   通用 Map），所以每次呼叫都会抛错。已修正：拿掉那行呼叫，靠原本
//   就有的 PROPERTY_NOT_SOLD 检查即可。待 CC 对真实 GAS 项目实际跑
//   一次确认（TECH DEBT）。

// 911_DocumentEngine  ★ Runtime Complete (minimal scope)
// Purpose: Evidence 附件——DLP Defect Case Vertical Slice 需要的最小
//   范围（attachEvidence/getEvidence/listEvidenceForCase/
//   listEvidenceForDefect），不是原先设想的完整 Document Library（PII
//   文件、全文检索等仍未做，未来若真的要做完整版，从这里长出去，
//   不需要重新命名或换 ID 前缀）。Drive Adapter 隔离在
//   saveEvidenceFile_ 一处（ADR-P07/P11），资料夹结构 Property OS
//   Evidence/<CaseID>/<fileName>。
// Dependencies: 901, 902, 903, 918（caseExists_/defectItemExists_/
//   getDefectItem/appendCaseTimelineEntry_ — 单向依赖，918 不反过来
//   呼叫 911）
// Called By: 918（透过 UI/Console 层协同使用，非直接函式呼叫）,
//   930_PropertyKnowledgeGraph（Future）
// Status: ✅ Runtime Complete，最小范围 (2026-08-17, Phase 5)。真实
//   Drive 上部署确认（真实资料夹/文件 URL，见 MANUAL_VERIFICATION_
//   CHECKLIST.md）。原定的完整 Document Library（PII、全文检索）仍是
//   Planned，未开始。

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
// Status: ✅ Runtime Complete (2026-07-19)。2026-07-29: propertyExists_
//   现由 910_PropertyAssetEngine 提供真实实作（原本的 permissive
//   placeholder已移除——ADR-P07 Adapter 模式的承诺兑现）。
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
// Purpose: Ledger 与 Cashflow 计算（基础版）。ADR-P01 明文禁止维护
//   任何 Due Date/Reminder Schedule/Payment Schedule，只能订阅
//   PAYMENT_COMPLETED/PAYMENT_REVERSED/PROPERTY_SOLD/
//   PROPERTY_SALE_REVERSED，镜像写入不可变的 Ledger（ADR-P06/P10 applied）
// Dependencies: 901, 902, 903；订阅 912/910 事件（非直接依赖，
//   ADR-P12——EventBus 是占位 Adapter，Architecture 不因此妥协）
// Called By: 922_DashboardEngine（尚未建）, 932_CashflowForecastEngine
//   （尚未建，Phase 4）, 942_InvestmentIntegrationAdapter（尚未建）
// Status: ⏳ Vertical Slice 完成（FinanceEngine_VerticalSlice.md），
//   等待 Review Approval，未写 Runtime。两项待确认：(1) Category
//   继承是否透过 getObligation() 唯读查询，还是要求 912 的
//   PAYMENT_COMPLETED payload 直接带 category 栏位；(2) PROPERTY_
//   SALE_REVERSED 的补偿分录用 Expense 还是需要独立语义。

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

// 918_DefectEngine (VP/Defect)  ★ 核心新模块 — Runtime Complete (Phase 1-8)
// Purpose: DLP Defect Case & Rectification Tracking——完整 Case→
//   DefectItem→DailyProgressCheck/Correspondence/RectificationEvent/
//   SecondaryDamage→PropertyCaseTimeline 生命周期。ADR-P15 记录了不拆
//   通用 Case Engine 的决定：PropertyCase.CaseType 目前只有 'DLP'，
//   留扩展口但不预先做 Speculative Design。DeveloperStatus 与
//   OwnerVerificationStatus 严格独立（ADR-P15），DefectItem.Status
//   透过 deriveDefectItemStatus_ 从两者衍生（Lazy Computation），
//   Closed 边界只有 closeDefectItem/reopenDefectItem 能跨越。
// Dependencies: 901, 902, 903, 910（propertyExists_/getProperty，
//   Runtime→Runtime，比照 912 依赖 910 的既有模式）
// Called By: 911（caseExists_/defectItemExists_/getDefectItem/
//   appendCaseTimelineEntry_ 反向被呼叫）, 922（getCaseTimeline 透过
//   propertyCaseTimelineSheet_ 私有函式直接呼叫，比照 922 原本呼叫
//   912 私有函式的既有模式）
// Status: ✅ Runtime Complete，Phase 1-8 (2026-08-17)。真实 GAS 部署
//   逐 Phase 确认（细节见 00_Project_State.js CHANGELOG、
//   DlpDefectEngine_VerticalSlice.md）。Phase 9-11（Mobile Web
//   Console、Sidebar DLP Tab、997_Tests_DefectEngine.js 正式 GAS-
//   native 测试）未开始。已知 Domain Model limitation（非 bug，
//   ADR-P15）：OwnerVerificationStatus 目前是 DefectItem 上的单一
//   栏位，未来若要正确处理"Failed 之后 Developer 重新宣称完成"这种
//   情况，需要 Repair Cycle / Verification Cycle 概念，这次没做。

// 919_RenovationEngine
// Purpose: Quotation/Budget/Timeline/Progress
// Status: Planned — Phase 3

// 920_InsuranceEngine
// Purpose: MRTA/MLTA/Fire/House Insurance
// Status: Planned — Phase 3

// 921_TaxEngine
// Purpose: RPGT/Rental Income Tax/Tax Summary（输出须标注非专业税务意见）
// Status: Planned — Phase 3

// 922_DashboardAdapter  ★ Runtime Complete（文件名与原规划的
//   "922_DashboardEngine" 不同——ADR-P14 实际建立时定名
//   922_DashboardAdapter.js，purpose 跟这里原本的规划相符，只是
//   filename 当时没同步回这份 File Map，一并订正）
// Purpose: 纯 Projection/Query 组合层，不拥有任何 Truth 表
// Dependencies: 910, 912, 918（getDlpCaseDashboard 等 DLP 新增部分）
// Called By: 945/946 Operator Console
// Status: ✅ Runtime Complete。Obligation 相关部分 (ADR-P14,
//   2026-07-29)；DLP Dashboard 部分 (Phase 8, 2026-08-17) —
//   getDlpCaseDashboard/getCaseTimeline/listDefectItemsForDashboard/
//   enrichPropertyCaseForDisplay_/enrichDefectForDisplay_/
//   isRectificationEventUpcoming_。914/915/916/917 尚未建，届时若
//   要加对应 Dashboard 数据，比照同一组合模式扩充，不需要重新设计。


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
// Dependencies: 912_ObligationEngine, 922_DashboardAdapter
// Called By: Telegram Layer（共用路由器）
// Status: Planned — Phase 1

// ⚠ 号码冲突记录（2026-08-17 发现，订正；2026-08-19 更新）：945/946
// 原本规划给下面两个 Deferred 概念，但 Operator Console（945_
// OperatorConsole.html / 946_OperatorConsoleServer.js）实际建立时占用
// 了这两个号，当时没有同步回这份 File Map。这两个 Deferred 概念本身
// 没有变，等真的要做时需要挑其他空号——2026-08-19 后 947/948 也已被
// DLP Mobile Console 占用（见下方），候选号段因此变成 949+ 或 94x 里
// 其他未占用的，不是现在的待办，先如实记录冲突存在。

// 945_DocumentImportAdapter（号码待重新分配，见上方冲突说明；
//   947/948 已被占用，候选号段是 949+）
// Purpose: [ADR-P05] 未来 OCR/Email/PDF 账单摄入，统一转换为
//   UTILITY_BILL_RECEIVED 事件 → 912 消费转为 OBLIGATION_UPDATED；
//   不主动 Poll 任何外部系统（Manual Input/Email OCR/PDF OCR/API/
//   Import 皆汇入同一事件管道）
// Status: Deferred — Phase 5（预留接口，不实作）

// 946_BankReconciliationAdapter（号码待重新分配，见上方冲突说明；
//   947/948 已被占用，候选号段是 949+）
// Purpose: [ADR-P05] 未来银行对账，同样汇入 UTILITY_BILL_RECEIVED
//   管道，不主动 Poll
// Status: Deferred — Phase 5

// 945_OperatorConsole.html + 946_OperatorConsoleServer.js
//   ★ 实际部署的 945/946（Runtime Complete）
// Purpose: HtmlService Sidebar，Tab 式单页应用，透过
//   google.script.run.withSuccessHandler() 呼叫 946 的 console_* thin
//   wrapper（console_wrap_ 统一 try/catch），业务逻辑 0% 留在这两个
//   文件里，全部转发给 Domain 层（910/912/918/922）。ADR-P14 建立。
// Dependencies: 910, 912, 918（透过后续 DLP Tab，尚未加）, 922
// Status: ✅ Runtime Complete，实战使用中 (2026-07-29 起)。DLP 专属
//   Tab（Sidebar 端——跟下面 947/948 的 Mobile Console 是两个不同 UI
//   Surface，各自独立设计）仍未加入。UI Contract Design 讨论时 CC
//   明确把 Sidebar DLP Tab 排除在那次范围外
//   （DlpMobileConsole_UIContract.md §0），需要另外一轮设计对话才会做。

// 947_DlpConsoleServer.js + 948_MobileConsole.html   ★ 新 (2026-08-19)
// Purpose: DLP Mobile Console（Phase 9/10 合并交付——原规划是两个
//   Phase，因为 Daily Check 变成整个落地页而非加在通用 Shell 之后的
//   功能，合并成一次交付）。947 是 doGet() Web App 入口 + dlp_* thin
//   wrapper（dlp_wrap_ 统一 try/catch，跟 946 的 console_wrap_ 同一
//   纪律），948 是独立页面本身（Daily Check 表单 + Saved 状态 + 拍照
//   Evidence + 唯读 Case Overview）。947 设计上预留给未来 Sidebar DLP
//   Tab 共用，避免两个 UI Surface 各自重复一套 wrapper。完整设计
//   过程/理由/未来变更边界见独立文件 DlpMobileConsole_UIContract.md。
// Dependencies: 900（ACTIVE_DLP_CASE_ID/OPERATOR_NAME，MVP
//   Configuration，非 Domain——见 Contract §9.1/§9.2）, 910
//   （getProperty）, 918（getPropertyCase/logDailyProgressCheck）,
//   911（attachEvidence）, 922（getDlpCaseDashboard/
//   listDefectItemsForDashboard/getCaseTimeline）
// Called By: doGet()（947 本身就是 Web App 入口，没有更上层的呼叫者）
// Status: ⏳ RUNTIME CODE COMPLETE, NOT PRODUCTION-READY。node --check
//   语法检查通过，零真实 GAS 执行、零真机测试。appsscript.json 已加
//   webapp 区块（executeAs: USER_DEPLOYING, access: MYSELF）但尚未
//   实际部署。Production-Ready 前置条件：Contract §11 的 11 步真机
//   验证 Gate 全部通过。CC 会带真机测试结果回来更新此状态——下一个
//   session 看到本条目时不要假设已经跑过。


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. TESTING LAYER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
//   ★ 2026-07-29：CC 明确指示 Property OS 只在 Google Apps Script 用，
//   所有代码都要是 GAS 能跑的——原本的 property-os-tests/（Node 本地
//   沙箱，用 require/module.exports/vm，从来就不是拿来贴进 Apps
//   Script 编辑器的）已从本项目移除，不再是 Property OS 的一部分。
//   之前那 108 个测试涵盖的东西，已经全部搬进下面这几个纯 GAS-native
//   文件，没有遗漏——搬迁细节见 00_Project_State.js changelog。
//
//   全部都是纯 Apps Script 语法（无 require/module.exports/process/
//   __dirname），跟 900-903/912-913 贴在同一个 GAS 专案里，靠 GAS
//   本身的共用全域作用域互相调用，不需要任何 import 机制。
//
//   990_TestKit
//   Purpose: GAS-native assert/report utility
//   Dependencies: 无
//   Status: ✅ Built (2026-07-29)
//
//   991_Tests_ObligationEngine
//   Purpose: 真实 SpreadsheetApp/LockService/CacheService——9 个测试，
//     聚焦在只有真实环境才能验证的部分：真实日期防护、真实 freeze
//     header、真实 Lock/Cache、端到端 create→pay 真实转到下一期。
//     assertRunningInTestSpreadsheet_ 安全防呆（spreadsheet 名字须含
//     "TEST"）、cleanupTestData_ 级联清理，两者定义于本文件，供
//     992-995 共用（同一 GAS 专案共用全域作用域）
//   Dependencies: 900-903, 912-913, 990
//   Status: ✅ 已在 CC 真实 GAS 专用测试 spreadsheet 跑过，9/9 通过
//
//   992_Tests_PureLogic  ← 新增 2026-07-29
//   Purpose: 纯函数测试，零 Sheet 写入，可安全在任何环境跑。涵盖 ID
//     产生格式、日期工具、addFrequencyToDate_ 全部频率类型（含月底
//     闰年 clamp）、Overdue 判定、State Machine guard、9 种 Event
//     Contract 的必填栏位系统性检查
//   Dependencies: 900-903, 912-913
//   Status: ✅ 75 tests（56 原有 + 19 于 910 完成后新增：4 种 Property
//     Event Contract、assertPropertyTransition_、formatAddress_），
//     逻辑已用私有 Node shim 自我检查（75/75），
//     待 CC 对真实 GAS 项目实际跑一次
//
//   993_Tests_FullLifecycle  ← 新增 2026-07-29
//   Purpose: 真实 Sheets 上的完整 Command 生命周期——7 个 Command 的
//     validation/success/idempotency、cancel/pause/resume、
//     reversePayment 全周期、AI Query 过滤
//   Dependencies: 900-903, 912-913, 990, 991（共用 assertRunning
//     InTestSpreadsheet_/testPropertyId_/cleanupTestData_）
//   Status: ✅ 27 tests，逻辑已自我检查（27/27），待 CC 实跑
//
//   994_Tests_ExtendedPlatform  ← 新增 2026-07-29
//   Purpose: Replay（多步骤真实序列）、Retry、Duplicate Command、
//     ★ Partial Failure（真实故障注入，在真实 GAS 里覆写全域函式，
//     手法跟之前 Node 版本一样，因为 GAS 本身也是共用全域作用域）、
//     Lock 释放、Reminder Contract、Migration 机制检查（验证
//     OBLIGATION_CATEGORIES 确实是 frozen，新增类别必须走真实的
//     源码编辑+部署，不是 runtime 能改的）
//   Dependencies: 900-903, 912-913, 990, 991
//   Status: ✅ 7 tests，逻辑已自我检查（7/7），待 CC 实跑
//
//   995_RunAllTests  ← 新增 2026-07-29
//   Purpose: 依序跑完 991-994、996，输出汇总。runAllPropertyOSTests()
//   Dependencies: 990-994, 996
//   Status: ✅ 汇总已自我检查：139/139（56+19+9+27+7+21，见下方明细）
//     全数通过
//
//   996_Tests_PropertyAssetEngine  ← 新增 2026-07-29（910 Runtime 完成）
//   Purpose: 910 四个 Command 的 validation/success/state transition，
//     含 propertyExists_/createObligation 的跨 Engine 整合确认
//   Dependencies: 900-903, 910, 990, 991（共用安全防呆/cleanupTestData_）
//   Status: ✅ 21 tests，逻辑已自我检查（21/21，过程中抓到并修正一个
//     真的 bug——见 910 条目），待 CC 实跑
//
//   MANUAL_VERIFICATION_CHECKLIST.md（仍保留，独立于本项目 GAS 文件
//   之外，纯文档）—— 即使 99 个 GAS-native 测试都通过，仍有几项
//   （真实并发下的 Lock 竞争、CacheService 真实 1 小时 TTL 到期、
//   GAS 6 分钟执行上限）无法在单次测试跑里验证，如实保留待办，不
//   因为测试数字好看就假装已核实。
//
// ═══════════════════════════════════════════════════════════════════════
// END OF 00_File_Map.js
// ═══════════════════════════════════════════════════════════════════════
