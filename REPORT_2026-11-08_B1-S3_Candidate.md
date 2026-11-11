# B1 S3 候选交付报告（945 `showPayForm`：提交前校验、马来西亚默认日期、响应解释）

- 日期：2026-11-08（Asia/Kuala_Lumpur）
- 状态：**候选。未应用、未合并、未部署。** 只在非权威工作副本上起草与验证：`50_Property-main.zip`，zip 注释 `8b8f2dc274e0a835f572ad90394839033f3f192f`，叠加已交付的 S1、S2 diff。
- 范围：仅 S3（B1 计划 v2 §2.1 的 C5）。这是 B1 第一阶段（S1–S3）的最后一个切片。第二阶段（S4–S6）没有开始。只改了 `945`。
- 授权：你在 2026-11-06 的 S0 文本、"请继续S2"，以及这次的"继续s3"。我把"继续s3"理解为对 S3 的授权，并认为 S0 的约束仍然有效：只输出候选 diff 到新目录；不应用、不合并、不部署；不改现有测试与治理文件；完成后停下等你检查。**这是我的理解，不是你写出的条款，不对请指出。**
- 前提：S3 建立在 S1、S2 交付物原样之上（你没有提出修改）。S1 报告 §5、S2 报告 §6 的实现选择我没有改动。
- 证据标注：**[静态]** 读文件、哈希、对代码文本的检查；**[模拟]** 在 Node 里运行；**[未验证]** 本次没有做。**S3 没有任何 DOM 或点击模拟**（B1-D10 方案 A：不扩展 UI 假 DOM），所以 S-13 仍是 BLOCKED。

## 0. 结论

1. **交付内容**：一份 945 的增量 diff（+14/−7，3 个 hunk）、一个新的**静态**测试 `local_precheck_test_B1_payform.js`、证据日志、清单。S3 只改 `showPayForm` 的三处和 S1 区块的一段头注释。
2. **S3 做了什么**：(a) 默认日期改用 `malaysiaTodayIso_(Date.now())`；(b) 点击 Confirm 时先校验金额与日期，不合法就提示并返回，**不禁用按钮、不发请求**；(c) 成功回调改用 S1 的 `interpretPayResponse_`：只有 `recorded` 才显示 `Payment recorded.`，"已付"三种和"无法确认"显示新提示，并都刷新看板；`success:false` 分支与传输失败回调**原样保留**。
3. **验证结果**：静态测试 **51/51 通过**；用全新解压的 zip 依次套用 S1、S2、S3 的 diff，哈希、`git apply --check`、回滚都一致；同一测试对 S3 之前的树运行会失败（负对照）；植入的 17 个缺陷全部被抓到。既有的 UI 测试文件（未改动）在 S3 树上仍是 52 通过、0 失败、4 个已知缺陷；S1 测试 359/359（`--no-s1-guard`）、S2 测试 250/250 在 S3 树上都仍通过。
4. **这不是点击路径的证据**：静态测试只说明代码按计划的方式接线（调用了什么、顺序、哪些旧行保留、其余部分没动），**不证明 Pay 表单在浏览器里能用**。点击路径只能在真实浏览器里验证（§12 给了清单，没有执行）。
5. **请你特别注意**：(a) 新提示在 `showToast` 里沿用默认 3500 毫秒，而最长的新提示有 103 个字符（§6 C-2）；(b) UI 的日期提示文字计划没有给出，是我定的（C-1）；(c) `patch` 不加 `--dry-run` 会只套上 showPayForm 的两个 hunk、漏掉第三个，得到调用不存在函数的 Pay 表单（C-10）。
6. **B1 第一阶段的候选至此齐全**（五份 diff + 三个测试），仍未验证的是真实 Apps Script 与浏览器行为（§12）。
7. **停在 S3 之后，等你检查。**

## 1. 授权、范围与决定核对

