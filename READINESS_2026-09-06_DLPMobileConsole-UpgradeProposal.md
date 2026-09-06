# DLP Mobile Console — Upgrade Proposal / Architecture & Readiness Review

**任务性质**：本文件是分析与建议，不是实施记录。未写代码，未修改 repository 任何档案（918/922/911/947/948/900/901/appsscript.json/ADR/Contract/Backlog 皆未动）。所有结论都以本次实际读取的 repository 内容为准，不是根据记忆或先前报告的转述。
**范围**：只讨论 DLP Mobile Console（948/947）该怎么升级。不重新讨论、不重开 ADR-P24（Desktop Operator Console 的 showModalDialog() 决定）。
**依据**：本次实际读取 — `948_MobileConsole.html`（614行）、`947_DlpConsoleServer.js`（349行）、`DlpMobileConsole_UIContract.md`（254行，CC Final Approval 2026-08-19）、`DlpSidebarTab_UIContract.md`、`appsscript.json`、`00_ADR_Log.js`（ADR-P19/ADR-P24）、`00_Product_Backlog.js`（BL-6/8/9/10/11/12）、`00_Project_State.js`（2026-08-19～09-04 CHANGELOG）、`901_PropertySchema.js`、`900_PropertyConfig.js`、`918_DefectEngine.js`/`922_DashboardAdapter.js`/`911_DocumentEngine.js` 全部函数签名与关键函数本体、`00_File_Map.js`（940-949 Integration band）。

---

## A. Repository Findings

**这是本次核对最重要的一件事，会改变整份任务简报原本的提问角度**：

**Mobile Console 已经是一个独立的 doGet() Web App，不是"要不要升级成 webpage"的开放问题。** `947_DlpConsoleServer.js` 第 33-37 行的 `doGet(e)` 直接把 `948_MobileConsole.html` 当 Web App 页面吐出去；`948_MobileConsole.html` 自己的档头注释写着"standalone doGet() Web App page"；`DlpMobileConsole_UIContract.md` 是这整件事的正式 Contract，CC Final Approval 2026-08-19。这跟 ADR-P24 完全不冲突——**ADR-P24 管的是 Desktop Operator Console（945/946）该用 Sidebar 还是 Modal 还是 Web App，范围明确只限 Desktop**；Mobile 从 Phase 9/10 开始就是另一个、本来就该是 Web App 的独立 surface，两份治理文件管的是两个不同的 host surface，没有互相取代或冲突的关系。

第二个重要修正：`00_Project_State.js` 明确记录 **Phase 9/10（Mobile Web Console）已经在 2026-08-22 完成真机验证、状态是 PRODUCTION-READY**——不是"写完 code 但没验证"。真机验证过程本身就处理过 Case Overview 第一轮真机测试空白的问题，根因是 N+1（140 项 Defect 规模下实测 288 次 Sheets 读取），修复方式是新增 `buildCaseOverviewForMobile_`（922，单次组装，降到 4 次读取），同时补上 `dlp_getCaseOverview` 的 JSON.stringify/parse 防御性修正与前端 10 秒/20 秒 timeout + settled guard——这些修正现在都还在 `948_MobileConsole.html`/`947_DlpConsoleServer.js` 的实际代码里，我读到的就是这个已验证过的版本。

第三个修正，直接影响本次任务简报第 5/12 节问的"DLP Capability 盘点"：**Close Defect / Reopen Defect / Close Case 不是"完全未设计"——Domain 层（`closeDefectItem`/`reopenDefectItem`/`closeCase`，918 第 940/998/1051 行）早就写好了，而且有真实的 state-machine 硬性 gate（`closeDefectItem` 要求 OwnerVerificationStatus 先等于 'Verified'；`reopenDefectItem` 要求必填 reason；`closeCase` 要求 Case 底下每个 Defect 都已 Closed），`local_precheck_test_918.js` 里至少 18 行测试涉及这三个函数。真正"未设计/deferred"的只有 **Console 层的曝光**——947 完全没有 `dlp_closeDefect`/`dlp_reopenDefect`/`dlp_closeCase` 这类 wrapper，Sidebar 和 Mobile 都没有。`DlpSidebarTab_UIContract.md` §15 对这个 deferral 给了完整、经过推演的理由（不是没想过，是想过了决定先不做 UI），这点后面 C/G 节会再细说。

