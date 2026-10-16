# Billing 真实环境核对清单（v2）

用途：回到电脑前，验证 Operator Console 的 Add Bill 能正确记录真实账单。
依据：945 `d1bf51ed…`、946 `e993b71b…` 的实际源码，以及真实登记表（`50. Property TEST`）的表头与记录。

> **重要**：**生产环境的保存路径目前没有被验证过。** 下面所有"应该"都是根据源码和隔离环境测试推断的，
> 只有你在真实环境里亲手看到，才算验证通过。

## 目前状态

| 项 | 状态 |
|---|---|
| 946 已部署，Add Bill 的 Property 下拉能显示 Est8 Seputeh | **你已报告**（我没有亲眼验证） |
| 选项是否带 `· A-19-11`、状态文字是否隐藏 | 未确认 |
| 真实表里的账单 | **目前没有任何一笔**（`ObligationRules`、`ObligationOccurrences` 只有表头） |
| 失败测试、真实保存、记录核对 | 未做 |

这份清单分四类，**风险依次升高**。做到哪一类就停在哪一类也没问题。

---

## 第一类：只读的 UI 核对（不写任何数据）

打开 Property OS → Open Operator Console → Add Bill。

1. 下拉里的选项应显示 **`Est8 Seputeh · A-19-11`**。
2. 下拉下面**没有**灰色或红色的文字行。
   - 灰色 "Loading properties…" 一直不消失，或红色 "Failed to load properties: …"，请把整行文字发给我。
   - 灰色的 "No properties available…" 表示登记表里没有可选的 Property，这和读取失败不是一回事。
3. （可选）在浏览器开发者工具里确认：`document.getElementById('ob_propertyId').value` 等于 `PROP-mshs0wca-skrq`。

---

## 第二类：不写账单的失败测试

- Category 选 `Water`，Payee 和 Due Date 随便填，**Amount 填 `-5`**，点 Save。
- 应该看到：红色提示 **"Amount must be greater than 0."**；**没有**成功文字；刚填的值还在；Save 按钮可以再点。
- 三张表（见第四类）行数**不变**。

这一步不应写入任何数据。如果你看到的不是这样，请先停下来告诉我。

---

## 第三类：创建一笔真实账单（**会写入真实数据**）

### 点 Save 之前
- 第一笔请用**真实账单**的数据。系统没有删除功能，写错的只能 Cancel（终态）或手工改表。
- **不要重复点 Save**，也不要用重复保存来"测试"。UI 不防重复：同样的输入保存两次就是两条规则。

### 填写
| 栏位 | 填什么 |
|---|---|
| Property | `Est8 Seputeh · A-19-11` |
| Category | `Water` |
| Payee | 供水单位的名称 |
| Amount | 这张账单的金额 |
| Frequency | `Monthly` |
| Due Date | 这张账单的到期日 |
| Grace days / Auto-generate | 默认值（0 / 勾选） |

### 点 Save 之后
- 成功时提示应为：`Bill added. Obligation ID: OBL-… · First due: yyyy-MM-dd`（约 10 秒）。**记下这个 ID。**
- 出现红色错误：记下错误文字，**不要立刻重试**。先看下面的警告。

### 若请求超时、对话框突然关闭，或你不确定有没有保存成功
**重试之前，先去 `ObligationRules` 表看有没有刚才那一行**（按 `CreatedAt` 找，Payee、Amount、DueAnchor 对得上）。
- 已经有 → **不要再保存**，否则会出现重复的账单。
- 没有 → 才可以重试。
- 红色错误提示不等于"一定没保存"：保存过程中间失败时，部分行可能已经写入（见下面的"已知限制"）。

---

## 第四类：核对保存后的记录

三张表各新增恰好 **1 行**。

**`ObligationRules`**
- `ObligationID` = 提示里的 ID
- `PropertyID` = `PROP-mshs0wca-skrq`
- `Category` = `Water`
- `Amount` 为数字，等于你填的
- `Currency` = `MYR`（UI 不发送币种，用的是 900 里的默认值）
- `DueAnchor` = 你选的到期日
- `Status` = `Active`

**`ObligationOccurrences`**
- `ObligationID` 相同
- `EffectiveDue` = 你选的到期日 = 提示里的 First due
- `Amount` = 规则金额
- `Status` = **`Active`（不是 `Paid`）**
- `PaidDate`、`PaidAmount`、`PaidVia` **全空**

**`ObligationHistory`**
- `OccurrenceID` 对得上
- `FromStatus` 空 → `ToStatus` = `Active`
- `TriggeredBy` = `CreateOccurrence`

**看板**：按到期日出现在 Overdue、Due this week 或 Upcoming，**没有被标成已付**。

**三张表出现下面任何一种情形，请把整行内容发给我**：
- `ObligationRules` 有这一行，但 `ObligationOccurrences` 没有对应的行；
- `ObligationOccurrences` 有，但 `ObligationHistory` 没有；
- 同一笔出现了两组行。

---

## 可选：记录付款（**第二次写入，单独操作**）

只有这张账单确实已经付了才做。在看板里找到这一条，点 **Pay**，填**实际金额**和**付款日期**，点 Confirm。
- 水电费每月金额不同，请填实际金额；Pay 表单预填的是规则里的预计金额。
- **日期默认值**取的是 UTC 日期（945:760）。马来西亚时间 0 点到 8 点之间可能是前一天，保存前看一眼。
- 付款后：该期次应为 `Paid`，`PaidDate`、`PaidAmount` 是你填的值，历史表多一行 `Active → Paid`。设计上会自动生成下一个月的期次，请留意是否出现（没有在真实环境验证）。

## Electricity 和 MaintenanceFee
流程完全一样，下拉里的类别名是 `Electricity` 和 `MaintenanceFee`。Frequency 可选 Weekly、Monthly、Quarterly、HalfYearly、Yearly、Custom，按实际账单周期选。

---

## 已知限制（不是你的操作问题）
- **没有地方记录**：账期、开单日、账单编号、备注、账单图片。
- 规则里的金额是"预计金额"；每月实际金额只在 Pay 时记录，下个月的期次仍预填规则金额。
- 金额不会四舍五入：填 `42.555` 就存成 `42.555`。
- **保存不是原子的**：规则、首个期次、历史行是分步写入的。如果某一步中途失败，前面已写入的行不会回滚（隔离环境的模拟显示：可能留下一条没有期次的规则、一个没有历史行的期次，或三者都已写入但界面显示失败）。这需要真实的写入故障才会触发，真实环境里没有观察到过。
- 遇到上述情形，重试会产生重复或孤儿的行，所以才要求"先看表再重试"。

## 回来后请把这些发给我
1. 第一类看到的选项文字，以及状态文字行（如果有）。
2. 第二类的失败提示文字。
3. 第三类的成功提示文字（含 ID）。
4. 第四类三张表里那几行的内容（截图或文字都可以），我可以用 Drive 只读核对。