| 决定 | 状态 | 在 S3 中如何体现 |
|---|---|---|
| B1-D1 日期区域 | S0 批准 | Pay 表单默认日期 = `malaysiaTodayIso_(Date.now())`（固定 UTC+8）。限制见 §10 |
| B1-D2 `paidDate` 校验 | S0 批准 | 非空日期必须通过 `isRealIsoDate_`，否则提示并不发请求；**空白日期允许**（服务端取马来西亚当日） |
| B1-D3 金额规则 | S0 批准 | 金额必须通过 `parsePayAmount_`，否则提示 `Enter a payment amount greater than 0.`（计划原文） |
| B1-D4 引擎缺失金额回落 | S0 有条件批准 | 与 S3 的关系：UI 现在强制输入有效金额，但 912 仍允许缺失金额回落。**例外原文在 §10** |
| B1-D5 重复付款提示 | S0 批准 | "已付"三种与"无法确认"的新提示，通过 `interpretPayResponse_` 显示，并刷新看板 |
| B1-D10 测试授权（方案 A） | S0 批准 | 不扩展 UI 假 DOM，所以 S3 的测试只能是静态文本检查；Pay 点击路径留到真实浏览器 |
| B1-D11 候选补丁交付形式 | S0 批准 | 一份统一 diff，头部记录哈希；测试与文档为新文件；不生成基线 ZIP、不覆盖、不应用 |
| B1-D12 Pay 响应保护 | S0 批准 | 成功回调不再自己读 `res.success`、`res.data`、`res.alreadyPaid`，只用解释函数的结果 |

## 2. 哈希链 [静态]

| 文件 | zip 原始 SHA-256 | 本 diff 的 base SHA-256 | S3 后 SHA-256 |
|---|---|---|---|
| `945_OperatorConsole.html` | `d1bf51ed80b92ad3bd8a31ad6f367881a93eace2a1124e95d286006f07845651` | `ff110b40614832be328e647da68ba09ea4991c7907a4ab8f46121e61e442f272`（= S1 后；S2 没有改它） | `b27d3e0292dfc7202636da22f6c26848c81bfd984d8920d190548ac496220e7c` |

- 这份 diff 的第 3 个 hunk 改的是 S1 区块的头注释，所以**没有 S1 就无法完整套用**：`patch --dry-run` 报告"1 out of 3 hunks FAILED"，`git apply --check` 失败 [静态]。
- 把 diff 套用到真实仓库之前，必须先核对真实文件的哈希等于 diff 头部的 base 哈希；不一致就停（STOP-1）。

## 3. 交付物

| 文件 | 字节 | SHA-256 |
|---|---|---|
| `945_OperatorConsole.html.S3.diff` | 4446 | `1351779838438d9e8447f506fc4279a0ef922a6d588453b5e2ddef52efc319ea` |
| `local_precheck_test_B1_payform.js` | 15482 | `dc643c255b4df6032bb5bbe0eb917b038ba512a4d326c3f4cad234fc0ecb44b4` |
| `S3_evidence.txt` | 20372 | `fe14bc899de23f51e1cda4146a2ac2615421bc484a711e3660e774814eeaea56` |
| `REPORT_2026-11-08_B1-S3_Candidate.md`（本文件） | 见 `01_MANIFEST.md` | 见 `01_MANIFEST.md` |
| `01_MANIFEST.md` | — | 清单本身不列自己的哈希 |

没有生成补丁后的完整文件，也没有基线 ZIP（B1-D11）。

## 4. 改动内容 [静态]

`945_OperatorConsole.html`，diff：@@ -815,7 +815,8 @@、@@ -828,13 +829,19 @@、@@ -1704,10 +1711,10 @@。S3 后 `showPayForm` 在第 811–858 行。**每个被改动的行都在 `showPayForm` 内，或在 S1 区块的头注释内**（`S3_evidence.txt` B 节逐行核对）。

