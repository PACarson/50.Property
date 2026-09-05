# PROPERTY OS — UI ARCHITECTURE MIGRATION：Phase A Implementation Report

Repository snapshot：跟这次对话所有工作用的是同一份 `50_Property-main.zip`（clasp 时间戳
2026-09-03 22:08）。改动只针对下面列的两个档案，其余全部原样。

---

## 1. Implementation Summary

Entry point 从 `showSidebar()`（380px，靠 HtmlOutput.setTitle() 显示标题）改成
`showModalDialog()`（700×600，标题改成 `showModalDialog()` 自己的第二个参数——这两种呼叫方式
标题的传法不一样，已对照 Google 官方 HTML Service 文件的范例代码确认过，不是凭记忆猜的）。
945.html 新增一个 Console Page registry/activation pattern，**只把 DLP tab 迁移过去**
（照 Decision Lock §3 的优先顺序），Dashboard/Properties/Add Bill/History 四个 tab 原封不动
留在原本的 inline click-handler 路径上（migration-deprecated，还没迁移）。没有动到任何
Domain/Engine/Schema，没有动到任何 RPC 函式签名。Local（静态）验证做了；Real GAS 验证没做——
我没有写入 CC 真实专案的权限，这段一直是本次对话的既有限制。

---

## 2. Files Changed

- **`946_OperatorConsoleServer.js`**——只动 `showOperatorConsole()` 这一个函式（8 行）
- **`945_OperatorConsole.html`**——新增约 44 行 Console Page shell（`ConsolePages`/
  `registerConsolePage`/`activateConsolePage`），`setupTabs()` 改成先查 registry、DLP
  查得到就走新路径，查不到（其余 4 个 tab）就走原本一字不改的 fallback

## 3. Files Not Changed

`911_DocumentEngine.js`、`918_DefectEngine.js`、`922_DashboardAdapter.js`、
`947_DlpConsoleServer.js`、`948_MobileConsole.html`、`900_PropertyConfig.js`/
`901_PropertySchema.js`、`00_Product_Backlog.js`、全部治理文件——已用 diff 逐一确认零改动。

---

## 4. Old Sidebar Dependencies

改动前 repo 全文 grep 过，`showSidebar` 只出现在 946.js 那一行（现已改掉），没有其他入口依赖
Sidebar。380px 宽度假设已经从代码里拿掉，但要精确记录一点：`00_Review_History.js` 里 DLP
Phase 1 设计记录第 4 点提到，Defect List 那个表格的 horizontal-scroll + 截断/tooltip
处理方式，当初就是**专门为了应付 380px 宽度**才做的（"945's Sidebar shell is a narrow
~300-380px width in practice...a literal 10-column cram would be unusable"）。这个限制现在
不存在了，但这次完全没动 Defect List 的渲染 code——移除这个 workaround 是视觉层级的判断，
不属于"a clean path for DLP"，放进第 12 节当新发现的候选项，不是这轮的改动范围。

---

## 5. New Console Page Architecture

```js
registerConsolePage(id, { onActivate, reloadOnEveryActivation })
activateConsolePage(id)   // 设定 active class + 依 reloadOnEveryActivation 决定要不要重新呼叫 onActivate
```

设计上是**加法，不是取代**——没有动任何既有 render/RPC 函式，`loadDlpTab`、`showDlpSub`、
`renderDlp*` 全部原样，只是外层"什么时候呼叫它"这段从写死的 if-else 换成 registry 查找。
DLP 注册时 `reloadOnEveryActivation: true`，跟它迁移前"每次点击都重新 fetch，从不 cache"的
行为完全对齐——这不是新行为，是把原本的行为显式化。

---

## 6. DLP Migration Readiness

DLP 的**外层** tab 切换现在走新 Console Page pattern。DLP **内层**的子导航
（`showDlpSub`，Overview/Defects/Correspondence/Detail）完全没动，还是原本那套机制，一样
运作在 `view-dlp` 容器里面。这满足了 Decision Lock 第 5 节 G 项"a clean path for DLP to
become a Console Page"，而且没有动到任何 DLP 业务逻辑。没有做的：DLP 自己的子导航目前
*没有*也被改造成同一套 registry 底下的"嵌套 Console Page"——这轮判断这样做会超出"clean
path"这个字面范围，算是有意识地没做，列进第 11 节 Remaining Migration Work，不是漏掉。

