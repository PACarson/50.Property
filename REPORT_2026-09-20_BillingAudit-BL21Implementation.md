# Billing / Property Obligations — Capability Audit + BL-21 Implementation
2026-09-20

---

## A. Billing Capability Audit

直接重读 repository（900-903、912/913、945/946、922、901 Schema、
00_Product_Backlog.js、00_Review_History.js REVIEW-001）后得到的实际
状态——不是从记忆假设：

| Capability | Governance Requirement | Code Exists | Tests Exist | Integration Exists | Status |
|---|---|---|---|---|---|
| 通用 Obligation 生命周期（create/update/pause/resume/cancel/recordPayment/reversePayment） | 912/913 设计，REVIEW-001 audit | **Yes**（912_ObligationEngine.js，917 行，含 lock/状态机/partial-failure 记录） | **Yes**（990-996，REVIEW-001 记录 99+9 个 GAS-native 测试全数通过） | create/recordPayment 已接 UI（945/946）；pause/resume/cancel 未接 UI（本次 BL-21 补上 pause/cancel） | **D**（Implemented locally，含 REVIEW-001 real-GAS 记录） |
| Mortgage（作为 Category） | 900_PropertyConfig 定义 | **Yes**——但只是通用 Category 值 | 同上（通用） | 可透过 UI 创建/查看/记录付款 | **D**（通用层面）；Mortgage 专属栏位（本金/利率/贷款年限/Loan 实体）= **A**（Planned only，DomainModel 规划中的独立 Mortgage Engine + `LoanID` FK 目前无实际 Loan 记录可指） |
| MaintenanceFee / SinkingFund / QuitRent / Assessment / Electricity(TNB) / Water | 900_PropertyConfig 定义 | **Yes**（通用引擎） | Yes（通用） | Yes——可创建、可记录付款、出现在 Dashboard | **D** |
| Insurance（作为 Category） | 900_PropertyConfig 定义 | **Yes**（通用层面） | Yes（通用） | Yes（通用付款流程） | **D**（通用付款）；Insurance 专属栏位（Policy Number/Coverage Type/Coverage Amount/Renewal Date，即 BL-2 提案内容）= **A**（Planned only，未实作） |
| Payment recording | 912 recordPayment | **Yes** | Yes | Yes（console_recordPayment/945） | **D** |
| Outstanding / Overdue 状态 | 912 queryOverdue、Occurrence 状态机 | **Yes** | Yes | Yes（Dashboard 显示 Overdue 卡片） | **D** |
| Reminder（事件层面） | 903 REMINDER_REQUESTED、913 Scheduler | **Yes**（912/913 均会 publish） | Yes（919/994 做 contract-level 验证：payload 格式正确） | **No**——repository 里找不到真正的 ReminderConnector 实作或任何 Telegram/外部送达路径，只有事件本身与其 payload 契约 | 事件产生面 = **D**；实际送达面 = **A**（Planned/contracted-only） |
| Dashboard 可见度 | 922 DashboardAdapter | **Yes** | 间接（透过 query 函式自身的测试） | **Yes**——945 Dashboard tab 完整串到 922→912 | **D** |
| Pause/Resume/Cancel Obligation（UI 层） | 912 已有函式，无对应 backlog item 明文要求 UI | 912 逻辑 **Yes**；UI wrapper 本次新增（946 console_pauseObligation/console_cancelObligation；945 按钮） | 底层 912 逻辑测试 Yes（GAS-native）；本次新增的 wrapper/UI 只做了语法检查，**未执行验证** | Pause/Cancel：**本次新增**；Resume：**仍无 UI**（见 C 节说明） | 底层 = **D**；本次新增的 UI 层 = **C→D 过渡**（本地实作完成，GAS 验证 pending） |
| 整体 Production-Ready 状态 | UEF §0.5 | — | — | — | **Not Production-Ready**——REVIEW-001（2026-07-29）明确结论 pending（并发/Cache TTL/schema drift/Runtime 限制未核实），此后没有新记录更新过这个结论，本次审计沿用不重新定论 |

---

## B. Selected Next Slice

**BL-21 — Operator Console：补上 Pause/Cancel Obligation 的 UI 呼叫。**

为什么选这个：

