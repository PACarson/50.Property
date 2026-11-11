# B1 S2 候选交付报告（`recordPayment` 与 `console_recordPayment` 的服务端校验）

- 日期：2026-11-07（Asia/Kuala_Lumpur）
- 状态：**候选。未应用、未合并、未部署。** 只在非权威工作副本上起草与验证：`50_Property-main.zip`，zip 注释 `8b8f2dc274e0a835f572ad90394839033f3f192f`，叠加已交付的 S1 diff。
- 范围：仅 S2（B1 计划 v2 §2.1 的 C2、C3，以及 §6.2 的服务端测试 S-4…S-7）。S3 与第二阶段没有开始。`945` 没有改动。
- 授权：你在 2026-11-06 的 S0 文本，以及随后的一句"请继续S2"。我把后者理解为对 S2 的授权，并认为 S0 的约束仍然有效：只输出候选 diff 到新目录；不应用、不合并、不部署；不改现有测试与治理文件；完成后停下等你检查。**这是我的理解，不是你写出的条款，不对请指出。**
- 前提：S2 建立在 S1 交付物原样之上（你没有提出修改）。S1 报告 §5 的实现选择我没有改动。
- 证据标注：**[静态]** 读文件、哈希、grep；**[模拟]** 在 Node 里用内存版 Sheets（GasShim）运行，不是 Apps Script、不是浏览器、不是生产；**[未验证]** 本次没有做。

## 0. 结论

1. **交付内容**：两份**增量** diff（912：+29/−2；946：+14/−1）、新测试 `local_precheck_test_B1_recordPayment.js`、证据日志、清单。S2 是第一个真正改变行为的切片：服务端现在会拒绝无效的金额和日期。
2. **验证结果 [模拟]**：S2 候选测试 **250/250 通过**；用全新解压的 zip，只用已交付的 diff 依次套用 S1、S2，哈希与各 diff 头部一致，`git apply --check` 通过，回滚后与 S1 状态逐字节一致；同一测试对只有 S1 的树运行会失败（负对照：62 项通过、166 项失败）；植入的 14 个缺陷全部被抓到。
3. **S2 之前的代码有真实缺口（在 S2 之前的树上复现）**：29 个无效金额全部被接受，被记成 0、负数、`NaN`、`Infinity` 等；24 个无效日期全部被接受（其中 22 个被原样写入，`0` 与 `false` 被当作缺失而取默认日期）；控制台的空白金额被记成 **0**（`Number("")` 为 0）。S2 之后全部被拒绝（§5）。
4. **有效输入的行为不变 [模拟]**：19 个有效输入场景（含重复付款、暂停、取消、部分写入失败、冲正再付、控制台）在 S2 前后的结果、全部工作表和日志逐项一致；对原始 zip 的累计对照同样一致。
5. **请你特别注意**：(a) **D4 的兼容性例外在 S2 是真实存在的**：912 仍允许缺失的 `paidAmount` 回落到期次预计金额（原文在 §10）；(b) 已付期次上的**无效**输入现在被拒绝，而不是返回 `alreadyPaid`（§6 C-1）；(c) 空白日期的定义（§6 C-2）；(d) `922` 的偶发失败仍在，与 S2 无关的证据见 §7.4。
6. **仍未验证 [未验证]**：真实 Apps Script 与浏览器行为、已部署脚本的真实时区（VT-06）、S-13、REAL-1…REAL-6、权威仓库里 912/946 的哈希（V1–V5）。991/993/994 三个 Apps Script 原生套件（23 个 `recordPayment` 调用点）无法在此运行，只做了静态扫描。
7. **停在 S2 之后，等你检查。**

## 1. 授权、范围与决定核对

| 决定 | 状态 | 在 S2 中如何体现 |
|---|---|---|
| B1-D1 日期区域 | S0 批准 | 空白日期默认用 `malaysiaTodayIso_(Date.now())`（固定 UTC+8）。限制见 §10 |
| B1-D2 `paidDate` 校验 | S0 批准 | 非空白日期必须通过 `isRealIsoDate_`；不限制过去与未来 |
| B1-D3 金额规则 | S0 批准 | 提供了的金额必须通过 `parsePositiveAmount_`；912 与 946 共用这同一个函数 |
| B1-D4 引擎缺失金额回落 | S0 有条件批准 | 引擎只校验"已提供的值"，缺失金额仍回落。**例外原文在 §10** |
| B1-D10 测试授权（方案 A） | S0 批准 | 服务端 shim 测试，不扩展 UI 假 DOM；只在非权威工作副本运行 |
| B1-D11 候选补丁交付形式 | S0 批准 | 每文件一份统一 diff，头部记录哈希；测试与文档为新文件；不生成基线 ZIP、不覆盖、不应用 |

