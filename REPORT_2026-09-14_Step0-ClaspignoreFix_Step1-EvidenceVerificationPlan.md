# 2026-09-14 执行报告

新窗口从 `CHECKPOINT_2026-09-11_DLPMobileFieldConsole-FullWindowAudit-Handoff.md` 重新开始。CC 核对本窗口对上传 zip 的独立验证结果后，授权按 Step 0 → Step 1 → Step 2 → Step 3/4/5 的顺序执行，每步完成后先报告 evidence 再继续。本报告涵盖 Step 0（完成）与 Step 1（分析与执行方案完成，实际执行 BLOCKED）。

---

## Step 0 — Deployment Safety Blocker：`.claspignore` 修正

**状态：完成**

### 发现（非本次新发现，CC 已在上一轮确认；此处仅重申作为本次修正的依据）
上传 zip 里的 `.claspignore` 缺少 `local_precheck_test_*.js` 这行 wildcard，但 `00_Product_Backlog.js` 的 BL-13 Addendum 1 与 `CHECKPOINT_2026-09-11...md` 都叙述这行已经在 2026-09-06 加上。Governance 记录与实际档案内容不一致。这 8 个 local precheck test 档案顶层都有 `require('./GasShim.js')`（Node 专属语法），整批 `clasp push` 会让真实 GAS 专案所有函式跑不动。

### 变更的档案
1. `.claspignore` — 唯一的实质性修正
2. `00_Product_Backlog.js` — BL-13 新增 Addendum 2（governance 一致性记录，不影响任何 runtime 行为）
3. `00_Project_State.js` — CHANGELOG 新增 2026-09-14 条目（同上，纯记录）

### 加入的确切规则
在 `.claspignore` 现有的「# Node js test run」区块末尾（`TestKit.js` 之后）新增：
```
# Local precheck tests (Node-only, top-level require()) — 2026-09-06, re-applied 2026-09-14
local_precheck_test_*.js
```
其余 23 行原有内容逐字未动（含那 7 个已不存在、但列在里面无害的旧 Node 沙箱档名——这些不属于本次范围，未处理）。

### 涵盖的档案（8 个，不是 7 个）
```
local_precheck_test_911.js
local_precheck_test_918.js
local_precheck_test_922.js
local_precheck_test_947.js
local_precheck_test_948_search.js
local_precheck_test_phase11_defectitem_reorder_migration.js
local_precheck_test_phase11_schema_consolidation_migration.js
local_precheck_test_phase11_schema_migration.js
```
BL-13 Addendum 1 写「7 个」是 2026-09-06 当时的正确数字；`local_precheck_test_948_search.js` 是 2026-09-09 才新建，比 Addendum 1 晚。改用 wildcard 而非条列档名，本来就是为了让这种情况不需要回来改 `.claspignore`——这次验证只是确认这个设计确实如预期生效，不是 wildcard 本身有缺陷。

### 部署排除证据（独立撰写、跑完即删除的静态验证脚本，手法与 2026-09-06 相同）
脚本把 `local_precheck_test_*.js` 转成等价 regex（`^local_precheck_test_[^/]*\.js$`，无 `/` 的 pattern 在 gitignore 语义下就是全档名比对），拿 repository 里全部现存档名实测，而不是假设：

```
Pattern under test: local_precheck_test_*.js => /^local_precheck_test_[^/]*\.js$/

Files matched by the new wildcard (8):
  MATCH    local_precheck_test_911.js
  MATCH    local_precheck_test_918.js
  MATCH    local_precheck_test_922.js
  MATCH    local_precheck_test_947.js
  MATCH    local_precheck_test_948_search.js
  MATCH    local_precheck_test_phase11_defectitem_reorder_migration.js
  MATCH    local_precheck_test_phase11_schema_consolidation_migration.js
  MATCH    local_precheck_test_phase11_schema_migration.js

Check 1 — every local_precheck_test_* file is covered: PASS
Check 2 — nothing outside that family matches: PASS
Check 3 — no runtime/domain file (900-999 numbered) accidentally matches: PASS
```
脚本执行后已删除（`_verify_claspignore_wildcard.js`，不在这份 repository 里）。

### 执行的检查
- 全档名清单实测（不是抽样、不是假设 8 个应该都命中）
- 反向检查：确认没有任何非 test 档案（含 900-999 编号的 runtime/domain 档案）被误伤
- 人工核对 `.claspignore` 其余 23 行逐字未变

### Governance 一致性更新
- `00_Product_Backlog.js`：BL-13 Addendum 2（记录这个 governance/reality 落差、修正内容、验证结果；未调查落差本身的成因——例如修正是否只套用到真实 GAS 专案、没有同步回被打包进这份 zip 的来源——如实标注待查）
- `00_Project_State.js`：CHANGELOG 新增 2026-09-14 条目，指向 BL-13 Addendum 2

---

## Step 1 — Evidence 真机验证：代码分析 + 执行方案

**状态：分析与方案完成；实际执行 BLOCKED — Production verification environment unavailable（此沙箱无对外网络，无法呼叫真实 GAS/Drive/Sheets）**

### 实际调用路径（已重新读代码确认，不是从 checkpoint 描述推论）
CC 原本设想的路径是 948 UI → 947 → **918** → Drive/Evidence。实际重新追踪后，Domain 层落在 **911_DocumentEngine.js**，不是 918：

```
945_OperatorConsole.html (Sidebar, submitDlpAddEvidence)
  → google.script.run.dlp_attachDefectEvidence({ defectId, evidenceType, phase,
      description, base64Data, fileName, mimeType })   ← 不含 clientRequestId
  → 947_DlpConsoleServer.js: dlp_attachDefectEvidence(input)
  → 911_DocumentEngine.js: attachEvidence({ ..., clientRequestId: input.clientRequestId })
```