- **已授权、可立即实作**：912 的 `pauseObligation`/`cancelObligation`
  逻辑本身早就实作完整（含 lock、状态转换检查、event 发布），只是
  946 从未把它们包成 console_ wrapper——这不是新架构，是接上既有
  能力，风险与设计决策都是既有的，不是这次发明的。
- 相较 BL-2（Insurance Policy 详细栏位）：BL-2 需要新 Schema/新
  Sheet/新栏位设计，属于需要先走一次这个专案自己一贯的 Vertical
  Slice / Review 流程的架构性工作，不是"最小可行切片"。
- 相较 BL-1（Leasehold Lease Expiry）：虽然设计已经很完整，但那是
  910 Property Asset 的栏位（"这物业的产权何时到期"），不是 Billing/
  Obligation 领域，不属于本次任务范围。
- 支持文件：BL-21 本身的登记文字（00_Product_Backlog.js）、
  REVIEW-001（确认底层引擎已经 Production-audited 过一次）。

---

## C. Implementation

**Files changed：**

| File | Change |
|---|---|
| `946_OperatorConsoleServer.js` | 新增 `console_pauseObligation(obligationId, reason)`、`console_cancelObligation(obligationId, reason)`，逐字比照既有 `console_recordPayment` 的 `console_wrap_` 包法，零新逻辑 |
| `945_OperatorConsole.html` | `renderOccurrenceList` 的每张（非 paid）Occurrence 卡片，在既有 "Pay" 按钮旁新增 "Pause obligation"、"Cancel obligation" 按钮，各自 `window.confirm()` 二次确认后呼叫对应 console_ wrapper，成功后 `loadDashboard()` |
| `00_Product_Backlog.js` | 新增 BL-21（提出并实作，比照 BL-14/15/16 惯例），含本次 Capability Audit 发现的两处缺口（Mortgage/Insurance 专属栏位未实作、ReminderConnector 未实作）的如实记录 |
| `00_Project_State.js` | CHANGELOG 新增一条 2026-09-20（五），记录审计结果与 BL-21 实作范围 |

Schema changes：**无**。Event changes：**无**（沿用 912 既有的
`OBLIGATION_PAUSED`/`OBLIGATION_CANCELLED` event，本次没有新增或修改
任何 event 定义）。UI changes：仅上述两个新按钮，其余 Dashboard 版面
不变。

**刻意不做的部分**：`resumeObligation` 的 UI——现有 Dashboard 只查询
Active 状态的 Occurrence，一个 Suspended 的 Obligation 本来就不会
出现在任何现有列表里，没有自然的入口放 Resume 按钮。要做需要先有
一个新的"列出 Paused Obligations"查询+列表，这是比"补一个按钮"更大
的一块工作，这次范围内不顺手做。

---

## D. Architecture Compliance

- **Obligation ownership preserved**：Obligation 状态的唯一权威仍然
  是 912（Truth Layer），本次新增的两个 console_ wrapper 只是薄的
  透传层，不持有、不复制任何状态。
- **Event architecture preserved**：沿用 912 既有会自动发布的
  `OBLIGATION_PAUSED`/`OBLIGATION_CANCELLED`，没有新增 event、没有
  绕过既有发布机制。
- **Scheduler preserved**：完全没有触碰 913。
- **Reminder integration preserved**：完全没有触碰 903 或
  REMINDER_REQUESTED 相关代码——本次 Audit 中发现的 ReminderConnector
  缺口，如实记录为 Outstanding Item（见 H 节），没有顺手去实作它。
- **No duplicate truth layer**：确认。
- **No speculative abstraction**：确认——两个新函式是既有
  `console_recordPayment` 模式的逐字复制，没有引入新的抽象层或
  Generic Framework。

---

## E. Local Verification

| Test | Purpose | Result | Evidence |
|---|---|---|---|
| `node -c` on `946_OperatorConsoleServer.js` | 语法有效性 | **PASS** | 命令输出 |
| 抽出 `945_OperatorConsole.html` 的 `<script>` 区块，`node -c` | 语法有效性 | **PASS** | 命令输出 |
| `00_Product_Backlog.js` / `00_Project_State.js` `node -c` | 语法有效性 | **PASS** | 命令输出 |
| SHA-256：912/913/903/900/901（及 918/947/948/911/922/910/902/appsscript.json/ADR Log/Business Rules/Constitution） | 确认这次改动没有触碰既有 production/schema/governance | **PASS**，全部 UNCHANGED | 命令输出 |

