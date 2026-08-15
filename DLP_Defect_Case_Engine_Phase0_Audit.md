# DLP Defect Case & Rectification Tracking — Phase 0 Audit
### （Audit → Design，尚未写任何 Runtime 代码，等待 Review Approval）

**审查范围：** `50.Property-main`（zip，2026-08-08）完整 41 个文件
**方法：** 逐一读取全部治理文件（Constitution / ADR Log / File Map / Business Rules / Domain Model / Project State / Product Backlog / Review History）、Foundation 层（900-903）全文、910_PropertyAssetEngine 全文、912_ObligationEngine 核心 Command、913_ObligationScheduler 全文、922_DashboardAdapter 全文、945/946 Operator Console

---

## 0. 摘要：需要你决定的事项

**status: 5/6 CONFIRMED（2026-08-15，CC Review）。第 6 项是唯一还没解决、会阻塞 Phase 1 开工的问题。**

| # | 问题 | 决定 | 章节 |
|---|---|---|---|
| 1 | 新模块用几号？| ✅ CONFIRMED — 单一文件 `918_DefectEngine.js`，`CaseType` 栏位留扩展口，不另开通用 Case Engine | §3.1 |
| 2 | Evidence 怎么做？| ✅ CONFIRMED — 提前实现 `911_DocumentEngine.js` 最小版 | §3.2 |
| 3 | RectificationEvent 拆不拆？| ✅ CONFIRMED，且设计更新——单表、append-only、`EventType` 枚举驱动（不是我原先设想的"一列多个可选日期栏位"）| §4.5（已改写） |
| 4 | Timeline 怎么存？| ✅ CONFIRMED — 新建 append-only `PropertyCaseTimeline` | §5 / §6 |
| 5 | `Property.Developer`/`DefectExpiry` 要不要在 Case 重复存？| ✅ CONFIRMED — 不重复存 | §4.1 |
| 6 | **PropertyName 现在到底怎么填？**| ⏳ **待你回答**（我没有真实数据可查，见 §4.0）| §4.0（新增） |

第 6 项解决后，我就照 Implementation Order 从 Phase 1 开始动手。

---

## 1. Current Architecture Audit（现状）

### 1.1 文件结构与号段

```
0 Governance   00_*.js（不推送到真实 GAS，见 .claspignore）
1 Foundation   900-909  → 900/901/902/903 已完成，904/905 Deferred/Planned
2 Runtime      910-929  → 910(Property✓) 912/913(Obligation✓) 922(Dashboard✓)
                          911(Document) 914(Finance) 915-921 全部 Planned/未建
3 Intelligence 930-939  → 全部 Planned
4 Integration  940-949  → 945/946(Operator Console✓) 其余 Planned
5 Testing      990-999  → GAS-native，990-996 已完成 141/141
```

**关键发现：`918_DefectEngine`（VP/Defect Liability Period 追踪）与 `911_DocumentEngine`（Evidence 附件来源）两个号段，File Map 里已经预留、且用途描述跟这次要做的事几乎完全对上。** 这不是巧合——00_Project_Constitution.js §4/§7 与 PropertyOS_DomainModel.md 的 ERD 里，`Defect` 早就被画成 `Property` 的子节点、由 `Defect Engine` 拥有。也就是说，这次要做的不是"额外加一个模块"，而是把架构里本来就空着的两格填上。

**已完成、可信赖的模式（910/912/913/922/945/946 共同验证过）：**
- 单层 top-level Lock（`withXLock_(fn)`，`LockService.getScriptLock().tryLock(30000)`，`finally` 里 `SpreadsheetApp.flush()` 再 `releaseLock()`）——严禁嵌套锁
- ClientRequestID 幂等（CacheService，1 小时 TTL）用于 Create 类 Command；自然主键幂等（如 `EffectiveDue`）用于其他
- State Machine：显式 transitions map + `assertXTransition_`，反向转移刻意不放进 map、只能靠专属的 Reverse Command 触发
- Truth 写入用 `appendRow()` / `ensureSheetSchema_` 建表；Truth 写入后的步骤失败要用 `logXPartialFailure_` 大声记录并重新抛出，不假装 Sheets 有事务
- 事件一律经 `publishPropertyEvent_(eventType, propertyId, obligationId, payload)`——不适用的位置直接传 `null`（910 的 `PROPERTY_CREATED` 就是这样做的），不需要改这个函式的签名
- Dashboard/Projection 不是独立存储，是"呼叫既有 Query 函式 + 组合 + enrich" 的组合层（922 的两个函式是范本）
- Sidebar/Console 层（946）永远是 thin wrapper：`console_wrap_(fn)` 统一 try/catch，业务逻辑 100% 留在 Domain 层

