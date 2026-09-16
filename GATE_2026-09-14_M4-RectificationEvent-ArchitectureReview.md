# M4 Rectification Event — Architecture Gate Result

**阶段性质：Analysis / Contract Review / Impact Assessment only。本文件不含任何 production code 变更，未修改 918/911/945/947/948/903/922/任何 00_*.js 治理档案/UI Contract/BL-18。完成后停在这里，等待人工审阅——即使下方 Gate State 是 IMPLEMENT，也不构成 implementation 授权。**

---

## 1. Current Facts（重新读代码/治理档案得到，非引用旧报告）

- **RectificationEvent 不是新概念，已经是一个完整、活跃的 Entity**：918_DefectEngine.js 的 `logRectificationEvent(input)`（line 1374 起）从 Phase 7（2026-08-17）就存在，Schema（901_PropertySchema.js）、Config 枚举（900_PropertyConfig.js）、Domain Event 定义（903_PropertyEventDefinitions.js 的 `RECTIFICATION_EVENT_LOGGED`）全部已经就位，**并且已经透过 945 Desktop Sidebar 实际在用**（`submitDlpAddRectificationEvent` → `dlp_addRectificationEvent` → `logRectificationEvent`）。
- **clientRequestId 幂等层已经存在且已真机验证**：BL-13（2026-09-08）对真实 DefectID 5124 的真机测试明确包含 Rectification Event，拿到"命中快取，Timeline 严格 +1"的结果，本会话稍早重新追溯这笔证据时也确认过（见 00_Product_Backlog.js BL-13 Addendum）。M4 如果只是重用这个既有 Command，不是从零开始的幂等设计。
- **M4 目前是 Mobile 上唯一的零代码 M-slice**：M1（只读展开）、M2（Owner Verification 写入）、M3（Developer Status 写入）都已实作并真机验证通过；M4（Rectification Event 写入的 Mobile UI）、M5（Evidence 上传的 Mobile UI）都还是零代码。
- **945 现有的 Rectification Event 表单本身也不送 clientRequestId**（`submitDlpAddRectificationEvent` 的 `input` 物件里没有这个栏位，靠 `btn.disabled=true` 当唯一防线）——跟本次会话稍早在 Evidence 路径发现的情况（催生 BL-18）是同一种模式，但这是**另一个独立的既有缺口**，不属于 BL-18 范围，也不在本次 Gate 的处理范围内，如实记录于本文件第 12 节。
- **RectificationEvent.DefectID 是可选的**（Schema 注解"optional, null = case-level"）——不是每一笔事件都必须绑定单一 DefectItem，可以是整个 Case 层级的事件（例如"承包商今天进场"这类不特定单一缺陷的记录）。

---

## 2. M4 Domain Fact

`RECTIFICATION_EVENT_TYPES`（900_PropertyConfig.js）实际定义了 7 个值：`AccessRequested / AccessGranted / RectificationStarted / RectificationCompleted / RectificationRejected / ReinspectionRequired / DeveloperClaimedCompleted`，`Source` 只有两个值：`DeveloperProvided / OwnerObserved`。

所以 M4 的 Domain Fact **不是单一事实**，而是："在某个时间点，由 Developer 或 Owner 一方报告/观察到的、维修流程中某个特定里程碑已经发生"——这 7 种里程碑横跨"协调进场"到"完成/拒绝/需要复查"整个维修流程，之所以是同一个 Entity 类型，是因为它们共享同一种 Shape（谁报的、什么时候、可选的进出场时间、可选的承包商资讯、备注），不是因为它们是同一件事。M4 要做的，就是让这整组既有的里程碑记录能力，在 Mobile 上也能用——不是发明一个新的业务概念。

---

## 3. Status vs Event（有代码证据支持，不是推论）

