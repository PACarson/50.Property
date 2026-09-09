# Mobile Defect Detail MVP — M3 Developer Status — Report

## A. M3 Scope

在 Defect Detail 上新增 Developer Status 写入能力，紧接在 Owner Verification 区块之后。四个选项（Pending/Scheduled/In Progress/Claimed Completed）+ Submit 按钮，跟 M2 完全同构的两段式交互（先选后送）。947/918 逐字未动，全部改动在 948。

## B. Files Changed

| 档案 | 确切改动 | 原因 |
|---|---|---|
| `948_MobileConsole.html` | (1) `state` 新增 `developerStatusSelected`/`developerStatusClientRequestId`；(2) `init()` 加一行 `setupDeveloperStatus_()`；(3) Defect Detail HTML 在 Owner Verification 后新增 Developer Status 区块（`#ds_chips` 四个 `.ovchip` + `#ds_submitBtn` + `#ds_status`）；(4) `openDefectDetail_` 开头加 Developer Status 的状态重设；(5) 新增 `setupDeveloperStatus_`/`submitDeveloperStatus_` 两个函式 | 承载 M3 全部 UI/交互逻辑 |
| `00_Product_Backlog.js` | 新增 BL-16 | 记录本次实作 |
| `00_Project_State.js` | CHANGELOG 新增一笔 | 项目状态时序记录 |

`947_DlpConsoleServer.js`/`918_DefectEngine.js`/`922_DashboardAdapter.js`/Schema/Desktop：**逐字未动**。**零新增 CSS**——`.ovchip`（M2 建立）跟 `.btn-secondary:disabled`（上一轮真机测试后修好）直接重用。

## C. Architecture Path

```
948 (Developer Status chip 选取 + Submit)
  ↓ google.script.run
947 dlp_recordDeveloperStatus(input)   ← 未改动，BL-13 既有函式
  ↓
918 recordDeveloperStatus(input)        ← 未改动，BL-13 起已支援 clientRequestId
  ↓
DefectItem 行覆写（DeveloperStatus/派生 Status/UpdatedAt）+ Timeline 新增一笔（若非快取命中）
```

成功后重新呼叫既有的 `openDefectDetail_(defectId)` 整个重抓，跟 M2 完全一致的刷新方式。

## D. Developer Status Contract

从 `900_PropertyConfig.js` 的 `PROPERTY_CONFIG.DEVELOPER_STATUSES` 逐字核对到的权威枚举，共 4 个值：`Pending`、`Scheduled`、`InProgress`、`ClaimedCompleted`。UI 上的 chip 显示文字（"In Progress"/"Claimed Completed"）只是给人看的，`data-status` 属性跟实际送进 947/918 的值是精确的 Domain 字串，没有发明别名、没有翻译成别的值再转换回来。

## E. Idempotency

**生成**：948 的 `submitDeveloperStatus_` 在 `state.developerStatusClientRequestId` 为 `null` 时才生成一次（`generateClientRequestId_()`，M1 起沿用至今的既有工具）。**转传**：直接放进 `dlp_recordDeveloperStatus({..., clientRequestId: ...})` 呼叫参数，947 原样转给 918（BL-13 已经做好、这次没有改动）。**强制执行**：完全在 918 内部（`getCachedDefectEngineCommandResult_`/`cacheDefectEngineCommandResult_`），948/947 都不做任何形式的二次判断。**同一次尝试 vs 不同意图动作的区分**：`openDefectDetail_` 每次开启（新 defect 或同一 defect 提交成功后重抓）都会把这个欄位重设回 `null`，确保下一次有意义的新操作一定拿新 ID；同一次尝试的重试（例如网路卡住使用者又点了一次，虽然 Submit 已经 disabled 应该挡住，但欄位本身的生命周期设计上就是"只要还没成功就沿用同一个 ID"）会沿用同一个。

## F. UI Safety

- **选取前 disabled**：`ds_submitBtn` 初始就带 `disabled` 属性，`openDefectDetail_` 每次也会重设回 disabled
- **视觉上确实看得出停用**：直接重用 M2 真机测试后修好的 `.btn-secondary:disabled { opacity:.5 }`，没有重蹈"disabled 但看起来能点"的问题——这次是从设计阶段就用对，不是先犯错再修
- **防止在途时二次提交**：送出瞬间立刻 `btn.disabled = true` 且四个 chip 都 `pointerEvents:none`，成功或失败的 callback 里才恢复
- **loading 状态**：`ds_status` 文字改成"Submitting…"
- **成功**：`showToast` 提示 + 重新呼叫 `openDefectDetail_` 整个刷新权威资料（新的 DeveloperStatus badge 会跟着重新渲染出来）
- **失败**：`ds_status` 显示错误文字（红色）、按钮恢复可点、chip 恢复可点，不清空已经渲染好的既有 Detail 内容

