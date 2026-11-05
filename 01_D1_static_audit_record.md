# Property OS — D1 静态审查记录（Billing）

**CANDIDATE REPORT · NON-AUTHORITATIVE · STATIC INSPECTION ONLY**

| 项 | 内容 |
|---|---|
| 准备日期 | 2026-10-25 |
| 对象 | Water / Electricity / MaintenanceFee 账单录入（Add Bill 与 Pay）在 `50_Property-main.zip` 内非权威副本中的实现 |
| 方法 | 只读静态阅读。没有运行测试，没有执行任何应用函数，没有访问真实仓库、真实 GAS 或生产数据，没有修改任何源文件 |
| 与 D1 报告的关系 | 保留 D1 报告的结论原文，并逐条标明本次是否重新核对了源码。本次新增的观察单列在第 6 节，不混入 D1 原有结论 |
| 配套文件 | `02_D2_billing_test_matrix.md`、`03_decision_register.md`、`04_verification_tasks_waiting_real_env.md`（同一目录） |

## 0. 标签与读法

- **[S] 源码直接支持**：本次重读了所引用的行，源码文字与描述一致。只说明"源码这样写"，不说明运行时会怎样。
- **[R] D1 已报告、本次未独立重查**。
- **[I] 静态推断**：由 [S] 的代码结构推出，没有任何运行观察支持。不得当作观察结果。
- **[U] 运行时行为未验证**。
- **[T] 拟议目标行为**：未授权，需要用户批准。

核对方法：本次对 123 个"文件:行号 + 关键字"锚点做了机械核对，122 个通过。未通过的 1 个是 `945:663`，原因是引号转义使关键字没有匹配；经目视确认该行确含 `RM ` 前缀。另做了若干否定性检查：945 全文没有 `clientRequestId`；`createObligation` 函数体内没有重复查找调用（只有 `propertyExists_` 与 `createOccurrence_`）；`recordPayment` 函数体内没有 `> 0`、`isNaN`、`isFinite`；现有 UI 测试没有引用 Pay、看板、暂停/取消、付款历史、表单选项的任何函数。

## 1. 来源与来源限制

- 源文件：`50_Property-main.zip`，路径 `/mnt/user-data/uploads/50_Property-main.zip`，1,277,278 字节。
- SHA-256：`ef21e91ae9ab51f1dd1abe4b445f7edd6fa4e45e153fcc680b294083fe63642c`。本次用 python hashlib 与 `sha256sum` 两种方法重新计算，与预期值一致，来源闸门 PASS。
- 来源限制：
  1. zip 注释含 `412d78bea0ea883012cec59311a2a10ba98960aa`（40 位十六进制）。它只是 zip 的自述，不是从仓库取得的元数据。该提交是否存在于真实仓库未验证（B-4 recovery 检查点状态：BLOCKED — REPOSITORY PROVENANCE UNVERIFIED）。
  2. zip 含 `.clasp.json` 与 `appsscript.json`，表明这是 clasp 管理的 GAS 项目。已部署的 GAS 源码未检查。
  3. 根目录四个治理文件与 2026-10-16 候选副本逐字节相同（B-3）。它们是候选，不是权威。本文引用治理候选内容处都会标明。
  4. 所有源文件按"非权威副本"处理。文中行号只对这些副本有效；若真实源文件不同，行号会漂移。
  5. 本次没有读取真实仓库、RECONCILED zip 或 Drive 副本，也不依赖它们。
  6. 登记里的 V1–V5（真实仓库身份、目标提交、四个治理文件真实内容、治理文件合并资格、945/946 当前权威版本）仍未解锁。

## 2. 版本标识

### 2.1 D1 报告列出的九个文件

D1 报告只给出前缀。本次重算完整值并核对前缀。

