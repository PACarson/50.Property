# PROPERTY OS — BL-12：Secondary Damage Contract Alignment — Implementation Report

**⚠ 先说一个更正，这个更正改变了这次实际要改的范围**：上一轮 readiness report 说
`947_DlpConsoleServer.js` 的 `dlp_addSecondaryDamage` 没有转发 `administrativeSubmissionRequired`/
`dlpPrejudiceStatus`/`contractualBasis`——**这是错的，是 Claude 上一轮读取/转写时的错误，
不是 repository 真的这样**。这轮动手改之前重新逐字核对原始 zip：947 其实一直都有转发这四个
栏位（含 `separateSubmissionId`）到 `logSecondaryDamage`，只是 945 的表单从来没有收集、也
没有送出这些栏位，947 收到的自然是 `undefined`，最后存成 false/空字串。**问题从头到尾只在
945 这一层，947 完全不用改**——不是这轮"修好了 947"，是 947 本来就没有问题。如实记录这个
更正，不掩盖。

---

## 1. BL-12 Implementation Summary

实际改动比原本授权的范围更窄：**只改了 945_OperatorConsole.html 一个档案**。947/918/922/901
全部未动——这四层本来就已经支援这三个栏位（下面第 2/5 节有逐一核对证据），纯粹是 945 的
Add 表单没收集、没送出。已完成：表单加 3 个栏位、`submitDlpAddSecondaryDamage` 转发它们、
读取视图补上原本也没显示的 Contractual Basis。本地验证：语法通过、diff 范围精确、
`local_precheck_test_918.js` 新增 3 个断言并**真的跑过**，147/147 通过。真机验证未做，
没有权限，需要 CC。

---

## 2. Repository State Before Change

这轮动手前重新核对（不是只信上一轮的报告）：

- `918_DefectEngine.js` `logSecondaryDamage`——完整读过，确认 `administrativeSubmissionRequired`
  （`!!` 强制转 boolean）、`dlpPrejudiceStatus`（`|| ''`，自由文字）、`contractualBasis`
  （`|| ''`，自由文字）三者都已经正确写进 `damage` 物件、正确传给
  `objectToRowArray_(damage, PROPERTY_SCHEMA.SecondaryDamage.columns)`
- `901_PropertySchema.js`——`SecondaryDamage.columns` 确认三个栏位都在（`AdministrativeSubmissionRequired`/
  `DlpPrejudiceStatus`/`ContractualBasis`），schema 自带的栏位注解写明 `DlpPrejudiceStatus`
  是"string, optional — neutral tag only"、`ContractualBasis`是"string, optional —
  reference text only"——**都不是 enum**，之前 readiness report 猜测"可能有固定词汇表"
  这轮已经排除，`900_PropertyConfig.js` 里也确认没有对应的枚举常量
- `922_DashboardAdapter.js` `enrichSecondaryDamageForDisplay_`——完整读过，确认
  `contractualBasis: damage.ContractualBasis || ''` 早就在里面，projection 层完全没有
  缺口
- `947_DlpConsoleServer.js` `dlp_addSecondaryDamage`——**重新逐字核对，发现上面那个更正**
- `945_OperatorConsole.html` `renderDlpSecondaryDamageSection_`/`submitDlpAddSecondaryDamage`
  ——确认这轮 readiness report 对 945 的描述是对的：表单/提交物件都只有 5 个栏位
- `local_precheck_test_918.js`——确认 Phase 7 SecondaryDamage 区块存在，既有断言只测过
  `AdministrativeSubmissionRequired`的默认值（false），没有测过三个栏位收到非默认值的情况
- `DlpSidebarTab_UIContract.md` §9——重新读过，确认这三个栏位属于"正常输入的一部分"，
  跟 `rectificationEventId`/`status`那两个有明文交代"不用做"的情况不同

---

## 3. Files Changed

**只有 `945_OperatorConsole.html`**——`renderDlpSecondaryDamageSection_`（表单 + 读取视图）
跟 `submitDlpAddSecondaryDamage`（input 物件）。另外 `local_precheck_test_918.js` 加了
3 个断言（测试文件，不是 Runtime 代码）。`00_Product_Backlog.js` 加了 BL-12 条目。

**947_DlpConsoleServer.js / 918_DefectEngine.js / 922_DashboardAdapter.js /
901_PropertySchema.js / 900_PropertyConfig.js：零改动**——第 2 节的核对已经确认这四层
本来就是对的。

---

## 4. Exact Three-Field Alignment

