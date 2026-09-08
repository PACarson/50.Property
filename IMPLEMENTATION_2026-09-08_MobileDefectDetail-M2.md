# Mobile Defect Detail MVP — M2 Owner Verification — Report

## A. M2 Scope

在 M1 的 Defect Detail 上新增 Owner Verification 写入能力。三个选项（Verified/Failed/Partial）+ 一个 Submit 按钮，两段式操作（先选后送，不是点了就送）。成功后重新抓取整份 Detail 显示最新状态。947/918 的 Owner Verification 路径逐字未动——BL-13 起就已经真机验证过 clientRequestId 保护，这次单纯接上 UI。

## B. Files Changed

| 档案 | 确切改动 | 原因 |
|---|---|---|
| `948_MobileConsole.html` | (1) CSS 新增 `.ovchip`/`.ovchip.selected`；(2) `state` 新增 `currentDefectId`/`ownerVerificationSelectedStatus`/`ownerVerificationClientRequestId`；(3) `init()` 加一行 `setupOwnerVerification_()`；(4) Defect Detail HTML 新增 Owner Verification 区块；(5) `openDefectDetail_` 开头加状态重设；(6) 新增 `setupOwnerVerification_`/`submitOwnerVerification_` 两个函式 | 承载 M2 全部 UI/交互逻辑 |
| `00_Product_Backlog.js` | 新增 BL-15 | 记录本次实作与过程中发现的 bug |
| `00_Project_State.js` | CHANGELOG 新增一笔 | 项目状态时序记录 |

`947_DlpConsoleServer.js`/`918_DefectEngine.js`/`922_DashboardAdapter.js`/Schema/Desktop（945/946）：**逐字未动**。

## C. Architecture Path

```
948 (Owner Verification chip 选取 + Submit 按钮)
  ↓ google.script.run
947 dlp_recordOwnerVerification(input)   ← 未改动，BL-13 既有函式
  ↓
918 recordOwnerVerification(input)        ← 未改动，BL-13 起已支援 clientRequestId
  ↓
DefectItem 行覆写 + Timeline 新增一笔（若非快取命中）
```

成功后：948 重新呼叫 `openDefectDetail_(defectId)` → `dlp_getMobileDefectDetail`（M1 既有）→ `buildDefectDetailForSidebar_`（922，未改动）→ 拿回含最新 OwnerVerificationStatus 的完整 Detail，用 M1 既有的 `renderDefectDetail_` 重新渲染。

## D. Idempotency Path

`clientRequestId` 在 948 的 `submitOwnerVerification_` 里生成（`generateClientRequestId_()`，M1/Daily Check 沿用至今的既有工具函式），存进 `state.ownerVerificationClientRequestId`。**生成时机**：只在这个欄位还是 `null` 时才生成一次；`openDefectDetail_` 每次开启（不管是打开新 defect 还是同一个 defect 提交成功后重抓）都会先把它重设回 `null`，确保下一次"有意义的新操作"一定拿到新 ID，同一次尝试的重试则会沿用同一个 ID。**转传**：948 直接把这个 ID 放进 `dlp_recordOwnerVerification({..., clientRequestId: ...})` 的呼叫参数里，947 原样转给 918（这段转传本来就是 BL-13 已经做好、这次没有改动的部分）。**强制执行**：真正的去重判断完全发生在 918 内部（`getCachedDefectEngineCommandResult_`/`cacheDefectEngineCommandResult_`），948/947 都不做任何形式的二次判断——没有在 UI 层另外实作一套 idempotency。

## E. Tests

| 档案 | Passed | Failed | Skipped | 备注 |
|---|---|---|---|---|
| `local_precheck_test_947.js` | 22 | 0 | 0 | 完全不受影响，947 本次零代码改动 |
| `local_precheck_test_918.js` | 163 | 0 | 0 | 完全不受影响 |
| `local_precheck_test_922.js` | 67 | 0 | 0 | 完全不受影响 |
| `local_precheck_test_911.js` | — | — | — | 维持既有、跟本次无关的 `PropertiesService` 崩溃，未变动 |

**没有新增 server 端断言**——Owner Verification 的 918/947 逻辑本身没有任何新代码，M1 阶段已经用 22 项断言测过 `dlp_getMobileDefectDetail`，BL-13 阶段已经用大量断言测过 `recordOwnerVerification`/`dlp_recordOwnerVerification` 的 clientRequestId 行为，这次不必要重复。

