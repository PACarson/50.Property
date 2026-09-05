# PROPERTY OS — UI ARCHITECTURE MIGRATION：Sidebar → Console Page Model

**DESIGN / READINESS CHECK ONLY —未实施任何代码变更。**

Repository snapshot：`50_Property-main.zip`（.clasp.json 确认为 clasp 项目，档案时间戳
2026-09-03 22:08）——跟这次对话稍早 BL-10/BL-11 用的是同一份，不是重新上传的新快照。

---

## 1. Repository State Verified

本轮实际逐行读过 / 针对性 grep 过的档案：

- `945_OperatorConsole.html`（nav/tab-switch 逻辑、DLP 子导航、Add Bill 表单全部读过）
- `946_OperatorConsoleServer.js`（4.5KB，整份读完）
- `947_DlpConsoleServer.js`、`911_DocumentEngine.js`（本次对话稍早 BL-10/BL-11 工作时已逐行核对过，这轮沿用，未重读）
- `00_File_Map.js` 第 4 节 INTEGRATION LAYER [940-949]（整段读完）
- `00_ADR_Log.js`：ADR-P14、ADR-P20 全文读过；grep 确认目前最高编号到 ADR-P23
- `00_Project_State.js`：只查了页首 Current Version 字串，未整份重读
- `00_Product_Backlog.js`：本次对话已完整掌握（BL-1~BL-11）
- `DlpSidebarTab_UIContract.md`、`DlpMobileConsole_UIContract.md`：grep 确认"Console Page"这个词目前完全不存在于既有文件（唯一一次字面命中是 Mobile 文件里"Mobile Console page itself"这个巧合用法，跟这次的架构概念无关）
- `GasShim.js`：grep 确认零 HtmlService/showSidebar/showModalDialog mock

**这轮没有重新逐行打开的**：`922_DashboardAdapter.js`、`918_DefectEngine.js`、`948_MobileConsole.html`
本身——这三个的角色判断来自 File Map + ADR 原文 + 本次对话稍早已核实过的调用链，不是这轮重新验证的。如果这三个档案的细节对后续设计很关键，建议下一轮专门再核对一次，这份报告目前对它们的说法基于既有证据，不是这轮的第一手核对。

---

## 2. Current UI Architecture

**核心发现：现在的代码里，"Operator Console"就是"Sidebar"，两者不是两个东西。**

`946_OperatorConsoleServer.js`：

```
function showOperatorConsole() {
  var html = HtmlService.createHtmlOutputFromFile('945_OperatorConsole')
    .setTitle('Property OS')
    .setWidth(380);
  SpreadsheetApp.getUi().showSidebar(html);
}
```

菜单路径是"Property OS → Open Operator Console"（`onOpen()` Simple Trigger，ADR-P14），函式名字叫
`showOperatorConsole`，做的事情是 `showSidebar()`，宽度写死 380px。这不是"Console 里面有个叫
Sidebar 的子元件"，是同一份 HTML/同一次呼叫。

但 ADR-P14（2026-07-29）原文明确记录了 CC 当时的命名方向：*"named **"Operator Console"** (not
"MVP UI"/"Sidebar" — CC's naming direction: every future Domain OS will eventually have one of
these... so a consistent name across the ecosystem matters more than a one-off descriptive
label). Built on GAS's native HtmlService + Sidebar — no new framework, no architecture
change."* ——也就是说，从第一天起，"Operator Console"这个名字就被 CC 有意跟"Sidebar"这个实作手段
分开看待，只是代码这四年（其实是一个多月）里从没真的把这个分离落实到实作层面。这次两份文件提的
"退休 Sidebar"，读起来是延续 ADR-P14 当初就设想好的方向，不是凭空冒出来的新决定。

**现有内部结构**（跟"Console Page"概念最相关的部分）：

- 单一 HTML 档案，没有用 `HtmlService.createTemplateFromFile` / `include()`——grep 确认为零命中。
  49 个 function 全部内联在同一个 `<script>` 区块。
- `.view` / `.view.active` CSS class 切换 + `#tabs button[data-view]` 点击事件，5 个 tab
  （dashboard/addBill/properties/history/dlp）。
