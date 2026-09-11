# CHECKPOINT — DLP Mobile Field Console 全窗口核对与交接（2026-09-11）

**本文件性质**：应 CC 明确指示产生——暂停 coding，对本窗口（2026-09-06 ~ 2026-09-11，DLP Mobile Field Console 从 Upgrade Proposal 到 M3+Search/Sort 的全部工作）做一次完整重新核对，把散落在各次交付报告里、之前只存在于 checkpoint/report 而未正式写进治理档案的决定同步进 Governance/ADR，然后交付本文件。本文件的每一句陈述都对照过本轮重新执行的测试结果与重新读取的实际档案内容，不是转述先前报告或假设"讨论过=已实现"。

---

## 1. 当前项目状态

**Property OS**：Google Apps Script + Sheets，条子单位的物业管理系统，DLP 缺陷追踪 + 多页 Console UI，正式软体治理（编号档案架构、ADR Log、Constitution 层级规则）。

**Desktop（945/946）**：Modal Dialog 架构迁移（ADR-P24）★ VERIFIED（CC 于 2026-09-06 确认真实专案运行完好）。Sidebar DLP Tab 两个 vertical slice 都是 IMPLEMENTATION COMPLETE，2026-09-01 真机确认过（一般性确认，非逐项 checklist）。BL-12 Secondary Damage 三栏位对齐 ★ VERIFIED（同样 2026-09-06 确认）。本窗口**完全没有修改**945/946 任何一行代码——用档案 mtime 客观核对过，两者 mtime 都还停在原始 zip 解压当下（2026-09-05 16:29:19 UTC），未被写过一次。

**Mobile Console（948/947）**：本来就是独立 doGet() Web App，2026-08-22 起 Daily Check + Evidence + 唯读 Case Overview 这部分 PRODUCTION-READY。本窗口新增并全部 ★ REAL-DEVICE VERIFIED：Defect Detail（只读展开，2026-09-08）、Owner Verification 写入（含按钮停用视觉修正，2026-09-09 确认）、Developer Status 写入（2026-09-09）。新增但**尚未真机验证**：Defect Search + A-Z/Z-A Sort（本地 29 项测试全过，真机 PENDING）。

**918/911 Domain 层**：recordDeveloperStatus/recordOwnerVerification 新增 clientRequestId（ADR-P25），三项（Developer Status/Owner Verification/Rectification Event）已在真实 GAS 环境验证幂等行为正确（2026-09-08，CC 的 Execution log + 手动核对 Timeline 无双胞胎记录）。**Evidence（dlp_attachDefectEvidence）这一项的 clientRequestId 转传，本地测过、代码确认正确，但从未出现在任何一次真机/真实 GAS 验证的 log 里**——这是本次核对特别要指出的一个"容易被誤以为已验证"的项目，详见第 3 节。

**测试基准**（本次重新执行，非引用旧数字）：`local_precheck_test_918.js` 163/163、`local_precheck_test_947.js` 22/22、`local_precheck_test_948_search.js` 29/29、`local_precheck_test_922.js` 67/67，全部实际跑过。`local_precheck_test_911.js` 维持既有、跟本窗口任何改动都无关的 `PropertiesService is not defined` 崩溃；`local_precheck_test_phase11_defectitem_reorder_migration.js` 维持既有、跟本窗口无关的既有失败（901 schema 演进导致）。

---

## 2. 本窗口重要决定

以下决定，本次核对后确认**已经**或**本次补上**正式写入 Governance/ADR（不再只存在于 checkpoint/report 里）：

1. **Mobile 早就是 doGet() Web App，跟 ADR-P24（Desktop-only）无关**——这个澄清本身不需要新 ADR（是既有事实的核实，不是新决定），但已经写进 `DlpMobileConsole_UIContract.md` §12 Amendment 供未来窗口一眼看到。
2. **Mobile Field Console 走 Option C（原地扩充 948），不重建 view registry，附明确重新考虑触发条件（5-6 个 view 或档案大小再翻一倍）**——★ 本次补上 **ADR-P26**，之前只存在于 READINESS 报告与 BL-13/14 的 backlog 叙述里。
3. **recordDeveloperStatus/recordOwnerVerification 在 918 新增 clientRequestId，理由是 Domain-level integrity capability、不是 Mobile 专属 workaround**——★ 本次补上 **ADR-P25**，明确跟既有 ADR-P21（Sidebar 刻意不采用同一机制的对照决定）互相交叉引用；ADR-P21 本身也补上前向引用。
4. **Owner Verification 优先于 Developer Status/Rectification Event/Evidence（M2>M3>M4>M5）**——已经体现在 BL-14~17 的实际实作顺序里，不需要额外 ADR，判断是排序/优先级决定而非架构决定。
5. **Secondary Damage/Correspondence/Close-Reopen-CloseCase 明确排除在 Mobile 范围外**——这不是"还没做"，是刻意决定，已写进 `DlpMobileConsole_UIContract.md` §12.2、BL-14~17 各自的条目、以及 M1-M3/Search-Sort 各次报告的 Mutation Boundary 章节，多处一致记录。
6. **Defect Search/Sort 的默认排序键选 ItemID，不是卡片标题用的 Location**——理由（ItemID 是 ADR-P19 定义的稳定 identity，Location 只是显示用途）已写进 BL-17。判断这是功能设计决定而非架构决定，不需要独立 ADR。
7. **本次审计不需要新建除 ADR-P25/P26 之外的任何 ADR**——逐一检视过本窗口全部决定，其余都归类为"延伸既有 pattern"或"功能设计层级决定"，不构成新架构。这个判断本身在此明确记录，不是默默略过。

