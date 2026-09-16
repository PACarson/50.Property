# M4 Implementation Report — Rectification Event (Mobile), Option A

**READ → IMPLEMENT M4 Option A only → LOCAL TEST → REPORT → STOP. 完成到此为止，未执行 real GAS verification、未宣告 Production Ready、未进入 Repair Cycle、未实施 BL-18、未修 945，等待人工审阅。**

---

## 1. Files Changed

- `948_MobileConsole.html`：唯一有实质新代码的档案。四处改动，全部集中在既有 Defect Detail view 内：
  1. HTML：在既有 `<div id="dd_rectEvents"></div>`（唯读历史清单）之后、`<h3>Evidence</h3>` 之前，新增一个区块——7 个 EventType chip（`#re_chips`）、一个可选 Notes `<textarea>`（`#re_notes`，逐字复用 Daily Check 既有的 `.field`/`textarea` 样式，未新增任何 CSS）、一个 Submit 按钮（`#re_submitBtn`，复用既有 `.btn-secondary`）、一行状态文字（`#re_status`）。
  2. `openDefectDetail_`：新增 4 行状态重置（`rectificationEventTypeSelected`/`rectificationEventClientRequestId` 归零、chip 视觉清除、Submit 按钮 disable、Notes 栏位清空），紧接在既有 M2/M3 的对称重置之后，同一种"每次打开 Detail 都是干净边界"纪律。
  3. Init 序列：新增一行 `setupRectificationEvent_();`，紧接在 `setupDeveloperStatus_();` 之后。
  4. 新增两个函式 `setupRectificationEvent_()`/`submitRectificationEvent_()`，逐字比照 `setupOwnerVerification_()`/`submitOwnerVerification_()` 的 chip-then-submit 结构（选取只更新 state、Submit 才真的呼叫；呼叫中 disable 按钮与 chip pointer-events；成功后清空 clientRequestId 并整个重新拉取 Detail；失败时保留 clientRequestId 以便原样重试）。

- `local_precheck_test_948_rectification.js`：新建。27 项断言。

- `00_Product_Backlog.js`：新增 BL-19（记录本次实作范围、边界、测试结果）。
- `00_Project_State.js`：CHANGELOG 新增一笔。
- `DlpMobileConsole_UIContract.md`：§12 状态表新增一行（Rectification Event，状态 `IMPLEMENTED — LOCAL VERIFIED — GAS VERIFICATION PENDING`）。

## 2. Files NOT Changed（逐项确认）

- **918_DefectEngine.js**：逐字未动。`logRectificationEvent` 未重写、未重构，163 项既有测试全部原样重跑通过。
- **922_DashboardAdapter.js**：逐字未动。922 早就在读 RectificationEvent 做 Dashboard "即将到来"聚合，M4 多一个写入来源不需要它有任何变化。
- **945_OperatorConsole.html**：逐字未动。Architecture Gate 发现的"945 现有 Rectification Event 表单本身不送 clientRequestId"这个既有缺口，本轮如实记录、明确不处理。
- **BL-18**：逐字未动，仍是 `REGISTERED — NOT IMPLEMENTED`。
- **Repair Cycle schema**：不存在，本轮也没有建立。ADR-P15 的既有 decision 未被修改。
- **947_DlpConsoleServer.js**：逐字未动——`dlp_addRectificationEvent` 已经支援本次需要的一切（含 clientRequestId 转传），不需要新代码。
- **903_PropertyEventDefinitions.js / 900_PropertyConfig.js / 901_PropertySchema.js**：逐字未动——`RECTIFICATION_EVENT_LOGGED`、7 个 `RECTIFICATION_EVENT_TYPES`、Schema 栏位全部已经存在，没有新增任何 Event Type 或栏位。

## 3. Implementation Summary