## 2. 哈希链 [静态]

| 文件 | zip 原始 SHA-256 | 本 diff 的 base SHA-256 | S2 后 SHA-256 |
|---|---|---|---|
| `912_ObligationEngine.js` | `8a40643e21994b004da4e1790edef8fec75d0487a17f6fc9894a5c2315087839` | `2d05bb4bf5c6f8af6ec8b54e2621af989f5a7b39b1b45cd3fe582222bc5eaf3b`（= S1 后） | `cc36243a3ced41bbb0533d7f46e97441b5578fc778dc360b45f3c40bec3c7100` |
| `946_OperatorConsoleServer.js` | `e993b71baed38686b17906e42587341ee98a1f531b53c7b544c5e86f5eebae26` | `e993b71baed38686b17906e42587341ee98a1f531b53c7b544c5e86f5eebae26`（S1 没有改它） | `1026be1160d358ac77be881982de0d590acd71f278147f8d0b3e501924909526` |

- 912 的 S2 diff 用 14 行上下文生成，所以**没有 S1 就无法套用**：`patch` 默认容差下第 1 个 hunk 失败，`git apply --check` 也失败 [静态]。这是有意的：普通的 3 行上下文会让 `patch` 凭行号偏移悄悄套到原始文件上，得到一个引用不存在函数的 912。
- 946 的 S2 diff 可以直接套到原始 946，但运行时依赖 912 里 S1 的 `parsePositiveAmount_`。**三份 diff 必须成套应用**：912 的 S1、912 的 S2、946 的 S2（顺序见 §11）。
- 把 diff 套用到真实仓库之前，必须先核对真实文件的哈希等于各 diff 头部的 base 哈希；不一致就停（STOP-1）。

## 3. 交付物

| 文件 | 字节 | SHA-256 |
|---|---|---|
| `912_ObligationEngine.js.S2.diff` | 6173 | `c200d4ffc1ceefa60a4041c260e783b2a4b59bc36ab410ee4e3dad33c15d7066` |
| `946_OperatorConsoleServer.js.S2.diff` | 2787 | `705f662b0660c51e60c44b8e46dd6801e625e07bec062661e217b99c28a1f6b5` |
| `local_precheck_test_B1_recordPayment.js` | 38723 | `3d8d16f6222470f722cfb0ea59ba444a4eedeab7570949ddb490c8db92d50897` |
| `S2_evidence.txt` | 46882 | `e64f76242c5b01acbdbdb066f41a8e2bf3d9b25c5954efe5c1aac7f09e8dafaf` |
| `REPORT_2026-11-07_B1-S2_Candidate.md`（本文件） | 见 `01_MANIFEST.md` | 见 `01_MANIFEST.md` |
| `01_MANIFEST.md` | — | 清单本身不列自己的哈希 |

没有生成补丁后的完整文件，也没有基线 ZIP（B1-D11）。

## 4. 改动内容 [静态]

**`912_ObligationEngine.js` 的 `recordPayment`**（diff：2 个 hunk，+29/−2；S2 后函数含 JSDoc 共 543–685 行）：

1. JSDoc 增加说明块（第 549 行起）：提供了的金额与非空日期要在读取和写入之前校验；缺失金额仍回落（D4）。
2. 第 565–581 行：在 `assertIdPrefix_` 之后、`findOccurrenceRowIndex_` 之前加入校验块。`input.paidAmount != null` 时用 `parsePositiveAmount_`，结果为 `null` 就抛 `INVALID_INPUT`（`Payment amount must be a number greater than 0.`）；日期"空白"指 `undefined`、`null` 或仅含空白字符的字符串，非空白且不通过 `isRealIsoDate_` 就抛 `INVALID_INPUT`（`Payment date must be a valid date (yyyy-MM-dd).`）。
3. 原来的两行改为（第 616、617 行）：`var paidDate = paidDateBlank ? malaysiaTodayIso_(Date.now()) : input.paidDate;` 和 `var paidAmount = input.paidAmount != null ? providedAmount : Number(occurrence.Amount);`。

