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
// BL-7 — Sidebar DLP Tab Phase 1（提出于 2026-08-31，两个 vertical
// slice 均已实作，CC 真机验证通过）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// 状态：★ 2026-09-01（同日稍晚）更新——IMPLEMENTATION COMPLETE
// （本地层面）→ CC 真机验证通过（"真机验证了，已经没问题了"，CC 原话，
// 一般性确认，非逐项 checklist）。vertical slice 1（Case Overview /
// Defect List / Defect Detail / Update Developer Status / Record Owner
// Verification）与 vertical slice 2（Rectification Event / Evidence /
// Secondary Damage / Correspondence）均已实作、本地验证通过、且现在
// 已有 CC 的真机确认。注意：这不等同于本项目 REVIEW-002 那种正式、
// 逐项的 PRODUCTION-READY Gate（Contract §11 的 11 步验证）——那个
// Gate 没有跑过，这里记录的是 CC 的一般性确认，不是正式认证，两者
// 层级不同，见 00_Review_History.js REVIEW-009 Addendum。
//
// 之前的真机测试细节（slice 1 单独测过一轮，Overview 当时空白）：
// Defect List/Detail/两个写入动作全部正常，Case Overview 空白——已定位
// 根因（getCaseTimeline 排序对非字符串 OccurredAt 直接 throw）并修复，
// 同时对 dlp_getSidebarCaseDashboard 加了跟 dlp_getCaseOverview 同款的
// JSON.stringify 防御。这个修复连同 slice 2 全体，后续这轮真机测试已
// 一并确认无误。完整记录见 00_Review_History.js REVIEW-008（slice 1）+
// REVIEW-009（slice 2 + Overview 修复 + 真机确认 Addendum）。
//
// ★ 流程备注：CC 授权继续 slice 2 时，slice 1 其实还没试——这跟"先吸收
// slice 1 真实回馈再做 slice 2"这个当初讲好的节奏正好相反。Claude 当场
// 提醒过一次，判断 slice 2 大部分是新增/独立功能、被牵连改写的风险不高，
// 照 CC 指示继续做了。事后来看，正因为这样"没等 slice 1 回馈"，slice 2
// 的新增函式（enrichRectificationEventForDisplay_ 等）才主动补了
// slice 1 当时还没有的防御性日期处理——等于是把从 Overview 那次真机
// 回馈里学到的教训，提前套用到了还没测试过的新代码上，而不是真的完全没
// 从这次真机回馈里受益。
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
// 已实作（vertical slice 1，2026-08-31，★ 真机部分确认：List/Detail/
// 两个写入动作正常，Overview 原本空白已修复待复测）：922 的
// enrichDefectForDisplay_ 补 subCategory/remark；947 新增 6 个 dlp_*
// Sidebar wrapper（沿用既有 getDlpCaseDashboard/
// listDefectItemsForDashboard，未新增 922 聚合函式）；945 新增 DLP tab
// + Overview/Defects 子导航 + Detail 双动作表单。
//
// 已实作（vertical slice 2，2026-08-31/09-01，尚未真机验证）：922 新增
// buildDefectDetailForSidebar_（Contract §18 的 Detail-page 聚合函式，
// single-pass，明确不跟 buildCaseOverviewForMobile_ 合并）+ 4 个 enrich
// 函式；947 新增 4 个 dlp_* wrapper（dlp_addRectificationEvent/
// dlp_attachDefectEvidence/dlp_addSecondaryDamage/
// dlp_listSidebarCorrespondence），dlp_getSidebarDefectDetail 升级为
// 呼叫新聚合函式；945 新增 Correspondence 第 3 个子导航、Detail 页面
// 三个新区块（各自一个既有记录列表 + 一个 details/summary 收合式
// Add 表单）。
//
// Phase 2（明确不在这次 BL-7 范围内，本身也还没设计）：Close
// Defect、Reopen Defect、Close Case——见 Contract §15。
//
// 依赖：无 Runtime 依赖——纯粹是"vertical slice 1 已完成、vertical
// slice 2 等 CC 下一次明确授权才 coding"这件事本身需要一个 backlog
// 条目追踪，否则新窗口没有单一入口知道这件事定案到哪、做到哪、还没做
// 什么。


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BL-8 — listDefectItemsForCase 对不存在的 caseId 不 throw（发现于
// 2026-08-31，BL-7 vertical slice 1 实作过程中，记录不修）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// 现象：918_DefectEngine.js 的 listDefectItemsForCase(caseId) 只对
// DefectItem 表做 CaseID 过滤，从不检查这个 caseId 对应的 PropertyCase
// 是否真的存在——不存在的 caseId 会静默回传空阵列 []，而不是像
// getDlpCaseDashboard(caseId) 那样在同样情况下 throw
// DLP_CASE_NOT_FOUND。922_DashboardAdapter.js 的
// listDefectItemsForDashboard 直接沿用这个行为（未额外检查），947 新增
// 的 dlp_listSidebarDefects 也一样（纯 thin wrapper，忠实反映
// listDefectItemsForDashboard 的真实行为，未在 wrapper 层额外加检查）。
// 用 ad-hoc smoke test 直接验证确认，非推测——见
// 00_Review_History.js REVIEW-008 Findings。
//
// 影响：目前休眠、不影响实际运作——PROPERTY_CONFIG.ACTIVE_DLP_CASE_ID
// 是对的真实值。只有在这个值未来被错误改掉时才会体现：Case
// Overview（走 getDlpCaseDashboard）会正确报错，但 Defect List（走
// listDefectItemsForDashboard）会静默显示"没有 defect"，看起来像是
// Case 本身是空的，而非配置错误——两个本该反映同一件事的画面会给出不
// 一致的讯号。
//
// 设计草图（如果之后决定要修）：在 listDefectItemsForCase 或
// listDefectItemsForDashboard 里加一段 caseExists_(caseId) 检查（918
// 已有这个 helper，getDlpCaseDashboard 内部就是这样用的），不存在时
// throw 同一个 DLP_CASE_NOT_FOUND，让两个 Query 行为一致。这会是一次
// 918/922 的 Domain/Projection 层改动，不是单纯 947/945 UI 层可以处理
// 的事——照 Contract §14 的规矩，不在 Sidebar UI 工作的同一 session
// 里顺手改。
//
// 依赖：无——纯粹记录一个真实存在、目前休眠的行为不一致，等 CC 决定
// 要不要修、什么时候修。


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BL-9 — local_precheck_test_phase11_defectitem_reorder_migration.js
// 有个失效已久的断言（发现于 2026-08-31，BL-7 实作过程中顺带跑全套
// regression 时发现，与 Sidebar DLP 工作本身无关，记录不处理）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// 现象：这个测试文件对应 ONETIME_Phase11_DefectItemSchemaReorderMigration.js
// （较早的一次 schema 重排 migration），其中一条断言仍然预期
// OriginalReference 栏位存在，但 ADR-P19（2026-08-26 Schema
// Consolidation）已经把 OriginalReference 併入 ItemID、从 901 schema
// 里拿掉——这个测试没有跟着 ADR-P19 更新，变成一个针对已经不存在栏位的
// 过时断言。
//
// 已核实非本次改动造成：用一份干净的、未经任何本次改动的原始上传单独
// 解压跑同一个测试文件，产生完全相同的失败（同一行、同一段错误讯息）——
// 这次 Sidebar DLP Tab vertical slice 1 的改动完全没有碰过这个测试
// 文件或它对应的 migration 脚本。
//
// 影响：不影响 Phase 1 Sidebar DLP 工作，也不影响任何已 Production-
// Ready 的子系统——ONETIME_Phase11_DefectItemSchemaReorderMigration.js
// 本身早于 ADR-P19 的合併，跟 ONETIME_Phase11_
// DefectItemSchemaConsolidationMigration.js（后者的测试全数通过，
// 38/38）已经是被取代的关系。00_Product_Backlog.js 顶部"Phase 11 Gap
// 收集说明"段落已记录 CC 的既有决定：三个 ONETIME_Phase11_*.js
// 脚本保留不归档，等真实资料 onboarding 完全跑完、不再有 rollback/
// rerun 风险后再重新检视——这个失效断言可以留到那次检视一并处理，不需
// 要现在单独修。
//
// 依赖：无——纯粹记录一个跟本次 Sidebar 工作无关、但顺带核实过的既有
// 缺口，避免之后有人重新发现同一件事却以为是新问题。

