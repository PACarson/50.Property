# BL-2 PropertyInsurancePolicy — Implementation Report
2026-09-20

---

## A. REVIEW-010 Resolution

| # | Condition | Decision | Outcome |
|---|---|---|---|
| 1 | Architecture | 912 satellite entity, not 920 | Implemented as decided |
| 2 | Renewal | New record, preserve history | Implemented — `Status` field (Active/Superseded), renewal never overwrites |
| 3 | Documents | Use existing 911 Document/Evidence | **Blocked on discovery** — see below |
| 4 | Events | No dedicated Policy event family | Implemented as decided — no new events |
| 5 | PropertyID | No redundant field | Implemented as decided — only `ObligationID` |

**条件 3 的技术发现**：动手接 911 时，直接重读 `attachEvidence()`
（911_DocumentEngine.js 194-210 行附近）确认它硬性要求
`input.relatedCaseId` 且验证对应的 PropertyCase 真实存在——Insurance
没有 Case，技术上套不进去。没有绕过这个验证、没有塞假 CaseID、也没有
另建第二套档案储存——选择这次不实作文件关联，Schema 里也没有放
DocumentID 欄位（放了也用不了）。记录为需要一个小型、单独授权的 911
扩充（让既有但目前未使用的 `RelatedEntityType`/`RelatedEntityID` 成为
`relatedCaseId` 的替代路径）——见 H 节 Outstanding。

---

## B. BL-2 Implementation Scope

PropertyInsurancePolicy 作为 912 的卫星 entity：create、renew（新增
记录保留历史）、依 ObligationID 查询目前/历史保单。UI 层：Add Bill
表单在 Category=Insurance 时收集保单栏位（两段式建立：先 Obligation
后 Policy），Dashboard 卡片新增 Policy 按钮查看/续保。文件关联未实作
（见 A 节）。

---

## C. Schema

`901_PropertySchema.js` 新增 `PropertyInsurancePolicy`：

```
PolicyID (PK, INS-...) | ObligationID (FK) | InsuranceCompany |
PolicyNumber | CoverageType | CoverageAmount | PolicyStartDate |
PolicyExpiryDate | Status (Active/Superseded) | CreatedAt | UpdatedAt
```

`900_PropertyConfig.js`：新增 `SHEET_NAMES.PROPERTY_INSURANCE_POLICIES`
与 `INSURANCE_POLICY_STATUSES`（`['Active', 'Superseded']`）。

---

## D. Architecture

- **912 卫星关系**：Policy 只存 ADR-P01 既有 Obligation Schema 没有
  的描述性栏位；Obligation 保留付款/到期/逾期/循环的全部权威。
- **Obligation 边界**：`createInsurancePolicy`/`renewInsurancePolicy`
  都先用 `assertObligationIsInsuranceCategory_()` 确认目标 Obligation
  存在且 `Category==='Insurance'`，不重复、不绕过既有验证。
- **Document 边界**：本轮未实作（见 A 节）。
- **Property 关系**：没有直接 PropertyID，透过 ObligationID →
  ObligationRule.PropertyID 间接取得，符合条件 5。
- **Renewal/History 模型**：`renewInsurancePolicy` 先把目前 Active
  记录标成 Superseded，再新增一笔 Active 记录，两者共用同一个
  ObligationID——`getActiveInsurancePolicyForObligation` 只回传目前的
  Active 一笔，`listInsurancePolicyHistoryForObligation` 回传全部
  （含历史），按 PolicyStartDate 新到旧排序。
- **Event 决定**：没有新增任何 event family，沿用既有 Obligation
  event。

---

## E. UI

`945_OperatorConsole.html`：
- Add Bill 表单新增 `ob_insuranceFields`（Insurance Company/Policy
  Number/Coverage Type/Coverage Amount/Policy Start/Expiry Date），
  由 `ob_category` 的 change listener 控制显示/隐藏（比照既有
  `ob_customIntervalField` 的做法）。
- `submitAddBill` 改成两段式：先 `console_createObligation`，若
  Category 是 Insurance 且成功，再用回传的 obligationId 呼叫
  `console_createInsurancePolicy`——Policy 那步失败不会让已经建立的
  Obligation 消失，会明确提示"Bill added, but the policy details
  failed to save"，不是静默吞掉。
