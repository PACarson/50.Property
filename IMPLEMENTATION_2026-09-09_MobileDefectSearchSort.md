# Mobile DLP Console — Defect Search & A-Z/Z-A Sort — Report

## A. Scope

在 Case Overview 的 Defect List 上方新增搜寻框 + 排序切换。完全 read-side、完全 client-side，操作既有已载入的 `state.allDefects`，零新增 backend API。

## B. Search Fields

`itemId`、`category`、`subCategory`、`location`、`description`、`remark`——全部来自 `buildCaseOverviewForMobile_`（922，本次未改动）本来就已经回传的栏位，逐一核对过全部存在，没有一个需要额外抓取。刻意不搜：`caseId`、内部时间戳、`clientRequestId`、其他实作层级欄位。

## C. Search Semantics

大小写不敏感（两边都 `toLowerCase()`）；部分比对（`indexOf`，不要求完整词）；多关键字語意是"关键字之间 AND、单一关键字内跨栏位 OR"——每个关键字只要出现在（itemId/category/subCategory/location/description/remark 六者合并而成的）搜寻文本里任何位置就算命中，同一个 defect 要让全部关键字都命中才算符合，不要求两个关键字出现在同一个欄位。例如 "bathroom leak" 会命中 Location="Bathroom 1"、Description="Water leak" 的 defect，即使这两个词分别出现在不同栏位。

## D. Sort Semantics

**默认排序键**：ItemID，不是卡片标题用的 Location——ItemID 是 ADR-P19 定义的稳定 import/dedup identity，Location 只是显示用途，多个 defect 完全可能共用同一个 Location，不构成 identity，所以即使 Location 是卡片上看到的主标题，排序还是选 ItemID。A-Z＝以 `localeCompare(..., {numeric:true, sensitivity:'base'})` 升序，Z-A＝同一个比较函式的反向。这个设定同时处理大小写不敏感、跟"数字型 ItemID 要用数字大小比较而不是逐字元比较"（"2" 要排在 "10" 前面，不是逐字元比较后 "10" 排到 "2" 前面）——不需要事先知道真实资料是纯数字还是英数混合，两种都正确处理。空的 ItemID 排最前面。A-Z/Z-A 按钮设计成可以再按一次取消排序、回到原始（未排序）顺序，不是三选一互斥。

## E. Files Changed

| 档案 | 确切改动 | 原因 |
|---|---|---|
| `948_MobileConsole.html` | 新增搜寻框/排序切换/结果计数 CSS 与 HTML；`state` 新增 `allDefects`/`defectSortMode`；`renderOverview_` 改成把 `data.defects` 存进 `state.allDefects` 并呼叫 `applyDefectSearchAndSort_`（原本内联的卡片渲染逻辑抽成 `renderDefectListCards_`，逻辑本身逐字未变）；新增 `defectMatchesQuery_`/`compareDefectsByItemId_`/`filterAndSortDefects_`（三个刻意不碰 DOM 的纯函式）/`applyDefectSearchAndSort_`/`setupDefectSearch_` | 承载搜寻/排序全部逻辑 |
| `local_precheck_test_948_search.js` | 新建 | 948 第一个、也是第一个真的可执行（不是纯静态核对）的本地测试 |
| `00_Product_Backlog.js` | 新增 BL-17 | 记录本次实作 |
| `00_Project_State.js` | CHANGELOG 新增一笔 | 项目状态时序记录 |
| `00_File_Map.js` | 新增 `local_precheck_test_948_search.js` 说明条目 | 维持既有惯例——每个新测试档案都记录 |

`947_DlpConsoleServer.js`/`918_DefectEngine.js`/`922_DashboardAdapter.js`/Schema/`.claspignore`：**逐字未动**——新测试档案自动被上一轮加的 `local_precheck_test_*.js` wildcard 涵盖，跑过静态验证脚本确认过（见 F 节）。

## F. Architecture Impact

**918 未改动。947 未改动。922 未改动。Schema 未改动。** 全部改动集中在 948 一个档案，外加一个新的本地测试档案。这是这个任务能做到的最小 footprint——`buildCaseOverviewForMobile_` 本来就已经回传全部需要的栏位，完全不需要动到任何一层既有的 backend 代码。

## G. Tests

| 档案 | Passed | Failed | Skipped | 备注 |
|---|---|---|---|---|
| `local_precheck_test_948_search.js`（新建） | 29 | 0 | 0 | **真的可执行**——不是静态核对。把 948 的 `<script>` 读进最小 VM context 直接呼叫三个纯函式，含实际执行验证"2"排在"10"前面（证明数字感知排序真的生效） |
| `local_precheck_test_947.js` | 22 | 0 | 0 | 完全不受影响 |
| `local_precheck_test_918.js` | 163 | 0 | 0 | 完全不受影响 |
| `local_precheck_test_922.js` | 67 | 0 | 0 | 完全不受影响 |

29 项断言对应 SEARCH-01 到 SEARCH-17（纯逻辑部分）；SEARCH-18（无 per-keystroke RPC）、SEARCH-19（无直接 Sheet 存取）、SEARCH-20（M1/M2/M3 完整保留）三项透过 `grep` 静态核对确认（`google.script.run`/`SpreadsheetApp` 等关键字在相关代码区块零命中，M1/M2/M3 六个函式本体确认逐字未动）。

## H. M1/M2/M3 Regression

三者的函式本体（`openDefectDetail_`/`renderDefectDetail_`/`setupOwnerVerification_`/`submitOwnerVerification_`/`setupDeveloperStatus_`/`submitDeveloperStatus_`）逐字未被这次改动碰到——唯一相关的改动是 `renderOverview_` 内部的缺陷列表渲染方式，而 M1 的入口（点击卡片进入 Detail）用的是重构后的 `renderDefectListCards_` 里同一段 `card.addEventListener('click', function(){ openDefectDetail_(d.defectId); })`，逻辑跟改动前完全一致，只是现在可能显示的是筛选/排序过的子集，点击行为不变。947/918/922 测试数字（22/163/67）不受影响是这一点最直接的证据。

## I. Mutation Boundary

Owner Verification、Developer Status、Rectification Event、Evidence、Secondary Damage、Correspondence、Close/Reopen/Close Case——**全部没有被这次改动触碰**。`clientRequestId`/BL-13 idempotency 逻辑同样未被触及。这次是纯 read-side 功能。

## J. Real-Device Status

**REAL-DEVICE VERIFICATION PENDING**。本次没有做、也没有宣称做过真机测试。

## K. Governance

- `00_Product_Backlog.js`：新增 BL-17
- `00_Project_State.js`：CHANGELOG 新增一笔
- `00_File_Map.js`：新增 `local_precheck_test_948_search.js` 说明
- `00_ADR_Log.js`：未修改，没有新架构决定
- **Mobile UI Contract**：判断不需要修订——Defect List 本来就是 Contract §1 已核准的只读范围，这次只是同一份已核准资料的新浏览/筛选方式，没有新增任何写入能力、没有曝光 Secondary Damage/Correspondence，没有变动已核准的 scope 边界本身。这个判断本身在此明确记录，不是默默略过。

## L. Deployment

**NOT DEPLOYED**。

## M. Next Step

建议下次真机验证时把 Search/Sort 一併纳入（用真实的、数量比较多的 defect 清单实际测一次搜寻跟排序的操作手感，尤其是 ItemID 如果实际格式跟这次测试用的合成资料不完全一样，值得实际确认一次排序结果符合预期）。M4（Rectification Event）仍然是 mutation 序列里下一个自然的步骤，跟这次的 read-side 强化互不冲突，可以并行推进。
