# DLP Mobile Field Console — Retry-Safety Foundation — Implementation Report

## 1. Implementation Summary

在 918 Domain 层为 `recordDeveloperStatus`/`recordOwnerVerification` 加上 `clientRequestId` 支援（一字不改地复用既有 `getCachedDefectEngineCommandResult_`/`cacheDefectEngineCommandResult_` pattern），并在 947 Bridge 层让四个 wrapper（Developer Status/Owner Verification/Rectification Event/Evidence）正确转传这个欄位。新建 `local_precheck_test_947.js`（947 有史以来第一个本地测试档案）专测 Bridge 转传行为，`local_precheck_test_918.js` 新增 16 项 idempotency 断言。Secondary Damage 未动——检查过其既有行为无恙，不属于本次范围。未做任何 Mobile UI 工作。未写入真实 GAS 专案（本沙箱无部署权限）。

## 2. Repository State Before Change

Baseline（修改前实际执行，非假设）：`local_precheck_test_918.js` 147/147 全过；`local_precheck_test_922.js` 67/67 全过；`local_precheck_test_911.js` 在 `getEvidenceRootFolder_` 因 `PropertiesService is not defined` 崩溃（GasShim 未 mock，pre-existing，BL-11 邻近的已知缺口）；947 无任何本地测试档案存在。`recordDeveloperStatus`/`recordOwnerVerification`（918）当时完全没有 `clientRequestId` 参数或快取逻辑；947 的 `dlp_recordDeveloperStatus`/`dlp_recordOwnerVerification` 不传这个欄位；`dlp_addRectificationEvent`/`dlp_attachDefectEvidence` 对应的 918/911 Command 早就支援 `clientRequestId`，但这两个 wrapper 同样没转传。

## 3. Files Changed

| 档案 | Before | After | 目的 |
|---|---|---|---|
| `918_DefectEngine.js` | `recordDeveloperStatus`/`recordOwnerVerification` 无 clientRequestId | 两者最前面加 cache-check、成功后加 cache-write，docstring 同步更新 | 让这两个 mutation 具备重试安全性 |
| `947_DlpConsoleServer.js` | 4 个 wrapper 都不转传 clientRequestId；旧注解写"刻意不传" | 4 个 wrapper 都转传；注解改为如实反映现况 | 让 Bridge 层不再是转传路径上的断点 |
| `local_precheck_test_918.js` | 147 项断言 | 新增 16 项（尾端新增一个测试区块） | 验证 918 的 idempotency 机制本体，含跨 Command cache-key 碰撞的既有特性记录 |
| `local_precheck_test_947.js` | 不存在 | 新建，13 项断言 | 947 有史以来第一份本地测试，专测 Bridge 转传行为，不是重测 918 |
| `00_Product_Backlog.js` | 12 项（BL-1~BL-12） | 新增 BL-13 | 记录本次分析、决定、实作、验证的完整过程 |
| `00_Project_State.js` | CHANGELOG 最新一笔 2026-09-04 | 最前面新增 2026-09-06 一笔 | 项目状态时序记录 |
| `00_File_Map.js` | test 档案说明区块只到 2026-08-26 | 新增两段 2026-09-06 记录 | 记录新档案存在、更新目前实测数字（不改写历史那行） |

## 4. Domain Changes

`recordDeveloperStatus(input)`：签名不变（仍是单一 `input` object），行为新增——`input = input || {};` 之后立即：
```js
if (input.clientRequestId) {
  var cached = getCachedDefectEngineCommandResult_(input.clientRequestId);
  if (cached) return cached;
}
```
函数结尾从 `return { success: true, ... };` 改为：
```js
var result = { success: true, defectId: input.defectId, developerStatus: input.developerStatus };
if (input.clientRequestId) cacheDefectEngineCommandResult_(input.clientRequestId, result);
return result;
```
`recordOwnerVerification(input)` 结构完全对称（欄位换成 `ownerVerificationStatus`）。两者中间的 state-machine 逻辑（`assertDefectItemNotClosed_`、`deriveDefectItemStatus_`、Independence guarantee 不互相污染对方欄位）一行未动。

## 5. Idempotency Mechanism

