# Property OS — Billing Phase B1 实施计划（Planning Gate）

**PLAN ONLY · NOT AUTHORIZED FOR IMPLEMENTATION · NON-AUTHORITATIVE SOURCE**

| 项 | 内容 |
|---|---|
| 日期 | 2026-10-27（本次任务开始时的设备时钟，Asia/Kuala_Lumpur）。此前 D1、D2 文件按沙箱时钟写作 2026-10-25，与设备日期不一致；本次没有改动那些文件 |
| 范围 | 只含 Water、Electricity、MaintenanceFee 的六项：Pay 金额校验、Pay 日期政策、重复付款、Add Bill 防重复、部分写入与歧义失败、基础读回 |
| 输入 | D1 静态审查记录、D2 测试矩阵、决策登记、验证清单（候选报告，只当辅助证据），以及 `50_Property-main.zip` 里的非权威源码副本 |
| 方法 | 只读静态阅读。没有运行任何测试或应用函数；没有访问真实仓库、真实 GAS 或生产数据；没有修改任何源文件。本计划是本次唯一新建的文件 |
| 状态 | 计划，等待评审。实施授权将另行发出；本文不授权任何实施 |

## 0. 摘要

1. **切片**：B1 拆成 S1–S6。最小核心是 S1–S3（Pay 金额、Pay 日期、重复付款）；S4–S6（Add Bill 防重复、失败恢复、读回）是第二批，且只涉及 UI 与文档。不改 schema，不碰 EventBus，不碰 912 F-01。
2. **三个关键设计**：
   - 马来西亚日期政策用固定 UTC+8 的纯函数实现，不依赖浏览器或脚本时区，这样模拟测试能真实验证它。
   - 严格的 Pay 金额校验放在 Console 边界（UI 与 946）。引擎 `recordPayment` 只校验"已提供的值"，保留"缺失则取预计金额"的回落，因为 16 处既有服务端测试调用依赖它。
   - Add Bill 的 `clientRequestId` 只加给三个目标类别，并与表单内容的指纹绑定。
3. **诚实的限制**：`clientRequestId` 只能挡住"首次其实完整成功、响应丢失"的重复，挡不住部分写入。部分写入靠"先查表再重试"的操作员流程，B1 不自动修复。
4. **现有测试的约束**：现有 UI 测试对 Add Bill 的提示文字、持续时间与看板刷新次数有精确断言（UItest:176、195–197）。所以新增提示一律放进新的常驻状态框，不改现有 toast。
5. **模拟测试的现状**：UI 假 DOM 的 `querySelector` 返回 null、`addEventListener` 是空函数（UItest:51–52），Pay 表单的点击路径现在无法测试。B1 把逻辑抽成纯函数来测，DOM 连线靠真实浏览器验证。
6. **能否在没有权威仓库时推进**：能起草候选补丁，并在获得授权后做模拟测试；不能应用、合并、部署或做真实 GAS 验证。一条只读 `git ls-tree` 命令就能消除最大的不确定性（第 8 节）。
7. **需要你批准的决定**：12 项（第 4.2 节）。

## 1. 来源、证据分类与基线

- 来源 zip：`50_Property-main.zip`，SHA-256 `ef21e91ae9ab51f1dd1abe4b445f7edd6fa4e45e153fcc680b294083fe63642c`。它是非权威副本，来源仍未验证（V1–V5 未解锁；B-4 recovery 检查点为 BLOCKED）。本计划不假定它是当前权威源码。
- 证据标签：
  - **[S]** 本次规划中重读源码并核对的事实，只说明"源码这样写"。
  - **[R]** D1、D2、治理候选文本报告的内容，本次没有独立重查。
  - **[I]** 静态推断，没有任何运行观察支持。
  - **[U]** 运行时行为，未验证。
  - **[T]** 拟议行为，未授权。
- 候选补丁将针对的基线（zip 副本）：

| 文件 | SHA-256 | git blob ID（按 git 规则由 zip 字节重算） |
|---|---|---|
| `945_OperatorConsole.html` | `d1bf51ed80b92ad3bd8a31ad6f367881a93eace2a1124e95d286006f07845651` | `f09956fe4cbf8516f8151dd0ed5cf6fa210c40f8` |
| `946_OperatorConsoleServer.js` | `e993b71baed38686b17906e42587341ee98a1f531b53c7b544c5e86f5eebae26` | `961e3ea71ea2161f3903ac6a7333c923bbb46674` |
| `912_ObligationEngine.js` | `8a40643e21994b004da4e1790edef8fec75d0487a17f6fc9894a5c2315087839` | `10c61992cea010326754e7e57b6f4134aa9ead0f` |

- 本计划中的行号都对应这些 zip 副本。写法：`945:818` 表示 `945_OperatorConsole.html` 第 818 行；`946`、`912`、`922`、`901` 同理；`UItest` = `local_precheck_test_945_addBill_ui.js`；`GasShim` = `GasShim.js`。

## 2. 候选改动清单

**C1 `912_ObligationEngine.js` — 新增三个私有纯函数**（放在 `recordPayment` 之前；不引用 Utilities 或 Session）
- `malaysiaTodayIso_(nowMs)`：返回马来西亚本地日（UTC+8，无夏令时）的 `yyyy-MM-dd`。
- `parsePositiveAmount_(raw)`：返回有限且大于 0 的数值，否则返回 null。
- `isRealIsoDate_(s)`：`yyyy-MM-dd` 格式且是真实的日历日期。
- 对应：项 1、2；切片 S1。

