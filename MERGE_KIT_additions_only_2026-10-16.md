# 合并清单：只含新增块（2026-10-16）

**为什么需要它**：`governance_updated/` 里的四个文件是以**旧的基础**（ZIP / 我之前的输出副本）为底生成的。项目记忆显示真实仓库更新——
真实 Review History 已有 REVIEW-011（BL-21 审核）和 REVIEW-010 的 BL-2 追记，真实 Project State 有 2026-10-01 的**原始**批准条目。
所以**不要用这四个文件整份覆盖真实文件**。请把下面的新增块按"位置"逐段合并进真实文件，并先核对编号有没有冲突（ADR-P27–P32、REVIEW-012、BL-22–BL-30 都是暂定编号）。

合并规则：
- 以真实文件为准；这里的块只增不删。
- 重建的 2026-10-01 条目（在 Project State 里，不在下面的新增块里）**不要**合并——真实仓库有原始条目。
- REVIEW-010 的 2026-10-07 追记（D-912-F01）在 root 的 `00_Review_History.js` 里，不在下面的新增块里；它需要合并为真实 REVIEW-010 追记之后的另一条追记。
- 每个块合并完成后，重新核对：语法检查、新增行数、编号没有重复。

## 00_ADR_Log.js（基础：ZIP 的 ADR Log）

### 块 1（217 行）— 文件末尾追加