**没有、也无法执行**：912/913 既有的 GAS-native 测试套件
（990-996、991_Tests_ObligationEngine.js、
919_Tests_ObligationIntegration.js 等）。`990_TestKit.js` 自己的档头
明确写着"这些测试设计成要贴进真实 Apps Script 专案、从 Script Editor
执行"，Node 沙箱版本（`property-os-tests/`）已经在更早的 session 被
CC 指示移除（REVIEW-001 Addendum 2 有记录）。**这不是这次环境限制
造成的**——跟 DLP Mobile Console 那边 918/947/948 有
`local_precheck_test_*.js` + `GasShim.js` 让 Node 也能跑的情况不同，
Obligation Engine 这套测试从设计上就是 GAS-only。

**因此这次的证据边界，如实说清楚**：pause/resume/cancel 底层逻辑
"早就存在且完整"这件事，证据来自直接阅读 912 现有代码与
REVIEW-001 的既有审计记录，不是这次重新跑测试得出的；本次新增的
console wrapper 与 UI 呼叫本身，目前只有语法检查与既有模式的
一致性核对，**没有任何形式的执行验证**（本地模拟或真实 GAS）。

---

## F. Governance

- `00_Product_Backlog.js`：新增 BL-21（Registered + Implemented，
  同一条记录）。
- `00_Project_State.js`：CHANGELOG 新增审计与实作记录。
- ADR：**未修改**，也不需要新开——这次的架构决策（如何包一个既有
  Command 的 console wrapper）沿用 946 既有惯例，没有新的架构性
  决定需要 ADR 记录。
- Schema/Domain Model/UI Contract：**未修改**。

---

## G. Real Environment Pending

- Real GAS verification：**PENDING**——`console_pauseObligation`/
  `console_cancelObligation` 从未在真实 GAS 环境执行过。
- Real Sheets 集成验证：**PENDING**——需要确认 Status 栏真的被正确
  写回 ObligationRule 那张 Sheet。
- Real Telegram/Reminder 验证：**不适用于本次改动**（本次没有触碰
  Reminder 路径），但整体 ReminderConnector 的送达能力本身，
  **PENDING/UNKNOWN**——见 H 节。
- Real-device 验证：**PENDING**（945 是桌面 Sidebar，非 Mobile，但
  "回到真实环境后用真实 GAS 项目点一次"这件事本身还是待办）。

---

## H. Outstanding

跟本次 BL-21 无直接关系，只列出、不处理：

1. **ReminderConnector 未见实作**——REMINDER_REQUESTED 事件本身与
   其 payload 契约都已经就绪且经 contract-level 测试验证，但仓库里
   没有找到实际送达（Telegram 或其他管道）的代码。这是"Reminder OS
   integration where already contracted"这句话里，"contracted"已经
   到位但"integration"尚未到位的具体例证。
2. **BL-2（Property Insurance 详细栏位）、Mortgage 专属栏位/独立
   Loan 实体**——两者都还是 Planned-only，需要各自的 Schema/
   Vertical Slice 设计工作，不是这次范围内的最小切片能涵盖的。
3. **00_File_Map.js 里"见 CHECKPOINT_2026-09-16"的历史缺口**——
   跟本次审计与实作都无关，沿用既有决定不处理。
4. REVIEW-001 记录的并发/Cache TTL/schema drift/Runtime 限制四项
   Manual Verification Checklist——这些本来就需要真实环境才能核实，
   本次审计沿用既有 pending 状态，没有新增信息。

---

## I. Final Status

**BILLING SLICE IMPLEMENTATION COMPLETE — LOCAL VERIFICATION ONLY**

（"Local Verification"具体所指：语法检查 + 既有模式一致性核对 +
production/schema 文件零改动的 SHA-256 确认——不包含任何形式的
执行测试，理由见 E 节。真实 GAS 验证、Real Sheets 写回确认，均
明确 PENDING，等 CC 回到真实环境后进行。）