**C2 `912_ObligationEngine.js` — `recordPayment`（492–601）**
- 在 494 的输入检查之后、读取期次之前：(a) `input.paidAmount != null` 时必须通过 `parsePositiveAmount_`，否则 `INVALID_INPUT`；(b) `input.paidDate` 非空白时必须通过 `isRealIsoDate_`，否则 `INVALID_INPUT`。
- 532 的缺省日期改为 `malaysiaTodayIso_(Date.now())`。533 的"缺失则取预计金额"保持不变。
- 已付分支（506–515）与成功返回（592 起）的字段不变。
- 对既有测试的影响：16 处不传 `paidAmount` 的调用走回落，不受影响；26 处传了 `paidAmount` 的调用，值为 20、22、250、1500、1550，都通过新校验。
- 对应：项 1、2、3；切片 S2。

**C3 `946_OperatorConsoleServer.js` — `console_recordPayment`（98–107）**
- 在调用引擎前，对原始 `paidAmount`（可能是字符串）严格校验：缺失（undefined、null、空串、空白）与非法（非数值、NaN、±Infinity、小于等于 0、格式不合）分别给出明确信息；通过后以数值传给引擎。取消 `Number(paidAmount)`（102）。
- `paidDate` 不在此处转换，交给引擎校验与缺省。
- 对应：项 1；切片 S2。

**C4 `945_OperatorConsole.html` — 新增纯函数**（紧邻 `billSavedMessage_`，1698 行附近）
- `malaysiaTodayIso_`、`parsePayAmount_`（与 C1 的规则逐字等价）、`payResultMessage_(entered, data)`、`addBillFingerprint_(input)`、`pendingAddFor_(state, fingerprint, makeId)`、`newClientRequestId_()`、`locateInSnapshot_(data, obligationId)`、`windowNote_(dueIso, graceDays, todayIso)`。
- 全是纯函数：不碰 DOM，不调用服务端。
- 对应：项 1、2、3、4、6；切片 S1。

**C5 `945` — `showPayForm`（811–851）**
- 818：默认日期改为 `malaysiaTodayIso_(Date.now())`。
- 830–842：确认处理先校验金额与日期，失败则提示并返回，不禁用按钮、不发请求（现在 831 先禁用、832 读值、841 才发请求）。
- 836–838：成功回调区分三种结果（新记录、已付且一致、已付但不一致），不再对 `alreadyPaid` 显示 `Payment recorded.`；读取 `res.data` 之前加空响应保护。
- 失败回调（840 起）：附加恢复提示（见 5.5）。
- 对应：项 1、2、3、5；切片 S3。

**C6 `945` — `submitAddBill`（866–967）**
- 请求体构造完成后：若 `input.category` 属于 Water、Electricity、MaintenanceFee，附加 `clientRequestId`（`pendingAddFor_` 返回的、与指纹绑定的 ID）。其他类别（含保险两步流程）逐行不变。
- 成功回调（924–931）：现有 toast 文字、持续时间、清空 payee 与 amount、`loadDashboard()` 恰好一次，全部保持；另外写入 `state.lastSaved`、更新状态框、清除 `state.pendingAdd`。
- 失败分支（925 与 965 起的失败回调）：现有 toast 文字保持；另在状态框写入失败文字与恢复提示。
- 对应：项 4、5、6；切片 S4、S5。

**C7 `945` — `loadDashboard`（616–631）**
- 成功回调里保存 `state.lastSnapshot = res.data`，并调用 `afterDashboardLoaded_()`（检查 `state.lastSaved`、更新状态框）。调用次数与签名不变。
- 对应：项 6；切片 S5。

**C8 `945` — Add Bill 表单区（`ob_submit`，322 行之后）**
- 新增一个只读状态框容器 `id="ob_status"`；内容一律用 `textContent` 写入，不用 `innerHTML`。
- 对应：项 5、6；切片 S5。

**C9 `945` — `state`（438 行）**
- 增加 `pendingAdd`、`lastSaved`、`lastSnapshot` 三个字段。

**C10 新测试文件（候选；当前不运行）**
- `local_precheck_test_B1_helpers.js`（UI 与引擎的纯函数）、`local_precheck_test_B1_recordPayment.js`（服务端 shim）。命名沿用现有 `local_precheck_test_*` 约定。内容见第 6 节。

**C11 新文档（候选）**
- `Billing_Real_Environment_Checklist_v3_candidate.md`：在 v2 基础上加入恢复手册与读回步骤。不修改 v2。

**不改动**：`912` 的 `createObligation`（333–426）与 `logPartialFailure_`（91）、913、922、900、901、903、910、946 的其他包装；任何 schema、表头、事件定义；现有测试文件。

## 3. 当前行为：源码支持 vs 仅报告

