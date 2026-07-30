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
//   Current Version : v0.7.0-gas-native-tests
//   Current Branch  : （待 CC 指定，建议 property-os/session1-obligation-engine）
//   Blueprint 合规  : Universal Domain OS Blueprint ✓ | UEF ✓
//   ADR 状态        : ADR-P01, P02, P04, P05, P06, P07 APPROVED；
//                     ADR-P03 RESERVED（非 Locked）
//   Review 状态      : Architecture Review Approval GRANTED (2026-07-19)；
//                     Foundation 层（900-903）APPROVED (2026-07-19)
//   Runtime 代码     : Foundation（900-903）+ 912_ObligationEngine +
//                     913_ObligationScheduler 全部完成。尚未测试
//                     （无 Node sandbox 尚未建立）、尚未部署到实际
//                     GAS 项目、EventBus 仍是 Logger 占位（ADR-P07，
//                     刻意如此）


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
//   - Obligation Engine 完整 Test Plan 落地：101 个测试全数通过，
//     涵盖 Vertical Slice §13 全部 8 类（Unit/Contract/State
//     Transition/Replay/Reminder+Finance Integration[contract-level]/
//     AI Query/Migration），含一个真的用 Node vm 跑 900-903/912-913
//     真实源码的 GAS shim，以及对应的 Manual Verification Checklist


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// IN PROGRESS 开发中模块
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
//   - 无 Runtime 开发中。912/913 已完成，是下一个自然停点。建议下一步
//     是 Vertical Slice §13 Test Plan 落地（Node sandbox，比照 Reminder
//     OS 既有模式）——但未经 CC 确认前不预设这就是下一轮内容。


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
//   4. [新增] propertyExists_()（912）目前是 permissive placeholder，
//      因为 910_PropertyAssetEngine 尚未存在。比照 ADR-P07 精神隔离，
//      910 建成后只需改这一处，但目前代表 CreateObligation 的
//      PROPERTY_NOT_FOUND 验证实际上不会真的拒绝任何请求。
//   5. [已解决 2026-07-29] 912/913 尚未有任何测试——现有 101 个测试，
//      3 个 suite，全部通过（真的用 node 跑，不是纸上文档），见
//      property-os-tests/。仍要注意：这是 Node shim 模拟的 GAS 环境，
//      不是真实 GAS 项目本身——MANUAL_VERIFICATION_CHECKLIST.md 列出
//      了 shim 模拟不到、需要对着真实项目核对的部分（真实 Sheets 的
//      日期强制转文字行为、真实并发下的 LockService、CacheService
//      真实 TTL 等）。
//   6. [更新] 990_TestKit.js / 991_Tests_ObligationEngine.js 已写好，
//      逻辑已透过 Node shim 自我检查过（9/9 通过，含安全防呆的正反两面
//      测试），但那只证明 991 本身逻辑没错，不等于已经对着真实 GAS
//      项目跑过。★ 仍待办：CC 需要（a）建一个专用测试 spreadsheet，
//      名字要含"TEST"字样（991 的安全防呆会检查这个），（b）把
//      900-903/912-913/990/991 复制进去，（c）实际执行
//      runAllObligationEngineTestsLive()，确认真实结果。912/913 的
//      Command 本身是否已复制进 CC 的正式 GAS 项目、跑过，也尚未确认
//      （区分于上面"专用测试项目"这件事——正式项目不该跑 991）。
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


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// NEXT PRIORITY 下一步开发
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
//   顺序已由 CC 确认：
//   1. ✓ Test Plan 落地——完成，101/101 通过（见 TESTING LAYER, File Map）
//   2. 910_PropertyAssetEngine（Property Asset Engine）← 下一步
//   3. 914_FinanceEngine 基础版
//   （MANUAL_VERIFICATION_CHECKLIST.md 待 CC 对着真实 GAS 项目核对，
//   不阻塞 910 开始，但建议尽早对一遍）


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MILESTONES 阶段目标
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
//   Phase 0  — Architecture & Governance                     ✓ 完成
//   Phase 1a — Obligation Engine Vertical Slice               ✓ APPROVED (2026-07-19)
//   Phase 1b — Session 1: Foundation (900-903) + 912/913       ✓ 完成 (2026-07-19)
//   Phase 1c — Obligation Engine Test Plan                    ✓ 完成 (2026-07-29)，101/101 通过
//   Phase 1d — 910_PropertyAssetEngine                        ← 下一步
//   Phase 1e — 914_FinanceEngine 基础版
//   Phase 2  — Mortgage + Rental + Maintenance + Anomaly Detector
//   Phase 3  — Document + Defect + Renovation + Insurance + Tax
//   Phase 4  — Knowledge Graph + Cashflow Forecast + Investment Scoring
//              + Decision Engine
//   Phase 5  — News OS 整合 + OCR/RAG/Semantic Search 等 Future AI Functions


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CHANGELOG 近期更新记录
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
