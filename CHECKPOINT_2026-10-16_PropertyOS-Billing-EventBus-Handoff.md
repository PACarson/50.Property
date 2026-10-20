# CHECKPOINT 2026-10-16 — Property OS：Billing / EventBus / 912 F-01 交接

**创建**：2026-10-16（沙盒时钟；CC 的本地日期可能不同）　**性质**：暂停 coding 之后的完整核对与交接　**状态**：COMPLETE（本文件），Billing 切片本身 = PARTIAL
**用途**：下一个窗口以这些持久化文件为主要依据继续工作。**读完第 7 节再动手。**

> **先说三件会误导人的事**
> 1. **这里没有做到一半的代码修改。** 所有编辑都已保存、测试过。"进行中"的是真实环境验证，需要用户本人在场。
> 2. **输出副本不是权威来源，也不等于已部署。** 不要把它们当作线上版本（ADR-P32）。
> 3. **ADR-P27–P32 的编号是暂定的**：依据 ZIP 里的 ADR Log（最后是 P26），权威 ADR Log 未确认，合并前要核对有没有冲突。

---

## 1. 当前项目状态

- **项目**：Property OS（Google Apps Script + Sheets，Operator Console 945/946，DLP 手机控制台 947/948）。真实表：Drive 里的 `50. Property TEST`（ID `125A5jTg-yu1AuUc_E4-CyEeMVyuThNg5cUFeVI1MCB0`，只读访问）。
- **用户的当前方向（CC）**：Billing 是最高优先级——让 Operator Console 能记录真实的 Water / Electricity / MaintenanceFee 账单；EventBus 决策单与 912 F-01 暂缓，除非 Billing 真的依赖。
- **来源**：上传的 ZIP（SHA-256 `e3b5166a7e54f882efaecd43d90c16896322dc5156abb9187d7957bd609404a2`）。**不是权威来源**；最新 CHANGELOG 是 2026-09-20，之后的窗口可能已有变化。已部署的 GAS 源码无法从本环境检查。
- **真实仓库比 ZIP 新（来自 assistant 的项目记忆，没有在本环境的文件里核实）**：记忆记录 2026-10-01/02 的另一个窗口已在真实 Project State 里写入 2026-10-01 的**原始**批准条目，在真实 Review History 里写入 REVIEW-010 的 BL-2 追记和 **REVIEW-011（BL-21 审核）**，并交付了 `CHECKPOINT_2026-10-02_PropertyOS-GovernanceRatification-Handoff.md`。所以 `governance_updated/` 里的四个文件（以 ZIP / 旧输出为底）**不能整份覆盖真实文件**，只能按 `MERGE_KIT_additions_only_2026-10-16.md` 合并新增块；我的审计条目因此暂定为 **REVIEW-012**。
- **真实环境（Drive 只读，2026-10-13/14）**：`Properties` 里 Est8 Seputeh 存在（PropertyID `PROP-mshs0wca-skrq`，Status 恰为 `Active`，UnitLabel `A-19-11`，表头与 901 schema 一致）；`ObligationRules`、`ObligationOccurrences` **只有表头，没有任何账单**；`PropertyInsurancePolicies` 表尚不存在。
- **用户回报**：部署 946 补丁后，Add Bill 的 Property 下拉显示 Est8 Seputeh（选项是否带 `· A-19-11` 没有确认）。此前部署的 945（`d1bf51ed…`）在真实环境显示了"The server returned no data…"的空响应提示。
- **沙盒**：本窗口中途被重置（`/tmp` 里的证据脚本丢失）；outputs 与 uploads 保留。

## 2. 本窗口的重要决定

状态说明：**DECIDED** = CC 明确作出；**PENDING** = 等 CC 作答；**PROPOSED** = assistant 的提议，未批准。持久化位置在括号里。