### 3.1 Pay 金额
- [S] Pay 表单把 `.pf-amount` 的字符串值原样发出，没有任何校验（945:832、841）。
- [S] 946 用 `Number(paidAmount)` 转换（946:102）；`Number('')` 的结果是 0。
- [S] `recordPayment` 对已提供的值取 `Number(input.paidAmount)`，缺失才回落到期次预计金额（912:533）。本次重读 492–538 没有看到 `> 0`、`isNaN`、`isFinite` 之类的检查（D1 记录里对整个函数体做过同样的否定性检查）。
- [I] 因此留空、0、负数、NaN 都会被当作有效金额记录；未经运行验证。
- [S] 既有服务端测试中有 16 处 `recordPayment({...})` 调用不传 `paidAmount`，依赖回落：`912_Tests_ObligationEngine.js` 第 147、148、156、167、175、184、355 行（7 处）、`991_Tests_ObligationEngine.js` 第 241、265 行（2 处）、`993_Tests_FullLifecycle.js` 第 128、129、135、143、149、157、232 行（7 处）。

### 3.2 Pay 日期
- [S] UI 默认值是 `new Date().toISOString().slice(0, 10)`（945:818），即 UTC 日期。
- [S] 服务端缺省是 `toIsoDate_(new Date())`（912:532），`toIsoDate_` 取 `Session.getScriptTimeZone()`（901:718）。zip 里的 `appsscript.json` 写的是 `Asia/Singapore`。
- [S] 代码里没有任何"马来西亚本地日"的显式定义。时区相关的语句只有 901:718、945:780、945:818 和 GasShim:180。945:780（保险续保表单的默认起始日）有同类 UTC 默认，不在 B1 范围。
- [S] `paidDate` 没有任何格式校验（912:532 起）。
- [I] 马来西亚时间 00:00–08:00，UI 默认日期是前一天。
- [U] 已部署脚本的实际时区未知（VT-06）。

### 3.3 重复付款
- [S] 已付期次直接返回 `alreadyPaid: true` 与已记录的 `paidDate`、`paidAmount`（912:506–515），不再写任何行；成功路径返回 `alreadyPaid: false`（912:592）。
- [S] UI 对任何 `success: true` 都提示 `Payment recorded.`，不看 `alreadyPaid`（945:836–838）。
- [R] 规格 `ObligationEngine_VerticalSlice.md:147、267` 写明按 OccurrenceID 幂等、重复调用不报错（D2 的 TARGET 用例 F08 依据）。

### 3.4 Add Bill 防重复
- [S] 945 全文没有 `clientRequestId`；`submitAddBill` 的请求体不含币种。
- [S] 服务端：带 `clientRequestId` 时先读缓存（912:338）；缓存只在整个流程成功后写入（912:423）；有效期 3600 秒（912:110）。
- [S] `createObligation`（333–426）没有按 Property、类别、到期日或金额的重复查找。
- [I] 首次部分写入失败后用同一个 ID 重试不会命中缓存，会再建一条规则。
- [R] 平台缓存是尽力而为、可能被提前淘汰（平台常识，本环境未验证）。

### 3.5 部分写入与歧义失败
- [S] 结构：Rule 追加（912:384）→ Occurrence 与 History（386 → 309、310，都不在 try/catch 内）→ 事件在 try/catch 内（394–415），失败时 `logPartialFailure_`（91）并重新抛出。
- [S] UI 失败分支只显示原始错误文字：服务端错误走 `res.error`（945:925），传输失败走失败回调的 `err.message`（965 起）。没有恢复提示。
- [S] 现有 `Billing_Real_Environment_Checklist.md` v2 第 65–69 行写了"先查 `ObligationRules` 再重试"。那是文档，不是系统保护。
- [I] 后果（孤儿 Rule、缺 History、界面报错但数据已写入）由结构推出。

### 3.6 读回
- [S] 成功提示含 Obligation ID 与首期日期（945:1698 起的 `billSavedMessage_`）；看板条目带 `obligationId`（922:111）。
- [S] 946 没有"列出全部 Obligation"或"按 ID 查询"的函数。
- [R] 看板窗口为今天到 +7、+7 到 +30，逾期判断含宽限期（D1 记录 AO-1、AO-2；本次没有重读 922:76–98 与 913:107–114）。
- [I] 首期晚于 +30 天的新账单在界面不可见。

### 3.7 仅报告、本次没有独立重查
- D1 的 G1–G4，以及 G7 中"UI 的日期控件掩盖了它"。
- D2 矩阵里所有 "Current" 栏的预测。
- 治理候选文本里的测试数字、授权与决定（ADR-P29、BL-23、BL-24、BL-28 等）：来源未核实，本计划不把它们当作证据。
- 真实环境：没有任何验证。

## 4. 拟议行为与需要批准的决定

### 4.1 六项的拟议行为

**B1-1 Pay 金额校验**
- 规则：金额必须是有限数值且大于 0。字符串形式必须是纯十进制（去首尾空白后匹配 `^(\d+(\.\d+)?|\.\d+)$`）。拒绝：空、空白、null、undefined、NaN、±Infinity、0、负数、带符号 / 千分位 / 货币符号 / 科学计数法的字符串、非数值类型。
- 三层：UI（即时提示，不发请求，不禁用按钮）；946（Console 边界，严格）；912（只校验已提供的值，`paidAmount == null` 仍回落到期次预计金额）。
- 错误：`INVALID_INPUT`。UI 文案 `Enter a payment amount greater than 0.`；946 缺失 `Payment amount is required.`、非法 `Payment amount must be a number greater than 0.`；912 非法 `Payment amount must be a number greater than 0.`。
- 不做：小数位限制、取整、上限、币种。
- 验收：S-1、S-4、S-6（第 6 节）。