**现状的几个治理性落差（不是我制造的，但趁这次一并指出，属于 Constitution P6 Documentation Drift 规则要求的报告义务）：**
- `00_File_Map.js` 顶部的 "CURRENT DEPLOYMENT MANIFEST" 停在 2026-07-29，没有列入 922/945/946，也没列入 912/919 的 Node-only 测试文件（这些经 `.claspignore` 确认不会推送到真实 GAS，只是同一个资料夹里的本地对照组，不是誤留）
- `00_Project_State.js` 的 CHANGELOG 最新一条是 2026-07-29 (p)（Operator Console 第一天使用回馈），但 910 的 `withPropertyLock_` 注释、901 的 `ensureSheetSchema_` 注释都提到了两个更晚发生的真实 bug 修复（跨 execution flush 一致性、per-execution schema cache 解超时）——这两个修复已经在代码里，但 CHANGELOG 没有对应条目
- 建议在这次 Phase 12（Documentation）一并补上，不需要现在处理，先记录在案

### 1.2 逐项检查（对照你要求的 10 项）

| 检查项 | 现状 |
|---|---|
| Property/PropertyAsset 数据模型 | `Property` 已完整（910），有 `Developer`、`DefectExpiry`、`VPDate` 栏位——这次可直接引用，不需重建 |
| Repository/Data Access 层 | **没有独立命名的 "Repository"**。901_PropertySchema.js 提供共用的行级 I/O 工具（`readRowAsObject_`/`objectToRowArray_`/`findRowIndexByFirstColumn_`/`updateRowFields_`），各 Engine 直接调用，这就是事实上的 Repository 层 |
| Event/Timeline 机制 | Event 有（903，UPPER_SNAKE_CASE），但 **`publishPropertyEvent_` 目前只是 `Logger.log()` 占位（ADR-P07 刻意设计），不是持久化、可查询的存储**。真正可查询的历史目前只有 `ObligationHistory`（append-only 表）。**没有 Timeline 功能** |
| Evidence/Document/Attachment 机制 | 只有 `ObligationOccurrence.Evidence` 一个自由文本栏位（"string, DocumentID, optional"），不是真正的 Evidence 实体。`911_DocumentEngine` 只是 File Map 里的规划，未实现。**没有 Drive 集成（`DriveApp` 零引用）** |
| Archive/Data Management 机制 | **不存在**。`PROPERTY_STATUSES` 只有 `Active`/`Sold`，注释明确写"No Draft/Archived"。Archive ≠ Delete 目前只是 Constitution 里的原则宣示，没有对应实现 |
| Projection/Read Model 机制 | 有，`922_DashboardAdapter.js`，模式是"组合既有 Query + enrich"，不是独立存储（ADR-P14 定义） |
| Sidebar/HtmlService UI | 有，`945_OperatorConsole.html` + `946_OperatorConsoleServer.js`，Tab 式单页应用，`google.script.run.withSuccessHandler()` 呼叫 `console_*` thin wrapper。**没有 `doGet()`，目前无法作为独立网址在手机浏览器打开**——只能从已打开的 Google Sheet 里叫出 Sidebar |
| ID/timestamp/audit log/status 规范 | `<PREFIX>-<timestamp36>-<random4>`（902），`DEFECT-` 前缀**已经保留**（900_PropertyConfig.ID_PREFIXES 和 Constitution §6 都列了，只是没人用过）。日期一律 ISO 字串 + `parseIsoDate_`/`toIsoDate_` 本地时区处理，避免 UTC 位移 bug |
| UEF/Blueprint/Constitution/ADR/Governance | Constitution v0.4（P1-P12）、ADR-P01~P14、Domain Model v0.1 全部读完，见 §6 |

### 1.3 特别检查：可复用的既有基础能力

| 你要求检查的 | 结果 |
|---|---|
| Case | **不存在**（`case` 关键字只出现在 913 的 `switch` 语句里，不是领域概念） |
| Issue / Task | 不存在 |
| Event | 存在但只是占位 Adapter，见上 |
| Evidence | 只有一个字符串栏位，非实体，见上 |
| Document | 只在文档中规划（911），未建 |
| Timeline | **不存在** |
| Status | 存在但是各 Engine 自己的枚举，没有跨 Engine 通用 Status 概念 |
| Property | 完整可用（910） |
| Contact / Contractor | **不存在**。Product Backlog BL-3 有一个 `PropertyManagementContact`/`PropertyManagementPhone` 的设计草图，但那是"管理处联络方式"，跟这次要记录的"维修承包商"是不同概念，不要混用 |
| Reminder | 只有"发布 REMINDER_REQUESTED 事件"的能力（913），没有 Reminder 实体本身（那是 Reminder OS 的范围，ADR-P02） |
| Projection | 存在，见上 |

**结论：除了 Property（可直接引用）跟 ID/日期/Lock/Event 这些 Foundation 工具，你列的清单里几乎没有能直接搬过来用的现成模块。** 这不是坏消息——File Map 早就把 911/918 空出来等这一天，说明架构本身没有阻力，只是还没人填。

---

## 2. Reusable Components（直接复用，不新建/不修改）