### 关键澄清：这次真正未验证的范围比表面看起来窄
`dlp_attachDefectEvidence`（Sidebar，附件到指定 Defect，完整 EvidenceType/Phase）与 `dlp_attachEvidence`（Mobile Daily Check，固定 Photo/NotApplicable）是**两个不同的 947 wrapper**，都调用同一个 911 `attachEvidence()`：

| | `dlp_attachDefectEvidence`（945 Sidebar） | `dlp_attachEvidence`（948 Mobile Daily Check） |
|---|---|---|
| clientRequestId 由 UI 送出？ | **否**——945 的实际调用完全没有这个栏位，靠 submit 按钮 disable 当第一道防线 | **是**——948:543 呼叫时明确带 `clientRequestId: generateClientRequestId_()` |
| 本次窗口是否改动？ | 是（2026-09-06，vertical slice 2，wrapper 原本不转传） | 否（注解标注「911, unchanged」） |
| 真机验证状态 | **从未有真实执行验证过 clientRequestId 这条路径** | 属于 Mobile Console 原始 4 个函式之一，早于本窗口即为 PRODUCTION-READY |

也就是说：Evidence 附件本身（Drive 上传、Sheet 写入、Timeline 事件）早在 2026-08-17 就有真实 GAS/真实 Drive 的完整验证记录（见 `MANUAL_VERIFICATION_CHECKLIST.md` 第 45-49 行，含真实 Drive 资料夹网址、真实档案网址）。**真正从未被真实环境验证过的，precisely 是：`dlp_attachDefectEvidence` 这个 wrapper 转传的 `clientRequestId`，在真实 GAS 里能不能正确触发 911 的去重逻辑。** 而目前唯一实际在用的呼叫者（945 Sidebar）根本不会送这个栏位，所以就算什么都不做，这条路径在真实使用中也不会被意外验证到。

### Dedup 机制（读自 911_DocumentEngine.js 原始碼，非推测）
```js
function attachEvidence(input) {
  return withDocumentEngineLock_(function () {
    input = input || {};
    if (input.clientRequestId) {
      var cached = getCachedDocumentEngineCommandResult_(input.clientRequestId);
      if (cached) return cached;   // ← 命中时原样回传第一次的结果，不重新验证、不重新写入
    }
    ...
    evidenceSheet_().appendRow(...);
    try { appendCaseTimelineEntry_(..., 'EVIDENCE_ATTACHED', ...); } ...
```
命中快取时的正确行为是**回传跟第一次一模一样的结果（同一个 EvidenceID）**，不是报错、也不是回传「重复」提示。这一点决定了下面验证程序的 pass criteria。

### 提议的真机验证程序（CC 可在真实 Apps Script 编辑器执行，与 `local_precheck_test_947.js` 已经跑过的本地情境完全对应，只是这次是真实环境）

**Test A — 相同 clientRequestId 重复呼叫**
1. 找一个真实存在的 DefectID，以及该 Case 底下任一已存在的真实 `driveFileId`（用既有档案捷径，不必真的传一张新照片）。
2. 呼叫 `dlp_attachDefectEvidence({ defectId: '<真实 DefectID>', evidenceType: 'Photo', phase: 'After', driveFileId: '<真实既有 driveFileId>', clientRequestId: 'manual-verify-001' })`。记录 Execution Log 与回传的 EvidenceID；核对 Evidence 表新增剛好 1 行，Case Timeline 新增剛好 1 笔 `EVIDENCE_ATTACHED`。
3. 用完全相同的参数（含相同 `clientRequestId`）再呼叫一次。
4. **预期**：回传的 EvidenceID 与步骤 2 完全相同；Evidence 表仍然只有 1 行、Timeline 仍然只有 1 笔——不是「被拒绝」，是「被原样重放」。

**Test B — 不同 clientRequestId，确认没有过度去重**
5. 同一个 defectId、同一个 driveFileId，换成 `clientRequestId: 'manual-verify-002'` 再呼叫一次。
6. **预期**：产生真正新的第二笔 EvidenceID/Sheet 行/Timeline 条目——证明快取 key 是 clientRequestId 本身，不是 defectId，正常的第二次真实附件不会被误挡。

**Pass 判准**：Test A 第二次呼叫回传值与第一次逐位相同、无新增写入；Test B 产生真正的新记录。任一项不符，标记为 FAILED 并附上实际 Execution Log，不要标记为 VERIFIED。

**若当下无法接触真实 GAS 环境**：明确标记 `BLOCKED — Production verification environment unavailable`，不要用本地测试或代码审阅结果代替。本报告执行方在此沙箱内正是这个状态——网络已停用，无法呼叫真实 Google 服务，以上两个 Test 尚未实际执行，请 CC 在真实环境跑过后把 Execution Log 贴回来。

### 旁支观察（记录，不在本次范围内处理，需另外授权才能动）
945 Sidebar 的 evidence 上传实际呼叫完全不带 `clientRequestId`——这代表就算 Test A/B 在真机验证通过，日常经由 Sidebar 的真实使用仍然不会触发这个 backstop，只有直接呼叫 server function 才会用到它。是否要让 945 也送出 `clientRequestId`（做法可以完全比照 948 已经在用的 `generateClientRequestId_()`）是一个可能的小幅加强，但这次没有动它——按「Record → Classify → Backlog/ADR → ask before scope expansion」，先记录在这里，是否要处理、要不要另开 Backlog 条目，请 CC 决定。