---

## 7. BL-10 Status

后端链路（947 → 911 → 真实 Drive/PropertiesService）这次完全没动，**维持 VERIFIED**。
但 Evidence 上传表单本身（`submitDlpAddEvidence`）虽然 code 没改，运作的容器从 Sidebar
换成了 Modal Dialog——这是真实的环境变化，即使代码逐字未变。照 Decision Lock 第 8 节的要求，
这段需要自己的 migration 验证，这轮**没有**做（没有真机权限），已经列进第 10 节给 CC。

---

## 8. Mobile Console Impact

无——947/948 零改动，diff/grep 都已确认。

---

## 9. Local Verification（已完成的部分）

- 抽出 `<script>` 区块跑 `node --check`：**语法通过**
- 改动前 repo 全文 grep 确认 `showSidebar` 只有一处，现已清零
- 确认 `view-dlp` / `#tabs button[data-view="dlp"]` 前后引用一致，没有孤儿 DOM 参照
- 确认没有其他 code 路径会绕过这次改的 click handler、独立去触发 DLP tab
- 对照 Google 官方 HTML Service 文件范例，确认 `showModalDialog(html, title)` 的
  title 是第二个参数，不是读 `HtmlOutput.setTitle()`（这两个函式的标题传法不一样，是这类
  容易犯的错，这次有查证过，不是猜的）

这些都是**静态检查**，不是在真实浏览器/GAS 环境里跑过。

## 10. Real GAS Verification Status

**没做。** 沿用整个对话既有的限制——我没有写入/操作 CC 真实 GAS 专案的权限。需要 CC 真机
确认的清单：

1. Operator Console 打开的是 Modal Dialog，不是 Sidebar
2. 原本 4 个 tab（Dashboard/Properties/Add Bill/History）行为跟迁移前一模一样
3. DLP tab：第一次点击、以及重复点击，都正常 load（因为 `reloadOnEveryActivation: true`）
4. DLP 内部 Overview/Defects/Correspondence/Detail 子导航正常
5. **Evidence 上传表单**在新的 Modal 环境下还能正常运作（对应第 7 节）
6. 画面上没有任何东西看起来还卡在旧的 380px 假设里（纯目视检查）

---

## 11. Remaining Migration Work

- Dashboard/Properties/Add Bill/History 迁移到同一套 registry（Decision Lock §3 step 4，
  明确不卡这次）
- 要不要把 DLP 自己的子导航也一并改造成同一套 registry 底下的嵌套 Page——这轮刻意没做，
  留待之后决定
- 视觉/排版层级的调整，真正用上新的宽度（这轮新代码就是塞进一个更宽的框，既有 CSS
  完全没动，不属于 Phase A 范围）
- 正式 ADR-P24 + Console Page Contract 文件——上一份 Readiness Report 第 12 节就说了只报告
  不写入，这轮是 Phase A 实作不是治理文件撰写，一样没写

---

## 12. New Gaps Discovered

Defect List 表格的 horizontal-scroll + 截断/tooltip 处理（第 4 节已详述来源），是专门为了
380px 宽度做的 workaround，现在宽度限制没了，这个 workaround 大概率不再必要——但这轮没有动它，
纯粹记录成候选项，要不要处理、什么时候处理是 CC 的判断，这里没有替它编 BL 编号。

---

## 13. Deferred Items

BL-8、BL-9、BL-11、Phase 2（Close Defect/Reopen Defect/Close Case）、DLP Phase 1 Remaining
Slice（Correspondence/Rectification Event/Evidence/Secondary Damage 在新架构下的完整体验）——
这轮全部没碰。

---

## 14. Recommended Next Step

CC 跑第 10 节的真机验证清单。确认没问题之后，第 11 节列的几项才是下一步真正的选择题。照
Decision Lock 文件自己的指示，**这轮不开始 DLP Phase 1 Remaining Slice**——那是文件本身说
好要另开一个任务处理的。