复用既有 `getCachedDefectEngineCommandResult_`/`cacheDefectEngineCommandResult_`（`CacheService.getScriptCache()`，key 前缀 `propertyos_idem_defect_`，TTL 3600 秒）。同一个 `clientRequestId` 第二次呼叫时，cache-check 在**任何验证或 Sheet 存取之前**就短路返回第一次的结果，因此第二次呼叫完全不会执行到 `appendCaseTimelineEntry_`，Timeline 不会重复。**注意（如实记录，非隐藏）**：这个 cache key 命名空间是全部 Defect Engine Command 共用、不分函数各自独立（`addDefectItem`/`logDailyProgressCheck`/`logRectificationEvent`/`logSecondaryDamage` 早就是这样），本次新增的两个函数延续同一个既有特性，不是本次引入的新行为，也不是本次要解决的问题——已用一个专门测试记录这个特性（见 8 节）。

## 6. Bridge Changes

`dlp_recordDeveloperStatus`/`dlp_recordOwnerVerification`：object literal 里加一行 `clientRequestId: input.clientRequestId || undefined`。`dlp_addRectificationEvent`/`dlp_attachDefectEvidence`：同样加一行转传；两者所在的注解区块同步更新（原本写"刻意不传"，现在写明已经转传、原因、跟 945 现有的按钮防连点双重保护的关系）。`dlp_addSecondaryDamage` 未改一个字。

## 7. Schema Impact

**Schema unchanged because idempotency is implemented at the existing Domain command/event layer.** `clientRequestId` 完全活在 `CacheService`（1 小时后自动过期），没有写进任何 Sheet 栏位——核对过 `DailyProgressCheck`/其他既有 schema 都没有 `ClientRequestID` 这种栏位，这次也一样不需要。

## 8. Local Tests

- `local_precheck_test_918.js`：**163/163 全过**（147 原有 + 16 新增：DeveloperStatus 首次成功/重试返回相同结果/重试不重复 Timeline/不同 ID 是合法新操作/不同 ID 确实多写一笔/无 ID 仍向下相容/无 ID 仍正常写 Timeline 共 7 项；OwnerVerification 对称 7 项；跨 Command cache-key 碰撞既有特性记录 2 项）。
- `local_precheck_test_947.js`（新建）：**13/13 全过**——DeveloperStatus/OwnerVerification/RectificationEvent/Evidence 四者的 Bridge 转传各 3 项检查（首次成功、重试拿到 cache 结果、无重复记录），加 SecondaryDamage 未受影响 1 项确认。

## 9. Regression Tests

修改后重新实际执行（非假设不受影响）：`local_precheck_test_922.js` **67/67 全过**，与修改前一致。`local_precheck_test_911.js` 维持跟修改前**一模一样**的 `PropertiesService is not defined` 崩溃（pre-existing，未变好也未变坏）。`local_precheck_test_phase11_schema_migration.js` **71/71 全过**；`local_precheck_test_phase11_schema_consolidation_migration.js` **38/38 全过**；`local_precheck_test_phase11_defectitem_reorder_migration.js` 维持既有失败（"new header matches CC-specified order exactly"不过，随后抛错）——核实过这是 901 schema 自 2026-08-26 起演进导致的既有、跟本次 clientRequestId 改动毫无关联的失败（这个档案本身测的是 DefectItem 欄位排序的一次性 migration script，本次完全没碰欄位排序），归类为 pre-existing，未去动它。所有 7 个受检测试档案的改动前/改动后行为差异，只出现在 918（预期新增 16 项通过）；其余六个档案结果逐一比对完全一致。

## 10. Real GAS Verification

**BLOCKED** — 此 Claude 沙箱的网路 egress 被设定为关闭（`bash_tool` 的 network_configuration 明确显示 `Enabled: false`），无法 `clasp push` 或以任何方式连到真实 Google Apps Script 专案。证据：本报告第 9 节列出的全部验证都只能在 Node + GasShim 本地环境完成。需要 CC 在真实专案里手动套用后自行验证。

## 11. Real Device Verification