- `propertyError_`、`toIsoDate_`/`toIsoDateTime_`/`parseIsoDate_`/`coerceToIsoDateString_`、`readRowAsObject_`/`objectToRowArray_`/`findRowIndexByFirstColumn_`/`updateRowFields_`、`ensureSheetSchema_`（901）
- `generateId_`、`assertIdPrefix_`（902）——新增的 ID 类型只需要新增对应 `generateXId_()` 一行函式
- `publishPropertyEvent_`、`buildPropertyEvent_`（903）——**不修改签名**，`obligationId` 位置传 `null`
- `getProperty`、`propertyExists_`、`listActiveProperties`（910）——Case 建立时验证 PropertyID、显示时读 PropertyName/Developer/DefectExpiry
- `console_wrap_`、`showOperatorConsole`/`onOpen`（946）——Sidebar 新分頁沿用同一套
- 990_TestKit.js 的 `makeGasTestSuite_`（assert/report 风格）——新测试文件沿用同样写法
- Constitution 的 Coding Standards（appendRow-only、单层 Lock、snapshot 幂等键、私有函式底线结尾）——直接套用，不重新论证

---

## 3. New Components Required（需要新增）

### 3.1 决策点 1 — Case 模块怎么切

**问题：** 这次要做的不只是"Defect"，而是"Defect Case"——一个 Case 底下有多个 Defect、多次 Daily Check、多轮 Correspondence、多次 Rectification。File Map 只留了 `918_DefectEngine`（单一 Aggregate 的量级描述），没有专门给"Case"这个更上层概念留位置。

**Option A（我的建议）：** 单一文件 `918_DefectEngine.js`，内部两层结构：
- `PropertyCase`（Aggregate Root，含 `CaseType` 栏位，目前只有 `'DLP'` 一个值，为未来其他类型 Property Case 留门但不现在做）
- `DefectItem` / `DailyProgressCheck` / `Correspondence` / `RectificationEvent` / `SecondaryDamage`（`PropertyCase` 的内部 Entity，透过 Case 的 Command 建立，不可脱离 Case 单独存在——跟 `ObligationOccurrence` 之于 `ObligationRule` 完全同一个模式）

**Option B：** 拆成两个引擎——通用 `PropertyCaseEngine`（新号，例如 906）只管 Case 生命周期与 Timeline，`918_DefectEngine` 只管 DLP 专属的 Defect 细节，两者透过 CaseID 关联。

**为什么建议 A，不建议 B：** Property OS 目前每一个"抽象化"的决定都遵守同一条纪律——UEF 的 Candidate Pattern 机制要求"两个独立专案的证据"才能把一个模式提升为正式规范（ADR-P10/P12/P13 都引用了这条）。现在只有 DLP 这一个 Case 类型的真实需求，B 方案等于在只有一个例子的情况下就先把"通用 Case 引擎"这个抽象独立出来，这正是 Constitution 反复强调要避免的 Speculative Design。A 方案用 `CaseType` 栏位留了后路（哪天真的出现第二种 Property Case，再决定要不要拆分——这是 Additive 变更，不是破坏性重构），风险更低、也更符合你自己在 Product Backlog 里对 BL-1~BL-3 的一貫处理方式。

**如果你选 B**，我会照 B 重新画 §4 的 Data Model，不影响其他章节的结论。

### 3.2 决策点 2 — Evidence 怎么做

**问题：** 二十六项要求里，Evidence 是唯一一个"必须新建、但完全没有地基"的部分——connect 到 Drive、维护 metadata、被多种实体引用。

**建议：** 直接实现 `911_DocumentEngine.js`（File Map 已保留此号，用途描述本来就是"Evidence 附件来源"），但**只做这次会用到的范围**（Attach/Get/List by related entity），不做完整的"Document Library"（那是 Phase 3 原本的完整规划，例如 PII 文件管理、Metadata 搜索——这些不在这次范围内，Constitution §9 提到的 PII 存取限制这次也用不到，DLP 证据主要是照片/邮件/报告，不是身份证副本）。

**理由：** 复用 `DOC-` 这个已经保留的 ID 前缀；把 Evidence 放在 Runtime 层（910-929）而非塞进 918 内部，是因为 File Map 自己的依赖图早就写明 "911 Called By: 912 (Evidence)"——即 911 从一开始就被设计成给多个 Engine 共用的能力，不是 DLP 专属的。这次先实现最小可用版本，比"名义上等 Phase 3 才做，实际上又不得不在 918 里山寨一个小型 Evidence 系统"更符合 P4（Composition over Duplication）跟你自己在任务书里明写的"不要自行创造第二套 Evidence architecture"。

### 3.3 需要新增的具体文件

| 文件 | 层 | 内容 |
|---|---|---|
| `911_DocumentEngine.js` | Runtime | Evidence 实体 + Drive Adapter（单一函式知道 `DriveApp` 细节，比照 ADR-P07） |
| `918_DefectEngine.js` | Runtime | PropertyCase + 5 个内部 Entity + Command + Query |
| `922_DashboardAdapter.js`（**修改**，非新建）| Runtime | 新增 `getDlpCaseDashboard()` / `getCaseTimeline()` |
| `903_PropertyEventDefinitions.js`（**修改**）| Foundation | 新增 10 个 Event 类型 + required fields，签名不变 |
| `900_PropertyConfig.js`（**修改**）| Foundation | 新增 ID_PREFIXES / SHEET_NAMES / 各枚举值，皆为 Additive |
| `945_OperatorConsole.html` + `946_OperatorConsoleServer.js`（**修改**）| Integration | 新增 "DLP" Tab + `console_dlp_*` wrapper |
| （Phase 9 起）新的 HtmlService Web App | Integration | 独立网址、手机优先，Phase 8 完成后再细化 UI 稿 |
| `997_Tests_DlpDefectEngine.js` | Testing | GAS-native，沿用 990 风格 |

