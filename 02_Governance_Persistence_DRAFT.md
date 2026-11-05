# Property OS — 治理持久化草稿

**DRAFT · NOT PERSISTED · NOT APPROVED · IDs ARE PLACEHOLDERS**

准备日期：2026-11-03（设备时钟，Asia/Kuala_Lumpur）。配套：`00_HANDOFF_Checkpoint.md`、`01_MANIFEST.md`。

本文件**没有写入任何治理文件**，也没有追加到任何来源不明的文件里。它是新增块的草稿，等权威治理文件可访问之后，再由你决定哪些要持久化、以什么形式。

## 0. 使用规则（取自你的停止程序第 6 节，按本项目改写）

1. 先取得权威治理文件（真实仓库里的当前版本），确认路径、哈希与最高编号。
2. 只用项目已有的格式与编号规则。本草稿里的 `[REVIEW-NEW]`、`[ADR-NEW-A…C]`、`[BL-NEW-1…4]`、`[STATE-NEW]` 都是占位符，不是编号。
3. 未批准的一律写成 PROPOSED 或 PENDING，不得写成 APPROVED。
4. 不为"停止指示"本身创建 ADR。
5. 只新增块，不整份覆盖任何治理文件，不生成基线 ZIP。
6. 写入后读回核对：行数、编号无重复、语法。
7. 本窗口没有任何决定获得你的批准，所以草稿里没有 DECIDED 条目。

## 1. 覆盖范围

- **覆盖**：审计记录；PROPOSED 的决定（来自 B1-D 系列）；PENDING 的待办；Project State 的 CHANGELOG、NEXT PRIORITY、TECH DEBT 草稿。
- **不覆盖**：任何已批准的决定（本窗口没有）；EventBus；912 F-01；候选条目 REVIEW-012、ADR-P27–P32、BL-22–BL-30 的合并。
- **与候选编号的关系**：zip 里的候选已经使用了 REVIEW-012、ADR-P27–P32、BL-22–BL-30，而且都是暂定、从未与真实仓库核对，REVIEW-011 在 zip 里没有条目。因此本草稿不使用任何具体编号。

## 2. 块与目标文件对照

| 块 | 目标治理文件 | 性质 | 状态 |
|---|---|---|---|
| [REVIEW-NEW] | Review History | 审计记录（事实） | RECORDED，待持久化 |
| [ADR-NEW-A] | ADR Log | 付款日期政策 | PROPOSED — NOT APPROVED |
| [ADR-NEW-B] | ADR Log | Pay 金额校验边界与兼容性例外 | PROPOSED — NOT APPROVED |
| [ADR-NEW-C] | ADR Log | Add Bill 重复保护范围与限制 | PROPOSED — NOT APPROVED |
| [BL-NEW-1] | Product Backlog | B1 第一阶段（S1–S3） | PROPOSED — NOT AUTHORIZED |
| [BL-NEW-2] | Product Backlog | B1 第二阶段（S4–S6） | PROPOSED — NOT STARTED |
| [BL-NEW-3] | Product Backlog | 真实环境验证任务 | PENDING |
| [BL-NEW-4] | Product Backlog | 账单需求缺口 | PROPOSED |
| [STATE-NEW] | Project State | CHANGELOG、NEXT PRIORITY、TECH DEBT | 待持久化 |

## 3. 草稿块

### 3.1 [REVIEW-NEW] Billing B 系列审计与 B1 规划（审计记录）

- **日期范围**：本窗口（你上传 zip 之后至 2026-11-03）。
- **来源**：`50_Property-main.zip`（SHA-256 `ef21e91a…63642c`，非权威）；你上传的 MERGE_KIT、10-16 handoff、createObligation 测试、停止程序。
- **方法**：只读静态阅读与哈希核对；没有运行任何测试或应用函数；没有访问真实仓库、真实 GAS 或生产数据。
- **结果**
  - A：manifest 指定的 6 个文件 6/6 哈希 MATCH；标记 CLOSED — HASH VERIFICATION ONLY。
  - B-1：上传的 MERGE_KIT 与 manifest 行 5 一致（`3729399d…`）。
  - B-2：zip 内 MERGE_KIT 与上传文件逐字节一致；根目录 `00_*` 共 8 个，4 个与候选副本相同；zip 内未发现编号重复；与真实仓库的冲突无法核实。
  - B-3：MERGE_KIT 的 446 行在四个候选文件中逐字出现；B5/B6 的插入锚点不唯一（16 处）；三份文件的基底不在 zip 里；结论 FINDINGS。
  - B-4：来源 BLOCKED。zip 注释的提交号 `412d78be…` 未验证；四个治理文件的 git blob ID 已由 zip 字节算出（`6357589e…`、`53e2e2bc…`、`a55fd384…`、`46023fbf…`）；recovery 检查点同为 BLOCKED。
  - D1：Billing 静态审查，发现 G1–G9 与追加观察 AO-1–AO-9（均为静态，未在运行环境验证）。
  - D2：测试矩阵设计，75 个用例块（CHARACTERIZATION 60、TARGET 3、BLOCKED 12），未执行；决策登记 DR-01–DR-16；验证清单 VT-01–VT-17。
  - B1：实施计划 v1，经评审后修订为 v2（第一阶段 S1–S3、第二阶段 S4–S6）；没有实施。