| 文件 | D1 报告的前缀 | 本次重算的完整 SHA-256 | 字节 | 前缀一致 |
|---|---|---|---|---|
| `945_OperatorConsole.html` | `d1bf51ed…` | `d1bf51ed80b92ad3bd8a31ad6f367881a93eace2a1124e95d286006f07845651` | 74151 | 是 |
| `946_OperatorConsoleServer.js` | `e993b71b…` | `e993b71baed38686b17906e42587341ee98a1f531b53c7b544c5e86f5eebae26` | 8238 | 是 |
| `912_ObligationEngine.js` | `8a40643e…` | `8a40643e21994b004da4e1790edef8fec75d0487a17f6fc9894a5c2315087839` | 47784 | 是 |
| `913_ObligationScheduler.js` | `af0d3f4e…` | `af0d3f4e4ef48682d85cbe393a8ce7a7e055d59a00cc947b4a3aa970c2752dd8` | 8389 | 是 |
| `901_PropertySchema.js` | `4f8c6e80…` | `4f8c6e8012623940f34c81ee1d16a4a10795e6d7374ad802f6fff6a81014ac60` | 39632 | 是 |
| `900_PropertyConfig.js` | `f3758c2f…` | `f3758c2fee136a91ee7d93a20a0ba857b0ba57c1aa56e7a0543e764ce6697bb3` | 12384 | 是 |
| `903_PropertyEventDefinitions.js` | `43a136bc…` | `43a136bc8eb2d40a047d08d69e9df9407f784e7db99abbe6f23099f60940ea6b` | 10163 | 是 |
| `922_DashboardAdapter.js` | `589fbb51…` | `589fbb51639819d0c53e72db00d0ca28d94b6ae09de894b75427590d22e56a1a` | 27928 | 是 |
| `911_DocumentEngine.js` | `382615c9…` | `382615c9580ca6520101c93d2f1252cada12303886213b3ba71f9e58f00f1802` | 13414 | 是 |

### 2.2 本次另外使用的文件

| 文件 | 完整 SHA-256 | 字节 | 用途 |
|---|---|---|---|
| `902_PropertyIdentity.js` | `2eba63925984177e41fe1e63810dbeebd49e43c5b7e257242360bd0510a612a5` | 3902 | `assertIdPrefix_`（ID 前缀校验） |
| `GasShim.js` | `9a1b01e96cfc2569df44fc787dc7ec4100c15860eac9949c3b6574ef3d0024b1` | 7264 | Node 模拟环境能力与限制 |
| `runAllTests.js` | `2fdf7ce668b680ea5de105adf856222a1cc74e297bca08fe31defb3de95717ed` | 1538 | 旧 Node 运行器的目录假设 |
| `appsscript.json` | `942d16df0888062aba94b86e615493930f77ac6c5a1efc9eb0b1a9429f5658c8` | 199 | 脚本时区与 webapp 设置 |
| `ObligationEngine_VerticalSlice.md` | `8c2f5376582f8db86b3b67b9edfd1340ee08168bfa53be0abbd6ffa795d318a8` | 20457 | 规格中已确立的行为 |
| `local_precheck_test_945_addBill_ui.js` | `3ff79df91e79a1edb5dce49072602ea202cfbf181ac22b5f5da3839cc94b7be8` | 20802 | 现有 UI 测试的覆盖与缺口 |
| `Billing_Real_Environment_Checklist.md` | `14ad69db46ecfe5a16894ea4b935df34cfc8b5dc8612d2086bb5d79f6cf7f9f3` | 6584 | 现有真实环境核对清单 |
| `00_Product_Backlog.js` | `0bb2d177c7057afb9abb29ea324cdd47bb04714c06bfdfa79948fb58aaf942ae` | 103712 | 治理候选文件（非权威；仅用于对照候选条目编号） |

## 3. 调用链（行号均已核对 [S]；运行时行为 [U]）

### 3.1 Add Bill

