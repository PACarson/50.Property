# Phase 11 — Real DLP/Defect Data Onboarding Checklist

**目的**：把 Est8 Seputeh A-19-11 这次真实的 DLP Case，正式、完整地建立进 Property OS。这是录入前的盘点，不是录入本身——列出每一类资料的目前状态（已有/部分有/缺失/不确定），录入时照着打勾。

**纪律提醒**（贯穿整份 Checklist）：录入过程中如果发现栏位不够、Category 不好分、流程不顺手——先记录到下方「Gap 记录」，不要现场改 Schema。只有真正的 data integrity/safety bug 才立即暂停处理。

---

## 目前状态：PRE-IMPORT GATE — WAITING FOR CANONICAL SOURCE VERIFICATION

（2026-08-22 晚）`ONETIME_Phase11_DefectImporter.js`：**Importer Design Review Approved**（34/34 测试通过，完整清单见 `00_Review_History.js` REVIEW-003）。尚未执行 `phase11_runDefectImport()`，也不会执行，直到下方 Item A、Item B 都确认完成。Runtime 不再修改。

DefectItem Schema Migration（新增 `ItemID`/`SubCategory`/`Remark`，20 栏 reorder）已完成：**ADR-P18 APPROVED**（2026-08-24），CC 已在真实 GAS 项目完成部署、执行 migration、确认 Mobile Console 无异常（完整过程见 `00_ADR_Log.js` ADR-P18、`00_Review_History.js` REVIEW-004）。**Schema Freeze 现在生效中**——真实资料录入期间如冒出新栏位需求，先记进 `00_Product_Backlog.js` 的 Feedback/Gap，不当场改 Domain/Runtime，除非是 data integrity/safety bug。当前状态：**Schema-Frozen / Pre-Import Gate**。

## ⚠ 开始前，建议先确认的 3 件事

这三项不确定不会阻塞开始录入，但会影响录入时怎么填，建议先花几分钟核对：

1. **VPDate / DefectExpiry**

   - *原始发现（本 Checklist 初版，2026-08-22 上午）*：CONFIRMED 空白——Phase 0 Audit 当时实际拉过 `PROP-mshs0wca-skrq` 这一行核对，`VPDate`/`DefectExpiry` 两栏原文都是空的。
   - *解决（2026-08-22 下午，CC 提供）*：✅ VPDate = 2026-07-18。

   DefectExpiry 目前仍是空的——按现有逻辑（VPDate + 24 个月）算出来会是 2028-07-18，要不要现在就明确填这个值，还是留空让系统继续用估算显示，你决定。确认好后，Step 1 可以用这段直接在 Script Editor 跑：
   ```js
   updateProperty({
     propertyId: PROPERTY_CONFIG_REAL_PROPERTY_ID, // 换成 'PROP-mshs0wca-skrq'
     changedFields: { VPDate: '2026-07-18' /*, DefectExpiry: '2028-07-18' 如果要明确填 */ }
   });
   ```

   ⚠ 领域模型提醒：你提到「Defect submission 2026-08-13，一般 30 天 developer 要修好，Malaysia law 可以再 extend 30 天」——这个 30(+30) 天的维修期限，跟 VPDate/DefectExpiry 是两个不同的东西，不要混在一起填：
   - `Property.VPDate`/`DefectExpiry` 管的是整个单位 24 个月 DLP 期限（今天确认的 2026-07-18 起算）
   - 这次 13 Aug 提交的 30(+30) 天维修期限，落在 `Correspondence.ResponseDueDate`（Step 6 才会用到，`isCorrespondenceOverdue_` 就是看这个栏位判断逾期）——等你正式发出/收到第一笔跟这次提交相关的 Correspondence 时，`ResponseDueDate` 就填 2026-09-12（30 天）或 2026-10-12（如果 extend），不是现在就要处理