| # | 决定 / 事项 | 状态 | 持久化位置（governance_updated/） |
|---|---|---|---|
| 1 | 2026-10-01 追溯批准（BL-2、BL-19、BL-21，A1；BL-2 排除 911；BL-21 排除 Resume；来源缺口保留；追溯批准不证明历史授权）。记录是**依据 CC 的决定重建的**，不是找回的原件（真实仓库里有原始条目，合并时以真实的为准） | DECIDED，工作项 CLOSED | Project State 的 2026-10-01 条目（在 Adopted 基础上保留） |
| 2 | D-912-F01 Choice A：Policy create/renew 属于既有 Obligation event boundary；条件 4 = 不新增 Policy 专属 event vocabulary，不是可绕过 EventBus | DECIDED，**实作未授权** | ADR-P27；REVIEW-010 追记（root 的 Review History） |
| 3 | 事件语义后续决定：OBLIGATION_UPDATED 可代表 Obligation 聚合（含 Policy 卫星）；A1=②、A2/A3=YES、A4=B（policyChange）、A5、A6、A7、P3=CONDITIONAL、C2、O1、F1、I1 | DECIDED，**实作未授权**；6 个 OPEN POINTS 未决 | ADR-P28 |
| 4 | 912 F-01 实作授权单（决策 A–H） | **PENDING**（用户未作答；NOT GRANTED） | ADR-P27/28、BL-25 |
| 5 | EventBus Decision Gate：只读调查完成，P1 解释 AMBIGUOUS，Option A–D **未选**，Q1–Q7 未答 | **PENDING** | ADR-P30、BL-26、TECH DEBT #13 |
| 6 | Billing S2 授权（只改 945：标签 / 空状态 / 成功反馈） | DECIDED，已实作 | BL-22 |
| 7 | 946 `console_listProperties` 的 Date 序列化修复 | DECIDED（"the authorized 946 fix"），已实作 | ADR-P29(a) |
| 8 | 其他 Date 序列化风险端点（保单读取、DLP 缺陷 DTO） | DECIDED：**不授权修复**，只记为未证实风险 | ADR-P29(b)、BL-27、TECH DEBT #12 |
| 9 | 不授权建立 945/946 合并基线或权威副本；不创建 ZIP | DECIDED（现行限制） | ADR-P32 |
| 10 | 945 UI 逻辑用 Node vm + 手写假 DOM 做隔离测试 | DECIDED（已授权，已完成） | ADR-P31 |
| 11 | 945 保存回调的 null 响应保护；912 createObligation 部分失败日志；Billing 字段扩充 / evidence / 一步式付款；测试采用与 File Map 同步 | **PROPOSED，未授权** | BL-23、BL-24、BL-28、BL-29 |
| 12 | 912 审计其余发现 F-02–F-10 | DEFERRED（CC 明确） | BL-30、REVIEW-012 |

## 3. 已完成 / 未完成 / blocked

### 3.1 已完成且已验证（注明证据等级）
- 2026-10-01 批准记录的重建、两处最小修正、正式采用：输出文件逐字节对比、`node -c`、diff（**文件层面**；不是权威副本）。
- D-912-F01 两项决定写入 Review History 输出副本：diff 验证。
- 912 Insurance Static Audit：**静态**，结果 FAIL（F-01…F-10）。
- EventBus Decision Gate：**静态**只读调查完成。
- 946 补丁复核 **PASS**：静态 + 隔离环境（Date 检测、日期/日期时间格式、值透传、不改源、新增失败路径可见）。
- 真实登记表核对：Drive **只读**，Est8 记录存在且符合 schema。
- 隔离环境测试（Node + GasShim / vm，**不是**真实 GAS 或浏览器）：946 listProperties 15/15、946 createObligation 52/52、945 UI 52 通过 + 4 项已知缺陷、变异检查 9/9。
- 本次 governance_updated 四个文件：与基础版本相比**只有新增、没有删除**；`node -c` 通过；读回核对。

### 3.2 已实现但未验证（真实环境）
- 945 `d1bf51ed…`：标签带单元号、空状态、成功提示含 ID 和首个到期日、失败测试、保存按钮行为——**都没有在真实环境验证**；只有空响应提示被用户看到。
- 946 `e993b71b…`：用户回报下拉显示 Est8；`· A-19-11` 是否出现未确认；部署的是否就是这份文件未确认。
- 保存路径（createObligation → 三张表）：**生产 NOT VERIFIED**，真实表里没有任何账单。
- 三份新测试、四个治理文件：只是输出副本，**没有并入仓库**，也没有同步到任何地方。

