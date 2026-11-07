# B1 S1 候选交付报告（纯函数 + 模拟测试）

- 日期：2026-11-06（Asia/Kuala_Lumpur）
- 状态：**候选。未应用、未合并、未部署。** 只在非权威工作副本上起草与验证：`50_Property-main.zip`，zip 注释 `8b8f2dc274e0a835f572ad90394839033f3f192f`。
- 范围：仅 S1（B1 计划 v2 §2.1 的 C1、C4a，以及 §2.2 的 `local_precheck_test_B1_helpers.js`）。S2、S3 与第二阶段（S4–S6）没有开始。
- 依据：你在 2026-11-06 发出的 S0 授权文本（§1）。
- 证据标注：**[静态]** 读文件、哈希、grep；**[模拟]** 在 Node `vm` 中运行（不是 Apps Script，不是浏览器）；**[未验证]** 本次没有做。

## 0. 结论

1. **交付内容**：两份统一 diff（912：+57/−0；945：+91/−0）、一份新测试文件、证据日志、清单。共新增 7 个函数（912 三个，945 四个）。**没有任何代码调用它们**（范围守卫 [模拟] 已验证），所以现有业务流程没有变化。
2. **验证结果 [模拟]**：候选测试 **374/374 通过**；用全新解压的 zip 从本目录套用两份 diff，补丁后哈希与 diff 头部一致，`git apply --check` 通过，回滚后与原文件逐字节一致；同一测试对未打补丁的 base 运行会失败（负对照）；植入缺陷的变异检查 12/12 被抓到。
3. **STOP-4 已触发并查明，需要你知道**：既有测试 `local_precheck_test_922` 在补丁后的那次运行里失败 1 项。同一项检查在**未打补丁**的 base 上也会偶发失败（各重复 25 次：base 失败 5 次，补丁后失败 2 次）。我判断它是既有的偶发失败、与 S1 无关，但这是我的判断，不是你的批准（§6.3）。
4. **请你评审**：§5 列出的 11 处"计划草图不同或计划未规定"的实现选择，其中 C-1（非字符串日期）、C-2（年份 0000–0099）和 C-3（无效输入返回 null）与草图的行为有实际差异。
5. **仍未验证 [未验证]**：真实 Apps Script 与浏览器行为、S-13（Pay 点击路径）、REAL-1…REAL-6、VT-06（已部署脚本的真实时区）、权威仓库中 912/945 的哈希（V1–V5）。
6. **停在 S1 之后，等你检查。**

## 1. 授权与范围核对

S0 原文（2026-11-06）：

> S0 批准：B1-D1/D2/D3/D5/D10(方案A)/D11/D12 按计划 v2 §4.2 的提议批准；D4 有条件批准（兼容性例外原样写入交付报告）。
> 基线：本 zip（注释 8b8f2dc…）仅作非权威工作副本。
> 授权：仅 S1（纯函数 + 模拟测试），候选 diff 输出到新目录；不应用、不合并、不部署、不改现有测试与治理文件。
> S1 完成后停下，等我检查。

| 决定 | S0 结论 | 在 S1 中如何体现 |
|---|---|---|
| B1-D1 日期区域与实现 | 批准 | `malaysiaTodayIso_`：固定 +8 小时，不依赖脚本或浏览器时区。限制见 §9 |
| B1-D2 `paidDate` 校验 | 批准 | `isRealIsoDate_`：真实的 `yyyy-MM-dd`；不限制过去与未来 |
| B1-D3 金额规则 | 批准 | `parsePositiveAmount_`（912）与 `parsePayAmount_`（945）：有限数且 > 0；纯十进制；不限小数位、不取整、不设上限 |
| B1-D4 引擎缺失金额回落 | 有条件批准 | S1 不触碰引擎回落。兼容性例外原样写入 §9 |
| B1-D5 重复付款提示 | 批准 | `interpretPayResponse_` 的三种"已付"提示与错误样式；刷新看板属于 S3 |
| B1-D10 测试授权（方案 A） | 批准 | 只测纯函数；不扩展 UI 假 DOM；只在非权威工作副本运行 |
| B1-D11 候选补丁交付形式 | 批准 | 每文件一份统一 diff，头部记录 base 与补丁后 SHA-256；测试与文档为新文件；不生成基线 ZIP、不覆盖、不应用 |
| B1-D12 Pay 响应保护 | 批准 | 四条读取规则与响应形态表；只覆盖 Pay 确认后的响应解释 |