**Q2 — RectificationEvent 与 DeveloperStatus 的关系**：`logRectificationEvent` 函式本体的注解明文写着："Deliberately does NOT touch DefectItem.DeveloperStatus even when eventType is 'DeveloperClaimedCompleted'...Coupling a free-text EventType to an automatic mutation of a different entity's controlled enum would be exactly the kind of implicit, surprising side effect this Vertical Slice has avoided everywhere else"。

这不完全是 A、也不完全是 B、更不是 C 的教科书定义，而是一个precise 的混合状态，必须如实描述：**语意上**接近 B（Event 是"发生过的具体里程碑"，Status 是"当下状态"）；但**机制上**不是 B（DeveloperStatus 不是从 RectificationEvent 的历史"算出来"的 derived projection——它是靠另一个完全独立的 Command `recordDeveloperStatus` 直接设定的）。实际证据：DefectItem 上确实有一个叫 `DeveloperClaimedCompletedDate` 的栏位，名字听起来像是从 RectificationEvent 衍生，但读代码确认它是被 `recordDeveloperStatus`（line ~853）写入的，不是被 `logRectificationEvent` 写入——两者名字很像、语意上呼应，但完全是两条独立的写入路径。真实后果：使用者理论上可以只记录一笔 `eventType: 'DeveloperClaimedCompleted'` 的 RectificationEvent，却不调用 `recordDeveloperStatus`，这时 DefectItem 的 DeveloperStatus 栏位不会有任何变化——这不是 bug，是这个 Vertical Slice 从一开始就选择的独立性（P3 Single Owner per Entity 的具体体现：DeveloperStatus 由 DeveloperStatus 自己的 Command 独家写入，RectificationEvent 不能越界写它），但**是 M4 UI 设计需要正视的真实使用者体验后果**（用户如果只在 M4 提交了一笔 Rectification Event，会以为 Developer Status 也更新了，但其实没有）。

**Q3 — RectificationEvent 与 OwnerVerificationStatus 的关系**：代码里没有任何耦合（`logRectificationEvent` 完全不碰 OwnerVerificationStatus，`recordOwnerVerification` 也完全不碰 RectificationEvent），两者是同一种"故意不耦合"的独立设计，跟 Q2 是同一个原则的两次应用，不是需要分开重新决定的新问题。

"Rectification Event 是否应该发生在 Owner Verification 之前？"——目前系统**没有**任何顺序校验（`logRectificationEvent` 不检查 OwnerVerificationStatus 或 DeveloperStatus 的当前值），使用者可以以任何顺序记录。这不是本次要改变的行为（HARD RULE 禁止改现有 runtime logic），只是如实记录：目前没有这层校验，M4 的 UI 不应该假设或强制某种顺序。

"Owner Verification 是否应该成为另一个独立 Domain Event？"——目前 `OWNER_VERIFICATION_RECORDED` 已经是 903 里定义好的独立 Domain Event（跟 RECTIFICATION_EVENT_LOGGED 平行存在），`recordOwnerVerification` 也确实会 `publishPropertyEvent_(PROPERTY_EVENTS.OWNER_VERIFICATION_RECORDED, ...)`——这个问题在架构层面已经是"是"，而且已经实作了，不是本次 Gate 需要重新决定的开放问题。

---

## 4. Repair Cycle Impact（本阶段最重要的问题，有直接的既有 ADR 证据）

**这不是一个全新的问题——ADR-P15（APPROVED，2026-08-15/16，比这次 M1-M5 Mobile 工作早了将近三周）已经明确分析并有意搁置了这个确切的架构问题。**

ADR-P15 Decision (2) 原文明确指出一个已知、已接受的 Domain Model 局限：`OwnerVerificationStatus` 到达 `FailedVerification` 之后，Developer 一个新的 `ClaimedCompleted` 声明不会（也刻意不会）重置那个 `FailedVerification`——因为两个栏位的独立性是这整个 Vertical Slice 存在的保证，不是可以为了方便而牺牲的细节。ADR-P15 给出的正确修法是一个**尚未实作**的"Repair Cycle / Verification Cycle"概念：`OwnerVerificationStatus`、`DeveloperStatus` 及其日期应该归属于某一次具体的维修尝试，而不是直接摆在 DefectItem 上的永久栏位——并且明文写着这是"a genuine Domain Model change...explicitly NOT implemented in this Vertical Slice"，"not silently patched around"。

