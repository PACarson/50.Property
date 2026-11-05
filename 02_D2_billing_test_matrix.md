# Property OS — D2 Billing 测试矩阵（设计稿，未执行）

**CANDIDATE TEST DESIGN · NOT EXECUTED · NON-AUTHORITATIVE SOURCE**

准备日期：2026-10-25 · 配套文件：`01_D1_static_audit_record.md`（下称"D1 记录"）· 来源：`50_Property-main.zip`，SHA-256 `ef21e91ae9ab51f1dd1abe4b445f7edd6fa4e45e153fcc680b294083fe63642c`（本次已重算，闸门通过）。

本文只是设计。没有运行任何测试或应用函数，没有创建任何测试 Property 或账单，没有读取或写入真实数据，没有修改任何文件。

## 0. 阅读规则

**状态**
- **CHARACTERIZATION**：记录当前行为，不表示行为正确。
- **TARGET**：拟议的验收标准。除非已被明确确立，需要用户批准。本矩阵只在行为已被规格确立时使用 TARGET，并在 Desired 栏注明来源；其他需要目标行为的地方一律写 BLOCKED，并指向决定项 DR-xx。
- **BLOCKED**：需要决定、缺少源码，或需要真实环境验证。

**层**：static = 只读源码；simulated = Node + 假 DOM（UI）或 Node + GasShim（服务端）；real GAS = 真实 Apps Script / Sheets / 浏览器。模拟结果不得写成真实 GAS 验证。

**四类信息分开标注**
1. 源码直接支持的发现：[S]
2. D1 已报告、本次未独立重查：[R]
3. 运行时行为未验证：[I]（静态推断）或 [U]
4. 拟议目标行为（未授权）：只出现为 Desired 栏里的 "DR-xx"

**"Current" 栏的性质**：全部是对源码的静态预测，不是观察结果。源码不足以支持的写 UNKNOWN。**"Desired" 栏**只写已确立的行为并给出来源（规格 `ObligationEngine_VerticalSlice.md` 的行号）；没有就写"无已确立目标"。

**锚点写法**：`945:898` 表示 `945_OperatorConsole.html` 第 898 行；`946` = `946_OperatorConsoleServer.js`；`912`、`913`、`922`、`900`、`901`、`902`、`903`、`911` 为同编号源文件；`GasShim` = `GasShim.js`；`Spec` = `ObligationEngine_VerticalSlice.md`；`UItest` = `local_precheck_test_945_addBill_ui.js`。

## 1. 共用定义

**前置条件**
- **P-UI**：Node 中用假 DOM 加载 945（沿用 `UItest` 的方式），`google.script.run` 由可编程假实现替代，不连接任何服务端。
- **P-SRV**：Node + GasShim 加载 900、901、902、903、910、912、913（看板类用例另加 922），并种入 Properties 夹具行。需要 harness 调整（H-1、H-6），具体做法 UNKNOWN，见 DR-15。
- **P-REAL**：真实仓库与部署版本已确认（V1–V5），并已就真实写入获得单独授权（DR-01、DR-02）。当前全部未满足。

**测试数据**
- **DS-1**：合成夹具。Property P1（`PROP-` 前缀 ID，名称 "FIXTURE Unit A"）；payee "FIXTURE-PAYEE-<类别>"；常规金额 42.50；日期用相对偏移（today±N，today = 脚本时区当日）。只存在于模拟上下文，不得写入真实表。
- **DS-2**：在 DS-1 基础上增加 Property P2，两个 Property 各有若干 Obligation。
- **DS-3**：边界日期集：today−2、−1、0、+7、+8、+30、+31。

**清理**
- **CL-SIM**：每个用例新建 `loadPropertyOSContext`（GasShim 不共享状态），丢弃即可，无需清理。
- **CL-REAL**：没有可用的清理手段。History 只追加（901:73），规则 Cancelled / Completed 是终态（912:133–139），`946` 没有删除或更新包装。真实写入因此基本不可逆；在 DR-02 决定前，所有真实写入用例保持 BLOCKED。

**Harness 限制（影响所有 simulated 用例）**
- **H-1**：`runAllTests.js` 引用 `./tests/…`（第 11 行），而 zip 是扁平布局、没有 `tests/` 目录；直接运行会找不到模块，需要重建目录布局。
- **H-2**：`tryLock` 恒为 true（GasShim:148）→ 无法模拟锁竞争与超时。
- **H-3**：缓存没有 TTL（GasShim:162）→ 无法模拟 1 小时过期（912:110 为 3600 秒）。
- **H-4**：`formatDate` 忽略时区参数（GasShim:169）；shim 的 `getScriptTimeZone` 返回 `Asia/Kuala_Lumpur`（180），`appsscript.json` 写 `Asia/Singapore`（同为 UTC+8，但两者不一致）。时区边界用例要靠设置进程 TZ，保真度有限。
- **H-5**：`appendRow` 不模拟 Sheets 对日期样字符串的自动转换（GasShim:97）。
- **H-6**：`OBLIGATION_ENGINE_FILES`（GasShim:224）不含 910（`propertyExists_`）与 922；`912_Tests_ObligationEngine.js` 与 `919_Tests_ObligationIntegration.js` 没有引用 910 或属性夹具，`991_Tests_ObligationEngine.js` 引用 910。
- **H-7**：UI 假 DOM 的保真度未评估（例如是否尊重 disabled 按钮不触发点击）。

---

## A. Add Bill 与读回（Water · Electricity · MaintenanceFee）

#### D2-A01 — 合法 Add Bill 的服务端结果（a Water · b Electricity · c MaintenanceFee）
- **Scenario**：以合法输入各添加一张账单，核对三张表、事件日志与返回值。
- **Pre**：P-SRV；DS-1。
- **Inputs**：propertyId=P1；category=Water（a）/ Electricity（b）/ MaintenanceFee（c）；payee="FIXTURE-PAYEE-<类别>"；amount=42.50；frequencyType=Monthly；dueAnchor=today+10；graceDays=0；autoGenerate=true；不带 endDate；不带 clientRequestId。
- **Current**：校验通过（912:343–361）。Rule 行 +1：Amount 42.5（912:371）、Currency `MYR`（372）。Occurrence 行 +1：EffectiveDue=dueAnchor，Amount 取规则金额（302）。History 行 +1：`'' → Active`，TriggeredBy `CreateOccurrence`（310）。两条事件日志：OBLIGATION_CREATED、REMINDER_REQUESTED（394–406；903:187）。返回 `{success, obligationId, occurrenceId, rule}`（417–424）。三个子用例除 category 外结果相同。[S 结构 / I 结果]
- **Desired**：无已确立目标（本用例只固定当前行为）。
- **Layer**：simulated（服务端）；真实验证见 D2-A04。
- **Data · cleanup**：DS-1；CL-SIM。
- **Risk**：行数与列值的精确断言要等首次观察后才能固化；Occurrence.Currency 沿用规则币种只是推断 [I]。
- **Status**：CHARACTERIZATION

#### D2-A02 — 类别与频率下拉的数据来源
- **Scenario**：页面加载后 Category 与 Frequency 下拉由服务端选项填充，且包含三个目标类别。
- **Pre**：P-UI；假的 `console_getFormOptions` 返回 900 中的类别与频率清单。
- **Inputs**：执行 `init()`（945:453–463）。
- **Current**：`loadFormOptions` 调用 `console_getFormOptions`，用 `fillSelect` 填充 `ob_category` 与 `ob_frequencyType`（945:1059–1064）。类别清单从 900:24 起，包含 Water、Electricity、MaintenanceFee [S]。真实 `console_getFormOptions`（946:184）的返回内容 UNKNOWN（本次只核对到函数位置）。
- **Desired**：无已确立目标。
- **Layer**：simulated（UI）。
- **Data · cleanup**：假选项；CL-SIM。
- **Risk**：假选项不能证明真实服务端返回。
- **Status**：CHARACTERIZATION

#### D2-A03 — 各频率类型的首期创建
- **Scenario**：六种频率各建一条规则，核对首期与规则行。
- **Pre**：P-SRV；DS-1。
- **Inputs**：category=Water；frequencyType ∈ {Weekly, Monthly, Quarterly, HalfYearly, Yearly, Custom(customIntervalDays=14)}；其余同 A01。
- **Current**：频率只影响下一期的计算，首期都在 dueAnchor（912:386；913:68–95）[S 结构]。Custom 要求正的 customIntervalDays（912:353–355）。规则行里 FrequencyType 与 CustomIntervalDays 的落库写法（非 Custom 时是否为空）UNKNOWN。
- **Desired**：无已确立目标。
- **Layer**：simulated（服务端）。
- **Data · cleanup**：DS-1；CL-SIM。
- **Risk**：无。
- **Status**：CHARACTERIZATION

#### D2-A04 — 真实 GAS：Add Bill 与保存（a Water · b Electricity · c MaintenanceFee）
- **Scenario**：在真实环境为每个类别录入一张真实账单并确认保存成功。
- **Pre**：P-REAL；`Billing_Real_Environment_Checklist.md` v2 的相应步骤。
- **Inputs**：由 DR-02 决定；本文不提供真实数据。
- **Current**：UNKNOWN。D1 的静态结论不能替代真实结果；`ObligationRules` / `ObligationOccurrences` 在真实表里的状态本次没有任何证据。
- **Desired**：无已确立目标。
- **Layer**：real GAS。
- **Data · cleanup**：见 CL-REAL；需要 DR-02。
- **Risk**：写入不可逆（CL-REAL）；会产生真实账单。
- **Status**：BLOCKED（V1–V6、DR-01、DR-02）