1. **默认日期**（第 819 行）：`var today = malaysiaTodayIso_(Date.now()) || '';`，取代 `new Date().toISOString().slice(0, 10)`。`|| ''` 只是对不可能出现的 `null` 的兜底。
2. **先校验再发送**（第 835–836 行）：先读出两个字段；金额不通过 `parsePayAmount_` → `showToast('Enter a payment amount greater than 0.', true); return;`；日期非空白却不通过 `isRealIsoDate_` → `showToast('Enter a valid payment date (yyyy-MM-dd).', true); return;`。两者都在 `confirmBtn.disabled = true`（第 837 行）和 `google.script.run`（第 838 行）**之前**。
3. **成功回调**（第 841–845 行）：`var r = interpretPayResponse_(res, { amount: amount, date: date });`。`r.kind === 'error'` → 原来的那一行（`showToast(res.error, true); confirmBtn.disabled = false; return;`）；`r.kind === 'recorded'` → 原来的字面调用 `showToast('Payment recorded.');`；其余 → `showToast(r.message, r.isError);`；最后对所有非 error 的结果都 `loadDashboard();`。
4. **没动**：传输失败回调（第 847 行）、取消按钮、表单的 HTML、`.console_recordPayment(item.occurrenceId, amount, date, '')` 这一行（发送的是原始字段文本）。
5. **S1 区块的头注释**（第 1714–1717 行）：由"NOT WIRED YET … Nothing below is called by the Pay form until S3"改为"used by showPayForm (S3)"。只是注释。

- 没有改动：912、946、既有测试文件、治理文件、`GasShim.js`、`appsscript.json`、`.claspignore`、任何 schema；Add Bill（`submitAddBill`）、`loadDashboard`、`showToast`、保险续保表单的 UTC 默认（`nextStart.toISOString()`）、S1 的四个函数都**逐字节不变**（静态测试 F 组）。整树比对 S2→S3 只有 945 不同。
- 新测试文件名 `local_precheck_test_B1_payform.js` 匹配 `.claspignore` 里已有的 `local_precheck_test_*.js`，不会被 clasp 推送。

## 5. 行为变化一览 [静态 + 既有的 S1/S2 模拟]

"S3 之前"来自对原代码的阅读；响应分类的行为由 S1 的函数测试（模拟）证明，S3 只负责把它接上线。浏览器里的实际表现 [未验证]。

| 情形 | S3 之前 | S3 之后 |
|---|---|---|
| 默认日期 | 浏览器的 UTC 日；马来西亚时间 00:00–08:00 会是"昨天" | 马来西亚当日（UTC+8） |
| 金额为空、0、负数、非数字 | 先禁用按钮、再发请求（S2 之前服务端会记成 0、`NaN` 等；S2 之后服务端会拒绝） | 提示 `Enter a payment amount greater than 0.`，**不禁用按钮、不发请求** |
| 日期非空但不真实 | 发请求 | 提示 `Enter a valid payment date (yyyy-MM-dd).`，不发请求 |
| 日期留空 | 发请求，服务端用脚本时区的当日 | 允许；服务端用马来西亚当日（S2） |
| 服务端返回"已付"（`alreadyPaid:true`） | 显示 `Payment recorded.`（**误报成功**）并刷新 | 显示 `Already recorded: paid on … Nothing was changed.` 或错误样式的 `This bill was already paid on … NOT saved.` 或 `Already recorded earlier. … could not be read.`，并刷新 |
| 响应为 `null`、非对象、缺 `data` 等 | 回调里读 `res.success` 抛 `TypeError`：没有任何提示，按钮保持禁用 | 错误样式 `Payment result could not be confirmed.`，并刷新看板 |
| `success === false` | 显示 `res.error`，恢复按钮 | **不变** |
| `success` 为 `undefined`、`null`、`0` 等其他假值 | 当作失败，显示 `res.error` | 当作 `unconfirmed`（计划表第 3 行）。只有严格的 `false` 走原分支（§6 C-3） |
| 新付款成功 | `Payment recorded.` + 刷新 | **不变** |
| 传输失败（`withFailureHandler`） | 显示 `err.message`，恢复按钮 | **不变** |