---

## 4. Data Model

> 命名依 Constitution §6：Sheet 用 PascalCase 复数（或 History/Ledger 类的集合名词单数），私有函式底线结尾，Entity ID 前缀集中在 900_PropertyConfig.ID_PREFIXES。

### 4.1 `PropertyCase`（Aggregate Root，Sheet: `PropertyCases`，前缀 `CASE-`）

```
CaseID              string PK, CASE-
PropertyID          string FK -> Property
UnitLabel           string, optional（见下方说明）
CaseType            enum, 目前只有 'DLP'
CaseTitle           string
ManagementOffice    string, optional（管理处名称，纯文字，不等 BL-3 做完）
DlpStartDate        ISO date
OriginalSubmissionDate    ISO date
OriginalSubmissionSource  string
OriginalDefectCount       number（原始申报数量的静态快照，不等于 DefectItem 笔数）
Status              enum: Open / InProgress / Closed
CreatedAt / UpdatedAt
```

**两处刻意不照你原始清单的地方，需要你确认：**
1. **不存 `Developer`**：`Property` 表已经有 `Developer` 栏位。显示 Case 时直接 `getProperty(propertyId).Developer` 读取，不在 Case 上重复存一份——两份真相如果不同步会比对不上。如果你遇到过"这个 Case 的负责方跟 Property 登记的 Developer 不是同一间公司"的情况，请告诉我，我会改成允许 Case 层级覆写。
2. **不存 `DlpEndDate`**：`Property` 已有 `DefectExpiry` 栏位，语意就是 DLP 到期日。同样直接读取，不重复存。
3. **`UnitID`**：你的真实案例是 Property=`EST8`、Unit=`A-19-11`。这里有个需要你确认的前提问题——**你现有 Property OS 里，这个单位的 `Property` 记录，`PropertyName` 填的是"EST8"（整个发展项目）还是已经是"EST8 A-19-11"（这一户）？** 如果后者，`UnitLabel` 就是多余栏位，可以拿掉；如果前者，`UnitLabel` 就有必要保留，作为 Case 层级的补充资讯。我先按"保留但可留空"的保守做法设计，等你确认后再调整。

### 4.2 `DefectItem`（Case 内部 Entity，Sheet: `DefectItems`，复用既有前缀 `DEFECT-`）

```
DefectID                      string PK, DEFECT-
CaseID                        string FK -> PropertyCase
OriginalReference             string（原始编号，如 "88"）
Category                      enum（草案，见下方）
Location                      string
Description                   string
Priority                      enum: Critical / High / Medium / Low
Status                        enum: Open / InProgress / PendingVerification / Verified / Closed
DeveloperStatus                enum: Pending / Scheduled / InProgress / ClaimedCompleted
OwnerVerificationStatus        enum: NotChecked / Verified / FailedVerification / PartiallyVerified
SubmittedAt                   ISO date
RectificationStartDate        ISO date, optional
DeveloperClaimedCompletedDate ISO date, optional
OwnerVerifiedDate             ISO date, optional
ClosedDate                    ISO date, optional
CreatedAt / UpdatedAt
```

**Category 草案枚举**（你任务书没给完整清单，我先按常见 DLP 缺陷类型起草，Additive，之后随时可加）：
`Structural / Waterproofing / Plumbing / Electrical / AirConditioning / Carpentry / Painting / Ironmongery / Appliance / Flooring / Other`

**关于三个 Status 栏位如何互动（这是这次设计里唯一真正"新"的模式，之前系统里没有先例，需要你明确确认）：**

Property OS 目前所有的 State Machine（`ObligationRule`/`ObligationOccurrence`/`Property`）都是"一个终态、只能靠专属 Reverse Command 逆转"的单一 Status 模式。你这次要求的 `DeveloperStatus` 跟 `OwnerVerificationStatus` 是**两条完全独立、可以互相"矛盾"共存的状态轴**，不套用旧模式。我的处理方式：
- `DeveloperStatus` 和 `OwnerVerificationStatus` 各自有自己的 transitions map、各自的 `assertXTransition_`，两个 Command（`recordDeveloperStatus` / `recordOwnerVerification`）互不覆写对方栏位
- `OwnerVerificationStatus` **不是**单向终态——`FailedVerification` 之后可以再被重新检查（Developer 重新处理后再次 verify），所以它更接近"目前的评估结果"而非"一旦到达就不可逆的终点"
- `DefectItem.Status`（总览用）才是比较接近旧模式的"终态"栏位——只有当 `OwnerVerificationStatus = Verified` 时才允许 Command 把 `Status` 推进到 `Closed`；`Closed` 之后如需重开，需要一个明确的 `reopenDefectItem` Command（比照 `reversePropertySale` 的精神：不放进通用 transitions map，只能靠这个专属函式）
- 每一次 `DeveloperStatus`/`OwnerVerificationStatus`/`Status` 的变更，都各自写一行 `PropertyCaseTimeline`（见 §4.6），保留完整轨迹——这满足 Domain Model §5 Global Invariant #4"终态变更需要新记录"的稽核精神，即使 Owner Verification 本身不是严格终态