## 2. 输入与基线 [静态]

- 上传文件：`50_Property-main.zip`，1368967 字节，SHA-256 `76611d8d597cfa63dc9ee44f772038bb7fa3e5e194878bdce8f13a0bb1464118`；zip 注释 `8b8f2dc274e0a835f572ad90394839033f3f192f`。
- 全新解压与工作副本逐文件一致（103 个文件）。
- base 哈希与 handoff 的 `01_MANIFEST.md` 一致（本窗口开头已核对）：

| 文件 | SHA-256 | git blob ID |
|---|---|---|
| `912_ObligationEngine.js` | `8a40643e21994b004da4e1790edef8fec75d0487a17f6fc9894a5c2315087839` | `10c61992cea010326754e7e57b6f4134aa9ead0f` |
| `945_OperatorConsole.html` | `d1bf51ed80b92ad3bd8a31ad6f367881a93eace2a1124e95d286006f07845651` | `f09956fe4cbf8516f8151dd0ed5cf6fa210c40f8` |
| `946_OperatorConsoleServer.js` | `e993b71baed38686b17906e42587341ee98a1f531b53c7b544c5e86f5eebae26` | `961e3ea71ea2161f3903ac6a7333c923bbb46674` |

该 zip 仍是非权威工作副本。把 diff 套用到真实仓库之前，必须先核对真实文件的哈希与各 diff 头部的 base 哈希一致；不一致就停（STOP-1）。

## 3. 交付物

| 文件 | 字节 | SHA-256 |
|---|---|---|
| `912_ObligationEngine.js.diff` | 3588 | `8dcd25885fb364b5002ca59f5fae1bc50633703a8b1d16a1773bc7c0e20fb6a0` |
| `945_OperatorConsole.html.diff` | 5651 | `0a674dec9adc97e565e84f84d5e6182e6182e02063e4d028aebaed165f0ad4be` |
| `local_precheck_test_B1_helpers.js` | 33503 | `e2a279aaaf702750a1f56b9ce1b195037bb7fce786e20a67fa1751703d3c6384` |
| `S1_evidence.txt` | 37891 | `225ba66b391f1b2c023e8f8e8015784734205c953ad6adf7e90a46b5c1c4b5d2` |
| `REPORT_2026-11-06_B1-S1_Candidate.md`（本文件） | 见 `01_MANIFEST.md` | 见 `01_MANIFEST.md` |
| `01_MANIFEST.md` | — | 清单本身不列自己的哈希 |

补丁后文件的哈希（记录在各 diff 头部，并在端到端复验中核对）：

| 文件 | 补丁后 SHA-256 |
|---|---|
| `912_ObligationEngine.js` | `2d05bb4bf5c6f8af6ec8b54e2621af989f5a7b39b1b45cd3fe582222bc5eaf3b` |
| `945_OperatorConsole.html` | `ff110b40614832be328e647da68ba09ea4991c7907a4ab8f46121e61e442f272` |

没有生成补丁后的完整文件，也没有基线 ZIP（B1-D11）。

## 4. 改动内容 [静态]

**`912_ObligationEngine.js`**：diff `@@ -483,6 +483,63 @@`，只新增、不删除。区块从第 486 行开始，位于 `recordPayment` 的 JSDoc 之前：
`malaysiaTodayIso_`（499–505 行）、`parsePositiveAmount_`（514–526）、`isRealIsoDate_`（533–541）。

**`945_OperatorConsole.html`**：diff `@@ -1704,6 +1704,97 @@`，只新增、不删除。区块从第 1707 行开始，位于 `billSavedMessage_` 之后、`var toastTimer;` 之前（"实用函数"区）：
`malaysiaTodayIso_`（1715–1721）、`parsePayAmount_`（1726–1738）、`isRealIsoDate_`（1742–1750）、`interpretPayResponse_`（1763–1796）。