**948 client-side 行为**（M2-A/B/C/D/E/F）：跟 M1 一样没有浏览器 DOM 测试基础设施，用以下方式核对，逐项对应：
- M2-B/C（呼叫正确的 947 wrapper、clientRequestId 有生成并转传）——直接读代码确认：`submitOwnerVerification_` 唯一的 RPC 呼叫是 `.dlp_recordOwnerVerification({defectId, ownerVerificationStatus, clientRequestId})`（B 节路径已列出确切参数）
- M2-H（无直接 Sheet mutation）——`grep SpreadsheetApp\|setValue\|appendRow\|getRange` 在整个 948 档案里零命中
- M2-I（没有意外混入 M3/M4/M5）——`grep dlp_recordDeveloperStatus\|dlp_addRectificationEvent\|dlp_attachDefectEvidence\|dlp_addSecondaryDamage` 在 948 里零命中；`grep dlp_recordOwnerVerification` 确认只在一处新增的呼叫点出现
- M2-A/D/E/F（渲染、防止意外二次呼叫、成功后刷新、错误处理不破坏状态）——只能靠代码审查而非执行结果证明：Submit 按钮与三个选项在请求送出瞬间立刻被 disable/`pointerEvents:none`，成功或失败都会在 callback 里重新启用；成功分支呼叫既有的 `openDefectDetail_` 整个重新抓取，不做局部 DOM 拼贴；失败分支只清空 loading 文字、恢复按钮可点，不清空已经渲染好的既有资料

**发现并当场修正的一个真实 bug**：Daily Check 既有的 `setupDailyCheckForm()` 用 `document.querySelectorAll('.chip')`（未加范围限定）绑点击事件——如果 Owner Verification 的三个选项沿用同一个 `.chip` class，会被这段既有代码一併选到，点 Owner Verification 的任何一个选项会连带把 `dc_generalStatus`（Daily Check 的欄位）写成字串 `"undefined"`，还会清掉 Daily Check 原本选好的 chip。这不是"发现但延后处理的既有缺陷"，是这次新增代码差点自己造成的问题，修法是新增一个视觉相同但 class 名称独立的 `.ovchip`，完全没有去动 Daily Check 那段已经真机验证过的既有代码。

## F. Mutation Boundary

M3（Developer Status）、M4（Rectification Event）、M5（Evidence 上传）、Secondary Damage、Correspondence、Close/Reopen/Close Case——**全部没有实作**。E 节的 grep 结果是这个结论的直接证据，不是单纯的口头保证。

## G. Evidence Status

Evidence 维持 **IMPLEMENTED — UNVERIFIED**。本次完全没有触碰 Evidence 相关的任何代码路径。

## H. Governance Changes

- `00_Product_Backlog.js`：新增 BL-15
- `00_Project_State.js`：CHANGELOG 新增一笔
- `00_File_Map.js`：未修改（948 既有条目描述仍然准确）
- `00_ADR_Log.js`：未修改，没有新架构决定

## I. Deployment Status

**NOT DEPLOYED**。

## J. Real-GAS Verification

**REAL-GAS VERIFICATION PENDING**。没有执行、也没有宣称执行过真实 GAS 环境测试。

## K. M1 Status

**M1 = IMPLEMENTED — LOCAL VERIFIED — REAL-GAS VERIFICATION PENDING**（维持不变，本次没有因为 M2 的进展而调整 M1 的状态）。

## L. Recommended Next Slice

在往 M3（Developer Status）继续推进之前，建议这次真的排个时间做一次真机验证——把 M1+M2 一起测：真实专案打开 Mobile Console，点一个真实 Defect 看 Detail 展开是否正常（尤其 Rectification Events/Evidence 那两份列表在真实 `google.script.run` 边界会不会重演序列化问题），接着实际提交一次 Owner Verification，确认 Timeline 真的增加、UI 真的刷新、且用同一个 clientRequestId 重试一次确认真的不会产生第二笔记录（这条路径本身 BL-13 已经用 script 验证过，但这是"透过 M2 这个新 UI 触发"的第一次真机测试，跟 BL-13 当时直接呼叫 wrapper 测试不是完全同一件事）。如果这次一起测，M3 开始时至少有 M1+M2 这两个已经用过的 slice 真的被验证过，不会一路堆到 M5 才第一次真机测。