#### D2-A05 — 真实 GAS：三张表读回
- **Scenario**：A04 之后核对 `ObligationRules`、`ObligationOccurrences`、`ObligationHistory` 的行数与字段。
- **Pre**：A04 已完成。
- **Inputs**：只读查看三张表。
- **Current**：UNKNOWN。
- **Desired**：无已确立目标。
- **Layer**：real GAS。
- **Data · cleanup**：只读，无写入。
- **Risk**：依赖 A04。
- **Status**：BLOCKED

#### D2-A06 — 账单与历史记录的关系
- **Scenario**：确认创建账单只产生以 OccurrenceID 为键的一行 History，规则本身没有历史行。
- **Pre**：P-SRV；DS-1。
- **Inputs**：执行 A01a 后读取三张表。
- **Current**：History 行只含 OccurrenceID，没有仅以 ObligationID 为键的行；创建时只有一行（912:310；901:78–85）[S 结构 / I 结果]。
- **Desired**：无已确立目标。
- **Layer**：simulated（服务端）。
- **Data · cleanup**：DS-1；CL-SIM。
- **Risk**：无。
- **Status**：CHARACTERIZATION

#### D2-A07 — 成功后的界面反馈与副作用
- **Scenario**：Add Bill 成功后的提示、表单与看板刷新。
- **Pre**：P-UI；假服务端返回 `{success:true, data:{obligationId, rule:{DueAnchor}}}`。
- **Inputs**：填写合法表单并点击保存。
- **Current**：非保险类别：恢复按钮、提示以 `Bill added.` 开头并带 Obligation ID 与首期日期、持续 10 秒（945:925–928）；清空 payee 与 amount（929–930）；`loadDashboard()` 调用一次（931）。提示文字格式由 `billSavedMessage_`（1698）决定 [S]。
- **Desired**：无已确立目标。
- **Layer**：simulated（UI）。`UItest` 195 已有同类断言 [R]（本次未执行）。
- **Data · cleanup**：假响应；CL-SIM。
- **Risk**：只验证 UI 对假响应的反应。
- **Status**：CHARACTERIZATION

---

## B. 校验

#### D2-B01 — UI：Property 状态导致的提交拦截
- **Scenario**：Property 下拉在 加载中 / 加载失败 / 为空 时提交。
- **Pre**：P-UI。
- **Inputs**：三种状态各提交一次。
- **Current**：弹出对应提示，不发请求：空 → "No properties available. Please add a property before creating a bill."（945:885）；加载失败 → 以 "Properties failed to load" 开头（889）；加载中 → 以 "Properties are still loading" 开头（893）[S]。"已加载有选项但未选中"的行为 UNKNOWN。
- **Desired**：无已确立目标。
- **Layer**：simulated（UI）；`UItest` 已有相应断言 [R]。
- **Data · cleanup**：CL-SIM。
- **Risk**：无。
- **Status**：CHARACTERIZATION

#### D2-B02 — UI：其他必填项缺失
- **Scenario**：Category / Payee / Amount / Due Date 逐个缺失。
- **Pre**：P-UI。
- **Inputs**：每次清空一项。
- **Current**：统一提示 "Please fill in Property, Category, Payee, Amount, and Due Date."，不发请求（945:897–898）[S]。EndDate、GraceDays 缺失不拦截。
- **Desired**：无已确立目标。
- **Layer**：simulated（UI）。
- **Data · cleanup**：CL-SIM。
- **Risk**：UI 把 Payee 设为必填而服务端可选（见 B13）。
- **Status**：CHARACTERIZATION

#### D2-B03 — 服务端：缺失或为空的字段（API 直调）
- **Scenario**：直接调用 `createObligation`，逐项制造缺失。
- **Pre**：P-SRV；DS-1。
- **Inputs**（每行独立）：(a) propertyId=''；(b) category=''；(c) frequencyType=''；(d) amount 缺失；(e) dueAnchor=''；(f) 多项同时缺失。
- **Current**：(a) INVALID_ID_FORMAT，`Invalid ID: expected prefix "<前缀>-", got ""`（902:101–108）；(b) INVALID_CATEGORY `Unknown category: `（912:348）；(c) INVALID_FREQUENCY `Unknown frequency type: `（351）；(d) INVALID_INPUT `Amount must be greater than 0.`（357）；(e) INVALID_INPUT `dueAnchor (yyyy-MM-dd) is required.`（360）；(f) 按检查顺序只报第一个失败：属性前缀 → 属性存在 → 类别 → 频率 → Custom 间隔 → 金额 → dueAnchor（343–361）[S]。所有情形都不写任何行。`<前缀>` 的具体值取自 `PROPERTY_CONFIG.ID_PREFIXES.PROPERTY`，本次未读取。
- **Desired**：无已确立目标。
- **Layer**：simulated（服务端）。
- **Data · cleanup**：DS-1；CL-SIM。
- **Risk**：错误信息文字以实测为准。
- **Status**：CHARACTERIZATION

#### D2-B04 — 服务端：Property 前缀错误或不存在
- **Scenario**：propertyId 格式错误，或格式正确但不存在。
- **Pre**：P-SRV；DS-1（需 `propertyExists_`，见 H-6）。
- **Inputs**：(a) `XYZ-1`；(b) `<正确前缀>-unknown`。
- **Current**：(a) INVALID_ID_FORMAT（902:101）；(b) PROPERTY_NOT_FOUND，`No Property found for <id>`（912:344–345）。均不写行 [S]。
- **Desired**：无已确立目标；规格 `Spec:145` 列出 `PROPERTY_NOT_FOUND` 为错误之一。
- **Layer**：simulated（服务端）。
- **Data · cleanup**：DS-1；CL-SIM。
- **Risk**：依赖 harness 提供 `propertyExists_`（H-6）。
- **Status**：CHARACTERIZATION

#### D2-B05 — 金额为 0
- **Scenario**：UI 与 API 对 0 的处理。
- **Pre**：P-UI 与 P-SRV。
- **Inputs**：UI 金额栏输入 0 或留空；API amount=0。
- **Current**：UI 在检查时用真值判断（945:897），0 与空都会触发统一提示，不发请求 [S 判断式 / I 转换]；API 返回 `Amount must be greater than 0.`（912:356–357）[S]。
- **Desired**：无已确立目标。
- **Layer**：simulated（UI + 服务端）。
- **Data · cleanup**：CL-SIM。
- **Risk**：UI 把输入转成数字的方式未在本次重读，空串是否转成 0 为推断。
- **Status**：CHARACTERIZATION

#### D2-B06 — 金额为负数
- **Scenario**：负数金额从 UI 走到服务端。
- **Pre**：P-UI 与 P-SRV。
- **Inputs**：amount=-5。
- **Current**：客户端检查通过，请求到达服务端（`UItest` 176 标注 NEGATIVE [R]）；服务端 `Amount must be greater than 0.`；UI 失败分支恢复按钮并弹出 `res.error`，表单值保留（945:925）[S]。
- **Desired**：无已确立目标。
- **Layer**：simulated（UI + 服务端）；真实环境只做这一项失败测试是 Checklist v2 已有的做法 [R]，仍为 BLOCKED。
- **Data · cleanup**：CL-SIM。
- **Risk**：无。
- **Status**：CHARACTERIZATION

#### D2-B07 — 金额为非数字（a 'abc' · b 'Infinity' · c '1e309'）
- **Scenario**：API 收到非数字金额；UI 的数字输入框本身不会产出这些字符串。
- **Pre**：P-SRV；DS-1。
- **Inputs**：amount 为 (a)(b)(c)。
- **Current**：(a) `Number('abc')` 为 NaN，`!(NaN > 0)` 为真，报 `Amount must be greater than 0.`；(b)(c) `Number(...)` 为 Infinity，`Infinity > 0` 为真，**通过校验并写入**（912:356）。Infinity 写入 Sheets 后的存储值与读回 UNKNOWN [S 判断式 / I 结果]。
- **Desired**：无已确立目标（DR-08 / DR-10 相关）。
- **Layer**：simulated（服务端）；真实 Sheets 的存储结果 BLOCKED。
- **Data · cleanup**：DS-1；CL-SIM。
- **Risk**：shim 把 Infinity 当 JS 值保存，不代表 Sheets。
- **Status**：CHARACTERIZATION（(b)(c) 的真实存储 BLOCKED）

#### D2-B08 — 金额精度与量级
- **Scenario**：不规则小数与极大金额。
- **Pre**：P-SRV 与 P-UI；DS-1。
- **Inputs**：42.555；0.001；123456789.12；0.30000000000000004。
- **Current**：服务端存 `Number(input.amount)`，不取整（912:371）[S]。界面显示由 `formatAmount`（945:1684）决定，取整结果 UNKNOWN（依赖运行时的 Intl 与二进制浮点）。
- **Desired**：无已确立目标。
- **Layer**：simulated（服务端存储）；显示用 Node 的 Intl 只能近似浏览器，真实浏览器显示 BLOCKED。
- **Data · cleanup**：DS-1；CL-SIM。
- **Risk**：Node 与浏览器的 Intl 可能不同。
- **Status**：CHARACTERIZATION