### 4.3 `DailyProgressCheck`（Sheet: `DailyProgressChecks`，前缀 `CHECK-`）

```
CheckID                          string PK, CHECK-
CaseID                           string FK
DateTime                         ISO datetime
CheckedBy                        string
AccessObserved                   boolean
ContractorObserved                boolean
DeveloperRepresentativeObserved   boolean
WorkObserved                     string, optional（自由文字，快速记录场景用不到就留空）
GeneralStatus                    string, optional
Notes                            string, optional
CreatedAt
```

Evidence 不在这张表上存 ID 清单（见 §4.7 的理由），而是由 Evidence 记录反向关联回来。

### 4.4 `Correspondence`（Sheet: `Correspondences`，前缀 `CORR-`）

```
CorrespondenceID    string PK, CORR-
CaseID              string FK
Date                ISO date
Direction           enum: Sent / Received
Sender              string
Recipient           string
Subject             string
ResponseStatus       enum: Pending / PartiallyAnswered / Answered / Rejected / NotedOnly
ResponseRequestedDate  ISO date, optional
ResponseDueDate        ISO date, optional（见下方 Working Day 计算）
ResponseReceivedDate   ISO date, optional
CreatedAt / UpdatedAt
```

**Response Due Date 计算：** 新增一个 `addWorkingDays_(date, n)` 纯函式（周六日不计入，暂不处理马来西亚公共假期——你任务书没要求，先按 Speculative Design 原则不预先做，需要的话之后再加）。这个函式先放在 918 自己的文件里（目前只有这一个消费者），不预先塞进 901 共用层——等真的有第二个地方要用到"工作日"概念时，再比照 UEF 的 Candidate Pattern 精神移过去，不提前搬。

### 4.5 `RectificationEvent`（决策点 3，见下）（Sheet: `RectificationEvents`，前缀 `RECT-`）

**问题：** 你的任务书 §十（Before/During/After）、§十一（Contractor Access）、§十四（Rectification Schedule）、§十五（Reinspection）描述的其实是同一个"一次现场处理"的不同切面。如果严格拆开会变成 Access Event（到访层级）+ Rectification Event（单一 defect 层级）两张表，一次多个 defect 的处理会需要跨表关联。

**建议（Phase 1 先合并）：**

```
RectificationEventID    string PK, RECT-
CaseID                  string FK
DefectID                string FK, optional（null = 案件层级的一般到访，未绑定单一 defect）
Date                    ISO date
EntryTime / ExitTime    string, optional
ContractorCompany       string
ContractorPersonnel     string
Purpose                 string
AreaAccessed            string
Source                  enum: DeveloperProvided / OwnerObserved
InspectionDate / EstimatedRepairDate / ExpectedCompletionDate / ReinspectionDate   ISO date, optional
ConditionBeforeNotes / ConditionDuringNotes / ConditionAfterNotes   string, optional
CreatedAt / UpdatedAt
```

一次到访处理多个 defect 时，允许建立多笔 `RectificationEvent`（`ContractorCompany`/`EntryTime` 等到访层级栏位会重复）——这是刻意的、有纪录的取舍：先用真实案例跑一段时间，如果重复到访栏位这件事真的造成困扰（例如你发现自己常常要为同一次到访填五次一样的 Contractor 资讯），再拆成 AccessEvent + RectificationEvent 两张表，这本身就是 Additive 重构，不是推翻重来。这个做法直接对应你们自己在 Product Backlog 结尾写的那句话——"新实体+新 Command，仍建议先走一次精简版设计再动手，避免像 Operator Console 那样实战后才发现设计缺口"，但反过来也说明：**不需要在还没有真实使用数据之前，就把设计做到完美对称**。

Before/During/After 的照片本身不存在这张表上，而是 Evidence 记录带一个 `Phase` 标签（见 §4.7）。

### 4.6 `SecondaryDamage`（Sheet: `SecondaryDamages`，前缀 `DMG-`）

```
DamageID                        string PK, DMG-
CaseID                          string FK
ParentDefectID                  string FK, optional
RectificationEventID            string FK, optional
DamageType                      enum: Cabinet / Flooring / Wall / Door / Ironmongery / Appliance / Other
Description                     string
ObservedDate                    ISO date
ObservedBy                      string
ResponsibleParty                string, optional（纯记录用途，不是法律判断——见下方安全说明）
Status                          enum: Reported / Acknowledged / Rectified / Disputed
Resolution                      string, optional
AdministrativeSubmissionRequired  boolean
SeparateSubmissionID             string, optional
DlpPrejudiceStatus               string, optional（纯文字标记，如 "Noted"/"Disputed"，不是系统判断结果）
ContractualBasis                 string, optional（纯参考文字）
CreatedAt / UpdatedAt
```