```text
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADR-P27 — Insurance Policy 变更属于既有 Obligation event boundary（D-912-F01 Choice A）
// STATUS: DECIDED by CC (2026-10-06) — IMPLEMENTATION NOT AUTHORIZED
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// 编号说明：ADR-P27–P32 为 2026-10-16 的 checkpoint 持久化所新增。编号依据上传 ZIP 里的 ADR Log
// （最后一条 ADR-P26，已核对不存在 P27–P32）。权威 ADR Log 副本未确认（见 ADR-P32）——合并前请先
// 确认没有同号冲突，必要时顺延重编号并同步交叉引用。
// 另：项目记忆显示真实仓库比 ZIP 新（真实 Review History 已有 REVIEW-011，真实 Project State 有 2026-10-01 的原始批准条目）。
// 本文件以 ZIP 为基础，只能以'合并新增块'的方式使用，不能整份覆盖真实文件。
//
// CONTEXT:
//   - 912 Insurance Static Audit（2026-10-05，REVIEW-012）F-01：createInsurancePolicy /
//     renewInsurancePolicy 直接写 PropertyInsurancePolicies；912 第 921–1121 行没有任何
//     publishPropertyEvent_ 调用。
//   - Constitution P1：Truth Layer 变更必须经过 EventBus，不存在捷径写入。
//   - REVIEW-010 条件 4（CC）："沿用既有 Obligation event，没有新增 Policy 专属 event"。有两种读法：
//     (i) 不新增 Policy 专属 event vocabulary；(ii) Policy 变更不需要 event。
//   - 既有 OBLIGATION_CREATED / OBLIGATION_UPDATED 只在 Obligation 本身被创建或更新时发出，
//     不会因 Policy 变更自动发生。
//
// DECISION（CC，2026-10-06，Choice A — Existing Obligation Event）：
//   PropertyInsurancePolicy 的 create / renew 属于既有 Obligation event boundary，必须遵守 P1 的
//   Truth Layer EventBus 要求。条件 4 应解释为"不建立独立的 Insurance Policy event vocabulary"
//   （不新增 INSURANCE_POLICY_CREATED / INSURANCE_POLICY_UPDATED），并不表示 Policy 的 Truth Layer
//   mutation 可以绕过 EventBus。当前 912 的 createInsurancePolicy / renewInsurancePolicy 不能作为
//   无 event 的 Truth Layer mutation 长期保留。具体用哪个既有 event、payload、顺序、失败语义、
//   幂等、测试，留给独立的 "912 F-01 Implementation Authorization"。
//
// CONSEQUENCES:
//   - F-01 保持为 implementation gap（审计结果 FAIL 不改写成 PASS），直到实作并通过验证。
//   - 没有任何代码改动被授权；912 F-01 实作授权单（决策 A–H）尚未作答 → NOT GRANTED。
//   - 事件语义的后续决定见 ADR-P28；基础设施问题（publishPropertyEvent_ 为 LOGGING ONLY）见
//     ADR-P30（PENDING）。
//   - 本决定不重新打开 2026-10-01 追溯批准工作项（CLOSED）。
//
// ALTERNATIVES CONSIDERED（呈给 CC 的选项，不代表 assistant 偏好）：
//   Choice A — Existing Obligation Event（采用）。
//   Choice B — 明确的 P1 例外（需写明范围、理由、是否更新 Constitution/ADR）。未采用。
//   Choice C — 治理解释需修订，暂缓实作。未采用。
//
// Related: Constitution P1；ADR-P01、P06、P07、P12、P13；REVIEW-010（含 2026-10-07 追记）；
//   ADR-P28；ADR-P30。

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADR-P28 — Insurance Policy create/renew 的 event 语义（D-912-F01 后续决定）
// STATUS: DECIDED by CC (记录日 2026-10-07) — IMPLEMENTATION NOT AUTHORIZED；OPEN POINTS PENDING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// DECISION（CC：Option A — YES）：
//   OBLIGATION_UPDATED 可以代表 Obligation aggregate / 其拥有的领域状态的变更，包括其 Insurance
//   Policy 卫星 entity，即使没有任何 ObligationRule 栏位改变。
//   A1 = ②  OBLIGATION_UPDATED 表示"Obligation aggregate / 其拥有的领域状态发生变更"，不限于直接的
//           ObligationRule 栏位变更。
//   A2 = YES  为既有 Insurance Obligation 建立 PropertyInsurancePolicy 时发出一个 OBLIGATION_UPDATED。
//   A3 = YES  续保在两次 Truth 写入都完成后（旧 → Superseded，新 → Active）发出一个
//           OBLIGATION_UPDATED；两次 sheet 写入不是两个独立的 domain event。
//   A4 = B   changedFields 仍保留给 ObligationRule 栏位变更；Policy 变更由另一个概念性 payload 区块
//           policyChange 表达。
//   A5     create → policyId、mutationType；renew → policyId、previousPolicyId、mutationType。
//   A6 = YES  mutationType 的概念值：POLICY_CREATED / POLICY_RENEWED。
//   A7     仅涉及 Policy 的 OBLIGATION_UPDATED 不得被当作普通 ObligationRule 栏位更新；未来的消费者
//           必须能识别并忽略 / 另行处理（913 / 922 / 930 本次未改）。
//   P3 = CONDITIONAL  Policy 专属 payload 只授权给本次 Insurance Policy create/renew mutation；
//           不是对所有 OBLIGATION_UPDATED payload 的一般性扩展许可。
//   C2     create 与 renew 同用 OBLIGATION_UPDATED，以 mutationType 区分。
//   O1     先 Truth，后 Event；event 不得先于 Truth 变更。
//   F1     Truth 已写入、event 发布失败 → Truth 保留；视为 partial failure；操作回报失败；以既有
//           logPartialFailure_() 风格为参考。
//   I1     F-01 实作范围仅限 event boundary；F-03、F-04 维持 Deferred。
//
// OPEN POINTS（尚未决定，不得当作已批准）：
//   1. Policy-only 更新时 changedFields 放什么值（903:80、142 要求该栏位存在且非 null；决定只说
//      它保持 Rule 导向）。
//   2. 消费者靠什么辨识 Policy-only 更新（policyChange 是否存在 / mutationType）。
//   3. 与终态 Obligation 的交互：updateObligation 对 Cancelled/Completed 抛 OBLIGATION_IMMUTABLE
//      （912:449–454），Policy create/renew 没有状态检查（审计 F-07，Deferred）。
//   4. 文件同步：Vertical Slice §4 第 125 行的 OBLIGATION_UPDATED 契约；912:921–933 的注释；是否需要
//      更新 Constitution / ADR。
//   5. publishPropertyEvent_ 仍是 LOGGING ONLY，是否足够 → ADR-P30（PENDING）。
//   6. 912 F-01 实作授权单（决策 A–H）尚未作答。
//
// CONSEQUENCES：没有代码、测试或治理文件之外的改动被授权。Review History REVIEW-010 的 2026-10-07 追记
//   记录了同一份决定（在输出副本中）。F-02 至 F-10 维持 Deferred。
//
// ALTERNATIVES CONSIDERED（呈给 CC 的选项）：Option A（采用）/ Option B（OBLIGATION_UPDATED 严格限于
//   Rule 栏位，需另立治理决定）；A4：A 扩展 changedFields / B 另加 policyChange（采用）/ C 其他；
//   P1 YES / P2 NO / P3 CONDITIONAL（采用）；C1 / C2（采用）/ C3；O1（采用）/ O2；F1（采用）/ F2 / F3；
//   I1（采用）/ I2 / I3 / I4。
//
// Related: ADR-P27；ADR-P06；ADR-P13；903 PROPERTY_EVENT_REQUIRED_FIELDS；Vertical Slice §4；REVIEW-010。

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADR-P29 — Operator Console RPC 边界：回传给浏览器的值必须是 browser-safe（Date 序列化）
// STATUS: (a) DECIDED/AUTHORIZED by CC — 仅 console_listProperties；已实作；真实环境仅有用户口头回报
//         (b) 一般性规则 PROPOSED — NOT APPROVED；其他端点 NOT AUTHORIZED for remediation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// CONTEXT:
//   - 2026-10-13 用户回报：Add Bill 的 Property 下拉是空的。部署 945（d1bf51ed…）后显示 "The server
//     returned no data (its result may contain values the browser cannot receive)"，即
//     google.script.run 把 null 交给了 success handler。
//   - 根因（高信心，未直接确认）：listActiveProperties() 回传原始 getValues()（910:191–195），Properties
//     里有被 Sheets 存成真日期的格子；GAS 无法把 Date 传给浏览器，整个回传值变成 null。901:513 只在表由
//     脚本新建时把日期列设为纯文本；901 的注释（约 740–744）与 922:240–249 记载过同类真机问题。
//     具体哪一格是真日期：未确认（Drive 导出只显示格式化文字；probe() 只读函式曾提供给用户，未回报）。
//   - 登记表只读核对（Drive）：Est8 Seputeh 记录存在（PropertyID PROP-mshs0wca-skrq，Status 恰为
//     'Active'，UnitLabel 'A-19-11'；表头与 901 的 Property schema 完全一致）。
//
// DECISION (a)：946 console_listProperties 对每一行套用 console_browserSafeRow_：Date → 文字（日期列
//   'yyyy-MM-dd'，经 coerceToIsoDateString_；...At 列 ISO 时刻，经 toIsoDateTime_），其余值原样；不改
//   910 / 912 / 900 / 901，不改 schema，不改数据。授权：CC 的"继续"，以及之后的授权文件称其为
//   "the authorized 946 fix" 并要求部署。如实记录：assistant 先前建议的修复位置是 910
//   listActiveProperties，实际实作在 946（适配层）。
//   实作与验证状态：946 SHA-256 e993b71baed38686…（ZIP 原版 b40d2a40444b43aa…）；隔离环境测试
//   15/15；补丁复核 PASS；用户回报部署后 Add Bill 下拉显示 Est8 Seputeh（选项是否带 "· A-19-11"
//   未确认）。
//
// PROPOSED (b)（NOT APPROVED）：凡返回原始表格值的 console_* / dlp_* 读取接口，应在 wrapper 边界把
//   Date 转成文字（或沿用 947 的 JSON.stringify 模式）。隔离环境模拟显示可能把 Date 带到浏览器的端点：
//   console_getActiveInsurancePolicyForObligation、console_listInsurancePolicyHistoryForObligation（946）、
//   dlp_listSidebarDefects、dlp_getSidebarDefectDetail（922 DTO 原样传出 submittedAt / closedDate）。
//   CC 明确指示：这些端点没有观察到症状，不授权修复，不做推测性修补，不得修改。
//
// CONSEQUENCES：Billing 的 Property 选择不再因真日期格子而失败；其余端点的风险保持"未证实"，记入
//   Project State TECH DEBT #12 与 BL-27。补丁依赖已部署的 901 含 coerceToIsoDateString_ 与
//   toIsoDateTime_（缺失时会得到可见错误，而不是 null）。
//
// ALTERNATIVES CONSIDERED：修在 910 listActiveProperties（引擎层，未采用）；沿用 947 的 JSON.stringify
//   模式（需改客户端，未采用）；把日期列重设为纯文本（改动真实数据，未授权）。
//
// Related: 922:240–249；947:191–216；901 ensureSheetSchema_ / coerceToIsoDateString_；REVIEW-012。

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADR-P30 — EventBus 基础设施与 P1 的解释（publishPropertyEvent_ 为 LOGGING ONLY）
// STATUS: PENDING — Decision Gate 已完成；没有选择任何选项（A/B/C/D）；决策单尚未作答
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// CONTEXT（2026-10-13/14 只读调查；对当前源码重新核实）：
//   - publishPropertyEvent_()（903:180–190）：buildPropertyEvent_ 校验并构造信封，然后 Logger.log，
//     返回信封。没有持久化、没有分发、没有订阅（全仓库无 subscribe/dispatch/handle*Event* 函式；
//     910/911/912/913/918 共 30 行调用同一个 adapter）。分类：LOGGING ONLY。
//   - ADR-P07 与 ADR-P12 批准 Logger 占位（"Infrastructure 可以 Placeholder，Architecture 不允许
//     Placeholder"）；Project State TECH DEBT 称其为刻意的架构决定；903 档头同。
//   - 文字漂移：Constitution:264、ADR-P04:145、Vertical Slice:258/292 仍按"有持久化事件日志"描述；
//     Constitution:364–375（2026-08-17 订正）说明目前没有，真正的 Audit Trail 靠 ObligationHistory 与
//     PropertyCaseTimeline 两张 append-only 域内表。P1 本身没有定义 EventBus、持久化、分发或重试。
//   - 跨 OS 的 Shared EventBus：包内与上传中没有任何接口契约、调用方式或失败语义的证据（UNVERIFIED）；
//     FinanceEngine_VerticalSlice.md 有订阅的设计文字，914 没有代码。
//
// PENDING DECISIONS（CC，均未作答；每题都可选 UNSPECIFIED / DEFER）：
//   Q1 P1 解释：(a) 经 adapter 边界即满足 (b) 要求持久事件记录 (c) 要求记录加分发 (d) DEFER
//   Q2 对当前占位的态度：(a) 继续接受 (b) 接受但设条件或期限 (c) 不再接受 (d) DEFER
//   Q3 审计轨迹的现行定义：(a) 以 Constitution 364–375 的订正为准 (b) 以持久事件日志为准 (c) DEFER
//   Q4 项目内自建持久化是否允许：(a) 允许作为 adapter 内部实作 (b) 不允许，等 Shared EventBus (c) DEFER
//   Q5 F-01 与基础设施：(a) 不依赖 (b) 须先完成所选方案 (c) 有条件的窄例外 (d) DEFER
//   Q6 文件同步（Constitution / ADR-P04 / ADR-P07 / ADR-P12 / Vertical Slice / Project State）：逐项 Y/N/DEFER
//   Q7 实作授权：NOT GRANTED，除非 CC 另行明确授权。
//   继续 912 F-01 最少只需要 Q1、Q2、Q5；Q3、Q4、Q6 在选 B/C/D 时才需要。
//
// OPTIONS（尚未选择，只记录）：A 保留 Logger 占位；B 只增不改的持久事件记录；C 持久记录加分发；
//   D 先修订治理契约再决定。各选项的影响与风险见 REVIEW-012（c）。
//
// CC DIRECTION（2026-10）：Billing 为当前最高优先级；EventBus Decision Gate 不得阻塞 Billing，除非
//   Billing 写入路径出现真实依赖——届时记录确切依赖并停止该部分，不得绕过既有写入边界。
//
// CONSEQUENCES：在 CC 作答之前，912 F-01 实作授权保持 NOT GRANTED；不得代 CC 选择选项。
//
// Related: Constitution P1；ADR-P04、P06、P07、P12、P13；ADR-P27、P28；REVIEW-012。

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADR-P31 — Operator Console UI 逻辑以 Node vm + 手写假 DOM 做隔离测试
// STATUS: DECIDED（CC 授权）— 测试文件尚未并入仓库，File Map 尚未同步
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// CONTEXT：945 的逻辑在单一内联 <script> 里，函式是全局的；仓库没有 DOM 测试方式；沙盒没有 jsdom，授权
//   不允许新增依赖或框架。
//
// DECISION：沿用 local_precheck_test_*.js 的做法，写一个自带约 60 行假 DOM 的测试文件
//   local_precheck_test_945_addBill_ui.js（读取 945_OperatorConsole.html 的内联脚本，用 Node vm 执行，
//   mock google.script.run）。不新增共享模块或框架。check() 失败会使整个测试失败；knownDefect() 记录
//   当前 945 的已知缺陷，不使测试失败，缺陷修复后会提示改为 check()。
//   结果（对当前 945，d1bf51ed…）：52 通过、0 失败、4 项已知缺陷；对 ZIP 原版 945：33 通过、19 失败；
//   9 种变异检查全部被抓到。同批新增：local_precheck_test_946_listProperties.js（15 项）、
//   local_precheck_test_946_createObligation.js（52 项）。
//
// LIMITS（必须保留）：这不是浏览器、不是 HtmlService、不是 GAS，也不是生产验证。版面/CSS、真实事件、
//   disabled 按钮的点击拦截（连点保护）、toast 计时、HtmlService 沙箱都没有被模拟；loadDashboard 与
//   renderPropertiesList 在测试中被替身取代。
//
// CONSEQUENCES：三份新测试目前只是输出副本；采用进仓库与 File Map 同步待 CC 授权（BL-29）。4 项已知
//   缺陷对应 BL-23，修复尚未授权。
//
// ALTERNATIVES CONSIDERED：jsdom（不可用，且禁止新依赖）；抽出纯函式测试（需改 runtime，未授权）；
//   只靠真实浏览器验证（保留为必要的最终验证，不是替代）。
//
// Related: ADR-P29；BL-22；BL-23；BL-29。

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADR-P32 — 来源权威性：不指定权威副本，不合并 945 / 946 基线
// STATUS: DECIDED（CC）— 现行限制；只有在 Billing 稳定、且另有明确授权后才可重新考虑
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// DECISION（CC）：
//   - 上传的 ZIP、outputs 副本、任何本地修改过的副本，都不是已确认的权威来源；已部署的 GAS 源码无法
//     从本环境直接检查。不得因"哈希与 ZIP 一致"就把它当作权威基线。
//   - 未授权建立 945 / 946 的合并基线或权威副本：不得合并、打包、同步，或指定任何版本为权威；
//     不得创建 ZIP 或基线快照。
//   - 修改只产出独立的输出副本，由用户自行应用；不得同步到 GAS / GitHub / 生产。
//   - 每次工作必须记录来源与哈希；验证声明必须标明证据等级（静态 / Node 模拟 / GAS / 浏览器 / 手机 /
//     生产），未执行的一律标 NOT RUN / PENDING。
//
// CONSEQUENCES：新窗口先核对哈希，再使用任何文件；不得假设输出副本已被部署，也不得假设 ZIP 是最新
//   （ZIP 的最新 CHANGELOG 是 2026-09-20；之后的其他窗口可能已有变化）。
//
// Related: ADR-P27–P31；REVIEW-012；CHECKPOINT_2026-10-16_PropertyOS-Billing-EventBus-Handoff.md。

```