### 3.3 正在进行
- Billing 真实验证（等用户本人，用 `Billing_Real_Environment_Checklist.md` v2）。
- 没有任何代码编辑被中断。

### 3.4 尚未实现（PROPOSED / 未授权）
BL-23（945 null 响应保护，约 6 行）、BL-24（912 部分失败日志）、BL-27（Date 风险端点）、BL-28（账期 / 开单日 / 编号 / 备注 / evidence / 一步式付款 / 币种治理 / Pay 默认日期用 UTC）、BL-29（测试采用 + File Map + 遗留 Node 测试处理）、912 F-01 的实际实作。

### 3.5 未解决 / blocked
- ADR-P30 的 Q1–Q7 与 912 F-01 授权单 A–H：等 CC。
- 权威来源未确认；已部署版本未确认；ADR 编号冲突未核对。
- 真实环境验证全部（GAS / 浏览器 / 手机 / 生产录入）。
- 未调查的既有测试问题：`local_precheck_test_911`（shim 没有 PropertiesService）、`local_precheck_test_phase11_defectitem_reorder_migration` 一直失败；`local_precheck_test_922` 间歇性失败（ZIP 原版 25 次中 5 次）。
- 哪一格是真日期：未确认；电子表格自身时区：未确认；非法 Date 在真实 GAS 的 `formatDate` 行为：未验证。
- 编号冲突未核对：ADR-P27–P32、REVIEW-012、BL-22–BL-30 都是暂定编号；真实仓库的治理文件版本未知（记忆显示比 ZIP 新）。
- Project State 与 912 注释的技术债缺口：已用 TECH DEBT #10 补记，等 CC 接受。

### 3.6 已被后续决定取代
- 945 旧版 `c318b77d…` → 被 `d1bf51ed…` 取代（后者多了 loadProperties 的 null 响应保护）。
- 早先的临时 945 假 DOM 测试台 → 被仓库式的 `local_precheck_test_945_addBill_ui.js` 取代。
- 完整 Billing 授权文件（全部字段 / 测试 / 文档范围）→ 被 S2 授权取代。
- Checklist v1 与 `Billing_946_Review…md` 里的清单部分 → 被 Checklist v2 取代。
- ZIP 里的 Project State / Review History → 对批准记录和 D-912-F01 而言被 governance_updated 版取代。
- 我早先的若干说法已更正（见 4.4）。

## 4. 当前 implementation checkpoint

### 4.1 实际改了哪些文件（相对 ZIP 的 SHA-256 见 manifest）
| 文件 | 改动 | 是否中断 |
|---|---|---|
| `945_OperatorConsole.html` | +87 / −7，9 个 hunk：B1 标签函式；B2 状态行与四种状态；B3 成功提示；`showToast` 可选时长；`loadProperties` 空响应保护 | 否，已保存并测试 |
| `946_OperatorConsoleServer.js` | +22 / −1：`console_listProperties` 套用 `console_browserSafeRow_` | 否 |
| 三份新测试 | 新增 | 否 |
| 910 / 912 / 900 / 901 / 913 / 922 / 947 | **没有改** | — |

### 4.2 做到哪里、哪里中断
- **最后完成的操作**：Billing UI 测试 + 部分写入风险复核（已汇报）→ 随后按 CC 指示暂停 coding → 治理持久化（本次）。
- **中断点**：没有代码中断点。唯一"未完成"的是用户那边的真实验证。
- **用户那边的状态不详**：不知道部署的是 945 哪一版（至少看到过 `d1bf51ed…` 的提示）、946 是否就是 `e993b71b…`。

### 4.3 下一个最小安全操作
**用户本人**按 Checklist v2 做第一类（只读 UI 核对）和第二类（Amount = −5 的失败测试，不写数据），把看到的文字发回。验收标准：下拉显示 `Est8 Seputeh · A-19-11`、状态文字行隐藏；失败测试显示红色 "Amount must be greater than 0."，三张表行数不变。