1. **表单与提交**：控件 `ob_amount`（945:261）、`ob_dueAnchor`（274）、`ob_endDate`（316）、提交按钮 `ob_submit`（322）。`submitAddBill`（945:866）先做客户端检查：Property、Category、Payee、Amount、Due Date 任一为空即提示"Please fill in Property, Category, Payee, Amount, and Due Date."（897–898）。通过后 `btn.disabled = true`（922），调用 `.console_createObligation(input)`（966）。请求体不含币种（866–967 范围内没有 currency）、不含 `clientRequestId`（945 全文没有该字符串）。
2. **服务端包装**：`console_createObligation`（946:92）经 `console_wrap_`（946:45–51）。成功返回 `{success:true, data}`，异常返回 `{success:false, error:e.message, code:e.code||''}`。
3. **引擎** `createObligation`（912:333）：在 `withObligationLock_`（912:57；`tryLock(30000)` 在 59）内执行。
   - 若带 `clientRequestId`，先读幂等缓存（338）。
   - 校验（343–361）：`propertyId` 前缀与存在性、Category 枚举、Frequency 枚举、Custom 需要正的 `customIntervalDays`、`Number(input.amount) > 0`（356）、`dueAnchor` 非空（359）。错误信息：`No Property found for <id>`、`Unknown category: <x>`、`Unknown frequency type: <x>`、`Custom frequency requires a positive customIntervalDays.`、`Amount must be greater than 0.`、`dueAnchor (yyyy-MM-dd) is required.`。
   - 规则行：Payee 缺省 `''`（370），Amount 为 `Number(input.amount)`（371），Currency 缺省 `PROPERTY_CONFIG.DEFAULT_CURRENCY`（372；900:44 为 `'MYR'`）。
   - 追加 Rule 行（384）；创建首个 Occurrence（386 → `createOccurrence_` 293–312：追加 Occurrence 行 309，写 History 行 310，内容为 `'' → 'Active'`、TriggeredBy `'CreateOccurrence'`）。
   - 在 try/catch 内发布两个事件（394–415）。失败时调用 `logPartialFailure_`（91）并重新抛出（414）。
   - 仅当带 `clientRequestId` 时，成功后才写幂等缓存（423）；返回 `{success, obligationId, occurrenceId, rule}`（417–424）。
4. **事件**：`publishPropertyEvent_`（903:180）只调用 `Logger.log`（187），是占位实现。`buildPropertyEvent_`（135）按 `PROPERTY_EVENT_REQUIRED_FIELDS`（903:77–99）检查必填字段。
5. **回到 UI**：成功回调（945:925–931）：失败则恢复按钮并弹出 `res.error`；非保险类别则恢复按钮、弹出 `billSavedMessage_('Bill added.', res.data)`（928，10 秒）、清空 payee 与 amount（929–930）、调用 `loadDashboard()`（931）。

### 3.2 Pay

1. **表单**：`showPayForm`（945:811）。默认日期 `new Date().toISOString().slice(0, 10)`（818，UTC 日期）；默认金额取 `expectedAmount`（820）。确认按钮点击后置 disabled（831），读取金额字段值（832），调用 `.console_recordPayment(item.occurrenceId, amount, date, '')`（841；note 恒为空串）。成功回调判断 `res.success`（836），弹出 `Payment recorded.`（837）。
2. **包装**：`console_recordPayment`（946:98）：`paidAmount: Number(paidAmount)`（102）。不传 `paidVia` 与 `evidence`。
3. **引擎** `recordPayment`（912:492）：
   - 期次已 Paid 则直接返回 `alreadyPaid`（506）。
   - 规则为 Cancelled 则拒绝，错误码 `OBLIGATION_CANCELLED`（521–526）；只检查 Cancelled。
   - `paidDate` 缺省取脚本时区当日（532）；`input.paidAmount != null` 时取 `Number(...)`（533）；`paidVia` 缺省 `'Manual'`（534）；`Evidence: input.evidence`（544）。
   - 之后依次：写 History（559）、发布事件、`scheduleNextOccurrence_`（578；913:161）。后续步骤失败时记录部分失败并重新抛出（587）。
   - 函数体内没有对 `paidAmount` 的 `> 0`、`isNaN`、`isFinite` 检查，也没有对 `paidDate` 的格式检查。
4. **下一期**：`scheduleNextOccurrence_`（913:161）：`AutoGenerate` 为假则不生成（162）；规则非 Active 则不生成（163）；下一期日期由上一期次的 `EffectiveDue` 推算（165–166）；超过 `EndDate` 则把规则转为 Completed 而不生成（173）；否则 `createOccurrence_(rule, …)`（179），金额取规则的预计金额（912:302）。

