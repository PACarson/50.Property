# PROPERTY OS — DLP PHASE 1 REMAINING SLICE：Console Page Implementation Target

**DESIGN / READINESS CHECK ONLY —未实施任何代码变更。**

Repository snapshot：同一份 `50_Property-main.zip`（2026-09-03 22:08）。这轮对 945/946 的
"current state"采用的是上一轮 Phase A 交付给 CC 的版本（`showModalDialog` + DLP 已注册进
`ConsolePages`），不是 zip 里那份改动前的原始版本——照这份文件自己第 2 节的说法，Phase A
已经算完成。其余档案（918/911/922/947/900/901/所有治理文件）用 zip 原版，Phase A 完全没碰过。

**先说结论**：逐项查完 Correspondence / Rectification Event / Evidence / Secondary Damage
之后，实际能做的"remaining slice"比这份任务文件预设的规模小很多——四项里有三项已经完全对齐
Phase 1 Contract、没有東西要补；只有 Secondary Damage 有一个具体、范围很小的落差。第 9/10 节
会如实说明，不会为了凑一个"四选一排序"而把已经做完的东西说成还有事要做。

---

## 1. Repository State Verified

这轮逐行读过：`918_DefectEngine.js`（`logCorrespondence`/`recordCorrespondenceResponse`/
`logRectificationEvent`/`logSecondaryDamage`/`updateSecondaryDamageStatus` 全部函式本体，
连同它们的 query 函式）、`947_DlpConsoleServer.js`（全部 dlp_* 函式本体，含每一条内嵌的架构
注解）、`945_OperatorConsole.html`（Rectification Event / Secondary Damage / Correspondence
三段的 render + submit 函式全文）、`DlpSidebarTab_UIContract.md`（§9/§10/§12/§13 全文读过，
§1/§7/§8/§18 经既有对话与代码注解交叉确认）。`922_DashboardAdapter.js` 这轮只确认了四个
enrich/projection 函式的存在（`buildDefectDetailForSidebar_`/`enrichRectificationEventForDisplay_`/
`enrichSecondaryDamageForDisplay_`/`enrichCorrespondenceForDisplay_`），没有逐行读函式本体——
如果这四个函式内部的栏位映射细节对下一步很关键，建议之后专门再核对一次。`00_Review_History.js`
只做过关键字 grep（"administrativeSubmissionRequired"等），不是通读。

---

## 2. Phase 1 Contract vs Current Implementation

Contract（`DlpSidebarTab_UIContract.md`）§1/§7/§8/§9/§10 定的 Phase 1 范围：Case Overview、
Defect List/Detail、Update Developer Status、Record Owner Verification、Add Rectification
Event、Evidence View+Attach、Secondary Damage View+Log、Correspondence View（Case-level）。
逐项核对下来——**这九项目前全部已实作**，且都能在 947/945 里找到对应的 wrapper/表单。跟这份
任务文件预设的"还有大量 remaining slice 要设计"不同，实际落差集中在一个很窄的点上（见第 6/9
节）。

---

## 3. Correspondence Readiness

**完全符合 Contract，零落差。**

- Domain（918）：`logCorrespondence`（有 clientRequestId）、`recordCorrespondenceResponse`、
  `getCorrespondence`、`listCorrespondenceForCase`——四个函式都在，输入栏位跟 Contract §10
  逐字对得上（`caseId`/`date`/`direction`/`sender`/`recipient`/`subject`/`responseStatus`/
  `responseRequestedDate`/`responseWorkingDays`/`responseDueDate`/`clientRequestId`，
  **没有 defectId**）
