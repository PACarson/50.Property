# DLP Mobile Field Console — Decision & Idempotency Gate

**任务性质**：分析与建议，非实施记录。未写代码，未修改 repository 任何档案（918/947/948/922/901/ADR/Contract/Backlog 皆未动）。本轮所有结论以实际读取 `918_DefectEngine.js`/`947_DlpConsoleServer.js`/`901_PropertySchema.js`/`903_PropertyEventDefinitions.js` 的函数本体为准，不是转述上一轮报告。

---

## A. Decision Confirmation

确认：Owner 已核准 Option C——原地扩充 `948_MobileConsole.html`，不新建第二个 Mobile App、不新建第二套 DLP backend、不复制 918 business rules。Desktop Surface（`showModalDialog()` + Operator Console，ADR-P24 管辖）与 Mobile Surface（既有 `948`/`947`/`doGet()` Web App，`DlpMobileConsole_UIContract.md` 管辖）确认为两个互不冲突的独立 surface，本轮不重开 ADR-P24，也不再提把 Desktop 改成 Standalone Web App。

---

## B. Idempotency Analysis — `recordDeveloperStatus()` / `recordOwnerVerification()`

两个函数结构完全对称（918 第 817 行 / 881 行），逐题回答：

**1. 当前完整 mutation flow 是什么？**
`withDefectEngineLock_` 取锁 → 找 DefectItem 那一行（`findRowIndexByFirstColumn_`，找不到 throw `DEFECT_ITEM_NOT_FOUND`）→ `assertDefectItemNotClosed_` 挡掉已 Closed 的 Defect → 组一组要覆写的栏位（`DeveloperStatus`/`OwnerVerificationStatus` + 对应日期栏位 + 派生的 `Status` + `UpdatedAt: now`）→ `updateRowFields_` **原地覆写同一行**（不是新增一行）→ `try` 区块内 `appendCaseTimelineEntry_` + `publishPropertyEvent_`，失败则 `logDefectEnginePartialFailure_` 记录后 rethrow → 回传 `{ success: true, defectId, ... }`。

**2. 是否产生 Timeline/Event？**
两者都会。`appendCaseTimelineEntry_`（新增一行 Timeline）+ `publishPropertyEvent_`（`DEVELOPER_STATUS_UPDATED`/`OWNER_VERIFICATION_RECORDED`）。

**3. 重复调用目前会发生什么？**
拆两部分看，风险不对称：
- **DefectItem 本行**：因为是 SET 语意（覆写既有栏位）不是 APPEND，同一个 status 重复写两次，最终 Status/DeveloperStatus/OwnerVerificationStatus 数值不会错。但 `UpdatedAt` 每次都用当下 `now`，一定会前进；`OwnerVerifiedDate`/`DeveloperClaimedCompletedDate` 目前的写法是 `input.verifiedDate || now`（即目前 947 wrapper 完全没传 `verifiedDate`，永远走 `now` 这条路），所以重复调用会让这个日期栏位悄悄跳到第二次调用的时间点——不是资料损坏，但审计角度看，这个日期会失真。
- **Timeline**：`appendCaseTimelineEntry_`（918 第 200 行）是无条件 `appendRow`，**没有任何天然去重**，每次调用都会真的多一行一样的 "Owner verification: Verified" 记录。
- **Event**：查了 `903_PropertyEventDefinitions.js` 第 180 行，`publishPropertyEvent_` 目前是 **ADR-P07 明订的 placeholder**——只做 `Logger.log`，回传 envelope，没有接到真实 EventBus。重复触发**目前**零实际后果（没有通知会发两次、没有下游自动化会跑两次），但这是"目前尚未接线"，不是"设计上保证安全"——一旦 ADR-P07 的真实 EventBus 接上，这就会变成真的风险，值得记一笔但不是现在要处理的。