#### D2-B09 — 畸形 dueAnchor（API 直调）
- **Scenario**：非空但畸形的日期字符串。
- **Pre**：P-SRV；DS-1。
- **Inputs**：(a) `abc`；(b) `2026-13-01`；(c) `2026-02-30`；(d) `2026/10/24`；(e) `24-10-2026`；(f) ` 2026-10-24`（前导空格）；(g) `2026-10-24T08:00:00Z`；(h) 数字 20261024；(i) 空串。
- **Current**：(i) 报 `dueAnchor (yyyy-MM-dd) is required.`；(a)–(h) 只检查非空（912:359），**都会通过校验并写入原始字符串** [S]。`parseIsoDate_`（901:734–737）把它们解析成 Invalid Date 或被 JS 进位的日期，没有抛错 [S]。后续在看板窗口、逾期判断、下一期计算中的表现 UNKNOWN。
- **Desired**：无已确立目标（DR-10）。
- **Layer**：simulated（服务端 + 看板查询）。
- **Data · cleanup**：DS-1；CL-SIM。
- **Risk**：畸形行可能影响整个看板的查询；先在模拟里观察。
- **Status**：CHARACTERIZATION（后续表现标 UNKNOWN）

#### D2-B10 — EndDate 早于首期
- **Scenario**：EndDate 早于 dueAnchor。
- **Pre**：P-UI 与 P-SRV；DS-1。
- **Inputs**：dueAnchor=today+10；endDate=today+5。
- **Current**：UI 的必填检查不含 EndDate（945:897）；服务端校验段没有 EndDate 检查（912:343–361）[S]。规则与首期都会创建。首期付款后：下一期日期大于 EndDate，规则转为 Completed 且不生成下一期（913:173）[I]，见 D2-F17。
- **Desired**：无已确立目标（DR-10）。
- **Layer**：simulated。
- **Data · cleanup**：DS-1；CL-SIM。
- **Risk**：无。
- **Status**：CHARACTERIZATION

#### D2-B11 — Custom 频率的间隔缺失或非法
- **Scenario**：Custom 频率配合各种 customIntervalDays。
- **Pre**：P-SRV；DS-1。
- **Inputs**：customIntervalDays ∈ {缺失, 0, -3, 'abc'}。
- **Current**：均报 INVALID_FREQUENCY `Custom frequency requires a positive customIntervalDays.`（912:353–355）[S]。UI 对该字段的处理（空值是否不发送）本次未重读，UNKNOWN。
- **Desired**：无已确立目标。
- **Layer**：simulated。
- **Data · cleanup**：DS-1；CL-SIM。
- **Risk**：无。
- **Status**：CHARACTERIZATION

#### D2-B12 — 币种
- **Scenario**：缺省币种与传入币种。
- **Pre**：P-UI 与 P-SRV；DS-1。
- **Inputs**：(a) UI 路径，不带币种；(b) API currency ∈ {`USD`, `myr`, `XYZ`, ` `, ``}。
- **Current**：(a) 请求体没有 currency（945:866–967 范围内无该字段）；服务端取 `input.currency || DEFAULT_CURRENCY`（912:372；900:44 为 `MYR`）[S]。(b) 校验段没有币种检查（343–361），非空值原样写入；空串落到 `MYR` [S 结构]。界面金额前缀始终为 `RM `（945:639、641、663）[S]。
- **Desired**：无已确立目标（DR-06）。
- **Layer**：simulated。
- **Data · cleanup**：DS-1；CL-SIM。
- **Risk**：无。
- **Status**：CHARACTERIZATION

#### D2-B13 — Payee 缺失
- **Scenario**：UI 要求 Payee，服务端不要求。
- **Pre**：P-SRV；DS-1。
- **Inputs**：API payee 缺失或空串。
- **Current**：通过校验，Payee 写成空串（912:370）[S]；UI 路径会被拦截（945:897）。
- **Desired**：无已确立目标（DR-10）。
- **Layer**：simulated。
- **Data · cleanup**：DS-1；CL-SIM。
- **Risk**：看板卡片标题会显示 `<类别> — `（945:660 取 `item.payee`）。
- **Status**：CHARACTERIZATION

#### D2-B14 — GraceDays 异常值
- **Scenario**：宽限天数为负、小数、非数字、很大。
- **Pre**：P-SRV；DS-1。
- **Inputs**：graceDays ∈ {-1, 1.5, 'abc', 999}。
- **Current**：校验段没有 GraceDays 检查（912:343–361）[S]，原值写入。逾期判断取 `Number(rule.GraceDays)`（913:109–114）；NaN 时 `today > deadline` 为假，该期次永远不会被判为逾期 [I]。NaN 的存储形式 UNKNOWN。
- **Desired**：无已确立目标（DR-10）。
- **Layer**：simulated。
- **Data · cleanup**：DS-1；CL-SIM。
- **Risk**：无。
- **Status**：CHARACTERIZATION

---

## C. 重复提交与重试

#### D2-C01 — 保存按钮重复点击
- **Scenario**：点击保存后、服务端回调返回前再次点击。
- **Pre**：P-UI；假 `google.script.run` 的成功回调延迟触发。
- **Inputs**：同一个同步周期内点击两次；回调返回前再点一次。
- **Current**：点击处理在调用服务端之前把按钮置为 disabled（945:922，调用在 966）[S]。浏览器不会向 disabled 按钮派发点击 [I]，所以预期只有一次 `console_createObligation` 调用。假 DOM 是否遵守这一点 UNKNOWN（H-7）。`UItest` 191 断言"提交中按钮禁用" [R]（本次未执行）。
- **Desired**：无已确立目标。
- **Layer**：simulated（UI）；真实浏览器 BLOCKED（VT-16）。
- **Data · cleanup**：CL-SIM。
- **Risk**：键盘触发与多标签页同时提交不在本用例内。
- **Status**：CHARACTERIZATION

#### D2-C02 — 成功后再次录入相同账单
- **Scenario**：首次保存成功后，用户再录一次相同的 Property / 类别 / 到期日。
- **Pre**：P-UI 与 P-SRV；DS-1。
- **Inputs**：两次完整提交，payee 与 amount 相同（成功后这两栏被清空，需要重新输入）。
- **Current**：成功分支只清空 payee 与 amount（945:929–930）[S]。`createObligation` 内没有按 Property / 类别 / 到期日的重复查找，只调用 `propertyExists_` 与 `createOccurrence_`（912:333–426 的调用清单）[S]。预期：两个不同的 ObligationID，两条 Rule、两条 Occurrence、两条 History 行，四条事件日志 [I]。
- **Desired**：无已确立目标（DR-07）。
- **Layer**：simulated；真实环境不得执行（会产生重复的真实账单）。
- **Data · cleanup**：DS-1；CL-SIM。
- **Risk**：无。
- **Status**：CHARACTERIZATION

#### D2-C03 — 相同 API 载荷两次，不带 clientRequestId
- **Scenario**：绕过 UI，直接用相同载荷调用两次。
- **Pre**：P-SRV；DS-1。
- **Inputs**：A01a 的载荷，调用两次，都不带 clientRequestId。
- **Current**：与 C02 的服务端结果相同：两个 ObligationID，Rule 2 / Occurrence 2 / History 2，四条事件日志 [I]。没有服务端去重（见 C02 的调用清单 [S]）。
- **Desired**：无已确立目标（DR-07）。
- **Layer**：simulated。
- **Data · cleanup**：DS-1；CL-SIM。
- **Risk**：无。
- **Status**：CHARACTERIZATION

#### D2-C04a — 相同 clientRequestId，首次成功，第二次在缓存有效期内
- **Scenario**：幂等缓存命中。
- **Pre**：P-SRV；DS-1。
- **Inputs**：同一载荷两次，clientRequestId="CRQ-TEST-1"。
- **Current**：第一次正常创建，并在成功后写缓存（912:423）；第二次在函数开头命中缓存（338），直接返回第一次的结果对象，不写任何行、不发事件 [S 结构]。GasShim 提供缓存但没有 TTL（H-3）。
- **Desired**：`Spec:145`："呼叫端提供 `ClientRequestID`；重复 ID 直接回传原结果，不重复建立"（已确立）。
- **Layer**：simulated。
- **Data · cleanup**：DS-1；CL-SIM。
- **Risk**：真实 CacheService 的行为见 C04b。
- **Status**：TARGET（行为已由规格确立；本用例核对当前实现是否相符）

#### D2-C04b — 缓存过期后使用同一 clientRequestId
- **Scenario**：超过 3600 秒（912:110）后重试同一个 id。
- **Pre**：P-REAL。
- **Inputs**：C04a 之后等待超过 TTL，再次提交。
- **Current**：预期缓存未命中，创建一条新规则 [I]。模拟环境无法让缓存过期（H-3）。
- **Desired**：规格没有写 TTL 语义，UNKNOWN。
- **Layer**：real GAS（VT-12）。
- **Data · cleanup**：见 CL-REAL。
- **Risk**：写入不可逆。
- **Status**：BLOCKED

