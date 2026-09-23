# BL-20 Implementation — Final Report
2026-09-20

---

## A. BL-20 Requirement

原始登记文字：945_OperatorConsole.html 的 `submitDlpAddRectificationEvent`
呼叫端，比照 948 既有作法，在呼叫 `dlp_addRectificationEvent` 前用
`generateClientRequestId_()` 生成一个 `clientRequestId` 并放进呼叫
参数——目的是把既有的 918 幂等 cache 机制真正接上。

---

## B. Implementation Plan

在动手写代码前，按规定先读 `00_ADR_Log.js`（Section 2 First Step 明列
的必读档案之一），发现 **ADR-P21（APPROVED，2026-09-01）直接、明确
禁止这个方向**——完整内容见下方 F 节。因此实作计划在完成"读 ADR"这一步
就停止，没有进到"写代码"：

- A. BL-20 requirement：如上。
- B. 现有实作：945 目前完全没有 `clientRequestId`（BL-20 登记时已经
  确认，E1）。
- C. Gap：**这个"gap"实际上是 ADR-P21 刻意设计的结果，不是缺口**——
  见下方详细说明。
- D-H：因为 B/C 项的结论已经触发 Section 4 的 STOP 条件，D 到 H
  （files to change / data ownership / event impact / UI impact /
  testing strategy）没有继续往下做，避免在明知冲突的情况下产出一份
  看起来完整但建立在错误前提上的计划。

---

## C. Files Changed

只有治理档案，没有任何 production code：

- `00_Product_Backlog.js`——BL-20 追加一段 ADR 冲突发现的追记，状态从
  `REGISTERED — NOT STARTED` 更新为 `REGISTERED — BLOCKED`（原文字
  保留，没有删除或改写，比照这个专案一贯的 Addendum 写法）。
- `00_Project_State.js`——CHANGELOG 新增一条 2026-09-20（三）记录同一件事。

---

## D. Implementation Summary

**没有实作任何东西。** 945_OperatorConsole.html 逐字未动（SHA-256
核对与最原始上传一致）。

---

## E. Local Tests

| Test | Purpose | Result | Evidence |
|---|---|---|---|
| `node -c` on两份被编辑的治理档案 | 语法有效性 | PASS | 命令输出 |
| 918/947/948_search/948_rectification 四套本地套件 | 确认零回归 | PASS（163/22/29/27） | 命令输出，跟没做这次任务前的数字完全相同——预期如此，因为没有任何 production code 被改动 |
| 945/947/918/948 四个核心 production 档案 SHA-256 | 确认零 production 改动 | PASS，全部 UNCHANGED | 命令输出 |

没有、也不需要 real GAS / real-device 测试——因为没有任何代码变更需要
被测试。

---

## F. Governance Impact

- **ADR：未修改**（这正是重点——发现冲突，但没有单方面覆盖或修改
  ADR-P21）。
- Schema：未变更。
- Domain model：未变更。
- UI contract：未变更。
- **Project State：变更**（新增一条 CHANGELOG）。
- **Backlog：变更**（BL-20 追加发现记录，状态更新）。

**发现的冲突，逐字引用**：`00_ADR_Log.js` 里的 ADR-P21——

> DECISION: No. None of Sidebar's dlp_\* write wrappers, across both
> vertical slices (dlp_recordDeveloperStatus / dlp_recordOwnerVerification
> / **dlp_addRectificationEvent** / dlp_attachDefectEvidence /
> dlp_addSecondaryDamage), generate or forward a clientRequestId,
> regardless of whether the underlying 918/911 Command supports one.

以及其 CONSEQUENCES 段落：

> If Sidebar's connection profile is ever found less reliable than
> assumed on some real deployment, this decision should be revisited
> explicitly (a new ADR superseding this one), not silently overridden
> action-by-action.

2026-09-09 的 ADR-P25（Mobile 侧对称决定）追记也再次确认：
"This ADR's decision for Sidebar is unaffected and unchanged"。

**这代表 BL-20 当初登记时的定性——「Caller 端幂等传播缺口」——是不
准确的。** 这不是一个疏漏，是 ADR-P21 已经权衡过 Sidebar 实际风险
profile（桌面、已登入 session，不是手机工地网路）后刻意排除的行为。
BL-20 登记当时，只检查了「登记这件事本身需不需要新开 ADR」，没有检查
「是否与既有 ADR 冲突」——这是当时的检查缺口，这次实作前的强制 ADR
核对步骤里发现，如实记录，没有隐藏或悄悄改写原本的登记文字。

---

## G. Production Verification Status

**REAL GAS / REAL DEVICE / PRODUCTION VERIFICATION: PENDING**

（严格说，这次连本地实作都没有发生，所以这句话目前是"无适用对象"，
而不是"已完成实作、等真实环境验证"——按格式要求原样列出这一行，避免
漏掉规定的欄位。）

---

## H. Scope Check

- BL-20 only：**N/A**——没有做任何实作，谈不上"只做 BL-20"，因为
  在读 ADR 阶段就停下来了。
- Unrelated production changes：**NO**。
- Speculative abstraction：**NO**。
- Reconciled ZIP created：**NO**（遵照这次任务 Section 11 的明确
  决定，这次也没有再打包 zip）。

---

## I. Final Status

**IMPLEMENTATION BLOCKED — EVIDENCE / GOVERNANCE ISSUE**

具体卡住的点：BL-20 原本的提议内容跟已核准、仍然有效的 ADR-P21 直接
冲突。正确的下一步不是我自己判断"这个 ADR 该不该继续适用"，而是你
决定：

1. **确认 ADR-P21 仍然适用** → BL-20 应该重新定性为"不是缺口，是
   既有架构决定"，关闭而不是实作；还是
2. **Sidebar 的连线风险假设需要重新评估** → 按 ADR-P21 自己写的路径，
   先产生一份 superseding ADR，正式改变这个决定，BL-20 才有实作的
   正当性。

两份更新后的治理档案（`00_Product_Backlog.js`、`00_Project_State.js`）
在下面，945_OperatorConsole.html 完全没有被碰。