- **状态**：RECORDED。这是审计记录，不是决定。
- **局限**：全部是静态阅读；zip 是非权威副本；行号只对 zip 副本有效；没有任何关于真实 GAS 行为的声明。

### 3.2 [ADR-NEW-A] 付款日期的马来西亚本地日政策

**STATUS: PROPOSED — NOT APPROVED**（对应 B1-D1、B1-D2；评审建议批准，但你尚未批准）

- **CONTEXT**：Pay 表单的默认日期现为 UTC 日期；服务端缺省用脚本时区（zip 的 `appsscript.json` 写 `Asia/Singapore`）；代码里没有显式的"马来西亚本地日"定义。
- **PROPOSAL**：付款日期取 Asia/Kuala_Lumpur（UTC+8，无夏令时）的日历日，用固定 +8 小时的纯函数计算；UI 默认值与服务端缺省值共用同一规则；`paidDate` 非空时必须是真实的 `yyyy-MM-dd`；不限制过去或未来日期。
- **ALTERNATIVES**：依赖脚本时区；取浏览器本地日；改 `appsscript.json` 的时区（属于部署变更）。
- **LIMITATIONS**：看板窗口与逾期判断仍用脚本时区；若真实脚本时区不是 UTC+8，午夜附近会不一致（VT-06）。
- **EVIDENCE**：`B1_implementation_plan_v2.md` 第 3.2、4.2 节（行号对应 zip 副本，非权威）。
- **NEEDS APPROVAL FROM**：你。

### 3.3 [ADR-NEW-B] Pay 金额校验的边界与兼容性例外

**STATUS: PROPOSED — NOT APPROVED**（对应 B1-D3、D4、D12；评审建议：D3 批准，D4 有条件批准，D12 批准并补充响应保护）

- **PROPOSAL**：金额必须是有限数值且大于 0，纯十进制写法；严格校验放在 Console 边界（UI 与 946）；引擎只校验"已提供的值"，保留"缺失则取期次预计金额"的回落；不限制小数位、不取整。
- **COMPATIBILITY EXCEPTION（必须原样写入交付报告）**：引擎仍允许 `paidAmount` 缺失并回落到预计金额，所以不能声称所有付款入口都强制输入实际金额；直接调用 912 的其他入口仍可能使用预计金额。
- **RESPONSE HANDLING**：无法确认的响应不得显示付款成功；只有 `success === true`、`alreadyPaid === false` 且有 `occurrenceId` 才允许显示 `Payment recorded.`。
- **EVIDENCE**：zip 副本里有 16 处既有服务端测试调用不传 `paidAmount`，依赖回落（912_Tests 7 处、991 2 处、993 7 处）；B1 计划 v2 第 4 节。
- **NEEDS APPROVAL FROM**：你。

### 3.4 [ADR-NEW-C] Add Bill 的重复保护范围与限制（第二阶段）

**STATUS: PROPOSED — NOT APPROVED**（对应 B1-D6；评审建议：有条件批准）

- **PROPOSAL**：UI 为 Water、Electricity、MaintenanceFee 生成 `clientRequestId`，与表单内容的指纹绑定；服务端不改。
- **LIMITS**：服务端缓存只在整个流程成功后写入，部分写入后用同一个 ID 重试仍会再建一条；有效期 3600 秒；缓存可能被提前淘汰；页面重载后 ID 丢失；不解决并发请求造成的业务重复。
- **CONDITIONS（评审要求，缺一不可）**：不宣传为完整幂等或事务机制；界面必须清楚表达限制；失败后不允许盲目重试，先查 `ObligationRules`；找到孤儿或重复记录时停止；不允许操作员手工删除或修补记录。
- **DIVERGENCE TO DECIDE（DR-07）**：规格 §11 要求失败不改变 Truth（all-or-nothing），而实现按 D9 明确选择非原子写入。
- **NEEDS APPROVAL FROM**：你。

### 3.5 [BL-NEW-1] B1 第一阶段（S1–S3）

**STATUS: PROPOSED — NOT AUTHORIZED**