2. **真实缺陷总数 — Item A: Canonical Defect Count**

   - *原始发现（2026-08-22 上午）*：项目文件里一致写"140+"（`OriginalSubmissionDate` = 13 Aug 2026），对话记忆里另外出现过"145"，两者不一致，来源都不是直接查 Sheet 得到的。
   - *状态：⏸ PENDING USER VERIFICATION*（2026-08-22 晚，CC 重新确认）。不使用"145"，也不自行假定"140+"，以原始 Defect Report 为准。CC 会提供/确认原始文件；确认后至少要有：
     - [ ] total defect items（总数）
     - [ ] 编号范围
     - [ ] 是否存在 duplicate reference
     - [ ] 是否存在缺失编号
     - [ ] 是否有非-defect 项目混在报告里
   - 原始文件上传后，可以直接帮忙做这轮独立核对，同时整理成 Batch Onboarding Script 要用的格式。**这一项确认前，不执行 `phase11_runDefectImport()`。**

3. **Phase 5/6 smoke test 资料 — Item B: Test Data Disposition**

   - *原始发现（2026-08-22 上午）*：Phase 5 曾在真实 Drive 资料夹建过至少一个真实文件，Phase 6 曾用真实日期验证过工作日计算逻辑，两者是否为「正式」资料还是需要清理的测试资料，无法从文件本身判断。
   - *状态：⏸ PENDING USER VERIFICATION*（2026-08-22 晚，CC 重新确认）。由 CC 亲自检查真实 Drive/Sheet。在 CC 确认前：
     - 不删除
     - 不覆盖
     - 不重新建立
     - 不把旧测试资料自动当成 production data
   - 维持当前状态不变。


---

## Step 1 — 建立真实 Property Case

| 项目 | 状态 | 备注 |
|---|---|---|
| Property（`PROP-mshs0wca-skrq`） | ✅ 已有 | PropertyName="Est8 Seputeh"、Developer="Eupe Corporation Berhad"、AddressLine1="A-19-11, Residensi Estetik 8, No 6, Jalan Syed Putra"、AddressCity="Kuala Lumpur"、AddressPostcode="58000"、Owner="Carson Tay"、PropertyType="RESIDENTIAL_CONDO"、Status="Active" |
| DevelopmentName / UnitLabel | ❓ 待确认 | ADR-P17 建议值 "Est8 Seputeh" / "A-19-11"，需要确认是否已透过 `updateProperty` 真正写入这两个新栏位 |
| VPDate | ❌ 缺失 | 见上方待确认项 1 |
| DefectExpiry | ❌ 缺失 | 见上方待确认项 1 |
| PropertyCase（`CASE-msxyfkpi-zu4j`） | ✅ 已有 | OriginalSubmissionDate = 13 Aug 2026 |
| OriginalDefectCount | ❓ 待核对 | 见上方待确认项 2 |
| CaseTitle / ManagementOffice | ❓ 待确认 | 检查是否已填，缺的话现在补 |

- [ ] DevelopmentName/UnitLabel 确认已写入（或现在写入）
- [ ] VPDate 填入真实值
- [ ] DefectExpiry 填入真实值（或确认留空、接受估算显示）
- [ ] OriginalDefectCount 对照原始 Defect Report 核实
- [ ] CaseTitle / ManagementOffice 补齐

---

## Step 2 — Defect Items 全部录入

**目前状态**：`DefectItems` 表里只有 Phase 2/3 smoke test 建的少数几笔测试用记录（专门用来验证 `DeveloperStatus`/`OwnerVerificationStatus` 优先级 bug 的场景），不是真实清单——这是这次 onboarding 工作量最大的一步。

- [ ] 逐一录入真实 140+ 项，每笔至少填 `Description`、`Location`、`Category`、`Priority`
- [ ] 建议同时填 `OriginalReference`（对回原始 Defect Report 的编号，例如"88"）——这个栏位就是为了日后核对而设计的，录入时顺手填不额外费事
- [ ] `Category` 目前是草案枚举：`Structural / Waterproofing / Plumbing / Electrical / AirConditioning / Carpentry / Painting / Ironmongery / Appliance / Flooring / Other`。遇到不好分类的缺陷，先选 `Other` + 在 `Description` 写清楚，记录成 Gap，不要现场加新枚举值
- [ ] （效率提示，非必须，也不是新增 Runtime）140+ 笔如果一笔一笔在 Mobile/Sidebar UI 上点会很花时间——已经写好并在本地测试过一个一次性 Batch Onboarding Script（`ONETIME_Phase11_DefectImporter.js`，跟这份 checklist 一起附上），细节、设计理由、测试结果见对话回复，用不用由你决定。**这个 Script 目前还没有对你的真实资料跑过，也不会跑——等上方「真实缺陷总数」那一项确认，你把原始 Defect Report 内容给我之后才会真正执行。**