- 全部是纯函数：不碰 Sheets、Utilities、Session、DOM、`google.script.run`、浏览器存储或共享状态。
- 912 与 945 的三对同规则函数文本逐字符等价（去注释、名称归一后；`parsePayAmount_` 即 912 的 `parsePositiveAmount_`）。
- 没有改动：946、治理文件（`00_*.js`）、既有测试文件、`appsscript.json`、`.claspignore`、任何 schema。整树比对只有这两个文件不同。
- 新测试文件名 `local_precheck_test_B1_helpers.js` 匹配 `.claspignore` 里已有的 `local_precheck_test_*.js`，不会被 clasp 推送。

## 5. 与计划草图不同、或计划未规定的实现选择（请评审）

计划里的代码只是"说明规则用的草图"。下面是我在落实时做的选择，每一项都有测试覆盖。

| # | 项 | 草图或计划 | 本候选的做法 |
|---|---|---|---|
| C-1 | `isRealIsoDate_` 的参数类型 | 草图用 `String(s)`，数组 `["2026-10-24"]` 或带 `toString` 的对象会被当成日期 | 要求 `typeof s === "string"`，其他类型一律 `false` |
| C-2 | `isRealIsoDate_` 的年份 0000–0099 | 草图用 `Date.UTC(y,…)`；JS 会把 0–99 年映射成 1900–1999，所以 `0050-06-15` 会被**偶然地**拒绝 | 改用 `setUTCFullYear`，按日历规则**接受**。理由：D2 写明"过去与未来日期都不限制"。若你宁可拒绝年份 < 100，需另行决定（变异 S6 证明测试能区分两种行为） |
| C-3 | `malaysiaTodayIso_` 的无效输入 | 草图对 NaN、超出 Date 范围的数会抛 `RangeError` | 返回 `null`（非有限数、超出 Date 范围、或结果年份不在 0000–9999）。S2/S3 的调用方传 `Date.now()`，不会得到 `null` |
| C-4 | `parsePositiveAmount_` 对 number 类型 | 草图相同 | 行为与草图一致（只是把 `trim()` 算一次）。number 不检查写法，所以 `1e21`、`1e-7`（number）被接受，字符串 `"1e3"` 被拒绝。请确认这符合 D3"拒绝科学计数法"的本意 |
| C-5 | `interpretPayResponse_` 的 `entered` 形状 | 计划只写"用户输入" | 取 `{amount, date}`：表单字段的原始值；金额经 `parsePayAmount_` 解析；日期 trim 后按字符串比较；日期为空时只比较金额。S3 接线时按此传入 |
| C-6 | "已记录的金额与日期可读" | 计划未定义 | 金额须是有限 number（数字字符串视为不可读）；日期须是非空字符串（不要求 ISO 格式）。金额为 0 或负数（历史脏数据）也照常显示，不当作不可读 |
| C-7 | 无法证明一致时 | 计划未定义 | 输入金额无法解析或 `entered` 缺失：归为 `alreadyDifferent`（错误样式、明确"未保存"），不会误报 `alreadySame` |
| C-8 | 兜底 | 计划写"对任何输入都不抛错" | 整个函数包在 `try/catch` 里，任何异常（含会抛错的 getter、Proxy）都得到 `unconfirmed` |
| C-9 | 金额显示格式 | 计划写 `RM <金额>`，未定格式 | 调用既有 `formatAmount`（945:1684–1687，未改动），所以显示 `RM 1,550.00`，与看板一致。因此 `interpretPayResponse_` 依赖这个既有函数 |
| C-10 | `success === false` | 计划写"不变"，沿用现有 `showToast(res.error, true)` | 函数仍返回 `kind: "error"`，`message` 是 `res.error`（字符串，否则空串）。S3 按计划保持现有分支，不使用这段文字 |
| C-11 | 插入位置 | 912："放在 `recordPayment` 之前"；945："紧邻 `billSavedMessage_`，1698 行附近" | 912：`recordPayment` JSDoc 之前；945：`billSavedMessage_` 之后 |

## 6. 测试与证据

### 6.1 候选测试 `local_precheck_test_B1_helpers.js` [模拟]

做法沿用 `local_precheck_test_948_search.js`：用 Node `vm` 把纯函数从 912 与 945 的 `<script>` 里按名字取出来直接调用；不扩展假 DOM（D10 方案 A）；只读取源文件，不写任何东西。