第四，`appsscript.json` 目前的 Web App 设定是 `executeAs: USER_DEPLOYING, access: MYSELF`，对应 Contract §9.3——已经在 2026-08-19 正式核准过：Mobile Console 是个人内部工具，不对外开放，不用 ANYONE / ANYONE_ANONYMOUS。这直接回答了本次任务简报第 11 节问的大部分 Authentication 问题——不是要重新设计，是已经有一个明确、写进 Contract 的答案。

第五，检查了 ADR-P19（DefectItem Schema Consolidation，2026-08-26 APPROVED，ItemID 併入 OriginalReference、Category 变成 fixed enum）——跟这次 Mobile 架构决定无直接关系，纯粹是 schema 层的既有决定，现有 Mobile 显示代码（`categoryText`/`itemId` 处理）已经反映这个决定，不需要额外处理。

---

## B. Current Mobile Console Capability

| Surface | 读/写 | 说明 |
|---|---|---|
| Daily Check | 读+写 | 落地页，Root (`/exec`) 永远进这里。3 个 checkbox + Work Observed + General Status（含快速 chips）+ Notes，`clientRequestId` 幂等保护 |
| Evidence（挂在 Daily Check 上） | 只写 | 存档后才出现的 "+ Add Photo Evidence"，走 `<input capture="environment">` 直接叫手机相机，`evidenceType` 写死 Photo、`phase` 写死 NotApplicable |
| Case Overview | 只读 | `☰` 进入，Dashboard 摘要（Open/Pending/Verified/Closed 计数）+ Defect List（含 itemId/category+subCategory/三个状态 badge/remark/latestEvent，2026-08-30 强化过）+ 近期 Timeline |

**明确不显示（Contract §1 决定）**：Correspondence、Secondary Damage——一个数字都不露，即使 `getDlpCaseDashboard` 本来就顺便带了 `correspondence.overdue`。Defect 卡片本身不可点击、不可展开。没有 Developer Status / Owner Verification 的编辑入口。没有 Rectification Event。

---

## C. DLP Capability Matrix

| Capability | Domain 层（918/911） | Sidebar 曝光（945/947） | Mobile 曝光（948/947）现状 | Mobile 现场需求 | 读/写 | 建议 Phase |
|---|---|---|---|---|---|---|
| Case Overview/Dashboard | `getDlpCaseDashboard` | ✓ | ✓（`buildCaseOverviewForMobile_`，已验证） | 高 | R | 已有 |
| Defect List | `listDefectItemsForCase` | ✓ | ✓（已嵌在 Overview） | 高 | R | 已有 |
| Defect Detail（单笔展开） | `getDefectItem` | ✓（`buildDefectDetailForSidebar_`，含 Rect/Evidence/SecDamage 捆绑） | ✗（卡片不可点） | 高 | R | **MVP** |
| Developer Status 更新 | `recordDeveloperStatus` | ✓ | ✗ | 中 | W | **MVP** |
| Owner Verification | `recordOwnerVerification` | ✓ | ✗ | **最高**——Owner verification 本质就是"人在现场用眼睛确认"，是整个 DLP 领域里最该在手机上做的动作 | W | **MVP，优先级第一** |
| Daily Progress Check | `logDailyProgressCheck` | 不适用（Mobile-only 概念） | ✓ | 核心 | W | 已有 |
| Evidence（挂 Daily Check） | `attachEvidence` | 不适用 | ✓ | 高 | W | 已有 |
| Evidence（直接挂 Defect） | `attachEvidence` | ✓ `dlp_attachDefectEvidence`（完整 EvidenceType/Phase enum） | ✗ | 中高 | W | **MVP** |
| Rectification Event | `logRectificationEvent` | ✓ `dlp_addRectificationEvent` | ✗ | 中——现场看到承包商在场时最有意义 | W | **MVP** |
| Secondary Damage | `logSecondaryDamage`/`updateSecondaryDamageStatus` | ✓ `dlp_addSecondaryDamage`（含 BL-12 三栏位） | ✗ | 中，但栏位多（7 种 damageType + administrativeSubmissionRequired/dlpPrejudiceStatus/contractualBasis）——手机小屏幕填这个容易出错 | W | Future，建议留 Desktop |
| Correspondence（查看） | `listCorrespondenceForCase` | ✓（view-only） | ✗ | 低——本质是办公室/纸本往来的记录 | R | Future，低优先 |
| Correspondence（新增） | `logCorrespondence` 存在于 Domain，但 Sidebar/Mobile 两边 Console 层都没曝光（Contract §1/§10 刻意决定：Phase 1 只列 View） | — | — | — | — | 完全不在范围内——这不是 Mobile 该不该做的问题，Desktop 自己都还没做 |
| Close Defect | `closeDefectItem`（硬 gate：Owner 先 Verified） | ✗（Phase 2 deferred） | ✗ | 低中——关闭是终局动作，即使做了也可能该留给 Desktop 审慎操作 | W | Future，且这是 Desktop/Mobile 共同要面对的决定，不该 Mobile 自己先做 |
| Reopen Defect | `reopenDefectItem`（硬 gate：必填 reason） | ✗（Phase 2） | ✗ | 低 | W | Future，同上 |
| Close Case | `closeCase`（硬 gate：全部 Defect 已 Closed） | ✗（Phase 2） | ✗ | 极低 | W | Future，同上 |