**Option A — M4 直接记录 Rectification Event，暂不建立 Repair Cycle**
- 当前需求覆盖度：完全覆盖——`logRectificationEvent` 已经存在、已经真机验证、已经在 945 上活跃使用。M4 在这个 Option 下 = 单纯给既有能力加一个 Mobile UI，跟 M2/M3 是同一种"零新 Domain 代码"模式。
- 对现有 918 的影响：零——不需要改一行 918 代码。
- 对未来多次 repair/reject/rework 的兼容性：**跟现状完全一样，不会更好也不会更差**——ADR-P15 那个已知局限（多次 Rectification Event 无法被归到"第几次尝试"）今天透过 945 就已经存在，M4 只是让同一个既有能力在 Mobile 上也摸得到，不会让这个既有局限变得更严重，但也不会解决它。
- migration/schema/UI risk：全部趋近于零，因为没有新 Schema、没有新栏位、复用既有 947 wrapper（`dlp_addRectificationEvent` 已经支援 clientRequestId 转传）。
- idempotency risk：低——机制已经真机验证过，M4 只需要让 Mobile 呼叫时也生成 `clientRequestId`（比照 M2/M3/BL-18 已经用的 `generateClientRequestId_()` 模式）。
- governance impact：极小，延伸既有模式，不太可能需要新 ADR（见第 11 节）。

**Option B — M4 同时正式建立 Repair Cycle**
- 这正是 ADR-P15 已经明确分析、明确搁置的那个决定——不是本次 Gate 重新发现的新选项。
- 当前需求覆盖度：ADR-P15 自己说这是"a known, accepted Domain Model limitation, not a bug"——没有证据显示现在有紧迫、具体的业务需求逼着现在解决它（CC 也从未在这整个 M1-M5/BL-13~18 的会话过程中提出这个需求）。
- 对现有 918 的影响：巨大——需要新 Aggregate-internal Entity、DefectItem 的 DeveloperStatus/OwnerVerificationStatus 两个栏位从"直接存值"改成"从最新一次 Cycle 衍生"，这会动到 M1-M3 已经真机验证过的现有读写路径。
- schema/migration risk：高——需要新表或新栏位、需要处理既有资料怎么回填成"第一个 Cycle"。
- **HARD RULE 明确禁止本阶段新增 Repair Cycle schema**——这个 Option 在本次 Gate 里，无论分析结果多支持它，都不可能是本次可以选的答案，只能是 DEFER。
- 结论：Option B 维持 ADR-P15 原本的判断——DEFER，不是本次 Gate 或 M4 该处理的范围。

**Option C — M4 只定义 Event Contract，暂不改 Truth Layer schema**
- 这个 Option 在"RectificationEvent 契约已经存在"的现实下，跟 Option A **没有实质差异**——契约（Schema、Config 枚举、Event 定义）已经全部就位，不存在"M4 需要先定义一个还不存在的契约"这件事。硬要区分的话，Option C 只是 Option A 的一个更保守子集（例如：先只在 Mobile 上做只读展示既有 RectificationEvent 历史，暂不开放 Mobile 端提交），但这不是 HARD RULE 或既有材料要求我现在做选择的问题——这是留给 CC 决定 M4 的确切 Mobile 范围要不要包含"提交"或只到"展示"。

**是否存在 architecture blocker？没有。** RectificationEvent 的 Domain Contract、Schema、Idempotency 层全部已经存在且已验证；唯一被这个问题揭露、需要正视但不需要现在解决的，是 ADR-P15 那个已知的 Repair Cycle 局限——它不会阻挡 M4（Option A）落地，但 M4 的 UI 文案/设计应该避免暗示系统能区分"第几次维修尝试"，因为目前系统真的做不到。