| 组 | 检查数 |
|---|---|
| 载入与语法检查（含 5 个新函数及既有 formatAmount 是否存在） | 12 |
| SR-4 文本等价、SR-5/SR-8 文本纯度 | 10 |
| S-1 金额：计划矩阵 + 追加用例（912 与 945 各跑一遍） | 134 |
| S-1 金额：912 与 945 在生成输入上一致 | 1 |
| S-2 马来西亚日期：计划表、边界、无效输入、Intl 独立 oracle | 53 |
| S-3 日期真实性：计划矩阵、边界、独立日历 oracle | 77 |
| S-8 interpretPayResponse_：计划响应形态矩阵 | 53 |
| S-8 返回形状、纯度、SR-14 读取规则、绝不抛错 | 17 |
| S-8 全组合穷举（独立 oracle） | 2 |
| S1 范围守卫（S2/S3 接线后用 --no-s1-guard 退役） | 15 |
| **合计** | **374** |

- 金额：912 与 945 在 36009 个生成输入上结果一致，且每个结果都是 `null` 或有限正数。
- 日期：912 与 945 在 28944 个字符串上与独立的闰年/月长 oracle 一致（年份 1900–2100，月份 0–13，日 0–33）。
- 马来西亚日期：912 与 945 在 140356 个时刻上与 `Intl`（`Asia/Kuala_Lumpur`）一致，含 1990–2100 每个当地午夜前 1 毫秒与午夜。
- `interpretPayResponse_`：70560 种响应与输入的组合，结果类型与独立 oracle 一致、绝不抛错、只有一种形态得到 `Payment recorded.`。
- 用法：`node local_precheck_test_B1_helpers.js [DIR]`，`DIR` 是已套用补丁的目录；`--no-s1-guard` 跳过范围守卫。退出码 0 表示全部通过。

### 6.2 变异检查 [模拟]

在临时副本里植入缺陷，确认候选测试会失败（原始输出在 `S1_evidence.txt` 的 E 节）。

- 单份拷贝缺陷 12/12 被抓到（其中 7 个首先被 SR-4 文本对照抓到，因为只改了一份拷贝）。
- 同步缺陷（912 与 945 同时植入同一个缺陷，使 SR-4 无法发现）9 个：**7 个被行为检查抓到**；**2 个是等价变异**，即删除冗余检查后任何输入的输出都不变：`isRealIsoDate_` 里的"日"比较（月份比较已经覆盖），以及 `malaysiaTodayIso_` 里的 `isFinite` 检查（后面的 `isNaN(getTime())` 已经覆盖）。两者作为纵深防御保留。
- 范围守卫：模拟"S2 已把 `malaysiaTodayIso_` 接进 `recordPayment`"时，守卫会失败；加 `--no-s1-guard` 后其余 359 项通过。

### 6.3 既有测试回归（S-12）与 `922` 的偶发失败 [模拟]

在未打补丁的 base 副本与补丁后副本里各运行一次全部 Node 可运行的既有测试：

- 其余 11 个测试的结果相同：9 个通过（918、945_addBill_ui〔52 通过、4 个已知缺陷〕、946_createObligation、946_listProperties、947、948_rectification、948_search、phase11_schema_consolidation_migration、phase11_schema_migration）；2 个在**未打补丁的 zip 上就已失败**，补丁后同样失败：`911`（`PropertiesService is not defined`，911_DocumentEngine.js:95）、`phase11_defectitem_reorder_migration`（退出码 1）。
- **唯一的差异是 `922`**：base 那次 67/67 通过，补丁后那次 66 通过、1 项失败（`d3 的 latestEvent …` 那一项）。
- 查明过程：`922` 通过 GasShim 载入 912，所以不能用"它不加载 912"来排除。改为各重复运行 25 次：base 失败 **5** 次，补丁后失败 **2** 次，**失败的都是同一项检查**。工作过程中另做过一轮临时重复（base 6/25、补丁后 8/25 次失败），结论相同，但那一轮没有记入证据日志。
- 这项检查断言哪个事件是"最新"；`922_DashboardAdapter.js:274` 用 `OccurredAt.localeCompare` 排序，快速连续创建的事件可能时间戳相同。这是我的推测，没有进一步验证。新增函数不被任何代码路径调用，所以补丁后的 912 对 `922` 的行为与补丁前相同。
- 结论（我的判断）：既有的偶发失败，与 S1 无关。计划对 S-12 的措辞是"应全部仍通过"，这一条因为该偶发失败而不能无条件成立；是否另记 backlog 由你决定。