#### D2-C05 — 相同 clientRequestId、不同载荷
- **Scenario**：先用载荷 X 创建，再用同一个 id 与载荷 Y（金额或类别不同）调用。
- **Pre**：P-SRV；DS-1。
- **Inputs**：X：Water，42.50；Y：Electricity，99.00；同一 clientRequestId。
- **Current**：缓存读取在校验之前（912:338 先于 343），第二次直接返回 X 的结果，不校验 Y [S 顺序]。
- **Desired**：无已确立目标（规格只写"重复 ID 回传原结果"，没有涉及载荷不同）。DR-07。
- **Layer**：simulated。
- **Data · cleanup**：DS-1；CL-SIM。
- **Risk**：无。
- **Status**：CHARACTERIZATION

#### D2-C06 — 带 clientRequestId，首次在事件步骤失败，同 id 重试
- **Scenario**：数据已写入但调用报错，随后用同一个 id 重试。
- **Pre**：P-SRV；DS-1；故障注入：`publishPropertyEvent_` 仅在第一次尝试的第一次调用时抛错。
- **Inputs**：A01a 的载荷，clientRequestId="CRQ-TEST-2"，调用两次。
- **Current**：第一次失败后没有写缓存（缓存写入在 try/catch 之后，423；失败时 414 重新抛出），第二次不命中缓存，再创建一条规则；结果 Rule 2 / Occurrence 2 / History 2，第一次的三行仍在 [I]。
- **Desired**：无已确立目标（DR-07）。
- **Layer**：simulated（故障注入）。
- **Data · cleanup**：DS-1；CL-SIM。
- **Risk**：注入方式需要与 shim 匹配。
- **Status**：CHARACTERIZATION

#### D2-C07 — 带 clientRequestId，首次在 Rule→Occurrence 之间失败，同 id 重试
- **Scenario**：首次留下孤儿 Rule，之后重试。
- **Pre**：P-SRV；DS-1；故障注入：`occurrenceSheet_().appendRow`（912:309）仅第一次抛错。
- **Inputs**：A01a 的载荷，clientRequestId="CRQ-TEST-3"，调用两次。
- **Current**：第一次留下孤儿 Rule（Occurrence 0、History 0），缓存未写；第二次创建一条完整账单；孤儿 Rule 仍在 [I]。
- **Desired**：无已确立目标（DR-07）。
- **Layer**：simulated（故障注入）。
- **Data · cleanup**：DS-1；CL-SIM。
- **Risk**：同 C06。
- **Status**：CHARACTERIZATION

#### D2-C08 — UI 请求体不含 clientRequestId 与币种
- **Scenario**：捕获 Add Bill 发给服务端的参数。
- **Pre**：P-UI。
- **Inputs**：合法表单提交。
- **Current**：945 全文没有 `clientRequestId` [S]；`submitAddBill`（866–967）范围内没有 currency [S]。请求体的键只来自表单字段，精确键集以捕获为准（UNKNOWN 键序）。
- **Desired**：无已确立目标（若 M1 被授权，这一点会改变）。
- **Layer**：simulated（UI）；`UItest` 中有关于请求体的断言 [R]（本次未执行）。
- **Data · cleanup**：CL-SIM。
- **Risk**：无。
- **Status**：CHARACTERIZATION

#### D2-C09a — 文档核对：歧义失败后"先查表再重试"
- **Scenario**：静态核对现有真实环境清单是否写明歧义失败的处理。
- **Pre**：无。
- **Inputs**：阅读 `Billing_Real_Environment_Checklist.md`。
- **Current**：清单第 65–69 行写明：请求超时、对话框突然关闭、不确定是否保存成功时，重试前先到 `ObligationRules` 找刚才那一行；已有则不要再保存；红色错误不等于"一定没保存"[S]。
- **Desired**：无已确立目标。
- **Layer**：static。
- **Data · cleanup**：无。
- **Risk**：这是人工流程，不是系统防护。
- **Status**：CHARACTERIZATION

#### D2-C09b — 真实环境的歧义失败演练
- **Scenario**：浏览器超时或页面被关闭，而服务端已写入。
- **Pre**：P-REAL。
- **Inputs**：无法安全诱发。
- **Current**：UNKNOWN。D1 的结构分析只说明可能发生 [I]。
- **Desired**：无已确立目标。
- **Layer**：real GAS。
- **Data · cleanup**：见 CL-REAL。
- **Risk**：只能在发生时核对，不能按计划演练。
- **Status**：BLOCKED

#### D2-C10 — 两个近乎同时的提交（锁竞争）
- **Scenario**：两个请求同时进入 `createObligation`。
- **Pre**：P-REAL。
- **Inputs**：两个浏览器会话同时提交。
- **Current**：第二个请求在 `withObligationLock_` 内最多等待 30 秒（912:57–59），超时返回锁超时错误（错误码与文字以实测为准）[S 结构]；两个请求都拿到锁时仍会产生两条规则（无去重）[I]。
- **Desired**：无已确立目标。
- **Layer**：模拟不可行（H-2）；real GAS（VT-12）。
- **Data · cleanup**：见 CL-REAL。
- **Risk**：产生真实重复数据。
- **Status**：BLOCKED

---

## D. 部分写入（Add Bill）

#### D2-D01 — Rule 成功，Occurrence 失败
- **Scenario**：规则行写入后，首期写入失败。
- **Pre**：P-SRV；DS-1；故障注入：`occurrenceSheet_().appendRow`（912:309）抛错。
- **Inputs**：A01a 的载荷。
- **Current**：异常从 `createOccurrence_`（386）传出，该调用不在 try/catch 内（394 才开始），经 `withObligationLock_` 与 `console_wrap_` 变成 `{success:false, error, code}` [S 结构]。行数 Rule 1 / Occurrence 0 / History 0；没有事件；没有 `logPartialFailure_` 日志；没有缓存 [I]。UI：恢复按钮、弹出错误文字、表单值保留（945:925）[S]。重试会再建一条规则，孤儿 Rule 保留 [I]。
- **Desired**：无已确立目标。规格 `Spec:272` 写 all-or-nothing，与实现的 D9 选择不一致（DR-07）。
- **Layer**：simulated（故障注入）；真实环境无法安全注入。
- **Data · cleanup**：DS-1；CL-SIM。
- **Risk**：注入点要与 shim 的 sheet 实现匹配。
- **Status**：CHARACTERIZATION

#### D2-D02 — Occurrence 成功，History 失败
- **Scenario**：首期写入后，History 行写入失败。
- **Pre**：P-SRV；DS-1；故障注入：`appendObligationHistory_`（912:310）抛错。
- **Inputs**：A01a 的载荷。
- **Current**：Occurrence 行已写入，History 行没有；异常来自 `createOccurrence_` 内部，仍在 try/catch 之前，所以没有事件、没有部分失败日志 [I]；行数 1 / 1 / 0；UI 同 D01。
- **Desired**：同 D01（DR-07）。
- **Layer**：simulated（故障注入）。
- **Data · cleanup**：DS-1；CL-SIM。
- **Risk**：同 D01。
- **Status**：CHARACTERIZATION

#### D2-D03 — 域写入成功，第一个事件发布失败
- **Scenario**：三张表都已写入，OBLIGATION_CREATED 事件发布失败。
- **Pre**：P-SRV；DS-1；故障注入：`publishPropertyEvent_` 第一次调用抛错。
- **Inputs**：A01a 的载荷。
- **Current**：行数 1 / 1 / 1。事件步骤在 try/catch 内（394–415）：调用 `logPartialFailure_`（91），日志说明 Truth 层写入已成功、事件步骤未全部完成、可能需要人工对账，随后重新抛出（414）[S 结构]。UI 弹出错误；缓存未写（423 不可达）；重试会重复 [I]。
- **Desired**：无已确立目标（DR-07）。规格 `Spec:272` 把"Truth 写了但 Event 没发出"列为不允许的状态。
- **Layer**：simulated（故障注入）。
- **Data · cleanup**：DS-1；CL-SIM。
- **Risk**：无。
- **Status**：CHARACTERIZATION

#### D2-D04 — 第二个事件（REMINDER_REQUESTED）失败
- **Scenario**：第一个事件已记录，第二个事件失败。
- **Pre**：P-SRV；DS-1；故障注入：`publishPropertyEvent_` 第二次调用抛错。
- **Inputs**：A01a 的载荷。
- **Current**：第一个事件已记录日志；其余同 D03。部分失败日志里"哪一步失败"的文字以实测为准，UNKNOWN。
- **Desired**：同 D03。
- **Layer**：simulated（故障注入）。
- **Data · cleanup**：DS-1；CL-SIM。
- **Risk**：无。
- **Status**：CHARACTERIZATION

#### D2-D05 — 寻找自然触发的事件失败
- **Scenario**：不注入故障，用异常但合法的输入尝试让事件步骤失败。
- **Pre**：P-SRV；DS-1。
- **Inputs**：超长 payee、含特殊字符的 payee、极大金额、不同写法的 reminderOffsets。
- **Current**：没有找到触发路径：两个事件的必填字段（903:79、99）都由已校验的输入或默认值提供 [S 阅读结论，不是穷尽证明]。预期无失败 [I]。
- **Desired**：无已确立目标。
- **Layer**：simulated。
- **Data · cleanup**：DS-1；CL-SIM。
- **Risk**："没发现"不等于"不存在"。
- **Status**：CHARACTERIZATION

