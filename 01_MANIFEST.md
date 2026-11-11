# 01_MANIFEST.md — B1 S3 候选输出目录

- 状态：候选，未应用、未合并、未部署；非权威工作副本。S3 建立在 S1 输出目录（`PropertyOS_B1_S1_candidate_2026-11-06`）与 S2 输出目录（`PropertyOS_B1_S2_candidate_2026-11-07`）之上。
- 清单不列自己的哈希。

| 文件 | 字节 | SHA-256 |
|---|---|---|
| `REPORT_2026-11-08_B1-S3_Candidate.md` | 27756 | `6491e0178eb9b6b2369da0f82cae93032337a3a2073a2bafa481fc5a5dfd3d89` |
| `945_OperatorConsole.html.S3.diff` | 4446 | `1351779838438d9e8447f506fc4279a0ef922a6d588453b5e2ddef52efc319ea` |
| `local_precheck_test_B1_payform.js` | 15482 | `dc643c255b4df6032bb5bbe0eb917b038ba512a4d326c3f4cad234fc0ecb44b4` |
| `S3_evidence.txt` | 20372 | `fe14bc899de23f51e1cda4146a2ac2615421bc484a711e3660e774814eeaea56` |

## 哈希链（来自 diff 头部，已在端到端复验中核对）

| 文件 | zip 原始 SHA-256 | 本 diff 的 base SHA-256（= S1 后） | S3 后 SHA-256 |
|---|---|---|---|
| `945_OperatorConsole.html` | `d1bf51ed80b92ad3bd8a31ad6f367881a93eace2a1124e95d286006f07845651` | `ff110b40614832be328e647da68ba09ea4991c7907a4ab8f46121e61e442f272` | `b27d3e0292dfc7202636da22f6c26848c81bfd984d8920d190548ac496220e7c` |

输入：`50_Property-main.zip` SHA-256 `76611d8d597cfa63dc9ee44f772038bb7fa3e5e194878bdce8f13a0bb1464118`，zip 注释 `8b8f2dc274e0a835f572ad90394839033f3f192f`。