- 点击事件里用 if-else 硬编码每个 tab 各自的副作用：`if (view==='history') loadHistory();`、
  `if (view==='dlp') loadDlpTab();`——没有统一的"page activate"生命周期钩子。Dashboard/
  Properties 在 `init()` 时 eager-load 一次；History/DLP 则是每次点击 tab 都重新 load；Add Bill
  没有专属 load（纯表单，选项数据来自全局 `loadFormOptions()`）。
- 两个后端档案共用同一份 HTML：`946`（console_*，Property/Obligation/Payment，ADR-P14）跟
  `947`（dlp_*，DLP 专属，ADR-P20）——依当前 active tab 决定打哪个后端，不是统一后端。
- DLP tab 是唯一有"第二层导航"的 tab：`showDlpSub()` + `.dlp-sub`/`.dlp-sub.active`
  （Overview/Defects/Correspondence/Detail）。这是目前代码里唯一跟"嵌套 Page"沾边的既有模式。
- Mobile Console（947 的 `doGet()` + 948.html）是完全独立的 Web App 部署，独立 UI Contract
  文件，跟 945 的 DLP tab 只共用 947 的 dlp_* wrapper 这一层（ADR-P20 的设计意图），其余完全无关。

---

## 3. Target Console Page Architecture

两份文件的示意图把"Sidebar"画成"Operator Console"底下的一个子元件、跟"Console Pages"并列——但
如第 2 节所述，当前代码里这两者是同一个东西，不存在这种子元件关系。这不是文件写错，而是文件描述
的是**目标状态**，当前代码还没到那一步。

真正悬而未决、且直接决定 Phase A 具体要做什么的问题是：**"退休 Sidebar"具体指改掉哪一层？**
至少三种读法，当前代码没有默认答案：

1. **维持 `showSidebar()` 不变，只重整内部结构**——"Page"纯粹是内部概念/命名整理，零部署变动。
2. **改成 `showModalDialog()`**——仍是 Modal，不需要 Web App 部署/发布这一步，但拿掉 380px 宽度
   限制。
3. **改成独立 `doGet()` Web App**——比照 947/948 现有模式，失去"从 Sheets 里直接开"的方便，换来
   完整页面空间跟可分享 URL，但需要走 Apps Script Web App 部署/权限设定这一步，这是目前 945/946
   完全没有的部署形态。

这是整份报告里**唯一一个我不打算替 CC 决定的判断**，因为后面 Phase A 具体要写什么、要不要新增
部署步骤、GasShim 要不要补 mock，全部取决于这三选一的答案。

不管选哪一种，Page contract 本身可以先独立设计：把 945 现在隐含的模式显式化成
`{id, tabButton, viewEl, onActivate(), reloadOnEveryActivation, subPages?}` 这样一个结构，
从一开始就把 DLP 现有的嵌套子页面情况设计进去，而不是先照 4 个简单 tab 做完，才发现 DLP 塞不
进去要回头改。

---

## 4. Sidebar → Console Page Mapping

| 现有 Tab | 目标 Page | 备注 |
|---|---|---|
| Dashboard | Dashboard Page | 1:1，无 scope 变化 |
| Add Bill | Obligations / Bills Page | ⚠ 目标命名比现状范围大——现有 tab 纯粹是新增表单（Property/Category/Payee/Amount/Frequency/Due date/Grace days/End date/Auto-generate），已核实过表单内完全没有既有 Obligation 的清单/浏览/编辑功能。目标名字里的"Bills"暗示可能要看既有清单，但两份文件都没明说，这是需要 CC 澄清的开放项，不是这次能从代码本身推断出答案的 |
| Properties | Properties Page | 1:1 |
| History | History Page | 1:1（现状其实是"Payment History"，命名比目标更精确；纯命名层级差异，非功能缺口） |
| DLP | DLP Page | 功能上 1:1，但是唯一要求新 Page contract 支援嵌套子页面的一个 |

---

## 5. DLP Migration Mapping

| 现有 DLP 子导航 | 目标 | 备注 |
|---|---|---|
| Overview（`renderDlpCaseOverview`） | Case Overview | 渲染/资料函式不用改，只换外层容器 |
| Defects（`renderDlpDefectList`） | Defect List | 同上 |
| Detail（`openDlpDefectDetail`/`renderDlpDefectDetail`） | Defect Detail | 同上，仍是从 Defect List drill-down 进来，不是独立顶层导航项 |
| Correspondence（`renderDlpCorrespondence`） | 维持唯读 Case-level | 同上 |

