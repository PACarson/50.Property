# Property OS — Billing 946 补丁复核、Water 账单验证清单、其他读取接口的日期风险

**生成日期**：2026-10-14（UTC，分析当天）
**性质**：静态复核 + 隔离环境（Node + GasShim）的非破坏性检查 + 验证计划
**范围声明**：没有部署；没有访问生产数据；没有创建任何账单；没有修改 910 / 912 / 900 / 901 或任何其他接口；没有创建 ZIP 或 baseline。

> **证据等级说明**
> - **静态**：直接读源码。
> - **Node/GasShim**：在内存模拟的 Sheets 里执行，**不等于**真实 GAS 或浏览器验证。
> - **待真实环境**：需要你回来后在真实 GAS / 浏览器 / 真实表里确认。

---

## A. 来源与复核的文件

| 文件 | SHA-256 | 状态 |
|---|---|---|
| `50_Property-main.zip`（上传） | `e3b5166a7e54f882efaecd43d90c16896322dc5156abb9187d7957bd609404a2` | 解压副本来源；权威性**未确认** |
| `946_OperatorConsoleServer.js`（ZIP 内原版） | `b40d2a40444b43aadec82147077fefc6911cf2d7ad93b9f17450ca8ef14c1204` | 复核对照基准 |
| `946_OperatorConsoleServer.js`（补丁版，输出副本） | `e993b71baed38686b17906e42587341ee98a1f531b53c7b544c5e86f5eebae26` | **复核对象** |
| `945_OperatorConsole.html`（输出副本，你已部署过一版） | `d1bf51ed80b92ad3bd8a31ad6f367881a93eace2a1124e95d286006f07845651` | 本轮未改动 |
| `local_precheck_test_946_listProperties.js` | `d02e8a013d9b8814ab1ce7b306181e0116a5a8ea3b8802df7d65373caa314c4d` | 上一轮新增的本地测试 |

**其他读取的文件**：901 的 `toIsoDate_`、`toIsoDateTime_`、`coerceToIsoDateString_`（901:717–723、748–753）；910 的 `listActiveProperties`；945（`console_listProperties` 的唯一使用者）；`appsscript.json`（`timeZone: Asia/Singapore`）。

**来源状态**：补丁版只存在于输出副本；已部署的 GAS 代码在本环境无法直接检查；你是否贴入了这份文件我不知道；权威副本仍未确认。

---

## B. 946 补丁复核 — 结果：**PASS**

补丁内容（+22 / −1 行，其中含 1 个空行）：`console_listProperties` 增加 `.map(console_browserSafeRow_)`，并新增私有函式 `console_browserSafeRow_`。

| # | 检查项 | 结果 | 证据 |
|---|---|---|---|
| 1 | Date 检测正确且安全 | 通过 | `instanceof Date`，同一 V8 运行环境；只有 Date 值被改动（Node/GasShim） |
| 2 | 日期列统一为 `yyyy-MM-dd` | 通过 | 走 `coerceToIsoDateString_` → `toIsoDate_`；本地午夜的 Date 得到 `2021-12-27`（Node/GasShim） |
| 3 | `…At` 列为 ISO 时刻 | 通过 | Property 里只有 `CreatedAt`、`UpdatedAt`；`toISOString()` 与 `createProperty` 写入这两列的函式相同；与真实表里的 `…T17:15:11.673Z` 形态一致 |
| 4 | 时区与项目惯例一致 | 通过（有一点无法确认） | 脚本时区 `Asia/Singapore`（UTC+8，与吉隆坡同偏移），与项目其他位置用同一函式。**电子表格自己的时区我看不到**；若它与脚本时区不同且更靠东，日期格子可能偏一天 |
| 5 | 其他值的含义不变 | 通过 | 字符串、空串、0、false、true、null、NaN、数字、数组、对象均原样传出；值为 `undefined` 的键保留（Node/GasShim） |
| 6 | 只改返回数据，不改源 | 通过 | 返回新对象；源行里的 Date 仍是 Date；函式不碰 sheet（Node/GasShim） |
| 7 | 使用者是否依赖原始类型 | 无依赖 | `console_listProperties` 只有 945:553 一处使用；945 不读任何日期类的 Property 栏位；原来带 Date 的结果本来就无法到达浏览器；新函式名以 `_` 结尾，不会被前端调用 |
| 8 | 新增失败路径 | 有，但都是可见的 | 见下 |

**检查 8 的细节**
1. `…At` 列里出现非法日期：抛 `RangeError: Invalid time value`，被包装层转成 `success:false`（原来是静默的 null）。日期列里的非法日期，在真实 GAS 的 `Utilities.formatDate` 的行为**未验证**（模拟环境返回 `NaN-NaN-NaN`）。
2. 补丁依赖已部署的 901 里存在 `coerceToIsoDateString_` 和 `toIsoDateTime_`。缺失时会得到可见错误（`... is not a function`），而且只在遇到 Date 格子时才触发。
3. 不含 Date 格子的行，输出与原来完全一致。