#### D2-D06 — 孤儿 Rule 的可见性
- **Scenario**：D01 之后，孤儿 Rule（没有 Occurrence）在界面里的表现。
- **Pre**：P-SRV + 922；沿用 D01 的结果。
- **Inputs**：读取看板与付款历史。
- **Current**：看板与付款历史都从 Occurrence 出发（912:811 起）；没有 Occurrence 的 Rule 不出现在任何列表 [I]。下一期只在付款后生成，所以孤儿 Rule 不会自行产生期次 [I]。
- **Desired**：无已确立目标。
- **Layer**：simulated。
- **Data · cleanup**：CL-SIM。
- **Risk**：无。
- **Status**：CHARACTERIZATION

#### D2-D07 — 对账与修复流程
- **Scenario**：发现孤儿行或缺失 History 后如何对账。
- **Pre**：P-REAL。
- **Inputs**：无。
- **Current**：UNKNOWN。清单 v2 只写了人工查表（C09a）；系统没有修复或删除功能（CL-REAL）。
- **Desired**：需要决定（DR-07）。
- **Layer**：real GAS 加流程。
- **Data · cleanup**：见 CL-REAL。
- **Risk**：依赖决定。
- **Status**：BLOCKED

---

## E. 读回与可见性

#### D2-E01 — 到期日边界与看板窗口（参数表 E01-a … h）
- **Scenario**：以不同的"首期相对今天的偏移"与宽限天数创建账单，看它出现在哪些列表。
- **Pre**：P-SRV + 922；DS-3；"today"为脚本时区当日。
- **Inputs**：见下表的输入列。
- **Current**：见下表的预期列。所有"出现的列表"都是静态预测 [I]。

| 子用例 | dueAnchor | graceDays | 预期出现的列表 | 依据 |
|---|---|---|---|---|
| E01-a | today | 0 | Due This Week | 窗口从今天起（922:83–84）；今天不逾期（913:114 为严格大于） |
| E01-b | today+7 | 0 | Due This Week **和** Upcoming | 两个窗口都含 weekEnd（922:83–88），区间判断两端闭合（912:828） |
| E01-c | today+8 | 0 | Upcoming | 在 +7 到 +30 之间 |
| E01-d | today+30 | 0 | Upcoming | 终点含 +30（922:80、87） |
| E01-e | today+31 | 0 | 不出现在任何列表 | 超出窗口且未逾期 |
| E01-f | today−1 | 0 | Overdue | 今天晚于到期日 |
| E01-g | today−1 | 1 | 不出现在任何列表 | 截止日为今天，不算逾期；也不在从今天起的窗口 |
| E01-h | today−2 | 1 | Overdue | 今天晚于到期日加 1 天 |

- **Desired**：`Spec:268`："到期未缴……Lazy Computation 自动显示为 Overdue，属正常状态"（已确立：逾期是派生状态）。宽限期内是否算 Overdue、+7 是否应出现在两个列表，规格没有写（DR-11）。
- **Layer**：simulated；真实环境 BLOCKED（VT-10）。
- **Data · cleanup**：DS-3；CL-SIM。
- **Risk**：E01-b 与 E01-g 是 D1 之外的新观察（AO-1、AO-2）；shim 的日期计算依赖进程时区（H-4）。
- **Status**：CHARACTERIZATION

#### D2-E02 — 午夜与时区边界
- **Scenario**：到期日当天 23:59:59 与次日 00:00:01（脚本时区 UTC+8）的列表归属变化。
- **Pre**：P-SRV + 922；假时钟；进程 TZ 设为 Asia/Singapore 或 Asia/Kuala_Lumpur（H-4）。
- **Inputs**：dueAnchor=D，graceDays=0；时钟 ∈ {D 23:59:59, D+1 00:00:01}。
- **Current**：D 当天不逾期，出现在 Due This Week；D+1 00:00:01 起逾期（913:114）[S 结构 / I 结果]。两处"今天"的来源不同：`toIsoDate_(new Date())`（922:78）与 `isOccurrenceOverdue_` 内部的本地午夜 [I]；二者在 shim 里是否一致 UNKNOWN（H-4）。
- **Desired**：无已确立目标。
- **Layer**：simulated（保真度有限）；real GAS BLOCKED（VT-06）。
- **Data · cleanup**：DS-1；CL-SIM。
- **Risk**：shim 的 `formatDate` 忽略时区参数（H-4），结果可能只反映进程时区。
- **Status**：CHARACTERIZATION

#### D2-E03 — 看板的 Property 过滤
- **Scenario**：两个 Property 各有账单时，按 Property 过滤。
- **Pre**：P-SRV + 922；DS-2。
- **Inputs**：`getDashboardSnapshot(P1)`、`getDashboardSnapshot(P2)`、`getDashboardSnapshot(undefined)`。
- **Current**：propertyId 传给逾期、本周、30 天内、最近付款与本月合计（922:82–95）[S]；`queryUpcomingPayments` 按规则的 PropertyID 过滤（912:829–832）[S]。查询不按 Category 过滤（912:811–843 没有该条件）[S]。预期各 Property 只见自己的条目；不过滤时两者都有 [I]。
- **Desired**：无已确立目标。
- **Layer**：simulated。
- **Data · cleanup**：DS-2；CL-SIM。
- **Risk**：过滤要对每行调用 `getObligationRuleById_`（912:830），数据量大时性能 UNKNOWN。
- **Status**：CHARACTERIZATION

#### D2-E04 — 看板卡片显示的字段
- **Scenario**：新账单出现在看板时，卡片显示哪些字段与按钮。
- **Pre**：P-UI；假看板数据含一条 dueThisWeek。
- **Inputs**：渲染一条含 payee、category、propertyName、expectedAmount 的条目。
- **Current**：卡片标题为 `<类别> — <payee>`，payee 经 `escapeHtml`（945:660）；显示 Property 名与 `Due <effectiveDue>`；金额前缀 `RM `（663）；未付条目带 Pay 与暂停 / 取消按钮（945:633–733 已读，行号细节以实测为准）[S 大意]。
- **Desired**：无已确立目标。
- **Layer**：simulated（UI）。
- **Data · cleanup**：假数据；CL-SIM。
- **Risk**：假 DOM 的渲染保真度未评估（H-7）。
- **Status**：CHARACTERIZATION

#### D2-E05 — 最近付款与本月合计
- **Scenario**：付款之后看板的"最近付款"与"本月合计"。
- **Pre**：P-SRV + 922；先执行 F01。
- **Inputs**：`getDashboardSnapshot()`。
- **Current**：`recentPayments` 取最近 10 笔（922:89）；`monthlyExpense` 来自 `getMonthlyExpenseSummary(propertyId)`（95）[S]。月汇总的具体口径 UNKNOWN（本次未重读该函数）。
- **Desired**：无已确立目标。
- **Layer**：simulated。
- **Data · cleanup**：DS-1；CL-SIM。
- **Risk**：口径未核对前不写预期数值。
- **Status**：CHARACTERIZATION

#### D2-E06a — 重新打开控制台后的持久性（模拟）
- **Scenario**：新建一个 UI 上下文并执行 `init()`，对照之前的看板。
- **Pre**：P-UI 与 P-SRV；GasShim 状态保留。
- **Inputs**：A01a 完成后新建 UI 上下文，执行 `init()`。
- **Current**：UI 没有本地持久化；`init()` 重新加载表单选项、Property 与看板（945:453–463）[S]，数据都来自服务端 [I]。预期与之前的看板一致。
- **Desired**：无已确立目标。
- **Layer**：simulated。
- **Data · cleanup**：DS-1；CL-SIM。
- **Risk**：只证明 UI 不持有状态，不证明 Sheets 持久化。
- **Status**：CHARACTERIZATION

#### D2-E06b — 重新打开控制台后的持久性（真实）
- **Scenario**：在真实环境关闭并重新打开页面，核对账单仍在。
- **Pre**：P-REAL；A04 之后。
- **Inputs**：关闭并重新打开页面。
- **Current**：UNKNOWN。
- **Desired**：无已确立目标。
- **Layer**：real GAS（VT-10）。
- **Data · cleanup**：只读。
- **Risk**：依赖 A04。
- **Status**：BLOCKED

#### D2-E07 — 没有列表或按 ID 查询时的核对盲区
- **Scenario**：新账单首期晚于 +30 天，如何在界面核对。
- **Pre**：无。
- **Inputs**：阅读 946 的 `console_*` 清单与 922 的窗口。
- **Current**：946 没有"列出全部 Obligation"或"按 ID 查询"的函数（D1 记录 3.3 节的函数全集）；窗口外的账单在界面不可见 [S 结构 / I 结果]。核对只能读 Sheets（清单 v2 的做法）。
- **Desired**：需要决定（DR-11）。
- **Layer**：static；真实核对 BLOCKED。
- **Data · cleanup**：无。
- **Risk**：无。
- **Status**：BLOCKED