---

## 5. Candidate Event Contract（提案，不写入 production）

RectificationEvent 的契约已经存在于 901/900/903/918，以下逐栏位标注现状，不是重新发明：

| 栏位 | 现状 | 判断 |
|---|---|---|
| EventType | 已存在，7 值枚举 | 必须 |
| RectificationEventID | 已存在，`generateRectificationEventId_()` 由 Property OS 自己产生 | 必须——**EventID 由系统自己生成，不是由 clientRequestId 顶替**（见下方专门澄清） |
| CaseID | 已存在，必须 | 必须 |
| DefectID | 已存在，可选（case-level 事件时留空） | 可选 |
| EventDate | 已存在，未提供时 default 现在时间 | 必须（有默认值） |
| EntryTime/ExitTime | 已存在，字串 HH:mm，可选 | 可选 |
| ContractorCompany/ContractorPersonnel | 已存在，可选 | 可选 |
| Notes | 已存在，可选 | 可选 |
| Source | 已存在，`DeveloperProvided`/`OwnerObserved`，未提供 default `OwnerObserved` | 必须（有默认值）——M4 UI 需要想清楚 Mobile 端谁在用、default 是否还合理 |
| CreatedAt | 已存在，系统时间戳 | 必须，系统自动填 |
| Occurred At vs Recorded At | 现状只有 `EventDate`（业务发生时间，可回填过去日期）跟 `CreatedAt`（系统写入时间）两个时间戳，没有额外的"Occurred At"栏位——现有的两个时间戳已经涵盖这个区分，不需要新增栏位 |
| Actor | 现状没有独立的"操作者是谁"栏位（不是 Source 那个 Developer/Owner 二选一，而是"哪一个具体的人/帐号提交的"）——如果 M4 需要，这会是一个真正的新栏位，不在本次 Gate 授权范围内新增，如实记录为空缺 |
| Client Request ID | 已存在，`logRectificationEvent` 已支援，947 wrapper 已转传 | 必须（幂等层已就位，M4 只需要让 Mobile 呼叫时也生成一个） |

**「EventID 是否由 Property OS 自己生成？」是。** `generateRectificationEventId_()` 在 Truth Layer 写入当下产生，跟 clientRequestId 是两个完全不同的东西。

**「clientRequestId 是否应该承担 EventID？」不应该，现状也没有这样做。** clientRequestId 是呼叫端（UI）产生、用来让服务端判断"这是不是同一次使用者操作的重试"的幂等键；EventID 是服务端在真正写入 Truth Layer 那一刻才产生的业务实体主键。两者生命周期、产生者、用途都不同：同一个 clientRequestId 的两次呼叫应该拿回同一个 EventID（这正是 Step 1 对 Evidence 做过、这次也可以对 Rectification Event 做的验证），但这不代表两者是同一个东西。

**「Timeline record 与 Domain Event 是否是同一个东西？」明确不是，且这个区分已经写进 00_Project_Constitution.js 本身（§7，2026-08-17 订正）**：`publishPropertyEvent_`（对应 903 的 `RECTIFICATION_EVENT_LOGGED`）目前是 ADR-P07/P11 刻意维持的 Logger.log 占位实作，不是真正可查询的持久化存储；真正、活的、UI 会读取的 Audit Trail 是 `appendCaseTimelineEntry_` 写入的 `PropertyCaseTimeline`（918 拥有的 append-only domain-internal projection）。`logRectificationEvent` 的代码里这两者是**两个分开的呼叫**（都包在同一个 try/catch 里，Timeline 或 Event 任一失败都不会挡下已经写入的 Truth Layer 那笔 RectificationEvent 本身——这对 Step 6 的失败路径分析很关键）。

---

## 6. Idempotency Contract