## 00_Product_Backlog.js（基础：ZIP 的 Backlog）

### 块 1（105 行）— 文件末尾追加

```text
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BL-22 至 BL-30 的编号说明（2026-10-16）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// 编号为暂定：依据上传 ZIP 的 Backlog（最后是 BL-21）。真实仓库可能已用到这些编号（ZIP 比真实仓库旧）；合并前先核对，必要时顺延。
// 只能以'合并新增块'的方式使用，不能整份覆盖真实 Backlog。
//

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BL-22 — Billing UI Slice S2：Operator Console 的 Property 标签 / 空状态 / 成功反馈
// 状态：IMPLEMENTED（输出副本）— 隔离环境测试通过 — 真实环境验证 PENDING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// 授权：CC 授权 S2（只改 945 与直接相关的测试）。复用既有 Add Bill / Pay 流程与既有 Billing API，不改 schema。
// 内容：B1 下拉标签 "PropertyName · UnitLabel"（option value 仍是 PropertyID；UnitLabel 为空时只显示名称）；
//   B2 无 Property / 加载中 / 加载失败 / 空响应是四种不同状态；B3 保存成功提示显示 Obligation ID 与首个到期日
//   （rule.DueAnchor，首个 Occurrence 的 EffectiveDue 同值，912:386）；loadProperties 对 null 响应的保护。
// 证据：945 d1bf51ed…（ZIP 原版 98b6e98d…）；Node vm + 假 DOM 测试 52 通过 / 4 项已知缺陷；变异检查 9/9；
//   946 的配套修复见 ADR-P29(a)。真实环境：用户观察到 945 的空响应提示，并回报 946 部署后下拉显示 Est8；
//   其余（标签是否带 "· A-19-11"、失败测试、真实保存、三张表核对）NOT VERIFIED。
// 待办：按 Billing_Real_Environment_Checklist.md v2 做真实验证。

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BL-23 — 945 Add Bill 保存回调的 null / 空响应保护
// 状态：PROPOSED — NOT AUTHORIZED
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// 问题（隔离测试的 4 项已知缺陷）：保存收到 null → 回调抛 TypeError，Save 按钮保持禁用且没有提示；保险第二步
// 收到 null → 没有提示；失败结果缺 error 文字 → toast 显示字面的 "undefined"。当前后端返回的对象可序列化，
// 触发可能性低。
// 最小方案（只改 945，约 6 行）：三处回调开头加 if (!res) 分支（恢复按钮并提示"先检查 ObligationRules 再重试"），
// 并把 showToast(res.error, true) 改为 showToast(res.error || 'Save failed.', true)。需要 CC 单独授权。

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BL-24 — 912 createObligation 的部分失败日志（Rule→Occurrence、Occurrence→History 两个边缘）
// 状态：PROPOSED — NOT AUTHORIZED
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// 问题（隔离环境模拟，非真实 GAS 观察）：Rule 写入后 Occurrence 失败 → 孤儿 Rule（1/0/0 行，无日志）；Occurrence
// 写入后 History 失败 → 缺创建历史行（1/1/0，无日志）；event 发布失败 → 三者都写入但界面报失败（有日志）。
// 重试都会产生重复或孤儿，clientRequestId 也不能防（结果只在成功后缓存，912:423；UI 本来也不发）。
// 912:387–393 的注释写"见 Project State TECH DEBT"，本 ZIP 里没有对应条目——已补为 TECH DEBT #10。
// 最小方案：把期次创建与历史追加包进 try/catch，调用 logPartialFailure_ 后重新抛出（与 event 那一步一致）。
// 只让失败"大声"，不会变原子，也不防重复。需要 CC 单独授权（改动 912）。

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BL-25 — 912 F-01：Insurance Policy create/renew 发布 OBLIGATION_UPDATED
// 状态：DECISION MADE（ADR-P27、ADR-P28）— IMPLEMENTATION AUTHORIZATION NOT GRANTED
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// 语义已由 CC 决定；实作授权单（决策 A–H：changedFields、消费者、终态 Obligation、publishPropertyEvent_/P1、失败语义、
// 幂等、代码范围、测试范围）尚未作答。F-03、F-04 维持 Deferred。依赖：ADR-P28 的 OPEN POINTS；ADR-P30 的 Q1、Q2、Q5。
// 在 CC 作答之前不得实作。

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BL-26 — EventBus / P1 基础设施决策
// 状态：PENDING DECISION（ADR-P30）— 没有选择任何选项
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// publishPropertyEvent_ 为 LOGGING ONLY；P1 解释 AMBIGUOUS；Constitution 264 / ADR-P04:145 / Vertical Slice 258、292
// 与 Constitution 364–375 的订正之间有文字漂移。决策单 Q1–Q7 未作答；Option A–D 未选。CC 指示：不阻塞 Billing。

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BL-27 — Date 序列化边界：未证实的风险端点
// 状态：UNCONFIRMED RISK — NOT AUTHORIZED（CC 明确不授权修复，不做推测性修补）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// console_getActiveInsurancePolicyForObligation、console_listInsurancePolicyHistoryForObligation（946）、
// dlp_listSidebarDefects、dlp_getSidebarDefectDetail（922 DTO 原样传出 submittedAt / closedDate）。隔离环境模拟显示
// 格子为真日期时 Date 会带到响应；没有观察到真实症状。诊断办法：只读 probe() 看哪些列是真日期。ADR-P29(b) 为 PROPOSED。

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BL-28 — Billing 数据模型与周边（均需单独授权；S5 需 schema 决定）
// 状态：PROPOSED — NOT AUTHORIZED
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// - 没有地方记录：账期、开单日、账单编号、备注、账单图片（S5，需 schema 变更）。
// - 付款凭证 evidence 已被 recordPayment 支持，但 946 wrapper 只传 note、UI 传空字符串（S3）。
// - 一步式"新增并标记已付"（S4）：两次连续写入，需先决定部分失败的处理。
// - 币种：代码配置 DEFAULT_CURRENCY = 'MYR'（900:44），UI 不发送币种；治理文件只定义 Money = {amount, currency}，
//   没有写 MYR → 治理层面 UNSPECIFIED，待 CC 决定是否写入 Business Rules。
// - 观察到、未确认：Pay 表单默认日期取 UTC 日期（945:760），马来西亚时间 0–8 点可能是前一天。
// - 金额不四舍五入（42.555 原样存储）；规则金额是预计金额，下个月期次仍预填该金额。

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BL-29 — 本窗口新增测试的采用与 File Map 同步；遗留 Node 沙箱测试的处理
// 状态：PENDING — 需要 CC 授权
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// 新增（目前只是输出副本）：local_precheck_test_946_listProperties.js、local_precheck_test_946_createObligation.js、
// local_precheck_test_945_addBill_ui.js（ADR-P31）。采用进仓库时需同步 File Map。
// ZIP 内另有遗留的 Node 沙箱测试（900/912/919/999 + runAllTests.js + TestKit.js），与 Project State TECH DEBT #5
// （Node 沙箱已移除）不符；在重建的目录布局中跑 67/101（shim 文件清单缺 910，propertyExists_ 未定义）。
// 它们是否应保留，待 CC 确认。

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BL-30 — 912 Insurance Static Audit 其余发现（F-02 至 F-10）
// 状态：DEFERRED（CC 明确）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// F-02 945 保单面板把 console_wrap_ 信封当成保单本身（High，静态推导，未在浏览器验证）；F-03 renew 重试重复；
// F-04 renew 两步写入无部分失败日志；F-05 日期只验非空；F-06 保单面板 innerHTML 未转义；F-07 Obligation 取消或改类别后
// Policy 的行为未定义；F-08 状态字面值 vs 配置枚举；F-09 文件漂移（920_InsuranceEngine 命名、ERD、sheet 名、
// "seven Command functions" 注释）；F-10 没有 Policy 函式的测试。详见 REVIEW-012。

```