**NOT APPLICABLE FOR THIS SLICE** — 本轮未实作、也刻意不实作任何 Mobile UI（Owner 的 Approved Scope 明确排除）。没有可以在真机上操作的新界面。

## 12. Gaps Discovered

**Pre-existing（本次之前就存在，非本次引入）**：
- `local_precheck_test_911.js` 的 `PropertiesService` 未 mock 缺口（BL-11 邻近议题）——本次确认崩溃点、崩溃讯息跟修改前逐字相同。
- `local_precheck_test_phase11_defectitem_reorder_migration.js` 因 901 schema 在 ADR-P19 之后演进而无法完整重跑——该档案自己的标头本来就已经记录这件事，本次重新确认现况不变。
- clientRequestId 的 cache key 命名空间是全部 Defect Engine Command 共用（不分函数），`addDefectItem`/`logDailyProgressCheck`/`logRectificationEvent`/`logSecondaryDamage` 早就是这样——本次延续同一特性到另外两个函数，不是新问题，只是范围变大了一点。实务上不构成风险，因为 948/945 端产生 `clientRequestId` 用的是 `crypto.randomUUID()`（近乎不可能碰撞），但如实记录这个机制本质。
- 918 内部一处旧 docstring 提到"997_Tests_DefectEngine.js scenario 9"——检查过 repository 里根本没有这个档案（可能是命名沿革中的历史遗留引用，也可能是从未真正建立过的规划）。跟本次任务无关，未去动它，只在此如实记录发现。

**Introduced by this slice**：无——163+13 项测试全过，未发现本次改动本身引入的新问题。

**Newly discovered but deferred**：无额外发现需要 CC 决定优先级的新缺口。

## 13. Governance / Backlog Changes

- `00_Product_Backlog.js`：新增 BL-13，完整记录本次分析、Owner 核准的决定、实作细节、验证结果、明确排除的范围。
- `00_Project_State.js`：CHANGELOG 最前面新增 2026-09-06 一笔，涵盖 Upgrade Proposal → Decision Gate → 本次实作三阶段的摘要。
- `00_File_Map.js`：test 档案说明区块新增两段 2026-09-06 记录——一段说明 `local_precheck_test_947.js` 的存在与用途，一段更新目前实测数字（保留 2026-08-26 那行历史数字不动，新增一行反映现况，避免改写历史记录）。
- `00_ADR_Log.js`：**未修改**。判断这不构成新的 architectural decision（延伸既有 clientRequestId pattern 到另外两个函数，没有引入新的设计语言），依 Owner 指示"如果需要新 ADR 请先 STOP"，本报告在此明确说明这个判断本身，而不是默默不提。
- `DlpMobileConsole_UIContract.md`：**未修改**——本次改动完全在 918/947，还没有任何 Mobile 使用者看得到，Contract 修订留到真正曝光给 Mobile UI 的那一轮。

## 14. Current Status

- 918/947 代码改动：**implemented + unverified**（本地测试全过，真实 GAS 环境未验证——不满足"complete"的门槛，如实使用这个分类）。
- 新增/扩充的本地测试：**implemented + verified**（真的用 Node 跑过，163/13 项全部通过，不是只读代码）。
- Secondary Damage：**未变动，确认既有行为无恙**（不属于 implemented/deferred/blocked 任一类，是刻意不碰）。
- Mobile Defect Detail UI 及其余四项动作 UI：**not started**（依 Owner 范围刻意不做）。
- 治理档案更新（Backlog/Project State/File Map）：**implemented**，本报告本身就是记录来源。

## 15. Recommendation for Next Slice

（仅建议，不实作）下一步可以考虑 Mobile Defect Detail MVP——把这次已经具备 retry-safety 的 Developer Status/Owner Verification，加上原本就有 clientRequestId 支援、这次补上转传的 Rectification Event/Evidence，实际曝光到 948 的新 Defect Detail view，对应先前 Idempotency Decision Gate 报告里 Slice M1-M5 的顺序。真正开始前，建议先请 CC 确认本次交付的 918/947/两份 local test 档案是否已经套用到真实专案，因为 Mobile UI 那一轮会直接依赖这次的 clientRequestId 支援是否真的在真实环境生效，而不是只在本地测试里验证过。
