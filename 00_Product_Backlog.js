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