---

## 3. 已完成/未完成/blocked 项目

### 3.1 已完成且已验证（真机/真实 GAS，非本地测试/非静态核对）

| 项目 | 验证时间 | 证据 |
|---|---|---|
| Desktop Modal Dialog 架构迁移（ADR-P24） | 2026-09-06 | CC 确认真实专案运行完好 |
| BL-12 Secondary Damage 三栏位对齐 | 2026-09-06 | CC 确认真实专案运行正确 |
| BL-13：Developer Status clientRequestId 幂等 | 2026-09-08 | CC 真实专案 Execution log + 手动核对 Timeline |
| BL-13：Owner Verification clientRequestId 幂等 | 2026-09-08 | 同上 |
| BL-13：Rectification Event clientRequestId 转传 | 2026-09-08 | 同上 |
| M1（BL-14）Defect Detail 只读展开 | 2026-09-08 | CC 真机：秒级展开、无白屏、无序列化问题、Secondary Damage 未泄漏、返回导航正常 |
| M2（BL-15）Owner Verification 写入 | 2026-09-08 提交/记录正常；2026-09-09 按钮停用视觉修正也确认 | CC 真机测试，两个阶段都报告无异常 |
| M3（BL-16）Developer Status 写入 | 2026-09-09 | CC："M3 真机测试全数通过，无异常" |

### 3.2 已实现但未验证

| 项目 | 现状 | 需要什么才能升级为已验证 |
|---|---|---|
| BL-13：Evidence（`dlp_attachDefectEvidence`）clientRequestId 转传 | 947 wrapper 代码确认正确转传，本地测试（`local_precheck_test_947.js`）用既有 driveFileId 捷径测过，**从未出现在任何一次真机/真实 GAS 测试 log 里** | CC 需要明确测过、或明确说"没测"——不要因为其他三项过了就假设这项也过了 |
| BL-17 Defect Search/Sort | 本地 29 项测试全过（含真的执行验证数字感知排序），静态核对确认无 per-keystroke RPC/无直接 Sheet 存取/M1-M3 未受影响 | 需要 CC 在真机上实际用真实数量的 defect 清单操作一次 |

### 3.3 正在进行

**没有**。本次核对时点，代码层面没有任何"写到一半"的东西——上一个完整交付的单元是 BL-17（Search/Sort），下一个自然的单元（M4）**完全没有开始**，零代码。本轮（本次审计+治理持久化）本身在这份文件交付后即告完成，不遗留未完成的治理工作。

### 3.4 尚未实现

- M4（Rectification Event 写入）——完全没开始，零代码
- M5（Evidence 上传 UI）——完全没开始，零代码
- 948 的 view registry 化（ADR-P26 的 Option B）——刻意不做，除非触发条件（5-6 个 view / 档案大小翻倍）出现，目前 948 只有 3 个 view，远未触发

### 3.5 未解决/blocked

| 项目 | 状态 | 备注 |
|---|---|---|
| Evidence 真机验证 | Blocked，需要 CC 确认 | 见 3.2 |
| `990_TestKit.js`/`991~996_Tests_*.js` 不在 `.claspignore` 里 | 已发现、未调查、未处理 | 确认过不含 `require(`，不是跟 `local_precheck_test_*.js` 同一种风险，但状态本身仍是"未排除" |
| `local_precheck_test_922.js` 一次间歇性失败 | 已发现、未调查根因 | 21 次里 1 次失败，之后连续 20 次都过，判断是既有 test flakiness，未修复 |
| 918 内部提到不存在的 `997_Tests_DefectEngine.js` | 已发现、未处理 | 纯 docstring 历史遗留引用，无实际影响 |
| `00_Project_State.js` 档头 "ADR 状态" 摘要行只列到 ADR-P19 | 已知、刻意不修 | 这是 BL-4/BL-5 时期就发现并deliberately deferred 的旧项目，现在缺口更大（ADR-P20~P26 全部没列进去），本次核对重新确认状态不变，依然不在任何一次任务的授权范围内，未修 |
| BL-8（`listDefectItemsForCase` 对不存在 caseId 静默回传 `[]`） | dormant | 只有 `ACTIVE_DLP_CASE_ID` 设错才会暴露，未修 |
| BL-9（phase11 reorder migration 既有失败） | dormant | 本次重新执行确认状态不变（"FAIL: new header matches..."后续抛错），跟本窗口任何改动都无关 |
| BL-11（`attachEvidence()` Drive/Sheet 写入间无 try/catch） | deferred | 未获授权修改 Runtime，未动 |

