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
//   Current Version : v1.1.0-finance-engine-vertical-slice
//   Current Branch  : （待 CC 指定，建议 property-os/session1-obligation-engine）
//   Blueprint 合规  : Universal Domain OS Blueprint ✓ | UEF v1.6 ✓
//   ADR 状态        : ADR-P01, P02, P04, P05, P06, P07, P08, P10 APPROVED；
//                     ADR-P03 RESERVED（非 Locked）；P09 未使用（跳号）
//   Review 状态      : Architecture Review Approval GRANTED (2026-07-19)；
//                     Foundation 层（900-903）APPROVED (2026-07-19)；
//                     REVIEW-001 Production Readiness Audit
//                     Conditional Go（00_Review_History.js）
//   Runtime 代码     : Foundation（900-903）+ 912_ObligationEngine +
//                     913_ObligationScheduler 全部完成，已部署到 CC
//                     实际 GAS 项目并确认跑通。测试：99 个纯 GAS-native
//                     测试（990-995），全部已对真实 GAS 专用测试
//                     spreadsheet 跑过确认，99/99 通过。EventBus 仍是
//                     Logger 占位（ADR-P07，刻意如此）


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


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// IN PROGRESS 开发中模块
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
//   - 910_PropertyAssetEngine Vertical Slice 交付，等待 Review
//     Approval（比照 Obligation Engine 流程，但份量更轻——单一
//     Aggregate，无 Rule/Occurrence 分裂、无 Scheduler）。两项
//     [NEEDS CONFIRMATION]：PropertyType 枚举值、Address 用结构化
//     VO 还是 doc1 原本的扁平字串。


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
//   9. [新增 2026-07-29] 910_PropertyAssetEngine 的 Runtime + 测试
//      （910, 996, 992 扩充部分）尚未对 CC 真实 GAS 项目跑过——只有
//      私有 Node shim 自我检查（139/139）。跟先前 Obligation Engine
//      走过的路径一样：需要 CC 把 910/996 复制进真实 GAS 专用测试
//      项目（990-995 应该已经在那里了），跑 runAllPropertyOSTests()
//      确认真实结果。


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// NEXT PRIORITY 下一步开发
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
//   顺序已由 CC 确认：
//   1. ✓ Test Plan 落地——完成，139 个纯 GAS-native 测试（990-996）
//   2. ✓ 910_PropertyAssetEngine——Runtime 完成，Review Approved
//   3. 914_FinanceEngine——Vertical Slice 完成，等待 Review Approval
//      ← 目前在此，两项待确认见 File Map/Vertical Slice §12
//   （910/996 待 CC 复制进真实 GAS 专用测试项目、跑
//   runAllPropertyOSTests() 确认，不阻塞 914 走 Review，但建议尽早
//   跑一遍；MANUAL_VERIFICATION_CHECKLIST.md 里少数几项即使测试全过
//   仍验证不到，如实保留）


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