#### D2-E08 — 付款历史视图
- **Scenario**：付款后用不同搜索词查看付款历史。
- **Pre**：P-SRV + 946；先执行 F01。
- **Inputs**：`console_getPaymentHistory(propertyId, searchText)`，searchText ∈ {空, payee 片段, 类别, Property 名, 不存在的词}。
- **Current**：服务端取 `queryRecentPayments({propertyId, limit: 500})`，再对 payee、category、propertyName 做不区分大小写的子串匹配（946:166–180；过滤在 170–177）；只列已付 [S]。
- **Desired**：无已确立目标。
- **Layer**：simulated。
- **Data · cleanup**：DS-1；CL-SIM。
- **Risk**：无。
- **Status**：CHARACTERIZATION

#### D2-E09 — 金额前缀与币种不一致
- **Scenario**：Currency 不是 MYR 的条目在看板上的金额前缀。
- **Pre**：P-UI；假看板数据中一条 Currency='USD'。
- **Inputs**：渲染该条目。
- **Current**：金额前缀固定为 `RM `（945:663），不随 Currency 改变 [S]。
- **Desired**：无已确立目标（DR-06）。
- **Layer**：simulated（UI）。
- **Data · cleanup**：CL-SIM。
- **Risk**：无。
- **Status**：CHARACTERIZATION

---

## F. Pay

#### D2-F01 — 正常付款
- **Scenario**：对一个 Active 期次按预计金额付款。
- **Pre**：P-SRV（UI 一半用 P-UI）；DS-1；先执行 A01a（AutoGenerate 默认开启）。
- **Inputs**：occurrenceId=A01a 的首期；paidAmount=42.50；paidDate=today；note=''。
- **Current**：期次转 Paid：PaidDate、PaidAmount、PaidVia=`Manual`、Evidence=''（912:532–544）[S]；History 行 `Active → Paid`，TriggeredBy `RecordPayment`（559）；PAYMENT_COMPLETED 事件记录日志（561）；`scheduleNextOccurrence_` 生成下一期（Monthly，+1 个月）[S 结构 / I 结果]；返回 `{success, alreadyPaid:false, occurrenceId, obligationId, paidDate, paidAmount, event, nextOccurrenceId}`（590–599）[S]。UI：提示 `Payment recorded.`（945:837），随后 `loadDashboard()`（838）[S]。
- **Desired**：`Spec:147`："Occurrence 须处于 Active……才能转 Paid"（已确立）。
- **Layer**：simulated（UI + 服务端）。
- **Data · cleanup**：DS-1；CL-SIM。
- **Risk**：下一期的精确日期断言见 F14。
- **Status**：CHARACTERIZATION

#### D2-F02 — 实际金额不同于预计金额
- **Scenario**：水电账单实际金额与规则里的预计金额不同。
- **Pre**：P-SRV；DS-1；先执行 A01a。
- **Inputs**：paidAmount=57.80（预计 42.50）。
- **Current**：PaidAmount=57.8；期次的 Amount 快照保持 42.5；下一期的 Amount 取规则的 Amount（912:302；913:179）[S 结构]。Pay 表单默认金额仍是 `expectedAmount`（945:820）[S]。规则金额不变，console 没有修改入口（G3）。
- **Desired**：无已确立目标（DR-05）。
- **Layer**：simulated。
- **Data · cleanup**：DS-1；CL-SIM。
- **Risk**：无。
- **Status**：CHARACTERIZATION

#### D2-F03 — 金额缺失、为零、为负、非数字（参数表 F03-a … e）
- **Scenario**：Pay 路径对异常金额的处理。
- **Pre**：P-UI 与 P-SRV；DS-1；先执行 A01a。
- **Inputs**：见下表的输入列。
- **Current**：见下表的预期列（全部为静态预测 [I]，必须先观察）。

| 子用例 | 到达 946 的 amount | 946 转换 | 912 行为（静态预测） |
|---|---|---|---|
| F03-a | `''`（UI 留空，945:832 读取字段值） | `Number('')` = 0（946:102） | `paidAmount != null` 为真（912:533）→ PaidAmount = 0，无校验；UI 提示 `Payment recorded.` |
| F03-b | `'0'` | 0 | 同上 |
| F03-c | `'-5'` | −5 | PaidAmount = −5，无校验 |
| F03-d | API 直调 `'abc'` | NaN | PaidAmount = NaN；写入 Sheets 后的存储值 UNKNOWN；事件载荷的 amount 为 NaN（903 的必填检查只判 null / undefined） |
| F03-e | API 直调，不提供 paidAmount | — | 取期次的 Amount 快照（533 所在语句的另一分支） |

- **Desired**：无已确立目标。`Spec:147` 把 PaidAmount 列为输入，没有数值约束（DR-08）。
- **Layer**：simulated（UI 发送值 + 服务端）；真实 Sheets 对 NaN / 负数的存储 BLOCKED。
- **Data · cleanup**：DS-1；CL-SIM。
- **Risk**：这些会改变状态（把期次标记为 Paid），模拟里每个子用例都要新建上下文。
- **Status**：CHARACTERIZATION

#### D2-F04 — UI 默认付款日期的 UTC 边界（参数表 F04-a … d）
- **Scenario**：Pay 表单默认日期取 UTC 日期，服务端缺省日期取脚本时区日期。
- **Pre**：P-UI（假时钟）与 P-SRV（进程 TZ，H-4）。
- **Inputs**：见下表的输入列。
- **Current**：见下表的预期列（静态预测 [I]）。`toISOString()` 总是 UTC，不依赖浏览器时区 [S]。

| 子用例 | 真实时刻（UTC） | 马来西亚时间 | UI 默认日期（945:818） | 服务端缺省日期（912:532） |
|---|---|---|---|---|
| F04-a | 2026-10-24T15:59:59Z | 10-24 23:59:59 | 2026-10-24 | 2026-10-24（一致） |
| F04-b | 2026-10-24T16:00:00Z | 10-25 00:00:00 | 2026-10-24 | 2026-10-25（不一致） |
| F04-c | 2026-10-24T23:59:59Z | 10-25 07:59:59 | 2026-10-24 | 2026-10-25（不一致） |
| F04-d | 2026-10-25T00:00:00Z | 10-25 08:00:00 | 2026-10-25 | 2026-10-25（一致） |

- **Desired**：无已确立目标（DR-08）。
- **Layer**：simulated（保真度受 H-4 限制）。
- **Data · cleanup**：CL-SIM。
- **Risk**：服务端一栏依赖 shim 的时区设置。
- **Status**：CHARACTERIZATION

#### D2-F05 — 真实环境的默认日期核对
- **Scenario**：在马来西亚时间 00:00–08:00 打开 Pay 表单，看默认日期。
- **Pre**：P-REAL；浏览器。
- **Inputs**：打开 Pay 表单，不提交。
- **Current**：UNKNOWN。清单 v2 第 111 行已提示这一点，但它引用的行号 `945:760` 与当前副本不符（当前副本的 760 行是 `panel.appendChild(renewBtn);`，该默认日期语句在 818 行）[S 文档与源码对照]。
- **Desired**：无已确立目标。
- **Layer**：real GAS（浏览器；VT-11）。
- **Data · cleanup**：只读，不提交。
- **Risk**：只能在特定时段做。
- **Status**：BLOCKED

#### D2-F06 — 畸形付款日期（API 直调）
- **Scenario**：paidDate 非空但畸形。
- **Pre**：P-SRV；DS-1；先执行 A01a。
- **Inputs**：paidDate ∈ {`abc`, `2026-02-30`, `2026/10/24`, 空串}。
- **Current**：空串 → 取当日（912:532）；其余原样写入 PaidDate，没有格式检查 [S]。`queryRecentPayments` 与月汇总对 Invalid Date 的比较与排序 UNKNOWN（NaN 比较恒为假）[I]。
- **Desired**：无已确立目标（DR-08）。
- **Layer**：simulated。
- **Data · cleanup**：DS-1；CL-SIM。
- **Risk**：畸形 PaidDate 可能影响最近付款与月汇总。
- **Status**：CHARACTERIZATION

#### D2-F07 — 付款日期早于或晚于到期日
- **Scenario**：提前付、晚付、未来日期付款。
- **Pre**：P-SRV；DS-1。
- **Inputs**：paidDate ∈ {到期日−5, 到期日+5, today+30}。
- **Current**：没有日期范围检查 [S]；三者都能记录 [I]。
- **Desired**：晚付：`Spec:269`"允许；记录 `daysLate` 供 Analytics，不阻断"（已确立；`daysLate` 是否被记录本次未查）。提前付与未来日期：无已确立目标（DR-08）。
- **Layer**：simulated。
- **Data · cleanup**：DS-1；CL-SIM。
- **Risk**：无。
- **Status**：CHARACTERIZATION（"晚付允许"一项已由规格确立）