结论：DLP 内部的资料渲染/RPC 呼叫完全不用动，需要迁移的只有最外层的"怎么被塞进哪个容器、
`showDlpSub` 怎么被呼叫"这一层胶水——这对 DLP 本身是好消息，风险集中在外层 shell，不在
DLP 的业务逻辑。

---

## 6. BL-10 Impact

BL-10 验证过的链路是：945 表单（`submitDlpAddEvidence`，FileReader→base64）→
`google.script.run.dlp_attachDefectEvidence` → 947 → 911 的 `attachEvidence`/
`saveEvidenceFile_` → 真实 Drive/PropertiesService。这条链路里，947、911、Drive/
PropertiesService 全部跟 UI Surface 无关（已经证实——Mobile Console 的 `dlp_attachEvidence`
走的是同一个 911 `attachEvidence()`）。这次迁移会动到的"Sidebar 专属"部分，只有 945.html 里
那段 client-side 表单提交 code 本身。

**结论：BL-10 的 VERIFIED 状态不因为 Sidebar UI 迁移而失效，两份文件里"不要因为原本的 UI
Surface 被换掉就推翻 BL-10"这个要求，跟现有证据是一致的。**

但要精确一点：如果 Evidence 表单实际被搬到新的 Page shell 底下，搬完之后建议做一次轻量
smoke check——确认搬家后的表单还能正确触发同一个 `google.script.run` 呼叫——这不等于重跑
BL-10 整份 checklist（因为 RPC/backend 完全没动），但也不是"完全不用管"，如实记录这个区别。

---

## 7. Mobile Console Impact

预期不受影响。ADR-P20 的共用 947 glue 设计正是让这次迁移对 Mobile 安全的原因——不管 945 的
host 机制或内部页面结构怎么变，Mobile 呼叫的还是同一批 947 dlp_* wrapper。而且 948 呼叫的
wrapper 函式名字（`dlp_getMobileBootstrap`/`dlp_getCaseOverview`/`dlp_attachEvidence` 等）
跟 945 用的 Sidebar 专属 wrapper（`dlp_getSidebarCaseDashboard` 等）完全不同名，零命名冲突
风险。唯一要盯住的依赖：如果 Phase A/B 过程中动到 947 任何 dlp_* 函式的**签名**（不是新增，是
改掉既有的），才需要跟 Mobile 那边协调——但两份文件都没有提议动 947 的签名，目前只是一个
watch-item，不是现在就存在的风险。

---

## 8. Files Requiring Changes（预期会动到的）

- `946_OperatorConsoleServer.js`——只有在 hosting 机制变更（选项 2 或 3）时，`showOperatorConsole()`
  才需要改
- `945_OperatorConsole.html`——nav/tab-switch 外层 shell 需要重构；各 page 既有的
  render/资料读取函式本身预期大部分保留
- 可能新增档案——如果选独立 `doGet()` Web App，或决定引入 `createTemplateFromFile`/`include()`
  把单一 HTML 拆成多档（这对本项目是全新模式，目前完全没有先例）
- `DlpSidebarTab_UIContract.md`——真正实作后会需要改名或加一份 Supersede 说明（现在不用动）

## 9. Files That Must NOT Change

`911_DocumentEngine.js`、`918_DefectEngine.js`、`922_DashboardAdapter.js`（Domain/Adapter
业务逻辑本身）、`947_DlpConsoleServer.js`（dlp_* 函式签名）、`948_MobileConsole.html`、
`900_PropertyConfig.js`/`901_PropertySchema.js`——这呼应两份文件第 3 节的规则，也直接对应
ADR-P14（Console 从不直接写 Sheet、一律经过既有 Command）跟 ADR-P20（DLP Domain 不该知道
呼叫者是谁）原本就定下的分层。

---

## 10. Migration Sequence（建议，非定案）

- **Phase A**——决定第 3 节的 hosting 机制 + 写正式 Console Page Contract（纯文件+决定，
  零代码）
