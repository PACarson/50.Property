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


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REVIEW-006 — Mobile Console itemId/SubCategory/Remark Field-Display
//              Enhancement
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// Date: 2026-08-30
// Profile: 小范围 UI/read-side enhancement 的收尾记录。比照
//   REVIEW-002/004 的段落结构，但按实际变更规模大幅缩减——不为了套用
//   格式而虚增不存在的内容。
// Scope: 922_DashboardAdapter.js 的 buildCaseOverviewForMobile_() +
//   948_MobileConsole.html 的 renderOverview_()。两处都只涉及已存在
//   的 DefectItem.ItemID/SubCategory/Remark（ADR-P18 新增）如何被组进
//   Mobile Console 显示层，901 schema 本身这次未变。不含 Sidebar DLP
//   Tab（enrichDefectForDisplay_ 明确排除，留给该 Tab 未来开工时一起
//   决定）；不含 Domain Model / Schema / dedup logic /
//   getCaseTimeline() 排序逻辑。
// Owner: CC（solo dev）
//
// ─── 背景与 Pre-Coding Audit ─────────────────────────────────────────
//   ADR-P18（2026-08-24～26）把这三栏加进 DefectItem schema，但当时
//   只处理到 Schema/Domain 层——Mobile Console 的 Case Overview 画面
//   从未跟着显示（REVIEW-004 完成的是 schema migration 本身，不含这层
//   UI gap）。CC 2026-08-30 提出要补上。Coding 前先对 repository 实际
//   内容逐项核对（node -c、直接跑测试、grep/view，不依赖先前对话或
//   checkpoint 文字），确认：901/918 的读取路径本身 schema-driven，
//   天然带出这三栏；真正服务 Mobile Console 的是 922 的
//   buildCaseOverviewForMobile_（不是 UI Contract 文件写的
//   getDlpCaseDashboard+listDefectItemsForDashboard，那组合
//   2026-08-21/22 N+1 修复后已经换掉、Contract 文件没跟着更新），这个
//   函式手动列栏位、当时没选进这三个新栏位，此前也 0 条专属测试；947
//   纯 passthrough，不需要跟着改。过程中也发现这次上传的 repository
//   与前一份 checkpoint 文字宣称的完成状态有落差，如实记录、未擅自
//   修正（细节见下方"顺带发现"、00_Product_Backlog.js BL-5(2)/BL-6）。
//
// ─── Definition of Done ──────────────────────────────────────────────
//   ✓ 922/948 两处改动完成，diff 只涉及这两个档案 + 新增的
//   local_precheck_test_922.js 测试区块（repo-wide diff -rq 核实，
//   901/918/947/enrichDefectForDisplay_/三个 ONETIME_Phase11_*.js/
//   GasShim.js 逐一确认未被触碰）。
//   ✓ buildCaseOverviewForMobile_() 新增 9 条专属断言（此前 0
//   覆盖率）：有值时正确传出、三个 optional 栏位皆空时不产生
//   undefined/null、多笔 DefectItem 用 defectId 而非 array 位置比对
//   确认不错位。连跑 20 次，9 条新断言 20/20 全过。
//   ✓ 既有 regression 全数重跑：918 144/144；phase11_schema_migration
//   71/71；phase11_schema_consolidation_migration 38/38；全 repo
//   node -c（43 个 .js + 948 内嵌 script）全过。
//   ✓ CC 已将两个改动档案部署到真实 GAS 项目、实际打开 Mobile
//   Console 跑过一次，回报"暂时无误"。
//
// ─── Definition of Production-Ready — 刻意不下结论 ──────────────────
//   ★ 如实记录：跟 REVIEW-002/004 不同，这次没有 MANUAL_VERIFICATION_
//   CHECKLIST.md 式的逐项真机验证清单，CC 的"暂时无误"是初步、简短
//   确认，不是把 optional 栏位皆空、多笔 defect 混合等情境在真实资料
//   上逐一走过一遍的正式验证记录。本 REVIEW 不宣告 PRODUCTION-READY，
//   只记录到"已部署、CC 初步确认无异常"这个精确程度，避免跟
//   REVIEW-002 的 11 步 Gate 通过、正式 GO 结论混为一谈。
//
// ─── Findings ─────────────────────────────────────────────────────
//   本次没有真机除错过程——Findings 栏位刻意留空，不为了套用
//   REVIEW-002 的格式而编造不存在的发现。这也是本次比 REVIEW-002 轻量
//   的原因：pre-coding audit + 完整本地测试覆盖在部署前就做了，不是
//   部署后才在真机上抓 bug。
//
// ─── 顺带发现（与本次变更本身无关，记录不处理）──────────────────────
//   挑选本次该用哪个 REVIEW 编号时，直接 grep 这份档案核实——发现
//   00_ADR_Log.js（ADR-P19）、00_Project_State.js（2026-08-26
//   CHANGELOG）、00_File_Map.js 三处都引用"REVIEW-005"，但这份档案里
//   从来没有 REVIEW-005，只到 REVIEW-004。本次记录因此改用
//   REVIEW-006，刻意跳过 005，把编号留给未来真正补上那份（Schema
//   Consolidation Impact Analysis）。详见 00_Product_Backlog.js BL-6。
//
// ─── Disposition ─────────────────────────────────────────────────────
//   本地层面 DONE：改动完成、diff 干净、新测试与既有 regression 全数
//   通过。真机层面：CC 已部署并初步确认无异常，但按 CC 自己订下的
//   Deployment boundary，正式的真机/多情境验证（尤其三个 optional
//   栏位在真实资料上如何呈现）由 CC 自行进行，Claude 不越界代为宣告
//   已完整验证。
//
// ─── Next Steps ──────────────────────────────────────────────────────
//   1. 若 CC 之后在真机上发现三栏显示有任何异常（尤其空值情境或多笔
//   defect 混合），回报即可，不需要重新走一次完整 Pre-Coding Audit。
//   2. Goal 2 Gap（DeveloperStatus/OwnerVerificationStatus/
//   Reopen/Close 目前在 Mobile Console/Sidebar 都还没有 UI
//   wrapper）——规划留待下一轮，本 REVIEW 只记录现状，不预先设计。
//   3. BL-6（REVIEW-005 缺口）与 BL-5（尚未执行的三项）都还是 OPEN，
//   不属于本次范围，一并留待 CC 之后处理。