## 6. 实现选择与需要你注意的点（请评审）

| # | 项 | 我的做法与理由 |
|---|---|---|
| C-1 | UI 日期提示的文字 | 计划只写了"提交前的金额与日期校验提示"，只给出了金额提示的原文。日期提示我用 `Enter a valid payment date (yyyy-MM-dd).`，与服务端的日期信息同一措辞。**这是新字符串，请确认或改** |
| C-2 | toast 持续时间 | `showToast` 的默认是 3500 毫秒。最长的新提示是 "This bill was already paid on 2026-10-27 for RM 1,550.00. The amount or date you entered was NOT saved."，103 个字符，操作员可能来不及读完。`showToast(msg, isError, durationMs)` 已经接受第三个参数，只需给这几处各加一个参数；但计划没有规定，计划 R-7 也说"不改现有 toast"，所以我**没有加**。要不要加、加多久，请你定 |
| C-3 | `success` 的假值 | 计划表第 3 行要求"`success` 既不是 true 也不是 false → unconfirmed"。以前任何假值都会走"显示 `res.error`"的分支，现在只有严格的 `false`。这是计划要求的边角行为变化，单列出来是因为它不是显而易见的 |
| C-4 | 空白日期 | UI 不拦截空白日期，由服务端取马来西亚当日；只拦截"非空且不真实"。与计划"用户把日期留空时只比较金额"一致 |
| C-5 | 校验失败时 | 不禁用按钮、不发请求（计划要求）。因此连续点击只会反复出现提示，没有别的副作用 |
| C-6 | 非 error、非 recorded 的结果之后 | Confirm 按钮保持禁用，与 `recorded` 路径一致，依靠 `loadDashboard()` 重新渲染卡片。如果刷新请求本身失败，表单会留着一个禁用的 Confirm。计划没有要求恢复，我没有改 |
| C-7 | `recorded` 分支 | 保留原来的字面调用 `showToast('Payment recorded.')`，而不是用 `r.message`，这样"现有文字不变"可以用静态测试逐字核对 |
| C-8 | 传给解释函数的 `entered` | 两个字段的**原始文本**（S1 报告 C-5 的约定）；发给服务端的也是原始文本，服务端自己再校验一次 |
| C-9 | S1 区块头注释 | 把"NOT WIRED YET"改成已接线，否则会误导后来的读者；这一段改动同时让 diff 的第 3 个 hunk 锚定在 S1 上 |
| C-10 | **套用风险** | 不加 `--dry-run` 的 `patch` 会套上能套的 hunk（showPayForm 的两个）并留下 `.rej`，得到一个调用不存在函数的 Pay 表单。务必先 `--dry-run`，或用 `git apply`（全有或全无）。S3 测试在这种情况下会失败并提示先套 S1 |
| C-11 | 没有 DOM 或点击模拟 | 遵照 D10 方案 A。S3 的测试是对 `showPayForm` 文本的静态检查，**不是**行为测试 |
| C-12 | `<input type="number">` | 金额输入框是 `type="number" step="0.01"`，浏览器对不合法文本返回空串，会被"空金额"提示拦住；对 `1e3` 这种写法返回原文，会被 `parsePayAmount_` 拦住。浏览器的这些行为 [未验证] |

## 7. 测试与证据

### 7.1 S3 静态测试 `local_precheck_test_B1_payform.js` [静态]

读取 `945_OperatorConsole.html`，先去掉注释，再检查 `showPayForm` 的**文本**。不运行表单。