### 4.4 本窗口对自己早先说法的更正
- 我曾说 ZIP 里"没有 TestKit"——**错误**：`TestKit.js`、`GasShim.js`、`runAllTests.js` 都在 ZIP 内（扁平目录）。遗留的 Node 套件（900/912/919/999）要求 `shim/` 与 `tests/` 子目录，且 shim 文件清单缺 910；在重建的目录布局里跑 67/101，而且与 Project State TECH DEBT #5（Node 沙箱已移除）不符。
- 946 补丁行数是 +22/−1（含一个空行），不是 +21。
- 我曾把 912 的 Node 套件说成"GAS-native"：不准确。
- 补丁位置：我先前建议改 910 `listActiveProperties`，实际改在 946（适配层）；CC 之后的授权文件沿用了 946 版。

## 5. 下一步准确操作（按顺序）
1. **用户**：Checklist v2 第一、二类 → 回报文字。
2. 回报到了之后，**assistant**：先核对本文件 manifest 的哈希；再用 Drive 只读核对（不写）。
3. **用户**：如果 1 通过，按第三类录入**一笔真实**账单（不要重复保存；超时或对话框关闭时先查表再重试）→ **assistant** 只读核对 `ObligationRules` / `ObligationOccurrences` / `ObligationHistory` 三张表（字段清单在 Checklist 第四类）。
4. **等 CC 决定**（没有授权就不要 coding）：BL-23（945 null 响应保护）、BL-24（912 部分失败日志）、ADR-P30 的 Q1 / Q2 / Q5（然后才轮到 912 F-01 授权单 A–H）、BL-29（测试采用 + File Map）、权威副本与 ADR 编号。
5. 每一项真实验证通过后，才能更新对应的 status；**没有证据就不要写 PASS**。

## 6. Manifest（输出文件）

状态标签：`COMPLETE` / `PARTIAL` / `IN_PROGRESS` / `RECONSTRUCTED` / `SUPERSEDED`。哈希是 checkpoint 生成时对磁盘文件计算的。