// ═══════════════════════════════════════════════════════════════════════
// REVIEW-007 — Sidebar DLP Tab: Phase 1 Design Review
// ═══════════════════════════════════════════════════════════════════════
//
// Date: 2026-08-31
// Profile: Design Review — negotiated Contract document, not a
//   Production Readiness Audit (no code exists yet to audit). Comparable
//   in kind to the original DlpMobileConsole_UIContract.md negotiation
//   (Phase 9/10, pre-REVIEW-002) — a Contract settled BEFORE
//   implementation, not after.
// Scope: The Sidebar "DLP" Tab (945/946+947) that
//   DlpMobileConsole_UIContract.md §0 explicitly deferred as "its own
//   design pass later." This review is that design pass, for Phase 1
//   only. Output: DlpSidebarTab_UIContract.md (standalone file,
//   delivered to CC, NOT yet part of the tracked repository — see
//   00_Project_State.js 2026-08-31 CHANGELOG entry for the exact
//   handoff detail).
// Owner: CC (solo dev)
//
// ─── Process ──────────────────────────────────────────────────────────
//   v1 draft (Claude) → 5 open questions flagged, one of them a
//   data-model correction (Correspondence has no defectId field and no
//   listCorrespondenceForDefect query in 918 — it's Case-level only,
//   despite the original ask grouping it with Defect-level concerns) →
//   CC resolved all 5 and added two further disciplines not in the
//   original ask → v2 (final, this review's subject).
//
// ─── Key Decisions ────────────────────────────────────────────────────
//   1. Phase 1 command scope: View Defect List + Defect Detail, Update
//      Developer Status, Record Owner Verification, Add Rectification
//      Event (added by CC — defect-scoped, core to the rectification
//      lifecycle, existing logRectificationEvent used as-is), View +
//      Attach Evidence (full EvidenceType/Phase enum, unlike Mobile's
//      simplified capture), View + Log Secondary Damage, View
//      Correspondence (Case-level, per the data-model correction).
//   2. Explicitly Phase 2, not this round: Close Defect, Reopen Defect,
//      Close Case — real state-machine gates
//      (OwnerVerificationStatus==='Verified' / required reason / every
//      sibling DefectItem already Closed, respectively, all verified
//      directly against 918), not just UI. No disabled placeholder
//      either — CC's ruling: a "Coming Soon" control misleads more than
//      an absent one does.
//   3. Navigation: Case is root, with three siblings — Case Overview,
//      Correspondence, and Defect List (→ Defect Detail on click). Not
//      one flat screen, not everything nested under one Defect.
//   4. Server architecture: 947 becomes the sole DLP glue point for
//      both 948 and 945's new DLP tab — formalized separately as
//      ADR-P20 (this is an architecture decision in that ADR's sense;
//      the rest of this list isn't).
//   5. Reliability: no clientRequestId retrofit onto the five Commands
//      that lack it (recordDeveloperStatus/recordOwnerVerification/
//      closeDefectItem/reopenDefectItem/closeCase) — Sidebar's
//      desktop/stable-connection profile doesn't carry Mobile's
//      flaky-connection motivation for the pattern. (Separately
//      verified: logRectificationEvent already has full clientRequestId
//      support today, so it needed no such decision.)
//   6. Phase 1 Domain/Schema freeze: every write in Phase 1 is an
//      existing 918/911 Command used exactly as it exists — zero new
//      Domain logic, zero Schema change, zero dedup change. Gaps
//      surfaced by either CC's real usage or Claude's Sidebar-building
//      work go to 00_Product_Backlog.js first (see BL-7), not a
//      same-session "saw a problem, fixed 918" edit — the explicit
//      exception, same as everywhere else on this project, is a genuine
//      data-integrity/safety bug, which is still handled immediately.
//   7. The new 922 Detail-page aggregation function must stay
//      Sidebar-specific — CC explicitly declined generalizing/merging
//      it with buildCaseOverviewForMobile_ into one "universal"
//      function, matching this project's standing bias against
//      premature shared-code generalization across UI surfaces.
//
// ─── Definition of Done ──────────────────────────────────────────────
//   ✓ DlpSidebarTab_UIContract.md v2 written, all 5 of CC's resolutions
//   and both new disciplines incorporated (19 sections).
//   ✓ Zero runtime files touched during either drafting pass — verified
//   both times via repo-wide diff against the pre-session upload; the
//   same 7 files (3 Mobile Console enhancement + 4 REVIEW-006-era
//   governance) are the only ones that differ, unchanged by this
//   Contract work.
//   ✓ Every Command signature/enum/gate cited in the Contract (§§5-9,
//   13, 15) verified directly against 918/911/900's actual current code
//   during drafting, not recalled from earlier in the conversation.
//
// ─── Definition of Production-Ready — N/A, explicitly ──────────────────
//   ★ There is no Runtime code for this Tab yet. This review certifies
//   the DESIGN is settled for Phase 1, nothing about readiness for real
//   use — that question doesn't arise until something exists to ask it
//   about. Don't read this REVIEW-007 entry as any kind of GO signal the
//   way REVIEW-002's Disposition was; it's a different kind of review.
//
// ─── Disposition ──────────────────────────────────────────────────────
//   Design APPROVED for Phase 1 by CC. Implementation NOT STARTED —
//   zero 922/947/945/946 Runtime changes exist for this Tab. Tracked as
//   00_Product_Backlog.js BL-7 pending CC's explicit go-ahead to begin
//   coding (approving this Contract was not that go-ahead, per CC's own
//   explicit instruction each round of this negotiation).
//
// ─── Next Steps ──────────────────────────────────────────────────────
//   1. CC gives explicit authorization to begin implementation (separate
//   from Contract approval).
//   2. Likely build order per the Contract's own §19: 922's new
//   projection functions → 947 glue (dlp_* additions, per ADR-P20) →
//   945 UI (new DLP tab + List/Detail sub-navigation).
//   3. BL-6 (REVIEW-005 gap) and BL-5 (three pre-2026-08-26 items) both
//   remain OPEN, untouched by this review, unrelated to it.