---

## D. Field Use Problem

今天的 948 能让 Owner 在现场记 Daily Check、拍照、浏览案况——但一旦现场看到某个 Defect 需要**状态更新**，尤其是 Owner Verification（这本来就该是最"现场"的动作：人站在那里看承包商修好了没有），Mobile 完全帮不上忙，只能记在脑子里或另外用笔记，回电脑后再到 Sidebar 补做。这正好卡在任务简报自己提的闭环中间：

> Daily Check → Observe → **Record** → Evidence → **Verify** → Track

"Record"和"Verify"这两步，现在都被迫离开手机才能完成。这是现有 Mobile Console 跟真实现场使用之间最大的落差，也是本提案 MVP 的核心目标。

---

## E. Proposed Mobile UX

沿用 Contract §3 已经定的原则——**不加路由库，维持 `.view`/`.view.active` 的单文件 JS 切换模式**，不做 `doGet(e.parameter.page)` 那种多页 URL 结构。具体做法：

- **落地页维持 Daily Check 不变**——这是已验证、已调过 30-60 秒完成体验的东西，没有真实使用回馈之前不该为了这次升级去动它（跟项目一贯的 Candidate Pattern 纪律一致：不因为一个新需求就改一个已经在跑、跟这个需求无关的既有共用流程）。
- **在 Case Overview 现有的 Defect 卡片上加"可点击"**，点开成为第三个 view——`view-defectDetail`，同一个 flat 导览模型（进去一层，一个返回键），不是新开一条 nav。
- Defect Detail 显示：完整 Description/日期字段（现有 `getDefectItem`/`buildDefectDetailForSidebar_` 已经有）、Rectification Events 列表、Evidence 列表、Secondary Damage 列表（皆只读展示），加上三个动作：Update Developer Status／Record Owner Verification／Add Rectification Event／Attach Evidence to this Defect。
- **对"Owner 打开 Mobile Console 第一屏该看到什么"这题，我的答案是：还是 Daily Check，但加一个轻量提示**——Bootstrap 完成后，如果有 Defect 处于"Developer 已 ClaimedCompleted 但 Owner 还没 Verified/只 PartiallyVerified"，在 `☰` 旁边加一个小红点或"3 项待确认"字样，而不是把落地页改成 Dashboard。理由：落地页改动风险高（碰一个已验证过、修过两次真机 bug 的稳定流程），轻量提示的风险和成本都小得多，也直接回应"低摩擦现场工作流"这个诉求。
- **从发现一个 Defect 到完成一次记录，最少步数**：现状是 0（手机上做不到，必须换 Desktop）；MVP 完成后是 `☰` → 点 Defect 卡片 → 点 Verified/FailedVerification/PartiallyVerified 按钮，进到 Overview 之后三次点击。

---

## F. Daily Check Integration