`ResponsibleParty`/`DlpPrejudiceStatus`/`ContractualBasis` 三个栏位都设计成**中性的自由文字记录**，系统本身不做任何法律责任的推断或判断——这既是你任务书 §六 的明确要求，也符合 Constitution §10 AI Development Rules"Decision/Tax Engine 输出须标注仅供参考"的精神（虽然这里不是 AI 生成，但同一个谨慎原则适用）。

### 4.7 `Evidence`（911_DocumentEngine 拥有，Sheet: `Evidence`，前缀复用 `DOC-`）

```
EvidenceID          string PK, DOC-
EvidenceType         enum: Photo / Video / Email / PDF / WhatsAppScreenshot /
                     DeveloperReport / ContractorReport / InspectionReport /
                     MobileAppSubmissionProof / Other
DriveFileID          string
CapturedAt           ISO datetime, optional
UploadedAt           ISO datetime
Source               string
Description           string, optional
Phase                enum: Before / During / After / NotApplicable
RelatedCaseID         string FK, required
RelatedDefectID       string FK, optional
RelatedEntityType     enum, optional: DailyProgressCheck / Correspondence / RectificationEvent / SecondaryDamage
RelatedEntityID       string, optional
CreatedAt
```

这里跟你任务书字面的"Related_Case_ID, Related_Defect_ID, Related_Event_ID"三栏位略有不同——我把最后一个拆成 `RelatedEntityType` + `RelatedEntityID` 一对，因为一个证据可能连到五种不同的表，与其开五个各自独立的 nullable FK 栏位，不如用一对通用栏位。`RelatedCaseID` 必填（任何证据都属于某个 Case），其余都是可选的进一步定位。**这是 Property OS 目前没有先例的模式**（Address/Phone 都是拆成明确具名栏位，不是通用 key-value）——如果你比较想要五个具名栏位以保持跟既有风格一致，我可以照办，只是栏位数量会变多。

**Evidence 反向不知道谁引用了自己**（比照 Domain Model 里"Document 本身不知道自己被哪些 Occurrence 引用，避免反向依赖"的既有原则）——`DailyProgressCheck`/`Correspondence`/`RectificationEvent`/`SecondaryDamage` 都不存 EvidenceID 清单，全部靠 Evidence 表自己的 `RelatedEntityType`/`RelatedEntityID` 反查，也避免了"结构化资料塞进单一栏位当 JSON 存"这个 Product Backlog BL-3 明确排除的反模式。

**Drive 集成：** 单一 Adapter 函式（例如 `saveEvidenceFile_()`）是唯一知道 `DriveApp` 细节的地方，比照 ADR-P07/P11 的 Infrastructure Adapter 原则——哪天要换存储位置或加密方式，只改这一个函式。默认建立在私有资料夹，不产生公开分享连结（比照 Constitution §9 对 PII 文件的谨慎精神，即使 DLP 证据的敏感度通常较低）。

### 4.8 `PropertyCaseTimeline`（决策点 4，见下）（Sheet: `PropertyCaseTimeline`，前缀 `TLE-`）

**为什么需要一张新的持久化表，而不是"重放 EventBus"：** 我逐字读过 903_PropertyEventDefinitions.js——`publishPropertyEvent_()` 目前的函式本体就是 `Logger.log(...)`，这是 ADR-P07 刻意的占位设计，**不是**一个真正持久化、可以之后查询回放的事件存储。Constitution §7 Data Ownership 表写"Audit Trail = EventBus 持久化事件日志 ＋ ObligationHistory"，但实际上今天只有后半句是真的。如果 Timeline 功能建立在"以为 EventBus 会把历史存下来"的假设上，你手机上打开 Case 页面时会看到一片空白。

**做法：** 比照 `ObligationHistory` 的既有先例（append-only，Constitution P10 / ADR-P06 明文规定不可 UPDATE/DELETE），新增一张通用的 Case 活动日志表：

```
TimelineEntryID    string PK, TLE-
CaseID             string FK
EntryType           string（与新增的 PROPERTY_EVENTS 类型对应，如 'DAILY_CHECK_LOGGED'）
OccurredAt          ISO datetime
Summary             string（人类可读的一行摘要，UI 直接显示用）
RelatedDefectID      string, optional
RelatedEntityType / RelatedEntityID   optional
TriggeredBy          string（哪个 Command 产生的）
CreatedAt
```

每个会改变 Case/Defect 状态的 Command，在写入自己的 Truth 表**之后**、发布 `publishPropertyEvent_` 的同一个 try 区块里，多加一行 `appendCaseTimelineEntry_(...)`——两者一起失败就一起被 `logPartialFailure_` 记录，模式跟 912 的 `appendObligationHistory_` 完全一致，不是新发明。

Dashboard 需要的**数字**（Open Defects: 7 之类）不经过这张表，直接对 `DefectItems` 做 `Status` 分组统计（比照 922 的既有模式），只有**时间序列的活动清单**（Timeline UI）才读这张表。