### 6.4 端到端复验 [静态 + 模拟]

用全新解压的 zip，只使用本目录里的文件：两份 diff 的 `patch --dry-run` 与 `patch` 成功，补丁后 SHA-256 与 diff 头部一致，`git apply --check` 通过；`patch -R` 回滚后整棵树与解压结果逐字节一致；测试在该补丁后的树上 374/374 通过，复制到源码目录里就地运行也通过。负对照：同一测试对未打补丁的 base 退出码为 1。

## 7. 静态审查 SR-1…SR-14（计划 §6.1）

| SR | 结果 | 证据 |
|---|---|---|
| SR-1 | 通过 [静态] | diff 只新增 912 的 3 个函数与 945 的 4 个函数（+57/−0、+91/−0）。整树比对只有这两个文件不同；`900_PropertyConfig.js`、`901_PropertySchema.js` 哈希不变；无 schema、列、表头改动 |
| SR-2 | 通过 [静态] | 没有触及 EventBus、`publishPropertyEvent_`、912 F-01；`903_PropertyEventDefinitions.js` 与 `913_ObligationScheduler.js` 哈希不变 |
| SR-3 | 不适用于 S1 | 属 S2。守卫确认 `recordPayment` 里原来的默认日期行与金额回落行仍在 |
| SR-4 | 部分通过 [模拟] | 945 与 912 的三对函数逐字符等价，且在上述生成输入上结果一致。946 属 S2，未涉及 |
| SR-5 | 通过 [静态+模拟] | `malaysiaTodayIso_` 文本中没有 Utilities、Session、本地时间或 locale API；与 `Intl` 在 140356 个时刻一致 |
| SR-6 | 不适用于 S1 | 属 S3。守卫确认 `showPayForm` 里原来的 UTC 默认日期行仍在 |
| SR-7 | 函数层面通过 [模拟] | 70560 种组合 + 矩阵：只有 `success === true`、`alreadyPaid === false` 且 `occurrenceId` 为非空字符串时才得到 `Payment recorded.`。接线层面待 S3 |
| SR-8 | 通过 [静态] | 新函数只返回字符串，不写 DOM。既有 `showToast`（945:1799）用 `textContent` 写入，S3 接线后经它显示 |
| SR-9 | 通过 [静态] | 新函数不含任何表读写 API |
| SR-10 | 通过 [静态] | 两份 diff 头部都记录了 base 与补丁后的 SHA-256 与 git blob ID，端到端复验与之一致 |
| SR-11 | 静态预检 [静态] | 我的正则在 912 之外找到 25 处传 `paidAmount` 的位置（计划写 26，我没有复现它的计数口径）。数字字面量 1500（14 处）、1550（5 处）、250、20、22 都被 `parsePositiveAmount_` 接受；另有 3 处是表达式或变量（922、945、946 的非测试代码），没有求值。S1 未接线，S2 需重新核对 |
| SR-12 | 通过 [静态+模拟] | 改动位置在 912 第 483 行附近、945 第 1704 行附近，不在 Pay 失败路径、`submitAddBill`、`loadDashboard` 内；没有删除任何行；守卫确认 Pay 原有的失败分支与成功提示行仍在 |
| SR-13 | 通过 [静态+模拟] | `local_precheck_test_945_addBill_ui.js` 哈希不变，补丁前后都是 52 通过、0 失败、4 个已知缺陷 |
| SR-14 | 通过 [模拟] | 用带计数的 getter 验证：`res` 为数组或函数时读取次数为 0；`success` 既不是 true 也不是 false 时不读 `res.data`；`success === false` 时不读 `res.data`；`res.data` 为数组时不读 `alreadyPaid` |

## 8. 停止条件 STOP-1…STOP-12（计划 §7.4）