**`946_OperatorConsoleServer.js` 的 `console_recordPayment`**（diff：`@@ -97,9 +97,22 @@`，+14/−1；S2 后第 98–120 行）：对原始金额（操作员输入的文本）严格校验。`undefined`、`null`、空串、仅空白字符串 → `Payment amount is required.`；其余无法通过 `parsePositiveAmount_` 的值 → `Payment amount must be a number greater than 0.`。通过后把**数字**传给引擎，不再使用 `Number(paidAmount)`。`paidDate` 原样传递，由引擎校验。

- 每个被改动的行都在这两个函数之内（含 912 紧邻的 JSDoc）[静态]。新增代码行 24 行（注释除外），其中 0 行触及 Sheet、Lock、Utilities、Session 一类 API。
- 没有改动：`945`、治理文件（`00_*.js`）、既有测试文件、`GasShim.js`、`appsscript.json`、`.claspignore`、任何 schema；整树比对 S1→S2 只有这两个文件不同。
- 错误信息与计划原文逐字一致（计划第 164、192 行，已用脚本核对）。
- S2 单独看不会让现有 Pay 表单无法使用：被拒绝时，现有的 `if (!res.success) { showToast(res.error, true); confirmBtn.disabled = false; return; }` 分支会显示服务端文字并恢复按钮 [静态]。UI 自己的校验、默认日期与响应解释属于 S3。

## 5. 行为变化一览 [模拟]

"S2 之前"来自测试 H 组在只有 S1 的树上的实际输出（`S2_evidence.txt` C 节有完整清单）。

| 输入 | S2 之前 | S2 之后 |
|---|---|---|
| 金额 `""`、`"  "`、`0`、`"0"`、`"0.00"`、`false`、`[]` | 接受，记成 `0` | `INVALID_INPUT`，不写任何东西 |
| 金额 `-5`、`"-5"` | 接受，记成 `-5` | 同上 |
| 金额 `"abc"`、`"RM 5"`、`"1,200.00"`、`{}`、`NaN`、全角/阿拉伯数字 | 接受，记成 `NaN` | 同上 |
| 金额 `Infinity`、`-Infinity`、400 位数字串 | 接受，记成 `±Infinity` | 同上 |
| 金额 `true`、`[5]`、`"5."`、`"+5"`、`"1e3"` | 接受，分别记成 `1`、`5`、`5`、`5`、`1000` | 同上 |
| 日期 `"2026-02-30"`、`"2026-13-01"`、`"abc"`、`"2026/10/24"`、`" 2026-10-24"`、`"2026-10-24T08:00:00Z"` 等字符串 | 接受，原样返回并写入 | `INVALID_INPUT` |
| 日期 `0`、`false` | 当作缺失，用默认日期 | `INVALID_INPUT` |
| 日期 `true`、`Date`、数组、对象 | 接受，返回的 `paidDate` 就是传入的那个值 | `INVALID_INPUT` |
| 控制台空白金额 | 记成 `0` | `Payment amount is required.`，引擎不被调用 |
| 空白日期 | `toIsoDate_(new Date())`，即脚本时区的当日 | 马来西亚当日（UTC+8）。当脚本时区也是 UTC+8 时两者相同；不同时只在午夜前后有差别（VT-06） |
| `paidAmount` 缺失（`undefined` / `null` / 不传） | 回落到期次预计金额 | **不变**（D4 兼容性例外） |
| 重复付款、错误码、取消/暂停、部分写入失败、冲正再付 | — | **不变**（19 个场景前后一致） |

## 6. 实现选择与需要你注意的点（请评审）

