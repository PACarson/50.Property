# Step 2 — BL-17（Defect Search/Sort）真机验证方案

**状态：设计完成，待 CC 在真实环境执行。此沙箱无对外网络，无法自行呼叫真实 GAS——不会用代码核对结果冒充这里要求的真机验证。**

## 0. 现状核对（重新读现在的代码，不是从 checkpoint/报告叙述推论）

重新读了 `948_MobileConsole.html`（`defectMatchesQuery_`/`compareDefectsByItemId_`/`filterAndSortDefects_`/`applyDefectSearchAndSort_`/`setupDefectSearch_`/`renderDefectListCards_`）与 `DlpMobileConsole_UIContract.md` §12（line 270：`Defect List Search / Sort | read-only, client-side | IMPLEMENTED — REAL-DEVICE VERIFICATION PENDING | BL-17`）。确认现状：

- 元素 ID：搜寻框 `ov_searchInput`、清除钮 `ov_searchClearBtn`、排序钮 `ov_sortAZ`/`ov_sortZA`、结果计数 `ov_resultCount`、列表容器 `ov_defectList`
- 搜寻是 `input` 事件（每个按键都触发 `applyDefectSearchAndSort_`），排序钮是**可再按一次取消**的 toggle（不是三选一互斥单选）
- 全程只操作已经载入的 `state.allDefects`（一次性从 `dlp_getCaseOverview` 取得），搜寻/排序代码路径里没有任何 `google.script.run` 呼叫——这是代码层面能确认的，但仍需下面 D 节实际观察证实，不能只靠这段代码审查就打勾
- UI Contract 本身**没有**逐条规定搜寻语意细节（大小写、栏位范围等）——这些定义在 BL-17 的 backlog/implementation 报告与代码注释里，不是正式 Contract 条文，如实说明这个区别

## 1. 已经被本地/静态覆盖的部分（这次真机验证不重复测这些，只补它们测不到的）

`local_precheck_test_948_search.js`（29 项断言，真的执行，不是纯代码审查）已覆盖 SEARCH-01 到 SEARCH-17：精确/部分 ItemID 匹配、Category/Location/Description/Remark 匹配、大小写不敏感、单/多关键字 AND、无匹配、空查询、不搜 CaseID、数字自然排序（2 排 10 前面）、英数混合自然排序（DEF-2 排 DEF-10 前面）、Z-A 反向、空 ItemID 排序、search+sort 两种组合顺序、全list排序、不产生 mutation、defectId 保真。SEARCH-18/19/20（无 per-keystroke RPC、无直接 Sheet 存取、M1/M2/M3 函式本体逐字未动）已用 grep 静态核对确认。

这份方案要补的，是这 29 项**测不到**的：真实浏览器里的实际 UI 行为、真实资料的实际格式/数量、真机上的实际观察证据（不是代码审查的逻辑推论）。

---

## A. Search（真机操作，用真实 Case 的真实 defect 清单）

1. 打开 Mobile Console，进入一个真实 Case 的 Defect 列表，记录：这个 Case 实际有几个 DefectItem。
2. **空 search**：确认一开始（还没打字）显示完整清单，计数文字是"N defects"（不是"Showing X of Y"）。
3. **搜 ItemID**：挑一个真实存在的 ItemID 打进搜寻框，确认对应 defect 出现、其他不含这个字串的不出现。
4. **搜 description / 其他可搜栏位**：挑一个真实 defect 的 description 或 remark 里的字词搜，确认命中。
5. **partial match**：只打完整关键字的一部分，确认一样能命中。
6. **大小写不敏感**：同一个关键字改用大写/混合大小写再搜一次，确认结果一样（如果这次真实操作跟本地 29 项断言的结论不一致，那是需要立刻记录的异常，不是预期内行为）。
7. **no-result**：打一个确定不会命中任何 defect 的字串，确认列表清空、有清楚的"no match"提示，不是空白或报错。
8. **clear/reset**：点清除钮，确认恢复完整清单、搜寻框清空、清除钮本身也应该跟着隐藏。

## B. Sort（真机操作）