#### D2-F08 — 对同一期次重复付款（相同金额与日期）
- **Scenario**：同一个 occurrenceId 再次调用 recordPayment。
- **Pre**：P-SRV 与 P-UI；先执行 F01。
- **Inputs**：同一 occurrenceId，同金额同日期。
- **Current**：期次已 Paid → 直接返回 `{success:true, alreadyPaid:true, …}`（912:506）[S 条件]；不写 History、不发事件、不生成下一期 [I]；UI 提示 `Payment recorded.`（945:836–837）[S]。
- **Desired**：`Spec:147`："以 OccurrenceID 为幂等键；重复呼叫回传'已缴费'而非报错"；`Spec:267`："Idempotent no-op，回传既有结果，不报错"（均已确立，服务端）。UI 文案无已确立目标。
- **Layer**：simulated。
- **Data · cleanup**：DS-1；CL-SIM。
- **Risk**：无。
- **Status**：TARGET（服务端幂等已由规格确立；本用例核对当前实现是否相符）

#### D2-F09 — 对同一期次重复付款（不同金额或日期）
- **Scenario**：第二次提交的金额或日期与第一次不同。
- **Pre**：P-SRV 与 P-UI；先执行 F01。
- **Inputs**：第二次 paidAmount=60.00，paidDate 不同。
- **Current**：第二次被忽略，返回第一次记录的内容（912:506 的早返回 [S]；返回值内容 [I]）；UI 仍提示 `Payment recorded.`，用户可能以为已改成 60.00 [I]。
- **Desired**：无已确立目标（DR-09）。
- **Layer**：simulated。
- **Data · cleanup**：DS-1；CL-SIM。
- **Risk**：无。
- **Status**：CHARACTERIZATION

#### D2-F10 — 在 Cancelled 规则上付款
- **Scenario**：规则已 Cancelled，对其期次付款。
- **Pre**：P-SRV；规则 Cancelled、期次仍为 Active。若 `cancelObligation` 会同时取消期次，需用夹具直接构造；该行为本次未查，UNKNOWN。
- **Inputs**：对该期次调用 recordPayment。
- **Current**：抛出 OBLIGATION_CANCELLED，`Cannot record payment: ObligationRule <id> is Cancelled.`（912:521–526）[S]；不写任何行。
- **Desired**：拒绝本身已确立（`Spec:147` 的错误列表含 `OBLIGATION_CANCELLED`；`Spec:271` 写 `OBLIGATION_CANCELLED_IMMUTABLE`）。两处命名不一致，代码用前者（AO-9，DR-16）。
- **Layer**：simulated。
- **Data · cleanup**：DS-1；CL-SIM。
- **Risk**：夹具构造方式未定。
- **Status**：TARGET（拒绝已确立；错误码命名未定）

#### D2-F11 — 在 Suspended 规则上付款
- **Scenario**：规则被暂停后，对其 Active 期次付款。
- **Pre**：P-SRV；DS-1；规则 Suspended（912:133–139 允许 Active → Suspended）。
- **Inputs**：对该期次调用 recordPayment。
- **Current**：`recordPayment` 只拒绝 Cancelled（912:521），所以允许付款；`scheduleNextOccurrence_` 因规则非 Active 返回 null（913:163），不生成下一期 [S 结构 / I 结果]。
- **Desired**：无已确立目标（DR-14）。
- **Layer**：simulated。
- **Data · cleanup**：DS-1；CL-SIM。
- **Risk**：无。
- **Status**：CHARACTERIZATION

#### D2-F12 — 期次已标记 Paid 之后的失败（a History · b 事件 · c 下一期）
- **Scenario**：Paid 写入成功后，后续步骤之一失败。
- **Pre**：P-SRV；DS-1；故障注入。
- **Inputs**：按 F01 的流程，分别注入：(a) `appendObligationHistory_`（912:559）抛错；(b) `publishPropertyEvent_`（561）抛错；(c) `scheduleNextOccurrence_` 内部创建下一期时抛错（578；913:179）。
- **Current**：三种情况下期次都已是 Paid（539–550 在 try 之前）。后续步骤在 try/catch 内（558–588），失败时 `logPartialFailure_('recordPayment', "Occurrence … already set to Paid (PaidAmount=…, PaidDate=…) — History/Event/next-cycle steps did not all complete", …)` 并重新抛出（580–587）[S]。结果：(a) 无 History、无事件、无下一期；(b) 有 History，无事件、无下一期；(c) 有 History、有事件，无下一期 [I]。UI：弹出错误文字、按钮恢复（945:836）。
- **Desired**：`Spec:272`"所有 Command 失败不改变任何 Truth 状态"（已确立的目标文字），与实现的 D9 选择冲突（DR-07）。
- **Layer**：simulated（故障注入）。
- **Data · cleanup**：DS-1；CL-SIM。
- **Risk**：注入点要与 shim 匹配。
- **Status**：CHARACTERIZATION

#### D2-F13 — F12 之后重试
- **Scenario**：Paid 之后的步骤失败，用户再次点击 Confirm。
- **Pre**：P-SRV 与 P-UI；F12 之后的状态。
- **Inputs**：重复同一 recordPayment。
- **Current**：期次已 Paid → 返回 `alreadyPaid:true`（912:506）；缺失的 History / 事件 / 下一期不会被补做 [I]；UI 提示 `Payment recorded.`（945:836–837）[S]。
- **Desired**：`Spec:267` 的幂等 no-op 已确立；"缺失步骤如何修复"没有确立（DR-07）。
- **Layer**：simulated。
- **Data · cleanup**：DS-1；CL-SIM。
- **Risk**：无。
- **Status**：CHARACTERIZATION

#### D2-F14 — 各频率的下一期日期（参数表 F14-a … f）
- **Scenario**：付款后下一期的日期按频率计算。
- **Pre**：P-SRV；规则 AutoGenerate=true、EndDate 为空；首期 2026-03-10（避开月末）。
- **Inputs**：见下表的输入列。
- **Current**：见下表的预期列（913:68–95）[S 结构 / I 结果]。

| 子用例 | frequencyType | 预期的下一期 |
|---|---|---|
| F14-a | Weekly | 2026-03-17 |
| F14-b | Monthly | 2026-04-10 |
| F14-c | Quarterly | 2026-06-10 |
| F14-d | HalfYearly | 2026-09-10 |
| F14-e | Yearly | 2027-03-10 |
| F14-f | Custom（14 天） | 2026-03-24 |

- **Desired**：无已确立目标。
- **Layer**：simulated。
- **Data · cleanup**：DS-1；CL-SIM。
- **Risk**：无。
- **Status**：CHARACTERIZATION

#### D2-F15 — 月末截断与日期漂移（参数表 F15-a … c）
- **Scenario**：下一期从"上一期次的到期日"推算，月末截断后不会回到原来的日。
- **Pre**：P-SRV；规则 AutoGenerate=true、EndDate 为空。
- **Inputs**：见下表的输入列。
- **Current**：见下表的预期列（913:52–60、165–166）[S 结构 / I 示例]。

| 子用例 | 频率 | 首期 | 下一期 | 再下一期（从上一期推算） |
|---|---|---|---|---|
| F15-a | Monthly | 2026-01-31 | 2026-02-28 | 2026-03-28 |
| F15-b | Quarterly | 2026-11-30 | 2027-02-28 | 2027-05-28 |
| F15-c | Yearly | 2028-02-29 | 2029-02-28 | 2030-02-28 |

- **Desired**：无已确立目标（DR-13）。
- **Layer**：simulated。
- **Data · cleanup**：DS-1；CL-SIM。
- **Risk**：需要连续两次付款才能看到第二行；示例是静态预测。
- **Status**：CHARACTERIZATION

#### D2-F16 — AutoGenerate=false
- **Scenario**：规则关闭自动生成后付款。
- **Pre**：P-SRV；DS-1；A01a 的输入但 autoGenerate=false。
- **Inputs**：对首期付款。
- **Current**：不生成下一期（913:162）[S]。规则状态保持 Active，且没有任何 Active 期次 [I]。
- **Desired**：无已确立目标。
- **Layer**：simulated。
- **Data · cleanup**：DS-1；CL-SIM。
- **Risk**：这样的规则在看板上没有任何入口 [I]。
- **Status**：CHARACTERIZATION

#### D2-F17 — EndDate 边界（参数表 F17-a … c）
- **Scenario**：付款后下一期与 EndDate 的关系。
- **Pre**：P-SRV；DS-1。
- **Inputs**：见下表的输入列。
- **Current**：见下表的预期列（913:173 起）[S 结构 / I 结果]。

| 子用例 | 条件 | 预期 |
|---|---|---|
| F17-a | 下一期日期 == EndDate | 生成下一期（只有"严格大于"才终止） |
| F17-b | 下一期日期 == EndDate + 1 | 规则转为 Completed，不生成下一期 |
| F17-c | EndDate 早于首期（见 B10） | 首期付款后规则转为 Completed，不生成下一期 |

- **Desired**：无已确立目标。
- **Layer**：simulated。
- **Data · cleanup**：DS-1；CL-SIM。
- **Risk**：Completed 是终态（912:133–139），之后无法再用该规则。
- **Status**：CHARACTERIZATION

#### D2-F18 — 真实 GAS：一次真实付款
- **Scenario**：对一张真实账单记录一次付款，核对 Paid 状态、History、下一期与默认日期。
- **Pre**：P-REAL；A04 之后。
- **Inputs**：由 DR-02 决定。
- **Current**：UNKNOWN。清单 v2 把它列为可选的第二次写入（第 107 行起），并注明下一期的自动生成"没有在真实环境验证"（第 112 行）[S 文档]。
- **Desired**：无已确立目标。
- **Layer**：real GAS（VT-11）。
- **Data · cleanup**：见 CL-REAL。
- **Risk**：写入不可逆。
- **Status**：BLOCKED