**B1-2 Pay 日期政策**
- 政策：付款日期取马来西亚本地日历日（Asia/Kuala_Lumpur，UTC+8，无夏令时），与浏览器时区、脚本时区无关。
- UI 默认值与服务端缺省值使用同一个纯函数（C1 与 C4 逐字等价）：

```js
// ILLUSTRATIVE — 说明规则用的草图，不是补丁
function malaysiaTodayIso_(nowMs) {
  return new Date(nowMs + 8 * 3600 * 1000).toISOString().slice(0, 10);
}
function parsePositiveAmount_(raw) {          // 有限且大于 0 的数值，否则 null
  var n;
  if (typeof raw === 'number') n = raw;
  else if (typeof raw === 'string' && /^(\d+(\.\d+)?|\.\d+)$/.test(raw.trim())) n = Number(raw.trim());
  else return null;
  return (isFinite(n) && n > 0) ? n : null;
}
function isRealIsoDate_(s) {                   // yyyy-MM-dd 且是真实日期
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s));
  if (!m) return false;
  var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}
```

- 服务端：`paidDate` 为空白 → `malaysiaTodayIso_(Date.now())`；非空 → 必须通过 `isRealIsoDate_`，否则 `INVALID_INPUT`，信息 `Payment date must be a valid date (yyyy-MM-dd).`。
- 不做：过去 / 未来日期限制；看板窗口与逾期判断（仍用脚本时区）；`appsscript.json`；`toIsoDate_`；保险续保表单的 UTC 默认（945:780）。
- 验收：S-2、S-3、S-5。

**B1-3 重复付款**
- 服务端不变：已付 → `alreadyPaid: true` 与已记录的内容。
- UI 区分三种结果（读 `res.data.alreadyPaid`）：
  - 新记录：`Payment recorded: RM <金额> on <日期>.`
  - 已付且一致：`Already recorded: paid on <日期> for RM <金额>. Nothing was changed.`
  - 已付但不一致：`This bill was already paid on <日期> for RM <金额>. The amount or date you entered was NOT saved.`（错误样式）
- 三种结果后都刷新看板。
- 验收：S-7、S-8。

**B1-4 Add Bill 防重复**
- 范围：category 属于 Water、Electricity、MaintenanceFee 才附加 `clientRequestId`；其他类别行为不变。
- 做法：对表单内容取指纹（property、category、payee、amount、frequency、自定义间隔、到期日、宽限天数、自动生成、结束日期）。同一指纹的重试复用同一个 ID；指纹变化换新 ID；成功后清除。ID 格式 `CRQ-<时间 base36>-<8 位随机 base36>`。
- 服务端不改。
- 能保护的：首次调用其实完整成功但响应丢失或超时，且重试发生在 3600 秒内、缓存未被淘汰、页面未重载。此时服务端返回原结果、不新增行。
- 不能保护的见 5.3。
- 不在核心里的加固（需另行批准）：服务端在写入前后记录阶段标记以阻止盲目重试；对 Property + Category + 到期日 + 金额做只读的软重复提示。
- 验收：S-9、S-11。

**B1-5 部分写入与歧义失败**
- 语义分类、界面文案与操作员恢复流程见第 5 节。
- 不做：自动重试、自动修复、服务端补写缺失步骤、EventBus 调整、手工改表。

**B1-6 基础读回**
- Tier 0（无代码）：按 Obligation ID 在 `ObligationRules` 找到规则，在 `ObligationOccurrences` 按 ObligationID 找期次，在 `ObligationHistory` 按 OccurrenceID 找创建记录；到期日在窗口内时再看看板。
- Tier 1（仅 UI）：保存成功后，状态框显示 Obligation ID、Occurrence ID、Property、类别、Payee、金额、首期到期日；看板刷新后自动按 `obligationId` 在逾期、本周、30 天内三个列表里核对，并说明结果：
  - 找到：`Checked on the dashboard: found under "<分区>".`
  - 首期在窗口之外：`Not shown on the dashboard yet: the first due date is more than 30 days away. Check ObligationRules for Obligation ID <id>.`
  - 已过到期日但仍在宽限期：`Not shown on the dashboard: the due date has passed but the grace period has not ended. Check ObligationRules for Obligation ID <id>.`
  - 看板正按另一个 Property 过滤：`The dashboard is filtered to another property. Clear the filter or check ObligationRules.`
  - 其余：`Not found on the dashboard. This does not prove the save failed. Check ObligationRules for Obligation ID <id>.`
- Tier 2（可选，不在核心）：新增只读 `console_getObligationSummary(obligationId)`。
- 验收：S-10；真实验证见 REAL-7。

### 4.2 需要你批准的决定

**B1-D1 日期政策的区域与实现方式**（DR-08）
- 提议：马来西亚本地日 = Asia/Kuala_Lumpur（UTC+8，无夏令时），用固定 +8 小时的纯函数计算；只用于 Pay 默认日期、服务端缺省日期和读回窗口说明。
- 备选：(a) 依赖脚本时区（需先核实部署，模拟无法真实测试）；(b) 取浏览器本地日（依赖使用者设备）；(c) 改 `appsscript.json` 的时区（属于部署变更，B1 不含）。
- 影响：看板窗口与逾期判断仍用脚本时区。若真实脚本时区不是 UTC+8，两者在午夜附近会不一致（VT-06）。