机制已存在，不是需要重新设计的空白：

**First request**
→ `logRectificationEvent` 检查 `clientRequestId`，没有命中快取
→ 校验 Case/Defect/EventType/Source
→ Domain mutation：`rectificationEventSheet_().appendRow(...)`（Truth Layer 写入，RectificationEvent 这个 Entity 诞生）
→ Event + Timeline（包在同一个 try/catch）：`appendCaseTimelineEntry_(...)` 写 Timeline，`publishPropertyEvent_(RECTIFICATION_EVENT_LOGGED, ...)` 写 Logger 占位
→ response：回传含 `rectificationEventId` 的结果，同时把这个结果存进 clientRequestId 快取

**Duplicate request（相同 clientRequestId）**
→ `getCachedDefectEngineCommandResult_(clientRequestId)` 命中
→ 直接 `return cached`——**不重新校验、不重新走一次 Domain mutation、不重新写 Sheet、不重新写 Timeline、不重新 publish Event**，原样重放第一次的结果物件
→ 如果当前系统不是这样：不适用，这就是实际代码的行为，已经是本次要求的正确语意。

回答 Step 6 逐条问题：
1. 需要 idempotency 的 mutation endpoint：`dlp_addRectificationEvent` → `logRectificationEvent`，就这一个（M4 目前设想的唯一 mutation 动作）。
2. 945 是否需要 clientRequestId：机制上早就支援，但**目前 945 现有的 Rectification Event 表单实际没有送**（见第 1 节最后一点）——这是既有的、独立于 M4 的缺口，本次不处理。
3. 948 是否需要 clientRequestId：**是，M4 实作时必须生成并送出**，否则重现跟 945 一样的"能力有、没人用"缺口，等于明知故犯。
4. 是否存在多个 caller：是——945（现有）、948/M4（预定新增），两者共用同一个 947 wrapper 与同一个 918 快取命名空间（本会话此前已经在 918 测试里确认过快取命名空间是跨 Command 共用的既有设计）。
5. CacheService 是否足够：现有机制就是靠 CacheService（`getCachedDefectEngineCommandResult_`），已经真机验证过命中行为（BL-13，2026-09-08），没有证据显示 M4 会需要不同的机制。
6. double tap / network retry / browser retry / duplicate submission：现有机制设计上就是为了防这些，且 947/948 现有的 M2/M3 已经证明这个模式在 Mobile 真实网路环境下真机验证有效。
7. cache hit 时：必须回传第一次结果（是）；不允许再写 Timeline（是，会被完全跳过，不是"允许但去重"）；不允许再写 Truth Layer（是，同上）。

---

## 7. Entity Ownership（P3 Single Owner per Entity，证据来自 00_Project_Constitution.js §7）

- **DefectItem owner**：918_DefectEngine。
- **RectificationEvent owner**：918_DefectEngine——明文列在 PropertyCase 的内部 Entity 清单里，只能透过 PropertyCase 的 Command 建立，不可独立存在。
- **Repair Cycle owner**：**目前不存在这个 Entity，因此也没有 owner**——ADR-P15 明确把它记录为一个尚未实作的未来 Domain Model 扩充，不是"归属不明"，是"根本还没被建出来"。
- **Evidence owner**：911_DocumentEngine。
- **Timeline（PropertyCaseTimeline）owner**：918_DefectEngine——明文列在 918 的 Audit Trail 职责下，是 918 自己的 append-only domain-internal projection，不是 922 那种"无 Truth 表"的聚合视图，也不是独立的第三方 Engine。

「Ownership follows the data, not the screen」在这里的具体意思：945 跟 948（未来）都只是 UI，两者都不拥有 RectificationEvent——它们只能透过 918 的 Command（`logRectificationEvent`）间接创建，M4 不会、也不应该让 948 自己产生一个 RectificationEvent 记录再"告诉"918，一切写入路径都必须还是 UI → 947 wrapper → 918 Command，跟 M2/M3 现在的模式完全一样。