**4. 是否存在天然 deduplication？**
只有"数值层面"半天然——同一个 status 覆写两次，最终数值仍正确。Timeline 和 Event 完全没有天然去重，副作用会照实重复。

**5. Mobile 网络环境下实际风险是什么？**
真实场景：Owner 点"Verified"，讯号差／timeout，Owner 或前端重试逻辑再点一次，两个请求都送达。结果：Defect 的权威状态（Status 栏位本身）不会错，但 Case Timeline 会出现两笔时间相近、内容一样的记录，看起来像"验证了两次"，容易在之后回顾 Case 历史时造成误解（尤其如果之后真的有一次合理的二次验证——例如先 FailedVerification 后来真的重验——混在一堆重复噪音记录里更难分辨）。**结论：这是审计记录品质风险，不是资料完整性/权威状态风险**——跟 Daily Check 或 Rectification Event 那种"重复=凭空多出一次不存在的现场事件"性质不同，这两个是"重复=同一个状态被多盖了一次章"。

**6. 是否必须增加 clientRequestId？**
"必须"这个字太重——权威状态不会错。但既然修法成本极低（下面第 11 点）、风险方向是会随时间累积的 Timeline 噪音、又刚好碰上 Mobile 这个本来就该有讯号不稳假设的 surface，我的结论是"该做，但不是资料安全意义上的必须"。

**7. 如果增加，应该在哪一层？**
**918 Domain 层**，理由见 C 节（Domain vs Mobile Boundary 判断）。

**8. 是否应该与现有 logRectificationEvent pattern 统一？**
应该，而且做法要一字不改地照抄——`logRectificationEvent`（918 第 1356 行起）跟 `logDailyProgressCheck`（第 1118 行起）的 cache 检查/写入是同一段代码：
```
if (input.clientRequestId) {
  var cached = getCachedDefectEngineCommandResult_(input.clientRequestId);
  if (cached) return cached;
}
... (mutation 本体) ...
if (input.clientRequestId) cacheDefectEngineCommandResult_(input.clientRequestId, result);
```
`getCachedDefectEngineCommandResult_`/`cacheDefectEngineCommandResult_`（918 第 109-120 行）用的是 `CacheService.getScriptCache()`，key 是 `'propertyos_idem_defect_' + clientRequestId`，TTL 3600 秒——**这个 key 命名空间是共用的，不分是哪个 Command**，代表 `clientRequestId` 必须全域唯一，不能只在单一函数内唯一。因为 948 现有的 `generateClientRequestId_()` 用的是 `crypto.randomUUID()`（有 fallback），实务上没有碰撞风险，但这是一个该记下来的实作细节，不是可以随便假设的事。

**9. 是否会改变 Desktop behaviour？**
**完全不会**。查了 947 现有的 `dlp_recordDeveloperStatus`/`dlp_recordOwnerVerification`（第 225-247 行），两个 wrapper 传给 918 的 object 里根本没有 `clientRequestId` 这个 key。`clientRequestId` 在 918 端本来就是 `if (input.clientRequestId)` 的 optional 判断——Sidebar 今天不传，加了这段代码后 Sidebar 依然不传，行为逐字节相同。

**10. 是否需要 Schema/Contract/ADR/Backlog 修改？**
- **Schema（901）**：不需要。这个机制完全建立在 `CacheService`（暂存，1小时后自动过期），不是写进 Sheet 的 persisted 栏位——查过 `DailyProgressCheck`/其他既有 schema 都没有 `ClientRequestID` 这种栏位，做法本来就不打算持久化它，这次也一样不需要。
- **Contract**：`DlpMobileConsole_UIContract.md` 需要一段 Amendment，把这两个 Command 记为"Mobile write-idempotent"，跟既有 Daily Check 那段的记法一致。
- **ADR**：不需要新 ADR——这不是新架构决定，是把一个已经在 918 里用了 3 次的既有 pattern 延伸到另外 2 个函数，没有引入新的设计语言。
- **Backlog**：建议开一个新条目记录这个决定（不管最后选哪个 Option），比照 BL-11 记录 attachEvidence Drive/Sheet 非原子性问题的方式——这是"记录一个已知、评估过、刻意处理或刻意不处理的行为细节"，不是缺陷。