- **Phase B**——先在 4 个简单 page（Dashboard/Properties/Obligations/History）上落地
  通用 Page shell，替换掉现在硬编码在点击事件里的 if-else
- **Phase C**——DLP page 最后做——因为它是唯一需要嵌套子页面支援的，等简单 page 先把
  基础 pattern 验证过一轮风险更低
- **Phase D**——**全部 5 个 page**的真机回归测试，不是只测 DLP——理由见第 11 节
- **Phase E**——确认真机没问题后，才移除旧 Sidebar 专属 code/menu 路径

这个顺序（简单 page 先、DLP 最后）刻意跟两份文件给的范例顺序方向不同——范例把"Migrate DLP"
单独列一个 Phase，没讲跟其他 page 的先后。用简单 page 先验证 Page contract 有没有漏洞，
是我这边的技术风险判断；但 DLP 是目前唯一有真实 EST8 case 在用的 page，CC 可能更想优先保证
DLP 这条线不断——这是纯粹的 trade-off，不是我能替 CC 拍板的事，列在第 15 节的开放项里。

---

## 11. Risks / Dependencies

- **如果选 hosting 机制变更（选项 2 或 3）：回归测试范围是全部 5 个 tab，不是只有 DLP**——
  Dashboard/Properties/Add Bill/History 从来没有透过 `showSidebar()` 以外的方式跑过，
  换 host 等于这四个也要重新真机验证一次，不能假设它们"本来就没问题所以不用管"
- **GasShim 完全没有 HtmlService/Sidebar/Modal 的 mock**——不管选哪个 hosting 选项，这部分
  永远没有本地测试覆盖率，只能靠真机验证；这不是"以后补个 mock 就能解决"的问题，是这类
  GAS 原生 UI API 本身的性质
- **目前没有 HTML 拆档/include() 的先例**——如果这次要走这条路，是本项目第一次引入这个
  pattern，Phase A 阶段就该先确认要不要走这条路，而不是留到 Phase B 才发现
- **DLP 的嵌套子页面需求，意味着 Page contract 没有把 DLP 走过一遍之前，都不能算真的验证
  完成**——第 10 节把 DLP 排最后是为了先用简单 case 验证 pattern，但也代表 contract 本身的
  "完整性"要等 Phase C 才能真正确认

---

## 12. Governance Changes Required（只报告，未写入）

- **提议新增 ADR-P24**——记录第 3 节的 hosting 机制决定 + 正式 Console Page Contract，
  在 CC 对第 3 节拍板之后才有内容可写
- 会牵动：`00_ADR_Log.js`（新条目）、一份新的或从 `DlpSidebarTab_UIContract.md` 衍生
  出来的 UI Contract 文件、`00_File_Map.js` 第 4 节 Integration Layer 现在对 945/946 的
  描述（要等真正实作后才需要更新，不是现在）
- 以上都还没写，照两份文件的指示先报告

---

## 13. Existing Gaps Remaining Deferred

BL-8、BL-9、BL-11——这次调查完全没碰，状态不变。Phase 2（Close Defect/Reopen Defect/
Close Case）——同样没碰，仍未设计、仍未开始。

---

## 14. Implementation Readiness

**未就绪。** 唯一的硬阻塞是第 3 节的 hosting 机制决定——Phase A 具体要做什么完全取决于这个
答案。次要开放项：Obligations/Bills Page 的 scope（纯改名，还是真的要加清单浏览/管理功能）、
第 10 节 DLP-最后 vs DLP-优先的排序偏好。

---

## 15. Recommended Next Step

CC 决定以下三项，Phase A（Contract 草案 + ADR-P24）才有办法真正动笔：

1. Hosting 机制：维持 `showSidebar()` 内部重整 / 改 `showModalDialog()` / 改独立
   `doGet()` Web App
2. Obligations/Bills Page：纯改名，还是要扩充既有清单浏览功能
3. Migration 顺序偏好：简单 page 先（技术风险较低）还是 DLP 先（目前唯一有真实使用价值
   的 page）

这份报告到此为止，照文件本身的指示停下来等 CC 授权——**第二份文件（DLP Phase 1 Remaining
Slice）这轮没有开始处理**，因为它本身写明是接续在"the completed UI Architecture Migration
Design"之后，而这份 Design 报告的三个开放项都还没有 CC 的答案。