1. **ItemID 自然数字排序**：如果这个真实 Case 的 ItemID 真的是数字或数字开头，点 A-Z，肉眼确认真的是 1、2、10、11...這種自然順序，不是字串排序会跑出来的 1、10、11、2 这种错误顺序——这一步的价值正是本地测试的合成资料（1,2,5,10）可能刚好没有真实资料里更容易暴露这个问题的两位数/三位数混合情况。
2. **ascending / descending**：A-Z 点一次，再点 Z-A，确认方向确实相反。
3. **再按一次取消排序**：确认设计好的 toggle 行为（同一个按钮再按一次回到未排序原始顺序）在真机上真的如此，而不是只能三选一互斥。

## C. Search + Sort 交互

1. **Search → Sort**：先搜出一个子集，再点排序，确认排序只作用在筛选后的子集上，不会跑出被筛掉的项目。
2. **Sort → Search**：先排序，再搜，确认结果集合正确、且（如果契合当下的排序模式）顺序维持。
3. **清除 search 后 sort 状态**：确认这时候 sort 状态照现有设计维持不变（`filterAndSortDefects_` 设计上排序模式跟查询字串是两个独立状态），不会意外被重置。
4. 全程确认：不重复、不遗漏——如果知道这个 Case 总共有几个 defect，可以直接用总数核对每一种筛选/排序组合下数字对不对。

## D. Regression（这是本次唯一需要专门设计来证明"没有副作用"的部分，不能只靠代码审查）

1. **M1**：从一个经过搜寻/排序后的筛选结果里点一张卡片，确认打开的是正确的那个 defect 的 Detail（不是索引错位指到别的 defect）。
2. **M2**：从这样进入的 Detail 提交一次 Owner Verification，确认跟之前验证过的行为完全一致。
3. **M3**：同样方式确认 Developer Status 提交正常。
4. **Search/Sort 不修改 Truth Layer、不产生 Domain Event、不产生 Timeline noise**——这条不能靠"代码里没看到 RPC 呼叫"就打勾，需要真的观察：记录做 D.1-D.3 之前 PropertyCaseTimeline 的行数，先只做一连串 search/sort 操作（不提交任何 M2/M3），确认 Timeline 行数完全没变；**然后**才做一次 M2 或 M3 提交，确认这时候才增加、且只增加 1 笔——这样能干净地把"search/sort 本身零副作用"跟"M2/M3 提交按预期产生 1 笔"分开证明，不会混在一起。

## E. Performance / Projection Sanity（如实记录数字，不是通过/失败判定）

- 实际 DefectItem 数量：______
- 页面加载观感是否正常：______
- 打字搜寻时反应是否顺畅（每个按键都会重新渲染整个列表，defect 数量大的时候值得注意）：______
- 排序反应是否顺畅：______
- 有没有出现 timeout、RPC failure，或任何看起来像 N+1 的延迟：______

---

## 验证纪律（跟 Step 1 相同）

- 保留 Execution Log 截图/文字、UI 截图、实际记录数字（不是只回报"都过了"）
- 发现任何问题：Observe → classify → report，这里不现场扩大 scope 处理
- 这次明确不动：schema、918、922、EventBus、BL-18（不实施）、M4——除非发现的问题是**阻挡 BL-17 验证本身继续进行**的 blocker，否则一律记录、不当场处理
- 不为了让测试"看起来通过"而修改真实资料

## Step 2 Closure 状态（分开报告，只有实际 evidence 支持才打勾）

| 项目 | 状态 |
|---|---|
| Local Test | ✅ DONE——29/29 (`local_precheck_test_948_search.js`) + 947/918/922 (22/163/67) 不受影响，SEARCH-18/19/20 静态 grep 确认。这次沙箱重新执行确认过，不是引用旧数字。 |
| GAS Runtime Verification | BLOCKED — Production verification pending（等 CC 执行 A/B/C） |
| UI Verification | BLOCKED — Production verification pending（等 CC 执行 A/B/C 的真机操作部分） |
| Regression Verification | BLOCKED — Production verification pending（等 CC 执行 D） |
| Production Verification | BLOCKED — Production verification pending |
| Production Ready | 未评估——在 Production Verification 打勾前不适用 |

等 CC 贴回真实 Execution Log / 实际操作结果后，再逐项把上面表格改成实际状态，不会自动把其中一项打勾去推论另一项。