**11. 最小 diff 是什么？**
每个函数在 `withDefectEngineLock_` 里最前面加 4 行 cache-check、结尾加 1 行 cache-write（跟 `logDailyProgressCheck` 一字不改地对照），共两处、每处约 5-6 行，**918 层大概 10-12 行新代码**。947 的两个 wrapper 各加一行 `clientRequestId: input.clientRequestId || undefined` 转传。948 的 Verify/Status 按钮沿用现有 `generateClientRequestId_()` 生成、随请求带上。

---

## C. Idempotency Recommendation

**Recommended: Option B**——两个函数（`recordDeveloperStatus`、`recordOwnerVerification`）都先加 `clientRequestId`，再开放给 Mobile。

理由：
- 两个函数风险形状完全对称（同样的 SET 语意、同样的 Timeline 无天然去重、同样目前零 Event 副作用），没有任何原则性理由只保护其中一个——**Option C（只做一个）没有站得住的依据，会製造一个"为什么这个有保护那个没有"的新问题**，而不是解决问题。
- 修法成本极低（10-12 行、完全照抄既有代码、947/948 各一行），相对"Case Timeline 长期累积重复噪音、且一旦 ADR-P07 真 EventBus 接上后果会变严重"这个风险，B 的性价比明显优于 A（现在开放、不加保护）。
- 不需要新架构、不影响 Desktop、不用改 Schema——没有理由拖到"以后有空再修"。
- 没有找到比 B 更合理的 Option D：唯一值得一提的实作层细节（要不要把 cache-check/cache-write 段抽成一个共用 helper 减少重复代码，而不是在两个函数各写一遍）是风格问题，不是决策问题，不构成独立的 Option，留给实际动手那一轮自行判断即可。

**D 节（Domain vs Mobile Boundary）判断：这是一个 Domain-level integrity capability，不是"因为 Mobile 需要所以在 948/947 做 workaround"**——理由是这个保护同等适用于 Desktop（Sidebar 今天连击、断线重试的机率比 Mobile 低，但不是零），而且这个 pattern 本来就该跟它另外 3 个兄弟函数（`logDailyProgressCheck`/`logRectificationEvent`/`logSecondaryDamage`）活在同一层——放在 947 或 948 做局部修补，只保护"这次用 Mobile 呼叫"这一条路径，Sidebar 那条路径（虽然目前没打算用）还是没有保护，跟既有架构原则（918 是 Domain Truth，不是 947/948 各自维护一套局部正确性）不一致。

---

## D. Mobile MVP Boundary

**In Scope**（沿用 Owner 已核准的优先级）：
- P0 Owner Verification
- P1 Developer Status
- P1 Rectification Event
- P1 Defect Evidence（挂在 Defect 上，区别于现有挂在 Daily Check 上的版本）
- Defect List + Defect Detail（承载以上四项动作的必要 UI 载体）

**Out of Scope**（本轮 MVP 不做，且不是"未设计"，是"刻意先不曝光"）：
- Secondary Damage 新增
- Correspondence 新增
- Close Defect / Reopen Defect / Close Case——Domain 层（`closeDefectItem`/`reopenDefectItem`/`closeCase`，918 第 940/998/1051 行）已存在且有真实 state-machine gate，本轮不因为 Mobile 升级而提前曝光，也不会因此去动 918 这三个函数本体
- 真正的离线队列（弱网 retry-safe ≠ 断网仍可操作，这次不做后者）

---

## E. Defect Detail UX Proposal

核对过 `901_PropertySchema.js` 的 `DefectItem.columns`（第 246-281 行），Owner 列的 10 个栏位（ItemID/Category/SubCategory/Location/Description/Remark/Priority/Status/DeveloperStatus/OwnerVerificationStatus）**每一个都存在，命名完全一致**，不需要调整。