### 3.3 读回

- `loadDashboard`（945:616；成功判断 623）→ `getDashboardSnapshot`（922:76）：`dueThisWeek`（83）、`dueUpcoming`（86）、最近付款 `limit: 10`（89）→ `renderDashboard`（945:633）渲染逾期、本周、30 天内、最近付款四个列表与本月合计。
- 查询函数：`queryUpcomingPayments`（912:811；日期窗口判断 828）、`queryOverdue`（846）、`queryRecentPayments`（882）。
- 付款历史：`console_getPaymentHistory`（946:166）；表单选项：`console_getFormOptions`（184）。
- `946` 的 `console_*` 函数全集：`console_getDashboardSnapshot`、`console_listProperties`、`console_createProperty`、`console_createObligation`、`console_recordPayment`、`console_pauseObligation`、`console_cancelObligation`、`console_createInsurancePolicy`、`console_renewInsurancePolicy`、`console_getActiveInsurancePolicyForObligation`、`console_listInsurancePolicyHistoryForObligation`、`console_getPaymentHistory`、`console_getFormOptions`。其中没有"列出全部 Obligation""按 ID 查询""更新""恢复"。

## 4. 现有 schema 与缺失的账单信息 [S]

- `ObligationRule`（901:23–40）：`ObligationID`, `PropertyID`, `LoanID`, `LeaseID`, `Category`, `Payee`, `Amount`, `Currency`, `FrequencyType`, `CustomIntervalDays`, `DueAnchor`, `ReminderOffsets`, `AutoGenerate`, `GraceDays`, `EndDate`, `Status`, `CreatedAt`, `UpdatedAt`
- `ObligationOccurrence`（901:50–63）：`OccurrenceID`, `ObligationID`, `EffectiveDue`, `Amount`, `Currency`, `Status`, `PaidDate`, `PaidAmount`, `PaidVia`, `Evidence`, `ReversedAt`, `ReversalReason`, `CreatedAt`, `UpdatedAt`
- `ObligationHistory`（901:78–85）：`HistoryID`, `OccurrenceID`, `FromStatus`, `ToStatus`, `ChangedAt`, `TriggeredBy`, `Note`
- History 以 OccurrenceID 为键，只追加（901:73 注释）。创建账单只写一行；规则行本身没有历史记录。
- schema 中没有对应列的账单信息：**账期、开单日、账单编号、账单备注、收据图片**。`Note` 只在 History 里随状态转换写入（Pay 路径 UI 传空串）；`Evidence` 列存放 DocumentID（见 G2）。
- 币种：Rule 与 Occurrence 都有 `Currency` 列。Add Bill 不发币种，缺省 `'MYR'`；看板金额前缀硬编码为 `RM `（945:639、641、663）。

## 5. 发现 G1–G9

每条先"逐字保留 D1 原述"，再写本次核对。"RECHECKED-STATIC" 的含义：本次重读了源码，源码文字与原述一致，只确认源码这样写；"REPORTED-ONLY" 表示本次没有重查。所有后果性描述的运行时状态均为 UNVERIFIED。

### G1（需求或数据模型）
- D1 原述：账期、开单日、账单编号、备注无处记录（901:23–63）。
- 本次：RECHECKED-STATIC [S]。三张表的列里没有这些信息（见第 4 节）。

### G2（需求或数据模型）
- D1 原述：收据证据：`Evidence` 列与 `recordPayment` 都支持，但 946 不传、945 没有输入。`attachEvidence` 又必须绑定 PropertyCase（911:203），账单没有 Case，所以现在没有产生 DocumentID 的途径。
- 本次：RECHECKED-STATIC [S]。`Evidence` 列（901:59）、`recordPayment` 读取 `input.evidence`（912:544）、946 包装不传（946:98–107）、945 只传空串 note（945:841）。911 共 12 个函数，创建 Evidence 的只有 `attachEvidence`（911:194），它要求 `relatedCaseId`（203）。**其他模块是否存在不依赖 Case 的 DocumentID 创建路径，本次没有搜索。**

