/**
 * ═══════════════════════════════════════════════════════════════════════
 * PROPERTY OS — 00_Review_History.js
 * 审核历史（UEF Mandatory Document Tier 1 — 之前一直缺）
 * ═══════════════════════════════════════════════════════════════════════
 *
 * UEF §0.2 列的 5 份 Mandatory Project Document 之一。Constitution/
 * State/File Map/ADR Log 从第一轮就有，这份一直没建——本次 Audit 正好
 * 是第一笔真正该记的内容，趁这次建起来，而不是继续拖到"以后"。
 *
 * 原则：每次 Review 或 Audit 一笔记录，独立于 00_Project_State.js 的
 * 日常 changelog（UEF §0.2："separate from the routine changelog"）。
 *
 * 本文件不包含任何可执行逻辑，仅为治理文档。
 * ═══════════════════════════════════════════════════════════════════════
 */


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REVIEW-001 — Obligation Engine Production Readiness Audit
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// Date: 2026-07-29
// Profile: Production Readiness Audit（UEF §9），仿照 Rider OS 已验证
//   过的流程：Per pending item → Automated tier check → Manual checklist
//   → Bug/Gap found？→ 是：ADR + fix → 重新核对 → closes；否：closes。
// Scope: Obligation Engine 子系统（Foundation 900-903 + 912/913），
//   ★ 不是全部 Property OS——doc1 原规划的 13 个 Engine 里，这是唯一
//   完整走完 Vertical Slice → Runtime → 双重测试的一个（910 还在
//   Vertical Slice 阶段，等 Review Approval，未计入本次范围）。
// Owner: CC（solo dev，比照 UEF §9 的欄位惯例保留）
//
// ─── Definition of Ready（回溯检查）────────────────────────────────
//   ✓ 治理原则（Constitution P1-P11）在实作前已存在
//   ⚠ GAP-1: 触碰 live schema 前，没有一份独立签核过的 Schema/
//     Migration Plan——Vertical Slice §2/§12 起了这个作用，但从未
//     被拆成 UEF §0.3 惯例的独立 P17 式文件正式签核。见下方 Findings。
//
// ─── Definition of Done ─────────────────────────────────────────────
//   ✓ 代码已实作（900-903, 912-913）
//   ✓ 纯逻辑单元测试通过（Node sandbox, 101/101）
//   ✓ 治理文件同 session 更新（本对话历次记录可查）
//   ⚠ GAP-2: Change Impact Analysis 从未以 UEF §0.6 的正式 9 问格式
//     逐次报告过——原则已写进 Constitution §10，但没有逐次落实成
//     书面记录。见下方 Findings。
//
// ─── Definition of Production-Ready ─────────────────────────────────
//   Done + Manual Verification Checklist 对真实部署跑过一次。
//   目前 MANUAL_VERIFICATION_CHECKLIST.md 状态：
//     ✓ Sheets 日期强制转文字防护 — 已对真实 GAS 核实
//     ✓ Freeze Header — 已对真实 GAS 核实
//     ✓ 时区/日期格式 — 已对真实 GAS 核实（隐含）
//     ✗ 真实并发下的 LockService — 未核实
//     ✗ CacheService 真实 1 小时 TTL 到期 — 未核实
//     ✗ 真实 schema drift 侦测 — 未核实
//     ✗ GAS 6 分钟执行上限 / 20-trigger 配额 — 未核实
//   → ★ 结论：按 UEF §0.5 的精确定义，Obligation Engine 子系统目前
//   状态是 pending，不是 Production-Ready。不能因为 101+9 个测试都
//   通过就含糊地说"可以上线了"——UEF 的定义比这个更严格，本记录
//   如实反映，不为了好看而放宽标准。
//
// ─── Findings（依 UEF §8 Risk Matrix 分级）──────────────────────────
//
//   GAP-1（MEDIUM）— 无独立 Schema/Migration/Rollback/Compatibility
//     文件。Recommendation: 建立 P17 式四段文件（Schema/Migration/
//     Rollback/Compatibility）。Priority: 建议在 910 Runtime 开始前
//     补上，避免同样的缺口累积到第二个 Engine。Verification: 待建立
//     后再核对一次。
//
//   GAP-2（LOW）— Change Impact Analysis 有原则、无逐次书面记录。
//     Recommendation: 从下一次架构性改动开始，正式以 9 问格式记录，
//     不需要回溯补全已经发生的改动（成本大于效益，且历次治理文件
//     更新已经隐含涵盖了这些分析的实质内容）。Priority: 向前适用即可。
//     Verification: 下次架构性改动时检查是否照做。
//
//   GAP-3（MEDIUM）— Constitution 混有本该独立成
//     00_Business_Rules.js 的业务规则内容（付款规则、Recurring Rule、
//     Overdue Rule、Grace Period 等），违反 Property OS 自己一贯的
//     "Constitution 只放结构性原则，不放业务流程"惯例，也符合 UEF
//     §0.3 的 Conditional Document 触发条件（"non-trivial domain/
//     business logic distinct from architecture"）。Recommendation:
//     拆出 00_Business_Rules.js。Priority: 本次一并修复（见下）。
//     Verification: 见 ADR-P09。
//
//   真实并发 Lock / Cache TTL 到期 / schema drift / Runtime 限制
//     （MEDIUM，各自）— 无法在这次 session 内闭环（需要真实并发场景
//     或真实等待一小时），如实保留 pending，不假装已核实。
//
// ─── Disposition ─────────────────────────────────────────────────────
//   Conditional Go。101+9 个测试通过、架构完整、Foundation+Obligation
//   Engine Runtime 可用，可以继续在真实 GAS 项目中人工验证下一步
//   （910 开始前）；但按 UEF 定义不可标记为正式 Production-Ready，
//   直到 Manual Verification Checklist 全部跑完。GAP-3 本次一并修复
//   （ADR-P09）；GAP-1 建议在 910 之前补上；其余保持 pending，如实
//   记录，不阻塞继续开发。
//
// ─── Next Steps ──────────────────────────────────────────────────────
//   1. 补 00_Business_Rules.js（本次，GAP-3）
//   2. 補 Schema/Migration/Rollback/Compatibility 四段文件（GAP-1，
//      建议 910 Runtime 前）
//   3. 剩余 Manual Verification Checklist 项目——多数需要 CC 找时间
//      对着真实环境跑（真实并发、等一小时试 Cache TTL 等），非阻塞性
//      待办
//   4. 910_PropertyAssetEngine 走完整 Vertical Slice → Review →
//      Runtime → 双重测试流程，本 Audit 的 GAP-1/GAP-3 修复应该在
//      910 也直接套用，不要让同样的缺口在第二个 Engine 重演
//
// ─── Addendum (2026-07-29, 同日) ────────────────────────────────────
//   CC 提议三项平台级验证（Replay/Migration/Failure Recovery），采纳
//   为 ADR-P10（本地立即采用，UEF Candidate Pattern 记录待第二个
//   专案佐证）。落地为 999_Tests_PlatformVerification.js（7 测试）。
//
//   Failure Recovery 那项第一次跑就挖出真的问题：recordPayment 的
//   Truth 写入（Occurrence→Paid）成功后，若 History/Event 步骤失败，
//   不会回滚——因为 Sheets 没有多语句事务（此前 Vertical Slice §11
//   声称的"all-or-nothing"其实不准确，已订正）。这不是 Property OS
//   独有的 bug，是整个 GAS+Sheets 生态系统的平台事实，已明文写进
//   UEF v1.6 §2 Platform Constraints（D9）。
//
//   处置（D9 的判断，非本文件重新论证）：不建真正的事务/补偿机制
//   （对个人规模专案不成比例），改为 recordPayment / reversePayment /
//   createObligation 在 Truth 写入之后的步骤加上 logPartialFailure_
//   ——失败时大声记录清楚哪笔记录可能不一致，再照常往外抛错。已实作
//   并跑过 108 个测试（101+7）全数通过，含两个刻意保留、如实反映现状
//   的 "★ FINDING" 测试（证明不一致确实会发生，不是假设）。
//
//   Disposition 更新：GAP-1/GAP-3 之外，新增一项已处理的发现（Partial
//   Failure），MEDIUM，已用比例原则回应，非阻塞，如实记录不夸大也
//   不隐藏。
//
// ─── Addendum 2 (2026-07-29，同日) ──────────────────────────────────
//   CC 指示全部改为纯 GAS-native（property-os-tests/ Node 沙箱移除），
//   原本 108 个测试的內容搬进 990-995（99 个测试）。CC 已实际执行
//   runAllPropertyOSTests()，对着真实 GAS 专用测试 spreadsheet，
//   99/99 全数通过，与自我检查预测完全一致。
//
//   对 Definition of Production-Ready 的影响：MANUAL_VERIFICATION_
//   CHECKLIST.md 里 Platform-level verification 三项（Replay/
//   Migration/Failure Recovery）现在全部确认。但 Concurrency（真实
//   并发竞争）、Caching（真实 1 小时 TTL 到期）、Sheets behavior
//   （真实 schema drift）、Runtime limits（GAS 执行上限）几项仍
//   未勾选——这些是 99 个测试在结构上就无法产生的情境（需要真实
//   并发的两个重叠执行、真的等一小时、真的先破坏一次 Sheet 表头），
//   不是"忘记测"，是"这种测试方法测不到"。
//
//   ★ 结论不变：按 UEF §0.5 的定义，Obligation Engine 子系统仍是
//   pending，不是 Production-Ready——99/99 通过是很扎实的进展，但
//   没有让 Manual Checklist 全部清空，就不能改变这个结论。CC 先前
//   已明确指示过这一点（"保持目前状态为 pending 是正确的"），本次
//   更新照办，没有因为数字好看就放宽。


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REVIEW-002 — DLP Defect Engine Phase 9/10（Mobile Web Console）
//              Production Readiness Verification
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// Date: 2026-08-22
// Profile: 真机验证 Gate（DlpMobileConsole_UIContract.md §11，11 步），
//   非正式 UEF §9 Production Readiness Audit 格式，但沿用同样的
//   Definition of Ready/Done/Production-Ready 结构方便对照。
// Scope: DLP Defect Engine Phase 9/10（Mobile Web Console：947_
//   DlpConsoleServer.js + 948_MobileConsole.html + 900/appsscript.json
//   的对应新增）。不含 Sidebar DLP Tab（尚未开始）。
// Owner: CC（solo dev）
//
// ─── Definition of Ready（回溯检查）────────────────────────────────
//   ✓ UI Contract Design 谈完并 APPROVED（2026-08-19，
//     DlpMobileConsole_UIContract.md）
//   ✓ Runtime 代码写出，node --check 语法通过（2026-08-19）
//
// ─── Definition of Done ─────────────────────────────────────────────
//   ✓ Contract §11 定义的 11 步真机验证 Gate 全部通过（Test Case
//     1-10 一次到位；Test Case 11「Case Overview」经三轮诊断修复后
//     通过，过程见 00_Project_State.js CHANGELOG 2026-08-22 条目）
//
// ─── Definition of Production-Ready ─────────────────────────────────
//   Done + 11 步 Gate 全部通过 + MANUAL_VERIFICATION_CHECKLIST.md
//   对应项目勾选。
//   → ★ 结论（本次 Scope 范围内，即 Phase 9/10 Mobile Web Console
//   这一个子系统——不代表整个 Property OS 项目）：11 步 Gate 全部
//   通过，PRODUCTION-READY。
//   ⚠ MANUAL_VERIFICATION_CHECKLIST.md 的 Test Case 11 勾选動作本身
//   尚待 CC 在实际文件上同步——本次 Governance 更新只涵盖
//   00_Project_State.js/00_Product_Backlog.js/00_Review_History.js
//   三份文件，如实标注未涵盖的部分，不假装已经做了。
//
// ─── Findings ─────────────────────────────────────────────────────
//
//   FINDING-1（已修复）— dlp_getCaseOverview 真实 N+1 查询。
//     enrichDefectForDisplay_ 在 listDefectItemsForDashboard 的迴圈
//     内对每个 Defect 各呼叫一次 getPropertyCase/getProperty，即使
//     同一 Case 的所有 Defect 结果完全相同也重复查。Instrumented
//     测量确认：140 项 Defect 规模下 288 次 Sheets 读取。
//     Fix: 922_DashboardAdapter.js 新增 buildCaseOverviewForMobile_，
//     单次组装，4 张表各读一次，不动共用的
//     getDlpCaseDashboard/listDefectItemsForDashboard。同规模下降到
//     4 次读取（99% 减少），输出与旧路径逐栏位比对一致。
//     Verification: 本地 GasShim instrumented 测量 + 真机 CC 确认
//     "顺利跑通了"。
//
//   FINDING-2（防御性修复，根因未 100% 锁定）— google.script.run
//     对 dlp_getCaseOverview 的回传，真机 Executions log 显示
//     "Completed"、6.8 秒、无 error，但前端收到空值。Fix: 该 RPC
//     的回传值改用 JSON.stringify/parse 包装，scoped 在这一支，
//     没有动 dlp_wrap_ 本身（其他三支 dlp_* 已确认真机可用，不需要
//     一并修改）。★ 如实记录：这个修复是防御性质，不是已证实的
//     根因修复——不排除同一症状部分来自 Web App 部署版本未更新
//     （常见 GAS 陷阱：编辑器代码更新不代表已部署的 Web App 版本
//     自动更新），这点未被独立排除。
//     Verification: 修复后 CC 确认真机可用；根因层面未闭环，如实
//     标注为 LOW severity 遗留疑点，非阻塞。
//
//   FINDING-3（修复方案已提供，套用状态 UNVERIFIED / OPEN）—
//     GasShim.js 的 SpreadsheetApp mock 缺 flush()。
//     910_PropertyAssetEngine.js 的 withPropertyLock_（2026-07-29
//     新增）呼叫 SpreadsheetApp.flush()，真实 GAS 本来就有这个 API，
//     但本地预检 harness 的 mock 没跟上，导致
//     local_precheck_test_918/922/911.js 三个文件目前实际上跑不动
//     （createProperty 第一步就会 throw）。已提供一行修复方案。
//     Verification: UNVERIFIED / OPEN——目前没有确认实际 GasShim.js
//     已经套用该修复，不假设已完成（CC 2026-08-22 (b) 明确指示，
//     保持这个状态直到 CC 确认）。不影响真实 GAS 生产环境（真实
//     SpreadsheetApp 本来就有 flush()），只影响离线预检工具本身。
//
// ─── Disposition ─────────────────────────────────────────────────────
//   GO。DLP Defect Engine Phase 9/10（Mobile Web Console）
//   PRODUCTION-READY——11 步真机验证 Gate 全部通过。FINDING-1 已
//   修复并验证；FINDING-2 已用防御性修复处理，根因层面留有 LOW
//   severity 未完全排除的疑点，如实记录不隐藏；FINDING-3 待 CC
//   确认是否已套用，不阻塞本次 Disposition（只影响离线工具）。
//
// ─── Next Steps ──────────────────────────────────────────────────────
//   1. CC 在 MANUAL_VERIFICATION_CHECKLIST.md 上同步勾选 Test
//      Case 11
//   2. 确认 FINDING-3（GasShim.js flush() mock）是否已套用
//   3. Phase 11 — Real DLP/Defect Data Onboarding 启动（见
//      00_Project_State.js NEXT PRIORITY 第 9 点、00_Product_
//      Backlog.js 的 Gap 收集说明）
//   4. Sidebar DLP Tab 设计对话——优先级已提升，紧接 Phase 11 之后
//
// ─── Addendum (2026-08-22, 同日) ────────────────────────────────────
//   CC Review 本 REVIEW-002 与对应的 Governance 更新，基本批准，
//   提出四项修正后才正式 Review Approved（完整往来见
//   00_Project_State.js CHANGELOG 2026-08-22 (b)）：
//
//   (1) Phase 编号冲突——"Phase 11"曾同时代表两件不同工作（Real
//   DLP/Defect Data Onboarding vs. 997 测试+文档整理）。CC 拍板：
//   Phase 11 保留给 Real Data Onboarding；997 测试+文档整理顺延为
//   Phase 12；Sidebar DLP Tab 暂不预先编号，等实际执行顺序确定后
//   再分配。00_Project_State.js 已同步修正。CHANGELOG 历史条目
//   （(a) 与 2026-08-19）保留原文不改——CC 明确指示历史记录不回头
//   改写。
//
//   (2) PRODUCTION-READY 状态范围——CC 指出不应把整个 Property OS
//   的 PROJECT STATUS 标成 PRODUCTION-READY，只有 Phase 9/10 这个
//   子系统达到。00_Project_State.js 最上方新增 PROJECT STATUS
//   （ACTIVE DEVELOPMENT）/Current Phase（Phase 11）两个栏位，本
//   REVIEW-002 上方的结论行与 FINDING-3 标签同步补上"Phase 9/10"
//   范围限定，避免被单独摘录时误读成整个专案已经 Production-Ready。
//
//   (3) FINDING-2（JSON.stringify）——CC 确认保留原有的诚实描述：
//   defensive serialization workaround，非已证实的唯一根因。原文
//   未改。
//
//   (4) FINDING-3（GasShim flush()）——CC 明确指示保持 UNVERIFIED /
//   OPEN，不假设已套用。标签与 Verification 欄位已同步补上这个
//   明确状态。
//
//   Disposition 更新：四项修正已套用，00_Project_State.js/
//   00_Product_Backlog.js/00_Review_History.js 三份 Governance
//   文件 Review Approved。原 GO/PRODUCTION-READY 结论不变（范围
//   仍是 Phase 9/10 单一子系统，不是整个 Property OS）。Runtime
//   仍未开始，下一步正式进入 Phase 11 — Real DLP/Defect Data
//   Onboarding。

// ═══════════════════════════════════════════════════════════════════════
// END OF 00_Review_History.js
// ═══════════════════════════════════════════════════════════════════════