---

## G. 空响应、畸形响应与已有 UI 测试缺口

#### D2-G01 — Add Bill：空（null）响应（已知缺陷）
- **Scenario**：假 `console_createObligation` 以 null 调用成功回调。
- **Pre**：P-UI。
- **Inputs**：成功回调收到 null。
- **Current**：成功回调直接读 `res.success`（945:925），对 null 抛 TypeError。按钮在 922 已被禁用，恢复只发生在回调的后续分支，所以按钮保持禁用、没有任何提示 [S 结构 / I 结果]。`UItest` 238–239 把这一行为标为已知缺陷 [R]（本次未执行）。
- **Desired**：无已确立目标（DR-12）。
- **Layer**：simulated（UI）。
- **Data · cleanup**：CL-SIM。
- **Risk**：真实 `google.script.run` 在什么情况下返回 null（例如返回值含 Date）见 G07。
- **Status**：CHARACTERIZATION

#### D2-G02 — Add Bill：失败结果缺少 error 文字（已知缺陷）
- **Scenario**：服务端返回 `{success:false}` 而没有 error。
- **Pre**：P-UI。
- **Inputs**：假响应 `{success:false}`。
- **Current**：`showToast(res.error, true)`（945:925）以 undefined 调用；提示的实际文字 UNKNOWN。`UItest` 241 把它标为已知缺陷 [R]。
- **Desired**：无已确立目标（DR-12）。
- **Layer**：simulated（UI）。
- **Data · cleanup**：CL-SIM。
- **Risk**：无。
- **Status**：CHARACTERIZATION

#### D2-G03 — 保险第二步的空响应（范围外，列出备查）
- **Scenario**：保险类别的第二步（保单创建）收到 null。
- **Pre**：P-UI。
- **Inputs**：保险类别，第一步成功，第二步回调收到 null。
- **Current**：`UItest` 244 把它标为已知缺陷 [R]。保险不在 Water / Electricity / MaintenanceFee 范围内，本次没有重读该分支。
- **Desired**：无已确立目标。
- **Layer**：simulated（UI）。
- **Data · cleanup**：CL-SIM。
- **Risk**：范围外。
- **Status**：BLOCKED（范围决定，见 DR-12）

#### D2-G04 — Pay：null 响应、缺失 error 与传输失败（参数表 G04-a … c）
- **Scenario**：Pay 确认后服务端响应异常。
- **Pre**：P-UI；DS-1。
- **Inputs**：见下表的输入列。
- **Current**：见下表的预期列。现有 UI 测试没有任何 Pay 用例 [S]。

| 子用例 | 响应 | 预期（静态预测） |
|---|---|---|
| G04-a | 成功回调收到 null | 读 `res.success`（945:836）抛 TypeError；确认按钮已在 831 被禁用且未恢复 → 保持禁用、没有提示 [I] |
| G04-b | `{success:false}`（无 error） | `showToast(undefined, true)`，提示文字 UNKNOWN；按钮恢复（836）[S 结构] |
| G04-c | 传输失败（failure handler） | 弹出 `err.message` 并恢复按钮（840）[S] |

- **Desired**：无已确立目标（DR-12）。
- **Layer**：simulated（UI）。
- **Data · cleanup**：CL-SIM。
- **Risk**：无。
- **Status**：CHARACTERIZATION

#### D2-G05 — 看板加载：null、残缺数据与传输失败（参数表 G05-a … c）
- **Scenario**：看板加载时的异常响应。
- **Pre**：P-UI。
- **Inputs**：见下表的输入列。
- **Current**：见下表的预期列。

| 子用例 | 响应 | 预期（静态预测） |
|---|---|---|
| G05-a | 成功回调收到 null | 先隐藏加载态、显示内容区（945:621–622），再读 `res.success`（623）→ TypeError；看板不渲染且无提示 [I] |
| G05-b | `res.data` 缺 `monthlyExpense` | `renderDashboard` 在渲染后访问 `monthlyExpense`（945:639）→ 抛错，后续渲染中断；各列表是否已渲染 UNKNOWN [I] |
| G05-c | 传输失败 | 提示 `Failed to load dashboard: …`（628）[S] |

- **Desired**：无已确立目标（DR-12）。
- **Layer**：simulated（UI）。
- **Data · cleanup**：CL-SIM。
- **Risk**：无。
- **Status**：CHARACTERIZATION

#### D2-G06 — 已有 UI 测试的覆盖与未覆盖清单
- **Scenario**：静态清点现有 UI 测试对 Billing 相关函数的覆盖。
- **Pre**：无。
- **Inputs**：在 `UItest` 中搜索函数名与元素名。
- **Current**：`UItest` 没有引用 `showPayForm`、`pf-amount`、`recordPayment`、`console_getDashboardSnapshot`、`renderDashboard`、`monthlyTotal`、`console_pauseObligation`、`console_cancelObligation`、`console_getPaymentHistory`、`console_getFormOptions` 中的任何一个 [S]。对应用例：Pay → F 系列与 G04；看板 → E 系列与 G05；付款历史 → E08；表单选项 → A02；暂停 / 取消 → 本矩阵没有用例（不在本次范围，列为缺口）。
- **Desired**：无已确立目标。
- **Layer**：static。
- **Data · cleanup**：无。
- **Risk**：只统计"是否被引用"，不评价已有断言的质量。
- **Status**：CHARACTERIZATION

#### D2-G07 — Billing 路径上的 Date 对象与 google.script.run
- **Scenario**：返回值里是否含 Date 对象（可能让回调收到 null）。
- **Pre**：P-REAL；真实 `google.script.run`。
- **Inputs**：调用 createObligation、recordPayment、getDashboardSnapshot、getPaymentHistory，观察回调收到的值。
- **Current**：静态阅读：`createObligation` 返回的 `rule` 由代码构造，日期为字符串；`recordPayment` 返回字符串与数字；`getDashboardSnapshot` 经 `enrichOccurrenceForDisplay_` 只取指定字段；这些路径上没有发现 Date 对象 [I]。单元格被手工改成真实日期时的情况 UNKNOWN。`console_listProperties` 的同类问题已由 `console_browserSafeRow_` 处理 [R]。
- **Desired**：无已确立目标。
- **Layer**：static 现在；真实序列化行为 BLOCKED（VT-08）。
- **Data · cleanup**：只读调用即可，但调用 createObligation / recordPayment 会写入，需要 DR-02。
- **Risk**：静态阅读不能替代真实序列化观察。
- **Status**：BLOCKED

---

## H. 追溯：发现与用例

| D1 发现 / 追加观察 | 覆盖它的用例 |
|---|---|
| G1 账单信息无处记录 | 无用例（需求项，DR-03）；A06 记录当前 History 关系 |
| G2 收据证据 | 无用例（需求项，DR-04）；F01 记录 Evidence 恒为空串 |
| G3 预计金额与实际金额 | F02 |
| G4 币种 | B12、E09 |
| G5 重复与部分写入 | C01–C10、D01–D07、F12、F13 |
| G6 Pay 校验与日期 | F03–F13、G04 |
| G7 日期与 EndDate 校验 | B09、B10、B14、F06 |
| G8 读回盲区 | E01、E03、E07 |
| G9 空响应与已知缺陷 | G01–G05 |
| AO-1（+7 双列表） | E01-b |
| AO-2（宽限期内不可见） | E01-g |
| AO-3（`RM ` 前缀） | B12、E09 |
| AO-4（月末漂移） | F15 |
| AO-5（Suspended 上付款） | F11 |
| AO-6（Pay 与看板的 null 回调） | G04、G05 |
| AO-7（harness 限制） | H-1 … H-7 |
| AO-8（事件失败无自然触发） | D05 |
| AO-9（错误码命名） | F10 |

## I. 本矩阵不覆盖的内容

- 暂停 / 取消 / 恢复规则的流程（946 有 `console_pauseObligation`、`console_cancelObligation`，没有恢复的包装），以及 `updateObligation` 与付款冲销。
- 保险类别的两步流程与保单面板。
- Water / Electricity / MaintenanceFee 之外的类别。
- EventBus 的任何语义（V7）与 912 F-01（V8）。
- Telegram 或其他非 Console 入口。
- 真实 GAS 的性能与配额。

## J. 状态汇总

- 用例块共 75 个；其中 8 个带参数表，共 35 个子用例。
- CHARACTERIZATION：60；TARGET：3；BLOCKED：12。
- **TARGET（行为已由规格确立）**：C04a（`Spec:145`）、F08（`Spec:147`、`Spec:267`）、F10（`Spec:147`；错误码命名未定）。
- **BLOCKED**
  - 需要真实环境：A04、A05、C04b、C09b、C10、E06b、F05、F18、G07。
  - 需要用户决定：D07、E07、G03。
- 没有任何用例被执行；"Current" 栏没有任何内容是观察结果。
- 运行 simulated 用例的前置：DR-01（是否授权运行，以及 harness 调整的范围）与 DR-15（harness 选择）。运行 real GAS 用例另需 V1–V5 解锁与 DR-02。