| 文件 | 位置 | 说明 | 状态 | SHA-256 |
|---|---|---|---|---|
| `CHECKPOINT_2026-10-16_PropertyOS-Billing-EventBus-Handoff.md` | 本文件（outputs 根目录） | — | COMPLETE | `—` |
| `governance_updated/00_Project_State.js` | outputs/governance_updated/ | 基础=root 的 00_Project_State_Adopted.js；只新增 +57 行（CHANGELOG 条目、TECH DEBT #10–#15、NEXT PRIORITY 说明） | COMPLETE（候选副本；含 RECONSTRUCTED 的 2026-10-01 批准记录） | `bff5478de50f8ceadffd8aea758fe0a2e3d44c5b05d41c3d707a9105e1cb8dfb` |
| `governance_updated/00_ADR_Log.js` | outputs/governance_updated/ | 基础=ZIP 的 ADR Log；只新增 +217 行（ADR-P27–P32）。编号 PROVISIONAL | COMPLETE（候选副本） | `8b3e0094882a44a3547a526010ddb1a80eb5447bf020aff51f9420380243aff1` |
| `governance_updated/00_Review_History.js` | outputs/governance_updated/ | 基础=root 的 00_Review_History.js（含 REVIEW-010 的 2026-10-07 追记）；只新增 +67 行（REVIEW-012） | COMPLETE（候选副本） | `e963fb7c9c13b2d2cdd8f4ea080bfd4893245d85819010b67d0db2bd278a2287` |
| `governance_updated/MERGE_KIT_additions_only_2026-10-16.md` | outputs/governance_updated/ | 只含新增块与插入位置；合并进真实文件时用它，不要整份覆盖 | COMPLETE | `3729399d042ad538dc1fc06d7976f0ddfd2275f95d6abd38d8c9465a7edf2bcd` |
| `governance_updated/00_Product_Backlog.js` | outputs/governance_updated/ | 基础=ZIP 的 Backlog；只新增 +105 行（BL-22–BL-30，状态均已标明） | COMPLETE（候选副本） | `0bb2d177c7057afb9abb29ea324cdd47bb04714c06bfdfa79948fb58aaf942ae` |
| `945_OperatorConsole.html` | outputs/ | ZIP 原版 + S2 B1–B3 + loadProperties 空响应保护；用户在真实环境看到的是这一版的空响应提示 | COMPLETE（修改过的输出副本） | `d1bf51ed80b92ad3bd8a31ad6f367881a93eace2a1124e95d286006f07845651` |
| `946_OperatorConsoleServer.js` | outputs/ | ZIP 原版 + console_browserSafeRow_（+22/−1）；用户回报已部署 | COMPLETE（修改过的输出副本） | `e993b71baed38686b17906e42587341ee98a1f531b53c7b544c5e86f5eebae26` |
| `local_precheck_test_946_listProperties.js` | outputs/ | 15 项；原版 946 下 5 项失败，修复版 15/15 | COMPLETE（尚未并入仓库） | `d02e8a013d9b8814ab1ce7b306181e0116a5a8ea3b8802df7d65373caa314c4d` |
| `local_precheck_test_946_createObligation.js` | outputs/ | 52 项；变异检查可抓到破坏 | COMPLETE（尚未并入仓库） | `4e217261a72216c89a236c277edd1265b03dc7062055b4dca125a7c9b6e1c07b` |
| `local_precheck_test_945_addBill_ui.js` | outputs/ | 52 通过、4 项已知缺陷；9 种变异全部抓到 | COMPLETE（尚未并入仓库） | `3ff79df91e79a1edb5dce49072602ea202cfbf181ac22b5f5da3839cc94b7be8` |
| `Billing_Real_Environment_Checklist.md` | outputs/ | v2：四类（只读 / 失败测试 / 真实账单 / 记录核对） | COMPLETE | `14ad69db46ecfe5a16894ea4b935df34cfc8b5dc8612d2086bb5d79f6cf7f9f3` |
| `Billing_946_Review_and_Water_Verification_Plan.md` | outputs/ | 946 补丁复核、Water 验证清单、其他端点日期风险；其中的清单部分已被 Checklist v2 取代 | COMPLETE（部分被取代） | `3808da1d8fcf4b8032fae579d20cd14e4d08380acce2481cf05af9ae4fcd9bb3` |
| `00_Project_State.js（root）` | outputs/ | 中间产物：候选副本，字节与 Adopted 相同 | SUPERSEDED（被 governance_updated 取代） | `fb91f954897a5b44f9f3668419264b850344aa8b3a619a581a37f770e4484d24` |
| `00_Project_State_Adopted.js（root）` | outputs/ | 2026-10-01 批准记录工作项的收尾依据（fb91f954…）；也是 governance_updated/00_Project_State.js 的基础 | SUPERSEDED（仍是该工作项的收尾引用，不要删） | `fb91f954897a5b44f9f3668419264b850344aa8b3a619a581a37f770e4484d24` |
| `00_Review_History.js（root）` | outputs/ | 中间产物：REVIEW-010 追记版，是 governance_updated 版的基础 | SUPERSEDED（被 governance_updated 取代） | `e967edf50d0b1a2cd58587f5d605eddd5ee9ce6317daefb2fa4c0c83b604b6cc` |

**上传的文件**

| 文件 | 说明 | SHA-256 |
|---|---|---|
| `50_Property-main.zip` | 上传的源码快照；最新 CHANGELOG 是 2026-09-20；权威性未确认 | `e3b5166a7e54f882efaecd43d90c16896322dc5156abb9187d7957bd609404a2` |
| `CHECKPOINT_2026-09-20_PropertyOS-FullWindowAudit-Handoff.md` | 上一个窗口的交接文件 | `625afae4419c5364ea05e58270fcfabf0eaf702b038b9412880080a082a71545` |
| `Emergency_Stop_Handoff_Checkpoint_2026-10-04.md` | 用户提供的停止与交接程序；见第 9 节 | `b19baffc03ce34d8b475df6911a7262bdc1fcd025e1c45dde597d18a72617bef` |

**已丢失，无法提供**：沙盒重置前的临时证据脚本——`scan_date_risk.js`、`scan_write_returns.js`、`scan_dlp_date_risk.js`、`scan_dash_populated.js`、`water_flow_shim.js`、`partial_write_matrix.js`、`save_path_partial_failure.js`、`patch_edge_checks.js`、`mutation_check_945.py`、旧的假 DOM 测试台。它们的结果已记入 REVIEW-012，**不是**原文件；要复现只能重写（稳定的部分已进入三份仓库式测试）。