## 00_Review_History.js（基础：root 的 00_Review_History.js（含 REVIEW-010 的 2026-10-07 追记））

### 块 1（67 行）— 文件末尾追加

```text
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REVIEW-012 — 本窗口审计与分析汇总（912 Insurance Static Audit / F-01 Phase 1 / EventBus Decision Gate / Billing）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// 编号说明：REVIEW-012 为暂定编号。项目记忆显示真实 Review History 已有 REVIEW-011（BL-21 审核，2026-10-02）以及 REVIEW-010 的
//   BL-2 追记；本 ZIP 基础版没有它们。合并前先核对，以真实文件为准，只合并本条目与 REVIEW-010 的 2026-10-07 追记。
//
// Date: 2026-10-05 至 2026-10-16（沙盒时钟）。Profile：只读静态审计 + 隔离环境（Node/GasShim）测试 + 决策准备；
// 没有任何一项在真实 GAS 或浏览器里执行。来源：上传 ZIP（e3b5166a…09404a2）；ZIP 与 outputs 副本都不是已确认的
// 权威来源（ADR-P32）。
//
// (a) 912 Insurance Static Audit（2026-10-05）— 结果：FAIL
//   F-01 High FAIL  Policy create/renew 是没有 event 的 Truth 写入（912:921–1121 内 publishPropertyEvent_ 为 0 次；P1）→ ADR-P27/P28。
//   F-02 High FAIL  945 保单面板把 console_wrap_ 信封当成保单（946:133–137 vs 945:684）；静态推导，未在浏览器验证。
//   F-03 Medium GAP renew 重试会产生重复（无 clientRequestId、无领域键）。
//   F-04 Medium GAP renew 两步写入没有 logPartialFailure_。
//   F-05 Medium GAP 日期只验非空，不验格式与先后。
//   F-06 Low GAP    945 保单面板 innerHTML 未转义用户输入。
//   F-07 Info UNSPECIFIED Obligation 取消/改类别后的 Policy 行为；PolicyExpiryDate 不触发提醒。
//   F-08 Info GAP   状态字面值 vs INSURANCE_POLICY_STATUSES。
//   F-09 Info GAP   文件漂移：920_InsuranceEngine 命名、ERD、sheet 名、912 档头"seven Command functions"。
//   F-10 Info GAP   没有 Policy 函式的测试。
//   其余边界：所有权、身份、锁、truth 保护、Asset/Evidence/Scheduler 边界 PASS；没有发现数据损坏路径。
//   Provenance：独立的实作授权文件未找到（缺口保留，不等于未授权）；2026-10-01 追溯批准已 CLOSED，未重开。
//
// (b) 912 F-01 Phase 1 Analysis（2026-10-06）— BLOCKED — ARCHITECTURAL GAP
//   publishPropertyEvent_（903:180–190）= LOGGING ONLY；唯一候选 OBLIGATION_UPDATED（契约是 ObligationRule 的
//   changedFields）；先 Truth 后 Event 与所有既有命令一致。→ CC 作出 D-912-F01 后续决定（ADR-P28）。
//
// (c) EventBus Infrastructure Decision Gate（2026-10-13/14，只读）— COMPLETE；P1 AMBIGUOUS；没有选项被选择（ADR-P30）
//   持久化 / 分发 / 订阅 / 重试：ABSENT IN INSPECTED SOURCE；跨 OS EventBus 契约：UNVERIFIED。
//   Option A 保留占位：无改动，审计仍只靠两张域内表。Option B 持久记录：改 903 adapter + 新增事件表（900/901），
//   风险是发布会因存储/配额/锁而失败、重复事件无法去重、与 ADR-P12"每个项目各建一份"的方向有张力。
//   Option C 记录加分发：B 加订阅 adapter 与消费者（914 不存在，922/913 没有处理代码），与 ADR-P12 在 API 固定前不
//   做真实订阅冲突，除非修订。Option D 先修订治理：不改代码，先定 P1 解释、审计定义、是否允许项目内自建持久化。
//
// (d) Billing（2026-10-13 至 10-16）
//   - S2 实作与 946 修复见 BL-22、ADR-P29。946 补丁复核 PASS（Date 检测、日期/日期时间格式、值透传、不改源、
//     唯一使用者 945:553、新增失败路径均可见）。无法确认：电子表格自身时区；非法 Date 在真实 GAS 的 formatDate 行为。
//   - 其他读取接口的 Date 扫描（隔离环境，真日期注入）：会带 Date 的有 console_getActiveInsurancePolicyForObligation、
//     console_listInsurancePolicyHistoryForObligation、dlp_listSidebarDefects、dlp_getSidebarDefectDetail；干净的有
//     console_getDashboardSnapshot、console_getPaymentHistory、console_getFormOptions、各写入命令的返回值。→ BL-27。
//   - 保存路径部分写入（模拟故障，非真实观察）：Rule 后 Occurrence 失败 → 1/0/0、无日志；Occurrence 后 History 失败
//     → 1/1/0、无日志；event 失败 → 1/1/1、有日志；重试分别得到 2/1/1、2/2/1、2/2/2，同一个 clientRequestId
//     也不能防重复。真实环境证据只有项目记录的 994（2026-07-29）：recordPayment 的 History 失败时 logPartialFailure_
//     会记录，以及"无 clientRequestId 的重复 createObligation 无去重"。→ BL-24。
//   - 945 UI 测试：对当前 945 为 52 通过、0 失败、4 项已知缺陷；对 ZIP 原版 945 为 33 通过、19 失败；9 种变异全部
//     被抓到（ADR-P31）。946 listProperties 15/15；946 createObligation 52/52。
//   - 真实表（Drive 只读）：Est8 记录存在；ObligationRules / ObligationOccurrences 没有任何数据行；
//     PropertyInsurancePolicies 表尚不存在。真实保存路径 NOT VERIFIED。
//
// (e) checkpoint 时刻的本地测试（完整包副本 = ZIP + 输出的 945/946 + 三份新测试）
//   通过：918（163）、922（67，见下）、947（22）、948_rectification（27）、948_search（29）、phase11_schema_consolidation（38）、
//   phase11_schema_migration（71）、946_listProperties（15）、946_createObligation（52）、945_addBill_ui（52 + 4 已知缺陷）。
//   既有失败（本窗口任何修改之前就存在，未调查）：local_precheck_test_911（shim 没有 PropertiesService）、
//   local_precheck_test_phase11_defectitem_reorder_migration。local_precheck_test_922 间歇性失败（ZIP 原版 25 次中 5 次，
//   修改后的包 25 次中 1 次；"latestEvent … chronologically" 检查）。遗留 Node 沙箱套件（900/912/919/999）在重建的
//   目录布局里 67/101，原因是 shim 文件清单缺 910（propertyExists_ 未定义）。
//
// (f) 本窗口对自己早先说法的更正
//   - 早先称 ZIP 里"没有 TestKit"：错误；TestKit.js、GasShim.js、runAllTests.js 都在 ZIP 内（扁平目录）。实际情况是
//     套件要求 shim/ 与 tests/ 子目录，且 shim 文件清单已过时。
//   - 946 补丁行数：+22 / −1（含一个空行），早先写成 +21。
//   - Phase 1 / Decision Gate 报告里把 912 的 Node 套件称为"GAS-native"：不准确，912_Tests_ObligationEngine.js 是 Node shim 版。
//
// Disposition：审计与分析记录；没有任何 finding 被改写成 PASS；所有 F-xx 与待决事项见 ADR-P27–P32、BL-22–BL-30。

```