// BL-10 — local_precheck_test_911.js 整个测试文件跑不起来（发现于
// 2026-09-01，CC 要求的全窗口重新核对过程中顺带跑全套 local_precheck_
// test_*.js 才发现，此前整个会话都没跑过这个文件，与 Sidebar DLP
// 工作本身无关，记录不处理，但跟新增的 Evidence 上传功能直接相关）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// 状态：★ 2026-09-04 更新——VERIFIED（真机手动验证，非本地自动化
// 测试）。CC 逐项跑过自订 checklist（A-I）：Sidebar 挑一个真实
// defect，刻意选用非预设的 EvidenceType/Phase（不是只测 default
// 值），上传一张真实照片，收到"Evidence uploaded"、Evidence 列表
// 立即刷出新纪录；到真实 Google Drive 的 Property OS Evidence /
// CASE-msxyfkpi-zu4j 资料夹核实档案确实存在、内容对得上；到
// Evidence sheet 核对新增那一行，DriveFileID 与 Drive 里的档案 ID
// 一致，其余栏位（CaseID/DefectID/EvidenceType/Phase 等）皆正确。
//
// 这条验证是逐项、非"CC 一般性确认"——跟 BL-7 状态更新里特别标注
// 的"一般性确认，非逐项 checklist"不是同一个层级，这次明确逐项
// 过了 checklist，包含刻意测非预设值这个原本担心会被漏测的边界
// 情况。
//
// 没有改变、仍然成立的部分：local_precheck_test_911.js 仍然无法
// 在本地跑（GasShim 依旧没有 mock PropertiesService/DriveApp），
// 这次验证走的是真机手动测试，不是补上自动化本地覆盖率——往后这
// 条路径如果被改动，仍然没有本地测试能抓回归，只能靠再一次真机
// 手动测试。
//
// 与 BL-11 的关系：BL-11（attachEvidence 里 Drive 写入成功、Sheet
// 写入失败这段没有 try/catch 保护）记的是失败路径，这次是成功
// 案例，两者互不影响——BL-11 原样维持 deferred，不因为这次验证
// 成功而关闭或改变判断。
//
// 现象：这个测试文件测的是 911_DocumentEngine.js 的 attachEvidence 真实
// 上传路径（base64Data → saveEvidenceFile_ → 真实 DriveApp/
// PropertiesService 呼叫）。跑起来直接整个 crash：
// ReferenceError: PropertiesService is not defined，出在
// getEvidenceRootFolder_ 里第一行呼叫 PropertiesService.
// getScriptProperties() 的地方——不是断言失败，是整个测试进程连跑都跑
// 不完，卡在 attachEvidence 真实上传这一条路径上。
//
// 已核实非本次改动造成：用一份干净的、未经任何本次改动的原始上传单独
// 解压跑同一个测试文件，产生完全相同的 crash（同一行、同一段错误堆疊）
// ——本次 Sidebar DLP Tab 两个 vertical slice 的改动完全没有碰过 911_
// DocumentEngine.js 或这个测试文件本身。
//
// 影响：GasShim 本地测试环境本来就没有 mock PropertiesService/DriveApp
// 这类原生 GAS 服务，这条既有的本地测试落差本来就存在——不是这次才
// 出现。但这次新增的 dlp_attachDefectEvidence（vertical slice 2）
// 依赖的正是这同一条 attachEvidence 真实上传路径，意味着这个新功能的
// 真实 Drive 写入这一段，在本地完全没有、也没办法有自动化测试覆盖——
// Claude 自己对 dlp_attachDefectEvidence 的验证走的是 driveFileId 已
// 存在这条捷径（证明 wrapper 逻辑本身没问题），并不等于验证过真实
// base64 上传这条路径。CC"真机验证了，已经没问题了"是否具体包含实际
// 上传过一个真实档案，本身也没有单独确认——见本次 checkpoint 文件
// 第 3 节。
//
// 依赖：无——纯粹记录一个跟本次 Sidebar 工作无关、但顺带核实过的既有
// 测试环境缺口，避免之后有人重新发现同一件事却以为是新问题，同时提醒
// Evidence 上传这一段的真实验证覆盖率比表面上看起来的低。


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BL-11 — attachEvidence() 里 Drive 写入与 Sheet 写入之间没有
// failure window 保护（发现于 2026-09-04，CC 要求为 BL-10 真机验证
// 先做 code-level readiness check、逐行核对 911_DocumentEngine.js
// 才发现，与本次 Sidebar DLP 工作或 Slice 1/2 改动本身无关，但直接
// 影响 BL-10 要验证的这条 Evidence 真实上传路径）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// 现象：attachEvidence(input) 在没有现成 driveFileId 时会先呼叫
// saveEvidenceFile_(...) 把档案真的写进 Drive、拿到新的 driveFileId，
// 紧接着呼叫 generateEvidenceId_() 产生 evidenceId、组出 evidence
// 物件，再呼叫 evidenceSheet_().appendRow(objectToRowArray_(evidence,
// ...)) 写进 Evidence 表——saveEvidenceFile_ 成功之后、appendRow 之前
// 这一段完全没有 try/catch。往下一段，Timeline entry 与 Event
// publish 失败时是有 try/catch 包住，而且明确呼叫
// logDocumentEnginePartialFailure_('attachEvidence', 'Evidence ' +
// evidenceId + ' row was written (and a new Drive file saved, if one
// was uploaded); Timeline/Event publish failed.', e)——代表写这段
// 代码的人已经想过、也处理了"sheet 行已经写、后续步骤失败"这个情境，
// 但没有对称地处理更早、"Drive 档案已经写、sheet 行还没写"这个情境。
// 如果 generateEvidenceId_()、objectToRowArray_() 或 appendRow()
// 本身在这段抛出例外，呼叫方会拿到一个例外，但 Drive 里已经真实
// 存在一个档案，Evidence 表完全没有对应行、连 EvidenceID 都不存在
// ——错误讯息完全不会提示"其实档案已经建了"这件事。
//
// 关联既有记录：911_DocumentEngine.js 整个 Sidebar DLP Tab 工作期间
// （Slice 1 + Slice 2）零改动，本次 checkpoint 的 Repository diff
// 已确认——不是本次改动引入的问题，是 attachEvidence() 一直以来的
// 既有行为。Mobile Console 既有的 dlp_attachEvidence（早于本次
// Sidebar DLP 工作、独立于 Slice 1/2）呼叫的正是同一个
// attachEvidence()，这个 gap 不是 Sidebar 独有。（跟 BL-9/BL-10
// 用干净原始上传另外跑测试比对的方法不同——这次是直接读本次上传
// zip 里的 911 原始码、对照 checkpoint 既有的 diff 结论得出，方法
// 不同，结论方向一致，如实记录方法差异。）
//
// 影响：机率低——appendRow() 本身很少失败，generateEvidenceId_()、
// objectToRowArray_() 都是纯函式，正常情况下不会抛例外，目前没有
// 任何已知案例真的撞上这个窗口。真撞上的后果：Drive 里留下一个
// 孤儿档案，不会自动清除，也没有任何 Evidence/Case/Defect 记录
// 指向它；使用者如果照错误讯息重试，可能造成同一份档案被传两次
// （一次孤儿+一次成功记录），需要人工去 Drive 核对才会发现。不
// 影响 Case/Defect 主数据完整性——只影响 Evidence 附件这一层，
// 而且只在 appendRow 这一步真的失败时才会触发。
//
// 设计草图（如果之后决定要修）：把 generateEvidenceId_() 到
// appendRow() 这段包进 try/catch，失败时比照下面 Timeline/Event
// 那段的写法呼叫 logDocumentEnginePartialFailure_，讯息里明确带出
// 已经写入 Drive 的 driveFileId，方便之后人工核对、清理孤儿档案，
// 而不是让呼叫方从错误讯息里完全看不出"其实档案已经建了"。这是
// 911_DocumentEngine.js 单一函式内部的改动，不涉及 Schema/Domain 层。
//
// 依赖：无——纯粹记录一个真实存在、目前从未被撞过的既有缺口，等
// CC 决定要不要修、什么时候修。


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BL-12 — Secondary Damage Contract Alignment（发现于 2026-09-04 的
// DLP Phase 1 Remaining Slice readiness检查，实作于同日）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// 现象：logSecondaryDamage（918）接受 8 个栏位，945 的 Add 表单只
// 收集其中 5 个——administrativeSubmissionRequired/dlpPrejudiceStatus/
// contractualBasis 这三个栏位既有的 Contract §9 把它们列为正常输入
// 的一部分，但 grep 过 Contract 全文跟 00_Review_History.js，都没有
// 找到"故意不做"的记录，不像 rectificationEventId 挑选器（Contract
// §9 明文说不需要）或 status 更新（Contract §9 明文说 not requested）
// 那样有明确交代。
//
// ⚠ 一个更正：上一轮 readiness report 曾经说 947_DlpConsoleServer.js
// 的 dlp_addSecondaryDamage 也没有转发这三个栏位——这是 Claude 那一
// 轮的读取/转写错误，不是 repository 真的这样。实作这轮重新对照原始
// zip 逐字核对过：947 其实一直都有转发全部四个栏位（含
// separateSubmissionId），只是 945 的表单从来没有收集、也没有送出
// 这些栏位，所以 947 收到的永远是 undefined，最后存成 false/空字串
// ——问题从头到尾只在 945 这一层，947 完全不用改。已经把这个更正
// 交代清楚给 CC，这里如实记录，不掩盖。
//
// 已实作：945_OperatorConsole.html 的 Add Secondary Damage 表单新增
// 三个栏位（checkbox + 两个 text input，沿用既有 ob_autoGenerate
// 的 checkbox 样式），submitDlpAddSecondaryDamage 的 input 物件加上
// 对应三行；读取视图补上 Contractual Basis 这一栏（
// administrativeSubmissionRequired/dlpPrejudiceStatus 原本就有显示）。
// 947/918/922/901 全部未改动——四层都已经支援这三个栏位，只差 945
// 这一层没接上。
//
// 本地验证：抽出 945 的 <script> 区块跑 node --check，语法通过；
// diff 对照 Phase A 版本确认改动范围精确落在 SecondaryDamage 这一段；
// local_precheck_test_918.js 的 Phase 7 区块新增三个断言，直接呼叫
// logSecondaryDamage 传入这三个栏位的非默认值，跑过——147 项全部
// 通过（原本 144 项 + 新增 3 项），过程中新增的测试一度让既有的
// "listSecondaryDamageForCase returns both"断言失败（因为新记录用了
// 共用的 caseId，把该 Case 底下的笔数从 2 笔变 3 笔）——改成用同一
// 测试区块里既有的 otherCase 变量后修好，147 项全部通过，如实记录
// 这个过程，不是一次就对。947 层本身没有本地测试可跑（跟其他所有
// dlp_* wrapper一样，没有 local_precheck_test_947.js），这轮也没
// 新增——947 完全没改动，没有新代码需要测。
//
// 真机验证：还没做，没有 CC 真实专案的写入权限。需要 CC 确认：新增
// 一笔 Secondary Damage，三个新栏位都填，确认存进 Sheet 的值正确、
// 读取视图正确显示三者（含新加的 Contractual Basis 栏位）。
//
// 依赖：无——947/918/922/901 全部不用改，纯粹是 945 这一层补齐。