| # | 项 | 我的做法与理由 |
|---|---|---|
| C-1 | 已付期次上的**无效**输入 | 校验在读取期次之前（计划如此规定），所以对一个已付期次提交无效金额或日期，得到 `INVALID_INPUT`，而不是 `alreadyPaid:true`。有效输入的重复提交仍返回原来的付款（`alreadyPaid:true`）。测试里单独标注了这一行为 |
| C-2 | "空白日期"的定义 | 只有 `undefined`、`null`、仅空白字符的字符串算空白，取默认日期。其他非字符串（`0`、`false`、`Date`、数组、对象、数字）不算空白，会被拒绝。S2 之前 `0`、`false` 被当作缺失。没有现有调用点这样传：946 传字符串，测试里没有任何调用点传 `paidDate` |
| C-3 | 空白金额的两种提示 | 946：空白金额 → `Payment amount is required.`；912：`""` 属于"已提供但非法" → `Payment amount must be a number greater than 0.`。与计划一致，只是两个入口的文字不同 |
| C-4 | 946 调用 912 的函数 | 946 直接调用 912 的 `parsePositiveAmount_`（Apps Script 项目共享全局函数），没有复制正则。SR-4 因此靠"同一个函数"满足。代价：946 现在依赖 S1 的函数，必须成套应用 |
| C-5 | 存入的金额 | 912 存校验后的数字（`providedAmount`），不再是 `Number(input.paidAmount)`。对有效输入结果相同（差异对照与测试证明） |
| C-6 | 946 的文件头注释 | 头注释写着该文件"adds zero new business logic"。C3 加入的是计划指定的边界校验，**头注释我没有改**。要不要改请你定 |
| C-7 | 校验在锁内 | 校验块位于 `withObligationLock_` 的回调里（沿用现有 occurrenceId 检查的位置，计划即如此），被拒绝的调用仍会短暂取锁 |
| C-8 | JSDoc | `recordPayment` 的注释块里加了一段说明，包含 D4 例外的一句话 |
| C-9 | 912 的 S2 diff 的上下文 | 912 的 S2 diff 用 14 行上下文，使它没有 S1 就无法套用（§2）。diff 因此比必要的大一些 |

## 7. 测试与证据

### 7.1 S2 候选测试 `local_precheck_test_B1_recordPayment.js` [模拟]

沿用 `local_precheck_test_946_createObligation.js` 的做法：GasShim 内存版 Sheets，每个检查用全新的运行时。测试只读取源码。用 `withFixed` 临时替换 `Date.now` 与 `Math.random`（用完恢复），使默认日期与生成的 ID 可复现。

| 组 | 内容 |
|---|---|
| A | 载入、函数存在、时钟注入有效；静态：校验在读取与任何写入之前（SR-3）、D4 回落仍在、默认日期来源、946 用同一个解析函数且不再 `Number(paidAmount)` |
| S-4 | 29 个无效金额：`INVALID_INPUT` + 精确信息；之后**所有工作表不变、没有事件、期次仍为 Active**。正向对照：有效付款确实改变工作表。7 个有效金额被接受并存成数字；缺失金额（不传、`undefined`、`null`）回落到 42.5；金额与日期都无效时先报金额 |
| S-5 | 25 组"空白日期 × 注入时钟"（含 15:59:59Z 与 16:00:00Z 的边界、跨年、闰日）；24 个无效日期：`INVALID_INPUT` + 精确信息 + 不写入；6 个有效日期（含过去与未来）原样写入 |
| S-6 | 946：空白金额 5 种 → `required`；非法金额 18 种 → `must be a number`；两者引擎都**不被调用**（spy）；有效金额引擎收到**数字**；日期与备注原样传递；经真实引擎的端到端 |
| S-7 | 幂等（重复提交返回原付款且不写入、不发事件）；已付期次上的无效输入被拒绝；自动生成下一期；暂停下付款；取消下的错误码；未知期次、缺 occurrenceId、未知 `paidVia`；History 或事件发布失败后的部分写入行为；冲正再付 |
| F | 真实服务端响应经 S1 的 `interpretPayResponse_` 分类：新付款 → `recorded`；重复 → `alreadySame` / `alreadyDifferent`；被拒绝 → `error`；响应里没有 `Date` 对象 |
| G | 差异对照（`--base`）：19 个有效输入场景在 S2 前后的结果、全部工作表与日志逐项一致 |
| H | 打印 S2 之前的树如何处理那些无效输入（§5 的来源） |