## G. Tests

| 档案 | Passed | Failed | Skipped | 备注 |
|---|---|---|---|---|
| `local_precheck_test_947.js` | 22 | 0 | 0 | 完全不受影响，947 本次零代码改动 |
| `local_precheck_test_918.js` | 163 | 0 | 0 | 完全不受影响 |
| `local_precheck_test_922.js` | 67 | 0 | 0 | 完全不受影响 |
| `local_precheck_test_911.js` | — | — | — | 维持既有、跟本次无关的 `PropertiesService` 崩溃，未变动 |

没有新增 server 端断言的原因跟 M2 一样：Developer Status 的 918/947 逻辑本身在 BL-13 阶段就已经被大量测过（clientRequestId 幂等行为），这次纯粹是接既有能力到新 UI，没有新 server 端行为好测。

**948 client-side 行为**（M3-A 到 M3-L），沿用 M1/M2 建立的静态核对方式：
- M3-A/C（UI 渲染、选取前 disabled）——代码审查：初始 HTML 就带 `disabled`
- M3-B/D（只有权威枚举值能送出、disabled 样式确实存在且套用）——D 节已列出枚举值来源；`grep .btn-secondary:disabled` 确认规则存在，`ds_submitBtn` 用的正是这个 class
- M3-E/F/G（呼叫正确 wrapper、clientRequestId 生成与转传）——直接读代码确认 `submitDeveloperStatus_` 唯一 RPC 呼叫是 `.dlp_recordDeveloperStatus({defectId, developerStatus, clientRequestId})`
- M3-H/I（成功刷新、失败不留在假成功状态）——同 F 节
- M3-J（既有 BL-13 idempotency 测试维持绿灯）——G 节表格，163/163
- M3-K（无直接 Sheet 存取）——`grep SpreadsheetApp\|setValue\|appendRow\|getRange` 零命中
- M3-L（无意外混入 M4/M5）——`grep dlp_addRectificationEvent\|dlp_attachDefectEvidence\|dlp_addSecondaryDamage` 零命中；额外确认 `#ds_chips` 用的 `.ovchip` 不会跟 Daily Check 既有 unscoped `.chip` selector 碰撞（M2 那次教训这次从一开始就避开）

**跟 M2 的一个重要差异必须诚实说明**：以上全部都是静态代码核对与既有 pattern 复用的逻辑推演，**本次没有做任何真机操作**——不像 M1/M2 已经真的在手机上点过、在真实 GAS 环境跑过 Execution log。M3 目前的确定性来源完全是"这段代码长得跟 M2 已验证过的代码一模一样、M2 验证过的东西这次原样重用"，不是这次自己被验证过。

## H. Mutation Boundary

- M2（Owner Verification）：**保留**，完全没有被这次改动影响
- M4（Rectification Event）：**未实作**
- M5（Evidence 上传）：**未实作**
- Secondary Damage：**未曝光**
- Correspondence：**未曝光**
- Close/Reopen/Close Case：**未曝光**

G 节的 grep 结果是这些结论的直接证据。

## I. Evidence Status

Evidence 维持 **IMPLEMENTED — UNVERIFIED**，本次完全未触碰。

## J. Governance

- `00_Product_Backlog.js`：新增 BL-16
- `00_Project_State.js`：CHANGELOG 新增一笔（2026-09-09）
- `00_File_Map.js`：未修改
- `00_ADR_Log.js`：未修改，没有新架构决定

## K. Deployment

**NOT DEPLOYED**。

## L. Real-GAS Verification

**REAL-GAS VERIFICATION PENDING**。没有执行、也没有从 M2 的真机验证结果推论 M3 也一并通过——G 节已经明确区分这次的确定性来源跟 M1/M2 不是同一个等级。

## M. M2 Visual Fix

`.btn-secondary:disabled` 视觉修正维持 **IMPLEMENTED — REAL-DEVICE RECHECK PENDING**，本次未获得新的真机确认，状态不变。M3 从一开始就重用了这个已修正的规则，但这不构成"重新验证"——真正的验证仍然需要 CC 亲自在真机上看一次。

## N. Recommended Next Slice

建议下一次真机验证时，把 M1/M2/M3 一起测：确认 `.btn-secondary:disabled` 视觉修正本身生效（M2 遗留待办）、确认 M3 的 Developer Status 提交跟 Timeline 更新在真实环境下也如预期工作（M3 本身第一次真机测试）。如果 M3 真机验证顺利，M4（Rectification Event）是自然的下一步——它涉及一个 M2/M3 都还没处理过的新形态：Rectification Event 需要额外的表单欄位（eventType 选择、可能的 notes 文字），不是单纯的"选一个既有状态值"，UI 复杂度会比 M2/M3 高一些。
