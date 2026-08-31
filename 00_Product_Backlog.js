/**
 * ═══════════════════════════════════════════════════════════════════════
 * PROPERTY OS — 00_Product_Backlog.js
 * Product Backlog（未来功能，非现在实现）
 * ═══════════════════════════════════════════════════════════════════════
 *
 * 原则：这里记的是"未来要做什么、大概怎么做"的设计草图，不是
 * Vertical Slice——足够详细到未来真的要做时不用从零重新想一遍，但
 * 不到需要 Review Approval 的正式程度。真正要实现时，仍然要走
 * 完整流程（视复杂度决定要不要完整 Vertical Slice，比照 ADR-P14
 * 之后的 MVP 精神，不是每个功能都要 12 节文件）。
 *
 * 加入这里的项目，不影响、不阻塞当前 Operator Console MVP 的开发
 * 进度（CC 明确指示）。
 *
 * 本文件不包含任何可执行逻辑，仅为治理文档。
 * ═══════════════════════════════════════════════════════════════════════
 */


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Phase 11 — Real DLP/Defect Data Onboarding Gap 收集说明
// （2026-08-22 新增，见 00_Project_State.js CHANGELOG 同日条目）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// CC 明确指示：Phase 11 真实资料 onboarding 过程中，如果发现——
//   - 某个字段不够
//   - 某个 workflow 不符合实际
//   - 某个 Defect 类型无法表达
//   - Evidence 关联方式不够好
//   - Repair Cycle 问题真正出现（Failed Verification → Developer
//     修复 → 再次 ClaimedCompleted）
// ——先记录为 Feedback/Gap，不要立即修改 Runtime。除非是真正的 data
// integrity/safety bug，否则先完成整个真实案件的资料 onboarding，
// 再一次集中做 Gap Review，比照 BL-1（Leasehold Lease Expiry）当初
// "Operator Console 实战使用后的回馈"的模式——先真正用过一轮，再决定
// 要不要改、怎么改，而不是每发现一个不顺手的地方就改一次 Schema。
//
// 这样做的理由（CC 原话）：「更好的方式是先把真实案件完整录进去，
// 把所有『不顺手』的地方收集起来。等你这个 Case 真正跑过一轮，再
// 一次性做 Gap Review。这样你最后得到的不是『看起来很完整的
// Defect OS』，而是一个真的经历过你这套 EST8 DLP 流程的 Defect OS。」
//
// Phase 11 期间发现的每一项 Gap，之后会以 BL-N 的格式加进本文件（比照
// BL-1/BL-2/BL-3 的既有写法：需求 + 设计草图 + 依赖），不是现在预先
// 猜测会有哪些 Gap 就写占位内容——目前是空的，正如实反映"onboarding
// 还没开始，还没有真实 Gap 可记"这个事实。


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BL-1 — Leasehold Lease Expiry（提出于 2026-07-29，Operator Console
// 实战使用后的回馈）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// 需求：Leasehold 类型的 Property，需要记录：
//   - Lease Expiry Year（租约到期年份）
//   - Remaining Lease Years（剩余年限）
//   两者可互相推算，UI 只需输入其中一个。
//
// 设计草图（比照本项目已有的 Derived State 原则——Overdue、Cashflow
// 加总都是查询时算，不预先存）：
//   - Truth 只存 LeaseExpiryYear（number，一个不会因时间流逝而过期
//     的固定事实）。
//   - RemainingLeaseYears 永远是查询/显示时用 (LeaseExpiryYear -
//     当前年份) 现算，不落库存成第二份可能跟 LeaseExpiryYear 兜不
//     起来的数字——如果两个都存，明年这个数字就该变但没人会去改它，
//     变成一个每年都要手动更新的欄位，也违反 ADR-P02（Property OS
//     不建 Trigger，没有排程机制可以自动更新它）。
//   - UI 层面：两个输入框都给，使用者填哪个都行，另一个即时算出来
//     显示（纯前端 JS 算，不需要呼叫後端）；实际送出時只送
//     LeaseExpiryYear 给 Command。
//   - Schema 影响：910_PropertyAssetEngine 的 Property 实体新增
//     LeaseExpiryYear 栏位（number，仅 FreeholdLeasehold='Leasehold'
//     时有意义，Freehold 留空）。Additive-only，不影响既有资料。
//
// 依赖：无（纯粹是 910 自己的 Schema 扩充）


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BL-2 — Property Insurance（提出于 2026-07-29）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// 需求：管理房产保险，至少记录 Insurance Company、Policy Number、
// Coverage Type、Coverage Amount、Premium、Renewal Date、Expiry
// Date。未来要能跟 Obligation Engine 整合，自动提醒续保。
//
// 设计草图：
//   - CC 提到"跟 Obligation Engine 整合、自动提醒续保"这句话本身
//     就点出了正确的架构方向：保险续保在本质上就是一笔"每年到期、
//     需要提醒、需要缴费"的 Obligation——OBLIGATION_CATEGORIES 里
//     已经有 'Insurance' 这个类别（900_PropertyConfig.js），Reminder
//     Offset、Overdue 判定、缴费记录这些 912/913 现成的机制，保险
//     续保完全用得上，不需要另外重造一套提醒/排程逻辑。
//   - 因此建议不是把 Insurance 做成完全独立的一套，而是：
//     (a) 一笔 Insurance Policy 对应一个 ObligationRule
//         (Category='Insurance', DueAnchor=Renewal Date)——续保提醒、
//         逾期判定、缴费记录，直接沿用 912/913，不重写。
//     (b) 新增一个独立的 PropertyInsurancePolicy 实体（新 Sheet），
//         只放 Obligation 既有 Schema 装不下的保险专属描述性资料：
//         InsuranceCompany、PolicyNumber、CoverageType、
//         CoverageAmount、ObligationID（FK，指向对应的
//         ObligationRule）。Premium/RenewalDate 已经就是
//         ObligationRule 的 Amount/DueAnchor，不重复存第二份。
//         ExpiryDate 单独存在这个新实体（跟 RenewalDate 通常不同一
//         天，续保跟保单到期是两个独立日期）。
//   - 这个设计沿用了 ADR-P01 的既有原则（Obligation Engine 是唯一
//     排程真相来源），没有为了 Insurance 这一个功能就开一个新的
//     排程/提醒机制——降低未来维护负担。
//
// 依赖：912_ObligationEngine（复用其 Category/Reminder/Overdue 机制）


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BL-3 — Management Information（提出于 2026-07-29）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// 需求：每个 Property 可记录 Management Company；电话号码支援多个，
// 每个可标记类型（OFFICE/MOBILE/WHATSAPP/EMERGENCY/OTHER）；未来
// 可扩充 Email/Office Address/Operating Hours/备注。
//
// 设计草图：
//   - "多个电话号码，每个有类型"这件事，Google Sheets 没有 array/
//     nested 栏位类型可用——比照本项目处理 Address 的方式（拆成
//     AddressLine1/2/City/State/... 六个平面栏位，而不是塞一个
//     JSON 字串进单一格子），电话号码也应该拆成独立的子表，一行
//     一个号码，而不是塞进一个 JSON blob——一致性考量：整个项目
//     目前没有任何地方把结构化资料塞进单一栏位当 JSON 存，這裡也
//     不该开先例，不然以后 Query/Migration 都要多处理一种资料形态。
//   - 具体：新增 PropertyManagementContact 实体（PropertyID FK，
//     ManagementCompany 名称，主要联络人等未来可能加的欄位）+
//     PropertyManagementPhone 子实体（ManagementContactID FK 或直接
//     PropertyID FK，PhoneNumber，PhoneType enum: OFFICE/MOBILE/
//     WHATSAPP/EMERGENCY/OTHER）——一对多，几个号码就几行。
//   - Email/Office Address/Operating Hours/备注：等真的要做时再加
//     栏位，Additive-only 不影响既有资料，不预先把 Schema 撑大（
//     Speculative Design 原则——CC 自己也说"后续也可扩充"，用词上
//     已经是"以后要就加"，不是"现在就要有"）。
//
// 依赖：910_PropertyAssetEngine（新增两个子实体，与 Property 关联）


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Backlog 项目通用注记
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// 三项都是 Additive-only 的 Schema 扩充或新实体，不改动现有
// Property/Obligation 的既有栏位或行为，实现时不需要 Migration 之外
// 的相容性处理。真正排入开发时，按 ADR-P14 的精神决定要用多重的
// 流程去做——如果只是加欄位（BL-1），可能不需要完整 Vertical
// Slice；如果是新实体+新 Command（BL-2/BL-3），仍建议至少走一次
// 精简版设计再动手，避免像 Operator Console 这样，实战后才发现
// 设计缺口（例如这次跨 execution 一致性的 bug）。


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BL-4 — 00_File_Map.js 完整 Manifest 重新核对（提出于 2026-08-26，
// Phase 11 Schema Migration 治理更新收尾时顺带发现）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// 背景：Phase 11 DefectItem Schema Migration 期间（ADR-P18、
// 00_Review_History.js REVIEW-004），00_File_Map.js 只补上了本次新增
// 的两个档案条目（两个 ONETIME_Phase11_*.js）。CHECKPOINT_2026-08-26_
// Phase11-SchemaMigration.md 已明确记录：manifest 里 947/948 那段既有
// 落差在本次 Migration 之前就存在，未被本次覆盖或核对。
//
// 任务（跟 BL-1/2/3 性质不同，不是"需求+设计草图"式的功能，是文件
// 核对）：找时间对整份 00_File_Map.js 逐一核对是否与真实档案状态一致，
// 特别是 947/948 那段。不涉及 Schema 或 Runtime 变更，纯粹是治理
// 文件本身的准确性 housekeeping。
//
// 依赖：无。CC 明确指示（2026-08-26）不要在 Phase 11 Pre-Import Gate
// 这次的治理更新里顺手处理，避免打开一个"全 Repository manifest
// audit"的大范围任务——与当前主线（Schema Migration → 真实 Defect
// 数据输入 → Dry Run → Real Import → 实战 Feedback）无关，等这条主线
// 告一段落后再集中处理。


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BL-5 — 三项 2026-08-26 BL-4 Housekeeping 期间发现、判定需要 CC
// 本人决定/操作、不该由 housekeeping 自行处理的事项
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// （1）ADR-P17 缺档：901_PropertySchema.js 注解、00_File_Map.js 的
// 2026-08-17 部署清单、ADR-P18/P19 的 Related ADRs，多处一致地把
// "ADR-P17"当成已存在、已批准的正式决定引用（内容：Property 新增
// DevelopmentName/UnitLabel 用 Additive 追加在 columns 最后，而非
// Reorder）。但 00_ADR_Log.js 逐条核对后，找不到 ADR-P17 自己的正式
// STATUS/CONTEXT/DECISION 条目——只有其他 ADR 提到它。这不是排版或
// 编号问题，而是要不要还原一段 Claude 没有亲身参与的历史决策内容，
// 属于 CC 判断范围。若 CC 想补，Claude 可以根据现有多处一致的
// 描述草拟一份忠于这些描述的 ADR-P17 条目，供 CC 核对/修改，而不是
// 自己直接定案写入正式 Log。
//
// （2）一批已确认死亡、需要 CC 自己在真实 repository 里清掉的孤立
// 档案：TestKit.js、runAllTests.js、900_Tests_Foundation.js、
// 912_Tests_ObligationEngine.js、919_Tests_ObligationIntegration.js、
// 999_Tests_PlatformVerification.js。详细证据见 00_File_Map.js §5b。
// 这次交付给 CC 的档案集里已经不包含它们，但 Claude 没有工具能直接
// 从 CC 自己的 repository / 真实 GAS 项目里删除档案，需要 CC 自己
// 操作（大概率只是本地/GitHub 端还留着旧档案，真实 GAS 项目本身
// 应该没有，因为 .claspignore 排除 Node-only 测试档案不推送）。
//
// （3）00_Project_State.js 页首"Current Version: v1.4.0-dlp-defect-
// engine-phase1-8"字串明显落后于实际进度（ADR-P18/P19、真实 Import、
// 真实 Consolidation migration 都已完成，不只是 Phase 1-8）。下一个
// 版本号怎么定（例如是否要反映到 Phase 11、要不要用语意化版本号）
// 属于 CC 的命名判断，Claude 不擅自决定写一个新版本号进去。
//
// 依赖：无——三项都是纯讨论/决定层级的事，不涉及 Runtime/Schema 变更
// 本身。均不阻塞 CC 目前的真实 DLP workflow 使用。


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BL-6 — 00_Review_History.js 缺 REVIEW-005（提出于 2026-08-30，Mobile
// Console 栏位显示强化收尾 Governance 记录期间发现）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// 发现经过：这次要为 Mobile Console itemId/subCategory/remark 栏位显示
// 强化写一笔新的 REVIEW 记录，选编号前先 grep 00_Review_History.js 核实
// 目前实际记录到哪——结果发现 00_ADR_Log.js（ADR-P19 CONSEQUENCES 段）、
// 00_Project_State.js（2026-08-26 CHANGELOG 条目）、00_File_Map.js
// （947/948 Status 段落 Next Steps）三处，都把"00_Review_History.js
// REVIEW-005"当成已经存在、可查阅的正式条目在引用——但
// 00_Review_History.js 里实际逐条核对，只有 REVIEW-001～004，没有
// REVIEW-005。
//
// 从这三处引用的描述拼出来，REVIEW-005 应该要包含：(a) ADR-P19
// OriginalReference→ItemID consolidation 的完整逐档案 impact
// analysis/verification（918 addDefectItem、ONETIME_Phase11_
// DefectImporter.js 的 dedup 逻辑与 staging schema、922
// enrichDefectForDisplay_ 输出栏位，三者的变更验证）；(b) 一份 Next
// Steps，记录 CC 决定两个 ONETIME migration 工具（Importer +
// SchemaReorderMigration）暂时都保留，等真实 onboarding 全部完成、确认
// 不再需要 rollback/rerun 后再议。
//
// 这跟 BL-5（1）的 ADR-P17 缺档不是同一种落差——ADR-P19 自己在
// 00_ADR_Log.js 里的条目、连同 900/901 的 schema 变更，都确实存在于这份
// repository；单单 00_Review_History.js 该有的 REVIEW-005 本身没写进去
// （或者写了但没有被包含在交付给 CC 的档案集里、CC 那边也没收到——两种
// 可能 Claude都无法从这份 repository 本身分辨）。
//
// 没有当场补写的原因：跟 ADR-P17 缺档同一个原则——这份 REVIEW 记的是
// "impact analysis 与 verification"，本质是对当时那次真实 Consolidation
// 工作的忠实记录，而 Claude 不是那次对话/那次真实操作的亲历者，手上没有
// 当时逐档案比对、逐项验证的第一手依据，现在补写等于是事后编一份看起来
// 像是当场写的记录，不诚实。
//
// CC 若想补：Claude 可以根据现有 repository 里 ADR-P19 变更后的实际代码
// （918/922/Importer 三处的 OriginalReference→ItemID 改动都还能直接读到、
// 直接核对）加上这三处引用描述的范围，草拟一份忠于"现在能查证到什么"的
// REVIEW-005 重建版本，明确标注是事后重建、不是当场记录，供 CC
// 核对/决定是否採用，而不是自己直接定案写入正式 Log。
//
// 依赖：无——纯文件缺口，不影响 Runtime，不阻塞 CC 目前的真实 DLP
// workflow 使用，也不阻塞本次（2026-08-30）Mobile Console 栏位显示
// 强化的 Governance 记录本身——本次改用 REVIEW-006，刻意跳过
// 005，把这个编号留给上述缺档，避免两份内容完全不相关的记录共用同一个
// 编号。


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BL-7 — Sidebar DLP Tab Phase 1（提出于 2026-08-31，设计已 CC 批准，
// 尚未开始实作）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// 状态：DESIGN APPROVED，IMPLEMENTATION NOT STARTED。这是一个真正的
// pending backlog 项目，不是完成记录——跟 BL-1～6 记录"发现的缺口/待办"
// 不完全一样，这笔记的是"设计定案、还没排进 Runtime"的实作工作本身。
//
// 范围：DlpSidebarTab_UIContract.md（独立文件，随本次交付给 CC，Claude
// 没有工具能直接把它加进 CC 自己的 repository——需要 CC 自己动作，跟
// BL-5(2) 那 6 个孤立档案同一种"Claude 只能交付档案、不能代替 CC 操作
// repository"限制）定案的 Phase 1：Defect List/Detail 查看、Update
// Developer Status、Record Owner Verification、Add Rectification
// Event、Add Evidence、Add Secondary Damage、Case 层级 Correspondence
// 查看。完整规格与所有决定见该文件 + 00_Review_History.js REVIEW-007 +
// 00_ADR_Log.js ADR-P20（947 统一 DLP glue 的架构决定）。
//
// 尚未做、需要之后另外授权才开始的：
// 922 新增 Sidebar 专属聚合函式（Defect + Rectification Events +
// Evidence + Secondary Damage，single-pass，明确不跟
// buildCaseOverviewForMobile_ 合并）、947 新增对应 dlp_* wrapper、945
// 新增 DLP tab + List/Detail 二层导航、enrichDefectForDisplay_ 补
// subCategory/remark。全部 0 行 Runtime 代码目前存在。
//
// Phase 2（明确不在这次 BL-7 范围内，本身也还没设计）：Close
// Defect、Reopen Defect、Close Case——见 Contract §15。
//
// 依赖：无 Runtime 依赖——纯粹是"设计完成，等 CC 下一次明确授权才
// coding"这件事本身需要一个 backlog 条目追踪，否则新窗口没有单一
// 入口知道这件事定案到哪、还没做什么。