M4 = 给既有、已验证的 `logRectificationEvent`（918）/`dlp_addRectificationEvent`（947）建一个 Mobile 呼叫入口。用户操作路径完全比照 Authorization 给的顺序：Select Defect（既有 M1）→ Select Rectification Event Type（新 chip）→ Optional Notes（新栏位）→ Submit → 生成 clientRequestId → 既有 mutation → success（清空 clientRequestId、重新拉取 Detail）/ duplicate replay（既有快取机制处理，UI 端感知不到差异，跟第一次成功看起来一样）/ error（保留 clientRequestId、允许原样重试）。

## 4. Idempotency Implementation

沿用 918 既有的 `getCachedDefectEngineCommandResult_`/`cacheDefectEngineCommandResult_`，没有新增第二套机制。948 端新增的是"生成并正确传递"这一层，跟 M2/M3 逐字同一个 `generateClientRequestId_()`、同一个"同一次尝试的重试沿用同一个 ID，成功后清空、下一次全新尝试才重新生成"生命周期。First/Duplicate request 的行为跟 Authorization 第 6 节描述的完全一致（已由既有 918/947 测试套件与本次新测试共同确认，见下）。

## 5. Local Test Results（本次实际重新执行，非引用旧数字）

| 套件 | 结果 |
|---|---|
| `local_precheck_test_918.js` | 163/163（零回归） |
| `local_precheck_test_947.js` | 22/22（零回归，含既有的 Rectification Event clientRequestId 去重测试） |
| `local_precheck_test_948_search.js` | 29/29（零回归） |
| `local_precheck_test_948_rectification.js`（新建） | 27/27 |

## 6. New M4 Tests（`local_precheck_test_948_rectification.js`，27 项）

- **M4-01（有效提交）**：一次代表性提交（`AccessGranted` + Notes），确认成功且 Notes 栏位端到端保真。
- **M4-02（每种 EventType）**：Node 实际逐一透过 `dlp_addRectificationEvent` 提交全部 7 种 EventType，全部成功，且产生 7 笔互不冲突的独立记录——这是既有 918/947 测试都没做过的（既有测试只用单一 `RectificationStarted` 验证机制本身）。
- **M4-03/M4-04（缺栏位/无效 DefectID 拒绝）**：未新写——已经是 `local_precheck_test_918.js` Phase 7 既有覆盖范围（`caseId required`/`unknown eventType rejected`/`unknown defectId rejected`/`defect belonging to a different case rejected`/`unknown Source rejected`），本次沿用既有覆盖，重新跑过确认仍然通过。
- **M4-05/M4-06（clientRequestId 生成/实际传递）**：对 `948_MobileConsole.html` 原始碼做静态核对（这个档案没有 DOM 可执行，跟既有 SEARCH-18/19/20 是同一种方法论）——确认 `submitRectificationEvent_` 内确实调用 `generateClientRequestId_()`，且呼叫 `dlp_addRectificationEvent` 时确实带上 `clientRequestId: state.rectificationEventClientRequestId`。
- **M4-07（呼叫端不产生重复 mutation）**：未新写——已经是 `local_precheck_test_947.js` 既有覆盖范围（相同 clientRequestId 重复呼叫 `dlp_addRectificationEvent`，确认只产生 1 笔记录），本次沿用既有覆盖，重新跑过确认仍然通过。M4 用的是完全相同的 947/918 路径，没有理由需要重新证明同一件事。
- **M4-08（M1/M2/M3 回归）**：既有三套件零回归（见上表），另外新增两条静态"呼叫形状未被误动"回归防线，专门防范未来编辑此档案时不小心动到 M2/M3 的呼叫参数。
- **M4-09（无关 UI 无回归）**：本次改动严格限缩在 Detail view 内新增区块 + `openDefectDetail_`/init 序列各一行改动，未触及 948 其他任何 view（Overview/Daily Check/Search-Sort UI）；静态核对确认没有从 client script 直接呼叫 918 层的 `logRectificationEvent`（必须走 947 wrapper）。