Flow 沿用 Owner 提出的形状，并回答"最佳关系是什么"这题：**Daily Check 落地页保持不变，加一个轻量"待关注"提示**（Bootstrap 后若有 Defect 处于 DeveloperStatus=ClaimedCompleted 但 OwnerVerificationStatus 还是 NotChecked/PartiallyVerified，就在 `☰`/或落地页上给个数字提示）→ 点进去是 Case Overview（现状不变）→ **Defect 卡片现在可以点**，进入新的第三个 view「Defect Detail」→ 显示上述 10 个栏位（只读展示）+ Rectification Events/Evidence/Secondary Damage 三份既有只读列表（沿用 `buildDefectDetailForSidebar_` 现成资料） → 四个动作按钮（Owner Verification / Developer Status / Add Rectification Event / Attach Evidence）→ 动作完成后原地更新这个 Defect Detail 画面（不强制跳走），Owner 可以选择「返回 Case Overview」或直接「返回 Daily Check」结束这次现场记录。

这个设计不是把 Desktop 缩小——Desktop 的 Sidebar Defect Detail 是给"坐在电脑前逐项审查"用的密集资讯呈现；Mobile 版本是给"人站在那个 Defect 前面，看一眼状态、点一个动作、拍张照"用的，同一批资料，呈现密度和操作节奏刻意不同。

沿用现有单文件 `.view`/`.view.active` 切换模式（Contract §3 已定），不新增路由库，跟上一轮 Option A 的原地扩充精神一致。

---

## F. Backend Reuse Map

| Mobile Action | Existing Backend Capability | New Backend Needed？ |
|---|---|---|
| View Defect Detail | 922 `buildDefectDetailForSidebar_`（透过 947 `dlp_getSidebarDefectDetail` 或一个转呼叫它的新别名） | 否，原样复用 |
| Owner Verification | 918 `recordOwnerVerification`（透过 947 `dlp_recordOwnerVerification`） | **是，小改**——918 加 `clientRequestId` 支援（~5-6 行，若 Option B 核准）；947 wrapper 加 1 行转传 |
| Developer Status | 918 `recordDeveloperStatus`（透过 947 `dlp_recordDeveloperStatus`） | 同上 |
| Rectification Event | 918 `logRectificationEvent`（透过 947 `dlp_addRectificationEvent`） | **918 层已支援 clientRequestId，零改动**；但**947 wrapper 目前完全没转传**（第 259-272 行核对过，object 里没有这个 key）——要让 Mobile 真正拿到幂等保护，947 这行需要加 1 行 |
| Defect Evidence | 911 `attachEvidence`（透过 947 `dlp_attachDefectEvidence`） | 同上——911 已支援，947 wrapper（第 287-299 行）同样没转传，需要补 1 行 |

（这张表跟上一轮报告的判断有一个重要修正：上一轮说"Rectification Event/Evidence 只要 948 client 生成 ID + 947 转传即可，Domain 零改动"——查了 947 实际 wrapper 代码后确认**"947 转传"这一步目前并不存在，是需要新加的**，不是本来就有、Mobile 拿来就能用。修正记在这里，不是要重推翻方向，只是把"零改动"精确成"Domain 零改动，wrapper 需要各加一行"。）

---

## G. Implementation Slices

