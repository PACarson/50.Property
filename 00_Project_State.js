/**
 * ═══════════════════════════════════════════════════════════════════════
 * PROPERTY OS — 00_Project_State.js
 * 项目状态中心（经常更新 / Updated Frequently）
 * ═══════════════════════════════════════════════════════════════════════
 */


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PROJECT VERSION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
//   PROJECT STATUS  : ACTIVE DEVELOPMENT（整个 Property OS 项目层级
//                     状态——不要与下方特定子系统/Phase 的
//                     PRODUCTION-READY 标记混淆。CC 2026-08-22 明确
//                     要求区分开：Phase 9/10 Mobile DLP Console 这个
//                     子系统已达 PRODUCTION-READY，不代表整个
//                     Property OS 已经 Production-Ready）
//   Current Phase   : Phase 11 — Real DLP/Defect Data Onboarding
//                     （DLP Defect Engine 内部阶段编号；详见下方
//                     NEXT PRIORITY 与 CHANGELOG 2026-08-22 (b)）
//   Current Version : v1.4.0-dlp-defect-engine-phase1-8
//   Current Branch  : （待 CC 指定，建议 property-os/session1-obligation-engine）
//   Blueprint 合规  : Universal Domain OS Blueprint ✓ | UEF v1.6 ✓
//   ADR 状态        : ADR-P01, P02, P04, P05, P06, P07, P08, P10, P11,
//                     P12, P13, P14, P15, P18, P19 APPROVED；ADR-P03
//                     RESERVED（非 Locked）；P09 未使用（跳号）★ 本行
//                     2026-08-26 housekeeping 修正：先前误列的 "P16"
//                     在 00_ADR_Log.js 里完全没有对应条目（已核实，
//                     grep 零命中），拿掉；先前遗漏的 P11-P14 補上
//                     （四者在 00_ADR_Log.js 里都有完整 STATUS:
//                     APPROVED (2026-07-29) 条目，只是这行摘要没同步
//                     列出）。另外如实记录：ADR-P17 在多处（901、
//                     File_Map、ADR-P18/P19 的 Related ADRs）被当成
//                     已存在、已批准的决定引用（Property
//                     DevelopmentName/UnitLabel 用 Additive 而非
//                     Reorder），但 00_ADR_Log.js 里找不到 ADR-P17
//                     自己的正式条目——这是本次housekeeping 发现但
//                     刻意不擅自补写的缺口（内容涉及还原一个没有
//                     亲身参与的决策，非单纯排版/编号修正），记入
//                     Backlog，见 00_Product_Backlog.js
//   Review 状态      : Architecture Review Approval GRANTED (2026-07-19)；
//                     Foundation 层（900-903）APPROVED (2026-07-19)；
//                     REVIEW-001 Production Readiness Audit
//                     Conditional Go（00_Review_History.js）；
//                     DLP Defect Engine Phase 0 Audit APPROVED
//                     (2026-08-15/16，见独立 DlpDefectEngine_
//                     VerticalSlice.md)
//   Runtime 代码     : Foundation（900-903）+ 910_PropertyAssetEngine +
//                     911_DocumentEngine（Evidence，最小范围）+
//                     912_ObligationEngine + 913_ObligationScheduler +
//                     918_DefectEngine（PropertyCase/DefectItem/
//                     DailyProgressCheck/Correspondence/
//                     RectificationEvent/SecondaryDamage/
//                     PropertyCaseTimeline）+ 922_DashboardAdapter
//                     （含 DLP Dashboard）+ 945/946 Operator Console，
//                     全部完成，已部署到 CC 实际 GAS 项目并逐 Phase
//                     确认跑通。测试：141 个纯 GAS-native 测试
//                     （990-996）全数通过；918/911/922 的 DLP 新增
//                     部分另有 210+ 项本地 GasShim 预检（含一次真实
//                     抓到并修复的逻辑 bug，见 ADR-P15），逐 Phase
//                     真实部署 smoke test 确认（Phase 5 含真实 Drive
//                     文件/资料夹 URL）。EventBus 仍是 Logger 占位
//                     （ADR-P07，刻意如此）。997_Tests_DefectEngine.js
//                     （GAS-native 正式测试文件）尚未建立——Phase 12
//                     （原为 Phase 11，2026-08-22 (b) 因编号冲突顺延，
//                     详见下方 CHANGELOG），未开始。
//                     ★ 以上全部已真实验证，包含 947_
//                     DlpConsoleServer.js（doGet() + dlp_* thin
//                     wrapper）+ 948_MobileConsole.html（DLP Mobile
//                     Console）+ 900_PropertyConfig.js 新增
//                     ACTIVE_DLP_CASE_ID（真实值 CASE-msxyfkpi-zu4j）/
//                     OPERATOR_NAME（MVP Configuration，非 Domain，见
//                     DlpMobileConsole_UIContract.md §9.1/§9.2）+
//                     appsscript.json 新增 webapp 区块（executeAs:
//                     USER_DEPLOYING, access: MYSELF，§9.3）+
//                     922_DashboardAdapter.js 新增
//                     buildCaseOverviewForMobile_（真机验证过程中
//                     新增，非原 UI Contract 规划内容，见下方
//                     CHANGELOG 2026-08-22）。PHASE 9/10 STATUS:
//                     PRODUCTION-READY（2026-08-22，仅限 Phase 9/10
//                     Mobile DLP Console 子系统，不代表整个 Property
//                     OS——见本文件最上方 PROJECT STATUS 欄位）——
//                     Contract §11 的 11 步真机验证 Gate 全部通过。
//                     验证过程中发现并修复的问题（N+1 查询、
//                     google.script.run 序列化、client-side
//                     timeout）与详细过程见下方 CHANGELOG 2026-08-22
//                     条目、REVIEW-002（00_Review_History.js）。


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMPLETED 已完成模块
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
//   - Property OS 架构映射（doc1 + Obligation Engine 补充规格 → Blueprint）
//   - 00_Project_Constitution.js / 00_Project_State.js / 00_File_Map.js v0.1
//   - ADR-P01~P05 确认/新增，00_ADR_Log.js 建立 — 本次
//   - Constitution/File Map 同步更新至 v0.2（Documentation Drift 修正：
//     Event 命名 PascalCase → UPPER_SNAKE_CASE）— 本次
//   - Obligation Engine Vertical Slice（14 项 Deliverables 全部完成，
//     Contract Design 层级，非 Runtime）
//   - Property OS Domain Model（独立文件）
//   - Architecture Review Approval GRANTED（本次）：ADR-P01/P02/P04/P05
//     APPROVED，ADR-P03 RESERVED，ADR-P06（Event Immutability）新增
//     APPROVED；Overdue-as-Derived-State 与 Reminder Cancellation
//     责任归属两项 [NEEDS CONFIRMATION] 正式拍板
//   - Vertical Slice 同步修订，纳入 ADR-P06（ReversePayment Command /
//     PAYMENT_REVERSED Event / State Machine 例外）
//   - Foundation 层 Runtime 完成并批准：900_PropertyConfig,
//     901_PropertySchema（含 append-only 与 schema-drift 保护）,
//     902_PropertyIdentity, 903_PropertyEventDefinitions
//   - ADR-P07（Infrastructure Adapter Pattern）新增 APPROVED——
//     publishPropertyEvent_() 正式追认为 EventBus 的唯一 Adapter，
//     Logger 占位是刻意设计，非技术债
//   - Constitution 新增 P11（Infrastructure Adapter Isolation）
//   - 912_ObligationEngine Runtime 完成：七个 Command（Create/Update/
//     RecordPayment/Cancel/Pause/Resume/ReversePayment）、State Machine
//     强制、单层 Lock、两种幂等机制、AI Query（queryUpcomingPayments/
//     queryOverdue）
//   - 913_ObligationScheduler Runtime 完成：月末 clamp 的 Frequency
//     日期运算、Overdue Derived-State 判定、REMINDER_REQUESTED 建构
//     与发布
//   - 901_PropertySchema 补强：dateColumns 纯文字格式保护、共用 Row/
//     日期工具（propertyError_、toIsoDate_ 系列、readRowAsObject_ 系列）
//   - ensureSheetSchema_ 新增所有 Sheet 强制 Freeze Header Row（新建
//     与既有 Sheet 皆适用，既有的三张 Obligation 表下次呼叫即自动套用）
//   - 读取 UEF v1.3 全文，产出 UEF v1.4（Infrastructure Adapter 提升为
//     UCR7、新增 Candidate Patterns 机制/D7、Failure Catalog+EP4 各
//     补一条），发现并标记一项未解冲突（见 TECH DEBT #7）
//   - CC 确认 Runtime 现实验证：initObligationSchema_ 已在真实 GAS
//     项目跑过，三张 Sheet 建立成功；试写入 Sheet 也成功
//   - UEF D8：全生态系统文件扩展名改为 .js，Property OS 十个文件
//     完成迁移
//   - Obligation Engine 完整 Test Plan 落地：涵盖 Vertical Slice §13
//     全部 8 类（Unit/Contract/State Transition/Replay/Reminder+
//     Finance Integration[contract-level]/AI Query/Migration）。
//     ★ 原本用 Node shim 跑（101 个测试），2026-07-29 后半段已整个
//     改为纯 GAS-native（990-995，99 个测试）——见下方 (g) 笔记录，
//     这里不重复，property-os-tests/ 已不存在