| 栏位 | 类型 | 945 表单元件 | 947/918 是否已支援 |
|---|---|---|---|
| `administrativeSubmissionRequired` | boolean | checkbox（沿用既有 `ob_autoGenerate` 的样式） | 是，一直都支援 |
| `dlpPrejudiceStatus` | 自由文字 string | text input | 是，一直都支援 |
| `contractualBasis` | 自由文字 string | text input | 是，一直都支援 |

三者都没有做值转换或校验逻辑改动——checkbox 的 `.checked`本身就是 boolean，text input
的 `.value || ''`跟既有 `observedBy`/`responsibleParty`两个栏位完全同一种写法，没有发明
新的处理方式。

---

## 5. Domain/API/Schema Impact

**零影响**——这轮唯一的代码改动在 945，947/918/922/901 全部原样。这正是这个 slice 应该
长的样子（Console Page UI → 既有 947 wrapper → 既有 Domain command，没有新 Command、
没有新 Schema、没有重复实作）。

---

## 6. Local Tests

`local_precheck_test_918.js` 的 Phase 7 区块新增：

```
AdministrativeSubmissionRequired=true is stored, not coerced away
DlpPrejudiceStatus stored verbatim as free text
ContractualBasis stored verbatim as free text
```

**真的用 Node 跑过**（`GasShim.js`的`loadPropertyOSContext`+ `vm`模组，本地起一个干净
context 直接执行）——第一次跑的时候，新增的记录不小心用了跟既有断言共用的`caseId`，把
"listSecondaryDamageForCase returns both"这个既有断言从预期 2 笔弄成 3 笔，跑出 1 个
FAIL；改成用同一个测试区块里本来就有的`otherCase`变量之后重跑，**147 项全部通过（原本
144 项 + 新增 3 项）**。如实记录这个来回，不是一次就干净通过。

947 这一层没有对应的本地测试可跑——跟其他每一个 dlp_* wrapper一样，从来没有
`local_precheck_test_947.js`这种档案，这不是这轮才有的缺口，这轮也没有新增（947 完全
没改，没有新代码需要测）。

---

## 7. Real GAS Verification

**没做。** 没有 CC 真实 GAS 专案的写入/操作权限，这是本次对话从头到尾的既有限制。

## 8. Real Device Verification

**没做，需要 CC**：真机新增一笔 Secondary Damage，三个新栏位都填有意义的值（比如
`dlpPrejudiceStatus`填个短句、`contractualBasis`填个条款编号），确认：

1. 提交成功、跳出"Secondary damage recorded."
2. 读取视图正确显示三者的值（`Contractual Basis`是全新的显示栏位，之前完全没有，
   要特别确认这个真的显示出来了）
3. 直接去 Sheet 核对新那一行的三个栏位存的值正确

---

## 9. Regression Check

- Diff 对照 Phase A 版本（第 2 节确认过的基准），改动精确落在 SecondaryDamage 那一段，
  没有波及 Evidence/Correspondence/Rectification Event/DLP 导航的任何一行
- `node --check`过抽出来的`<script>`区块，语法正确
- 既有 5 个栏位（Damage Type/Description/Observed Date/Observed By/Responsible Party）
  的表单元件、id、行为完全没动
- Local test 147/147 通过，包含所有既有的 144 项

---

## 10. Gaps Discovered

无新发现——这轮唯一的"发现"是第 0 节那个更正（上一轮报告本身的错误），不是 repository
里的新缺口。

---

## 11. BL Statuses

BL-8：DEFERRED（未动）。BL-9：DEFERRED（未动）。BL-10：VERIFIED（未动）。BL-11：
DEFERRED（未动）。**BL-12：新增，已实作（945 层面），本地验证通过，真机验证待办**——
不是"VERIFIED"，因为真机那一半还没做，措辞上跟 BL-10 当初"实作完成但真机未测"那个
阶段是同一个状态，不要混为已经完全验证。

## 12. Governance Changes

`00_Product_Backlog.js`已经加了 BL-12 条目（本次连同这份报告一起交付），格式比照
BL-10/BL-11 的既有写法，包含第 0 节那个更正的完整交代。没有改 ADR、没有改
`00_File_Map.js`、没有改`00_Project_State.js`——这次改动没有触及任何这几份文件描述的
架构事实。

---

## 13. Remaining DLP Phase 1 Work

上一轮 readiness report 的结论不变：Correspondence/Rectification Event/Evidence 三项
完全符合 Contract，这轮也没有再重新调查它们（这个更正只发生在 Secondary Damage 这一项）。
BL-12 真机验证过关之后，DLP Phase 1（连同 Phase A 的 Console Page 迁移）就没有其他
已知的待办事项了。

## 14. Recommended Next Step

CC 跑第 8 节的真机验证。确认没问题后，BL-12 可以比照 BL-10 当初的做法，正式标记
VERIFIED。