| 组 | 检查内容 |
|---|---|
| A 载入 | 945 只有一个 `<script`、能编译；`showPayForm` 与四个 S1 函数、`formatAmount`、`showToast`、`loadDashboard` 都在 |
| B 默认日期 | 用 `malaysiaTodayIso_(Date.now())`；`showPayForm` 里不再有 `toISOString`；保险续保表单的 UTC 默认（`nextStart.toISOString().slice(0, 10)`）仍在、恰好一处、没被动 |
| C 先校验 | 点击处理中的顺序：金额检查 < 日期检查 < 禁用按钮 < `google.script.run`；通过校验之前没有 `disabled` 也没有 `google`；两条提示的精确文字各出现一次；空白日期被允许；发送的是原始字段值 |
| D 响应处理 | 调用 `interpretPayResponse_(res, { amount: amount, date: date })`；成功回调不自己读 `res.success`、`res.data`、`res.alreadyPaid`、`res.occurrenceId`；`res.error` 只读一次且在原来的错误分支里，原来那一行逐字保留；`Payment recorded.` 只在 `recorded` 分支里、字面调用；其余走 `r.message` 与 `r.isError`；非 error 都 `loadDashboard()`；处理函数分支的两个 kind 确实是解释函数会返回的 |
| E 不变的部分 | 传输失败回调、`confirmBtn.disabled = false` 恰好两处、取消按钮；SR-8：表单的 HTML 只含 `item.expectedAmount` 与 `today`，响应文字只经 `showToast`（`textContent`）进入页面 |
| F 范围（`--base`） | 把 `showPayForm` 与 S1 头注释剪掉后，S3 前后的 945 **逐字节相同**（Add Bill、看板、toast、CSS、标记、S1 函数全在其中）；S1 的四个函数、`submitAddBill`、`loadDashboard`、`showToast`、`renderDashboard`、`loadProperties` 逐个相同 |

- 结果：带 `--base`（S3 之前的树）**51/51** 通过；不带 `--base` 就地运行（F 组跳过）38 项通过。
- 用法：`node local_precheck_test_B1_payform.js [DIR] [--base BASEDIR]`；`DIR` 是已套用 S1 与 S3 的目录，`BASEDIR` 是套用 S3 之前的同一棵树。退出码 0 表示全部通过。

### 7.2 变异检查与测试自检 [静态]

在临时副本里植入 17 个缺陷：去掉金额校验；先禁用按钮再校验；默认日期改回 UTC 日；成功回调重新读 `res.success`；去掉非 recorded 的刷新；错误分支不再恢复按钮；`recorded` 改显示 `r.message`；把服务端错误文字放进 `innerHTML`；传输失败回调不再恢复；改动 `loadDashboard`、改动 S1 函数、改动 Add Bill、改动保险续保的默认日期（范围类）；改提示文字；不再允许空白日期；发送解析后的金额；给解释函数传解析后的金额。**17/17 被抓到。**
**测试自检**：在生成证据时我发现自己写的"保险续保 UTC 默认没被动"那条检查用错了匹配串，带 `--base` 时是靠 `0 === 1−1` 空洞地通过的。已改成匹配真实写法 `nextStart.toISOString().slice(0, 10)`，并新增变异 M17 证明它现在会失败。

### 7.3 回归（S-12、SR-13）与其他测试

- **既有的 UI 测试文件（未改动）**`local_precheck_test_945_addBill_ui.js`：S3 树上 **52 通过、0 失败、4 个已知缺陷**，检查行与未打补丁的 zip 完全一致 [模拟]。
- **平面布局下的 12 个既有 Node 测试**：前后结果相同（`918` 只有标签里随机生成的 ID 不同；`911` 与 `phase11_defectitem_reorder_migration` 在未打补丁的 zip 上就已失败）。
- **旧套件 900 / 912 / 919 / 999**（scratch 布局，做法与 S2 报告 §7.4 相同；它们不加载 945）：未打补丁的 zip 与 S3 树都是 **104/108**，4 个失败的测试名相同。
- **`922` 的偶发失败**（与 S1、S2 报告相同的发现；`922` 既不加载 945 也不加载任何 S3 代码）：交替运行 40+40 次，未打补丁的 zip 失败 4 次，S3 树失败 3 次，Fisher 精确检验 p = 1.000。
- **S1、S2 的候选测试在 S3 树上**：S1 测试 `--no-s1-guard` **359/359**（S1 的函数及其与 912 的逐字符等价没被动）；S2 测试 **250/250**（分别以 S1 树和原始 zip 树为基线）。带守卫运行的 S1 测试有 13 项失败，**全部属于 S1 范围守卫**（它们断言"没有任何代码调用这些函数"，S2、S3 接线之后必然失败，这正是守卫要证明的）。