### 3.6 已被后续决定取代

- 最初 Upgrade Proposal 把"Mobile 该不该变成 webpage"当开放问题——被"Mobile 本来就已经是 doGet() Web App"这个事实发现取代
- 最初假设 Rectification Event/Evidence 的 947 wrapper 可以"零成本"重用（因为 918/911 早就支援 clientRequestId）——被"947 wrapper 实际上完全没转传，需要各补一行"这个具体核对结果取代
- `local_precheck_test_947.js` 最初两处比较 `r1.defectId === r2.defectId` 的弱断言——被"retry 故意送不同数值"的修正断言取代（2026-09-08 Cleanup 那一轮）
- 更早、本窗口开始之前就已经存在的一份错误主张（"947 也需要为 Secondary Damage 改欄位转发"）——在本窗口最早期就已经确认是错的（947 一直是对的，问题只在 945），本次核对重新确认这个历史结论依然成立，不重新怀疑

---

## 4. 当前 Implementation Checkpoint（逐档案精确现状）

★ 表示本次审计新增/修改；档案 mtime 已用 `ls -la --time-style=full-iso` 客观核对，不是只看代码内容推测。

| 档案 | 本窗口是否被改过 | 现状 |
|---|---|---|
| `918_DefectEngine.js` | 是（2026-09-06） | `recordDeveloperStatus`/`recordOwnerVerification` 支援 clientRequestId，163/163 测试通过 |
| `947_DlpConsoleServer.js` | 是（最后一次 2026-09-08） | 4 个 wrapper 转传 clientRequestId 修正 + 新增 `dlp_getMobileDefectDetail`，22/22 测试通过 |
| `948_MobileConsole.html` | 是（最后一次 2026-09-09） | 3 个 view（dailyCheck/overview/defectDetail），30 个函式，含 Owner Verification/Developer Status 写入控件、Search/Sort、`.btn-secondary:disabled` 视觉修正 |
| `local_precheck_test_918.js` | 是 | 147→163（BL-13 新增 16 项） |
| `local_precheck_test_947.js` | 新建 | 13→22（M1 新增 9 项；Cleanup 轮修正 2 处弱断言，项数不变仍 22） |
| `local_precheck_test_948_search.js` | 新建 | 29 项，948 第一个真的可执行（非纯静态核对）的本地测试 |
| `.claspignore` | 是 | 新增 `local_precheck_test_*.js` wildcard |
| `00_Product_Backlog.js` | 是 | BL-12 状态更新为 VERIFIED；新增 BL-13~BL-17 |
| `00_ADR_Log.js` | 是（★ 本次审计新增 ADR-P25/P26 + ADR-P21 交叉引用） | ADR-P24 状态更新为 DEPLOYED/VERIFIED；★ 新增 ADR-P25、ADR-P26 |
| `00_Project_State.js` | 是 | CHANGELOG 多笔新增，含 ★ 本次审计这笔 |
| `00_File_Map.js` | 是（★ 本次审计补上完整能力成长记录） | 新增 2 个 test 档案说明；★ 947/948 条目补上 2026-09-06~09 完整变更记录 |
| `DlpMobileConsole_UIContract.md` | 是（★ 本次审计新增 §12） | ★ 新增 §12 Amendment，档头加指向提示；§0-§11 原文保留不动 |
| `900_PropertyConfig.js` | **否** | mtime 确认未变（2026-09-05 16:29:19，原始解压时间） |
| `901_PropertySchema.js` | **否** | 同上 |
| `911_DocumentEngine.js` | **否** | 同上 |
| `922_DashboardAdapter.js` | **否** | 同上 |
| `945_OperatorConsole.html` | **否** | 同上 |
| `946_OperatorConsoleServer.js` | **否** | 同上 |
| `00_Project_Constitution.js` | 未检查是否改过，但没有任何一轮任务提及或授权修改它 | 假定未改，下一窗口如有疑虑可用同样的 mtime 方法核对 |

---

## 5. 下一步准确操作