## 7. Known Gaps（如实记录，本次不处理）

- **945 既有的 clientRequestId 缺口**（Architecture Gate 已发现）：945 的 Rectification Event 表单本身不生成/传递 clientRequestId，跟 BL-18（Evidence）是同一种模式的另一个独立缺口，本次未处理、未扩大 BL-18 范围。
- **ADR-P15 已知的 Repair Cycle 局限**：多次 Rectification Event 无法在系统里被归类成"第几次维修尝试"，M4（Option A）不会让这个既有局限变得更糟，但也没有解决它——跟 Architecture Gate 的结论一致，本次没有触碰。
- **Mobile 表单没有暴露 945 现有表单的全部栏位**（ContractorCompany/ContractorPersonnel/EntryTime/ExitTime）：本次判断这些是 Desktop/Sidebar 场景更常用的栏位，Mobile 端"最小可用"先只做 EventType + Notes，其余栏位维持后端可选、不在 UI 强制暴露——这是设计取舍，不是遗漏，如果 CC 认为需要，之后可以再加，后端已经支援。

## 8. Governance Updates

- `00_Product_Backlog.js`：新增 BL-19。
- `00_Project_State.js`：CHANGELOG 新增一笔，指向 BL-19。
- `DlpMobileConsole_UIContract.md`：§12 状态表新增一行，状态严格使用 `IMPLEMENTED — LOCAL VERIFIED — GAS VERIFICATION PENDING`。
- **`MANUAL_VERIFICATION_CHECKLIST.md`：本次刻意未新增条目**——这份档案既有的每一笔记录都是"真实 GAS 验证已经发生"之后才写的（比照 BL-17 Search/Sort 直到真机测试通过才补上段落），M4 目前只有 Local Verified，还没有真机证据，提前写一个全是 PENDING 的段落不符合这份档案的既有惯例；等真机验证真的执行完，会在那时候一次补上，不是遗漏。
- **未创建新 ADR**：延伸既有、已核准的 M2/M3 模式，没有新架构决策，跟 Architecture Gate 第 11 节的判断一致。

## 9. Production Verification Checklist（准备好，尚未执行）

**A — 首次提交**：挑一个真实 DefectID，选一个 EventType（建议先用 `AccessGranted` 或任一非 `RectificationStarted` 的类型，避免跟历史上任何 945 测试资料混淆），可选填 Notes，Submit。记录：DefectID、EventType、生成的 clientRequestId（可从浏览器 DevTools 或 Apps Script Execution Log 里看到）、回传结果（含 EventID/`rectificationEventId`）、Timeline before、Timeline after。确认 **Timeline +1**。

**B — 相同 clientRequestId 重复提交**：不透过 UI 重新点（UI 成功后会清空 clientRequestId），改用 Apps Script 编辑器直接呼叫 `dlp_addRectificationEvent`，带上跟 A 完全相同的 clientRequestId 与参数。确认：回传结果与 A 逐位相同（同一个 EventID）、Timeline **+0**、Evidence/Sheet 没有新增第二笔记录。

**C — 新 clientRequestId**：透过 UI 正常操作一次新的提交（自然会拿到一个新的 clientRequestId）。确认：产生新的 EventID、新的记录、Timeline **+1**。

**D — M1/M2/M3 回归**：确认 Defect Detail 展开、Owner Verification 提交、Developer Status 提交，在这次改动之后，操作起来跟之前完全一样。

**证据标准**：每一项都要记录实际数字/实际 ID，缺的标记 `NOT RECORDED`，不要用"看起来正常"代替。

## 10. Current Status

**IMPLEMENTED — LOCAL VERIFIED — GAS VERIFICATION PENDING.**

不使用、也不适用：Production Verified / Production Ready / Released——在拿到 A-D 的真实 GAS evidence 之前，这些状态都不成立。

完成后停止，等待人工审阅。