---

## 8. Impact Matrix（只填有代码证据支持的内容）

| File / Component | Read | Write | Contract change | Risk |
|---|---|---|---|---|
| 918 | 是（`logRectificationEvent` 既有函式） | 否（Option A 下零变更；沿用既有函式） | 否 | 零——不改一行 |
| 911 | 否 | 否 | 否 | 不涉及（Rectification Event 不碰 Document Engine） |
| 945 | 否 | 否 | 否 | 不涉及（Desktop 既有表单不受影响） |
| 947 | 是（既有 `dlp_addRectificationEvent` wrapper，已转传 clientRequestId） | 否（Option A 下零变更；直接重用） | 否 | 零 |
| 948 | 新增读取（`dlp_getMobileDefectDetail` 已经回传既有 RectificationEvents 清单，M1 时就已经存在） | **新增**——M4 需要新的呼叫端代码，调用既有 `dlp_addRectificationEvent`，比照 M2/M3 的 chip/表单模式 | 否（不改 947/918 契约，只是新增一个前所未有的 UI 呼叫入口） | 中——这是本次唯一有实质新代码的档案，风险来自新 UI 逻辑本身（表单验证、clientRequestId 生成、EventType 下拉选单等），不是来自任何既有契约变更 |
| 903 | 是（`RECTIFICATION_EVENT_LOGGED` 已存在） | 否 | 否 | 零 |
| 922 | 是（既有 `listRectificationEventsForCase`/`isRectificationEventUpcoming_` 已经在读） | 否 | 否 | 零——922 已经知道怎么处理 RectificationEvent，不需要因为多了一个新的写入来源（Mobile）而改任何聚合逻辑 |
| Timeline | 新增笔数（M4 提交会话产生新的 Timeline 条目，跟 945 现在提交时一样） | 间接（透过既有 `appendCaseTimelineEntry_`，非新代码路径） | 否 | 零——沿用既有机制 |
| Sheets schema | 否 | 否 | 否 | 零——不新增栏位、不新增表 |
| Drive/Evidence | 否 | 否 | 否 | 不涉及 |

---

## 9. Projection Impact

**M4 不需要修改 922。** 922 早在 Phase 8 就已经为了 Dashboard 的"即将到来的复查/维修"功能读取 RectificationEvent（`listRectificationEventsForCase` + `isRectificationEventUpcoming_`），这些是既有的、纯 Query 式聚合逻辑，不关心记录是从 945 还是未来的 948 写入的——数据一旦进了 RectificationEvent 表，922 的既有逻辑就会自动看到它，不需要为了多一个写入来源而改代码。这正是 P3/§7 分工的意义：922 = Projection，不需要知道 Truth 是被哪个 UI 写入的。

---

## 10. UI Impact

- **945 Desktop**：不需要因为 M4 而改动。M4 是纯粹的 Mobile 新增能力，945 现有的 Rectification Event 表单继续原样运作。
- **948 Mobile**：**需要**——这就是 M4 本身。需要新增一个提交入口（沿用 M2/M3 建立的 chip-then-submit 或表单模式），比照既有 945 表单收集 EventType/Source/可选栏位，呼叫既有 `dlp_addRectificationEvent`，自己生成 `clientRequestId`。具体表单该长什么样（是否需要 EntryTime/ExitTime，Mobile 场景下是否还合理）是 UI 设计层级的决定，不是本次 Architecture Gate 要下的结论。
- **947 Server**：**不需要新代码**——`dlp_addRectificationEvent` 已经存在且已经支援 clientRequestId 转传，M4 只是多一个呼叫它的前端。

不因为"以后可能需要"而现在改 UI：本文件没有建议现在预先改 945 或预先动 947，一切改动都严格限缩在"M4 需要 948 新增一个呼叫入口"这一件事上。

---

## 11. Governance Impact