---

## Step 3 — Defect Report / SnP / 相关文件 → Evidence/Document records

- [ ] 案件层级的参考文件（原始 Defect Report 本身、SnP 等）目前是否已透过 `attachEvidence` 存过，需要确认
- [ ] Phase 5 smoke test 留在真实 Drive 资料夹的那个文件，先确认是不是就是正式文件，还是只是测试用的档案（见上方待确认项 3），是的话据实补齐说明，不是的话另外补正式的
- [ ] `Evidence.EvidenceType` 有 `DeveloperReport` / `InspectionReport` 等选项刚好对应这类案件层级文件

---

## Step 4 — 有照片的 Defect 建立对应 Evidence

- [ ] 逐一检查 140+ 项里哪些原本就有照片（原始检查/报告时拍的），透过 `attachEvidence` 关联到对应 `DefectID`（用 `RelatedDefectID`，不需要额外填 `RelatedEntityType`——那个栏位是给 DailyProgressCheck/Correspondence/RectificationEvent/SecondaryDamage 这四种用的）

---

## Step 5 — 开始每天使用 Mobile Console 做 Daily Progress Check

- [x] 机制已 Production-Ready（Phase 9/10，2026-08-22 真机验证通过）
- [x] 已有 2 笔真实记录（Phase 4 smoke test：一天 no-access、一天 access-granted）——这两笔视为正式记录的起点保留，不清掉重来
- [ ] 从现在起持续、每天记录——这一步没有"完成"的终点，是 Phase 11 之后长期的操作节奏，跟其他步骤性质不同

---

## Step 6 — Developer/Contractor 有进度时，记录 Correspondence / Developer Status

- [ ] 13 Aug 提交至今约一星期，检查是否已经有任何真实的 Developer/Contractor 往来（书面回复、约访问时间等），有的话补录成真实 `Correspondence`
- [ ] Phase 6 smoke test 只验证了 `addWorkingDays_` 的计算逻辑，不确定有没有真的留下一笔 `Correspondence` 记录（见上方待确认项 3），需要核对 Sheet

---

## Step 7 — Owner 实际检查后记录 Owner Verification

- [ ] 目前应该还没有任何 Defect 走到这一步——Developer 都还没开始处理（才提交一星期），这不是缺口，是正常的"还没轮到"，先勾了解即可，不用现在做任何事

---

## Step 8 — 后续 Rectification / Reinspection 持续记录

- [ ] 同 Step 7，目前应该还没有真实记录，正常
- [ ] Phase 7 smoke test 建过的内容，需确认是否为真实资料或只是过程验证测试

---

## Gap 记录

录入过程中遇到的「不顺手」都记在这里，不要现场改 Schema。整个 Case 跑完一轮后集中做 Gap Review（见 `00_Product_Backlog.js` 的 Phase 11 Gap 收集说明），之后视需要以 `BL-N` 的形式正式收进 Backlog。

| 日期 | 遇到什么 | 影响哪个 Step | 先怎么处理的 |
|---|---|---|---|
| | | | |

---

## Phase 11 完成的判断标准

不是"140+ 项全部录完"才算完成——比照 Step 5-8 的性质，Daily Check/Correspondence/Rectification 是长期节奏，不会有一个明确终点。建议的完成标准：

- [ ] Step 1（Property/Case 基本资料）全部确认或填齐
- [ ] Step 2（Defect Items）真实清单全部录入
- [ ] Step 3（案件层级文件）全部建成 Evidence
- [ ] Step 4（有照片的 Defect）全部关联 Evidence
- [ ] Step 5（Daily Check）已经稳定进行至少几天，形成习惯
- [ ] 上方 Gap 记录表至少收了一轮真实使用中遇到的问题
- [ ] 完成以上，回到 CC 与 Claude 一起做一次集中 Gap Review，决定要不要动 Domain Model，再决定下一步（914 / Sidebar 排期 / Repair Cycle 等）