### G3（需求或数据模型）
- D1 原述：水电账单每期金额不同：规则金额只是预计值，实际金额只在 Pay 时记录，下期仍预填预计值。console 无法修改预计金额。
- 本次：RECHECKED-STATIC [S]。`createOccurrence_` 取规则金额（912:302）；下一期经 `createOccurrence_`（913:179）沿用；Pay 表单默认金额为 `expectedAmount`（945:820）；`updateObligation` 存在（912:433），但 946 没有对应的 console 包装。

### G4（需求或数据模型）
- D1 原述：币种治理未定义：UI 不发，服务端默认，传入也不校验。
- 本次：RECHECKED-STATIC [S]。945 的 `submitAddBill` 没有 currency；服务端 `input.currency || DEFAULT_CURRENCY`（912:372）；校验段（343–361）没有币种检查。"治理未定义"属于判断，本次没有查找治理文件，状态 REPORTED-ONLY。

### G5（行为与缺陷）
- D1 原述：重复与部分写入：UI 不发 `clientRequestId`、无去重、非原子写入，重试会重复或留孤儿。规格 §11 写"all-or-nothing"，实现按 D9 明确选择非原子，这是已有的规格与实现分歧，需要你决定。
- 本次：RECHECKED-STATIC。[S] 945 没有 `clientRequestId`；`createObligation` 没有重复查找调用；服务端缓存只在带 id 且成功后写入（912:338、423）；Rule→Occurrence（384→386）与 Occurrence→History（309→310）两步没有保护；事件步骤失败只记日志并重新抛出（394–415）；`logPartialFailure_` 的文字提到 D9（912:91 起）；规格 §11 的 Recovery Strategy 在 `ObligationEngine_VerticalSlice.md:272`。[I] "界面报失败时数据可能已写入""重试会重复或留孤儿"是由上述结构推出的静态推断，未被运行观察。

### G6（行为与缺陷）
- D1 原述：Pay：空金额经 `Number('')` 记成 0，负数与 NaN 无校验。默认日期取 UTC（945:818）。`alreadyPaid` 也显示"Payment recorded."（836–838）。中途失败后无法靠重试补完。
- 本次：RECHECKED-STATIC。[S] 945:832 读取字段值字符串，946:102 `Number(paidAmount)`，912:533 `!= null` 判断，`recordPayment` 无数值校验；945:818 用 `toISOString()`；912:506 对已付直接返回，945:836–837 对任何 `success:true` 都提示 `Payment recorded.`；912:587 在后续步骤失败时重新抛出。[I] "空金额记成 0""中途失败后重试不会补完缺失步骤"是静态推断。

### G7（行为与缺陷）
- D1 原述：服务端不校验 dueAnchor 格式与 EndDate，`parseIsoDate_` 对坏字符串不报错（901:734）。UI 的日期控件掩盖了它，API 调用方不会。
- 本次：RECHECKED-STATIC [S]。912:359 只检查 `dueAnchor` 非空；没有 EndDate 检查；`parseIsoDate_`（901:734–737）是 `new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))`，没有抛错。"UI 的日期控件掩盖了它"属判断，状态 REPORTED-ONLY。

### G8（行为与缺陷）
- D1 原述：首期晚于 30 天的账单保存后不会出现在看板，无法在界面核对。
- 本次：RECHECKED-STATIC。[S] 窗口为今天到 +7、+7 到 +30（922:76–98；912:828），946 没有列表或按 ID 查询函数。[I] 由此推出 +30 天之外的新账单在界面不可见。

### G9（行为与缺陷）
- D1 原述：空响应与缺失 error 文字的 4 项已知缺陷。
- 本次：RECHECKED-STATIC [S]。现有 UI 测试中有 4 处 `knownDefect(`（`local_precheck_test_945_addBill_ui.js` 238、239、241、244）。这些断言本次没有执行；缺陷的具体表现以测试文件的标注为准。

## 6. 本次追加观察（不属于 D1 原报告；均为静态）