**B1-D2 `paidDate` 的格式校验**（DR-08）
- 提议：非空时必须是真实的 `yyyy-MM-dd`；过去与未来日期都不限制（保持现状）。
- 备选：同时拒绝未来日期（需要先定义"提前付款"的规则）。

**B1-D3 金额规则**（DR-08）
- 提议：有限数且大于 0；纯十进制写法；不限制小数位、不取整、不设上限；拒绝科学计数法、千分位、货币符号。
- 备选：限制两位小数（涉及币种与精度治理，B1 不含）。

**B1-D4 引擎对缺失金额的回落**
- 提议：保留（`paidAmount == null` 取期次预计金额）；严格性只加在 Console 边界与"已提供的值"。
- 备选：引擎也拒绝缺失。这会让 16 处既有测试调用失败，需要同步修改测试，而 B1 不改现有测试文件。

**B1-D5 重复付款的界面处理**（DR-09）
- 提议：三种结果分开显示；"已付但内容不同"用错误样式并明确"未保存"；所有路径刷新看板。
- 备选：全部用普通样式；或把"已付但内容不同"当作服务端错误（会改变规格已确立的幂等行为，不建议）。

**B1-D6 Add Bill 防重复的范围**（DR-07）
- 提议：UI 生成 `clientRequestId`，仅限三个目标类别，与表单指纹绑定；接受 5.3 节列出的限制；服务端不改。
- 备选加固：服务端阶段标记；自然键软提示。两者都是新的服务端逻辑，需要另行批准。

**B1-D7 失败提示放哪里**（DR-07、DR-12）
- 提议：恢复提示放进新的常驻状态框，不改现有 toast 文字。
- 备选：把提示并入 toast。这需要修改现有 UI 测试（UItest:176 对错误文字有精确断言），而 B1 不改现有测试文件，需要你批准修改。

**B1-D8 操作员恢复流程是否允许手工改表**（DR-07）
- 提议：手册只含"查看与记录"，不含手工改表。孤儿 Rule、缺失的 History 行、缺失的下一期，都标为"需要开发者或另行批准的处理"。
- 备选：批准一套手工修复步骤（风险：绕过引擎，History"只追加"的约定会被破坏）。

**B1-D9 读回的范围**（DR-11）
- 提议：Tier 0 + Tier 1。
- 备选：加 Tier 2 的只读查询。这是新的服务端表面，返回值必须全是字符串与数字，以避免 Date 序列化问题。

**B1-D10 测试授权与 harness**（DR-01、DR-15）
- 提议：授权运行模拟测试（只限非权威工作副本）。harness 方案 A：只测纯函数与服务端 shim；方案 B：再扩展 UI 假 DOM（`querySelector`、`addEventListener`、`remove`、解析 `<input>`）。
- 备选：不扩展假 DOM，Pay 与 Add Bill 的 DOM 连线完全靠真实浏览器验证。

**B1-D11 候选补丁的交付形式**
- 提议：每个文件一份统一 diff，头部记录 base SHA-256 与补丁后 SHA-256；候选测试与文档作为新文件；放在新的候选输出目录；不生成基线 ZIP，不覆盖任何已有文件，不应用补丁。
- 说明：候选治理文本 ADR-P32（来源未核实）也写了不建基线、不合并 945/946 基线，与你本次的限制一致。

**B1-D12 Pay 回调的空响应保护**（DR-12）
- 提议：在 B1 改动到的 Pay 回调里顺带加入 `res && res.data` 保护，否则读取 `res.data.alreadyPaid` 会在 null 响应时抛错。
- 备选：不加，等 DR-12 统一处理（新代码会带着已知缺陷）。

## 5. 失败与重试语义

标签：这些行为都由源码结构推出（[S] 结构，[I] 结果），没有任何运行观察。

### 5.1 Add Bill

| 场景 | 表状态（Rule / Occ / History） | 服务端返回 | 用同一 ID 重试 | 能否直接重试 | 先查什么 |
|---|---|---|---|---|---|
| 写入前被拒绝（校验失败、Property 不存在、锁超时） | 0 / 0 / 0 | 错误 | 无影响 | 可以（改正后） | 无需 |
| Rule 已写，Occurrence 失败 | 1 / 0 / 0 | 错误，无部分失败日志 | 不命中缓存，会再建一条 | **不可以** | `ObligationRules` 有无孤儿 Rule |
| Occurrence 已写，History 失败 | 1 / 1 / 0 | 错误，无部分失败日志 | 同上，会重复 | **不可以** | 账单已存在：看板或表里核对 |
| 事件步骤失败 | 1 / 1 / 1 | 错误，有部分失败日志 | 同上，会重复 | **不可以** | 账单已存在：核对 |
| 成功但响应丢失 | 1 / 1 / 1 | 无（浏览器没收到） | 缓存有效期内命中，返回原结果、不新增行 | 先查表再决定 | 表里有无该账单 |
| 成功，但在看板窗口之外 | 1 / 1 / 1 | 成功 | 不需要 | — | 按 Obligation ID 在表里核对 |

### 5.2 Pay