## 00_Project_State.js（基础：root 的 00_Project_State_Adopted.js（含重建的 2026-10-01 条目））

### 块 1（20 行）— 插入在下面这一行**之后**：

    //      全部 20 个文件都已在真实 GAS 环境验证过至少一次。

```text
//  10. [待确认 2026-10-16] 912 createObligation 保存路径非原子：Rule 写入后 createOccurrence_ 失败 → 孤儿 Rule（无
//      Occurrence、无部分失败日志）；Occurrence 写入后 History 失败 → 缺创建历史行（无日志）；event 发布失败 → 三者都已
//      写入但界面报失败（有日志）。证据：隔离环境模拟（非真实 GAS）。912:387–393 的注释写"见本文件 TECH DEBT"，此前
//      本文件没有对应条目，这条补上。UEF v1.6 §2 / D9 接受非原子写入，但前两个边缘连日志都没有。→ BL-24（PROPOSED，
//      未授权）。
//  11. [待确认-未授权] 945 Add Bill 保存回调对 null / 空响应没有保护：null → 回调抛 TypeError，Save 按钮保持禁用且无
//      提示；失败结果缺 error 文字时 toast 显示 "undefined"。loadProperties 已在 S2 补上保护。→ BL-23（PROPOSED）。
//  12. [未证实风险-CC 明确不授权修复] Date 序列化边界：console_getActiveInsurancePolicyForObligation、
//      console_listInsurancePolicyHistoryForObligation（946）、dlp_listSidebarDefects、dlp_getSidebarDefectDetail（922 DTO
//      原样传出 submittedAt / closedDate）。隔离环境模拟显示真日期格子会带到响应；没有观察到真实症状。→ BL-27；
//      ADR-P29(b) PROPOSED。
//  13. [待确认] EventBus / P1 解释：publishPropertyEvent_() 仍是 LOGGING ONLY（903:180–190，ADR-P07 刻意占位）；
//      Constitution 264、ADR-P04:145、Vertical Slice 258/292 仍按"有持久事件日志"描述，Constitution 364–375（2026-08-17
//      订正）已说明目前没有。→ ADR-P30 PENDING（决策单 Q1–Q7 未作答）；BL-26。
//  14. [待确认] 来源权威性未确认：上传 ZIP、outputs 副本、本地修改副本都不是权威来源；已部署的 GAS 源码无法直接检查
//      → ADR-P32。ZIP 内还有遗留的 Node 沙箱测试（900/912/919/999 + runAllTests.js + TestKit.js），与本文件 #5（Node
//      沙箱已移除）不符；在重建的目录布局里跑 67/101（shim 文件清单缺 910）。→ BL-29。
//  15. [既有失败，未调查] local_precheck_test_911（shim 没有 PropertiesService）、
//      local_precheck_test_phase11_defectitem_reorder_migration 一直失败；local_precheck_test_922 间歇性失败（ZIP 原版
//      25 次中 5 次）。均在本窗口的任何修改之前就存在。
```

