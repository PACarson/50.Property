/**
 * ═══════════════════════════════════════════════════════════════════════
 * PROPERTY OS — 00_Project_State.gs
 * 项目状态中心（经常更新 / Updated Frequently）
 * ═══════════════════════════════════════════════════════════════════════
 */


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PROJECT VERSION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
//   Current Version : v0.5.0-obligation-engine-runtime
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
//   - 00_Project_Constitution.gs / 00_Project_State.gs / 00_File_Map.gs v0.1
//   - ADR-P01~P05 确认/新增，00_ADR_Log.gs 建立 — 本次
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
//   5. [新增] 912/913 尚未有任何测试（Vertical Slice §13 Test Plan
//      已设计，未落地）——Runtime 代码完成不代表已验证正确，写完就是
//      "尚未测试"状态，不是"已测试通过"状态，这点需要明确。
//   6. [新增] 尚未实际部署 / 复制进 CC 的真实 GAS 项目——目前只在这次
//      对话的沙箱环境中存在，需要 CC 手动搬过去。


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// NEXT PRIORITY 下一步开发
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
//   912/913 Runtime 已完成，以下按重要性排序，实际顺序待 CC 确认：
//   1. Test Plan 落地（Vertical Slice §13）——Unit/Contract/State
//      Transition/Replay/Reminder Integration/Finance Integration/
//      AI Query/Migration，比照 Reminder OS 的 Node sandbox 模式
//   2. 核实 TECH DEBT #1（ReminderConnector API）与 #4
//      （propertyExists_ 需要 910 存在才有意义）
//   3. 910_PropertyAssetEngine（Property Asset Engine）——Phase 1 尚缺
//      的另一半，912 的 PROPERTY_NOT_FOUND 检查要真正生效需要它
//   4. 914_FinanceEngine 基础版——订阅 PAYMENT_COMPLETED，是 Phase 1
//      "核心记账"拼图的最后一块


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MILESTONES 阶段目标
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
//   Phase 0  — Architecture & Governance                    ✓ 完成
//   Phase 1a — Obligation Engine Vertical Slice              ✓ APPROVED (2026-07-19)
//   Phase 1b — Session 1 Part A: Foundation (900-903)        ✓ APPROVED (2026-07-19)
//   Phase 1b — Session 1 Part B: 912/913 Runtime              ✓ 完成 (2026-07-19)，未测试
//   Phase 1c — Test Plan 落地 + 910 + 914 基础版               ← 下一步（待 CC 排序确认）
//   Phase 2  — Mortgage + Rental + Maintenance + Anomaly Detector
//   Phase 3  — Document + Defect + Renovation + Insurance + Tax
//   Phase 4  — Knowledge Graph + Cashflow Forecast + Investment Scoring
//              + Decision Engine
//   Phase 5  — News OS 整合 + OCR/RAG/Semantic Search 等 Future AI Functions


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CHANGELOG 近期更新记录
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
//                   Reserved（见 00_ADR_Log.gs）。Constitution/File Map
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
// END OF 00_Project_State.gs
// ═══════════════════════════════════════════════════════════════════════