| 场景 | 状态 | 服务端返回 | 重试 | 先查什么 |
|---|---|---|---|---|
| 写入前被拒绝（金额或日期不合法、期次不存在、规则 Cancelled、锁超时） | 无变化 | 错误 | 改正后可重试 | — |
| 已付（重复提交） | 无变化 | `alreadyPaid: true` 与已记录的内容 | 无需，也无害 | 对照已记录的内容 |
| Paid 已写，History 失败 | Paid；无 History、无事件、无下一期 | 错误，有部分失败日志 | 重试只会得到 `alreadyPaid`，**不会补做** | 期次状态、History、是否有下一期 |
| History 已写，事件失败 | Paid + History；无下一期 | 错误，有日志 | 同上 | 同上 |
| 事件已写，下一期失败 | Paid + History；无下一期 | 错误，有日志 | 同上 | 同上 |
| 成功但响应丢失 | 全部完成 | 无 | 重试得到 `alreadyPaid`（无害） | 对照已记录的内容 |

### 5.3 `clientRequestId` 的作用与限制

作用：UI 在同一份表单内容的重试中复用同一个 ID；服务端在 3600 秒内、整个流程成功过的前提下返回原结果。

限制：
1. 缓存只在整个流程成功后写入（912:423）。部分写入后重试不会命中缓存，会再建一条。这是最重要的限制。
2. 有效期只有 3600 秒（912:110）；缓存可能被提前淘汰；页面重载后 ID 丢失。
3. 服务端按 ID 返回缓存，不比较载荷。同一个 ID 配不同内容会返回第一次的结果，所以 UI 必须绑定指纹，永不把 ID 用于不同内容。
4. UI 无法区分"缓存回放"与"新保存"。成功提示里的 Obligation ID 是唯一线索，需要与表里核对。
5. 用户改动内容后重录，指纹变化、ID 变化，不受保护；服务端也没有自然键去重。
6. 不影响锁：两个会话同时提交，只是被锁串行化，不会去重。

### 5.4 操作员恢复流程（提议，需要批准；不含手工改表）

**Add Bill 报错或没有响应**
1. 不要立刻重试，也不要刷新页面（表单内容与状态框都在页面里）。记下提示文字与时间。
2. 打开 `ObligationRules`，按 Property、Category、Payee、Amount、DueAnchor 查找刚才那一条。
3. 按结果处理：
   - 没有找到：可以重试（用页面上的同一个按钮）。
   - 找到一条：账单已存在，不要重试。再到 `ObligationOccurrences` 按 ObligationID 看是否有期次；若没有，这是孤儿 Rule，记下 Obligation ID，升级处理（B1 不提供修复）。
   - 找到不止一条：出现重复，记下所有 Obligation ID，升级处理（取消多余的一条需要批准）。
4. 把 Obligation ID、时间与处理结果记在备忘里（B1 不自动记录）。

**Pay 报错或没有响应**
1. 不要用重复点击来"修复"。刷新看板。
2. 看该期次是否已是 Paid，以及 PaidDate、PaidAmount 是否与预期一致。
3. 在 `ObligationHistory` 查该期次的 `Active → Paid` 行；若规则设置了自动生成且未到结束日期，查是否出现了下一期。
4. 缺失任何一项：记录并升级（B1 不提供修复；重试只会得到 `alreadyPaid`）。

### 5.5 拟议的界面文案（英文，与现有界面一致）

- Add Bill 失败，且错误码不属于"写入前拒绝"集合：状态框写 `The bill may have been saved even though an error was shown. Do not retry yet: check ObligationRules for <payee> due <date> first.`
- Add Bill 传输失败：`No response was received. The bill may or may not have been saved. Check ObligationRules before retrying.`
- Pay 失败，且错误码不属于"写入前拒绝"集合：toast 追加 `The payment may have been recorded. Reload the dashboard and check before trying again; a retry will not repair a half-finished payment.`
- "写入前拒绝"集合（实施时从 912 与 902 里的 `propertyError_` 调用逐一提取，并经评审确认）至少含：`INVALID_INPUT`、`INVALID_ID_FORMAT`、`INVALID_CATEGORY`、`INVALID_FREQUENCY`、`PROPERTY_NOT_FOUND`、`LOCK_TIMEOUT`。这些代码在源码中都存在 [S]。

## 6. 测试计划

### 6.1 静态评审（补丁出来后由评审者逐条核对）
- SR-1 diff 只涉及第 2 节列出的文件与函数；没有 schema、列、表头改动；901 与 900 不变。
- SR-2 不改 EventBus 或 `publishPropertyEvent_`；不涉及 912 F-01。
- SR-3 `recordPayment` 里的校验位于任何写入之前；`paidAmount == null` 的路径不变。
- SR-4 三处金额规则（945、946、912）与三处日期规则逐字符等价，使用同一个正则与同一个阈值。
- SR-5 `malaysiaTodayIso_` 不依赖 Utilities、Session 或本地时区。
- SR-6 `clientRequestId` 只附加在三个目标类别上；保险路径逐行不变。
- SR-7 945 中不再用 `toISOString().slice(0, 10)` 表示"今天"（945:780 除外，范围外）。
- SR-8 `alreadyPaid` 分支不再显示 `Payment recorded.`。
- SR-9 新增的界面文字用 `textContent` 写入，不拼接未转义的 HTML。
- SR-10 没有新增服务端表读写；`createObligation` 与 `logPartialFailure_` 未改动。
- SR-11 每份补丁头部记录 base SHA-256（第 1 节）与补丁后 SHA-256。
- SR-12 既有测试中的调用点：16 处不传 `paidAmount`、26 处传 20、22、250、1500、1550，都不会被新校验拒绝。
- SR-13 现有 UI 测试文件未被修改；Add Bill 的 toast 文字、持续时间、清空行为与 `loadDashboard()` 调用次数未变（UItest:176、195–197）。