### 7.4 端到端复验 [静态]

用全新解压的 zip，只使用三个输出目录里的文件：依次套用 S1、S2、S3 的 diff；S3 diff 的 `patch --dry-run`、`patch`、`git apply --check` 都成功，结果哈希与头部一致；对原始 945（没有 S1）会失败；`patch -R` 回滚 S3 后与 S1+S2 状态逐字节一致；S3 测试 51/51；负对照（S3 之前的树）失败（26 项通过、12 项失败）。

## 8. 静态审查 SR-1…SR-14（计划 §6.1）

| SR | 结果 | 证据 |
|---|---|---|
| SR-1 | 通过 [静态] | 3 个 hunk 都在 `showPayForm` 或 S1 头注释内；整树比对 S2→S3 只有 945 不同；912、946、900、901、903、913、922、`GasShim.js`、治理文件、`appsscript.json`、`.claspignore`、既有 UI 测试文件哈希不变 |
| SR-2、SR-3、SR-5、SR-9、SR-11 | 不适用于 S3 | 属 S1/S2，证据在各自的报告里；S2 测试在 S3 树上仍 250/250 |
| SR-4 | 通过 [静态+模拟] | UI 用的就是 S1 的 `parsePayAmount_`、`isRealIsoDate_`、`malaysiaTodayIso_`（与 912 逐字符等价，S1 测试证明）；S3 没有动这些函数 |
| SR-6 | 通过 [静态] | 默认日期来自 `malaysiaTodayIso_(Date.now())`；`showPayForm` 里没有 `toISOString` |
| SR-7 | 通过 [静态+模拟] | `Payment recorded.` 只在 `recorded` 分支里；其余结果只显示 `r.message`。"哪些响应是 `recorded`"由 S1 的 70,560 种组合测试证明；接线由 S3 静态测试证明 |
| SR-8 | 通过 [静态] | 表单 HTML 只含 `item.expectedAmount` 与 `today`；响应文字只经 `showToast`，它用 `textContent` 写入 |
| SR-10 | 通过 [静态] | diff 头部记录了 zip 原始、本 diff 的 base 与补丁后的 SHA-256 及 git blob ID；端到端复验一致 |
| SR-12 | 通过 [静态] | `success:false` 分支与传输失败回调的原行保留；Add Bill、`loadDashboard`、`showToast` 逐字节不变 |
| SR-13 | 通过 [静态+模拟] | 既有 UI 测试文件哈希不变，S3 树上 52/0/4 |
| SR-14 | 通过 [静态+模拟] | 成功回调只把原始 `res` 交给解释函数，自己不读它的任何字段；读取规则由 S1 的函数测试证明 |

## 9. 停止条件 STOP-1…STOP-12（计划 §7.4）

| STOP | 状态 | 说明 |
|---|---|---|
| STOP-1 | 未触发，权威版本仍未取得 | 链上每一环的哈希都已核对；真实仓库的哈希未知。套用前必须核对头部 base 哈希 |
| STOP-2、STOP-3 | 未触发 | 没有 schema、列、表头改动；没有触及 EventBus 或 912 F-01 |
| STOP-4 | 已触发（沿用 S1、S2 的发现），再次查明 | `922` 偶发失败，见 §7.3；其余既有测试前后一致 |
| STOP-5 | 未触发 | S3 用到的 D1、D2、D3、D5、D12 均已在 S0 批准；D4 的限制已写入 §10 |
| STOP-6 | 未触发 | 没有真实数据，没有创建账单，没有点击任何真实表单 |
| STOP-7 | 未触发 | UI 用的是与 912/946 同规则的 S1 函数 |
| STOP-8 | 未验证 | VT-06 需要真实环境。静态事实：`appsscript.json` 声明 `Asia/Singapore`（UTC+8，与马来西亚同偏移、无夏令时）；已部署项目的实际时区仍未核实 |
| STOP-9 | 未触发 | 金额与日期的边界测试（S1、S2）在 S3 树上仍全部通过 |
| STOP-10 | 未触发 | 没有修改现有测试文件或治理文件；新测试是新文件 |
| STOP-11 | 未触发 | diff 不触及 Add Bill、看板、状态框；`success:false` 分支与传输失败回调原样保留 |
| STOP-12 | 未触发（接线层面） | 非 `recorded` 的结果从不显示 `Payment recorded.`：函数层面 S1 已证明，接线层面 S3 静态测试已证明；真实响应的形态 [未验证]（REAL-5） |