- 内容：S1 纯函数与测试；S2 服务端付款验证（912、946）；S3 Pay UI（945）。每个切片后停下检查。
- 依赖：V1–V5；DR-01、DR-15；B1-D1 至 D5、D10 至 D12 的批准。
- 交付形式：每个文件一份统一 diff，头部记录 base 与补丁后 SHA-256；不应用、不合并、不部署。
- 不纳入：Add Bill 的 `clientRequestId`、Add Bill 失败恢复、状态框、看板自动读回、恢复手册、Pay 失败提示与恢复指引；schema；EventBus；912 F-01；真实 GAS 写入测试。

### 3.6 [BL-NEW-2] B1 第二阶段（S4–S6）

**STATUS: PROPOSED — NOT STARTED**

- 内容：Add Bill 防重复；Add Bill 与 Pay 失败显示的统一设计；状态框与读回；恢复手册。
- 前提：第一阶段评审通过；B1-D6 至 D9 的批准。

### 3.7 [BL-NEW-3] 真实环境验证任务

**STATUS: PENDING**

- 内容：`04_verification_tasks_waiting_real_env.md` 中的 VT-01 至 VT-17（真实仓库身份、目标提交、四个治理文件的真实内容、源文件真实版本、脚本时区、表头与列格式、`google.script.run` 序列化、真实保存与读回、真实 Pay、锁与缓存、现有清单的执行证据、真实浏览器 UI 等）。
- 解锁条件：见该文件。

### 3.8 [BL-NEW-4] 账单需求缺口

**STATUS: PROPOSED**

- G1 账期、开单日、账单编号、备注无处记录；G2 收据证据没有存储路径（`attachEvidence` 绑定 PropertyCase，只核实了 911）；G3 开单金额与付款金额的区分、预计金额的修改入口；G4 币种治理。
- 都需要你先决定需求，涉及 schema 变更（DR-03 至 DR-06）。
- 与 zip 里候选条目 BL-28 的关系**未核实**。

### 3.9 [STATE-NEW] Project State 草稿

**CHANGELOG 草稿条目（2026-11-03）**
- Billing B 系列审计与 B1 规划完成：A 阶段 HASH VERIFICATION ONLY 关闭；B-1/B-2/B-3 完成（B-3 结论 FINDINGS）；B-4 来源 BLOCKED。
- D1 静态审查、D2 测试矩阵设计、B1 计划 v1 与 v2 已作为候选文档交付；没有实施，没有运行测试。
- 用户指示停止 coding、准备治理文件、开新窗口；已生成 Handoff 与本草稿。

**NEXT PRIORITY 草稿**
1. 在真实仓库运行只读命令（`00_HANDOFF_Checkpoint.md` 第 7 节）并贴回输出。
2. 核对 REVIEW-011 与原始 2026-10-01 记录的历史、编号冲突。
3. 评审并持久化本草稿。
4. 另行发出 B1 第一阶段（S1–S3）的实施授权。

**TECH DEBT 候选**（静态观察，未在运行环境验证；与 zip 里候选 TECH DEBT #10–#15 的关系未核实）
- 首期恰为 +7 天时可能同时出现在两个看板列表（AO-1）；宽限期内过期的期次可能不出现在任何列表（AO-2）。
- 看板金额前缀固定为 `RM `（AO-3）。
- 下一期日期从上一期次推算，月末截断后会漂移（AO-4）。
- Suspended 规则仍可付款但不生成下一期（AO-5）。
- Pay 与看板加载的回调对 null 响应没有保护（AO-6）。
- Node 模拟 harness 的限制：锁恒为 true、缓存无 TTL、时区被忽略、`./tests/` 目录布局缺失（AO-7）。
- 重复与部分写入（G5）、Pay 校验（G6）、日期与 EndDate 校验（G7）、读回盲区（G8）。

## 4. 持久化步骤清单（权威文件可访问之后）

1. 取得权威的 Review History、ADR Log、Product Backlog、Project State，记录路径、SHA-256、git blob ID。
2. 查各文件当前的最高 REVIEW、ADR-P、BL 编号；查 REVIEW-011 与原始 2026-10-01 记录的历史。
3. 你决定每个草稿块最终怎么写、写不写。
4. 分配编号，并检查与现有条目、候选条目的冲突。
5. 按项目已有的格式写入，只新增块。
6. 读回核对：行数、编号无重复、语法检查。
7. 不生成基线 ZIP；不修改 zip 里的候选文件。

## 5. 刻意不写入的内容

- 对"停止指示"的 ADR。
- 任何"已批准"。
- 候选 ADR-P27–P32、REVIEW-012、BL-22–BL-30 的内容。
- MERGE_KIT 的合并。
- EventBus 与 912 F-01 相关内容。