## 7. 新窗口必须先读取的文件（顺序）
1. 本文件。
2. `governance_updated/00_Project_State.js`：顶部的 2026-10-16 与 2026-10-01 条目、TECH DEBT #10–#15、NEXT PRIORITY 开头的说明。
3. `governance_updated/00_ADR_Log.js`：末尾的 ADR-P27–P32（注意哪些是 DECIDED、哪些是 PENDING / PROPOSED）。
4. `governance_updated/00_Review_History.js`：REVIEW-010 的 2026-10-07 追记与 REVIEW-012。
5. `governance_updated/00_Product_Backlog.js`：BL-22–BL-30。
6. `Billing_Real_Environment_Checklist.md`（v2）。
7. 需要时再读：`945_OperatorConsole.html`、`946_OperatorConsoleServer.js`、三份测试、`Billing_946_Review_and_Water_Verification_Plan.md`。
8. 参考：上传的 ZIP（不是权威）、`CHECKPOINT_2026-09-20_…md`、`Emergency_Stop_Handoff_Checkpoint_2026-10-04.md`。
9. 读任何文件之前，先对照第 6 节的哈希。
10. **向 CC 要真实仓库里最新的治理文件**（Project State、ADR Log、Review History、Backlog）以及 `CHECKPOINT_2026-10-02_PropertyOS-GovernanceRatification-Handoff.md`，并先对照它们再合并：本窗口所有治理输出都是以 ZIP 为底的候选副本。
11. 合并时用 `governance_updated/MERGE_KIT_additions_only_2026-10-16.md`，不要整份覆盖。

## 8. 不要重复做的事 / 不要假设的事
**不要重复**
- 不要重做 912 Insurance 静态审计、EventBus 只读调查、946 补丁复核（结果都在 REVIEW-012）。
- 不要再让 CC 重新确认已 DECIDED 的事项（第 2 节）。

**不要假设**
- 不要假设"讨论过"就是"已实现"，或"测试通过"就是"真实环境通过"。Node/GasShim/假 DOM 都不是 GAS 或浏览器。
- 不要假设 ZIP 是最新（最新 CHANGELOG 是 2026-09-20），也不要假设输出副本已部署或是权威来源；不要把"哈希与 ZIP 一致"当作权威。
- 不要假设 `· A-19-11` 已在真实下拉里出现。
- 不要假设 ADR-P27–P32 的编号是最终编号；REVIEW-012、BL-22–BL-30 同理。
- 不要把 `governance_updated/` 当作可直接覆盖真实治理文件的完整版本，它们基于旧的底本。
- 不要假设上传路径里的 `50_Property-main.zip` 是稳定的参照：项目记忆记录过同名上传会被静默覆盖。本窗口里它的哈希始终是 `e3b5166a…`，但那只在本窗口内成立。
- 不要把 PENDING / PROPOSED 项当成批准的决定。
- 不要代 CC 选择 EventBus 的 Option A/B/C/D，也不要回答 912 F-01 授权单。

**不要做**
- 不要实作 912 F-01、不要改保单读取接口或 DLP 缺陷 DTO、不要建立 945/946 合并基线或 ZIP、不要同步到 GAS/GitHub/生产。
- 不要创建真实账单、测试 Property，或写真实表（Drive 只读）。
- 不要在没有授权的情况下 coding；发现运行缺陷时只写提议，等单独授权。
- 不要覆盖 `outputs/` 里已有的哈希被引用过的文件（尤其是 root 的 `00_Project_State_Adopted.js`）。

## 9. 关于 `Emergency_Stop_Handoff_Checkpoint_2026-10-04.md`
用户要求"按照这个执行"。按它执行了：先暂停 coding；**第 11 节的"先输出文件、不再继续搜索"** 被采用——我把已有的文件全部列入 manifest 并输出，之后停止；每个文件标注了状态；没有编造缺失内容；没有重建任何基线或 ZIP；没有为"停止"这件事单独创建 ADR（ADR-P27–P32 只记录决定和待决事项）。
**不要混淆**：那份文件描述的是一个"没有仓库、没有对话上下文"的环境，其中的 BLOCKED 状态**不适用于本窗口**——本窗口有 ZIP、outputs 与 Drive 只读访问。它也没有建立任何项目决定。