- 结果：对"S1 树"为基线 **250/250** 通过；对"原始 zip 树"为基线 **250/250** 通过；不带 `--base`（G、H 组跳过）就地运行 228 项通过。
- 用法：`node local_precheck_test_B1_recordPayment.js [DIR] [--base BASEDIR]`；`DIR` 是已套用 S1 与 S2 的目录，`BASEDIR` 是套用 S2 之前的同一棵树。退出码 0 表示全部通过。

### 7.2 变异检查 [模拟]

在临时副本里植入 14 个缺陷（去掉金额或日期的拒绝；默认日期改回脚本时区；只在"真值"时校验；去掉回落；空白判断去掉 `trim`；把校验挪到读取期次之后；用 `Number()` 代替规则；改错误文字；946 恢复 `Number(paidAmount)`；去掉 `required` 或 `must be a number` 分支；把 0 当作缺失；空白串不再算缺失）。**14/14 被抓到**，其中 13 个被至少一项行为检查抓到。
唯一例外是 M10（946 恢复 `Number(paidAmount)`）：校验之后引擎收到的已是合法十进制串或数字，两种转换结果相同，所以它是**行为上的等价变异**，只能被静态文本检查抓到，实际也是这样。

### 7.3 S1 候选测试在 S2 树上 [模拟]

`local_precheck_test_B1_helpers.js --no-s1-guard`：**359/359 通过**，说明 S1 的 7 个函数及其与 945 的逐字符等价没有被 S2 动过。带守卫运行则有 7 项失败，**全部属于 S1 范围守卫**（912 的三个函数不再只出现一次、946 引用了 `parsePositiveAmount_`、`recordPayment` 与 `console_recordPayment` 的原有三行已改）。这正是守卫要证明的：S1 当时没有接线，S2 接线了。

### 7.4 既有测试回归（SR-11、S-12）与 `922`

- **平面布局下的 12 个既有 Node 测试** [模拟]：前后结果相同。`918` 只有标签里随机生成的 DefectItem ID 不同（两次都是 163/163）。`911` 与 `phase11_defectitem_reorder_migration` 在未打补丁的 zip 上就已失败，补丁后同样失败。
- **旧套件 900 / 912 / 919 / 999**（含 23 个 `recordPayment` 调用点）[模拟]：这些套件按另一种目录布局编写，在平面 zip 里不能直接运行，而且在未打补丁的 zip 上就因为 shim 的文件清单缺 910、套件用的硬编码 PropertyID 不存在而失败。我在 **scratch 目录**里用复制品重建了布局，并只在 shim 的**复制品**里加入了 910 与这些 PropertyID 的预置行；项目里的任何文件和套件本身都没有改动。结果：未打补丁的 zip **104/108**，S1+S2 树 **104/108**，4 个失败的测试名完全相同；它们在未打补丁的 zip 上就失败，错误是示例 payload 缺 `category`（3 个）和一个文件路径问题（1 个），与 S2 无关。912 套件 40/40 与 999 套件 7/7 在两边都全部通过。
- **调用点静态扫描**：既有测试里共 46 个 `recordPayment(` 调用点；26 个传了 `paidAmount`（1500×17、1550×6、250、20、22，全部会被接受），20 个只传 `occurrenceId`（不可能被新校验拒绝）；**0 个传 `paidDate`**，也**没有任何断言引用 `PaidDate`**，所以新的默认日期来源不会改变任何既有断言。计划写的是 42 个（16 + 26），我的扫描是 46 个（20 + 26）；26 个及其取值与计划一致，其余差异我没有逐项对账。
- **991 / 993 / 994** 是需要真实电子表格的 Apps Script 原生套件（23 个调用点），**无法在此运行**，只做了上面的静态扫描 [未验证]。
- **`922` 的偶发失败**（STOP-4，沿用 S1 报告 §6.3 的发现）：同一项检查 `d3 的 latestEvent …` 在两棵树上都会偶发失败。各 25 次：未打补丁的 zip 失败 8 次，S1+S2 树失败 11 次；另做了**交替运行 60+60 次**：11/60 对 14/60，Fisher 精确检验 p = 0.654，没有证据表明有差异；没有出现任何其他失败的检查。我的判断：既有的偶发失败（`922_DashboardAdapter.js:274` 用 `OccurredAt.localeCompare` 排序），与 S2 无关；这是判断，不是你的批准。