- **AO-1** 首期恰为 +7 天时可能同时出现在 "Due This Week" 与 "Upcoming (30 days)"：`dueThisWeek` 的区间到 `weekEnd`，`dueUpcoming` 的区间从 `weekEnd` 起（922:83–88），而区间判断对两端都取闭区间（912:828）。[S] 结构；[I] 结果。
- **AO-2** 过期但仍在宽限期内的期次可能不出现在任何列表：`isOccurrenceOverdue_` 只有"今天严格晚于到期日加宽限天数"才为真（913:107–114），而 `queryUpcomingPayments` 的窗口从今天开始（912:828）。[S] 结构；[I] 结果。
- **AO-3** 看板金额前缀硬编码为 `RM `，不随记录里的 Currency 变化（945:639、641、663）。[S]
- **AO-4** 下一期日期从"上一期次的到期日"推算（913:165–166），月末截断（`addMonthsClamped_`，913:52）可能让日期逐期漂移，例如 1 月 31 日 → 2 月 28 日 → 3 月 28 日。[S] 结构；[I] 示例。
- **AO-5** `recordPayment` 只拒绝 Cancelled 规则（912:521）；Suspended 规则仍可付款；规则非 Active 时不生成下一期（913:163）。`RULE_TRANSITIONS_`（912:133–139）里 Cancelled 与 Completed 没有出边。[S]
- **AO-6** Pay 的成功回调与看板加载回调都直接读 `res.success`（945:836、623），没有对 null 响应的保护；现有 UI 测试没有覆盖这两处。[S] 结构与"无测试引用"；[I] null 响应时抛 TypeError。
- **AO-7** Node 模拟环境的限制 [S]：`tryLock` 恒为 true（GasShim.js:148）；缓存没有 TTL（162）；`formatDate` 忽略时区参数（169）；shim 的 `getScriptTimeZone` 返回 `Asia/Kuala_Lumpur`（180），而 `appsscript.json` 写的是 `Asia/Singapore`；`appendRow` 不模拟 Sheets 对日期样字符串的转换（97）；`OBLIGATION_ENGINE_FILES` 不含 910 与 922（224）；`runAllTests.js` 引用 `./tests/…`（11），而 zip 是扁平布局，没有 `tests/` 目录。
- **AO-8** `createObligation` 的事件步骤没有找到"自然触发失败"的输入：必填字段 `obligationId`、`propertyId`、`category`（903:79）与 `obligationId`、`occurrenceId`、`effectiveDue`、`offsets`（903:99）都由已校验的输入或默认值提供。因此事件步骤失败只能靠故障注入或未预见的运行时错误。[S] 结构；这是阅读结论，不是穷尽证明。
- **AO-9** 规格内部与规格—实现之间的命名不一致：规格第 147 行写 `OBLIGATION_CANCELLED`，第 271 行写 `OBLIGATION_CANCELLED_IMMUTABLE`，代码用 `OBLIGATION_CANCELLED`（912:523）。[S]

## 7. 拟议的最小修改方案 — 全部 NOT AUTHORIZED

下面是 D1 报告里的候选方案，**没有任何一项获得授权，没有任何一项被开始实施**。"≈ BL-xx" 指治理候选文件里的候选条目，其来源未核实，也未批准。

- **M0 不改代码**：保存前先查 `ObligationRules`，失败后先查表再重试（`Billing_Real_Environment_Checklist.md` v2 已写）。
- **M1 仅 945**：Pay 表单加金额与日期校验；日期取本地日；`alreadyPaid` 单独提示；null 响应保护（≈ BL-23）；Add Bill 生成并复用 `clientRequestId`。后者只能挡住"首次其实成功了"的重复，挡不住部分写入。
- **M2 912 / 946，不改 schema**：校验 dueAnchor、EndDate、paidAmount、paidDate；包住 Rule→Occurrence 与 Occurrence→History 两步，让失败大声（≈ BL-24）；G2 有结论后再让 946 透传 `paidVia` / `evidence`。
- **M3 需要用户决定**：账单细节放哪里（逐期事实更适合放 Occurrence）、是否区分"开单金额"与"付款金额"、收据存储路径、是否新增只读的账单列表查询、原子性与去重的目标语义（规格 §11 对 D9）。
- D1 建议的顺序：M1 → M2 → 把 M3 的决定项逐个定下来再碰 schema。这只是建议。

