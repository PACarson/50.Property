# Mobile Defect Detail MVP — M1 Read-Only Implementation — Report

## A. M1 Scope

在既有 Mobile DLP Console（948）上新增一个只读的 Defect Detail view。Case Overview 的 Defect 卡片变成可点击，进去后展示这个 defect 的 Identity/Description/Priority-State/Dates 完整栏位，加上 Rectification Events/Evidence 两份只读列表，返回键回到 Defect List（Case Overview）。零 mutation 控件——没有 Owner Verification/Developer Status/Rectification Event/Evidence 的任何写入动作。

## B. Files Changed

| 档案 | Before | After | 目的 |
|---|---|---|---|
| `947_DlpConsoleServer.js` | 无 `dlp_getMobileDefectDetail` | 新增此函式，重用既有 `buildDefectDetailForSidebar_`（922），JSON.stringify 防御包装 | 给 M1 一个 Mobile 专属、不碰 Desktop 既有 wrapper 的读取入口 |
| `948_MobileConsole.html` | 只有 Daily Check + Case Overview 两个 view | 新增第三个 view（`view-defectDetail`），Defect 卡片可点击，新增返回键，新增两个 JS 函式（`openDefectDetail_`/`renderDefectDetail_`） | 承载只读的 Defect Detail UI |
| `local_precheck_test_947.js` | 22 项（BL-13 阶段留下的 13 项，本次前一轮已是 13） | 新增 9 项测 `dlp_getMobileDefectDetail`（含两种失败情境），13→22 | 验证新函式的资料完整性与错误处理 |
| `00_Product_Backlog.js` | 到 BL-13 | 新增 BL-14 | 记录本次实作 |
| `00_Project_State.js` | CHANGELOG 到 BL-13 真实 GAS 验证 | 最前面新增一笔 M1 记录 | 项目状态时序记录 |

`918_DefectEngine.js`/`922_DashboardAdapter.js`/`911_DocumentEngine.js`/`945_OperatorConsole.html`/`946_OperatorConsoleServer.js`/Schema：**逐字未动**。

## C. Architecture Path

```
948 (defect card click / openDefectDetail_)
  ↓ google.script.run
947 dlp_getMobileDefectDetail(input)
  ↓ (直接呼叫，零新增中间层)
922 buildDefectDetailForSidebar_(defectId)
  ↓
918 getDefectItem / listRectificationEventsForDefect / listSecondaryDamageForDefect
911 listEvidenceForDefect
  ↓
实际 Sheet 资料（DefectItem / RectificationEvent / Evidence / SecondaryDamage 分页）
```

跟既有 Sidebar 路径（945 → `dlp_getSidebarDefectDetail` → 同一个 `buildDefectDetailForSidebar_`）在 922 这一层汇合，共用同一份聚合逻辑，947 层分岔成两个不同的薄 wrapper——一个维持 Desktop 原样不动，一个是这次给 Mobile 新开的。

## D. Read APIs Reused

`buildDefectDetailForSidebar_`（922）、`getDefectItem`/`listRectificationEventsForDefect`/`listSecondaryDamageForDefect`（918）、`listEvidenceForDefect`（911）——全部既有、全部零改动直接重用。客户端也重用既有工具函式：`escapeHtml`、`formatRelativeDate_`、`.view`/`.view.active` 切换模式、`google.script.run` + `JSON.parse` + timeout + settled guard 的既有错误处理骨架（跟 `openOverview()` 逐行同构）。

## E. New APIs

`947_DlpConsoleServer.js` 新增 **1 个**函式：`dlp_getMobileDefectDetail(input)`。

为什么无法避免：既有 `dlp_getSidebarDefectDetail` 虽然做的事完全一样，但它是 945/Desktop 在用、已经真机验证过的既有 wrapper——直接让 948 也去呼叫它技术上可行（Apps Script 的 `google.script.run` 函式本来就是全域的），但这样任何一次为了 Mobile 需求对它做的调整（例如这次的 JSON.stringify 防御包装，Desktop 端从未需要过）都会同时影响 Desktop，读起来也会让未来维护者搞不清楚这个 wrapper 到底是给谁用的。开一个新的薄函式，把"给 Mobile 用、需要 JSON.stringify"这个决定留在这个新函式自己身上，比修改一个 Desktop 也在依赖的既有函式更安全。**918/911/922 零新增函式**——`buildDefectDetailForSidebar_`本来就是给这两个 Console 共用设计的，不需要为 Mobile 另开一份。

## F. Test Results