---

## 5. Event Model（新增到 903_PropertyEventDefinitions.js，Additive-only）

不修改 `publishPropertyEvent_` 签名，`obligationId` 位置一律传 `null`。

| Event | Required fields（Event Completeness Principle，ADR-P13） |
|---|---|
| `CASE_CREATED` | caseId, propertyId, caseType, status |
| `DEFECT_ITEM_ADDED` | caseId, defectId, category, priority |
| `DAILY_CHECK_LOGGED` | caseId, checkId, dateTime, accessObserved |
| `EVIDENCE_ATTACHED` | evidenceId, evidenceType, relatedCaseId |
| `CORRESPONDENCE_LOGGED` | caseId, correspondenceId, direction, subject |
| `RECTIFICATION_EVENT_LOGGED` | caseId, rectificationEventId, date |
| `DEVELOPER_STATUS_UPDATED` | caseId, defectId, developerStatus |
| `OWNER_VERIFICATION_RECORDED` | caseId, defectId, ownerVerificationStatus |
| `SECONDARY_DAMAGE_LOGGED` | caseId, damageId, damageType |
| `CASE_CLOSED` | caseId, closedDate |

---

## 6. Projection Model（922_DashboardAdapter.js 新增两个函式，模式与既有的 `getDashboardSnapshot`/`getMonthlyExpenseSummary` 一致）

- `getDlpCaseDashboard(caseId)` — 一次性打包：各 Status 的 Defect 计数、Overdue Correspondence（Lazy Computation，比照 `isOccurrenceOverdue_` 的模式，查询时用 `addWorkingDays_` 现算，不落库）、即将到来的 Rectification/Reinspection 日期、Secondary Damage 计数、最近 N 条 Timeline
- `getCaseTimeline(caseId, limit)` — 读 `PropertyCaseTimeline`，按 `OccurredAt` 倒序
- `enrichDefectForDisplay_(defect)` — 比照 `enrichOccurrenceForDisplay_`，join Case/Property 显示用栏位

---

## 7. Web UI Structure

**Sidebar（945/946，修改）：** 新增一个 "DLP" Tab，沿用既有 `data-view`/`.view.active` 切换模式，新增 `console_dlp_*` thin wrapper（可以直接加进 946，或另开 947_DlpConsoleServer.js 避免 946 过度膨胀——946 目前 106 行，加上 DLP 大概会到 300+ 行，我倾向另开新文件，但这是次要决定，等 Phase 9 再定）。

**独立 Mobile Web Console（新增，Phase 9）：** 目前项目**完全没有 `doGet()`**，也就是说现在唯一的 UI 入口必须先打开 Google Sheet 才能叫出 Sidebar，没有可以直接在手机浏览器打开的网址。这次要新增的 Web App 是真正意义上的新能力，不是重复。后端沿用同一批 Command（跟 Sidebar 共用 918/911/922 的函式），前端是独立的、手机优先的 HTML——UI 细节（Daily Check 的 30-60 秒快速流程）留到 Phase 9 开始时再具体设计，现在只确认架构边界：**两个 UI 层共用同一套 Domain 逻辑，谁都不能各自维护一份业务规则**（你任务书 §二十 的要求，也是 946 文件头自己写的原则）。

---

## 8. File-by-file Implementation Plan（对应你的 Phase 0-12）

| Phase | 文件 | 内容 |
|---|---|---|
| 1 数据模型 | 900（改）/901（改）/902（改） | 新枚举、SHEET_NAMES、ID_PREFIXES、PROPERTY_SCHEMA 条目、generateXId_ 函式 |
| 2 Repository/Service | 918（新）内部 | Sheet accessor + row helper（沿用 901 既有工具，比照 910 的 `propertySheet_()` 模式） |
| 3 Case+Defect 生命周期 | 918（新） | `createPropertyCase` / `addDefectItem` / `updateDefectItem` / `recordDeveloperStatus` / `recordOwnerVerification` / `closeCase` / `reopenDefectItem` |
| 4 Daily Progress Event | 918（新） | `logDailyProgressCheck` |
| 5 Evidence | 911（新） | `attachEvidence` / `getEvidence` / `listEvidenceForEntity` / `saveEvidenceFile_`（Drive Adapter） |
| 6 Correspondence+Deadline | 918（新） | `logCorrespondence` / `recordCorrespondenceResponse`；新增 `addWorkingDays_` |
| 7 Rectification+Reinspection | 918（新） | `logRectificationEvent` / `scheduleReinspection` |
| 8 Projection/Dashboard | 922（改） | `getDlpCaseDashboard` / `getCaseTimeline` / `enrichDefectForDisplay_` |
| 9 Web Console | 新 HTML + doGet | 待 Phase 8 完成后细化 |
| 10 Mobile Daily Check UX | 同上 | 30-60 秒流程 |
| 11 测试 | 997（新） | GAS-native，比照 990 风格，覆盖你 §二十四 列的 20 个场景 |
| 12 文档 | 00_File_Map（改）/00_Project_Constitution §7（改）/PropertyOS_DomainModel（改）/新 DlpDefectEngine_VerticalSlice.md/00_ADR_Log（新增条目）/00_Project_State（changelog） | 见 §9 |