任务简报问"Daily Check 该不该成为核心/主入口"——**这题其实已经是既定事实，不是待决定的问题**：Contract §2.1/§3 从 2026-08-19 起就把 Daily Check 定为 Root 落地页、每次进来都先看到它。这次不需要重新设计 Daily Check 本身，只需要 E 节说的"待确认提示"轻量叠加。刻意不做的：不把 Daily Check 表单本身加更多栏位或跟 Defect List 合并成一个大表单——Contract §7 已经明确"没有真实使用理由就不要长成 Property OS Dashboard"，这次维持同一纪律。

---

## G. Architecture Options

### Option A — 原地扩充 948

同一个档案、同一个 Web App 部署，新增 `view-defectDetail` 作为第三个 view，直接呼叫既有的 947 Sidebar-facing wrapper（`dlp_getSidebarDefectDetail`/`dlp_recordDeveloperStatus`/`dlp_recordOwnerVerification`/`dlp_addRectificationEvent`/`dlp_attachDefectEvidence`）。**技术上这些函数今天就能被 948 呼叫**——Apps Script 的 `google.script.run` 函数是整个 script project 全域的，不分「这是给 Sidebar 用的」还是「这是给 Web App 用的」，命名只是文件层面的约定，不是技术限制。

- 优点：新增面最小，947 的 RPC 层完全重用不用碰 Domain（918/911/922 零改动），风险集中在 948 单一文件的 UI 工作，跟 Daily Check 既有稳定流程互不干扰。
- 缺点：948 会从 614 行往 Sidebar 的规模（945 是 1411 行）靠近，长期如果 view 数量继续增加，迟早需要类似 Desktop Phase A 那种 registry 化。

### Option B — 仿照 Desktop Phase A 的 ConsolePages，把 948 改成小型 view registry

同一个 doGet() Web App，但内部不是临时加 `if/else`，而是仿 Desktop 新的 ConsolePages 模式（ADR-P24 之后的产物）先建好一个轻量 view 注册机制，为将来可能的 Rectification/Secondary Damage/Correspondence/History 等更多 view 预留结构。

- 优点：概念上跟 Desktop 新架构语言一致（不是共用代码，是同一种设计语言），如果 Owner 真的把大半 DLP 现场工作都搬到手机，长期比较不会走回头路。
- 缺点：在只有 1-2 个新 view 的现在就先做 registry 化，是在真实使用验证需求之前先把复杂度堆上去——跟这个项目一路奉行的"不要为了还没出现的第二个 Case 先写 Case Selector"同一种纪律，这里也适用；ADR-P14 Console MVP 原则明白写着"real usage feedback, not feature-complete"。

### Option C（本文件建议）— Option A 先做，附一个明确的 Option B 触发条件

不是"以后再看着办"，而是现在就写下具体触发条件，比照这个项目一贯的做法（`ACTIVE_DLP_CASE_ID` 的移除条件是"真的出现第二个 Case"，不是一个日期）：**如果 948 的 view 数量超过 5-6 个，或档案大小相对现在再翻一倍，就是改用 Option B registry 模式的时机**——现在不做，但先把线画出来，不是含糊地"以后可能要重构"。

**建议：Option C。**

---

## H. Recommended Architecture

Option A 原地扩充，MVP 只加一个新 view（Defect Detail）承载 4 个动作（见 J 节顺序），全部透过既有 947 Sidebar-facing wrapper，不新增 Domain 函数，不改 918/911/922 既有行为，不碰 Daily Check 落地页本身。Web App 部署（`doGet()`/`appsscript.json`）完全不用动——新 view 是同一个 HTML 文件里的另一个 `<div class="view">`，不是新的部署单位。

---

## I. Authentication / Deployment

**不需要重新设计**——Contract §9.3 已经核准 `executeAs: USER_DEPLOYING, access: MYSELF`，理由是个人内部工具、单一使用者。这次扩充的是同一个 doGet() 页面内部的 view 数量，access 层级管的是整个 Web App 能不能被打开，不是逐 view 授权，所以不涉及。唯一值得记下、但不是现在要处理的：如果将来 CC 想让家人或协调联系的第三方也能用，那才是重新检视 §9.3 的触发点——不是现在。