**结论**：没有发现需要扩大补丁的具体缺陷，因此没有改动。

---

## C. 实际执行的测试（Node + GasShim，**不是**真实 GAS 或浏览器）

| 测试 | 结果 |
|---|---|
| `local_precheck_test_946_listProperties.js`（上一轮） | 15/15 通过；对原版 946 有 5 项失败（证明测试能复现问题） |
| 现有本地测试（上一轮，补丁版在包内） | 与修改前基线一致：7 个通过；`911` 与 `phase11_defectitem_reorder` 在改动前就失败，与本补丁无关 |
| 补丁边界检查（本轮，临时脚本） | 8 项：类型透传、不改源、非法日期、依赖缺失、时区 |
| 946 读取接口日期扫描（本轮，临时脚本） | 3 种模式：无注入、只注入日期列、连 `…At` 列也注入 |
| 946 写入命令返回值扫描（本轮，临时脚本） | 3 种模式，7 个命令 |
| 947 / 922 的 DLP 读取接口扫描（本轮，临时脚本） | 3 种模式，7 个接口 |
| Water 账单流程（本轮，临时脚本） | 成功路径、4 种失败路径、重复提交 |

本轮的临时脚本放在沙盒里，没有加入仓库，也没有交付。

---

## D. Water 账单验证清单（等你回来后使用）

### D.1 945 提交给后端的字段（945:810–823）
`propertyId`、`category`、`payee`、`amount`（`Number()`）、`frequencyType`、`dueAnchor`、`graceDays`、`autoGenerate`；可选 `customIntervalDays`、`endDate`。**不发送币种。**

### D.2 保存前
1. Property 下拉显示 `Est8 Seputeh · A-19-11`，下面没有状态文字。
2. 浏览器开发者工具中 `document.getElementById('ob_propertyId').value` 应等于 `PROP-mshs0wca-skrq`（登记表里的 PropertyID）。
3. 类别选 `Water`（option value 就是 `Water`，在 900 的标准类别里）。

### D.3 保存后：提示
应显示 `Bill added. Obligation ID: OBL-… · First due: yyyy-MM-dd`（显示约 10 秒）。

### D.4 保存后：三张表各新增恰好 1 行
以下字段与值已在 Node/GasShim 里按 945 实际构造的输入验证；到真实环境要逐项对照。

| 表 | 应核对的字段 |
|---|---|
| `ObligationRules`（18 列） | `ObligationID` = 提示里的 ID；`PropertyID` = `PROP-mshs0wca-skrq`；`Category` = `Water`；`Amount` 为数字且等于你填的；`Currency` = `MYR`（900:44 的默认值，912:372 在没有传入币种时使用）；`DueAnchor` = 你选的日期（文字）；`ReminderOffsets` = `[30,14,7,3,1,0,-1,-3,-7]`；`AutoGenerate` = TRUE；`GraceDays` = 0；`Status` = `Active`；`CreatedAt`、`UpdatedAt` 为 ISO |
| `ObligationOccurrences`（14 列） | `OccurrenceID`；`ObligationID` 相同；`EffectiveDue` = `DueAnchor` = 提示里的 First due（912:386）；`Amount` 等于规则金额；`Currency` = `MYR`；`Status` = **`Active`（不是 Paid）**；`PaidDate`、`PaidAmount`、`PaidVia`、`Evidence`、`ReversedAt`、`ReversalReason` 全空 |
| `ObligationHistory`（7 列） | `HistoryID` = `HIST-…`；`OccurrenceID` 对得上；`FromStatus` 空 → `ToStatus` = `Active`；`TriggeredBy` = `CreateOccurrence`（912:310） |

### D.5 失败路径（不应写入任何数据）
- 把 Amount 填成 `-5`：UI 只拦截 0、空和 NaN（945:825），所以会送到后端。
- 预期：红色提示 "Amount must be greater than 0."（代码 `INVALID_INPUT`）；没有成功文字；已填的值仍在；按钮恢复可点；三张表行数不变。
- 在 Node/GasShim 里已验证：该路径以及 PropertyID 不存在、类别不对、缺到期日，都不写入任何行。

### D.6 需要知道的事
- **重复提交会产生多条规则**：UI 不发送 `clientRequestId`，同样的输入保存两次会得到两条不同的规则（Node/GasShim 已验证）。**不要在生产里用重复保存来测试。**
- **没有删除功能**：Cancel 是终态，写错的一笔只能取消，或手工改表。所以第一笔请用真实账单数据，而不是随便填的测试值。
- **看板位置**：保存后账单按到期日出现在逾期、本周或即将到期的列表（922:78–90）；这三个列表在 Node/GasShim 里已验证。
- 可选：Apps Script 的执行日志里应有 `OBLIGATION_CREATED` 和 `REMINDER_REQUESTED` 的日志行（目前的事件 adapter 只写日志，不是持久事件）。

---