## 8. 现有测试覆盖与已知缺口

- **现有 UI 测试** `local_precheck_test_945_addBill_ui.js`（本次未执行）：[R] 覆盖 Property 下拉各状态、客户端校验、提交中禁用、成功与失败提示、保险第二步；带标签的断言包括 176（负数金额会到达服务端）、191（提交中按钮禁用）、195（成功提示含 Obligation ID）。4 处已知缺陷在 238、239、241、244。
- **没有任何覆盖** [S]：Pay 表单、看板渲染、暂停/取消、付款历史、表单选项加载（测试文件不含相应函数名）。
- **服务端与其他测试文件**（本次未运行，通过状态未知）：`900_Tests_Foundation.js`, `912_Tests_ObligationEngine.js`, `919_Tests_ObligationIntegration.js`, `990_TestKit.js`, `991_Tests_ObligationEngine.js`, `992_Tests_PureLogic.js`, `993_Tests_FullLifecycle.js`, `994_Tests_ExtendedPlatform.js`, `995_RunAllTests.js`, `996_Tests_PropertyAssetEngine.js`, `999_Tests_PlatformVerification.js`, `TestKit.js`, `local_precheck_test_911.js`, `local_precheck_test_918.js`, `local_precheck_test_922.js`, `local_precheck_test_945_addBill_ui.js`, `local_precheck_test_946_listProperties.js`, `local_precheck_test_947.js`, `local_precheck_test_948_rectification.js`, `local_precheck_test_948_search.js`, `local_precheck_test_phase11_defectitem_reorder_migration.js`, `local_precheck_test_phase11_schema_consolidation_migration.js`, `local_precheck_test_phase11_schema_migration.js`, `runAllTests.js`, `runPhase5SmokeTest.js`
- **治理候选文件里的测试数字**（如 52/52、15/15、9/9）：只存在于候选文档与 handoff，本次没有独立核实，也没有运行。
- **真实 GAS**：`Billing_Real_Environment_Checklist.md` v2 存在；它是否已被执行没有任何证据。

## 9. 静态检查、模拟测试、真实 GAS 验证的区别

| 层 | 能证明什么 | 本记录里的状态 |
|---|---|---|
| 静态检查 | 源码这样写 | 已做（第 3–6 节） |
| 模拟测试（Node / GasShim / 假 DOM） | 在模型内的行为；受 shim 保真度限制 | **本次没有运行任何模拟测试**；现有测试断言只是被引用 |
| 真实 GAS 验证 | 真实环境（Sheets、锁、缓存、`google.script.run` 序列化、时区）下的行为 | **没有任何真实验证** |

静态推断（[I]）不得写成观察结果；模拟测试结果不得写成真实 GAS 验证。

## 10. 未决事项与验证闸门

- 需要用户决定的问题见 `03_decision_register.md`。
- 必须等真实仓库或真实 GAS 才能做的验证见 `04_verification_tasks_waiting_real_env.md`。
- 闸门摘要：V1–V5（仓库与版本）未解锁，因此任何候选补丁都不能被当作"针对权威基线"；V6（真实保存流程）需要单独授权与测试数据策略；V7（EventBus）与 V8（912 F-01）本记录一概不涉及。

## 11. 限制与非声明

- 本记录不证明任何行为在运行时成立，不证明 zip 是权威基线，也不证明已部署的 GAS 与 zip 一致。
- 文中行号都来自本次对这些副本的读取。其中 123 个经过"文件:行号 + 关键字"的机械核对；少数行号（例如 945:641、913:161）是在读取输出里看到、或由相邻锚点推出的。若真实源文件与这些副本不同，行号会失效。
- 本记录不批准任何修改、合并、部署或生产数据操作；不涉及 EventBus 选择与 912 F-01。