---

## J. MVP Scope

按"现场价值 ÷ 实作成本"排序：

1. **Defect Detail（只读）**——点开卡片看完整描述/日期/Rectification Events/Evidence/Secondary Damage 列表。全部是读，零新写入风险，直接用现成的 `buildDefectDetailForSidebar_`，零新 Domain 代码。
2. **Owner Verification**——现场价值最高的单一动作。
3. **Developer Status 更新**。
4. **Add Rectification Event**。
5. **Attach Evidence 直接挂在 Defect 上**（区别于现有挂在 Daily Check 上的版本）。

**明确不在 MVP 里**：Secondary Damage（栏位多、手机填容易出错，建议留 Desktop）、Correspondence 新增（Desktop 自己都没做，不该 Mobile 先做）、Close/Reopen/Close Case（Phase 2 deferred，是 Desktop 跟 Mobile 共同要面对的决定，不该在这次 Mobile 提案里单方面决定要不要提前）、真正的离线队列（见 N 节）。

---

## K. Existing Code Reuse

- `buildDefectDetailForSidebar_`（922）——Defect Detail 读取，零改动直接用
- `dlp_getSidebarDefectDetail`/`dlp_recordDeveloperStatus`/`dlp_recordOwnerVerification`/`dlp_addRectificationEvent`/`dlp_attachDefectEvidence`/`dlp_getSidebarFormOptions`（947）——全部现成、已经在 Sidebar 上跑
- `recordDeveloperStatus`/`recordOwnerVerification`/`logRectificationEvent`/`attachEvidence`（918/911）——已测试的 Domain Command，零改动
- `clientRequestId` + `CacheService.getScriptCache()` 幂等模式——`logDailyProgressCheck`/`attachEvidence`/`logRectificationEvent`/`logSecondaryDamage` 本来就支援，直接沿用同一套
- `escapeHtml`/`showToast`/`formatRelativeDate_`/timeout+settled guard 模式——948 现成的工具函数，新 view 直接复用
- `dlp_getCaseOverview` 已经验证过的 JSON.stringify/parse 防御模式——如果 Defect Detail 这种"案情+Rectification+Evidence+SecondaryDamage"捆绑起来的复杂 payload 在 Mobile 的 `google.script.run` 边界重演同样的序列化问题，这是现成、已证实有效的修法

---

## L. Required Changes（只列文件与目的，不改档案）

- **`948_MobileConsole.html`**——新增 `view-defectDetail`、render 函数、既有 Defect 卡片加可点击、四个动作的表单/按钮（Evidence 上传重用现有 `uploadEvidence_` 模式，改指向 Defect 而非 Daily Check）
- **`947_DlpConsoleServer.js`**——大概率不需要新 Domain 呼叫；如果 `dlp_getSidebarDefectDetail` 这种复杂 payload 在 Mobile 边界重演序列化问题，可能需要加一层 JSON.stringify 包装（或另开一个 Mobile 专用别名），这点无法在没有真机测试前 100% 确定，列为风险不是定论
- **`918_DefectEngine.js`**——**如果**要让 Owner Verification / Developer Status 具备 Mobile 该有的幂等保护（见 N 节），`recordOwnerVerification`/`recordDeveloperStatus` 需要比照 `logDailyProgressCheck` 加上 `clientRequestId` + 快取——这是本提案唯一可能touch到 Domain 层的地方，且做法有现成先例可以照抄
- **`DlpMobileConsole_UIContract.md`**——需要一段新的 Amendment（沿用 Contract 自己 §0 已经预告过的"之后要更新"模式），记录范围扩充的决定与理由，更新 §1 Scope 表
- **`00_Product_Backlog.js`/`00_ADR_Log.js`/`00_Project_State.js`**——CC 核准方向后，照既有 Governance 流程补上对应条目

---

## M. Governance Impact

**不需要新 ADR**——这次不碰 hosting 机制（那是 ADR-P24 的范围，Desktop-only，完全不动），也不碰 Domain Model（918/911/922 零新 Command）。这是 `DlpMobileConsole_UIContract.md` 的**范围修订**（Contract Amendment），不是新 Contract、也不是 ADR 层级的决定。