| Slice | 内容 | 预期改动档案 | 复用既有 API | 新增 API | 测试要求 | 真机验证 | Rollback/安全性 |
|---|---|---|---|---|---|---|---|
| M1 | Defect List + Defect Detail（只读） | 948（新 view）；947（新增或复用 `dlp_getSidebarDefectDetail` 的 Mobile 呼叫路径，视序列化测试结果可能需要仿 `dlp_getCaseOverview` 加 JSON.stringify 包装） | `buildDefectDetailForSidebar_`（922） | 视序列化结果，可能加一个 Mobile 专用包装別名 | local_precheck：确认既有 918/922 测试不受影响 | 是——第一次在 Mobile 的 `google.script.run` 边界传这种复杂 payload，必须真机测 | 纯读取，零写入风险，可安全先上线观察 |
| M2 | Owner Verification 写入（含 clientRequestId） | 918（加 idempotency）、947（转传 1 行）、948（按钮+ID 生成） | `recordOwnerVerification` | 无新 API，既有函数加 optional 参数 | 补 `local_precheck_test_918.js` 对 clientRequestId 重复调用的 assertion | 是——含弱网双击场景 | 若 918 改动有疑虑，可先只做 947/948 那一半（不传 clientRequestId），保留纯手动重试提示当 fallback |
| M3 | Developer Status 写入（含 clientRequestId） | 同 M2 结构 | `recordDeveloperStatus` | 同上 | 同上 | 是 | 同上 |
| M4 | Add Rectification Event 写入 | 947（补转传 clientRequestId 那 1 行）、948 | `logRectificationEvent`（918 已支援） | 无 | 确认 947 转传后行为跟既有 Sidebar 呼叫一致 | 是 | 918 完全不动，风险集中在 947/948 |
| M5 | Defect-linked Evidence 写入 | 947（同上补转传）、948（复用现有 `uploadEvidence_` 模式改指向 Defect） | `attachEvidence`（911 已支援） | 无 | 确认 Drive 资料夹路径在新呼叫情境下正确（`getOrCreateCaseEvidenceFolder_` 是按 caseId 不是按 entityType） | 是 | 918/911 不动 |
| M6 | Daily Check 整合工作流（"待关注"提示 + 各动作完成后的返回路径） | 948 only | 既有 bootstrap 逻辑 | 无 | UI-only，无新 Domain 呼叫需要测 | 是——确认不影响已验证过的 Daily Check 30-60 秒完成体验 | 纯 UI 层，风险最低，建议留到最后做，确认前面几个 slice 稳定后再动这个大家最熟悉、最怕回归的流程 |

---

## H. Governance Impact

- **ADR**：不需要新 ADR，不改 ADR-P24。
- **Contract**：`DlpMobileConsole_UIContract.md` 需要 Amendment——更新 §1 Scope 表（加入 Defect Detail/四个新动作）、记录 Owner Verification/Developer Status 的 clientRequestId 决定（若核准 Option B）。
- **Backlog**：建议开一条新条目记录本次 idempotency 决定（无论最终选哪个 Option 都该记），比照 BL-11 的记法。
- **Project State**：照既有 CHANGELOG 惯例补一笔。
- **Implementation Map（00_File_Map.js）**：不需要——本次不新增任何档案，948/947/918 都是既有档案内的扩充，不涉及编号变动。

---

## I. Approval Questions

1. 是否核准 Idempotency Recommendation：Option B（两个函数都加 `clientRequestId`），而不是 A（不加直接开放）或 C（只加一个）？
2. F 节修正的那个发现——947 现有的 `dlp_addRectificationEvent`/`dlp_attachDefectEvidence` 目前完全没转传 `clientRequestId`——是否同意这次一并补上（成本极小，1 行/个），还是要留到之后单独处理？
3. G 节 Slice 顺序（M1 只读优先、M2/M3 写入次之、M6 Daily Check 整合放最后）是否核准，还是想调整？
4. M1 提到 Defect Detail 这种复杂 payload 可能重演 `dlp_getCaseOverview` 当初遇到的序列化问题——是否同意"先做、真机测出问题再仿既有修法处理"，还是希望现在就先加防御性 JSON.stringify 包装？

依照本次任务简报第 16 节 Stop Condition，分析到此为止——不写代码、不产生 patch、不动 918/947/948/922/901/ADR/Contract/Backlog，等 Owner 明确核准 implementation scope 和 idempotency decision 后才进入下一轮实施。