### 块 2（5 行）— 插入在下面这一行**之后**：

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```text
//
//  ★ 2026-10-16 CC 指示（见 CHANGELOG 同日条目）：Billing（让 Operator Console 能记录真实的 Water / Electricity /
//     MaintenanceFee 账单）是当前最高优先级。EventBus Decision Gate 与 912 F-01 暂缓，除非 Billing 的写入路径出现真实
//     依赖。Billing 现状：S2 已实作、隔离环境测试通过；真实 GAS / 浏览器 / 生产录入验证 PENDING（见 BL-22、
//     Billing_Real_Environment_Checklist.md v2）。下面 1–11 是 2026-08 的原有顺序，本条没有改动它们。
```

### 块 3（32 行）— 插入在下面这一行**之后**：

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```text
//
//  2026-10-16      Checkpoint / 治理持久化。CC 指示暂停 coding，核对本窗口全部决定、修改、测试与未完成事项，并把决定
//                  写入 Governance 文件与 ADR Log。日期取自沙盒时钟，CC 的本地日期可能不同。本条只做记录：没有修改任何
//                  运行代码，没有同步到任何 GAS / GitHub，没有创建 ZIP 或基线。交接文件：
//                  CHECKPOINT_2026-10-16_PropertyOS-Billing-EventBus-Handoff.md
//
//                  【CC 决定（本窗口）】
//                  - 2026-10-01 追溯批准记录已重建并正式采用（见下一条）；该工作项 CLOSED。
//                  - D-912-F01（2026-10-06）Choice A → ADR-P27；事件语义后续决定 A1–I1 → ADR-P28（同样记在
//                    REVIEW-010 的 2026-10-07 追记）。912 F-01 实作授权：NOT GRANTED（授权单 A–H 尚未作答）。
//                  - Billing 为最高优先级；EventBus Decision Gate 只读调查已完成，未选任何选项 → ADR-P30 PENDING，
//                    不阻塞 Billing。
//                  - Billing S2（只改 945）与 946 console_listProperties 的 Date 序列化修复已授权并实作 → BL-22、
//                    ADR-P29(a)。其他 Date 风险端点：CC 明确不授权修复。
//                  - 不授权建立 945 / 946 合并基线或权威副本 → ADR-P32。
//                  - 945 UI 逻辑的隔离测试方式（Node vm + 手写假 DOM）已授权 → ADR-P31。
//
//                  【实作与验证状态】（SHA-256 见 CHECKPOINT 文件的 manifest）
//                  - 945（S2 B1–B3 + loadProperties 空响应保护）：实作完成；隔离测试 52 通过 + 4 项已知缺陷（BL-23）；
//                    用户在真实环境看到该版本的空响应提示。
//                  - 946（console_browserSafeRow_）：实作完成；隔离测试 15/15；用户回报部署后 Add Bill 下拉显示
//                    Est8 Seputeh（是否带 "· A-19-11" 未确认）。
//                  - 真实表（Drive 只读）：Est8 记录存在；ObligationRules / ObligationOccurrences 只有表头，没有任何账单。
//                    真实保存路径：NOT VERIFIED。
//                  - 912 Insurance Static Audit：FAIL（F-01…F-10，见 REVIEW-012）；F-02–F-10 Deferred。
//
//                  【待确认 / 未授权】TECH DEBT #10–#15；BL-23 至 BL-30。
//                  【限制】新增的 ADR-P27–P32 编号依据 ZIP 里的 ADR Log，权威副本未确认；沙盒在本窗口中途被重置，
//                  临时证据脚本已丢失（结果已记入 REVIEW-012，编号暂定）。本文件以 ZIP / Adopted 为基础：项目记忆显示真实仓库
//                  有 2026-10-01 的原始批准条目与 2026-10-02 的交接记录（CHECKPOINT_2026-10-02_PropertyOS-Governance
//                  Ratification-Handoff.md），而下一条的 2026-10-01 条目是依据 CC 的决定重建的。合并时以真实条目为准，
//                  只合并本条与 TECH DEBT #10–#15、NEXT PRIORITY 说明。
```