### 6.2 模拟测试（simulated；当前不运行；需要 DR-01 与 DR-15）
前置：服务端用例需要 harness 调整（`runAllTests.js` 引用的 `./tests/` 在 zip 里不存在；shim 不含 910 与 922），UI 连线用例受假 DOM 限制（UItest:51–52）。

| ID | 内容 | 对应 D2 用例 |
|---|---|---|
| S-1 | 金额解析矩阵，UI 与引擎两份实现跑同一组用例。接受：`42.5`、`'42.50'`、`' 0.01 '`、`'.5'`、`1e6`（数值）。拒绝：`''`、`'  '`、null、undefined、NaN、±Infinity、`0`、`'0'`、`'0.00'`、`-5`、`'-5'`、`'5.'`、`'1e3'`、`'1,200.00'`、`'RM 5'`、true、`[]`、`{}` | F03、B07 |
| S-2 | `malaysiaTodayIso_`：`2026-10-24T15:59:59Z` → `2026-10-24`；`16:00:00Z` → `2026-10-25`；`23:59:59Z` → `2026-10-25`；`2026-10-25T00:00:00Z` → `2026-10-25`；跨年 `2026-12-31T16:00:00Z` → `2027-01-01`；闰日 `2028-02-28T16:00:00Z` → `2028-02-29` | F04 |
| S-3 | `isRealIsoDate_`：接受 `2026-02-28`、`2028-02-29`；拒绝 `2026-02-30`、`2026-13-01`、`abc`、`2026/10/24`、空串、` 2026-10-24`、`2026-10-24T08:00:00Z` | F06、B09 |
| S-4 | `recordPayment` 金额：已提供的非法值 → `INVALID_INPUT`，期次、History 行数不变，没有事件；合法值成功；缺失回落（既有测试同时作为回归） | F03 |
| S-5 | `recordPayment` 日期：缺失或空白 → 用注入时钟算出的马来西亚日；格式错误或不真实 → `INVALID_INPUT` 且不写；合法 → 原样写入 | F04、F06 |
| S-6 | `console_recordPayment`：`''`、`'0'`、`'-5'`、`'abc'`、null → 被拒绝且引擎未被调用（用 spy 验证）；`'42.50'` → 引擎收到数值 42.5 | F03 |
| S-7 | 重复付款回归：同一期次第二次调用仍返回 `alreadyPaid: true` 且行数不变 | F08、F09 |
| S-8 | `payResultMessage_`：三种结果的文案与样式标志 | F08、F09 |
| S-9 | 指纹与 ID：同指纹复用同一 ID；指纹变化换新 ID；成功后清除；非目标类别（含保险）不产生 ID | C01–C08 |
| S-10 | `locateInSnapshot_` 与 `windowNote_`：today、+7、+8、+30、+31、−1（宽限 0、1、3） | E01 |
| S-11 | 回归：D2 中部分写入与 `clientRequestId` 的特征用例在 B1 前后结果一致（B1 不改变这些行为） | C04a、C05–C07、D01–D04、F12、F13 |
| S-12 | 回归：现有 UI 测试文件不修改，应全部仍通过，尤其 176、195–197 的精确断言 | — |
| S-13 | UI 连线（Pay 表单点击路径、状态框更新） | BLOCKED：等 B1-D10 |

### 6.3 真实 GAS 验证（全部 BLOCKED：需要 V1–V5 解锁、DR-02 与实施授权）
- REAL-1 真实脚本时区，核对与 `malaysiaTodayIso_` 的一致性（VT-06）。
- REAL-2 Pay 的拒绝路径：对一个真实 Active 期次发送空、0、负金额，确认被拒绝且没有写入。
- REAL-3 一次真实付款（写入，受 DR-02 约束）。
- REAL-4 对已付期次再次点击 Pay，确认提示是"已记录"而不是"已付款"。
- REAL-5 Add Bill 加 `clientRequestId` 的重复提交与重试（会产生真实数据，受 DR-02 约束）。
- REAL-6 `google.script.run` 回调收到的形态，包括 `res.code`（VT-08）。
- REAL-7 看板读回与状态框：+7、+8、+30、+31 边界（受 DR-02 约束）。
- REAL-8 真实浏览器中的 DOM 连线。
- REAL-9 恢复手册的"查表"部分演练，不诱发失败。

### 6.4 层间声明
静态评审只说明代码这样写；模拟测试只说明在模型内的行为，不证明真实 GAS；真实 GAS 验证尚未进行。本计划没有运行任何测试，也不声称任何测试通过。

## 7. 风险、依赖、回滚与停止条件

### 7.1 风险