---

## 9. ADR / Governance Impact（Constitution §10 要求的 9 问 Change Impact Analysis）

1. **影响哪些模块？** 900/901/902/903（Additive 修改）、922（新增函式）、945/946（新增 Tab）；新增 911、918
2. **影响哪些 contract？** 无既有 Command/Event 的签名变更；`publishPropertyEvent_` 不变
3. **影响哪些测试？** 不影响既有 141 个测试；新增独立的 997 测试文件
4. **需同步哪些治理文件？** `00_File_Map.js`（918/911 状态从 Planned 改为对应进度，同时借机修正已经过期的 Deployment Manifest）、`00_Project_Constitution.js §7`（新增 PropertyCase/DefectItem/Evidence 的 Owning Engine 行）、`PropertyOS_DomainModel.md`（新增 Aggregate + ERD 边、回答本文件 §6 自己列的检查清单——见下）、新建 `DlpDefectEngine_VerticalSlice.md`（比照 ObligationEngine/PropertyAssetEngine 的既有格式）
5. **是否引入技术债？** 一项，明确记录：RectificationEvent 合并設計（§4.5）在多 defect 同次到访时会重复到访层级栏位，先用真实数据验证再决定是否拆分
6. **是否引入架构漂移？** 不会——Evidence 提前实现（911）是 File Map 自己规划的依赖顺序，不是绕过规划
7. **是否需要 ADR？** 建议新增：**ADR-P15**（Case 模块的号段与切分决策，§3.1 的 Option A/B 选择）、**ADR-P16**（Evidence/911 提前实现的决定，§3.2）
8. **是否影响向后兼容？** 不影响，全部 Additive
9. **是否需要 migration？** 不需要，全部是新 Sheet/新枚举值，没有修改任何既有栏位定义

**对照 PropertyOS_DomainModel.md §6 自己列的检查清单：**
- 新 Entity 属于哪个 Aggregate？→ 新 Aggregate Root `PropertyCase`；`DefectItem`/`DailyProgressCheck`/`Correspondence`/`RectificationEvent`/`SecondaryDamage` 是其内部 Entity；`Evidence` 是独立的轻量 Aggregate（911 拥有）
- 新增跨 Aggregate 关联？→ 全部 ID 引用，不嵌套写入，符合既有原则
- 新 Value Object？→ 不需要，沿用扁平栏位风格（比照 Address/Phone 的既有处理方式）
- 是否违反 §5 Global Invariant？→ 第 4 条（终态不可逆转）在 `OwnerVerificationStatus` 上有意义上的调整，已在 §4.2 明确标注，需要你确认

---

## 10. Risks

| 风险 | 等级 | 说明 |
|---|---|---|
| §3.1 Case 切分方式未决 | 中 | 影响所有后续文件的具体形状，需要你先确认 |
| §4.5 RectificationEvent 合并设计 | 低 | 已记录为已知取舍，非阻塞 |
| Evidence 上传的执行时间 | 低 | 单次 Daily Check 若一次上传大量照片，需注意 GAS 6 分钟上限；v1 先不做批次上传优化，观察真实使用量 |
| Working Day 计算不含马来西亚公共假期 | 低 | 按你任务书字面要求先只做工作日（跳过周末），未来若需要可加假期表 |
| 治理文档滞后（§1.1 已发现的既有落差）| 低 | 与本次工作无直接关系，建议 Phase 12 一并处理 |

---

## 11. Test Plan（对应你 §二十四 的 20 个场景，GAS-native，比照 990/991 风格）

1-20 项逐一对应你列的场景，额外重点：
- 场景 8/9（Developer claim vs Owner fail）：断言 `DeveloperStatus='ClaimedCompleted'` 与 `OwnerVerificationStatus='FailedVerification'` 可以同时成立，且 `DeveloperClaimedCompletedDate` 不因后续 verification 被覆写
- 场景 13（Noted-only 不算 substantive response）：断言 `ResponseStatus='NotedOnly'` 不会被任何自动逻辑升级为 `'Answered'`
- 场景 17/18（Case 何时能关闭）：断言至少一个 `DefectItem.Status != 'Closed'` 时，`closeCase` Command 拒绝执行（新增错误码 `CASE_HAS_OPEN_DEFECTS`）
- 场景 19（Sidebar 与 Web UI 共用后端）：不是自动化测试能完全覆盖的项目，会记录为 Manual Verification Checklist 条目（比照既有 991/MANUAL_VERIFICATION_CHECKLIST.md 的诚实态度，不假装自动化测试能证明这件事）
- 沿用既有的 Lock/Retry/Partial Failure/Duplicate Command 四类 Failure Recovery Verification（ADR-P10 已在本地采用的三大类平台验证之一）

---

*本文件本身不含任何可执行逻辑，是 Phase 0 的设计产出，等待你 Review Approval 后才会开始写 Phase 1 的实际代码。*