- Occurrence 卡片新增 Policy 按钮（仅 `item.category==='Insurance'`
  显示），点击展开面板显示目前保单，Renew 按钮展开可编辑表单（保险
  公司/Coverage 预填，New Start Date 预设为目前 Expiry 隔天），Save
  Renewal 呼叫 `console_renewInsurancePolicy`。

---

## F. Tests

| Category | Result |
|---|---|
| Syntax（8 份被编辑档案 `node -c` / 抽出 945 script） | **PASS**，全部通过 |
| Local execution（既有 DLP 四套：918/947/948_search/948_rectification，与新代码共用 900/901/902） | **PASS** — 163/22/29/27，零回归 |
| Contract tests | 不适用——本次新函式没有对应的 contract-level 测试档案 |
| GAS-only tests（912/913 自己的 990-996 套件） | **未执行**——跟上一轮 BL-21 相同原因：这套测试设计上就是要贴进真实 Apps Script 项目跑，Node 沙箱版本已被移除，不是这次环境限制造成 |
| Real GAS verification | **PENDING** |

---

## G. Governance

- `00_Review_History.js`：REVIEW-010 追记 CONDITIONS RESOLVED + 实作
  完成记录。
- `00_Product_Backlog.js`：BL-2 状态更新为 `IMPLEMENTED — LOCAL
  SYNTAX CHECKED ONLY — GAS VERIFICATION PENDING`，全部历史文字保留。
- `00_Project_State.js`：CHANGELOG 新增 2026-09-20（八）。
- ADR：**未修改**——本次没有新的架构决定需要记录，REVIEW-010 已经
  处理过架构层级的问题。

---

## H. Production Code

**Files changed**：`901_PropertySchema.js`、`900_PropertyConfig.js`、
`902_PropertyIdentity.js`、`912_ObligationEngine.js`、
`946_OperatorConsoleServer.js`、`945_OperatorConsole.html`（加上
三份治理档案）。

**Files NOT changed**（SHA-256 核对）：`913_ObligationScheduler.js`、
`903_PropertyEventDefinitions.js`、`918_DefectEngine.js`、
`911_DocumentEngine.js`、`922_DashboardAdapter.js`、
`947_DlpConsoleServer.js`、`948_MobileConsole.html`、
`appsscript.json`、`00_ADR_Log.js`、`00_Business_Rules.js`、
`00_Project_Constitution.js`、`PropertyOS_DomainModel.md`。

---

## I. Pending Real Verification

- Real GAS execution：`createInsurancePolicy`/`renewInsurancePolicy`
  从未在真实 GAS 环境跑过——`ensureSheetSchema_` 会不会正确建出新
  Sheet、`appendRow`/`updateRowFields_` 的实际写入行为，都待确认。
- Real Sheets：`PropertyInsurancePolicies` 这张新 Sheet 需要在真实
  Google Sheets 里被正确建立。
- Real UI：Add Bill 表单的两段式提交、Policy 面板的续保流程，都需要
  真的在浏览器里点一次。
- Real-device：不适用（945 是桌面 Sidebar）。

---

## J. Outstanding

1. **911 Document 整合仍未实作**——需要一个独立、单独授权的小型 911
   扩充（让 `RelatedEntityType`/`RelatedEntityID` 成为
   `relatedCaseId` 的替代路径），不是这次任务能顺手做的事。
2. Constitution/File_Map 的 `920_InsuranceEngine` 条目与这次实作的
   卫星设计仍然平行存在、没有互相 cross-reference——REVIEW-010 记录
   了这个发现，条件 1 决定"不等 920"，但两份文件本身的文字没有更新，
   留给日后的治理任务处理。
3. Reminder delivery（ReminderConnector 缺口）——跟本次无关，沿用
   既有记录。
4. `00_File_Map.js` 的"见 CHECKPOINT_2026-09-16"——跟本次无关，沿用
   不处理。

---

## K. Final Status

**BL-2 INSURANCE IMPLEMENTATION COMPLETE — LOCAL VERIFICATION ONLY**