| 档案 | Passed | Failed | Skipped | 备注 |
|---|---|---|---|---|
| `local_precheck_test_947.js` | 22 | 0 | 0 | 13 项 BL-13 既有断言 + 9 项本次新增，全过 |
| `local_precheck_test_918.js` | 163 | 0 | 0 | 完全不受影响，逐字比对跟本次改动前一致 |
| `local_precheck_test_922.js` | 67 | 0 | 0 | 完全不受影响 |
| `local_precheck_test_911.js` | — | — | — | 维持既有、跟本次改动无关的 `PropertiesService is not defined` 崩溃（pre-existing，未变动） |

没有把不相关的测试聚合成笼统的"全部通过"——911 单独列出，因为它现在跟本次改动前一样是崩溃状态，不是"通过"也不是这次造成的"失败"。

**关于 948 本身**：948 是纯 client-side HTML/JS（`document`/`google.script.run`），跟 918/947/911/922 那种能用 GasShim+vm 在 Node 里直接执行的 server-side .gs 风格档案不是同一类东西——948 从建立以来就没有 `local_precheck_test_948.js`，这次也没有新建一个，因为要真的做到（例如用 jsdom 模拟浏览器 DOM）是比这次范围大很多的基础设施投入。改用两项静态核对取代：抽取 948 的 `<script>` 内容单独跑 `node -c` 确认零语法错误；`grep` 确认全档案零直接 Sheet 存取（`SpreadsheetApp`/`getRange`/`getSheet`）、新增的 Detail 相关代码零 mutation RPC 呼叫（`dlp_record`/`dlp_add`/`dlp_attach`/`dlp_log`）。这两项都是这次真的跑过、有实际输出为证，但它们证明的是"代码语法正确、没有意外混入不该有的呼叫"，不是"在浏览器里真的点得动"——后者只有真机验证才能证明。

## G. Mutation Boundary Check

确认 M1 不曝光：
- Owner Verification — 未新增任何 UI 元素或 RPC 呼叫
- Developer Status — 同上
- Rectification Event — Detail view 只**显示**既有 Rectification Events 列表（`data.rectificationEvents`），没有新增表单或"Add"按钮
- Evidence upload — Detail view 只**显示**既有 Evidence 列表，没有拍照/上传入口
- Close Defect / Reopen Defect / Close Case — 完全没有提及或触碰

`grep`结果（B 节/F 节已述）实证零 mutation RPC 混入。

## H. Evidence Status

Evidence 维持 **IMPLEMENTED — UNVERIFIED**，本次未变更这个状态。M1 只是把既有 Evidence 记录做只读展示（重用既有 `listEvidenceForDefect`/`enrichEvidenceForDisplay_`），完全没有新增或触碰任何 Evidence 的写入路径，不构成对 Evidence 真机验证状态的任何主张。

## I. Governance Updates

- `00_Product_Backlog.js`：新增 BL-14，记录本次实作细节、已知边界（948 缺乏本地自动化测试基础设施）、Real-GAS 验证待办
- `00_Project_State.js`：CHANGELOG 最前面新增一笔
- `00_File_Map.js`：**未修改**——947/948 现有条目描述（DLP Console Server / Mobile Console）仍然准确，本次扩充没有让既有描述失真，判断不需要更新
- `00_ADR_Log.js`：**未修改**，没有新架构决定——M1 是既有 Mobile Console 架构下的一个实作切片，沿用既有 `.view` 切换模式、既有 wrapper 重用哲学、既有 JSON.stringify 防御 pattern，没有引入任何新的设计语言

## J. Deployment Status

**NOT DEPLOYED**。本次改动只存在于这次交付的下载档案里，尚未套用到 CC 的真实 Apps Script 专案。

## K. Real-GAS Verification Status

**REAL-GAS VERIFICATION PENDING**。

## L. Next Recommended Slice

M2（Owner Verification 写入）是自然的下一步——BL-13 已经在真实环境验证过 `recordOwnerVerification` 的 clientRequestId 保护，Idempotency Gate 报告也把它排在 M2-M5 里优先级最高的位置（现场价值最高的单一动作）。但在开始 M2 之前，建议先请 CC 在真实专案打开 Mobile Console、点开一个真实 Defect，确认 M1 这次的只读展开本身能正常运作——尤其是 Rectification Events/Evidence 这种复杂巢状 payload 会不会在真实 `google.script.run` 边界重演 `dlp_getCaseOverview` 当初那次序列化问题（本次已经比照那次的修法加了防御性 JSON.stringify，但这是"没等到真的出问题就先做"，不是"确认过这样就不会有问题"）。