| ID | 风险 | 缓解 |
|---|---|---|
| R-1 | 权威版本与 zip 副本不同，补丁无法套用或需要重做 | 先做第 8 节的 `git ls-tree` 比对；补丁头记录 base 哈希；STOP-1 |
| R-2 | 严格校验只在 Console 边界和"已提供的值"；非 Console 调用方仍可走回落 | B1-D4；文档说明 |
| R-3 | 马来西亚日期政策与看板窗口、逾期判断（脚本时区）不一致 | VT-06；STOP-8；B1 不改窗口逻辑 |
| R-4 | `clientRequestId` 带来虚假的安全感 | 状态框、手册都明确"部分写入不受保护"；5.3 节 |
| R-5 | 金额格式过严，用户输入千分位或科学计数法被拒绝 | 提示文案清楚；B1-D3 可调整 |
| R-6 | UI 连线无法在现有假 DOM 里测试 | 纯函数加真实浏览器；B1-D10 |
| R-7 | 修改破坏现有 UI 测试 | 不改现有 toast；用状态框；S-12 回归；STOP-10 |
| R-8 | 用户在 1 小时内有意再录一张内容相同的账单，被缓存回放 | 成功后清除指纹与 ID，下一次提交生成新 ID；只有失败后重试才复用 |
| R-9 | 缺失的 History、事件、下一期在 B1 里只能被发现，不能被修复 | 手册明确标注；B1-D8；留给后续决定 |
| R-10 | 候选治理编号冲突仍未解（V4） | B1 不动治理文件 |

### 7.2 依赖
V1–V5（真实仓库与版本）；DR-01、DR-02、DR-15；第 4.2 节全部决定；harness（`./tests/` 布局、shim 文件清单）。

### 7.3 回滚
- 改动是纯代码，不涉及 schema 或数据迁移，所以没有数据回滚问题。
- 补丁形式是带 base 与补丁后哈希的统一 diff：回滚 = 按 diff 反向应用，或恢复到 base 文件；在 GAS 里 = 回到上一个部署版本。
- 真实验证写入的数据不可逆（History 只追加；Cancelled / Completed 是终态；console 没有删除入口）。所以真实验证必须限量，并且先有 DR-02 的数据策略（例如专用的表格副本）。

### 7.4 停止条件
- **STOP-1** 权威版本的 945、946、912 的哈希与 base 不同，或无法取得：停，重新规划。
- **STOP-2** 任何改动需要 schema、列或表头变更：停。
- **STOP-3** 任何改动会触及 EventBus、`publishPropertyEvent_` 的语义或 912 F-01：停。
- **STOP-4** 任何既有测试在改动后出现本计划没有预测到的失败：停并报告。
- **STOP-5** 某个切片对应的 B1-D 决定尚未批准：不开始该切片。
- **STOP-6** 真实验证会创建生产账单或触及真实 Property，而 DR-02 没有批准：停。
- **STOP-7** UI、946、912 三处的校验规则出现不一致：停。
- **STOP-8** VT-06 显示真实脚本时区不是 UTC+8：暂停日期相关切片，重新决定 B1-D1。
- **STOP-9** 纯函数的边界测试（金额、日期）有任何失败：停。
- **STOP-10** 需要修改现有测试文件或治理文件，而没有你的批准：停。

## 8. 没有权威仓库访问时，候选实现能否推进

**可以推进的**：在非权威工作副本（zip）上起草候选补丁（统一 diff，记录 base 哈希），并在获得 DR-01 与 DR-15 授权后运行模拟测试。

**不能推进的**：把补丁应用到真实仓库；合并；部署到 GAS；任何真实 GAS 验证；把 zip 副本当作基线。

**代价**：权威版本可能与 zip 不同（V5）。若不同，补丁可能无法套用或需要重做，起草的工作可能浪费。

**最小的只读前置步骤**（强烈建议，一分钟）：在真实仓库运行下面的命令，把输出贴回来。若三个 blob ID 与第 1 节一致，补丁的 base 就得到确认，上面的代价基本消失。若路径不在仓库根目录，请把命令里的文件名换成实际路径。
```
git ls-tree HEAD 912_ObligationEngine.js 945_OperatorConsole.html 946_OperatorConsoleServer.js
```

## 9. 实施顺序、交付形式与不在 B1 内的事项

**顺序**：S0 批准决定 → S1 纯函数及其测试 → S2 服务端校验与日期（912、946）→ S3 UI Pay（945）→ 评审点 → S4 Add Bill 防重复 → S5 读回状态框 → S6 文档。每个切片结束后停下评审，不自动进入下一个。

**对应关系**：项 1、2 → S1、S2、S3；项 3 → S3；项 4 → S4；项 5 → S4、S6；项 6 → S5、S6。

**不在 B1 内**：schema（账期、发票号、备注、收据、币种治理）；EventBus；912 F-01；治理文件合并与编号；暂停 / 取消 / 恢复流程；保险流程；Pay 的 note 与 evidence 透传；`updateObligation` 的 console 包装；对账与修复功能；看板窗口与逾期规则；其他类别；Telegram 等其他入口。

## 10. 本计划的限制

- 全部来自静态阅读，没有运行证据；zip 是非权威副本；行号只对这些副本有效。
- 文案、函数名、文件名都是提议，实施时可调整。
- 第 3.6 节中看板窗口与逾期判断的描述来自 D1 记录，本次没有重读相关行。
- 没有任何关于真实 GAS 行为的声明。