## E. 其他可能受影响的读取接口（只读，未修改）

方法：在 Node/GasShim 的内存 Sheets 里，把相应日期格子改成真正的 Date（模拟手工编辑或未设文字格式的列），再检查各接口的返回里是否带有 Date。

### E.1 返回里会带 Date 的接口

| 接口 | 数据来源（是否返回原始值） | 证据 | 严重度与信心 | 真实症状 |
|---|---|---|---|---|
| `console_listProperties`（946:61） | `Properties` 原始行 | 注入后带 `PurchaseDate`、`VPDate`（`…At` 也注入时再带 `CreatedAt`、`UpdatedAt`） | 已发生 | **有**，已用补丁处理，待你验证 |
| `console_getActiveInsurancePolicyForObligation`（946:133） | `PropertyInsurancePolicies` 原始行 | 带 `PolicyStartDate`、`PolicyExpiryDate`（`…At` 也注入时再带 `CreatedAt`、`UpdatedAt`） | 中低；信心中：该表在真实表里还不存在，将由脚本新建并设为文字格式，只有手工编辑后才会出现 Date | 无（功能未被使用） |
| `console_listInsurancePolicyHistoryForObligation`（946:139） | 同上 | 同上 | 同上 | 无 |
| `dlp_listSidebarDefects`（947:219） | 922 的缺陷 DTO，`submittedAt: defect.SubmittedAt`、`closedDate: defect.ClosedDate` 原样传出（922:208–209） | `SubmittedAt` 为 Date 时带 `$.data[0].submittedAt` | 中；信心中：取决于真实表里 `SubmittedAt` 是否为真日期 | 无（没有观察到） |
| `dlp_getSidebarDefectDetail`（947:239） | 同上 | 带 `$.data.defect.submittedAt` | 同上 | 无 |

### E.2 在同样的注入下没有带 Date 的接口

| 接口 | 说明 |
|---|---|
| `console_getDashboardSnapshot` | 逾期、本周、即将到期、近期付款四个列表都有内容（我另外补了夹具确认），日期字段以文字输出 |
| `console_getPaymentHistory` | 同上 |
| `console_getFormOptions` | 静态配置 |
| 各写入命令的返回值 | 建 Property、建 Obligation、付款、暂停、取消、保单创建与续保 |
| `dlp_listSidebarCorrespondence`、`dlp_getMobileBootstrap` | — |
| `dlp_getSidebarCaseDashboard`、`dlp_getCaseOverview`、`dlp_getMobileDefectDetail` | 返回 JSON 字符串，在边界上本来就不会带 Date；**未测试** Date 经 JSON 序列化后的时区偏移 |

### E.3 背景证据
922:240–249 的注释记录了项目自己在真机上的发现：日期列的文字格式只在表由脚本新建时设置，早于该设置的旧表没有这层保护，Date 格子因此会出现（2026-08-31 的 Overview 空白即为一例）。这与我对 Properties 表的根因解释一致，但**真实表里到底是哪一格是真日期，仍未确认**。

---

## F. 仍需要你在场才能做的事

1. 把补丁版 946 贴进 GAS 项目（并确认 945 是 `d1bf51ed…` 那份），然后打开 Operator Console 看 Property 下拉。
2. 可选：在 Apps Script 里临时加一个只读函数并运行，看哪些 Properties 列是真日期：

   ```js
   function probe() {
     var r = listActiveProperties()[0];
     Logger.log(Object.keys(r).filter(function (k) { return r[k] instanceof Date; }));
   }
   ```

   用完可以删掉。
3. 确认已部署的 901 里有 `coerceToIsoDateString_` 和 `toIsoDateTime_`。
4. 在 File → Settings 里确认电子表格时区与脚本时区（Asia/Singapore）一致。
5. 在真实浏览器里录第一笔 Water 账单，按 D 部分核对三张表，并做一次 `-5` 的失败测试。

---

## G. 建议的最小下一步

你回来后只做第 1 项：部署 946，打开控制台，确认下拉能选 Est8。成功后再按 D 部分录第一笔 Water 账单。

需要新授权的后续项，**只有在真实环境出现症状，或 `probe()` 指出具体的列之后才建议做**：
- 把同样的日期转换用到两个保单读取接口（946，改动很小）。
- 缺陷 DTO（922）是否也要处理，取决于真实表里 `SubmittedAt` 是否真的是日期。
- 把相关日期列重新设成文字格式，属于改动真实数据，需要单独授权并先备份。

---

## 边界确认
- 没有部署代码，也没有声称部署成功。
- 本轮没有访问生产数据，没有创建 Water、Electricity 或 MaintenanceFee 记录。
- 没有修改 910、912、900、901，也没有修改任何其他接口。
- 没有 schema 变更，没有新增账单字段。
- 没有改动 EventBus 架构，没有实作 912 F-01。
- 没有创建 ZIP、baseline 或替代的权威副本。
- Node/GasShim 的结果没有被当作真实 GAS 或浏览器验证。