// ═══════════════════════════════════════════════════════════════════════
// REVIEW-008 — Sidebar DLP Tab Phase 1: Vertical Slice 1 Implementation
// ═══════════════════════════════════════════════════════════════════════
//
// Date: 2026-08-31 (continued session)
// Profile: Implementation-completion record, same kind as REVIEW-006 —
//   real Runtime code exists now, this documents what and how it was
//   verified. Comparable in weight to REVIEW-006, not REVIEW-002's full
//   11-step Gate (no real-device verification has happened yet — see
//   Disposition).
// Scope: Following REVIEW-007's Design Review and CC's subsequent
//   bounded Implementation Authorization (explicit STOP points
//   preserved, Phase 2 and Domain/Schema changes explicitly excluded),
//   CC further narrowed this round to the first of two vertical slices:
//   Case Overview, Defect List, Defect Detail, Update Developer Status,
//   Record Owner Verification. Rectification Event, Evidence, Secondary
//   Damage, and Correspondence are the second slice — deliberately not
//   started this round, so that any real-usage feedback on slice 1 can
//   be absorbed before slice 2 begins.
// Owner: CC (solo dev)
//
// ─── Pre-Coding Audit ─────────────────────────────────────────────────
//   Read DlpSidebarTab_UIContract.md in full (all 19 sections, including
//   the truncated middle on first view — re-viewed by explicit line
//   range to get the rest) before writing anything. Independently
//   verified CC's three Rectification Event claims directly against
//   918/900 (not taken on trust from the Contract or CC's message):
//   logRectificationEvent has full clientRequestId cache-check/cache-
//   write idempotency (lines ~1360-1434); exactly 7
//   RECTIFICATION_EVENT_TYPES and 2 RECTIFICATION_SOURCES with
//   OwnerObserved as the stated default, both in 900_PropertyConfig.js.
//   All matched the Contract and CC's message exactly — no discrepancy
//   found. Also read 901's DefectItem schema (19 columns), 918's
//   recordDeveloperStatus/recordOwnerVerification/getDefectItem/
//   listDefectItemsForCase, 922's enrichDefectForDisplay_/
//   buildCaseOverviewForMobile_/getDlpCaseDashboard/
//   listDefectItemsForDashboard, 946's console_wrap_ pattern, and 947's
//   existing dlp_wrap_/dlp_getCaseOverview (including its
//   JSON.stringify workaround and why it's scoped to that one function)
//   before writing any new code. Established a clean baseline first:
//   918 144/144, 922 46/46, full node -c, all before touching anything.
//
// ─── Key Implementation Decisions ──────────────────────────────────────
//   1. No new 922 aggregation function this round. Case Overview and
//      Defect List reuse getDlpCaseDashboard/listDefectItemsForDashboard
//      as-is — both already existed and were already earmarked in their
//      own docblocks for this exact future use. The Contract §18
//      Detail-page aggregation (bundling Rectification Events/Evidence/
//      Secondary Damage) is genuinely needed only once those three
//      exist — building it now would mean guessing at a shape likely to
//      be replaced next round.
//   2. dlp_getSidebarDefectDetail is a bare pass-through of
//      getDefectItem() — raw PascalCase field names, not remapped to
//      the List's camelCase shape. Field remapping is a 922 Projection-
//      layer concern (Contract §12); inventing one now, ahead of the
//      real aggregation function slice 2 will need, risked building the
//      wrong shape twice.
//   3. New Sidebar-facing dlp_* wrappers do NOT use the JSON.stringify
//      workaround dlp_getCaseOverview uses — that fix is scoped to the
//      Mobile Web App's doGet() google.script.run boundary specifically
//      (its own comment cites the 2026-08-21 real-device root cause).
//      945's four existing tabs already return comparably-nested plain
//      objects through console_wrap_ with no such issue, so the new
//      wrappers follow that already-proven Sidebar pattern instead.
//   4. Defect List is a real <table> (per Contract §3's explicit "not
//      cards" instruction, all 10 specified columns present), but
//      945's Sidebar shell is a narrow ~300-380px width in practice
//      (showSidebar(), not a wide desktop canvas) — a literal 10-column
//      cram would be unusable. Wrapped in a horizontal-scroll container
//      with a sticky ItemID column and truncated/tooltip cells so every
//      column is genuinely present and reachable, not silently dropped.
//   5. Case Overview intentionally renders only caseInfo + defectCounts
//      from getDlpCaseDashboard's full return shape — not
//      secondaryDamageCount/correspondence/upcomingRectification/
//      upcomingReinspection/recentTimeline, even though the wrapper
//      passes all of it through untouched. Keeps this round's visible
//      UI scope matched to what's actually actionable this round.
//   6. No pre-check/disabled state on the two action forms for a Closed
//      defect — literal reading of Contract §5/§6 ("doesn't need to
//      pre-check, just render whatever error comes back"). Confirmed via
//      smoke test (see below) that DEFECT_ITEM_CLOSED surfaces cleanly.
//
// ─── Definition of Done ──────────────────────────────────────────────
//   ✓ Exactly 4 files changed — verified via repo-wide diff against the
//   untouched original upload (a second pristine extraction, not a
//   mental diff): 922_DashboardAdapter.js (+7 lines,
//   enrichDefectForDisplay_ gains subCategory/remark),
//   947_DlpConsoleServer.js (+97 lines, 6 new dlp_* wrappers),
//   945_OperatorConsole.html (+399 lines, new 5th DLP tab), and
//   local_precheck_test_922.js (+51 lines, new tests). 918/900/901/946/
//   948, every ONETIME_*.js, and every 00_*.js governance file confirmed
//   byte-for-byte unchanged by the same diff.
//   ✓ 918 regression: 144/144 (unchanged, confirms Domain untouched).
//   ✓ 922: 53/53 (46 pre-existing + 7 new — fully-populated / both-
//   omitted / partial-population / no-cross-defect-leakage / regression-
//   on-pre-existing-fields, mirroring the exact assertion shape
//   REVIEW-006's buildCaseOverviewForMobile_ block already established,
//   plus confirming listDefectItemsForDashboard surfaces the two new
//   fields transitively).
//   ✓ Full node -c across every .js file, plus 945's embedded <script>
//   extracted separately and checked on its own — both clean.
//   ✓ Every new 945 function name cross-checked (defined-once, called-
//   at-least-once); every new DOM id cross-checked (declared in markup,
//   referenced in JS — including the three dynamically-built
//   dlpSub{Overview,List,Detail} ids); every dlp_* RPC name cross-
//   checked 1:1 between 945's calls and 947's definitions. All clean.
//   ✓ An ad-hoc smoke test for the 6 new 947 wrappers (scratch-only, NOT
//   committed to the repo — 946/947 remain outside the local harness's
//   FILES list, same as every dlp_* wrapper before them): 16/16,
//   including the DEFECT_ITEM_CLOSED block surfacing correctly through
//   both new write wrappers, and FailedVerification correctly staying
//   re-recordable (Contract §6, not one-way).
//
// ─── Definition of Production-Ready — N/A, explicitly ──────────────────
//   ★ Zero real-GAS deployment, zero real-device verification. Unlike
//   REVIEW-006 (which at least had CC's initial "暂时无误" after
//   deploying), this round has not been opened in a real Sidebar at all
//   yet. Nothing here should be read as any kind of readiness signal —
//   only that local verification (syntax, regression, and this round's
//   own smoke test) is clean.
//
// ─── Findings ─────────────────────────────────────────────────────────
//   No real-device debugging this round (none has happened yet). Two
//   Gaps surfaced during implementation, logged per Contract §14
//   (00_Product_Backlog.js BL-8/BL-9), neither fixed:
//   1. listDefectItemsForCase (918) never checks case existence — only
//      filters DefectItems by CaseID — so listDefectItemsForDashboard,
//      and therefore the new dlp_listSidebarDefects, silently returns
//      an empty array for a non-matching caseId, unlike
//      getDlpCaseDashboard which throws DLP_CASE_NOT_FOUND for the same
//      input. Confirmed via the smoke test, not assumed. Dormant today
//      — ACTIVE_DLP_CASE_ID is correct — but would surface as "Case
//      Overview errors, Defect List silently looks empty" if that ever
//      became misconfigured.
//   2. local_precheck_test_phase11_defectitem_reorder_migration.js has a
//      failing assertion. Confirmed via a second pristine extraction of
//      the original upload that this predates this session entirely
//      (byte-identical failure on the untouched original) — a stale
//      test still expecting OriginalReference, which ADR-P19's later
//      consolidation removed. Unrelated to Sidebar DLP work; not
//      touched.
//
// ─── Disposition ─────────────────────────────────────────────────────
//   Local layer DONE for vertical slice 1: implementation complete,
//   diff clean, all new and pre-existing local verification passing.
//   Real-device layer: NOT STARTED — deployment and manual verification
//   are CC's own next step, per this project's standing Deployment
//   boundary (Claude doesn't have write access to CC's real GAS
//   project). No STOP-point trigger fired during this round (checked
//   against all 8: no new Schema, no 918 semantics change, no Command
//   found insufficient, no new business rule, no status-machine change,
//   no idempotency retrofit, no Contract-vs-code mismatch beyond the two
//   Gaps above — which are pre-existing code behavior, not Contract
//   inaccuracy — and no new Gap from real data, since Phase 1 doesn't
//   touch real data at all).
//
// ─── Next Steps ─────────────────────────────────────────────────────
//   1. CC deploys these 4 files to the real GAS project and verifies the
//   new DLP tab manually — no formal checklist exists for this yet the
//   way MANUAL_VERIFICATION_CHECKLIST.md covers Phase 9/10; CC may want
//   one before or instead of ad-hoc verification, at CC's discretion.
//   2. Vertical slice 2 (Rectification Event / Evidence / Secondary
//   Damage / Correspondence) needs its own explicit go-ahead — not
//   authorized by this REVIEW, per CC's own stated pacing (absorb
//   slice-1 feedback first).
//   3. BL-8/BL-9 (this round's two Gaps) remain OPEN, same as BL-5/BL-6.
//   4. Noticed in passing, unrelated to this session: README.md still
//   describes a property-os-tests/ Node-sandbox layout (shim/GasShim.js,
//   tests/*.js subdirectories) that doesn't match this repo's actual
//   flat structure (GasShim.js and every local_precheck_test_*.js file
//   sit at repo root, no property-os-tests/ directory exists here). Not
//   investigated further, not touched — flagged only.