### 7.5 端到端复验 [静态 + 模拟]

用全新解压的 zip，只使用两个输出目录里的文件：依次套用 S1、S2 的 diff；每份 S2 diff 的 `patch --dry-run`、`patch`、`git apply --check` 都成功，结果哈希与头部一致；S2 的 912 diff 套到原始文件会失败；`patch -R` 回滚两份 S2 diff 后与 S1 状态逐字节一致；S2 测试 250/250；负对照（只有 S1 的树）失败。

## 8. 静态审查 SR-1…SR-14（计划 §6.1）

| SR | 结果 | 证据 |
|---|---|---|
| SR-1 | 通过 [静态] | 每个改动行都在 `recordPayment`（含 JSDoc）或 `console_recordPayment` 之内；整树比对 S1→S2 只有 912 与 946 不同；`900_PropertyConfig.js`、`901_PropertySchema.js`、`903`、`913`、`922`、`GasShim.js`、治理文件、`appsscript.json`、`.claspignore`、`945` 哈希不变 |
| SR-2 | 通过 [静态+模拟] | 没有触及事件发布代码；History 与事件发布失败后的部分写入行为经测试证明不变；19 个场景前后一致 |
| SR-3 | 通过 [静态+模拟] | 校验在读取期次与任何写入之前（文本顺序检查；变异 M7 被抓到；拒绝前后所有工作表快照不变）；缺失金额仍回落（D4） |
| SR-4 | 通过 [静态+模拟] | 946 调用 912 的同一个 `parsePositiveAmount_`，自己没有正则。945 的副本与 912 逐字符等价由 S1 测试证明，S2 没有动那些函数（S1 测试在 S2 树上 359/359） |
| SR-5 | 通过 [模拟] | 默认日期来自 `malaysiaTodayIso_(Date.now())`：15:59:59Z → 当日，16:00:00Z → 次日，跨年与闰日各有用例 |
| SR-6、SR-7、SR-8 | 不适用于 S2 | 属 S3（945 的默认日期、响应解释接线、文字显示）。F 组用真实响应验证了 S1 的解释函数 |
| SR-9 | 通过 [静态] | 新增 24 行代码，0 行触及 Sheet、Lock、Utilities、Session 一类 API |
| SR-10 | 通过 [静态] | 两份 diff 头部记录了 zip 原始、本 diff 的 base 与补丁后的 SHA-256 及 git blob ID；端到端复验一致 |
| SR-11 | 通过 [静态+模拟]，部分未运行 | 见 §7.4：46 个调用点，0 个传 `paidDate`，26 个金额全部会被接受；23 个调用点在 scratch 布局中前后一致；另 23 个（991/993/994）只做了静态扫描 |
| SR-12 | 通过 [模拟] | 失败路径、部分写入、幂等、错误码不变；diff 不触及 Add Bill、看板、状态框 |
| SR-13 | 通过 [静态] | 本切片不碰 945，也不碰既有 UI 测试文件 |
| SR-14 | 不适用于 S2 | 属 S1，已在 S1 报告验证 |

## 9. 停止条件 STOP-1…STOP-12（计划 §7.4）

| STOP | 状态 | 说明 |
|---|---|---|
| STOP-1 | 未触发，权威版本仍未取得 | 链上每一环的哈希都已核对；真实仓库的哈希未知。套用前必须核对头部 base 哈希 |
| STOP-2 | 未触发 | 没有 schema、列、表头改动 |
| STOP-3 | 未触发 | 没有触及 EventBus 或 912 F-01 |
| STOP-4 | 已触发（沿用 S1 的发现），已再次查明 | `922` 偶发失败，见 §7.4；其余既有测试前后一致 |
| STOP-5 | 未触发 | S2 用到的 D1、D2、D3、D4（有条件）均已在 S0 批准；D4 的限制已写入 §10 |
| STOP-6 | 未触发 | 没有真实数据，没有创建账单 |
| STOP-7 | 未触发 | 946 与 912 用同一个函数；945 的副本未改 |
| STOP-8 | 未验证 | VT-06 需要真实环境。静态事实：`appsscript.json` 声明 `Asia/Singapore`（UTC+8，与马来西亚同偏移、无夏令时）；已部署项目的实际时区仍未核实 |
| STOP-9 | 未触发 | 金额与日期的边界测试全部通过 |
| STOP-10 | 未触发 | 没有修改现有测试文件或治理文件；新测试是新文件 |
| STOP-11 | 未触发 | diff 不触及 Pay 失败分支以外的 UI 路径（本切片不碰 945） |
| STOP-12 | 不适用于 S2 | 属 S3；F 组确认真实响应被 S1 的解释函数正确分类 |