检查了 Constitution P1-P12 全文、ADR-P06/P07/P10/P12/P15/P18/P19/P24：

- **P1（Event-Driven）、P10（Event Immutability）、P11（Infrastructure Adapter Isolation）**：M4（Option A）完全遵守——沿用既有的 Truth Layer 写入 → Timeline/Event side effect 顺序，不新增任何绕过 EventBus Adapter 的写入路径。
- **P3（Single Owner）**：M4 不会让 948 变成 RectificationEvent 的 owner，一切写入仍经 918 的既有 Command。
- **P12（Status Pipeline：Draft→Ready→Done→Pending Production Verification→Production Ready→Released）**：这正是本会话整个流程（BL-13 到 BL-17）已经在实践的官方治理依据，不是本会话自创的规矩——本文件第 13 节的 Gate State 三选一，跟这条 Constitutional Pipeline 是同一种精神的应用，不是另一套平行标准。
- **ADR-P15**：如第 4 节所述，已经预先分析并搁置了 Repair Cycle 问题，M4（Option A）不违反它，也不需要修订它。
- **ADR-P18/P19/P24**：检查过，分别是 DefectItem 栏位新增/Schema 整并、Operator Console 导览基础设施，跟 M4 的 Rectification Event 问题没有直接关联，不需要在本次分析里进一步展开。

**是否需要新的 ADR？不需要。** M4（Option A）是延伸既有、已核准的模式（跟 M2/M3 当初"不需要新 ADR，延伸既有 pattern"的判断一致），没有引入新架构决策。如果 CC 未来决定要处理 Option B（正式建立 Repair Cycle），那会需要一个新 ADR——但那是另一个、本次不授权、也不建议现在做的决定。

---

## 12. Risks（真实风险，不扩大范围）

1. **UX 落差风险（非代码风险）**：使用者在 M4 提交一笔 `DeveloperClaimedCompleted` 的 Rectification Event 后，可能誤以为 DeveloperStatus 也一併更新了——实际上两者是独立的（见第 3 节）。这是既有的、945 也有的同一个落差，不是 M4 新引入的，但 M4 的 UI 文案值得考虑要不要提示这个区别（设计层级建议，不是本次要动的代码）。
2. **既有幂等缺口的镜像风险**：945 现有的 Rectification Event 表单本身不送 clientRequestId（跟 BL-18 处理的 Evidence 缺口是同一种模式，但这是独立于 BL-18 的另一个既有缺口）——如实记录，不在本次范围内处理，也不建议现在顺手修 945。
3. **ADR-P15 已知局限会继续存在**：多次维修尝试无法在系统里被区分成"第几次"，M4（Option A）不会让这个既有局限变得更糟，但也不会解决它——如果 CC 认为这个局限现在已经到了必须解决的程度，那是触发 Option B 讨论的时候，不是本次 Gate 的结论。
4. **948 新增呼叫端本身的常规实作风险**：跟 M2/M3 当初遇到的风险是同一类（例如 M2 遇到过的 `.chip` class 命名冲突、`.btn-secondary:disabled` 视觉缺失）——这些是实际写 M4 代码时才会浮现的具体问题，本次分析阶段没有代码可看，无法预先枚举。

---

## 13. Recommended Gate State

**IMPLEMENT**（仅限 Option A：M4 = 为既有的、已验证的 `logRectificationEvent`/`dlp_addRectificationEvent` 建立 Mobile UI 呼叫端，948 新增 clientRequestId 生成，不新增 Schema、不碰 Repair Cycle）。

**Option B（正式建立 Repair Cycle）维持 DEFER**——这不是本次 Gate 或 M4 该处理的范围，ADR-P15 早已把这个决定明确搁置，本次分析没有发现任何新证据推翻那个判断。

**再次强调：以上 Gate State 只代表 Architecture Gate 本身的判断结果，不代表 M4 implementation 已获授权。STOP——不写代码，等待人工审阅。**