// ═══════════════════════════════════════════════════════════════════════
// REVIEW-009 — Sidebar DLP Tab Phase 1: Vertical Slice 2 Implementation +
// Real-Device Overview Crash Fix
// ═══════════════════════════════════════════════════════════════════════
//
// Date: 2026-08-31/2026-09-01 (continued session, spanning CC's real-
//   device test of vertical slice 1)
// Profile: Two causally-linked pieces of work kept as one entry rather
//   than split: vertical slice 2's implementation (Rectification Event/
//   Evidence/Secondary Damage/Correspondence), and a real-device bug fix
//   CC's testing of slice 1 surfaced mid-slice-2-work. Comparable in
//   weight to REVIEW-008 for the implementation half; the bug-fix half
//   is closer to REVIEW-006's "genuine bug, fixed immediately" territory
//   than a normal Gap-log entry (Contract §14's own stated exception).
// Scope: CC authorized continuing to vertical slice 2 explicitly, while
//   also stating slice 1 had not yet been tested on a real device —
//   directly at odds with CC's own stated rationale for splitting into
//   two slices ("absorb slice 1 feedback before starting slice 2").
//   Claude flagged this tension once, plainly, then proceeded (judged
//   slice 2's work as largely additive/independent, low risk of being
//   wasted by whatever slice 1 feedback might surface) — CC's call to
//   make, not Claude's to block on. CC then tested slice 1 for real
//   (before slice 2's own UI work was finished) and reported: DLP tab
//   opens, Defect List/Detail/both write actions all work; Case Overview
//   loads blank. CC separately supplied a written diagnostic (style and
//   structure distinct from CC's own — likely another AI's output CC
//   was relaying, though CC did not say so explicitly) proposing a root
//   cause and fix.
//
// ─── Handling the third-party diagnostic ───────────────────────────────
//   Per CC's own stated preference (profile: "prefers verified claims
//   over third-party analyses"), the diagnostic was treated as a
//   hypothesis to check against actual source, not accepted at face
//   value. Verified directly:
//   - Claim (getCaseTimeline's sort calls .localeCompare() directly on
//     OccurredAt with no type guard): TRUE — read at
//     922_DashboardAdapter.js, confirmed. getDlpCaseDashboard calls
//     getCaseTimeline, so this crash would take down the whole Case
//     Dashboard call — exactly matching "Overview blank, List/Detail
//     fine" (neither of those touches this function).
//   - Claim (getDlpCaseDashboard reads ~8 sheets): TRUE — read and
//     counted directly (PropertyCase, DefectItem, SecondaryDamage,
//     Correspondence, RectificationEvent, DailyProgressCheck,
//     PropertyCaseTimeline, plus Property via the join).
//   - Corroborating precedent found independently (not in the
//     diagnostic): 901_PropertySchema.js already has a
//     coerceToIsoDateString_ utility with a comment explicitly citing
//     the same risk class ("belt-and-suspenders in case manual edit
//     bypassed text formatting"), with its own prior test coverage —
//     this project has hit and fixed this exact class of bug before.
//     Also found: ensureSheetSchema_'s dateColumns text-format
//     protection only applies `if (isNewSheet)`, so a sheet that
//     already existed before dateColumns was added to its schema never
//     gets it retroactively — a concrete mechanism for how a real ISO
//     string, written correctly, can still come back as a native Date
//     object from an older sheet.
//   - Rejected: the diagnostic's proposed architectural fix (build a new,
//     leaner Overview-only aggregation function that reads only 2 sheets
//     instead of 8). This would reverse vertical slice 1's own explicit,
//     reasoned decision to reuse getDlpCaseDashboard/
//     listDefectItemsForDashboard rather than build new 922 functions —
//     exactly the kind of unilateral scope expansion CC's Implementation
//     Authorization was structured to prevent. The verified crash is
//     fully fixed by making the sort defensive; no sheet-count reduction
//     is needed to fix it, so none was made.
//   - Rejected: the diagnostic's broader "type-sanitize every date field
//     in every aggregation function" ask. Checked the two other date-
//     touching call sites inside getDlpCaseDashboard's chain
//     (isCorrespondenceOverdue_, isRectificationEventUpcoming_) — both
//     already route through parseIsoDate_, which does String(value)
//     defensively, so neither shares getCaseTimeline's crash risk (wrong
//     "Invalid Date" result on a real Date input is a lesser, separate
//     concern, not verified as an actual problem, not touched). Scope
//     kept to the one verified crash, not a system-wide date-safety
//     audit — 912/913/910 etc. were not touched.
//
// ─── Why this was fixed immediately, not logged as a Gap ──────────────
//   Contract §14's own text carves out an explicit exception: "a genuine
//   data-integrity or safety bug found during Sidebar work is still
//   handled immediately... everything short of that: log it, don't fix
//   it in the moment." A confirmed real-device crash that makes an
//   entire panel permanently unusable is squarely inside that exception,
//   not the general Gap-logging rule — the fix itself required no new
//   design decision (a straightforward defensive-coercion fix, using the
//   same idiom this codebase already established), so there was nothing
//   to actually STOP-and-ask CC about.
//
// ─── Vertical slice 2 implementation ───────────────────────────────────
//   New 922: buildDefectDetailForSidebar_ (Contract §18's Detail-page
//   bundle — defect + Rectification Events + Evidence + Secondary
//   Damage, single-pass, camelCase throughout, builds on
//   enrichDefectForDisplay_ rather than duplicating its Property/Case
//   join) plus 4 enrichment helpers (enrichRectificationEventForDisplay_/
//   enrichEvidenceForDisplay_/enrichSecondaryDamageForDisplay_/
//   enrichCorrespondenceForDisplay_ — the last View-only, matching
//   Contract §1/§10's "View" verb with no matching "Add"). All new date
//   fields defensively coerced via the same helper the crash fix uses
//   (coerceIsoDateTimeForDisplay_, new, lives in 922 — not
//   coerceToIsoDateString_/901, which truncates to date-only and would
//   have been the wrong precision for these datetime fields) — proactive
//   for code that had zero real-device confirmation yet, unlike
//   enrichDefectForDisplay_, which was deliberately left untouched
//   (already confirmed working, no reason to risk it for a fix it
//   hasn't demonstrated needing).
//
//   dlp_getSidebarDefectDetail (947) upgraded from vertical slice 1's
//   bare getDefectItem() pass-through to call the new bundle function —
//   a deliberate, planned shape change (REVIEW-008 already flagged this
//   as deferred, not accidental breakage). 4 new wrappers:
//   dlp_addRectificationEvent, dlp_attachDefectEvidence (distinct from
//   the existing Mobile-only dlp_attachEvidence — that one hardcodes
//   evidenceType:'Photo'/phase:'NotApplicable' and requires a checkId,
//   not reusable here), dlp_addSecondaryDamage,
//   dlp_listSidebarCorrespondence (view-only). dlp_getSidebarFormOptions
//   extended with 5 more enum arrays. None of the 3 new write actions
//   generate/pass a clientRequestId, even though logRectificationEvent/
//   attachEvidence/logSecondaryDamage all already support it (verified
//   directly) — same Contract §13 reasoning vertical slice 1 already
//   established for the other two Commands (Sidebar's stable-connection
//   profile doesn't carry Mobile's flaky-connection motivation),
//   extended here to Commands that happen to already have the mechanism
//   rather than lack it. Double-submit is handled the same way slice 1's
//   two actions already handle it: submit buttons disable on click.
//
//   945: 3rd sub-tab (Correspondence, view-only) added alongside
//   Overview/Defects. renderDlpDefectDetail rewritten for the new
//   camelCase bundle shape (defect.itemId, not defect.ItemID — every
//   call site updated, cross-checked). 3 new sections on Defect Detail
//   (Rectification Events/Evidence/Secondary Damage), each a list of
//   existing records plus a collapsed-by-default <details> "Add" form
//   (reusing 945's own pre-existing details/summary styling — nothing
//   new needed). Evidence upload mirrors 948_MobileConsole.html's own
//   FileReader-to-base64 pattern exactly (same
//   reader.result.split(',')[1] approach), so the client-side half of
//   the upload path is proven against the one already confirmed working
//   real-device — the server-side half (attachEvidence's actual Drive
//   write) has no local test coverage, same limitation vertical slice 1
//   already had for Mobile's equivalent, and remains CC's to verify on a
//   real device.
//
// ─── Panel error-handling fix (applies to all 4 DLP panels, not just
// Overview) ─────────────────────────────────────────────────────────────
//   Root cause of the visible symptom, in 945 itself (found by tracing
//   the old code, not from the diagnostic): the old success handler
//   unconditionally hid Loading and showed the Content div BEFORE
//   checking res.success — so a business failure, or res arriving as
//   null/malformed, left the panel with neither a Loading message nor
//   rendered content: genuinely blank, matching CC's exact report.
//   Rewritten with 3 shared helpers (dlpSetPanelLoading_/
//   dlpSetPanelError_/dlpSetPanelContent_) that make loading/error/
//   content mutually exclusive and always visible, applied uniformly to
//   all 4 panels' load functions (Overview/List/Detail/Correspondence),
//   not just the one CC happened to hit — the same latent bug existed
//   in all of them, just hadn't manifested yet. Errors are rendered into
//   each panel's repurposed "…Loading" slot rather than its Content div,
//   so a static skeleton (the Defect List's <table>) is never destroyed
//   by an error the way overwriting Content's innerHTML would risk.
//   dlp_getSidebarCaseDashboard (947) also now JSON.stringify's its
//   result before crossing the google.script.run boundary, mirroring
//   dlp_getCaseOverview's already-established, already-proven fix for
//   the same GAS RPC serialization risk — applied here specifically
//   (not to every dlp_* wrapper reflexively) because this is the one
//   endpoint with real-device evidence of the problem, and it remains
//   the deepest/richest object crossing this boundary even after the
//   getCaseTimeline fix. 945's response handling (dlpParseResponse_)
//   transparently handles both stringified and plain-object responses,
//   so this doesn't create two different client-side code paths to
//   maintain.
//
// ─── Definition of Done ──────────────────────────────────────────────
//   ✓ Same 4 files as before (922/947/945/local_precheck_test_922.js) —
//   repo-wide diff against the untouched original upload confirms
//   exactly these 4 plus the governance files changed, nothing else;
//   901 specifically stayed untouched despite the crash fix touching
//   date-coercion logic (the new coerceIsoDateTimeForDisplay_ helper was
//   deliberately placed in 922, not 901, to preserve that line).
//   ✓ 918: 144/144 (unchanged). 922: 67/67 (62 from slice 2's own new
//   coverage + 5 new regression checks specifically reproducing the real
//   crash — a Date object directly poked into a mock sheet cell via
//   GasShim's FakeRange.setValues, confirmed to throw
//   TypeError: b.OccurredAt.localeCompare is not a function against a
//   temporarily-reverted copy of the fix, then confirmed clean against
//   the real fix — the regression test's own validity was checked, not
//   just assumed).
//   ✓ Full node -c clean, including 945's embedded script re-extracted
//   and checked after the splice.
//   ✓ Ad-hoc ACTIVE_DLP_CASE_ID smoke test (947, scratch-only, same
//   non-committed status as vertical slice 1's): extended to 29/29,
//   including a real end-to-end pass of dlp_getSidebarCaseDashboard's
//   full JSON.stringify round trip with the same Date-object corruption
//   scenario. Along the way this found and required fixing a genuine
//   implementation gap: dlp_attachDefectEvidence never forwarded
//   driveFileId (attachEvidence's own existing-file path), silently
//   making it unreachable through this wrapper — caught by the smoke
//   test, not by inspection, and fixed.
//   ✓ New testing technique discovered and used: PROPERTY_CONFIG is
//   declared with `var`, so its binding (not the frozen object itself)
//   can be repointed within a test's VM context to the test's own
//   caseId — lets ACTIVE_DLP_CASE_ID-dependent wrappers' happy paths be
//   exercised for real in tests, not just their error-propagation paths
//   the way vertical slice 1's smoke test was limited to.
//
// ─── Definition of Production-Ready — still N/A ────────────────────────
//   Vertical slice 1's write actions and Defect List/Detail are now
//   real-device confirmed working (CC, this session) — Overview was not,
//   until this fix, which itself has zero real-device confirmation yet.
//   Vertical slice 2, in its entirety, has zero real-device confirmation.
//   Nothing in this entry should be read as a readiness signal beyond
//   "local verification is clean."
//
// ─── Disposition ─────────────────────────────────────────────────────
//   Local layer DONE for both the Overview fix and vertical slice 2.
//   Real-device layer: NOT STARTED for slice 2 or the fix — CC's next
//   step. No STOP-point trigger fired (the diagnostic's proposed
//   architectural rework was evaluated and explicitly declined, not
//   silently implemented; the crash fix itself required no new Schema,
//   no 918 semantics change, no new business rule, no status-machine
//   change, no idempotency retrofit, and surfaced no Contract-vs-code
//   mismatch — it was a straightforward bug in 922 Projection-layer
//   code). The batch-1-untested/continue-to-batch-2 process tension was
//   flagged once (see Scope above), not repeated.
//
// ─── Next Steps ─────────────────────────────────────────────────────
//   1. CC deploys and tests: the Overview fix specifically, and vertical
//   slice 2 in full, on a real device.
//   2. If Overview still doesn't render correctly after this fix, the
//   next thing to check is whatever CC's real PropertyCaseTimeline sheet
//   actually contains for OccurredAt on existing rows (this fix handles
//   the Date-object case; a genuinely malformed/non-parseable string
//   would need separate investigation).
//   3. BL-7 can now close as IMPLEMENTATION COMPLETE (both vertical
//   slices) pending that real-device confirmation.
//   4. Phase 2 (Close Defect/Reopen Defect/Close Case) remains
//   unauthorized and undesigned, same as every prior entry has noted.
//
// ─── ADDENDUM (2026-09-01, later same day) ─────────────────────────────
//   CC performed real-device verification and reported no problems
//   ("真机验证了，已经没问题了") — CC's own words, a general confirmation,
//   not an itemized per-feature checklist, so recorded at that level of
//   specificity rather than assumed to mean every individual action
//   (Add Rectification Event, Evidence upload, Add Secondary Damage,
//   View Correspondence, the Overview fix specifically) was
//   independently exercised. This is the first real-device confirmation
//   for: the Overview fix itself, and all of vertical slice 2. Combined
//   with the earlier-in-this-session real-device confirmation of slice
//   1's List/Detail/both write actions, Sidebar DLP Tab Phase 1 (both
//   vertical slices) is now real-device confirmed as a whole, per CC.
//   "PRODUCTION-READY" in this project's specific sense (Contract §11's
//   kind of formal, itemized Gate — see REVIEW-002) has not been run for
//   this feature and is not being claimed here; this addendum records
//   CC's general confirmation only, not a formal certification.
//   00_Product_Backlog.js BL-7 and 00_File_Map.js updated accordingly.


// ═══════════════════════════════════════════════════════════════════════
// END OF 00_Review_History.js
// ═══════════════════════════════════════════════════════════════════════
