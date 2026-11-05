# Property OS — Handoff MANIFEST

**Created:** 2026-11-03（设备时钟，Asia/Kuala_Lumpur）。配套：`00_HANDOFF_Checkpoint.md`、`02_Governance_Persistence_DRAFT.md`。

本清单列出本窗口产出的文件、你提供的输入、被引用但不可用的材料，以及供新窗口核对的 zip 成员哈希。本清单自己的哈希不在表里（不能自引用），在交付消息里给出。

状态词：**COMPLETE** 文件完整；**PARTIAL**、**IN_PROGRESS**、**RECONSTRUCTED** 本窗口没有此类文件。

## 1. 本窗口产出的文件

| 路径（相对 `/mnt/user-data/outputs/`） | 字节 | SHA-256 | 状态 | 说明 |
|---|---|---|---|---|
| `PropertyOS_B1_plan_candidate_2026-10-27/B1_implementation_plan.md` | 38058 | `07a90c9501484194396bf47e6da74e1f1df4631a23da00722e6b01f20acdf37c` | COMPLETE — SUPERSEDED IN PART by v2 | B1 实施计划 v1（仅作历史） |
| `PropertyOS_B1_plan_v2_candidate_2026-10-31/B1_implementation_plan_v2.md` | 49419 | `ea42688478720ff4b02e6ad5b61fa57430d0f4c3523ad89d926cbc190b060a93` | COMPLETE — 待你评审；NOT AUTHORIZED | B1 实施计划 v2（第一阶段 S1–S3，第二阶段 S4–S6） |
| `PropertyOS_D1D2_candidate_2026-10-25/01_D1_static_audit_record.md` | 24622 | `b883195ff592b23ad9f64af5960deea04e653a2a934343813b214c2d2888bee2` | COMPLETE | D1 静态审查记录（候选；静态阅读，无运行证据） |
| `PropertyOS_D1D2_candidate_2026-10-25/02_D2_billing_test_matrix.md` | 64089 | `b1f8eda6bd492ab9d13bba2b32756ef4ea448cb12070986812ded12ab2df8090` | COMPLETE | D2 测试矩阵（设计稿，未执行） |
| `PropertyOS_D1D2_candidate_2026-10-25/03_decision_register.md` | 4893 | `921b624d640c3d871af9b57e72dabf6557c45dd8d068ef5de5c12c694fbdac94` | COMPLETE | 决策登记（DR-01–DR-16，全部 OPEN） |
| `PropertyOS_D1D2_candidate_2026-10-25/04_verification_tasks_waiting_real_env.md` | 5009 | `b7e656226177ca257f9c81e6de43f20faf6494d025c4653d8cebd7ecfbd10633` | COMPLETE | 必须等真实仓库或真实 GAS 的验证清单（VT-01–VT-17，均未执行） |
| `PropertyOS_Handoff_2026-11-03/00_HANDOFF_Checkpoint.md` | 11421 | `1862b43f1013e9ad78e651cb4ca5919ddd5b323678ac2c045bc702e1fb6ef54a` | COMPLETE（检查点状态为 PARTIAL） | 本次 Handoff 检查点 |
| `PropertyOS_Handoff_2026-11-03/02_Governance_Persistence_DRAFT.md` | 11867 | `23df69c67f26d844d7c6c24c888cfc0d89737d2019510ee7d850471abb96846e` | COMPLETE 作为草稿 — NOT PERSISTED | 治理持久化草稿（占位编号，未写入任何治理文件） |

## 2. 你提供的输入（只读，未复制、未修改）

