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


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REVIEW-003 — ONETIME_Phase11_DefectImporter.js Design Review
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// Date: 2026-08-22
// Profile: 设计 Review（本地 Node/GasShim 测试驱动，非真机——这个
//   utility 从未、也还不会对真实 GAS/Sheets 执行）。
// Scope: ONETIME_Phase11_DefectImporter.js 单一文件——一次性 onboarding
//   utility，明确不是 Property OS 的正式 Runtime Engine。
// Owner: CC（solo dev）
//
// ─── 背景 ────────────────────────────────────────────────────────────
//   第一版 importer 用 addDefectItem 既有的 clientRequestId +
//   CacheService 做 dedup。CC review 时抓到关键问题：CacheService
//   TTL 只有 1 小时，无法保证跨天重跑不重复建立 DefectItem
//   （912_ObligationEngine.js 自己的注解就说这是给 retry-on-glitch
//   用的，不是给可能中断几小时/几天后才重跑的 batch job 用的）。
//   要求：durable dedup、稳定 source identity、5 态互斥结果分类、
//   dry-run 结构化输出、row cap 明确化——全部改完并针对每一点各写
//   了对应测试。
//
// ─── Findings（全部已修复并测试）────────────────────────────────────
//
//   全部 34 项测试通过，涵盖 9 个测试区块：
//   1. Setup + 防止覆盖既有 staging sheet
//   2. Dry-run 结构化 5 类计数（would_import/invalid/
//      duplicate_in_source/already_imported + 零写入）
//   3. Real run 5 态互斥分类写入 column G，DEFECT_ITEM_ADDED Timeline
//      entry 确认未被绕过
//   4. 相同资料重跑 → 幂等，零新增
//   5. maxRowsPerRun cap 明确化 + 跨次 resume（dry-run 主动算好、
//      明确告知需要几次 run，不自动串接）
//   6. 静态证明：全档案 .appendRow( 呼叫为零（含 staging sheet 自己
//      的写入都用 setValues），addDefectItem 确实被引用
//   7. addDefectItem() 真实执行失败（非验证失败）→ FAILED，与
//      INVALID/DUPLICATE_IN_SOURCE 分开；问题解决后重跑，只重试
//      FAILED 那笔，不重碰已成功的
//   8. Row 顺序在两次 run 之间打乱 → dedup 依然正确（key 是
//      OriginalReference 的值，never row position/index）
//   9. ★ 决定性测试：两个完全独立的 loadPropertyOSContext（各自全新
//      VM、全新 CacheService、零共享 JS 状态），只手动搬运
//      Spreadsheet 资料本身，模拟真实的「今天 Run #1、48 小时后全新
//      进程 Run #2」。Execution #2 一开始先确认自己的 CacheService
//      是空的，排除偷偷共享 cache 的可能；随后正确把全部 5 笔识别为
//      already_imported，零重复。
//
// ─── Disposition ─────────────────────────────────────────────────────
//   Importer Review Approved（CC，2026-08-22）。逐项批准：
//     - Durable dedup 不依赖 CacheService — Approved
//     - OriginalReference 作为 stable source identity — Approved
//     - row-order independence 已验证 — Approved
//     - fresh VM + fresh CacheService 的 cross-run proof 已验证 — Approved
//     - Importer 不直接写 DefectItem Truth Layer，只调用
//       addDefectItem() — Approved
//     - 五种 mutually-exclusive result status — Approved
//     - Dry-run zero-write guarantee — Approved
//     - 50-row cap + 不自动继续下一批 — Approved
//     - Checklist 保留 finding → resolution audit trail — Approved
//   明确重申：这个 importer 是 one-time onboarding/migration utility，
//   不是新的 Property OS Runtime Engine，验证完成后应停用/删除。
//
//   ⚠ Approved 的是设计与工程质量，不是"可以执行真实 import"——
//   CC 明确设了 PRE-IMPORT GATE，见 Next Steps。
//
// ─── Next Steps（PRE-IMPORT GATE，见 00_Project_State.js） ───────────
//   A. Canonical Defect Count — CC 提供/确认原始 Defect Report，
//      确定 total/编号范围/duplicate reference/缺失编号/非-defect
//      项目。不使用"140+"或"145"这两个都未经 Sheet/文件直接核实的
//      数字。
//   B. Phase 5/6 Test Data — CC 亲自核对真实 Drive/Sheet，确认前
//      不删除、不覆盖、不重新建立、不自动当成 production data。
//   A、B 都确认后：先对真实 Defect Report 跑 DRY RUN ONLY，CC review
//   dry-run 结果，明确批准后才执行第一次真实 batch——不自动从
//   dry-run 进入 commit。
//   另有一个尚未决定的独立问题：CC 提出在真实 import 前先做 DefectItem
//   Schema Migration（新增 ItemID/SubCategory/Remark）。Claude 认为
//   这跟 Phase 11 既有纪律（先不因真实资料录入改 Domain Model，等
//   跑完一轮真实案件再集中 Review）在时序上有张力，已在对话中提出，
//   等 CC 决定——本 Review 范围内未执行任何 Schema 变更。


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REVIEW-004 — DefectItem Schema Migration（ItemID / SubCategory /
//              Remark，20 栏 Reorder）Design & Deployment Review
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// Date: 2026-08-24～26
// Profile: Schema Migration Design + Deployment Review——本地
//   Node/GasShim 测试驱动 + 真实 GAS 项目实际部署执行，双重验证。
//   沿用 REVIEW-001/002 的 Definition of Ready/Done/Production-Ready
//   结构，非正式 UEF §9 Production Readiness Audit 格式。
// Scope: 901_PropertySchema.js（DefectItem.columns reorder，17→20
//   栏）、918_DefectEngine.js（addDefectItem/updateDefectItem 支援
//   itemId/subCategory/remark）、新建
//   ONETIME_Phase11_DefectItemSchemaReorderMigration.js、
//   ONETIME_Phase11_DefectImporter.js（staging schema 调整 +
//   setFrozenRows(1) 补上——与本次栏位改动本身无关的既有 gap，顺带
//   修复）、GasShim.js（flush()/setFontWeight()/autoResizeColumns()/
//   getLastColumn() 四个 mock 补齐，test infrastructure，非 domain
//   逻辑）。★ 不含 Item A/Item B 本身（Pre-Import Gate 剩余项目，
//   见 REVIEW-003 Next Steps，本次未变动、未解除）。
// Owner: CC（solo dev）
//
// ─── Definition of Ready（回溯检查）────────────────────────────────
//   ✓ 治理决定在实作前已产出：ADR-P18 两个问题——(1) migrate now vs.
//     等真实资料到位；(2) append-only vs. reorder——都先由 CC 拍板
//     （2026-08-24）才动手，不是边做边决定。
//   ✓ 前一版本（append-at-end）草案已交付、CC review 后明确推翻，
//     改为 reorder——ADR-P18 记录在案，
//     CHECKPOINT_2026-08-26_Phase11-SchemaMigration.md 第 3 节列为
//     "已被取代"，不是本次才第一次做决定。
//
// ─── Definition of Done ─────────────────────────────────────────────
//   ✓ 代码已实作（901/918/两个新 ONETIME 档案/GasShim 四个 mock）
//   ✓ 全部 .js 语法检查（node -c）干净
//   ✓ 两份新测试套件：local_precheck_test_phase11_schema_migration.js
//     48/48、local_precheck_test_phase11_defectitem_reorder_
//     migration.js 30/30，全通过
//   ✓ 既有回归无损：918 本地测试 144/144、922 本地测试 37/37
//   ✓ 用 node -e 直接执行 loadPropertyOSContext 拿到
//     PROPERTY_SCHEMA.DefectItem.columns 真实内容，20 栏顺序与
//     ADR-P18 决定的顺序逐字比对一致（非只读 checkpoint 文字转述）
//   ✓ 零硬编码 column index——918/922/947/948/Importer 对 DefectItem
//     的存取路径逐一确认，全部经由 901 的具名 helper
//     （readRowAsObject_/objectToRowArray_/updateRowFields_），reorder
//     对这些呼叫方是透明的
//   ✓ ADR-P18 唯一一份记录（grep -c "ADR-P18" 00_ADR_Log.js = 1，
//     无重复）
//   ✓ 治理文件同 session 更新：00_Project_State.js ADR 状态栏 +
//     CHANGELOG、00_File_Map.js 补上两个新档案条目
//
// ─── Definition of Production-Ready ─────────────────────────────────
//   Done + 真实 GAS 项目实际执行验证。
//   → ★ 结论（本次 Scope 范围内，即 Schema Migration 本身——不代表
//   整个 Phase 11 Pre-Import Gate 已解除）：CC 已在真实 GAS 项目完成
//   8 个档案部署 → 手动执行 migration 函式 → Logger 回报 MIGRATION
//   SUCCESS → Mobile Console 手动碰过、无 Schema drift 报错。三步
//   都是 CC 本人操作完成，PRODUCTION-READY（本次 Scope 范围内）。
//   ⚠ 如实标注未涵盖的部分：真实 migrated row 数的精确数字未经
//   Claude 直接确认（如需要，请查该次执行的 Execution/Logger 记录）；
//   "8 个档案部署"本身 Claude 没有工具核对是否逐字节相同，只能相信
//   CC 的操作结果，不假装已独立验证。
//
// ─── Findings ─────────────────────────────────────────────────────
//
//   FINDING-1（已修复，本次范围内发现，与栏位 reorder 本身无关）—
//     ONETIME_Phase11_DefectImporter.js 的
//     phase11_setupDefectImportStagingSheet() 原本漏了
//     setFrozenRows(1)，是既有 gap，CC 实际操作真实 GAS 项目时发现
//     （非本地测试发现）。Fix: 已在同一函式内、设完 header 与 bold
//     格式后紧接着补上（同一次函式呼叫内一次做完，不是分两步）。
//     Verification: grep 核实其位置 +
//     local_precheck_test_phase11_schema_migration.js 专属断言
//     （frozenRows === 1，注解记录"spotted missing on the real sheet
//     2026-08-24"）守着，本次核对重新执行仍通过。CC 确认
//     （2026-08-26）真实 DefectImportStaging 目前尚未建立，下次执行
//     setup 会一次自动带 freeze，不需要对既有 sheet 另外补救。
//
//   FINDING-2（已修复，设计阶段发现）— 日期栏位 reorder 后如果不先
//     锁定 plain-text 格式，真实 Google Sheets 会把 migration 写入的
//     日期栏位自动转型成 Date object，而非 Property OS 全线预期的
//     ISO 字串。Fix:
//     ONETIME_Phase11_DefectItemSchemaReorderMigration.js 写入前对
//     日期栏位做 setNumberFormat('@')，比照 ensureSheetSchema_ 既有
//     处理手法。Verification: 本地测试涵盖 0 笔资料/3 笔资料/
//     idempotent 重跑/header 不符 preflight abort/sheet 不存在共
//     5 种情境，30/30 通过。
//
//   （REVIEW-003 已列过的 Importer 本身设计发现，本次不重复列；本次
//   新发现仅上述两项）
//
// ─── Disposition ─────────────────────────────────────────────────────
//   GO——DefectItem Schema Migration（ItemID/SubCategory/Remark，
//   20 栏 reorder）本身 COMPLETE + VERIFIED。ADR-P18 APPROVED，已在
//   真实 GAS 项目部署执行成功。FINDING-1/2 均已修复并验证。Schema
//   Freeze（ADR-P18）自本次起生效：真实资料录入期间新栏位需求一律
//   先进 00_Product_Backlog.js 的 Feedback/Gap，不当场改 Domain/
//   Runtime，除非是 data integrity/safety bug。
//   ⚠ 此 Disposition 范围严格限定在 Schema Migration 本身——不代表
//   Phase 11 Pre-Import Gate 已解除，不代表 Dry Run/Real Import 已
//   获批准。Item A（原始 Defect Report 真实数量/内容）依然 OPEN，
//   是继续推进的唯一阻塞项（Item B 状态见 REVIEW-003/Checklist，
//   本次未变动）。
//
// ─── Next Steps ──────────────────────────────────────────────────────
//   1. 等 CC 提供 Item A（原始 Defect Report 真实内容）——逐项 key in
//      或截图皆可
//   2. Item A 到位后：填入真实 GAS 项目的 DefectImportStaging 表 →
//      CC 手动执行 phase11_dryRunDefectImport() → review
//      ValidationResult 栏 → 确认无误后 CC 手动执行
//      phase11_runDefectImport()
//   3. 在 CC 明确要求前，不主动建议或执行 Dry Run/Real Import
//   4. 两个 ONETIME_Phase11_*.js 档案：CC 决定暂时保留（2026-08-26）
//      ——Phase 11 真实 onboarding 尚未开始，两者仍是现役工具（schema
//      migration/verification 与 defect importer），archive/delete
//      时机留到真实资料全部导入、验证完成、确定不会再 rollback/
//      rerun 之后再决定
//   5. 00_File_Map.js 整份 manifest 重新核对（含 947/948 那段既有
//      落差）：CC 决定暂不在本次治理更新中处理（2026-08-26），记录
//      为 Backlog BL-4（见 00_Product_Backlog.js），等 Phase 11 主线
//      告一段落后再集中处理
//
// ─── Addendum (2026-08-26，同日) ────────────────────────────────────
//   CC 对本次治理更新给出四项明确指示，均已落实：
//   (1) Phase11_RealDataOnboarding_Checklist.md 里过时的 Schema
//   Migration"待决定"段落已更新，反映 ADR-P18 APPROVED + Migration
//   已完成、当前 Schema-Frozen / Pre-Import 状态。
//   (2) 本 REVIEW-004 正式补上。
//   (3) 两个 ONETIME_Phase11_*.js 暂不删除——见上方 Next Steps 第 4
//   点，CC 原话："我们还没完成真实 Defect onboarding。它们现在还是
//   Phase 11 的工具"。
//   (4) 00_File_Map.js 全面重审暂不处理，属于 housekeeping，记录进
//   Backlog BL-4，避免在 Pre-Import Gate 治理更新中另开一个大范围
//   audit——见上方 Next Steps 第 5 点。
//   完成以上四项治理更新后停止：不进行任何 Dry Run/Real Import，
//   等待 CC 提供 Item A。


// ═══════════════════════════════════════════════════════════════════════
// END OF 00_Review_History.js
// ═══════════════════════════════════════════════════════════════════════