1. **确认 Evidence 的真机/真实 GAS 验证状态**——这是唯一一个"可能被誤以为已经验证、实际上没有"的项目，新窗口第一件事应该是问 CC，不要预设答案。
2. **Search/Sort（BL-17）真机验证**——用真实数量的 defect 清单实际操作一次搜寻跟排序。
3. Evidence 确认後，如果 CC 想继续 M1-M5 序列，下一个自然单元是 **M4（Rectification Event 写入）**——完全没开始，需要比 M2/M3 更多 UI（eventType 选择 + 可能的 notes 文字，不是单纯选一个既有状态值），建议开始前重新读一次 Idempotency Gate 报告里对 M4 的原始 UI 设想。
4. 908/File_Map 里那个" ADR 状态摘要只列到 P19"的旧缺口，如果 CC 想处理，是独立的一次性 housekeeping，不属于 Mobile Field Console 这条主线，需要另外明确授权。

---

## 6. 新窗口必须先读取的文件

优先顺序：

1. **本 checkpoint**——先读这个，不要跳过直接看代码。
2. `DlpMobileConsole_UIContract.md` **§12 Amendment**——目前 Mobile 真实范围的权威说明，比任何一次单独的 READINESS/IMPLEMENTATION 报告都更新、更完整。
3. `00_ADR_Log.js` 的 **ADR-P25、ADR-P26**（外加已经存在的 ADR-P21、ADR-P24 作对照）。
4. `00_Product_Backlog.js` 的 **BL-13 到 BL-17**——含各自的 addendum（BL-13 结尾的 .claspignore 清理记录、BL-15 结尾的视觉修正确认）。
5. 如果要继续 M4/M5，需要 `918_DefectEngine.js`/`947_DlpConsoleServer.js`/`948_MobileConsole.html` 这三个档案**这次交付的最新版本**，不是本次上传 zip 里原本那份（如果新窗口是靠重新上传 zip 开始的话）。

不需要一定读、本 checkpoint 已经摘要过结论、只有需要完整技术细节/推理过程才需要另外打开：`READINESS_2026-09-06_DLPMobileConsole-UpgradeProposal.md`、`READINESS_2026-09-06_DLPMobileFieldConsole-IdempotencyGate.md`、`IMPLEMENTATION_2026-09-06_DLPMobileFieldConsole-RetrySafetyFoundation.md`、`READINESS_2026-09-06_BL13-DeploymentVerificationGate.md`、`DEPLOYMENT_2026-09-06_BL13-ClaspignoreAndTestQualityCleanup.md`、`IMPLEMENTATION_2026-09-08_MobileDefectDetail-M1.md`、`IMPLEMENTATION_2026-09-08_MobileDefectDetail-M2.md`、`IMPLEMENTATION_2026-09-09_MobileDefectDetail-M3.md`、`IMPLEMENTATION_2026-09-09_MobileDefectSearchSort.md`。

---

## 7. 不要重复做的事情 / 不要假设的事情

- **不要假设 Evidence 的 clientRequestId 转传已经真机验证过**——它没有，代码对，本地测试过，仅此而已。
- **不要因为 M1/M2/M3 都真机过了，就推论 Search/Sort（BL-17）也一併过了**——CC 报告真机测试时明确只提到 M1/M2/M3，没提 Search/Sort，不要脑补。
- **不要重新怀疑 Mobile 是不是该变成独立 Web App**——ADR-P26 已经把这个决定跟理由正式记录下来，除非出现真正的技术阻碍，不要重开。
- **不要重新怀疑 947 是否需要为 Secondary Damage 改栏位转发**——947 一直是对的，本窗口开始前就已经确认过，本次核对再次确认，不要因为看到旧报告又绕回去查一次。
- **不要在没有明确授权的情况下开始 M4/M5**——两者都完全没开始，开始前需要 CC 明确指示，且 Evidence 的验证状态（M5 的前提）应该先确认清楚。
- **不要顺手修** `00_Project_State.js` 档头那行过时的 "ADR 状态" 摘要、`local_precheck_test_922.js` 那次间歇性失败的根因、`990-996` 那批档案的 `.claspignore` 归属、918 里那个不存在的 `997_Tests_DefectEngine.js` 引用——这四项都已知、都记录在 3.5，但都不属于 Mobile Field Console 这条主线目前被授权的范围，需要 CC 另外决定是否开一轮处理。
- **不要假设** `900_PropertyConfig.js`/`901_PropertySchema.js`/`911_DocumentEngine.js`/`922_DashboardAdapter.js`/`945_OperatorConsole.html`/`946_OperatorConsoleServer.js` **这六个档案本窗口有任何改动**——用档案 mtime 客观核对过，全部逐字未动，如果新窗口的任何分析假设了这几个档案"应该"有某项改动，先重新核对再动手，不要预设。
- **不要重复问"BL-13 的 Domain/Bridge 层是否真机验证过"**——Developer Status/Owner Verification/Rectification Event 三项已经确认，只有 Evidence 是开放问题，不是全部四项。