| 文件（`/mnt/user-data/uploads/`） | 字节 | SHA-256 | 说明 |
|---|---|---|---|
| `50_Property-main.zip` | 1277278 | `ef21e91ae9ab51f1dd1abe4b445f7edd6fa4e45e153fcc680b294083fe63642c` | 非权威的项目副本（zip 注释含 `412d78be…`，未验证） |
| `MERGE_KIT_additions_only_2026-10-16.md` | 45826 | `3729399d042ad538dc1fc06d7976f0ddfd2275f95d6abd38d8c9465a7edf2bcd` | 10-16 窗口的"只含新增块"合并材料（B-1、B-3 的审计对象） |
| `CHECKPOINT_2026-10-16_PropertyOS-Billing-EventBus-Handoff.md` | 21104 | `e38249662f75e971bc4ba2559cd59f896ace8cd01274a1f22ad2e7a3ebf41878` | 10-16 handoff 原件（manifest 的来源） |
| `local_precheck_test_946_createObligation.js` | 7168 | `4e217261a72216c89a236c277edd1265b03dc7062055b4dca125a7c9b6e1c07b` | 10-16 窗口的测试文件，zip 里没有；哈希与 manifest 一致 |
| `Emergency_Stop_Handoff_Checkpoint_2026-10-04.md` | 9236 | `b19baffc03ce34d8b475df6911a7262bdc1fcd025e1c45dde597d18a72617bef` | 你的停止与交接程序；10-16 handoff 把它列为"上传的文件"，其记录的哈希与本次重算值：一致（完整 64 位） |

## 3. 被引用但不可用的材料

| 材料 | 状态 |
|---|---|
| 真实 Property OS 仓库（本地或 GitHub） | 不可访问；身份未确认 |
| 已部署的 GAS 项目 | 不可访问 |
| `governance_updated/` 目录（10-16 窗口的输出） | 不在 zip 里；根目录的四个治理文件与其候选副本逐字节相同 |
| `CHECKPOINT_2026-09-20_PropertyOS-FullWindowAudit-Handoff.md` | 不在 zip 顶层；嵌套 zip 未打开 |
| `CHECKPOINT_2026-10-02_PropertyOS-GovernanceRatification-Handoff.md` | 不在 zip 里 |
| `50.Property-main-RECONCILED-2026-09-20.zip`（zip 内的嵌套 zip） | 仅列出，从未打开 |
| REVIEW-011 的原始条目、2026-10-01 的原始批准记录 | 不在 zip 里；需要真实仓库与 git 历史 |
| Drive 里的"Google AI Studio"文件夹中的治理文件副本 | 存在，但只是上传副本，最新不晚于 2026-09-27；未下载、未哈希、不当作权威 |

## 4. 供新窗口核对的 zip 成员哈希（非权威副本）

下面的 git blob ID 可以直接与真实仓库里的 `git ls-tree` 输出比对。

| zip 成员 | SHA-256 | git blob ID（按 git 规则重算） |
|---|---|---|
| `912_ObligationEngine.js` | `8a40643e21994b004da4e1790edef8fec75d0487a17f6fc9894a5c2315087839` | `10c61992cea010326754e7e57b6f4134aa9ead0f` |
| `945_OperatorConsole.html` | `d1bf51ed80b92ad3bd8a31ad6f367881a93eace2a1124e95d286006f07845651` | `f09956fe4cbf8516f8151dd0ed5cf6fa210c40f8` |
| `946_OperatorConsoleServer.js` | `e993b71baed38686b17906e42587341ee98a1f531b53c7b544c5e86f5eebae26` | `961e3ea71ea2161f3903ac6a7333c923bbb46674` |
| `00_ADR_Log.js` | `8b3e0094882a44a3547a526010ddb1a80eb5447bf020aff51f9420380243aff1` | `6357589e3bc77e794666b865339ffdf71b8f94c1` |
| `00_Review_History.js` | `e963fb7c9c13b2d2cdd8f4ea080bfd4893245d85819010b67d0db2bd278a2287` | `53e2e2bc726f452ecc512f80472e99d5666ae0aa` |
| `00_Product_Backlog.js` | `0bb2d177c7057afb9abb29ea324cdd47bb04714c06bfdfa79948fb58aaf942ae` | `a55fd38409e1491a23855b33b990a40442bd8c8c` |
| `00_Project_State.js` | `bff5478de50f8ceadffd8aea758fe0a2e3d44c5b05d41c3d707a9105e1cb8dfb` | `46023fbf0f7e74d12e9a80b2dea97b274ac0fce8` |

## 5. 环境说明

- 沙箱的 `/mnt/user-data/outputs/` 是本窗口文件的位置；沙箱在任务之间可能重置，所以请把需要的文件下载或重新上传到新窗口。
- 本窗口早期（A 阶段）为读取 handoff，曾把 README 与两份 CHECKPOINT 解压到沙箱的 `/home/claude/work/`。这只是临时副本，不在交付物里，也不会带到新窗口。
- 没有生成任何基线 ZIP，没有修改 zip 或任何上传文件。