- API（947）：只有 `dlp_listSidebarCorrespondence()`。代码自己的注解写得非常明确："View-only
  — no dlp_addCorrespondence exists, deliberately (Contract §1/§10... Phase 1 only lists
  'View' for Correspondence, and the Domain Model has no defectId on it at all"
- Projection（922）：`enrichCorrespondenceForDisplay_` 存在
- Console Page UI：945 有独立的 Correspondence 子导航，纯显示列表，函式头本身也写
  "View-only (Contract §1/§10)"

**这不是遗漏，是 Contract §10 明确定案的范围**："CC's ruling: the Domain is explicitly
Case → Correspondence, not Case → Defect → Correspondence — the UI must not invent an
association the data model doesn't have." 三个独立地方（947 注解、922 注解、945 段落注解、
Contract 原文）一致，不是这轮才发现的新东西。

---

## 4. Rectification Event Readiness

**完全符合 Contract，零落差。**

- Domain（918）：`logRectificationEvent`（有 clientRequestId）——`eventType` 對
  `PROPERTY_CONFIG.RECTIFICATION_EVENT_TYPES` 校验、`source` 默认 `'OwnerObserved'`
  對 `RECTIFICATION_SOURCES` 校验，跟这份任务文件第 7B 节列的既有 enum 契约逐字相符，
  没有发明新枚举
- API（947）：`dlp_addRectificationEvent` 转发所有栏位（`eventType`/`eventDate`/
  `entryTime`/`exitTime`/`contractorCompany`/`contractorPersonnel`/`notes`/`source`）
- Console Page UI：945 的 Add 表单逐一核对过，Domain 命令接受的每个栏位表单上都有，没有
  缺漏
- Idempotency：**刻意不转发 `clientRequestId`**——Contract §13 原文直接确认这是 CC 明确
  决定：Sidebar 是桌面端、连线相对稳定、是刻意的管理操作，跟 Mobile"现场+连线不稳+需要重试
  安全"的场景不同，"do not retrofit it onto those five for this Sidebar work"（这里的"five"
  指 `recordDeveloperStatus`/`recordOwnerVerification`/`closeDefectItem`/`reopenDefectItem`/
  `closeCase`，Rectification Event 本身其实已经有 clientRequestId 支援，只是 Sidebar 这层选
  不用）。双重提交靠 945 提交时 disable 按钮处理，跟 slice 1 的两个写入动作同一套做法。
  **这是已经拍板的决定，不是这轮发现的新问题。**

---

## 5. Evidence Readiness

**Phase 1 UI 范围内完全符合 Contract，零落差；BL-11 是独立的既有 backend 缺口，不算这里的
UI gap。**

- Backend capability：`attachEvidence`（911，有 clientRequestId）——已在本次对话稍早
  逐行核对
- 真实上传能力：**BL-10 VERIFIED**（真机、非预设 EvidenceType/Phase，端到端确认）
- 储存能力：真实 Drive 写入 + Evidence sheet 行写入，已核实
- 展示/projection 能力：`renderDlpEvidenceSection_` + Detail 聚合，已核实
- Console Page UI：Add 表单（Type/Phase/Description/File）+ 既有列表，逐一核对过跟
  `attachEvidence` 接受的栏位一致（`driveFileId` 例外——945 本身没有"选既有 Drive 档案"这个
  UI 概念，947 的注解自己说明这是刻意的：跟 Mobile 用同一个 `attachEvidence`，Mobile 也没有
  这个 UI，两边都只做上传路径）
- 缺失的 Phase 1 功能：无
- 未来需求：无——这份任务文件自己也说了不要重做 BL-10 的调查

唯一相关但独立的既有记录：BL-11（`911_DocumentEngine.attachEvidence()` 的 Drive→Sheet
失败窗口没有 try/catch）——这是 backend 的既有缺口，不是 Evidence 的 Console Page UI 缺口，
这轮沿用既有分类，不重新讨论。

---

## 6. Secondary Damage Readiness

**唯一有实质落差的一项，而且落差很窄、很具体。**

- Domain（918）：`logSecondaryDamage`（有 clientRequestId）接受的完整栏位——`caseId`/
  `parentDefectId`/`rectificationEventId`/`damageType`/`description`/`observedDate`/
  `observedBy`/`responsibleParty`/`administrativeSubmissionRequired`/`separateSubmissionId`/
  `dlpPrejudiceStatus`/`contractualBasis`/`clientRequestId`；另有 `updateSecondaryDamageStatus`
  存在，但**没有任何 947 wrapper**（Mobile、Sidebar 都没有）
- API（947）：只有 `dlp_addSecondaryDamage`，转发 `damageType`/`description`/`observedBy`/
  `responsibleParty`/`observedDate`——**没有转发** `rectificationEventId`/
  `administrativeSubmissionRequired`/`separateSubmissionId`/`dlpPrejudiceStatus`/
  `contractualBasis`
- Console Page UI：945 的 Add 表单栏位是 damageType/description/observedDate/observedBy/
  responsibleParty，读取列表则额外显示 `status`/`administrativeSubmissionRequired`/
  `dlpPrejudiceStatus`（但这两个后者只在**读取**时显示，Add 表单上完全没有对应输入栏位）

**要精确区分两种不同性质的"缺"**（呼应这份任务文件第 8 节的要求，不要把所有 missing 都
当同一种）：

1. **Contract 明文交代过、故意不做的**——`rectificationEventId` 的挑选器（Contract §9：
   "Phase 1 doesn't need to build a picker for this; leaving it unset is a valid, common
   case"）跟 `status` 的更新动作（Contract §9："not requested, not adding it speculatively"）。
   这两个不是 gap，是已经拍板的范围。
2. **Contract 没有明文交代、但确实比 Contract 描述的输入范围窄的**——
   `administrativeSubmissionRequired`/`dlpPrejudiceStatus`/`contractualBasis` 这三个栏位。
   Contract §9 把它们列为 `logSecondaryDamage` 正常输入的一部分，还特别说"plain neutral
   free-text by design"（暗示是应该给使用者填的东西，不是应该隐藏的东西），但 947/945 都没
   有把这三个栏位串起来。grep 过 `00_Review_History.js` 跟 Contract 全文，没有找到任何一条
   记录明确讨论过"故意不给这三个栏位做输入"这件事——不像 `rectificationEventId`/`status`
   那样有明文交代。**这是这次投资查出来、目前没有文件解释的落差，不是我能从 repository 本身
   确定是不是刻意的**，如实记录，不假设是 bug 也不假设是故意的。

---

## 7. Contract / Implementation Matrix

| Area | Domain | API (947) | Projection (922) | Console Page UI | Missing | Risk |
|---|---|---|---|---|---|---|
| Correspondence | ✅ 含 clientRequestId | ✅ View-only（故意，Contract §10） | ✅ | ✅ View-only | 无（符合 Contract） | 低 |
| Rectification Event | ✅ 含 clientRequestId | ✅ 全栏位转发 | ✅ | ✅ 全栏位表单 | 无（符合 Contract） | 低 |
| Evidence | ✅ 含 clientRequestId，BL-10 VERIFIED | ✅ | ✅ | ✅ | 无（Phase 1 范围内）；BL-11 是独立 backend 缺口 | 低（UI）／既有（backend） |
| Secondary Damage | ✅ 含 clientRequestId；`updateSecondaryDamageStatus` 无任何 wrapper | ⚠ 只转发 5/8 个栏位 | ✅ | ⚠ Add 表单缺 3 个栏位的输入（2 个只读显示） | **UI 缺口**：3 个栏位没有输入介面，没有文件解释原因 | 低—中 |

---

## 8. Console Page Architecture Assessment

Phase A 的 `ConsolePages` registry目前只注册了顶层的 `'dlp'`。DLP 内部既有的
`showDlpSub()`（Overview/Defects/Correspondence/Detail）完全没有改造成同一套 registry
底下的嵌套项目——这次逐一核对 Correspondence/Rectification Event/Evidence/Secondary
Damage 之后，**这四项都是 Defect Detail 页面内的既有区块，不是需要新增的顶层导航**，也就是
说，即使要处理第 6 节那个 Secondary Damage 落差，也不需要动到 Console Page 的导航架构本身
——纯粹是 Detail 页面内一个 `<details>` 表单里加几个栏位，跟 Console Page shell 完全没有
交集。这份任务文件第 9 节问"existing ConsolePages registry 对剩下的 DLP 区块够不够"——答案
是：这些区块本来就活在 `view-dlp` 容器内部，不需要各自变成独立的 registry 项目，Phase A 的
既有设计已经够用，不需要重新设计。

---

## 9. Recommended Minimum Vertical Slice

**只有一个候选，而且范围很小**：把 Secondary Damage Add 表单补上
`administrativeSubmissionRequired`（checkbox）/`dlpPrejudiceStatus`（text 或 select，
取决于 901 schema 有没有固定词汇表——这轮没有查证 901 里这个栏位是不是有枚举，如果有，
应该沿用既有枚举而不是开放文字）/`contractualBasis`（text）三个栏位，转发进
`dlp_addSecondaryDamage` → `logSecondaryDamage`。全部走既有 Domain/API/Projection，
零新 Command、零 Schema 改动、零重复实作——完全符合这份任务文件第 10 节列的准则。
`rectificationEventId` 的挑选器**不**建议做——Contract §9 已经明确说不需要。

---

## 10. Recommended Implementation Order

Correspondence / Rectification Event / Evidence 三项**没有排序的必要**——三项都已经完全
对齐 Contract，没有待做工作，谈"优先做哪个"没有意义。真正的排序问题只剩：**要不要现在做
第 9 节那个 Secondary Damage 补栏位**，还是先记录、等真实使用（EST8）反馈需不需要这三个
栏位再决定。

---

## 11. Real Use Parallel Track

- **现在能做**：第 9 节的 Secondary Damage 补栏位——不依赖真实回馈，纯粹是把既有 Contract
  已经定义、但没接上 UI 的栏位接上
- **应该等**：`updateSecondaryDamageStatus` 要不要开放一个更新动作——Contract §9 已经说
  "not requested"，等 CC 真的需要再说，不要投机式先做
- **能本地验证**：JS 语法、栏位是否正确转发进 `google.script.run` 呼叫——如果真的动手做
  第 9 节这个小改动
- **需要真机验证**：新栏位存进 Sheet 之后，读取视图能不能正确显示（`enrichSecondaryDamageForDisplay_`
  会不会需要跟着调整——这轮没有逐行核对这个函式，属于第 1 节列的"未逐行核对"项目）
- **需要真人操作**：无——这次没有涉及需要真人在 Console Page 上操作才能确认的新流程

---

## 12. Local Verification Plan

如果 CC 授权做第 9 节：三个新栏位加进 945 的 Add 表单 HTML + `submitDlpAddSecondaryDamage`
的 `input` 物件；`node --check` 跑一次抽出来的 `<script>` 区块确认语法；grep 确认
`dlp_addSecondaryDamage`/`logSecondaryDamage` 两层都正确转发新栏位（跟 Phase A 那轮
`showModalDialog` 签名查证同一种做法——不假设，直接对照代码）。

## 13. Real GAS / Real Device Verification Plan

真机新增一笔 Secondary Damage，确认三个新栏位存进 Sheet 的值正确、读取视图正确显示
`administrativeSubmissionRequired`/`dlpPrejudiceStatus`（这两个本来就有读取显示，这次
要确认新填的值真的显示出来，不是仍然显示空白）。`contractualBasis` 目前读取视图完全没有
显示栏位——如果要做第 9 节，这个也要一并加到读取视图，否则填了却看不到。

---

## 14. Deferred Items

BL-8、BL-9、BL-11、Phase 2（Close Defect/Reopen Defect/Close Case）——沿用既有状态，
这轮没有触碰、没有重新讨论。`updateSecondaryDamageStatus` 无 wrapper——沿用 Contract §9
"not requested"的既有决定，不是这轮的新缺口。

---

## 15. Governance Updates Proposed（只报告，未写入）

**提议**：如果 CC 决定第 9 节那个 Secondary Damage 补栏位值得做，建议用一个新的 BL 编号
（下一个可用编号是 BL-12，此刻用于 `00_Product_Backlog.js` 检查过 BL-11 是目前最高编号）
记录第 6 节那个"Contract 没有明文交代、目前没有文件解释"的落差本身——不是记录"要修复"，是
先把这个发现本身记下来，格式比照 BL-11 的"现象/关联既有记录/影响/设计草图/依赖"。这轮没有
写这个条目，因为这个任务本身是 Design/Readiness Check，不是"CC 已经说要写"的情境（上一轮
BL-11 是 CC 明确说"现在写 BL-11 patch"之后才写的）。

---

## 16. Implementation Authorization Required

CC 决定两件事：(1) 第 9 节的 Secondary Damage 补栏位要不要做、现在做还是等真实回馈；
(2) 第 15 节的发现要不要正式写成 BL-12。这两个都做完/决定完之后，DLP Phase 1 本身（连同
Phase A 的 Console Page 迁移）可以算是真正意义上的"完整"——因为 Correspondence/
Rectification Event/Evidence 三项这轮确认下来已经没有其他待办事项。