## 10. 限制与例外（按 S0 要求原样写入）

**B1-D4 的兼容性例外**（计划 §4.2，须原样写入交付报告；S0 的条件）。在 S2 里它是真实存在的：`recordPayment` 里 `input.paidAmount != null ? providedAmount : Number(occurrence.Amount)` 这一行就是它的实现，测试 S-4 的"缺失金额回落"三项和变异 M5 都覆盖它：

> 引擎仍允许 `paidAmount` 缺失并回落到期次预计金额，所以 B1 完成后不能声称所有付款入口都强制输入实际金额。强制只覆盖 Console（UI 与 946）和引擎对"已提供的值"的校验；直接调用 912 的其他入口仍可能使用预计金额。

**B1-D1 的限制**（计划 §4.2，须写入交付报告）：

> 看板窗口与逾期判断仍用脚本时区，B1 不改。若真实脚本时区不是 UTC+8，两者在午夜附近会不一致（VT-06）。

**B1-D3 的说明**（计划 §4.2）：

> 这不等于已经完成币种与金额精度治理。

**模拟的边界**：以上全部结果来自 Node 里内存版的 Sheets（GasShim），不是 Apps Script、不是浏览器、不是生产。它没有证明：真实 Sheets 对日期与数字单元格的读回形态（REAL-5）、`google.script.run` 的实际序列化行为、已部署脚本的真实时区（VT-06）、Pay 表单的点击路径（S-13）。F 组里"响应没有 `Date` 对象"只说明 shim 里如此。

## 11. 套用、运行与回滚

先核对要套用的文件的哈希等于各 diff 头部的 base SHA-256。在装有 912、945、946 的**工作副本**目录里，**按这个顺序**：

```
patch -p1 < 912_ObligationEngine.js.diff                  # S1（在 S1 输出目录里）
patch -p1 < 945_OperatorConsole.html.diff                 # S1（在 S1 输出目录里）
cp -r . ../tree_before_s2                                 # 留一份套用 S2 之前的树，作为 --base
patch -p1 < 912_ObligationEngine.js.S2.diff
patch -p1 < 946_OperatorConsoleServer.js.S2.diff
cp local_precheck_test_B1_helpers.js local_precheck_test_B1_recordPayment.js .
node local_precheck_test_B1_helpers.js --no-s1-guard
node local_precheck_test_B1_recordPayment.js . --base ../tree_before_s2
```

预期最后一行依次为 `ALL 359 CHECKS PASSED (0 failures)` 和 `ALL 250 CHECKS PASSED (0 failures)`。不带 `--base` 时 G、H 组跳过，应为 228 项。回滚：先 `patch -R -p1 < 946_OperatorConsoleServer.js.S2.diff`，再 `patch -R -p1 < 912_ObligationEngine.js.S2.diff`。本报告不建议、也没有执行对真实仓库的套用。

## 12. 没有做的事与等你决定的事

**没有做**：S3（945 Pay 表单：用 `malaysiaTodayIso_` 取默认日期、UI 校验、接入 `interpretPayResponse_`、刷新看板）、第二阶段 S4–S6、任何真实环境验证、991/993/994 原生套件的运行、治理文件落地、对任何仓库的套用或合并、部署。

**需要你决定**：

1. 评审 §6 的实现选择，尤其 C-1（已付期次上的无效输入被拒绝）、C-2（空白日期的定义）、C-6（946 头注释）。
2. 确认 `922` 偶发失败的处理（我的建议：单独记一条 backlog，不并入 B1；只是建议）。
3. 是否授权 S3。S3 会改 945 的 Pay 表单并接上 S1 的函数；需要你另发授权文本。