| STOP | 状态 | 说明 |
|---|---|---|
| STOP-1 | 未触发，但权威版本未取得 | base 哈希与 MANIFEST 一致；S0 已把本 zip 指定为非权威工作副本。套用到真实仓库前必须先核对 diff 头部的 base 哈希 |
| STOP-2 | 未触发 | 没有 schema、列、表头改动 |
| STOP-3 | 未触发 | 没有触及 EventBus 或 912 F-01 |
| STOP-4 | **已触发，已查明** | `922` 的偶发失败，见 §6.3；我判断与 S1 无关，请你确认 |
| STOP-5 | 未触发 | S1 用到的 D1、D2、D3、D5、D10、D11、D12 均已在 S0 批准；D4 的限制已写入 §9 |
| STOP-6 | 未触发 | 没有做任何真实验证，没有创建账单，没有触及真实 Property |
| STOP-7 | 未触发 | 945 与 912 规则一致；946 未改 |
| STOP-8 | 未验证 | VT-06 需要真实环境。静态事实：`appsscript.json` 声明 `Asia/Singapore`（UTC+8，与马来西亚同偏移、无夏令时）；已部署项目的实际时区仍未核实 |
| STOP-9 | 未触发 | 金额与日期的边界测试全部通过，含独立 oracle |
| STOP-10 | 未触发 | 没有修改现有测试文件或治理文件 |
| STOP-11 | 未触发 | diff 不触及 Pay 失败路径、Add Bill、`loadDashboard`、状态框、`state` |
| STOP-12 | 未触发 | 全组合穷举与矩阵：除 `recorded` 外没有任何形态显示 `Payment recorded.`，无法识别的响应都是 `unconfirmed` |

## 9. 限制与例外（按 S0 要求原样写入）

**B1-D1 的限制**（计划 §4.2，须写入交付报告）：

> 看板窗口与逾期判断仍用脚本时区，B1 不改。若真实脚本时区不是 UTC+8，两者在午夜附近会不一致（VT-06）。

**B1-D4 的兼容性例外**（计划 §4.2，须原样写入交付报告；S0 的条件）：

> 引擎仍允许 `paidAmount` 缺失并回落到期次预计金额，所以 B1 完成后不能声称所有付款入口都强制输入实际金额。强制只覆盖 Console（UI 与 946）和引擎对"已提供的值"的校验；直接调用 912 的其他入口仍可能使用预计金额。

**B1-D3 的说明**（计划 §4.2）：

> 这不等于已经完成币种与金额精度治理。

**模拟的边界**：以上全部结果来自 Node `vm` 中对纯函数的调用，不是 Apps Script，也不是浏览器。它没有证明：Pay 表单的点击路径（S-13）、真实 `google.script.run` 的序列化行为、已部署脚本的真实时区（VT-06）、REAL-1…REAL-6。S1 也没有让任何一条付款路径发生变化，因为没有代码调用这些函数。

## 10. 套用、运行与回滚

先核对要套用的文件的哈希等于各 diff 头部的 base SHA-256（不一致就停，见 STOP-1）。在装有 912 与 945 的**工作副本**目录里：

```
patch -p1 --dry-run < 912_ObligationEngine.js.diff
patch -p1 < 912_ObligationEngine.js.diff
patch -p1 --dry-run < 945_OperatorConsole.html.diff
patch -p1 < 945_OperatorConsole.html.diff
cp local_precheck_test_B1_helpers.js .
node local_precheck_test_B1_helpers.js
```

预期最后一行：`ALL 374 CHECKS PASSED (0 failures)`。回滚：`patch -R -p1 < 945_OperatorConsole.html.diff`，再 `patch -R -p1 < 912_ObligationEngine.js.diff`。本报告不建议、也没有执行对真实仓库的套用。

## 11. 没有做的事与等你决定的事

**没有做**：S2（912 `recordPayment` 接线与 946 `console_recordPayment`）、S3（945 Pay 表单接线）、第二阶段 S4–S6、任何真实环境验证、治理文件落地、对任何仓库的套用或合并、部署。

**需要你决定**：

1. 评审 §5 的实现选择，尤其 C-2、C-3、C-4。
2. 确认对 `922` 偶发失败的处理（我的建议：单独记一条 backlog，不并入 B1；这只是建议）。
3. 是否授权 S2。S2 会改变 `recordPayment` 的现有行为，需要你另发授权文本；接线之后要用 `--no-s1-guard` 退役 S1 范围守卫。