## 10. 限制与例外（按 S0 要求原样写入）

**B1-D4 的兼容性例外**（计划 §4.2，须原样写入交付报告；S0 的条件）。S3 之后的状态：UI 与 946 强制输入有效金额，912 对"已提供的值"校验，但缺失金额仍回落：

> 引擎仍允许 `paidAmount` 缺失并回落到期次预计金额，所以 B1 完成后不能声称所有付款入口都强制输入实际金额。强制只覆盖 Console（UI 与 946）和引擎对"已提供的值"的校验；直接调用 912 的其他入口仍可能使用预计金额。

**B1-D1 的限制**（计划 §4.2，须写入交付报告）。S3 让 Pay 表单的默认日期用马来西亚日，但看板窗口与逾期判断没有改：

> 看板窗口与逾期判断仍用脚本时区，B1 不改。若真实脚本时区不是 UTC+8，两者在午夜附近会不一致（VT-06）。

**B1-D3 的说明**（计划 §4.2）：

> 这不等于已经完成币种与金额精度治理。

**S3 的验证边界**：S3 的全部证据都是对代码文本的静态检查，加上 S1、S2 已有的函数级与服务端模拟测试。它没有证明：Pay 表单在真实浏览器里的点击路径（S-13、REAL-6、VT-16）、默认日期在马来西亚 00:00–08:00 的实际显示（VT-11）、`google.script.run` 回调收到的真实形态（REAL-5、VT-08）、真实 Sheets 的读回形态（VT-07）、已部署脚本的真实时区（VT-06）。

## 11. 套用、运行与回滚

先核对要套用的文件的哈希等于各 diff 头部的 base SHA-256。在装有 912、945、946 的**工作副本**目录里，**按这个顺序**，每个 diff 都先 `--dry-run`：

```
patch -p1 --dry-run < 912_ObligationEngine.js.diff                 # S1（在 S1 输出目录里）
patch -p1 < 912_ObligationEngine.js.diff
patch -p1 --dry-run < 945_OperatorConsole.html.diff                # S1
patch -p1 < 945_OperatorConsole.html.diff
cp -r . ../tree_before_s2                                          # 留一份套用 S2 之前的树
patch -p1 --dry-run < 912_ObligationEngine.js.S2.diff              # S2（在 S2 输出目录里）
patch -p1 < 912_ObligationEngine.js.S2.diff
patch -p1 --dry-run < 946_OperatorConsoleServer.js.S2.diff
patch -p1 < 946_OperatorConsoleServer.js.S2.diff
cp -r . ../tree_before_s3                                          # 留一份套用 S3 之前的树
patch -p1 --dry-run < 945_OperatorConsole.html.S3.diff             # S3（在本目录里）
patch -p1 < 945_OperatorConsole.html.S3.diff
cp local_precheck_test_B1_helpers.js local_precheck_test_B1_recordPayment.js local_precheck_test_B1_payform.js .
node local_precheck_test_B1_helpers.js --no-s1-guard
node local_precheck_test_B1_recordPayment.js . --base ../tree_before_s2
node local_precheck_test_B1_payform.js . --base ../tree_before_s3
node local_precheck_test_945_addBill_ui.js                          # 既有测试，不改动
```