不需要新 Backlog 项目本身（这是核准范围内的功能规划，不是缺陷），但值得记一笔小观察：一旦 Mobile 也呼叫"Sidebar-facing"命名的 947 函数，那些函数名称/注释（例如 `dlp_getSidebarDefectDetail`）会变得不够准确——纯粹是文件/命名层面的小整理项，不影响功能，留给实际动手那一轮顺手处理即可，不必现在单独开票。

---

## N. Risks / Unknowns

- **序列化风险**：`dlp_getCaseOverview` 当初为了同一个 Mobile `google.script.run` 边界加过 JSON.stringify 防御，Contract 自己都写"根因是否真的是序列化失败，未 100% 锁定"。Defect Detail 捆绑 Rectification+Evidence+SecondaryDamage，是比 Overview 更深、更复杂的物件，同一类问题有实际重演的可能，只能真机测试后才知道，不是现在能保证不会发生。
- **幂等保护的落差，且落差不是均匀的**——查了 918 实际代码后可以精确讲：
  - `logRectificationEvent`/`attachEvidence`/`logSecondaryDamage` 这三个 Command **本来就支援** `clientRequestId`（Sidebar wrapper 只是选择不传），Mobile 要用的话，只需要 948 client 生成 ID + 947 wrapper 把它转传进去——**Domain 层零改动**。
  - `recordDeveloperStatus`/`recordOwnerVerification` 这两个 Command **完全没有** `clientRequestId` 参数或快取机制。不过实际风险比"重复写入"听起来轻——这两个是"Set"语意（覆盖 Status 栏位），不是"Append"语意（不会像 Daily Check 那样重复的一笔请求变出两笔资料列），真正的重复风险是 Timeline 条目和 PropertyEvent 会跟着多写一次，是噪音而非资料错误，但既然 Owner Verification 是本提案最高优先的动作，且 Mobile 本来就是为"讯号不稳"设计的 surface，我建议做（做法上有 `logDailyProgressCheck` 现成可抄），但这属于**需要 CC 决定**的取舍，不是我能替 CC 定案的事。
- **Evidence 挂 Defect vs 挂 Daily Check**——`attachEvidence` 走 `relatedCaseId` 定位资料夹（`getOrCreateCaseEvidenceFolder_`），不是按 `relatedEntityType` 分资料夹，理论上从新的呼叫情境（Defect 而非 DailyProgressCheck）呼叫应该无碍，但没有真机测过这个具体路径组合前，不是 100% 确定。
- **最大的软性风险是范围蔓延**——这份提案已经刻意把 Secondary Damage / Correspondence 新增 / Close-Reopen-CloseCase 排除在 MVP 外；真正的风险是在没有真实现场使用回馈之前，被"反正都在做 Mobile 升级"的惯性拉去做更多。

---

## O. Proposed Implementation Slices

每个 slice 独立可交付、独立真机验证，比照这个项目一贯的 vertical slice 纪律（Sidebar DLP Tab 本身就是这样分两批做的）：

1. Defect Detail（只读展开）——零写入风险，先证明 UI 骨架和读取路径在 Mobile 边界没问题
2. Owner Verification 写入（含是否补 `clientRequestId` 的决定）
3. Developer Status 写入
4. Add Rectification Event 写入
5. Defect-linked Evidence 写入

---

## P. Approval Gate

**Needs Architecture Decision** —— 不是 Ready for Implementation，也不是 Blocked。需要 CC 决定：

1. 是否核准 Option C（Option A 先做 + Option B 的具体触发条件）作为方向？
2. 是否核准 J 节的 MVP 顺序与优先级（Owner Verification 排第一）？
3. N 节的幂等落差——要不要在把 Owner Verification / Developer Status 开放给 Mobile 之前，先补 `clientRequestId` 到这两个 918 Command？还是先接受这个风险、v1 就上？
4. 确认 Secondary Damage / Correspondence 新增 / Close-Reopen-Close Case 维持排除在 Mobile 范围外（本文件建议），还是有哪一项需要重新考虑？

依照本次任务简报第 17 节的 Stop Condition，分析到此为止——不写代码、不产生 patch、不动 ADR/Contract/Backlog，等下一轮明确核准。