//   - 910_PropertyAssetEngine Runtime 完成并批准，真实 GAS 确认通过
//     （不再是 IN PROGRESS，见下方新的 IN PROGRESS 内容）
//   - DLP Defect Case & Rectification Tracking Vertical Slice，
//     Phase 0-8 全部完成，逐 Phase 真实部署确认（细节见上方
//     CHANGELOG 2026-08-17 条目、独立的
//     DlpDefectEngine_VerticalSlice.md、00_ADR_Log.js ADR-P15/P16/P17）：
//     - 911_DocumentEngine（Evidence，最小范围，Phase 5）
//     - 918_DefectEngine（PropertyCase/DefectItem/DailyProgressCheck/
//       Correspondence/RectificationEvent/SecondaryDamage/
//       PropertyCaseTimeline，Phase 2-3-4-6-7）
//     - 922_DashboardAdapter DLP Dashboard 新增（Phase 8）
//     - Property 新增 DevelopmentName/UnitLabel（ADR-P17）
//   - DLP Defect Engine Phase 9/10（Mobile Web Console）真机 11 步
//     验证 Gate 全部通过，PRODUCTION-READY（2026-08-22，见下方
//     CHANGELOG）。过程中发现并修复真实 N+1 查询问题（922 新增
//     buildCaseOverviewForMobile_，140 项 Defect 规模下 Sheets 读取
//     288 次降到 4 次）与两项防御性强化（google.script.run 序列化、
//     client-side timeout）。REVIEW-002 记录完整 Production Readiness
//     结果（00_Review_History.js）。


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// IN PROGRESS 开发中模块
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
//   - DLP Defect Engine Phase 11 — Real DLP/Defect Data Onboarding
//     （2026-08-22 新增，CC 明确指示，取代原本"进入纯 Real-Usage
//     Feedback Period"的规划——完整理由见下方 CHANGELOG）。目标不是
//     继续扩展 Engine，而是把 CC 名下 Est8 Seputeh A-19-11 这次真实
//     进入约一星期的 Defect Submission Case，正式建立进 Property OS，
//     开始使用 918/911/922/947/948 现有能力。优先顺序：
//       1. 建立真实 Property Case
//       2. 将现有 Defect Items 全部录入
//       3. 将已有 Defect Report/SnP/相关文件建立 Evidence/Document
//          records
//       4. 有照片的 Defect 建立对应 Evidence
//       5. 开始每天使用 Mobile Console 做 Daily Progress Check
//       6. Developer/Contractor 有任何进度时，记录 Correspondence/
//          Developer Status
//       7. Owner 实际检查后记录 Owner Verification
//       8. 所有后续 Rectification/Reinspection 持续记录
//     ★ 明确纪律（CC 特别强调）：先不要因为真实资料录入而修改 Domain
//     Model。录入过程中若发现栏位不够、workflow 不符实际、Defect
//     类型无法表达、Evidence 关联方式不够好、Repair Cycle 问题真正
//     出现——先记录为 Feedback/Gap（见 00_Product_Backlog.js 新增的
//     Phase 11 Gap 收集说明），不要立即修改 Runtime。除非是真正的
//     data integrity/safety bug，否则先完成整个真实案件的资料
//     onboarding，再一次集中做 Gap Review，而不是每发现一个"不顺手"
//     的地方就改一次 Schema。
//     ★ 2026-08-22 晚更新：Step 2 的 Batch Onboarding Script
//     （ONETIME_Phase11_DefectImporter.js）设计已 Review Approved
//     （34/34 测试，见 REVIEW-003）。尚未执行真实 import——目前状态
//     是 PRE-IMPORT GATE，等 Canonical Defect Count（原始 Defect
//     Report，不用"140+"或"145"）与 Phase 5/6 测试资料归属两项都
//     确认后，才先跑 dry-run，CC review 过 dry-run 结果才批准第一次
//     真实 batch。CC 另外提出一个尚未决定的 DefectItem Schema
//     Migration（新增 ItemID/SubCategory/Remark）——这跟本段"先不
//     因真实资料录入改 Domain Model"的纪律在时序上有张力（这个
//     migration 提议发生在看到真实 Defect Report 之前），已在对话
//     中提出给 CC 决定，本次未执行任何 Schema 变更。
//     ★ 这一步同时化解了原本列在这里、待 CC 决定的问题（Phase 4
//     真实 smoke test 用了真实 Property/Case，去留未定）——不是清掉
//     重来，是正式把那笔真实 Property/Case 当作这次 onboarding 的
//     起点，继续往上补完整，因此原本那笔待办从这里移除。
//   - Sidebar 新增 DLP Tab：仍未开始，优先级提升（2026-08-22 调整，
//     原本排在 914_FinanceEngine 之后，现在改为紧接 Phase 11 之后）。
//     具体 Phase 编号暂不预先分配（2026-08-22 (b) CC 明确指示），
//     等实际执行顺序确定后再编号——不代表优先级不确定，只是编号
//     留待执行时再定。理由：Mobile Console 适合现场 30-60 秒 Daily
//     Check，但真实 Defect 数据的初始录入、整理、Correspondence、
//     Evidence、Defect Item 管理，Desktop Sidebar 会更适合——这正是
//     Phase 11 需要的工具。UI Contract 明确排除在 Phase 9/10 讨论
//     之外（Contract §0：Sidebar DLP Tab 是 Desktop management
//     surface，需要另外一轮设计对话才能动手写 Runtime）。
//   - Phase 12 — 997_Tests_DefectEngine.js（GAS-native 正式测试）+
//     正式文档整理：仍未开始，排在 Sidebar DLP Tab 之后（原本这组
//     内容称"Phase 11"，2026-08-22 (b) 因与新的 Phase 11 = Real
//     DLP/Defect Data Onboarding 编号冲突，顺延为 Phase 12）。


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// KNOWN BUGS 已知问题
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
//   - 无。Pre-Implementation 阶段，尚无可运行代码。


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TECH DEBT 技术债 / 待确认事项
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
//   已解决（由 ADR / Review Approval 拍板）：
//     ✓ Obligation Engine vs Finance Engine 边界 — ADR-P01 已定案
//     ✓ File 号段是否要精确核对 — ADR-P03 定为 Reserved 状态即可
//     ✓ Overdue 是否要写入 Truth Layer — CONFIRMED 为 Derived State
//     ✓ Reminder 取消责任归属 — CONFIRMED 归 Reminder OS
//     ✓ Event 修正机制 — ADR-P06 定案为 Compensating Event
//     ✓ EventBus 具体调用方式如何取得 — ADR-P07 定案：不猜测，
//       publishPropertyEvent_() 作为 Adapter 长期维持占位，等 Personal
//       AI Core Shared EventBus API 定案后再统一接上。这不是"待解决"，
//       是刻意的架构决定，故不再列为待确认项目。
//
//   仍待确认：
//   1. [待确认] ReminderConnector 目前是否已支援"代表其他 OS 的 Entity
//      发布 REMINDER_REQUESTED"—— 我（Claude）无法在此对话中直接检查
//      Reminder OS 的实际代码，需要 CC 或另一个有权限的 session 核实。
//      ★ 这是 Session 1 Part B 实作 913_ObligationScheduler 前最好先
//      确认的前置事项（但同样可以比照 ADR-P07 的做法：先用 Adapter
//      隔离，不确认也能把 Domain 逻辑写完——本次已照此完成 913）。
//   2. [待确认] InvestmentConnector / NewsConnector 是否已存在
//      （News OS 印象中仍在 planned 阶段）。
//   3. [待确认] Entity ID 格式（PROP-/LOAN-/OBL- 等前缀）是否与既有
//      OS（Reminder/Inventory）的 ID 规则一致。
//   4. [已解决 2026-07-29] propertyExists_()（912）曾是 permissive
//      placeholder，因为 910_PropertyAssetEngine 尚未存在。910 完成后
//      已改为真实实作（定义移到 910，912 不再有自己的版本，避免
//      GAS 文件载入顺序造成后定义覆盖前定义的问题——见 912 的
//      File Map 条目）。CreateObligation 的 PROPERTY_NOT_FOUND 验证
//      现在会真的拒绝不存在的 PropertyID。
//   5. [已解决 2026-07-29，后续更新见下] 912/913 尚未有任何测试——
//      当时用 Node shim 建了 101 个测试通过。
//      ★ 进一步更新（同日稍后）：CC 指示 Property OS 只在 GAS 用，
//      所有代码都要是 GAS 能跑的——property-os-tests/（Node 沙箱）
//      已整个移除，不再是本项目的一部分。原本 101 个测试涵盖的內容，
//      已全部搬进纯 GAS-native 的 992/993/994（+ 991 既有的 9 个，
//      995 汇总跑全部），共 99 个测试，无遗漏。见 TESTING LAYER
//      (File Map) 详细清单。
//   6. [已解决 2026-07-29] 991_Tests_ObligationEngine.js 已在 CC 的真实
//      GAS 专用测试 spreadsheet 上跑过，9/9 通过。
//      ★★ 完全关闭（同日稍后）：CC 已跑 runAllPropertyOSTests()
//      （990-995 全部六个文件），真实 GAS、真实 Sheets/Lock/Cache，
//      99/99 全数通过（992: 56/56, 991: 9/9, 993: 27/27, 994: 7/7）——
//      跟自我检查预测完全一致。994 的 ★ Partial Failure 故障注入也在
//      真实环境确认：logPartialFailure_ 真的会在 History 写入失败时
//      大声记录，不只是模拟环境里成立。MANUAL_VERIFICATION_CHECKLIST.md
//      已同步更新，三项 Platform-level verification 全部转为 [x]
//      confirmed；Concurrency/Caching/Runtime limits 几项如实保持
//      未勾选——99/99 通过不等于这几项被间接验证到，没有为了好看
//      而含糊带过。
//   7. [已解决 2026-07-29] .txt vs .gs 冲突（读 UEF v1.4 时发现，历史
//      记录：UEF 当时明文规定所有 project-level 治理文件用 .txt，
//      不用 .gs；但 Property OS 从第一轮开始就是照 CC 给的文件名
//      全部用 .gs，且已在真实 GAS 项目跑过）。CC 直接拍板解决：
//      不选 .txt 也不选 .gs，UEF 全生态系统默认改成 .js（UEF v1.5
//      D8）。Property OS 十个文件已全部改名 .gs→.js，内部交叉引用
//      同步更新（本地记录见 ADR-P08）。
//   8. [新增-发现，非待办] 读 UEF 得知：各 Domain OS 是独立的 GAS
//      部署，彼此只共用 Sheet，不是同一个 Script 项目内的多个文件。
//      如果 Property OS 也是这个模式，ADR-P03 的"待与全局 File Map
//      registry 核对"顾虑可能不成立——不同部署的文件编号本来就不会
//      冲突，900-949 大概率可以直接定案，不需要等一个可能根本不存在
//      的"全局 registry"。這是推论，未向 CC 证实，故仍标待确认，
//      但风险评级可以调低。
//   9. [已解决 2026-07-29] 910_PropertyAssetEngine 的 Runtime + 测试
//      已对 CC 真实 GAS 项目跑过确认：141/141 全数通过（经过两轮
//      诊断修复——文件同步、ensureSheetSchema_ 执行超时——才达到
//      这个结果，过程完整记在上面几笔 CHANGELOG）。至此 990-996
//      全部 20 个文件都已在真实 GAS 环境验证过至少一次。


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// NEXT PRIORITY 下一步开发
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
//   顺序已由 CC 确认（DLP Defect Engine 插队到 914 之前——真实 DLP
//   期限比 Finance Engine 更急迫，ADR-P15 记录了这个决定）：
//   1. ✓ Test Plan 落地——完成，141 个纯 GAS-native 测试（990-996），
//      已对真实 GAS 项目跑过确认，141/141 全数通过
//   2. ✓ 910_PropertyAssetEngine——Runtime 完成，Review Approved，
//      真实 GAS 确认通过
//   3. ✓ 914_FinanceEngine——Vertical Slice APPROVED（ADR-P13）
//   4. ⏸ 914_FinanceEngine Runtime——暂停（ADR-P14）。2026-08-22 CC
//      重新确认继续 Queued：现在最重要的是把正在发生的真实 DLP
//      lifecycle（Case→Defect→Evidence→Daily Check→Developer Status→
//      Owner Verification→Rectification→Reinspection→Close）完整
//      跑过一轮，914 恢复的时机留到那之后再评估（见下方第 12 点）
//   5. ✓ Operator Console（922/945/946）已建好并实战使用
//   6. ✓ DLP Defect Case & Rectification Tracking Vertical Slice
//      Phase 0-8——完成，逐 Phase 真实部署确认（见上方 CHANGELOG）
//   7. ✓ DLP Defect Engine Phase 9/10 UI Contract Design——完成并
//      APPROVED (2026-08-19)，见 DlpMobileConsole_UIContract.md
//   8. ✓ Phase 9/10 Runtime——PRODUCTION-READY（2026-08-22）。真机
//      11 步验证 Gate 全部通过，过程见下方 CHANGELOG 与
//      00_Review_History.js REVIEW-002
//   9. ← 目前在此：Phase 11 — Real DLP/Defect Data Onboarding（新增，
//      2026-08-22，取代原本此处第 10 点"依真实使用回馈决定下一步"的
//      规划）。理由：Property 已进入真实 Defect Submission lifecycle
//      约一星期，Real Defect Data Onboarding 优先于 Finance/Rental/
//      Mortgage；真实使用反馈将在资料录入和 Daily Check 过程中自然
//      产生，不需要另外安排一段"Feedback Period"。完整 8 步优先顺序
//      与"先不要因为真实资料录入而修改 Domain Model"的纪律，详见
//      上方 IN PROGRESS。
//   10. Sidebar 新增 DLP Tab——优先级提升，紧接 Phase 11 之后（原本
//       排在 914 之后，2026-08-22 调整）。具体 Phase 编号暂不预先
//       分配，等实际执行顺序确定后再编号（2026-08-22 (b)）。理由见
//       上方 IN PROGRESS。
//   11. Phase 12 — 997_Tests_DefectEngine.js（GAS-native 正式测试）+
//       正式文档整理——排在 Sidebar 之后，仍未开始（原称"Phase 11"，
//       2026-08-22 (b) 因编号冲突顺延为 Phase 12）
//   12. 累积至少一轮完整 Case 生命周期的真实 onboarding + 使用 Gap 后，
//       集中做一次 Feedback Review，再决定：914 恢复 / Repair Cycle
//       Domain Model 演进（ADR-P15 follow-up，仅在真实出现 Failed
//       Verification → Developer 修复 → 再次 ClaimedCompleted 时才
//       考虑，不提前实现）/ Rental / Mortgage 等
//
//   Operator Console 部署步骤（CC 需要做的）：
//   a. Apps Script 编辑器「+ → HTML」新增文件，命名 945_
//      OperatorConsole（会自动加 .html），贴入内容
//   b. 「+ → 脚本」新增 922_DashboardAdapter.js、
//      946_OperatorConsoleServer.js，贴入内容
//   c. 912_ObligationEngine.js、910_PropertyAssetEngine.js 也要更新
//      （各自新增了 queryRecentPayments / listActiveProperties）
//   d. 存档后重新整理 Google Sheet 分頁——应该会看到新選單
//      「Property OS → Open Operator Console」
//
//   （MANUAL_VERIFICATION_CHECKLIST.md 里少数几项——真实并发 Lock
//   竞争、Cache 真实 1 小时 TTL 到期、真实 schema drift——即使
//   141/141 通过仍验证不到，如实保留，非阻塞性待办）


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MILESTONES 阶段目标
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
//   Phase 0  — Architecture & Governance                     ✓ 完成
//   Phase 1a — Obligation Engine Vertical Slice               ✓ APPROVED (2026-07-19)
//   Phase 1b — Session 1: Foundation (900-903) + 912/913       ✓ 完成 (2026-07-19)
//   Phase 1c — Obligation Engine Test Plan（纯 GAS-native）     ✓ 完成 (2026-07-29)，
//              99 个测试（990-995），property-os-tests/ Node 沙箱已移除
//   Phase 1d — 910_PropertyAssetEngine                        ✓ 完成 (2026-07-29)
//   Phase 1e — 914_FinanceEngine 基础版                        ← 下一步
//   Phase 2  — Mortgage + Rental + Maintenance + Anomaly Detector
//   Phase 3  — Document + Defect + Renovation + Insurance + Tax
//   Phase 4  — Knowledge Graph + Cashflow Forecast + Investment Scoring
//              + Decision Engine
//   Phase 5  — News OS 整合 + OCR/RAG/Semantic Search 等 Future AI Functions


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CHANGELOG 近期更新记录
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
//   2026-08-26      Phase 11 — DefectItem Schema Consolidation。CC 确认
//                   真实 Dry Run + Real Import 均已成功后，决定将
//                   OriginalReference 併入 ItemID（ItemID 成为唯一
//                   dedup key，20→19 栏），Category 改为最终固定 15 值
//                   枚举（取代原 11 值 starter list）。ADR-P19。新增
//                   ONETIME_Phase11_DefectItemSchemaConsolidationMigration.js
//                   （对真实、已有资料的 sheet 做安全 merge，内建
//                   ItemID/OriginalReference 冲突与非法 Category 双重
//                   preflight，任一触发即整体中止、zero writes，不自动
//                   选择或转换）。本次严格未执行 Dry Run/Real
//                   Import，也未对真实 DefectItems 表做任何写入——CC
//                   明确指示这是 schema 整理，不是重新导入。完整
//                   impact analysis、逐档案变更清单、变更前後 schema
//                   对照见 00_Review_History.js REVIEW-005。
//
//   2026-08-24～26   Phase 11 Pre-Import Gate — DefectItem Schema
//                   Migration（ItemID/SubCategory/Remark）完成，CC 在
//                   真实 GAS 项目三步驟確認成功。ADR-P18。同一对话窗口
//                   内跨多轮完成——完整 Timeline/逐项验证证据见同次
//                   对话产出的 Checkpoint 文件（CHECKPOINT_
//                   2026-08-26_Phase11-SchemaMigration.md），此处只记
//                   最终确认状态，细节不重复。
//
//                   ★ 决定：新增 ItemID（Developer App 项目编号，CC
//                   手动 key in，非 Property OS 自动抓取）/
//                   SubCategory（无 enum，自由文字）/Remark（自由
//                   文字）。初版方案是 append 在既有 17 栏最后，CC
//                   后来推翻，改为严格指定顺序（reorder，非
//                   append）：DefectID/CaseID/ItemID/
//                   OriginalReference/Category/SubCategory/
//                   Description/Remark/Location/Priority/Status/
//                   DeveloperStatus/OwnerVerificationStatus/
//                   SubmittedAt/RectificationStartDate/
//                   DeveloperClaimedCompletedDate/OwnerVerifiedDate/
//                   ClosedDate/CreatedAt/UpdatedAt（20 栏）。
//                   OriginalReference 维持 Importer dedup key 不变，
//                   刻意不与 ItemID 合并（两者语义有重叠但 CC 明确
//                   要求独立）。ItemID 可编辑（外部参照，非 Property
//                   OS Identity）；DefectID 仍是唯一不可变 PK。
//
//                   ★ Reorder 让 ensureSheetSchema_ 原本的 positional
//                   比对必然失败，新增
//                   ONETIME_Phase11_DefectItemSchemaReorderMigration.js
//                   做真正的 Migration（preflight 比对旧 header →
//                   按栏位"名字"逐列重新映射，非按位置 → 写入 →
//                   逐栏逐列比对新旧一致才算成功；idempotent，header
//                   已符合新 schema 则安全 no-op）。本地测试过程中
//                   实际抓到并修复一个真实 bug：新位置的日期栏位
//                   migration 前漏了 setNumberFormat('@')，会被真实
//                   Sheets 自动转型成 Date（而非 Property OS 预期的
//                   ISO 字串）——已修正为比照 ensureSheetSchema_ 原本
//                   对日期栏位的处理方式。全程检查过 Mobile Console
//                   （947/948）/918/922/Importer 对 DefectItem 的
//                   存取——确认全部经由 readRowAsObject_/
//                   objectToRowArray_/updateRowFields_ 具名存取，零
//                   硬编码 column index，reorder 对这些档案完全透明，
//                   未改动代码。
//
//                   ★ CC 实际执行结果（本人操作，非 Claude 代为
//                   执行——Claude 没有工具能直接写真实 Google
//                   Sheet）：8 个档案部署到真实 GAS 项目 ✓ → 手动跑
//                   phase11_migrateDefectItemSchemaReorder() 看到
//                   MIGRATION SUCCESS ✓ → Mobile Console 手动碰过，
//                   无 Schema drift 报错 ✓。真实 DefectItems 表实际
//                   migrated row 数未经 Claude 直接确认——若需要精确
//                   数字，请查该次执行的 Logger/Execution 记录。顺带
//                   发现并修复：DefectImportStaging（Importer 自己的
//                   暂存表，与 DefectItem 真实表无关）原本 setup 函式
//                   漏了 setFrozenRows(1)，是既有 gap，CC 实际操作时
//                   才发现，已补上，与本次栏位改动无关。
//
//                   ★ Schema Freeze 生效（ADR-P18 记录）：DefectItem
//                   schema 从此冻结。真实 Defect Report 录入过程中
//                   如冒出新栏位需求，一律先进
//                   00_Product_Backlog.js 的 Feedback/Gap（既有机制，
//                   Phase 11 一开始就写好，非本次新增），不当场改
//                   Domain/Runtime，除非是 data integrity/safety
//                   bug。
//
//                   ★ STATUS：Schema Migration 本身 COMPLETE +
//                   VERIFIED。Pre-Import Gate 的 Item A（原始 Defect
//                   Report 真实数量/内容）依然 OPEN——Report 在
//                   Developer App 里，AI 无法直接读取，需 CC 逐项
//                   key in／提供截图。Item A 解决、CC 明确要求开始
//                   录入前，不进行 Dry Run 或 Real Import（CC 多次
//                   明确指示，Claude 也确认从未对真实资料执行过
//                   这两者）。
//
//   2026-08-22 (a)  DLP Defect Engine Phase 9/10 真机验证完成，
//                   PRODUCTION-READY；同日 CC 调整下一阶段优先顺序
//                   为 Phase 11 — Real DLP/Defect Data Onboarding。
//
//                   ★ 真机验证过程（Contract §11 的 11 步 Gate）：
//                   Test Case 1-10 一次到位（部署/doGet()/Bootstrap/
//                   Daily Check 存档/Saved 状态/照片 Evidence/既有
//                   918-911-922 无 regression）。Test Case 11（Case
//                   Overview）第一轮失败——空白面板，无任何内容显示。
//                   诊断过程（多轮，逐步排除）：
//                   (a) 先用本地 GasShim 对 922/948 的实际代码跑多组
//                   真实数据场景（空 Case、真实 Case 形状、140 项
//                   Defect 满载），并用假 DOM harness 直接执行未修改
//                   的 948 <script> 区块，全数正常——排除了 Domain
//                   逻辑与 Client 渲染逻辑本身有 bug 的可能，同时
//                   顺手发现并修复一个跟本次症状无关的独立问题：
//                   GasShim.js 的 SpreadsheetApp mock 缺 flush()（910
//                   的 withPropertyLock_ 2026-07-29 就在用，真实 GAS
//                   本来就有，只是本地预检 harness 没跟上），
//                   local_precheck_test_918/922/911.js 三个文件在此
//                   之前其实跑不动。已给 CC 一行修复，★ 尚未确认是否
//                   已套用到 CC 的实际 GasShim.js，留待下次核对。
//                   (b) 真机 Executions log 显示 dlp_getCaseOverview
//                   "Completed"、6.8 秒、无 error，但前端完全空白——
//                   加上 google.script.run 边界的 JSON.stringify/
//                   parse 防御性修改（scoped 在 dlp_getCaseOverview
//                   这一支，没有动 dlp_wrap_ 本身，因为其他三支
//                   dlp_* 已确认真机可用）。★ 确切根因是否真的是
//                   "复杂 payload 让 google.script.run 序列化悄悄
//                   失败"未 100% 锁定，这个修改是防御性质，不是已
//                   证实的根因修复，如实记录不夸大。
//                   (c) 症状转变为卡在 Loading 不动——这次用实际
//                   instrumented 测量（包 SpreadsheetApp.getRange().
//                   getValues() 呼叫次数），对真实 140 项 Defect 规模
//                   重现：旧路径（getDlpCaseDashboard +
//                   listDefectItemsForDashboard + getCaseTimeline）
//                   实测 288 次 Sheets 读取——enrichDefectForDisplay_
//                   在 listDefectItemsForDashboard 的迴圈内对每个
//                   Defect 各呼叫一次 getPropertyCase/getProperty，
//                   即使同一个 Case 的所有 Defect 结果完全相同也重复
//                   查——这是真实、已测量确认的 N+1，不是猜测。
//                   ★ 修复：922_DashboardAdapter.js 新增
//                   buildCaseOverviewForMobile_，单次组装，只读取
//                   移动端真正会显示的 4 张表（PropertyCase/Property/
//                   DefectItem/PropertyCaseTimeline）各一次，不动
//                   getDlpCaseDashboard/listDefectItemsForDashboard
//                   本身（两者仍留给未来 Sidebar DLP Tab 用，这是
//                   Candidate Pattern 纪律——不因为一个呼叫方的效能
//                   需求就改共用函式）。同样规模下实测降到 4 次
//                   Sheets 读取（99% 减少），输出与旧路径逐栏位比对
//                   完全一致。同时补上 loadBootstrap（10 秒）/
//                   openOverview（20 秒）两个 client-side timeout +
//                   settled guard，不管日后根因是什么，都不会再无限
//                   卡在 Loading。
//                   (d) CC 确认最终版本"顺利跑通了"——Test Case 11
//                   通过，11 步 Gate 全数完成。
//
//                   ★ STATUS 更新：DLP Defect Engine Phase 9/10
//                   （Mobile Web Console）PRODUCTION-READY。
//                   MANUAL_VERIFICATION_CHECKLIST.md Test Case 11
//                   待 CC 同步勾选（本次 Governance 更新未直接改
//                   该文件）。REVIEW-002 记录本次 Production
//                   Readiness 结果，见 00_Review_History.js。
//
//                   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
//                   ★ CC 同日调整下一阶段优先顺序（明确指示，非
//                   Claude 提议）：取代上一次对话建议的"进入纯
//                   Real-Usage Feedback Period，依真实使用回馈决定
//                   914 恢复/Repair Cycle 演进/Rental/Mortgage"，改为
//                   Phase 11 — Real DLP/Defect Data Onboarding。CC
//                   原话记录的理由：「Property 已进入真实 Defect
//                   Submission lifecycle，因此 Real Defect Data
//                   Onboarding 优先于 Finance/Rental/Mortgage；真实
//                   使用反馈将在资料录入和 Daily Check 过程中自然
//                   产生」——现在正好是 Defect Submission 约一星期、
//                   918 Defect Engine 已完成的时机，把真实 Case/
//                   Defect Items/Evidence/Correspondence 等资料正式
//                   建立进 Property OS，而不是先暂停开发等回馈。
//                   完整 8 步优先顺序、"先不要因为真实资料录入而
//                   修改 Domain Model"的纪律、Sidebar DLP Tab 优先级
//                   提升的理由，已记入上方 IN PROGRESS 与 NEXT
//                   PRIORITY。914_FinanceEngine 与 Repair Cycle/
//                   ADR-P15 follow-up 两项明确维持 Queued，理由同上。
//
//                   ★ Phase 编号说明（Claude 整理，非 CC 原话指定，
//                   待 Review 时确认）：2026-08-19 条目曾用"Phase
//                   9-11"统称 Mobile Console+Sidebar+997 测试+文档
//                   整理，其中"Phase 11"当时指 997_Tests_
//                   DefectEngine.js + 正式文档整理（见下方 2026-08-19
//                   条目）。这次 CC 新指示的"Phase 11"专指 Real
//                   DLP/Defect Data Onboarding，与旧标签冲突。本次
//                   更新采用新指示的编号（Real Data Onboarding =
//                   Phase 11），997 测试/文档整理暂不强行编号，留在
//                   Sidebar 之后、未特别标记——如果这个处理方式不是
//                   CC 想要的，麻烦下次说一声，再统一调整编号。
//
//                   ★ 本次范围：只更新 00_Project_State.js/
//                   00_Product_Backlog.js/00_Review_History.js 三份
//                   Governance 文件，没有动任何 Runtime 代码或开始
//                   Sidebar DLP Tab 设计——CC 明确要求"更新完
//                   Governance 后先停下来 Review，不要直接扩大
//                   Scope"，照办。
//
//   2026-08-22 (b)  CC Review (a) 条目产出的三份 Governance 文件，
//                   基本批准，提出四项修正后才正式 Review Approved
//                   （完整 Disposition 见 00_Review_History.js
//                   REVIEW-002 Addendum）：
//                   (1) Phase 编号冲突——(a) 条目当时如实记录了冲突但
//                   未解决，留待 CC 确认。CC 这次拍板：Phase 11 保留
//                   给 Real DLP/Defect Data Onboarding；原本占用
//                   "Phase 11"这个编号的 997_Tests_DefectEngine.js+
//                   正式文档整理，顺延为 Phase 12；Sidebar DLP Tab
//                   暂不预先编号，等实际执行顺序确定后再分配——本文件
//                   PROJECT VERSION/IN PROGRESS/NEXT PRIORITY 已同步
//                   修正。★ (a) 条目本身与 2026-08-19 条目的原始叙述
//                   保留不改（CC 明确指示"CHANGELOG 可以保留历史
//                   记录"——那两笔当时确实是那个状态，不回头改写
//                   历史）。
//                   (2) PRODUCTION-READY 状态范围——CC 指出不应把整个
//                   Property OS 的 PROJECT STATUS 标成 PRODUCTION-
//                   READY，只有 Phase 9/10 Mobile DLP Console 这个
//                   子系统达到。本文件最上方 PROJECT VERSION 新增
//                   PROJECT STATUS/Current Phase 两个栏位：整个
//                   Property OS 项目层级状态是 ACTIVE DEVELOPMENT，
//                   Current Phase 是 Phase 11——明确跟 Phase 9/10
//                   子系统的 PRODUCTION-READY 标记分开，不再共用一个
//                   容易混淆的"STATUS:"欄位。Runtime 代码欄位与
//                   REVIEW-002 的结论行同步补上"PHASE 9/10"范围
//                   限定字样。
//                   (3) JSON.stringify 修复的诚实描述——CC 明确要求
//                   保留：这是 defensive serialization workaround，
//                   不是已证实的原始 Loading 问题唯一根因。
//                   REVIEW-002 FINDING-2 原文不改，本来就是这样写的。
//                   (4) GasShim flush() 状态——CC 明确指示：目前没有
//                   确认实际 GasShim.js 已套用该修复，保持 UNVERIFIED
//                   / OPEN，不能假设已完成。REVIEW-002 FINDING-3
//                   原文不改，补上 UNVERIFIED / OPEN 字样对齐 CC
//                   用词，Verification 状态本来就没有标记为已完成。
//
//                   四项修正已套用。三份 Governance 文件（本文件/
//                   00_Product_Backlog.js/00_Review_History.js）
//                   Review Approved。Runtime 仍未开始，下一步正式
//                   进入 Phase 11 — Real DLP/Defect Data Onboarding。
//
//   2026-08-19      DLP Defect Engine Phase 9/10（Mobile Web Console）
//                   UI Contract Design 谈完、APPROVED，Runtime 代码写出
//                   （947/948 新增 + 900/appsscript.json 修改）。完整
//                   过程与理由见独立的 DlpMobileConsole_UIContract.md，
//                   这里只记摘要。
//
//                   ★ 起因：CC 主动要求这次不要比照 Phase 1-8 直接写
//                   代码——UI 涉及版面/Sidebar 新分頁长相这类主观决定，
//                   要求先谈清楚再动手。Claude 先读 Vertical Slice §11/
//                   Phase0 Audit §7-8/Project State/945/946/922/918
//                   全部 14 个 Command，才开始讨论。
//
//                   ★ 关键决策（正式记入 DlpMobileConsole_UIContract.md，
//                   非本次新增 ADR——CC 判断这些是 Configuration 层级，
//                   不是需要 ADR 的架构决策）：
//                   (1) 两个 UI Surface 各自分工：Sidebar DLP Tab=
//                   Desktop 完整管理（Case/DefectItem/Correspondence/
//                   SecondaryDamage/Evidence/Timeline/Dashboard，未开始，
//                   这次范围外）；Mobile Console=现场 30-60 秒 Daily
//                   Check 为核心，唯读 Case Overview（Dashboard 摘要+
//                   Defect List+Timeline）为次级入口，明确排除
//                   Correspondence/SecondaryDamage（连唯读都不要）。
//                   (2) Case Context 用 900_PropertyConfig.js 的
//                   ACTIVE_DLP_CASE_ID（MVP Configuration，非 Truth
//                   Layer，非 Case Entity 一部分，Domain Logic 不得
//                   当作正式来源，真实第二个 Case 出现才是移除触发
//                   条件）取代——刻意不做 listActiveCases() Query，
//                   CC 原话：「为了未来的未来写代码」，等真实需求出现
//                   再让需求逼出正确的 Query 设计。真实值
//                   CASE-msxyfkpi-zu4j 已填入。
//                   (3) CheckedBy 用同一 Config 文件的 OPERATOR_NAME
//                   （='CC'）自动带入，Contract 层承诺是"从当前
//                   Operator identity source 带入"，以后换 Google
//                   Identity/multi-user 时只换来源，不改 Contract。
//                   (4) Web App 部署（appsscript.json 新增 webapp
//                   区块）：executeAs=USER_DEPLOYING, access=MYSELF，
//                   个人工具，明确不加 ANYONE/ANYONE_ANONYMOUS。
//
//                   ★ 明确的纪律（CC 特别强调，记在这里避免之后被
//                   默认掉）：Runtime 代码写完 ≠ Production-Ready。
//                   这批代码（947_DlpConsoleServer.js/948_
//                   MobileConsole.html/900 新增两个 Config/appsscript.
//                   json）只经过 node --check 语法检查，零真实 GAS
//                   执行、零真机测试。DlpMobileConsole_UIContract.md
//                   §11 定义了 11 步真机验证 Gate（clasp push→部署→
//                   真机打开→doGet()→Bootstrap→Daily Check 存档→
//                   Saved 状态→Case Overview→照片 Evidence→确认既有
//                   918/911/922 无 regression），全部通过才更新
//                   MANUAL_VERIFICATION_CHECKLIST.md 标记
//                   Production-Ready。状态目前如实标 pending。
//
//                   CC 会开新 Session 带真机测试结果回来——下一个
//                   session 若看到这里，先读
//                   DlpMobileConsole_UIContract.md 全文（尤其 §11）
//                   取得完整背景，不要假设 947/948 已经跑过。
//
//   2026-08-17      DLP Defect Case & Rectification Tracking Vertical
//                   Slice，Phase 0-8 全部完成并逐阶段部署确认，913 之后
//                   最大一次真实 Runtime 新增。真实起因：CC 名下 Est8
//                   Seputeh A-19-11 单位进入实际 DLP 流程（原始申报
//                   140+ 项，13 Aug 2026 提交），不是练习案例。
//
//                   ★ Phase 0 Audit：完整读过 Constitution/ADR Log/
//                   File Map/Business Rules/Domain Model/Project State/
//                   Product Backlog/Review History 全文，加上 901/902/
//                   903/910（全文）/912/913/922/945/946，才动笔设计。
//                   发现 00_File_Map.js 早已预留 918_DefectEngine（VP/
//                   Defect Liability Period 追踪）与 911_DocumentEngine
//                   （Evidence 附件来源）两个号段，用途描述跟这次需求
//                   几乎完全对上——不是新增模块，是把既有规划填上。
//                   同时发现 publishPropertyEvent_ 目前只是 Logger 占位
//                   （ADR-P07/P12 刻意设计），不是真正持久化、可查询的
//                   Event Store——Timeline 因此不能靠"重放 EventBus"，
//                   改为比照既有 ObligationHistory 的 append-only 模式，
//                   新增专属的 PropertyCaseTimeline。
//
//                   ★ 关键决策（正式记入 ADR-P15/P16/P17，见
//                   00_ADR_Log.js）：
//                   (1) Case 模块不拆通用 Case Engine，单一
//                   918_DefectEngine.js，PropertyCase.CaseType 留扩展口
//                   （目前只有 'DLP'）——Property OS 自己的 Candidate
//                   Pattern 纪律（两个独立案例才 promote 抽象），现在
//                   只有一个真实 Case 类型，不做 Speculative Design。
//                   (2) 911_DocumentEngine 从原定 Phase 3 提前实现，但
//                   只做这次用得到的最小范围（Evidence 附件），不是
//                   完整 Document Library。复用既有 DOC- 前缀。
//                   (3) DefectItem.DeveloperStatus 与
//                   OwnerVerificationStatus 严格独立，任一 Command 不得
//                   写对方栏位。本地测试（GasShim）第一次跑就抓到一个
//                   真实逻辑 bug——deriveDefectItemStatus_ 判断顺序错误，
//                   导致 Developer 一旦 ClaimedCompleted，Owner 的
//                   FailedVerification 判定会被总览 Status 吃掉，改判断
//                   顺序后修复，随后在真实 GAS 上独立复现确认修复有效
//                   （执行 log：Dev=ClaimedCompleted, Owner=
//                   FailedVerification, Overall=InProgress，三者同时
//                   成立）。过程中浮现一个已知限制：Failed 之后 Developer
//                   重新宣称完成，OwnerVerificationStatus 不会自动重置
//                   （因为两栏位独立的原则不能为了这个 edge case 破例），
//                   CC 拍板正确解法是未来的 Repair Cycle / Verification
//                   Cycle 概念（每次维修周期各自独立的 verification 结果），
//                   这次不实现，正式记入 ADR-P15 作为 Domain Model
//                   follow-up，不是现在就做。
//
//                   ★ Property 实体新增 DevelopmentName/UnitLabel（ADR-
//                   P17）——真实数据核对（CC 提供的 Property OS 导出）
//                   显示 PropertyName 现在填的是 "Est8 Seputeh"（发展
//                   项目层级，无单位号），单位号只嵌在 AddressLine1 里。
//                   两个新栏位 Additive 追加在 Property.columns 最后
//                   （不可插入中间——ensureSheetSchema_ 逐位置比对既有
//                   表头，插入中间会让后面所有栏位位置错位，false
//                   positive drift）。真实 Properties 表因此需要一次性
//                   手动加两个表头（AD1/AE1），CC 已完成并跑通
//                   runAllPropertyAssetEngineTests(21/21)+
//                   runAllPropertyOSTests(141/141)。
//
//                   ★ Phase 1-8 交付内容：
//                   Phase 1  900/901/902/910 新增全部 DLP/Evidence 枚举、
//                            8 张新表 Schema、8 个新 ID 前缀（DEFECT 复用
//                            既有保留前缀，Evidence 复用 DOCUMENT 前缀）。
//                   Phase 2/3 新文件 918_DefectEngine.js：PropertyCase+
//                            DefectItem 生命周期，createPropertyCase/
//                            addDefectItem/updateDefectItem/
//                            recordDeveloperStatus/recordOwnerVerification/
//                            closeDefectItem/reopenDefectItem/closeCase。
//                   Phase 4  logDailyProgressCheck，30-60 秒快速记录，
//                            Timeline 摘要区分有无 access 两种自然语句。
//                   Phase 5  新文件 911_DocumentEngine.js：attachEvidence，
//                            Drive Adapter 隔离在 saveEvidenceFile_ 一处
//                            （ADR-P07/P11），资料夹结构 Property OS
//                            Evidence/<CaseID>/<fileName>，真实 Drive 上
//                            部署确认（真实资料夹/文件 URL，含真实上传
//                            耗时约 6 秒 vs 纯 Sheet 操作约 1-1.3 秒的
//                            timing 差异记录）。
//                   Phase 6  logCorrespondence/recordCorrespondenceResponse
//                            + addWorkingDays_（工作日计算，只放在 918，
//                            不预先塞进 901 共用层，符合两个独立消费者
//                            才 promote 的既有纪律）。用任务书本身的真实
//                            案例验证：14 Aug 2026（五）+3 工作日=19 Aug
//                            2026（三），跳过周末。NotedOnly 绝不自动
//                            升级为 Answered。
//                   Phase 7  logRectificationEvent（严格 append-only，
//                            EventType 驱动，CC 拍板设计）+
//                            logSecondaryDamage/updateSecondaryDamageStatus。
//                            ResponsibleParty/DlpPrejudiceStatus/
//                            ContractualBasis 全部中性文字栏位，系统不
//                            做法律责任判断。
//                   Phase 8  922_DashboardAdapter.js 新增 getDlpCaseDashboard/
//                            getCaseTimeline/listDefectItemsForDashboard/
//                            enrichPropertyCaseForDisplay_/
//                            enrichDefectForDisplay_（既有文件纯新增，
//                            没删改任何既有内容，getDashboardSnapshot/
//                            getMonthlyExpenseSummary 回归测试另外重跑
//                            确认无影响）。DlpEndDate 读 Property.
//                            DefectExpiry，为空则用 VPDate+24个月估算
//                            并标注 dlpEndDateIsEstimated。
//
//                   ★ 验证方式：每个 Phase 先用本地 GasShim（Node vm 加载
//                   真实原始码，非纸上模拟）跑过（累计 210+ 项本地检查
//                   全过，含上述那次真实抓到的 bug），CC 逐 Phase 部署
//                   到真实 GAS 后跑 runAllPropertyOSTests 确认 141 项
//                   无 regression，多个 Phase 附真实 execution log 核对
//                   （Phase 2/3/4 两次独立重跑、Phase 5 真实 Drive URL）。
//                   911 是专案第一次碰 DriveApp，GasShim 本身也第一次
//                   加了 fake DriveApp/PropertiesService（僅存在本机，
//                   不影响部署，.claspignore 本就排除 GasShim.js）。
//                   MANUAL_VERIFICATION_CHECKLIST.md 逐 Phase 同步更新，
//                   诚实区分"本地验证过"与"真实 GAS 已确认"两种状态，
//                   不混为一谈。
//
//                   ★ 现状：Phase 1-8（数据模型→Case/Defect 生命周期→
//                   Daily Check→Evidence→Correspondence→Rectification/
//                   SecondaryDamage→Dashboard）全部完成并部署确认。
//                   Phase 9-11（HtmlService Mobile Web Console、Sidebar
//                   新分頁、GAS-native 997 测试文件、正式文档整理）
//                   尚未开始——Phase 9/10 涉及具体 UI/版面等主观决定，
//                   下一次开始前应先跟 CC 谈清楚要长什么样，不是直接
//                   比照 Phase 1-8 的模式动手写。
//
//                   ★ 待处理事项：(1) Phase 4 真实 smoke test 用了 CC
//                   的真实 Property（PROP-mshs0wca-skrq）而非丢弃用测试
//                   Property，产生了至少一个真实 CASE-msw...
//                   （连同 2 笔 DailyProgressCheck），尚未确认这是否
//                   要保留为正式开始追踪的第一笔真实资料，还是要清掉
//                   重新开始——CC 尚未回覆。(2) 00_Project_Constitution.js
//                   §7 Data Ownership 表与 PropertyOS_DomainModel.md
//                   的 ERD/Aggregate 清单需要补上这次新增的 7 个实体，
//                   本次一并处理（见下方对应 CHANGELOG 位置与档案本身）。
//                   (3) 新增 DlpDefectEngine_VerticalSlice.md，比照
//                   ObligationEngine_VerticalSlice.md/
//                   PropertyAssetEngine_VerticalSlice.md 既有格式，
//                   整理这次 Phase 0-8 的完整设计与决策记录，供下次
//                   session 或其他人不需要重读整段对话就能接手。
//
//   2026-07-29 (p)  CC 真实使用 Operator Console 的第一手回馈——
//                   ADR-P14 的目标（Real Usage Feedback）第一天就
//                   兑现了。确认能用：Sidebar 正常拉出、Dashboard
//                   Loading→资料正常切换、新增 Property 后端 Sheet
//                   真的多一行。真的抓到两个问题：新增 Property 后
//                   列表没有立刻刷新、Add Bill 页签的 Property 下拉
//                   没有新选项。
//
//                   诊断：两个症状同一根因——createProperty 那次
//                   execution 的写入，跟紧接着 loadProperties() 那次
//                   （完全不同的 execution）的读取之间，可能存在
//                   跨 execution 的读写一致性问题。
//
//                   ★ 修复：在 withPropertyLock_（910）/
//                   withObligationLock_（912）的 finally 区块统一
//                   加 SpreadsheetApp.flush()，而不是在每个 Command
//                   的 return 前各别加——集中一处，以后新增 Command
//                   不会漏。連 throw 路径也会 flush（讓
//                   logPartialFailure_/logPropertyPartialFailure_
//                   记录的部分失败状态，也能立刻被后续读取看到，
//                   不是留在不确定的状态）。私有 Node shim 补上
//                   SpreadsheetApp.flush 的 no-op（shim 本身没有
//                   跨 execution 一致性问题可模拟，flush 在这里
//                   本来就没有东西要"冲刷"），141/141 回归测试确认
//                   没有破坏任何既有逻辑。
//
//                   ★ 老实说明验证边界：这个修复解决了"逻辑上该做
//                   什么"，但"真的解决了这个 bug"这件事，Node shim
//                   天生证明不了——没有跨 execution 场景可以模拟。
//                   需要 CC 重新测过 Add Property → 立刻看列表/下拉
//                   才能确认。
//
//                   同时新增 00_Product_Backlog.js，记录 CC 提出的
//                   三项未来功能（BL-1 Leasehold Lease Expiry、
//                   BL-2 Property Insurance、BL-3 Management
//                   Information），皆為設計草圖層級、非 Vertical
//                   Slice，不影响当前 MVP 进度。PropertyOS_
//                   DomainModel.md 新增 §7，記錄這三項未來如何融入
//                   既有 Aggregate 骨架（BL-2 特別值得一提：设计為
//                   复用 912 既有的 Reminder/Overdue/Payment 机制，
//                   不是為保险另开一套排程逻辑）。
//
//   2026-07-29 (o)  CC 決定暫停 914 Runtime，改建 Operator Console
//                   （ADR-P14）——目标不是 Architecture 或 Feature
//                   Complete，是 Real Usage Feedback。三个新文件：
//
//                   922_DashboardAdapter.js — Query-side Adapter，
//                   getMonthlyExpenseSummary() 明确标示 Current Source
//                   （ObligationOccurrence 聚合）vs Target Source
//                   （914 的 Ledger，未建），呼叫者不需要知道差异。
//                   getDashboardSnapshot() 一次打包 Dashboard 五组资料。
//                   逻辑已用私有 Node shim 验证过真实情境（建 Property
//                   →建 Obligation→逾期/已缴分类正确、月支出加总正确）。
//
//                   946_OperatorConsoleServer.js — 服务端胶水层，
//                   console_* 系列薄包装既有 Command/Query，统一
//                   {success, data|error} 回传形状。onOpen() 会不会
//                   违反 ADR-P02？不会——Simple Trigger（人打开 Sheet
//                   才跑）跟 ADR-P02 禁的 Scheduler（自动排程、无人
//                   在场）是两回事，ADR-P14 记录了完整区分。
//
//                   945_OperatorConsole.html — Sidebar 本体，纯
//                   Vanilla HTML/CSS/JS。四个视图（Dashboard/Add
//                   Bill/Properties/History），Dashboard 每笔逾期/
//                   即将到期项目都有一键 Pay（金额/日期预填，2 次
//                   点击可完成，符合 CC 的 15 秒基准）。已验证：JS
//                   语法正确、每个 getElementById 引用的 ID 都真的
//                   存在于 HTML（逐一比对，零遗漏）、client 端每个
//                   google.script.run 呼叫的函式名都对应到 946 里
//                   真实存在的函式（双向比对）。★ 老实说明这份验证
//                   的边界：实际渲染、按钮点击手感、Sidebar 在真实
//                   浏览器里好不好用，这些天生无法自我检查，需要 CC
//                   真的打开来用才知道——这正是这个阶段要做的事。
//
//                   912 新增 queryRecentPayments（含 propertyId/
//                   from/to/limit 过滤）——填补一个真实缺口：
//                   queryUpcomingPayments/queryOverdue 都刻意排除
//                   Paid 的 Occurrence，先前没有任何查询能回答
//                   "最近付了什么"。910 新增 listActiveProperties，
//                   供下拉选单用。
//
//                   完整回归测试（141 个既有测试）确认新文件加入后
//                   仍全数通过，没有破坏既有功能。
//
//                   ★ 过程中的插曲：本轮中途出现大量重复的"继续"
//                   訊息，怀疑是发送端卡住；期间部分已完成的编辑
//                   （ADR-P14 初稿、queryRecentPayments）在沙箱重置
//                   时遗失，因为还没来得及存进 outputs——已重做并
//                   改成每完成一小块就立刻持久化，不再累积一大批
//                   才存，降低类似情况再发生时的损失。
//
//                   914 保持暂停状态，等 CC 用 Operator Console 实跑
//                   1-2 周、收集真实回馈后再决定优先顺序（914、
//                   Rental、Mortgage 等）。
//
//   2026-07-29 (n)  完成先前未写完的 914_FinanceEngine Vertical Slice
//                   更新（Category-in-Event、Reversal 类型重构），
//                   ADR-P13（Event Completeness Principle）正式记录。
//                   §1/§3/§4/§5/§6/§7/§12 全部对应更新：TransactionType
//                   定案 Income/Expense/Adjustment/Reversal 四值，
//                   拿掉多余的 IsReversal 布林（TransactionType 本身
//                   已经能表达）；新增 findLedgerEntryToReverse_ 的
//                   精确查找逻辑（比对 SourceEventType+
//                   SourceReferenceId，取最近一笔尚未被抵销的），
//                   处理 pay→reverse→pay again 这种 912 本来就支援的
//                   循环；queryCashflowSummary 的加总逻辑更新为对每笔
//                   Reversal 回头查原始分录所属桶别再扣减，不是简单
//                   两桶加总。UEF 升到 v1.8（§2 新增 Event
//                   Completeness Principle，D11 记录完整决策）。
//                   FinanceEngine_VerticalSlice.md 状态改为 APPROVED，
//                   无剩余待确认项，可以开始 914 Runtime。
//
//   2026-07-29 (m)  CC 确认：ensureSheetSchema_ 缓存修复后重跑，
//                   真实 GAS 上 141/141 全数通过，无超时。TECH DEBT
//                   #9 关闭。至此 990-996 全部 20 个文件都已在真实
//                   GAS 环境验证过至少一次——从"逻辑对但没实跑过"到
//                   "真的对着真实 Sheets/Lock/Cache 跑通"，两轮诊断
//                   （文件同步、执行超时）都是真的抓到问题、真的
//                   修好，不是含糊带过。
//
//   2026-07-29 (l)  CC 重跑 runAllPropertyOSTests()——文件同步问题
//                   解决了（991/992/993 全过），但跑到 994 中途撞上
//                   "Exceeded maximum execution time"。这正是
//                   MANUAL_VERIFICATION_CHECKLIST.md 一直标着"未验证"
//                   的 GAS 6 分钟执行上限，这次真的碰到了。
//
//                   根因诊断：ensureSheetSchema_（901）在"每一次"
//                   碰 Sheet 的操作（几乎每个 Command/Query）都重新
//                   做一次表头核对 + setFrozenRows，即使同一次执行
//                   内 Schema 根本不可能变。~140 个测试，每个测试
//                   多次碰 Sheet，等于同一份没变过的表头被重复核对
//                   几百次，每次都是真实 API 往返（Node shim 是
//                   内存模拟，瞬间完成，测不出这个成本）。
//
//                   ★ 修复：ensureSheetSchema_ 加上 per-execution
//                   缓存（SHEET_SCHEMA_CACHE_）——同一次执行内，每张
//                   表只会真的核对一次，之后直接回传缓存的 Sheet
//                   物件。缓存是顶层 var，GAS 每次全新执行都会重新
//                   评估成空物件，不会跨执行残留，不影响真正的
//                   schema drift 侦测。
//
//                   Node shim 自我检查确认逻辑正确（141/141），但
//                   这个修复的"真的变快了吗"这件事，Node shim 天生
//                   测不出来（内存操作本来就是瞬间的）——需要 CC
//                   真的重跑一次才能确认。995_RunAllTests.js 已经
//                   补上退路说明：如果这次修复后还是太慢，改成
//                   分开单独跑 5 个 suite（各自独立执行，GAS 的
//                   上限是按次算，不是累计），不必等一次性修好。
//
//                   MANUAL_VERIFICATION_CHECKLIST.md 的 Runtime
//                   limits 部分已更新，如实记录"上限真的存在"这个
//                   确认结果，以及修复的确切范围（逻辑对，速度待证）。
//
//   2026-07-29 (k)  CC 实跑 runAllPropertyOSTests()，118 个测试里
//                   41 个失败。診斷：几乎全部是 "generatePropertyId_
//                   is not defined" 和 "Unknown Property OS event
//                   type: undefined"——两个都是建 910 时新增到
//                   902/903 的东西，CC 真实 GAS 专案当时同步的是
//                   910 之前的旧版 902/903。不是逻辑错误，是文件
//                   同步没跟上。同一时间 Claude 自己也抓到一个真实
//                   的不一致：正在做的 Category-in-Event 改动
//                   （903 要求 PAYMENT_COMPLETED/PAYMENT_REVERSED
//                   带 category）还没同步改完 912 去真的提供这个
//                   欄位——已收尾（912 的 rule.Category 已经在
//                   scope 里，不需要新查询）。
//
//                   ★ 根因层面的修复：00_File_Map.js 新增
//                   "CURRENT DEPLOYMENT MANIFEST"——一份纯粹、可
//                   逐项核对的 20 个 .js 文件清单，放在文件最前面，
//                   每次同步真实 GAS 专案时先核对这份，而不是散落
//                   在多轮对话记录里去回忆"这个文件是不是也改过"。
//
//                   修复后完整跑一次（Node shim 自我检查）：
//                   141/141 全数通过。待 CC 用同一份 Manifest 重新
//                   同步真实专案后再跑一次确认。
//
//                   914_FinanceEngine 的 Category-in-Event /
//                   PROPERTY_SALE_REVERSED 语义两项决定已经拍板
//                   （见上一轮对话），Vertical Slice 文件本身的
//                   对应章节更新仍在进行中，尚未在这一轮完成。
//
//   2026-07-29 (j)  Claude 在开始 914 之前，主动提出一个真正的架构
//                   问题：ADR-P01 要求 Finance Engine 只订阅 Event，
//                   但 EventBus（ADR-P07）目前还是 Logger 占位符，
//                   没有真的 pub-sub 派发。CC 给出 Review Decision
//                   （ADR-P12）：这是 Architecture Decision 不是
//                   Runtime Decision——ADR-P01 不变，EventBus 缺口
//                   純属 Infrastructure，不能因此改变 Domain
//                   Architecture。新增 subscribeFinanceEvent_() 占位
//                   Adapter，比照 publishPropertyEvent_() 同等地位；
//                   等真正的 Shared EventBus API 定案后，只换
//                   Adapter，Finance Engine Runtime 不需要重写。
//                   原则："Platform 未完成，不应改变 Domain。
//                   Infrastructure 可以 Placeholder。Architecture
//                   不允许 Placeholder。"
//
//                   CC 同时提出生态级方向：EventBus 应该是独立于
//                   任何 Domain OS 的共用 Platform Capability，所有
//                   OS（Property/Finance/Reminder/Investment/News/
//                   Health...）都只透过各自 Adapter 发布/订阅。已收进
//                   UEF v1.7 §2 Platform Constraints，明确标注这是
//                   "已陈述的方向"，不是"已验证的模式"——不套用 D7/D8
//                   那种需要两个独立专案佐证的门槛，因为这是生态系统
//                   所有者对自己生态的直接方向陈述，不是需要外部验证
//                   的工程主张。
//
//                   914_FinanceEngine Vertical Slice 完成
//                   （FinanceEngine_VerticalSlice.md），依 CC 指定的
//                   扩充版章节（Business Rules/Domain Model/Truth
//                   Layer/Event Contract/Command Contract/Query
//                   Contract/Ledger Contract/State Machine/Sequence
//                   Diagram/Migration Strategy/Test Plan/Architecture
//                   Review）。核心设计：Ledger 不可变（比照 ADR-P06/
//                   P10），Amount 恒正、方向用 TransactionType 表示，
//                   Reversal 是新的补偿分录不是编辑，每笔分录都可
//                   追溯回源头 Event。State Machine 明确标注"不适用"
//                   （Ledger 分录只有一种状态，不需要转移守卫），不是
//                   沉默略过。等待 Review Approval，未写 Runtime。
//                   两项待确认：Category 继承方式、PROPERTY_SALE_
//                   REVERSED 补偿分录的语义。
//
//   2026-07-29 (i)  CC Review Approved 910_PropertyAssetEngine Vertical
//                   Slice：PropertyType 定为 UPPER_SNAKE_CASE 七值枚举
//                   （本系统唯一此例外，ADR-P11 记录原因）；Address
//                   确认结构化 VO，新增 formattedAddress 衍生字段（不
//                   落库，Query/UI 用）。CC 同时明文化 Status Pipeline
//                   （Draft→Ready→Done→Pending Production
//                   Verification→Production Ready→Released），已收进
//                   Constitution P12。
//
//                   910 Runtime 完整落地：四个 Command（Create/Update/
//                   MarkSold/ReverseSale），State Machine（Active⇄Sold，
//                   仅经 reversePropertySale 可逆），formatAddress_，
//                   loanExists_ 占位符（比照 propertyExists_ 模式，
//                   等 915）。912 的 propertyExists_ 占位符正式移除，
//                   改由 910 提供真实实作——ADR-P07 Adapter 模式的
//                   承诺兑现，也是 §8 Cross-Engine Placeholder 一直
//                   记着要做的事。
//
//                   新增 996_Tests_PropertyAssetEngine.js（21 tests）
//                   + 992 扩充（19 tests：4 种 Property Event Contract、
//                   State Machine、formatAddress_）。过程中自我检查
//                   真的抓到一个 bug：reversePropertySale 误呼叫通用
//                   assertPropertyTransition_('Sold','Active')，但该
//                   Map 故意没有 'Sold' key（比照 912 的
//                   OCCURRENCE_TRANSITIONS_ 不放 'Paid' 的理由一致），
//                   导致每次呼叫必抛错——已修正为只靠既有的
//                   PROPERTY_NOT_SOLD 检查，不呼叫通用 Map。
//
//                   ★ 关键连锁修复：propertyExists_ 变成真实检查后，
//                   既有 991/993/994 测试原本用的假 PropertyID（从未
//                   真正 createProperty 过）全部会失败——已修正
//                   testPropertyId_() 改为真的呼叫 createProperty()
//                   并回传真实 ID（标记于 PropertyName 前缀 "TEST-"，
//                   因为真实 PropertyID 格式不带 TEST 字样）；
//                   cleanupTestData_() 同步改为从 Properties 表出发
//                   级联清理。修正后完整跑一次：139/139
//                   （75+9+27+7+21）全数通过。
//
//                   全部逻辑已用私有、非交付物的 Node shim 自我检查，
//                   尚未对 CC 真实 GAS 项目实际跑过，记入 TECH DEBT。
//
//   2026-07-29 (h)  CC 已实际执行 runAllPropertyOSTests()，对着真实
//                   GAS 专用测试 spreadsheet，99/99 全数通过（992:
//                   56/56, 991: 9/9, 993: 27/27, 994: 7/7）——与自我
//                   检查预测完全一致。994 的 ★ Partial Failure 故障
//                   注入测试在真实环境确认：logPartialFailure_ 真的
//                   在 History 写入失败时大声记录，不只是模拟环境
//                   成立。TECH DEBT #6 完全关闭。
//                   MANUAL_VERIFICATION_CHECKLIST.md 同步更新：三项
//                   Platform-level verification（Replay/Migration/
//                   Failure Recovery）全部转为确认；Concurrency/
//                   Caching/Runtime limits 几项如实保持未勾选——99/99
//                   通过不代表这几项被间接验证到，没有为了好看而
//                   含糊带过（真实并发竞争、Cache 真实 1 小时 TTL
//                   到期、schema drift、GAS 执行上限，都需要 99 个
//                   测试结构上就无法产生的情境）。
//
//   2026-07-29 (g)  CC 明确指示：Property OS 只在 Google Apps Script
//                   用，所有代码都要是 GAS 能跑的。property-os-tests/
//                   （Node 沙箱：GasShim.js、TestKit.js、四个测试档、
//                   runAllTests.js、README.md、MANUAL_VERIFICATION_
//                   CHECKLIST.md）整个移除，不再是本项目一部分——
//                   明确澄清：900-903/912-913/990-991/所有 00_*.js
//                   治理文件，从头到尾都是纯 GAS 语法，从来不是 Node
//                   代码，这些不用改，CC 也已经在真实 GAS 项目跑过。
//                   真正需要处理的只有 property-os-tests/ 那个目录。
//
//                   原本 108 个 Node 测试涵盖的內容，搬进四个新的纯
//                   GAS-native 文件：992_Tests_PureLogic.js（56，零
//                   Sheet 写入）、993_Tests_FullLifecycle.js（27，
//                   真实 Sheets 上完整 Command 生命周期）、
//                   994_Tests_ExtendedPlatform.js（7，Replay/Retry/
//                   Duplicate/★ Partial Failure 真实故障注入/Lock/
//                   Reminder Contract/Migration 机制检查）、
//                   995_RunAllTests.js（汇总跑 991-994）。加上 991
//                   既有的 9 个，共 99 个测试，无遗漏地涵盖了原本
//                   Node 版本测过的每一件事。
//
//                   新文件逻辑已用私有、非交付物的 Node shim 自我
//                   检查过（92/99 之前就有的 991 已真实跑过，新增
//                   90 个目前 90/90 自我检查通过），跟之前 991 的
//                   做法一致——这只证明代码本身没写错，不等于已经
//                   对着真实 GAS 项目跑过，仍是待办（TECH DEBT #6）。
//
//                   ADR-P10 里对 999_Tests_PlatformVerification.js
//                   （Node 版）的引用现在指向已不存在的文件——ADR
//                   本身作为历史记录保留不改，此处註明后续文件搬到
//                   了 994_Tests_ExtendedPlatform.js。
//
//   2026-07-29 (f)  建立 00_Review_History.js（UEF 5 份 Mandatory
//                   Document 最后一份，之前一直缺）；REVIEW-001 记录
//                   Obligation Engine Production Readiness Audit（比照
//                   UEF §9 流程），Disposition: Conditional Go，如实
//                   标记 pending（未全部通过 Manual Checklist）。建立
//                   00_Business_Rules.js（GAP-3），把付款/循环/逾期/
//                   提醒/终止政策从 Vertical Slice 移到独立治理文件。
//                   CC 提议三项平台级验证，采纳为 ADR-P10，落地
//                   999_Tests_PlatformVerification.js（7 测试），
//                   Failure Recovery 类别第一次跑就挖出真的 Partial
//                   Failure gap（Sheets 无多语句事务，此前 Vertical
//                   Slice 声称的 all-or-nothing 不准确，已订正）。
//                   UEF 升到 v1.6：新增 §2 Platform Constraints 明文
//                   化 GAS-only 与无事务的事实（D9），4 项新 Candidate
//                   Pattern。912 三个 Command（create/record/reverse
//                   Payment）加上 logPartialFailure_——失败时大声记录
//                   哪笔可能不一致，不假装原子性，也不过度工程化建
//                   真正的事务机制（D9 比例原则）。Constitution 新增
//                   明文 Platform Constraint 段落。108 个测试
//                   （101+7）全数通过。File 扩展名 .gs→.js 的部分见
//                   前几笔记录，本笔不重复。
//
//   2026-07-29 (e)  CC 确认 991_Tests_ObligationEngine.js 已在真实
//                   GAS 专用测试 spreadsheet 跑过，9/9 通过。
//                   MANUAL_VERIFICATION_CHECKLIST.md 精确勾掉这次
//                   真的覆盖到的项目（Sheets 日期防护、Freeze Header、
//                   时区），如实保留仍未覆盖的（真实并发 Lock、Cache
//                   TTL 到期、schema drift）。TECH DEBT #6 关闭。
//                   开始 910_PropertyAssetEngine：产出 Vertical Slice
//                   （PropertyAssetEngine_VerticalSlice.md），份量比
//                   Obligation Engine 轻（单一 Aggregate），沿用已批准
//                   的模式（ADR-P06/P07/P10 直接套用，不重新论证）。
//                   两项待确认：PropertyType 枚举、Address 结构化 vs
//                   扁平字串。等待 Review Approval，未写 Runtime。
//
//   2026-07-29 (d)  CC 指出 property-os-tests/（Node 沙箱）不是 GAS
//                   能跑的东西，档名（900_Tests_Foundation.js 这种）
//                   看起来太像要跟真实 GAS 源码放一起，是没说清楚的
//                   地方。新增真正的 GAS-native 测试：990_TestKit.js +
//                   991_Tests_ObligationEngine.js，对着真实
//                   SpreadsheetApp/LockService/CacheService 跑（非
//                   模拟），聚焦在 Node shim 只能模拟、无法证实的部分：
//                   真实日期强制转文字、真实 freeze header、真实
//                   Lock/Cache、端到端 createObligation→recordPayment
//                   真实跑一遍。含安全防呆
//                   （assertRunningInTestSpreadsheet_，spreadsheet 名字
//                   须含"TEST"才允许跑）与 cleanupTestData_ 级联清理。
//                   991 本身逻辑已用 Node shim 自我检查（9/9 通过，
//                   含防呆正反两面）——但这只证明 991 没写错，不等于
//                   已经对着真实 GAS 项目跑过，仍是待办。property-os-
//                   tests/ 新增 README.md 说明两套测试的分工与差异。
//
//   2026-07-29 (c)  Obligation Engine Test Plan 落地：101 个测试全数
//                   通过，涵盖 Vertical Slice §13 全部 8 类。搭了一个
//                   真的用 Node vm 加载 900-903/912-913 真实原始码的
//                   GAS shim（非纸上模拟），过程中直接跑出结果，未发现
//                   Runtime 代码本身有 bug。附 Manual Verification
//                   Checklist，列出 shim 模拟不到、需对真实 GAS 项目
//                   核对的部分。下一步 910_PropertyAssetEngine。
//
//   2026-07-29 (b)  CC 拍板：UEF 默认改为 .js（非 .txt 非 .gs，见 UEF
//                   v1.5 D8）。Property OS 十个文件改名 .gs→.js，内部
//                   交叉引用一并更新（ADR-P08）。执行方式是先对内容
//                   跑一次批次替换再改档名——批次替换过头，连带把两处
//                   "描述 UEF v1.4 当时冲突"的历史叙述文字也从 .gs
//                   误改成 .js（TECH DEBT #7 与对应 CHANGELOG 条目），
//                   已发现并订正为符合史实的说法。之后逐一核对确认
//                   Constitution/File Map/ADR Log 无其他类似误改，且
//                   十个 .js 文件皆通过 node --check 语法检查。
//
//   2026-07-29    读取 UEF v1.3 全文，产出 v1.4：Infrastructure Adapter
//                 Pattern 提升为 UCR7（Rider OS TruthEngine + Property
//                 OS ADR-P07 两个独立专案佐证）；新增 Candidate
//                 Patterns 机制与 D7（Event Immutability 等单一专案
//                 证据先放这里，不直接并入已批准内容）；Failure
//                 Catalog／EP4 各补一条 Property OS 案例。发现并记录
//                 一项未解冲突：UEF 规定治理文件用 .txt，Property OS
//                 当时全部是 .gs，需 CC 决定。ensureSheetSchema_ 新增
//                 强制 Freeze Header Row（所有 Sheet，含既有的）。
//                 CC 确认 Foundation 层已在真实 GAS 项目跑通（建表+
//                 写入皆成功）。CC 确认下一步顺序：Test Plan → 910 →
//                 914。
//
//   2026-07-19 (e)  912_ObligationEngine 与 913_ObligationScheduler
//                   Runtime 完成——七个 Command、State Machine 强制、
//                   单层 Lock、双重幂等机制、月末 clamp 的 Frequency
//                   运算、Overdue Derived-State、AI Query 两支。901
//                   同步补强共用 Row/日期工具与 dateColumns 纯文字格式
//                   保护（修正一个会破坏幂等键比对的潜在 Sheets 陷阱）。
//                   902 的 assertIdPrefix_ 改用统一的 propertyError_。
//                   尚未测试、尚未部署、EventBus 仍是刻意的 Logger 占位
//                   （ADR-P07）。
//
//   2026-07-19 (d)  Foundation 层 Runtime（900-903）APPROVED。ADR-P07
//                   （Infrastructure Adapter Pattern）新增 APPROVED —
//                   publishPropertyEvent_() 正式追认为 EventBus 唯一
//                   Adapter；确认不猜测 EventBus 实际 API，Logger 占位
//                   为刻意设计。Constitution 新增 P11，同步更新 §5/§10。
//                   Session 1 Part B（912/913）依 CC 明确要求留待下一轮。
//
//   2026-07-19 (c)  Architecture Review Approval GRANTED。ADR-P01/P02/
//                   P04/P05 APPROVED；ADR-P03 RESERVED；ADR-P06（Event
//                   Immutability）新增 APPROVED。Overdue-as-Derived-
//                   State 与 Reminder Cancellation 责任归属正式拍板。
//                   Obligation Engine Vertical Slice 通过 Architecture
//                   Review，同步修订至 v1.1（新增 ReversePayment
//                   Command / PAYMENT_REVERSED Event / State Machine
//                   例外）。Constitution 新增 P10。Session 1 Runtime
//                   已获授权，尚未落笔。
//
//   2026-07-19 (b)  ADR-P01/P02/P04/P05 APPROVED，ADR-P03 MODIFIED 为
//                   Reserved（见 00_ADR_Log.js）。Constitution/File Map
//                   同步更新至 v0.2，修正 Event 命名 Documentation Drift
//                   （PascalCase → UPPER_SNAKE_CASE）。完成 Obligation
//                   Engine Vertical Slice（14 项 Deliverables）与独立的
//                   Property OS Domain Model 文件。仍无 Runtime 代码，
//                   等待 Review Approval。
//   2026-07-19 (a)  初版架构草案。建立 Constitution / State / File Map；
//                   映射 doc1 + Obligation Engine 补充规格至 Blueprint；
//                   识别 5 项待确认架构决策。
//
// ═══════════════════════════════════════════════════════════════════════
// END OF 00_Project_State.js
// ═══════════════════════════════════════════════════════════════════════