预期最后一行依次为 `ALL 359 CHECKS PASSED (0 failures)`、`ALL 250 CHECKS PASSED (0 failures)`、`ALL 51 CHECKS PASSED (0 failures)`，以及既有 UI 测试的 `52 passed, 0 failed, 4 known defects`。不带 `--base` 时 S2 测试为 228 项、S3 测试为 38 项。回滚按相反顺序：先 `patch -R -p1 < 945_OperatorConsole.html.S3.diff`，再回滚 S2 的两份，再回滚 S1 的两份。本报告不建议、也没有执行对真实仓库的套用。

## 12. B1 第一阶段（S1–S3）现状与真实环境验证清单

**三层规则现在是这样的（均为候选，未应用）**：

| 层 | 金额 | 日期 | 响应 |
|---|---|---|---|
| 945 UI（S3） | 提示并不发请求；规则同 912 | 提示并不发请求；空白允许；默认值用马来西亚日 | 经 `interpretPayResponse_`，非 `recorded` 不报成功，并刷新 |
| 946（S2） | 空白 → `required`；非法 → `must be a number`；引擎不被调用 | 原样传给引擎 | 不变 |
| 912（S2） | 提供了的值必须有效；**缺失仍回落（D4）** | 非空必须真实；空白取马来西亚日 | 不变（已付 → `alreadyPaid:true`） |

**仍未验证、也没有执行的真实环境验证**（计划 §6.3 与 `04_verification_tasks_waiting_real_env.md`；都需要你另行授权，且受 DR-02 约束）。点击路径只能这样验证，下面是建议的步骤，**一步都没有执行**：

1. **REAL-6 / VT-16**：在测试用的表格与部署里打开 Pay 表单，确认表单正常出现、Confirm 与 Cancel 可点。
2. **VT-11**：在马来西亚时间 00:00–08:00 之间打开 Pay 表单，确认默认日期是马来西亚当日而不是前一天。
3. **REAL-2**：对一个真实 Active 期次依次提交空金额、0、负数、`1,200`、`1e3`：确认出现 `Enter a payment amount greater than 0.`、按钮仍可点、**浏览器开发者工具的 Network 里没有发出请求**、表格没有变化。
4. **REAL-3**：对测试期次做一次真实付款（写入）：确认 `Payment recorded.` 并刷新。
5. **REAL-4**：对同一期次再点 Pay：金额与日期相同 → `Already recorded: …`；金额不同 → `This bill was already paid … NOT saved.`；确认看板刷新，并且记下 toast 实际停留多久（C-2）。
6. **REAL-5 / VT-08**：在成功回调里观察真实收到的 `res`：`res.success`、`res.data.alreadyPaid`、`paidDate` 是字符串还是 `null`、`paidAmount` 是否为数字。若 `paidDate` 是 `null`，"已付"提示会走 `alreadyUnreadable`。
7. **传输失败**：断网或让调用失败，确认仍显示 `err.message` 并恢复按钮（未改动的路径）。

**第二阶段（S4–S6：Add Bill 防重复、部分写入提示、读回、统一失败显示等）**没有开始，也不在目前的授权范围内。

## 13. 没有做的事与等你决定的事

**没有做**：第二阶段 S4–S6；任何 DOM 或点击模拟；任何真实环境验证；991/993/994 原生套件的运行；治理文件落地；对任何仓库的套用或合并；部署。

**需要你决定**：

1. 评审 §6：尤其 **C-1（日期提示文字）**、**C-2（toast 要不要延长、延长多久）**、C-3（`success` 假值的边角行为）。
2. 确认 `922` 偶发失败的处理（我的建议：单独记一条 backlog，不并入 B1；只是建议）。
3. 第一阶段的候选到此齐全。是否进入下一步——例如落地治理文件、核对真实仓库哈希、按 §12 做真实环境验证，或授权第二阶段——由你决定；我不会自动进入任何一项。
